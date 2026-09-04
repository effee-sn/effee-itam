import { spawn } from "node:child_process";
import fs from "node:fs";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { AppError } from "@/lib/api-response";

// ---------------------------------------------------------------------------
// Database backup & restore.
//
// SAFETY CONTRACT (the whole reason this is written carefully):
//   * The target database is ALWAYS the one in DATABASE_URL — resolved fresh on
//     every call, never hard-coded and never read from the uploaded file.
//   * Backups are produced WITHOUT `--databases`, so the dump has no `USE` or
//     `CREATE DATABASE` line that could pin a restore to a different database.
//   * On restore, any `USE` / `CREATE DATABASE` / `DROP DATABASE` statement is
//     stripped anyway, so even a hand-edited or foreign dump lands in THIS db.
//   * A safety snapshot of the current database is taken before every restore.
//
// The mysql client binaries must be reachable. In production they're on PATH;
// override with MYSQLDUMP_PATH / MYSQL_PATH (e.g. the XAMPP bin dir on Windows).
// ---------------------------------------------------------------------------

const MYSQLDUMP = process.env.MYSQLDUMP_PATH || "mysqldump";
const MYSQL = process.env.MYSQL_PATH || "mysql";

export type DbConfig = { host: string; port: string; user: string; password: string; database: string };

