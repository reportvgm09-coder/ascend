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

**Stack:** React + Vite + TypeScript + Tailwind (client) · Node + Express + SQLite (server) · single-user password login.

## Run locally

```bash
npm install          # root tools
npm run install:all  # server + client dependencies
cp server/.env.example server/.env   # optional: add ANTHROPIC_API_KEY for the AI coach
npm run dev
```

Open http://localhost:5173. On first visit you create your password, then fill in **Settings → Profile** so the guide can personalize everything.

Your data lives in `server/data/ascend.db`. Use **Settings → Backup** to export or restore it.

## Deploy online

SQLite needs a **persistent disk**, so use a host that offers volumes. The included `Dockerfile` works anywhere.

Required environment variables:

| Variable | Purpose |
|---|---|
| `APP_PASSWORD` | Your login password. **Required in production.** Without it, nobody can log in, so a stranger can never claim your app. |
| `ANTHROPIC_API_KEY` | Optional. Enables the AI coach. |
| `JWT_SECRET` | Optional. A stable session secret (one is generated otherwise). |

### Fly.io (recommended: cheap, with volumes)

```bash
fly launch --no-deploy          # accept the existing fly.toml, pick a unique app name
fly volumes create ascend_data --size 1
fly secrets set APP_PASSWORD='your-strong-password' ANTHROPIC_API_KEY='sk-ant-...'
fly deploy
```

### Render

Push this repo to GitHub → **New → Blueprint** → choose the repo (uses `render.yaml`). Set `APP_PASSWORD` and `ANTHROPIC_API_KEY` when prompted. Disks require a paid instance.

### Railway

New project → Deploy from GitHub repo (it detects the Dockerfile) → add a **Volume** mounted at `/data` → set the variables above.

On your phone, open the deployed URL and use "Add to Home Screen" for an app-like experience.

## Project layout

```
server/src/
  index.ts        Express app; serves the built client in production
  auth.ts         password login, JWT cookie, brute-force protection
  api.ts          REST API (generic CRUD + workouts, habits, guide, backup)
  coach.ts        AI coach (Claude, streaming)
  db.ts           SQLite schema
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
