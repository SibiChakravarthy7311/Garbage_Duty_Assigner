# Garbage Duty Assigner

Weekly household waste-duty assignment service for a Halifax address.

## What it does

- stores roommates and room activity state
- stores collection events for the house address
- assigns one active roommate to the full duty week
- sends a weekly-duty reminder at the start of the week
- optionally sends a backup reminder before collection day

## Current status

This repo is scaffolded for an MVP:

- file-based persistence in `data/state.json`
- file-backed sample schedule for local development
- live Halifax/ReCollect schedule sync via `HALIFAX_PLACE_ID`
- Halifax import-file fallback for official schedule data copied from Halifax/HfxRecycles
- round-robin weekly assignment logic
- console notifier fallback
- Telegram bot notifier for development
- built-in admin page at `/admin`
- manual override controls for covered, missed, and carry-over assignments

## Setup

1. Install dependencies:

```bash
cmd /c npm install
```

2. Copy environment values:

```bash
set APP_PORT=3000
set APP_TIMEZONE=America/Halifax
set HOUSE_ADDRESS=Your Halifax address
set ADMIN_USERNAME=admin
set ADMIN_PASSWORD=changeme
set SCHEDULE_SOURCE=file
set STATE_FILE=./data/state.json
set TELEGRAM_BOT_TOKEN=
set TELEGRAM_CHAT_ID=
set HALIFAX_IMPORT_FILE=./data/halifaxImport.json
```

`file` is the recommended default for local development. Switch to `halifax` when you want imported or live Halifax data.

3. Seed sample data:

```bash
cmd /c npm run seed
```

4. Start the API:

```bash
cmd /c npm run dev
```

5. Open the admin page:

```text
http://localhost:3000/admin
```

By default, the admin login is `admin` / `changeme` unless you override `ADMIN_USERNAME` and `ADMIN_PASSWORD`.

## Verification

Use these commands on Windows PowerShell:

```bash
cmd /c npm run check
cmd /c npm run build
cmd /c npm test
cmd /c npm run verify
```

If your local install looks broken, for example `node_modules/.bin` is missing or `npm ls` reports invalid packages, remove `node_modules` and reinstall from `package-lock.json`:

```bash
cmd /c rmdir /s /q node_modules
cmd /c npm install
```

## Free Hosting on Cloudflare

This repo now includes a Cloudflare Worker + D1 deployment path so the app can stay online for free without your PC running continuously.

### Architecture

- `src/worker.ts` serves the admin page and API
- `src/data/d1Store.ts` stores app state in Cloudflare D1
- `wrangler.toml` configures the Worker, D1 binding, and cron triggers
- `migrations/0001_init.sql` creates the D1 table

### Recommended mode

Use `SCHEDULE_SOURCE=halifax` for hosted deployments. In the Worker runtime, `file` mode only uses the built-in sample schedule.

### Deploy steps

1. Push the repo to GitHub.
2. Create a free Cloudflare account.
3. Use Wrangler on demand with `npx` so it does not become a project dependency:

```bash
cmd /c npx wrangler@latest --version
```

4. Create the D1 database:

```bash
cmd /c npx wrangler@latest d1 create garbage-duty-assigner
```

5. Copy the returned `database_id` into `wrangler.toml`.
6. Apply the migration remotely:

```bash
cmd /c npx wrangler@latest d1 migrations apply garbage-duty-assigner --remote
```

7. If you want to keep your current local housemates and assignment history, export the existing file-based state and import it into D1:

```bash
cmd /c npm run export:d1-seed
cmd /c npx wrangler@latest d1 execute garbage-duty-assigner --remote --file=d1-seed.sql
```

8. Set the required secrets:

```bash
cmd /c npx wrangler@latest secret put HOUSE_ADDRESS
cmd /c npx wrangler@latest secret put ADMIN_USERNAME
cmd /c npx wrangler@latest secret put ADMIN_PASSWORD
cmd /c npx wrangler@latest secret put APP_BASE_URL
cmd /c npx wrangler@latest secret put HALIFAX_PLACE_ID
```

9. Set optional secrets when needed:

```bash
cmd /c npx wrangler@latest secret put TELEGRAM_BOT_TOKEN
cmd /c npx wrangler@latest secret put TELEGRAM_CHAT_ID
```

10. Deploy:

```bash
cmd /c npx wrangler@latest deploy
```

11. Verify:
   - `/health`
   - `/admin`

### Default Worker schedule

The Worker runs on Cloudflare cron at `14:05`, `15:05`, `16:05`, and `17:05` UTC every day. That intentionally spans Halifax DST changes while the app logic decides whether reminders are actually due.

### Local Worker development

```bash
cmd /c npx wrangler@latest dev
```

## Hosting on Render

This repo includes a `render.yaml` Blueprint for deploying the app as a Render web service with a persistent disk.

### Deploy steps

1. Push your latest code to GitHub.
2. In Render, click `New` -> `Blueprint`.
3. Connect this repository and select the `main` branch.
4. Render will create the web service from `render.yaml`.
5. Set values for:
   - `HOUSE_ADDRESS`
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
   - `TELEGRAM_BOT_TOKEN` if using Telegram notifications
   - `TELEGRAM_CHAT_ID` if using Telegram notifications
   - `HALIFAX_PLACE_ID` if using live Halifax schedule sync
6. After deployment, verify:
   - `/health` returns OK
   - `/admin` loads

### Render settings

- build command: `npm install && npm run build`
- start command: `npm start`
- health check path: `/health`
- persistent disk mount: `/opt/render/project/src/data`
- state file path: `./data/state.json`
- import fallback file: `./data/halifaxImport.json`

### Environment notes

- The app supports Render's `PORT` environment variable automatically.
- `APP_BASE_URL` is optional on Render because the app falls back to `RENDER_EXTERNAL_URL`.
- `SCHEDULE_SOURCE=file` is the default in `render.yaml`. Change it to `halifax` and set `HALIFAX_PLACE_ID` if you want live Halifax data.

## API

- `GET /health`
- `GET /api/state`
- `GET /api/dashboard`
- `GET /api/admin/session`
- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET /api/housemates`
- `POST /api/housemates`
- `PATCH /api/housemates/:id`
- `POST /api/housemates/reorder`
- `GET /api/assignments`
- `POST /api/jobs/sync-schedule`
- `POST /api/jobs/run-weekly-duty`
- `POST /api/jobs/resend-weekly`
- `POST /api/jobs/send-completion-check`

## Notes

- `file` schedule mode uses local sample events and is the default MVP mode.
- `halifax` schedule mode uses live ReCollect data when `HALIFAX_PLACE_ID` is set.
- `HALIFAX_IMPORT_FILE` is a fallback import workflow when live fetch is not configured.
- Use `data/halifaxImport.sample.json` as the template for imported official schedule data.
- Telegram is the default development notifier. Messages are sent to one fixed configured `TELEGRAM_CHAT_ID`, such as your own chat or a house group.
- Telegram reminders include the assignee's phone number and a direct WhatsApp link when a WhatsApp number is available.
- Without Telegram credentials, reminders are logged to the console.
- The admin page supports viewer and admin modes:
  - viewers can inspect the dashboard and run `Sync Halifax`
  - admins can send reminders, reassign/carry over the current week, edit housemates, and change rotation order
- For live hosting, file-based state is a temporary MVP choice. A hosted production deployment should move app state to a database because many cloud platforms do not guarantee durable local filesystem state across deploys/restarts.
