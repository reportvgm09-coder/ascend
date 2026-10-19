# Ascend

A personal growth app for workouts, nutrition, goals and habits, mindset, learning and confidence, with a built-in coach that guides you in every area.

## What's inside

| Area | Features | How the guide helps |
|---|---|---|
| **Today** | Growth score for 6 areas, prioritized to-dos, daily challenges, lesson of the day, weekly review | Turns all your data into "do this next" |
| **Fitness** | Workout logger, history, strength and body-weight charts, 4 programs, 43-exercise library | Picks a program for your level, shows the next session, says when to add weight (double progression), flags undertrained muscles |
| **Diet** | Meal and water logging, macro bars, 7-day chart, meal ideas (veg / egg / non-veg) | Calculates BMR → TDEE → calorie and macro targets for your goal, explains the math, suggests high-protein meals that fit what you have left |
| **Goals** | Vision statement, habits with cue ("After I…"), streaks, SMART goals | Warns when a streak is at risk or a goal falls behind schedule |
| **Mind** | Journal (mood, energy, gratitude, wins), mood trend, focus timer, breathing and stress tools | Spots low-mood periods, prompts reflection and deep work |
| **Learn** | Books, courses, skills, practice log, 32 growth challenges (confidence, discipline, mindset, knowledge), lessons | Nudges stale learning; challenge difficulty unlocks as you progress |
| **Coach** | AI chat (Claude) that sees a snapshot of all your data | Personal plans, reviews, and answers. Optional, needs an API key |

**Stack:** React + Vite + TypeScript + Tailwind (client) · Node + Express + SQLite/libSQL (server; local file or Turso) · single-user password login.

## Run locally

```bash
npm install          # root tools
npm run install:all  # server + client dependencies
cp server/.env.example server/.env   # optional: add ANTHROPIC_API_KEY for the AI coach
npm run dev
```

Open http://localhost:5173. On first visit you create your password, then fill in **Settings → Profile** so the guide can personalize everything.

Locally your data lives in `server/data/ascend.db`. Use **Settings → Backup** to export or restore it.

## Deploy online for free (Render + Turso)

Render's free web service has no persistent disk, so your data lives in a free **Turso** database (hosted SQLite). Neither service needs a credit card for its free tier.

**Trade-off of the free tier:** the app sleeps after 15 minutes without visits, and the first visit after that takes about a minute to wake it up.

### 1. Create the database (Turso)

1. Sign up at https://turso.tech (GitHub login works).
2. Create a database named `ascend`, in the region closest to Singapore.
3. On the database page, copy its **URL** (`libsql://ascend-<you>.turso.io`) and create a **token**. Keep both handy for step 2.

### 2. Create the web service (Render)

1. Sign up at https://render.com with GitHub.
2. **New → Blueprint**, pick this repository. Render reads `render.yaml`.
3. Fill in the values it asks for:
   - `APP_PASSWORD`: the password you'll log in with
   - `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`: from step 1
   - `ANTHROPIC_API_KEY`: optional, enables the AI coach (leave empty to skip)
4. Click **Apply**. The first build takes a few minutes. Your app lives at `https://ascend-xxxx.onrender.com`.

Every push to `main` redeploys automatically. If the database settings are missing, the app refuses to start rather than saving data that would be wiped.

### Other hosts

The `Dockerfile` runs anywhere. Set `APP_PASSWORD`, and either set the Turso variables or mount a persistent volume at `/data`.

On your phone, open the app URL and use "Add to Home Screen" for an app-like experience.

## Project layout

```
server/src/
  index.ts        Express app; serves the built client in production
  auth.ts         password login, JWT cookie, brute-force protection
  api.ts          REST API (generic CRUD + workouts, habits, guide, backup)
  coach.ts        AI coach (Claude, streaming)
  db.ts           database client (local SQLite file or Turso) + schema
  guide/          rule-based coaching engine
    briefing.ts   daily recommendations, scores, weekly review
    training.ts   programs, progressive overload, muscle balance
    nutrition.ts  BMR/TDEE/macros, meal suggestions
    growth.ts     habits, goals, mood, learning, challenges
    content.ts    programs, challenges, lessons, meal ideas  ← edit to customize
client/src/
  pages/          Today, Fitness, Nutrition, Goals, Mind, Learn, Coach, Settings
  components/     UI kit + layout
```

> Nutrition and training guidance are general estimates, not medical advice.
