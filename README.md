# 🌍 Capitals Quiz

Test your knowledge of the world's countries and capitals — solo, or head-to-head
against a friend in real time.

- **Solo mode** — pick a continent (or build a custom set), answer, and get a full
  breakdown: score, accuracy, time taken, and every question with your answer next
  to the right one.
- **Multiplayer** — create a room, share a 5-character code, and race someone
  question by question. Both correct? The faster answer takes the point.
- Works on a phone, remembers your name, has light and dark modes, and never
  signals right/wrong with colour alone.

---

## Quick start

```bash
npm install     # installs all three workspaces
npm run dev     # server on :4000, client on :5173
```

Open <http://localhost:5173>. To try multiplayer on one machine, open the app in
two browser windows (use a private window for the second player so they get their
own saved name).

Other scripts:

| Command | What it does |
| --- | --- |
| `npm run dev` | Runs the API/socket server and the Vite dev server together |
| `npm run dev:server` / `npm run dev:client` | Run just one side |
| `npm run build` | Production build of the front end into `client/dist` |
| `npm start` | Runs the server alone (what a host like Render runs) |
| `npm test` | Game-logic and match-engine tests (`node:test`, no extra deps) |

Node 20+ is required (the server uses `node --watch` in dev and JSON import
attributes).

---

## Project layout

```
capitals-quiz/
├── shared/                    # framework-free game logic, used by BOTH sides
│   ├── data/countries.json    # ← the dataset: 194 countries
│   └── src/
│       ├── countries.js       # dataset access, continents, flag URLs
│       ├── quiz.js            # question + distractor generation
│       ├── scoring.js         # round resolution and player stats
│       ├── roomCode.js        # unambiguous room codes
│       ├── protocol.js        # socket event names, defaults, timings
│       └── validate.js        # input validation (client hints + server guard)
│
├── server/                    # Express + Socket.io, in-memory rooms
│   └── src/
│       ├── index.js           # HTTP app, socket server, room sweeper
│       ├── rooms.js           # RoomStore: create / find / expire
│       ├── match.js           # the match engine: timers, reveals, scoring
│       └── socketHandlers.js  # thin socket layer, validation + delegation
│
└── client/                    # React (Vite), mobile-first
    └── src/
        ├── game/useSoloGame.js    # solo game loop
        ├── hooks/useMultiplayer.js# every socket concern, in one hook
        ├── components/            # Flag, OptionButton, Timer, pickers, …
        ├── screens/               # one file per screen
        └── styles.css             # design tokens + light/dark
```

The split that matters: **`shared/` holds the rules, `server/` holds the clock,
`client/` holds the pixels.** Solo mode and multiplayer build questions with the
same function, so a Europe quiz is the same quiz either way.

---

## How multiplayer works

1. The host creates a room; the server generates a code from an alphabet with no
   ambiguous glyphs (no `0/O`, `1/I/L`, `5/S`, `2/Z`, `8/B`).
2. Both players toggle ready; the server builds the quiz and starts the match.
3. Each question is pushed to both players at the same moment, with the correct
   answer **stripped from the payload** — the client is never told the answer
   before the reveal.
4. A player's answer is acknowledged **only to that player**. Nothing tells you
   whether your opponent has answered yet, so there is nothing to peek at.
5. The round reveals when both have answered or the timer expires. Both correct →
   the faster answer scores; one correct → that player scores; neither → no point.
6. A scoreboard shows for ~3 seconds, then the next question goes out.

### The awkward cases, handled

| Situation | What happens |
| --- | --- |
| A player disconnects mid-match | The match **pauses**, the question clock freezes where it stood, and the other player sees a 60-second reconnect countdown. Reconnecting resumes the same question with the time that was left. |
| They never come back | The match ends and the connected player is declared the winner. |
| A player refreshes the page | Their browser keeps a stable player id in `localStorage` and reclaims its seat automatically. |
| Nobody joins a room | It expires after 10 minutes. Finished rooms are cleaned up 5 minutes after the final whistle (long enough for a rematch). |
| A player runs out of time | Counts as a wrong answer, and the round reveals as usual. |
| One player wants a rematch | Both go back to the lobby with the same settings; the asker is marked ready. |

### Socket events

Client → server: `room:create`, `room:join`, `room:rejoin`, `room:leave`,
`player:ready`, `answer:submit`, `match:rematch`.

Server → client: `room:state`, `room:closed`, `match:question`,
`match:answer-ack`, `match:reveal`, `match:end`, `match:paused`, `match:resumed`.

Names and defaults live in `shared/src/protocol.js` so the two sides cannot drift.

---

## The dataset

`shared/data/countries.json` is the single source of truth — 194 entries (the 193
UN member states plus Vatican City), each one:

```json
{
  "code": "JP",
  "name": "Japan",
  "capital": "Tokyo",
  "continent": "Asia",
  "flag": "🇯🇵",
  "flagUrl": "https://flagcdn.com/jp.svg"
}
```

Edit the file and both the client and the server pick the change up — no build
step. `npm test` checks the file for duplicate codes, missing capitals and unknown
continents. Flags are rendered from [flagcdn.com](https://flagcdn.com) via the ISO
alpha-2 code, and fall back to the flag emoji in the record if the CDN can't be
reached.

Wrong answers are never drawn from the whole world: they come from the quiz's own
pool (the chosen continent, or your custom set) so a Europe question doesn't get
three Pacific islands as distractors.

---

## Deployment

### Option A — one service, one URL (simplest)

If `client/dist` exists, the Express server serves the built front end itself, so
a single host (Render, Fly.io, Railway…) gives you a working link:

- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- No environment variables needed. With `VITE_SERVER_URL` unset, the client
  connects back to its own origin — which is the same service.

Without the build step you get an API-only server, and `/` answers
`Cannot GET /`. That is the signal that `npm run build` didn't run.

### Option B — split front end and back end

- **Backend** (Render/Fly/Railway): build `npm install`, start `npm start`, and
  set `CLIENT_ORIGIN` to your front-end URL (comma-separate several).
- **Frontend** (Vercel/Netlify/Cloudflare Pages): build `npm run build`, output
  directory `client/dist`, and set `VITE_SERVER_URL` to the backend URL.

`VITE_SERVER_URL` is inlined at build time, so changing it needs a redeploy, not
just a restart.

### Either way

Rooms live in memory, so run a **single instance** — with two, players can land
on different servers and never see each other. Free tiers that sleep when idle
will make the first visit slow to wake, and a match started at that moment can
feel laggy.

Copy `server/.env.example` and `client/.env.example` to `.env` to configure
either side locally.

---

## Accessibility notes

- Every flag image carries `alt="Flag of <country>"`, and the emoji fallback is
  labelled the same way.
- Right and wrong are shown with ✅/❌ icons plus text for screen readers, never
  colour alone.
- Live regions announce the reveal, the streak counter, and connection changes;
  the countdown is a labelled `progressbar`.
- Tap targets are ≥44px, the layout is single-column on phones, and
  `prefers-reduced-motion` is respected.

## Tests

```bash
npm test
```

23 tests across the two packages cover dataset integrity, question generation (no
repeats, four distinct options, pool-bound distractors), the head-to-head scoring
rules, answer secrecy (an answer is acknowledged only to its sender), pause and
resume on disconnect, forfeits, draws, and room expiry.
