# AGENTS.md

Conventions for working on this repository. Read this before making changes.

## Branch naming

**`fix/revision-pos-input`** is the standing branch name for this project.

Use this same branch for all work in this repo instead of inventing a new
descriptive branch per task. Delete-and-recreate it off `origin/main` for each
piece of work if you want a clean base:

```sh
git checkout main
git pull
git checkout -B fix/revision-pos-input
```

> History note: this work was originally pushed as `fix/remove-header-tab-badges`
> and merged to `main` via PR #2 (`1f3685d`). That branch was then renamed on
> the remote to `fix/revision-pos-input`. The old name is **retired — do not
> recreate it.** If a `fix/remove-header-tab-badges` ref ever appears again it is
> a stray duplicate; delete it rather than pushing to it.

## Verification

Run these before considering any change complete:

```sh
npm run lint    # tsc --noEmit — type check
npm run build   # vite build
```

There is **no test suite** — `package.json` has no `test` script and no
vitest/jsdom config exists, so `npm run lint` + `npm run build` are the
full verification gate. For changes that touch the dev server or wiring,
also smoke-test it:

```sh
npm.cmd run dev   # tsx server.ts -> http://localhost:3000
```

For UI/chrome changes (tab bar, badges, header), assert the rendered text
directly rather than trusting the type check:

- `document.querySelector('#nav-tab-pesanan')` → text must be exactly `Pesanan`
- the `<nav>` text must contain **no digits** (no counter badges)

## Running locally

```sh
npm install
npm run dev     # -> http://localhost:3000
```

- `node server.ts` does **not** work (plain Node can't load TS) — `start` and
  `dev` both go through `tsx`.
- On Windows, execution policy may block npm.ps1 — use `npm.cmd run dev`, and
  fix permanently with `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
- A stale `node.exe` early in `PATH` (nvm/Volta leftovers) will shadow the real
  Node. Check `Get-Command node` before debugging anything else.
- Admin login for manager-only tabs: user `usr-4`, PIN `9999`.

## Declared but unused dependencies

`@google/genai`, `dotenv`, `motion`, `esbuild`, `autoprefixer`, `jsdom` and
`@types/jsdom` are declared in `package.json` but are **not imported anywhere**
in `src/`, `server.ts` or `vite.config.ts`. There is no `postcss.config.*` (Tailwind
v4 runs through `@tailwindcss/vite`), so `autoprefixer` is inert. Don't wire them
up casually — add the import and the dep in the same change, or leave them out.

## Working copy

`.vscode/` is intentionally untracked — IDE-local config, do not commit.
