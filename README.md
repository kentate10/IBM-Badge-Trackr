# Badge Acceleration Tracker

Web tracker for IBM Consulting Costa Rica's 2026 Core Skills Expectations
program (Badge Acceleration). Replaces the manual "Skills Tracker Week 0" /
"General Tracker Week 0" Excel workbook with a live, shared tool that:

- Holds every field from both tracker tabs, scoped per role (PM/BA) and band
  (Foundation/Experienced/Expert).
- Lets each team member log in and mark their own progress (Status +
  %Progress per item).
- Gives Ken an admin dashboard with team-wide charts (status breakdown,
  per-person progress, per-section detail, and a quincenal trend line).
- Has a links page with every reference URL the team needs (Your Learning
  plans, MyScore, Industry Roadmap, Consulting Academy, etc).

Stack: **Next.js 16 (App Router) + TypeScript + Tailwind CSS + Prisma +
PostgreSQL + Recharts**, built to deploy on **Railway**.

## Local development

```bash
npm install
cp .env.example .env      # then fill in real values
npm run db:push           # create tables from prisma/schema.prisma
npm run db:seed           # one-time: load the roster + known progress
npm run dev
```

## How access works

Two shared passwords (set as env vars, see `.env.example`):

- `TEAM_PASSWORD` — anyone on the team uses this to log in, picks their name
  once, and lands on their own editable checklist from then on.
- `ADMIN_PASSWORD` — Ken's password, opens the admin dashboard (team charts,
  ability to edit anyone, and the "save quincenal snapshot" button).

No individual accounts to manage — see `DEPLOY.md` if you want to change this
model later.

## Deployment

See [`DEPLOY.md`](./DEPLOY.md) for the full step-by-step Railway guide.
