# Bakery POS Touch Kasir

Touchscreen restaurant-style POS for bakery shops: big touch buttons, fast cash &
QRIS checkout, cashier shifts, consignment/settlement, stock and inventory
tracking, audit log, and a superadmin backoffice.

**Stack:** Vite 6 + React 19 + TypeScript + Tailwind CSS v4, served in dev by an
Express server that mounts Vite in middleware mode.

---

## ⚠️ Read this first: why Live Server shows a blank page

**VS Code Live Server cannot run this project. It will always show a blank white
page. This is expected, not a bug in the app.**

This is a Vite project, not a static HTML site. Live Server is a dumb static file
server, so when `index.html` asks for its entry script:

```html
<script type="module" src="/src/main.tsx"></script>
```

...Live Server hands the browser **raw TypeScript with JSX in it**. That is not
JavaScript, so the module fails to load and `createRoot(...).render()` in
`src/main.tsx` never runs — leaving `<div id="root">` empty. Blank page.

Specifically Live Server does **not** do the four things this project needs:

| What the app needs | Does Live Server do it? | What you get instead |
| --- | --- | --- |
| Transpile `.tsx` / JSX / TypeScript | ❌ | `Uncaught SyntaxError: Unexpected token '<'` |
| Resolve bare imports (`react`, `lucide-react`, `canvas-confetti`) | ❌ | `Failed to resolve module specifier "react"` |
| Compile Tailwind v4 (`@import "tailwindcss"` in `src/index.css`) | ❌ | Unstyled page |
| Resolve the `@` → project-root alias from `vite.config.ts` | ❌ | Unresolved import |

### The fix

Two commands are all you need:

```powershell
npm install     # once. ~40s, installs 257 packages.
npm run dev     # -> http://localhost:3000
```

