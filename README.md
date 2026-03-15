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