/** Connection details for the CURRENTLY connected database, from DATABASE_URL. */
export function currentDbConfig(): DbConfig {
  const url = process.env.DATABASE_URL;
  if (!url) throw new AppError("CONFIG", "DATABASE_URL is not set", 500);
  const u = new URL(url);
  const dec = (s: string) => (s ? decodeURIComponent(s) : s);
  const database = dec(u.pathname.replace(/^\//, ""));
  if (!database) throw new AppError("CONFIG", "DATABASE_URL has no database name", 500);
  return { host: u.hostname, port: u.port || "3306", user: dec(u.username), password: dec(u.password), database };
}

/** Connection args shared by mysqldump and mysql. Password goes through MYSQL_PWD
 *  (env, child-only) so it is never on the command line nor tripped up by shell quoting. */
function connArgs(cfg: DbConfig): string[] {
  return ["-h", cfg.host, "-P", cfg.port, "-u", cfg.user, "--default-character-set=utf8mb4"];
}
function childEnv(cfg: DbConfig): NodeJS.ProcessEnv {
  return { ...process.env, MYSQL_PWD: cfg.password };
}

function timestamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export function backupFilename(cfg: DbConfig): string {
  return `itam-backup-${cfg.database}-${timestamp()}.sql`;
}

/**
 * Run mysqldump for the current database into `outFile`. Deliberately NO `--databases`,
 * so the output has no USE/CREATE DATABASE line. `--no-tablespaces` avoids needing the
 * global PROCESS privilege on MySQL 8; if the client doesn't understand it (older
 * MariaDB), we retry without it.
 */
async function dumpToFile(cfg: DbConfig, outFile: string, withNoTablespaces = true): Promise<void> {
  const args = [
    ...connArgs(cfg),
    "--single-transaction",
    "--quick",
    "--skip-lock-tables",
    "--routines",
    "--triggers",
    ...(withNoTablespaces ? ["--no-tablespaces"] : []),
    cfg.database, // positional db — NOT --databases, so no USE/CREATE DATABASE is emitted
  ];

  const { code, stderr } = await runProcess(MYSQLDUMP, args, { env: childEnv(cfg), stdoutFile: outFile });
  if (code !== 0) {
    if (withNoTablespaces && /no-tablespaces|unknown option|unknown variable/i.test(stderr)) {
      return dumpToFile(cfg, outFile, false); // retry for clients without the flag
    }
    throw new AppError("BACKUP_FAILED", `Backup failed: ${firstLine(stderr) || `mysqldump exited ${code}`}`, 500);
  }
}

/** Produce a backup of the current database and return it as a buffer plus a filename. */
export async function createBackup(): Promise<{ filename: string; data: Buffer }> {
  const cfg = currentDbConfig();
  const dir = await mkdtemp(path.join(os.tmpdir(), "itam-backup-"));
  const file = path.join(dir, "dump.sql");
  try {
    await dumpToFile(cfg, file);
    const data = await readFile(file);
    if (data.length === 0) throw new AppError("BACKUP_FAILED", "Backup produced an empty file", 500);
    return { filename: backupFilename(cfg), data };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Remove any statement that could switch, create, or drop a database, so the SQL can only
 * ever be applied to the connected database. Operates line-by-line: mysqldump writes each
 * such statement on its own line, and these keywords never legitimately begin a data line.
 */
export function stripDatabaseStatements(sql: string): string {
  const danger = /^\s*(USE\b|CREATE\s+DATABASE\b|CREATE\s+SCHEMA\b|DROP\s+DATABASE\b|DROP\s+SCHEMA\b)/i;
  return sql
    .split(/\r?\n/)
    .filter((line) => !danger.test(line))
    .join("\n");
}

export type RestoreResult = { database: string; safetyBackupPath: string; bytesApplied: number };

/**
 * Restore an uploaded SQL dump INTO THE CURRENT DATABASE. Steps:
 *   1. Resolve the target db from DATABASE_URL (never from the file).
 *   2. Take a safety snapshot of the current db first (so a bad restore is recoverable).
 *   3. Strip any USE/CREATE/DROP DATABASE statements from the upload.
 *   4. Pipe the cleaned SQL into `mysql <targetDb>`, which applies it to that db only.
 */
export async function restoreBackup(sql: string): Promise<RestoreResult> {
  const cfg = currentDbConfig();

  if (!/create\s+table|insert\s+into|drop\s+table/i.test(sql)) {
    throw new AppError("VALIDATION", "This file doesn't look like a SQL backup.", 400);
  }

  // 1 + 2: safety snapshot of the CURRENT database before we touch it.
  const backupDir = process.env.BACKUP_DIR || path.join(process.cwd(), "backups");
  await mkdir(backupDir, { recursive: true });
  const safetyPath = path.join(backupDir, `pre-restore-${cfg.database}-${timestamp()}.sql`);
  await dumpToFile(cfg, safetyPath);

  // 3: strip database-switching statements.
  const cleaned = stripDatabaseStatements(sql);

  // 4: apply to the target database (positional arg pins the db; wrap to tolerate FK order).
  const wrapped = `SET FOREIGN_KEY_CHECKS=0;\nSET NAMES utf8mb4;\n${cleaned}\nSET FOREIGN_KEY_CHECKS=1;\n`;
  const args = [...connArgs(cfg), cfg.database]; // <-- restore lands HERE, the connected db
  const { code, stderr } = await runProcess(MYSQL, args, { env: childEnv(cfg), stdin: wrapped });
  if (code !== 0) {
    throw new AppError(
      "RESTORE_FAILED",
      `Restore failed: ${firstLine(stderr) || `mysql exited ${code}`}. A safety snapshot of your data was saved on the server at ${safetyPath}.`,
      500,
    );
  }

  return { database: cfg.database, safetyBackupPath: safetyPath, bytesApplied: Buffer.byteLength(cleaned, "utf8") };
}

/** UI helper: what a restore will target, and whether the mysql tools are reachable. */
export async function getBackupStatus(): Promise<{ database: string; toolsAvailable: boolean; message?: string }> {
  const cfg = currentDbConfig();
  const { code, stderr } = await runProcess(MYSQLDUMP, ["--version"], { env: childEnv(cfg) }).catch((e: unknown) => ({
    code: 1,
    stderr: e instanceof Error ? e.message : String(e),
  }));
  return code === 0
    ? { database: cfg.database, toolsAvailable: true }
    : { database: cfg.database, toolsAvailable: false, message: firstLine(stderr) || "mysqldump not found on the server" };
}

// --- process helpers -------------------------------------------------------

function firstLine(s: string): string {
  return (s || "").split(/\r?\n/).find((l) => l.trim()) ?? "";
}

function runProcess(
  cmd: string,
  args: string[],
  opts: { env?: NodeJS.ProcessEnv; stdin?: string; stdoutFile?: string },
): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { env: opts.env, stdio: ["pipe", "pipe", "pipe"] });

    let stderr = "";
    child.stderr?.on("data", (c) => {
      stderr += c.toString();
    });

    // If capturing stdout to a file, resolve only after the file stream has fully flushed.
    let stdoutClosed: Promise<void> = Promise.resolve();
    if (opts.stdoutFile) {
      const ws = fs.createWriteStream(opts.stdoutFile);
      child.stdout?.pipe(ws);
      stdoutClosed = new Promise((res) => ws.on("close", () => res()));
    } else {
      child.stdout?.resume(); // drain so the process isn't blocked on a full pipe
    }

    if (opts.stdin !== undefined) {
      child.stdin?.on("error", () => {}); // ignore EPIPE if the child exits early
      child.stdin?.write(opts.stdin);
      child.stdin?.end();
    }

    child.on("error", (err) => reject(new AppError("TOOL_MISSING", `Could not run ${cmd}: ${err.message}`, 500)));
    child.on("close", (code) => {
      stdoutClosed.then(() => resolve({ code: code ?? 1, stderr }));
    });
  });
}