> **First time on Windows only:** if `npm` answers *"running scripts is disabled
> on this system"*, run
> `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` once and
> try again. Details in [Prerequisites](#prerequisites).

Open **http://localhost:3000**. In VS Code you can also use
`Ctrl+Shift+P` → **Tasks: Run Task** → *Dev server (Express + Vite)*.

To confirm it is working, check DevTools → Network: `/src/main.tsx` should come
back as `Content-Type: text/javascript` containing **transpiled** JS.

> Still want the Live Server button? Run `npm run build` first — `.vscode/settings.json`
> points Live Server at `/dist`, which *is* plain static HTML/JS/CSS. But
> `npm run preview` is the better option (no manual rebuild step).

---

## Prerequisites

- **Node.js 20 or newer.** ✅ Already installed on this machine: **Node.js
  v24.21.0** / **npm 11.19.0**, in `C:\Program Files\nodejs\`, both on `PATH`.

If you ever need to reinstall it, use any of:

```powershell
winget install OpenJS.NodeJS.LTS
```

or download from <https://nodejs.org/en/download>. Then **restart VS Code** so the
new `PATH` is picked up, and verify with:

```powershell
node -v   # expect v20 or newer -> this machine prints v24.21.0
npm -v    # expect 10 or newer  -> this machine prints 11.19.0
```

### Windows: if `npm` says "running scripts is disabled on this system"

PowerShell's default `Restricted` policy refuses to run `npm.ps1`, and the error
looks like this:

```
File C:\Program Files\nodejs\npm.ps1 cannot be loaded because running scripts is
disabled on this system.
```

This is **not** a problem with the project. Allow signed local scripts once, for
your user only (no admin rights needed):

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Then `npm -v` prints a version. (Already applied on this machine.) If you would
rather not change the policy at all, call `npm.cmd` instead of `npm`.

### Why `npm install` fails with `'node' is not recognized`

If Node.js is installed *after* a terminal was already open, that terminal's
`PATH` is stale. The installer then crashes inside a dependency's `postinstall`
step (`protobufjs` runs `node scripts/postinstall`), and npm **rolls the entire
install back**, leaving a `node_modules` folder with **0 packages** in it. The
fix is simply to **close and reopen VS Code** (or the terminal) so the new `PATH`
is picked up, then run `npm install` again.

---

## Commands

| Command | What it does | URL |
| --- | --- | --- |
| `npm run dev` | Express + Vite dev server (use this to preview) | http://localhost:3000 |
| `npm run build` | Production bundle into `dist/` | — |
| `npm run preview` | Serve the built `dist/` folder | http://localhost:4173 |
| `npm run lint` | `tsc --noEmit` typecheck (Vite does **not** typecheck) | — |
| `npm run start` | Same as `dev`, via `tsx server.ts` | http://localhost:3000 |
| `npm run clean` | Delete `dist/` (cross-platform, works on Windows) | — |

`PORT` is read in `server.ts`; it defaults to `3000`.

### Notes on the scripts

- `start` was previously `node server.ts`, which cannot run TypeScript. It is now
  `tsx server.ts`. `NODE_ENV=production` is what makes `server.ts` serve the
  static `dist/` build instead of the Vite middleware.
- `clean` was previously `rm -rf dist`, which fails on Windows because npm runs
  scripts through `cmd.exe`. It now uses Node's own `fs.rmSync`.
- `vite.config.ts` sets `base: '/'` implicitly, so `index.html` references
  `/assets/...`. Any static host must therefore serve `dist/` as the web root
  (see `netlify.toml`, which does exactly that: `publish = "dist"`).

---

## Project layout

```
index.html                 Vite entry HTML (loads /src/main.tsx)
server.ts                  Express host; mounts Vite middleware in dev
vite.config.ts             React + Tailwind v4 plugins, @ -> root alias
netlify.toml               Static deploy config (vite build -> dist)
metadata.json              AI Studio app metadata
.env.example               GEMINI_API_KEY / APP_URL template (see below)
src/
  main.tsx                 React root render
  index.css                Tailwind v4 entry (@import "tailwindcss")
  types.ts                 Shared domain types
  App.tsx                  Workspace tab shell + role-based access
  context/POSContext.tsx   Global POS state
  data/mockData.ts         Seed data (products, stores, ledgers, cycles)
  utils/formatters.ts      IDR / date formatting, sound helpers
  components/              Workspaces and modals (incl. components/stock/)
```

---

## Environment variables (optional, currently unused)

`.env.example` documents two optional variables:

- `GEMINI_API_KEY` — for server-side Gemini calls (`@google/genai` is a declared
  dependency but is **not imported anywhere in `src/` or `server.ts` today**).
- `APP_URL` — the public URL of the deployment.

No `.env` file is required to run the app, so an absent `.env` is normal. If you
add AI features later, create `.env` from the example and keep `GEMINI_API_KEY`
**server-side only** (never expose it to the browser bundle).

---

## Verified working state

Checked end-to-end on this machine (Windows, Node v24.21.0, npm 11.19.0):

| Check | Command | Result |
| --- | --- | --- |
| Dependencies installed | `npm install` | ✅ 257 packages, exit 0 |
| Typecheck | `npm run lint` | ✅ `tsc --noEmit`, no errors |
| Dev server boots | `npm run dev` | ✅ listens on port 3000 |
| API health | `GET /api/health` | ✅ `200 {"status":"ok"}` |
| TSX transpiled | `GET /src/main.tsx` | ✅ `text/javascript`, not raw TSX |
| Tailwind compiled | `GET /src/index.css` | ✅ ~111 kB of generated CSS |
| App renders | React render smoke test | ✅ 45 buttons + menu text painted |
| Production build | `npm run build` | ✅ 1712 modules → `dist/` in 5.4s |
| Preview server | `npm run preview` | ✅ http://localhost:4173 |

`npm run build` prints one *harmless* warning: *"Some chunks are larger than 500 kB
after minification"*. That is a bundle-size hint, not an error, and does not affect
the app.

### If you ever see a blank page again

1. Confirm the address bar says **http://localhost:3000** (the dev server) — *not*
   `127.0.0.1:5500` (Live Server).
2. Press `F12` → **Console**. A blank page always logs an error there; that message
   is the real cause.
3. Re-run `npm run dev` and read the terminal — it tells you whether the server
   started. `EADDRINUSE: address already in use :::3000` means an old dev server is
   still running; close that terminal (or press `Ctrl+C` in it) and start again.
   To use a different port instead: `$env:PORT=3001; npm run dev` (PowerShell).
