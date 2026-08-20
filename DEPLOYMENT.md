# Deployment Guide — ITAM (Ubuntu + PM2)

Reference runbook for deploying and operating the ITAM app on an Ubuntu server. Covers first-time setup,
day-to-day redeploys, backups, and troubleshooting.

## Stack assumptions

- Ubuntu 22.04/24.04 LTS
- Node.js 20 LTS
- MySQL 8 or MariaDB 10.6+ (Prisma connects via `@prisma/adapter-mariadb`, compatible with both)
- PM2 as the process manager (see `ecosystem.config.js` in the repo root)
- No Docker/containers — the app runs directly on the host

**Path and user used throughout this guide:** `/opt/itam`, owned and run by a dedicated non-root system user
`itam`. Neither is required — any directory you have write access to works, and it can run under your own
regular sudo-capable login instead of a dedicated user. Just substitute your own path/user consistently
everywhere below (systemd/cron entries in particular hardcode the path, so double-check those). Don't run it
as `root` — an unnecessary risk for an app that has no need for root privileges.

---

## 1. First-time server setup

```bash
# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# MySQL server (skip if using a managed/remote DB instead)
sudo apt-get install -y mysql-server
sudo mysql_secure_installation

# PM2, installed globally
sudo npm install -g pm2
```

Create the application database and a dedicated DB user (don't use `root` in production):

```sql
CREATE DATABASE itam CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'itam_app'@'localhost' IDENTIFIED BY '<strong-password-here>';
GRANT ALL PRIVILEGES ON itam.* TO 'itam_app'@'localhost';
FLUSH PRIVILEGES;
```

Create a dedicated, non-root system user to own and run the app (skip this if you'd rather run it under your
own login — just make sure that user owns the directory):

```bash
sudo adduser --system --group --shell /bin/bash --home /opt/itam itam
sudo mkdir -p /opt/itam
sudo chown itam:itam /opt/itam
```

(`--shell /bin/bash` is needed so `sudo -iu itam` below actually gives you a usable login shell — the default
`--system` shell is `nologin`, which is fine for a pure background service but not for a user you'll also
`git pull`/`npm run build` as.)

From here on, run deploy commands as that user (`sudo -iu itam`) rather than as `root`.

## 2. Get the code onto the server

```bash
sudo -iu itam
git clone <your-repo-url> /opt/itam
cd /opt/itam
```

(If the project isn't in git yet, `scp`/`rsync` the directory instead — just exclude `node_modules`, `.next`,
and any local `.env`. Make sure the copied files end up owned by `itam:itam`, e.g. `sudo chown -R itam:itam /opt/itam`
if you copied them in as a different user.)

## 3. Configure environment

```bash
cp .env.example .env
nano .env
```

Fill in:

| Variable | Value |
|---|---|
| `DATABASE_URL` | `mysql://itam_app:<password>@localhost:3306/itam` |
| `JWT_SECRET` | Generate with `openssl rand -base64 32` — must be different from any dev/staging secret |
| `JWT_EXPIRES_IN` | `1d` (or your preferred session lifetime) |
| `COOKIE_SECURE` | Leave `false` for now — only flip to `true` after Section 7 (nginx + HTTPS) is actually live. See the warning below. |
| `INVENTORY_TOKEN` | *(Optional)* Shared secret for the PowerShell inventory agent. Set it to require the `X-Inventory-Token` header on `POST /api/inventory`; leave empty to accept reports openly on the internal network. See Section 12. |

`.env` is gitignored — it never leaves this server.

**Leave `COOKIE_SECURE=false` until HTTPS is actually in front of the app.** Setting it `true` before
nginx+certbot (Section 7) is live makes login *look* successful (the API call returns valid data) while
the session cookie is silently discarded by the browser every time, since a `Secure` cookie requires an
HTTPS connection — the app will appear to reject every login. Flip it to `true` once you've confirmed
HTTPS actually works, then restart PM2 (`pm2 restart itam`) to pick up the change.

## 4. Install, migrate, build, seed

```bash
npm ci
npx prisma migrate deploy
npx prisma generate
npm run build
```

`prisma migrate deploy` (not `migrate dev`) applies existing migrations non-interactively — the right command
for any environment that isn't your own dev machine.

**The build no longer touches the database** — every page renders per-request, so `npm run build` doesn't read
any table and doesn't need the DB seeded (or even reachable). Build and seed can happen in either order; the
only hard requirement is that the seed runs before anyone tries to log in.

First-time only, seed the initial roles, permissions and admin account:

```bash
SEED_ADMIN_EMAIL='admin@yourcompany.com' SEED_ADMIN_PASSWORD='<strong-password>' \
  node --env-file=.env node_modules/tsx/dist/cli.mjs prisma/seed.ts
```

- **Set `SEED_ADMIN_PASSWORD` to a strong value.** Without it the admin is created with the default
  `ChangeMe123!`. Either way the account is flagged to force a password change on first login, but don't ship a
  known default to production.
- Plain `npx tsx prisma/seed.ts` doesn't load `.env` the way Next.js does, and fails with a cryptic
  `Cannot read properties of undefined (reading 'prepareCacheLength')` from `@prisma/adapter-mariadb` — use the
  `--env-file` form above instead. (The inline `SEED_ADMIN_*` vars take precedence over anything in `.env`.)
- The seed is idempotent — it upserts roles/permissions and **reconciles the built-in roles' granted
  permissions** (adding any new ones, removing stale ones), so re-running it after an upgrade is safe and is how
  new permissions reach the seeded roles.

## 5. Start it under PM2

```bash
mkdir -p logs
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # prints a sudo command — copy/paste and run it once, so PM2 survives a reboot
```

Run `pm2 start`/`pm2 save`/`pm2 startup` as the same user that owns the app directory (`itam` in this guide) —
`pm2 startup` detects which user invoked it and registers the systemd service to run PM2 as that user. The
command it prints to paste back in does need `sudo`, since registering a systemd service itself requires root
— that's expected, only the one-time registration needs elevated privileges, not day-to-day PM2 usage.

Confirm it's up:

```bash
pm2 status
pm2 logs itam --lines 50
curl -I http://localhost:3000
```

## 6. Firewall (ufw)

If you want to reach the app directly on port 3000 before nginx is set up (e.g. to sanity-check the
deployment from your own machine):

```bash
sudo ufw allow 3000/tcp
sudo ufw status   # confirms the rule took, and whether ufw is even active
```

Once nginx (below) is fronting the app, close 3000 back off and only expose 80/443 — nginx proxies to
`127.0.0.1:3000` internally, so nothing external needs direct access to the Next.js port itself:

```bash
sudo ufw delete allow 3000/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

(If ufw is already active and you haven't confirmed SSH is allowed, run `sudo ufw allow OpenSSH` — or
whatever port SSH is on — before enabling it, so you don't lock yourself out of the box.)

## 7. Put it behind nginx (recommended)

Running `next start` directly on port 3000 works, but a reverse proxy gives you a normal port 80/443, TLS,
and lets you point a real hostname at the app.

```bash
sudo apt-get install -y nginx
sudo nano /etc/nginx/sites-available/itam
```

```nginx
server {
    listen 80;
    server_name itam.yourcompany.internal;

    client_max_body_size 15M;  # headroom above the largest per-file cap (10MB documents) in src/lib/uploads.ts

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/itam /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Add HTTPS with `certbot --nginx` once a real domain points at the box.

**Uploaded files (`public/uploads/`).** Logos, asset images and asset documents are written here at runtime,
under `public/`, so `next start` already serves them through the `location /` block above — nothing extra is
required for them to work. Two things to keep in mind:

- **The in-place `git pull` redeploy (Section 8) preserves this directory.** If you ever switch to a
  deploy-by-fresh-clone or containerised model, carry `public/uploads/` across (or mount it as a volume), or
  every previously uploaded file 404s after the next deploy.
- *(Optional, performance only.)* To let nginx serve those files directly instead of proxying each one through
  Node, add a `location` block above `location /` — Next still owns everything else:

  ```nginx
      location /uploads/ {
          alias /opt/itam/public/uploads/;   # match your actual app path
          access_log off;
          expires 30d;
      }
  ```

---

## 8. Redeploying an update

```bash
cd /opt/itam
git pull
npm ci
npx prisma migrate deploy
npx prisma generate   # the generated client is gitignored and there's no postinstall hook — regenerate it
npm run build
pm2 restart itam
```

`npx prisma generate` matters on every redeploy: the client lives in `src/generated/prisma` (gitignored, and
not rebuilt by `npm ci`), so if a pulled change touched `schema.prisma`, skipping this step builds against a
stale client and new fields/models silently go missing. If the seed changed (e.g. new permissions), also re-run
the seed command from Section 4 — it's idempotent.

Watch the logs for a minute after restarting:

```bash
pm2 logs itam --lines 100
```

If a deploy goes wrong, `pm2 restart itam` again after `git checkout <previous-commit>` + rebuild rolls back
cleanly — there's no separate release/rollback tooling, just re-run the same steps against the prior commit.

---

## 9. Backups

`scripts/backup-db.sh` dumps the database (gzip, credentials pulled straight from `.env`, auto-rotates
anything older than 14 days).

```bash
chmod +x scripts/backup-db.sh
sudo mkdir -p /var/backups/itam
sudo chown itam:itam /var/backups/itam

# test it manually first
./scripts/backup-db.sh
ls -lh /var/backups/itam
```

Schedule it nightly, in the `itam` user's own crontab (so it runs with the same file permissions that own
`.env` and `public/uploads/`):

```bash
sudo -iu itam crontab -e
```

```cron
0 2 * * * /opt/itam/scripts/backup-db.sh >> /var/log/itam-backup.log 2>&1
```

Override defaults by exporting `BACKUP_DIR` / `RETENTION_DAYS` before the cron line if you want backups
somewhere other than `/var/backups/itam` or a longer retention window.

**Also back up `public/uploads/`** — asset images, asset documents and the company logo live on disk, not in
the database. A simple nightly `rsync` or `tar` of that directory to the same backup location covers it:

```cron
30 2 * * * tar -czf /var/backups/itam/uploads_$(date +\%Y\%m\%d).tar.gz -C /opt/itam public/uploads
```

---

## 10. Useful PM2 commands

| Command | What it does |
|---|---|
| `pm2 status` | List running processes and their state |
| `pm2 logs itam` | Tail live logs |
| `pm2 restart itam` | Restart after a deploy |
| `pm2 stop itam` | Stop the app (e.g. for maintenance) |
| `pm2 monit` | Live CPU/memory dashboard |
| `pm2 save` | Persist the current process list (run again after any `pm2 start`/`stop` change you want to survive a reboot) |

---

## 11. Troubleshooting

**App won't start / `pm2 status` shows `errored`**
Check `pm2 logs itam --err --lines 100`. Most common cause: `.env` missing or `DATABASE_URL` unreachable —
confirm MySQL is running (`sudo systemctl status mysql`) and the app can connect (`mysql -u itam_app -p itam`).

**Port 3000 already in use**
Another process is holding the port. Find it with `sudo lsof -i :3000` and stop it — don't just change the
app's port to work around a stale process, since that usually means an earlier PM2/node process didn't shut
down cleanly (check `pm2 status` first, it's often a duplicate PM2-managed instance).

**Stale build after pulling new code**
If a redeploy behaves oddly (old UI, missing new fields), confirm `npm run build` actually completed without
errors and that `pm2 restart itam` ran after it, not before. `.next` is regenerated by `npm run build`, so a
partial/failed build can leave it inconsistent — re-run `npm run build` and check its exit code before
restarting.

**Migration fails on deploy**
Never hand-edit `_prisma_migrations` in production. If `prisma migrate deploy` reports a failed/partial
migration, restore from the most recent backup and investigate on a staging copy first — don't experiment
directly against production data.

**`npx tsx prisma/seed.ts` fails with `Cannot read properties of undefined (reading 'prepareCacheLength')`**
Plain `tsx` doesn't load `.env`. Use `node --env-file=.env node_modules/tsx/dist/cli.mjs prisma/seed.ts`
instead (see Section 4).

**Login returns a valid success response but you're never actually logged in**
`COOKIE_SECURE=true` with no HTTPS in front of the app yet — the browser silently drops the session
cookie. Set `COOKIE_SECURE=false` in `.env` until nginx+certbot (Section 7) is actually live, then
`pm2 restart itam`. See the callout in Section 3.

**Need to check current Node/PM2/DB versions**

```bash
node -v
pm2 -v
mysql --version
```

---

## 12. Inventory agent (Windows machines → ITAM)

`scripts/inventory-agent.ps1` is a PowerShell agent that collects a Windows machine's hardware + OS and
POSTs it to `POST /api/inventory`. The server matches the report to an existing computer by **UUID, then
serial number**, and updates it; a machine it doesn't recognise appears under **Discovered** in the app for
an admin to onboard with a real asset tag (assets are never auto-created — tags are human-assigned).

**Server side — nothing extra to deploy.** The `/api/inventory` endpoint ships with the app. Auth is off by
default; to require it, set `INVENTORY_TOKEN` in `.env` and `pm2 restart itam`. The endpoint is deliberately
outside the login/permission middleware (machines have no session) and only ever *writes* inventory.

**On each Windows machine:**

```powershell
# Edit $ServerUrl (and $Token, if you set INVENTORY_TOKEN) at the top of the script, or pass them:
powershell -ExecutionPolicy Bypass -File .\inventory-agent.ps1 `
  -ServerUrl "https://itam.yourcompany.internal" -Token "<same-as-INVENTORY_TOKEN-or-omit>"
```

Requires Windows PowerShell 5.1+ (built into Windows 10/11) — no install. Run elevated for the most complete
data. To collect fleet-wide, push it via GPO / a scheduled task, or run it ad-hoc per machine and delete it
after. Re-running is safe and idempotent: a known machine is updated in place (no duplicates), and its
reported hardware replaces the previous list.

The agent also detects **Intune / Entra (Azure AD) enrollment** via `dsregcmd` + the MDM registry key: a
cloud-joined machine is recorded as Intune Enrolled with its tenant as the domain, rather than being
mislabelled "WORKGROUP". (An already-onboarded machine picks this up the next time the agent runs and matches
it.)

It also detects **connected external monitors** (via EDID). A monitor whose serial matches a Monitor asset
already in inventory is auto-linked to the computer it's plugged into — the computer's "Connected Devices"
list fills itself in, a monitor that moves to another machine follows it, and a link deleted by hand is
restored on the next run. A monitor that isn't in inventory yet is parked under **Discovered** with its
make/model/size/serial, ready to onboard with a tag (it's then connected to the machine it was found on
automatically). Built-in laptop panels are skipped. Keyboards, mice and other USB peripherals are
intentionally not collected: Windows exposes no serial for them, so they can't be matched or de-duplicated.

**Monitors that publish no serial** (common — many Lenovo and budget panels report nothing) are still
collected, identified by **model plus the machine they're plugged into**. They go to Discovered like any
other unknown display; once onboarded they're recognised on later runs by that same model+machine pair, so
they aren't re-discovered every time. Two limits follow from having no serial, and the onboarding dialog
warns about them:

- Two **identical** serial-less monitors on the **same** machine collapse into one entry.
- Moving one to a **different** machine makes it appear as a new discovery there. If it's a monitor you
  already have, **Dismiss** it and move the connection by hand on the computer's page.

Give such a monitor the serial from its sticker after onboarding — it's good record-keeping, though the agent
still can't match on it.

**Monitor details the agent fills in**, refreshed on *every* run (so a monitor added before this existed
fills itself in the next time the agent runs on the machine it's plugged into):

| Field | Where it comes from |
| --- | --- |
| Brand | EDID vendor ID expanded to a real name — `LEN` → `Lenovo` |
| Model, Size | EDID product name and physical panel size |
| Resolution, Refresh Rate | the display's **native** mode (its preferred EDID timing, not its highest) |
| HDMI / DisplayPort / DVI / VGA | the port it's **plugged into right now** |
| Speakers, Webcam | a Windows audio/camera device named after the display |

Two rules stop it overwriting your own work: a field the agent didn't report keeps its stored value, and the
tick-boxes are only ever turned **on**. The agent can prove a port is in use; it can't prove one is absent,
so connecting over HDMI sets HDMI without clearing VGA. Brand is the one exception and only in one
direction — it replaces an empty Brand or a bare vendor code like `LEN`, and never a name you typed.

**What no software can read off a monitor** — these stay manual fields on the asset: **panel type**
(IPS/TN/VA), the vendor's **Part Number (MTM)** from the sticker on the back, **which other ports** the
monitor has, USB hub, microphone, pivot, height adjustment and VESA size. EDID simply doesn't carry them, so
the agent never touches these fields and anything you type in them survives every run.

**Note on monitor serials:** Windows reports the display's **EDID** serial, which is often not the number
printed on the sticker. If a monitor you already added doesn't auto-link, run the agent and read the serial
it prints — that's the value to store on the asset.

**If HTTPS uses a self-signed cert**, uncomment the `ServerCertificateValidationCallback` line near the top of
the script so the agent doesn't reject the connection.
