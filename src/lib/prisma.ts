import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import type { PoolConfig } from "mariadb";
import { PrismaClient } from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// Database client — hardened against the intermittent
//   "pool timeout: failed to retrieve a connection from pool after 10000ms
//    (pool connections: active=0 idle=0 limit=10)"
// seen in production. That error is the mariadb driver's DEFAULT pool giving up
// after 10s because it couldn't hand out (or open) a single connection during a
// brief window when the database wasn't accepting new ones. The database itself
// stays up throughout; the app just needs to (a) keep the pool healthy and
// (b) not turn a transient blip into a user-facing 500.
// ---------------------------------------------------------------------------

/**
 * Parse the mysql:// connection string into explicit fields so we can pass pool
 * options alongside them. (The adapter accepts either a bare URL string OR a full
 * PoolConfig object — not both — so to tune the pool we must build the object.)
 */
function poolConfigFromUrl(databaseUrl: string): PoolConfig {
  const u = new URL(databaseUrl);
  const dec = (s: string) => (s ? decodeURIComponent(s) : s);
  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 3306,
    user: dec(u.username),
    password: dec(u.password),
    database: dec(u.pathname.replace(/^\//, "")),

    // THE FIX for the intermittent "pool timeout" in production. MySQL 8's default
    // `caching_sha2_password` auth serves most connections from a fast in-memory cache,
    // but occasionally a fresh connection must do a FULL auth, which over a non-TLS
    // connection needs the server's RSA public key. Without permission to fetch it the
    // driver fails that connection with ER_CANNOT_RETRIEVE_RSA_KEY ("RSA public key is
    // not available client side") — the real cause behind the pool timeouts. Allowing
    // retrieval lets the driver complete full auth. Safe here: this is a trusted internal
    // network (the app and DB are on the same host, connecting over 127.0.0.1).
    allowPublicKeyRetrieval: true,

    // --- Pool sizing & patience -------------------------------------------
    connectionLimit: 12, // a little headroom over the old default of 10
    // Per-attempt timeout. Kept moderate (not the old 10s default) because the
    // retry loop below makes several attempts: the CUMULATIVE budget (≈3×7s plus
    // backoff ≈ 24s) is what rides out a brief window where the DB won't accept a
    // connection, while any single attempt fails quickly enough that a genuine
    // full outage surfaces in ~24s rather than dragging on much longer.
    acquireTimeout: 7_000,
    connectTimeout: 7_000,
    initializationTimeout: 7_000,

    // --- Keeping the pool healthy -----------------------------------------
    // Release idle connections after 10 min. This MUST stay below MySQL's
    // `wait_timeout` (default 8h) so the pool never hands out a connection the
    // server has already silently closed — a classic source of "closed
    // connection" failures after quiet periods.
    idleTimeout: 600,
    // Validate a pooled connection's health before handing it out (unless it was
    // used within the last 500ms). Stops a dead connection from surfacing as an
    // error on the next request.
    minDelayValidation: 500,
    // If a borrowed connection isn't returned within 20s, log it — an early
    // warning of a connection leak, and a diagnostic aid if this ever recurs.
    leakDetectionTimeout: 20_000,

    // Driver-level logger. The pool wraps a failed connect in a generic "pool
    // timeout", hiding the real reason; THIS fires on the underlying error itself,
    // so the actual cause (ECONNREFUSED, ETIMEDOUT, ER_CON_COUNT_ERROR "too many
    // connections", ER_ACCESS_DENIED, …) lands in the logs where we can act on it.
    logger: {
      error: (err) => console.error(`[mariadb] connection error: ${describeCause(err)}`),
    },
  };
}

/**
 * Errors that mean the query never reached the database because a connection
 * couldn't be obtained (pool timeout, server unreachable, connection dropped).
 * These are SAFE to retry — including for writes — because nothing executed.
 * We deliberately do NOT retry query-execution errors (constraint violations,
 * timeouts mid-statement, etc.), which are handled by the caller.
 */
export function isRetryableConnectionError(error: unknown): boolean {
  const parts: string[] = [];
  let e: unknown = error;
  // Walk the error and its `cause` chain (the driver wraps the root cause).
  for (let i = 0; e && i < 5; i++) {
    const err = e as { message?: unknown; code?: unknown; name?: unknown; cause?: unknown };
    if (typeof err.message === "string") parts.push(err.message);
    if (typeof err.code === "string") parts.push(err.code);
    if (typeof err.name === "string") parts.push(err.name);
    e = err.cause;
  }
  const hay = parts.join(" ").toLowerCase();
  return (
    hay.includes("pool timeout") ||
    hay.includes("failed to retrieve a connection") ||
    hay.includes("retrieve connection") ||
    hay.includes("can't reach database") ||
    hay.includes("connection is closed") ||
    hay.includes("connection closed") ||
    hay.includes("closed connection") ||
    hay.includes("econnrefused") ||
    hay.includes("econnreset") ||
    hay.includes("etimedout") ||
    hay.includes("epipe") ||
    // Prisma engine codes: P2024 pool timeout, P1001 unreachable, P1017 closed.
    hay.includes("p2024") ||
    hay.includes("p1001") ||
    hay.includes("p1017")
  );
}

/**
 * Flatten an error and its `cause` chain into one readable line, pulling out the
 * low-level fields (code/errno/address/port/syscall/sqlState) that reveal the REAL
 * reason a connection failed — the thing the driver otherwise hides behind
 * `[cause]: [Object]`. This is what turns an opaque "pool timeout" into an
 * actionable "connect ECONNREFUSED 127.0.0.2:3306" or "ER_CON_COUNT_ERROR".
 */
function describeCause(error: unknown): string {
  const parts: string[] = [];
  let e: unknown = error;
  for (let i = 0; e && i < 6; i++) {
    const err = e as Record<string, unknown>;
    const bits: string[] = [];
    if (typeof err.name === "string") bits.push(err.name + ":");
    if (typeof err.message === "string") bits.push(err.message);
    const meta = (["code", "errno", "sqlState", "address", "port", "syscall"] as const)
      .filter((k) => err[k] !== undefined && err[k] !== null)
      .map((k) => `${k}=${String(err[k])}`);
    if (meta.length) bits.push(`(${meta.join(", ")})`);
    if (bits.length) parts.push(bits.join(" "));
    e = err.cause;
  }
  return parts.join("  <-  ") || "unknown";
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const RETRY_DELAYS_MS = [1_000, 2_000]; // 3 attempts total (1 try + 2 retries)

function createPrismaClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const adapter = new PrismaMariaDb(poolConfigFromUrl(url));

  // Retry transient connection failures with backoff, so a brief window where the
  // database won't accept a connection becomes a slightly slower request instead
  // of a 500. Only connection-acquisition failures are retried (see the guard),
  // which never executed anything, so this is safe for reads and writes alike.
  return new PrismaClient({ adapter }).$extends({
    query: {
      async $allOperations({ args, query }) {
        let lastError: unknown;
        for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
          try {
            return await query(args);
          } catch (error) {
            const retryable = isRetryableConnectionError(error);
            if (!retryable || attempt === RETRY_DELAYS_MS.length) {
              // On giving up (or a non-retryable connection error), log the UNWRAPPED
              // root cause so the real reason is visible instead of "[cause]: [Object]".
              if (retryable) {
                console.error(
                  `[prisma] DB connection failed after ${attempt + 1} attempt(s). ROOT CAUSE: ${describeCause(error)}`,
                );
              }
              throw error;
            }
            lastError = error;
            const delay = RETRY_DELAYS_MS[attempt];
            console.warn(
              `[prisma] transient DB connection error (attempt ${attempt + 1}/${RETRY_DELAYS_MS.length + 1}): ${describeCause(error)}; retrying in ${delay}ms`,
            );
            await sleep(delay);
          }
        }
        throw lastError;
      },
    },
  });
}

// The retry extension is transparent — it adds no methods or fields, only wraps
// query execution — so the runtime client is fully interchangeable with a plain
// PrismaClient. We expose it AS PrismaClient so every existing call site (and the
// `$transaction(tx => …)` helpers that expect the vanilla TransactionClient type)
// keeps type-checking unchanged, while still getting the retry behaviour at runtime.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? (createPrismaClient() as unknown as PrismaClient);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
