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
- mock Halifax schedule provider backed by local data
- Halifax import-file provider for official schedule data copied from Halifax/HfxRecycles
- round-robin weekly assignment logic
- console notifier fallback
- Telegram bot notifier for development
- built-in admin page at `/admin`
- manual override controls for covered, missed, and carry-over assignments

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment values:

```bash
set APP_PORT=3000
set APP_TIMEZONE=America/Halifax
set HOUSE_ADDRESS=Your Halifax address
set SCHEDULE_SOURCE=file
set STATE_FILE=./data/state.json
set TELEGRAM_BOT_TOKEN=
set TELEGRAM_CHAT_ID=
set HALIFAX_IMPORT_FILE=./data/halifaxImport.json
```

3. Seed sample data:

```bash
npm run seed
```

4. Start the API:

```bash
npm run dev
```

5. Open the admin page:

```text
http://localhost:3000/admin
```

## API

- `GET /health`
- `GET /api/state`
- `GET /api/housemates`
- `POST /api/housemates`
- `PATCH /api/housemates/:id`
- `GET /api/assignments`
- `POST /api/rotation/force-next`
- `PATCH /api/assignments/:id/override`
- `POST /api/jobs/sync-schedule`
- `POST /api/jobs/run-weekly-duty`
- `POST /api/jobs/resend-weekly`

## Notes

- `file` schedule mode uses local sample events and is the default MVP mode.
- `halifax` schedule mode supports an import-file workflow via `HALIFAX_IMPORT_FILE`.
- Use `data/halifaxImport.sample.json` as the template for imported official schedule data.
- The direct official Halifax/HfxRecycles live endpoint is not wired yet because a stable documented API endpoint has not been confirmed.
- Telegram is the default development notifier. Messages are sent to one fixed configured `TELEGRAM_CHAT_ID`, such as your own chat or a house group.
- Telegram reminders include the assignee's phone number and a direct WhatsApp link when a WhatsApp number is available.
- Without Telegram credentials, reminders are logged to the console.
- The admin page supports manual intervention:
  - force the next assignee
  - mark who actually covered a week
  - carry the originally assigned person into the next week
- For live hosting, file-based state is a temporary MVP choice. A hosted production deployment should move app state to a database because many cloud platforms do not guarantee durable local filesystem state across deploys/restarts.
