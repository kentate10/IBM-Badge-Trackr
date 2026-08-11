# Deploying to Railway

Railway builds this app from a GitHub repo (it can't build straight from
files on your computer through the assistant), so there are two steps: get
the code onto GitHub, then connect Railway to it.

## Part 1 — Push the code to GitHub

If you don't already have a repo for this:

1. Go to [github.com/new](https://github.com/new), create a repo (e.g.
   `badge-acceleration-tracker`). Private is fine. Don't initialize it with a
   README (we already have one).
2. On your computer, open a terminal in this project folder
   (`badge-tracker/`) and run:

   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/badge-acceleration-tracker.git
   git push -u origin main
   ```

Once that's pushed, tell me the repo name (in `owner/name` form, e.g.
`kentate10/badge-acceleration-tracker`) and I can take it from here using the
Railway connection — creating the project, adding Postgres, setting the
passwords, and deploying — you'd just need to approve each step. Everything
below is also the manual path if you'd rather do it yourself in the Railway
dashboard.

## Part 2 — Railway project setup (manual path)

### 1. Create the project

In the [Railway dashboard](https://railway.app/new): **New Project → Deploy
from GitHub repo** → pick the repo you just pushed.

### 2. Add PostgreSQL

In the same project: **New → Database → Add PostgreSQL**. Railway creates it
and exposes a `DATABASE_URL` variable automatically.

### 3. Connect the database to the app

Open your web service's **Variables** tab and add:

| Variable | Value |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (references the Postgres service — type this literally, Railway resolves it) |
| `TEAM_PASSWORD` | a password you'll share with the team |
| `ADMIN_PASSWORD` | a different password, just for you |
| `SESSION_SECRET` | a long random string — generate one locally with `openssl rand -hex 32` |

### 4. Make sure the database schema gets created

Open the web service's **Settings → Deploy** section and set the **Pre-Deploy
Command** to:

```
npx prisma db push
```

This runs before every deploy and keeps the database tables in sync with
`prisma/schema.prisma`. It's safe to run repeatedly — it only creates or
adjusts tables, it never touches your data.

Build and start commands should already be auto-detected correctly
(`npm install` / `npm run build` / `npm run start`) since Railway's Nixpacks
builder recognizes Next.js — you shouldn't need to set those manually.

### 5. Deploy

Trigger the first deploy (Railway does this automatically after you connect
the repo; otherwise click **Deploy**). Watch the build logs — the first
deploy will run `prisma generate` during `npm install` and build the Next.js
app.

### 6. Load the starting data (one time only)

The database is empty until you seed it. From your computer, with the
[Railway CLI](https://docs.railway.com/guides/cli) installed and logged in:

```bash
railway link          # pick this project when prompted
railway run npm run db:seed
```

This loads the 16-person roster, every Skills Tracker / General Tracker
field, and everything already known as of the last workbook update. **Only
run this once** — running it again will overwrite anyone's live edits back to
the seeded values for the specific fields listed in `prisma/seed.ts` (this is
intentional so re-runs don't silently discard changes if you ever need to
re-seed on purpose — just know what it does before running it again).

### 7. Get a public URL

In the web service: **Settings → Networking → Generate Domain**. Railway
gives you a `*.up.railway.app` URL — that's the link to share with the team.

## Day-to-day updates going forward

- **Team members updating their own progress**: they just use the live site,
  no redeploy needed — it writes straight to the database.
- **Code changes** (new fields, design tweaks): push to the `main` branch on
  GitHub and Railway redeploys automatically.
- **Quincenal snapshot for the trend chart**: log in as admin and click "Guardar
  snapshot quincenal" on the dashboard every two weeks. This is a manual
  click by design — it's the moment that defines "this is what quincena N
  looked like" for the trend chart, rather than something silently automated.

## If something looks broken after a deploy

Check the deploy logs in the Railway dashboard (Deployments tab → View Logs),
or ask me — once the project exists I can pull build/runtime logs directly
through the Railway connection and help debug from there.
