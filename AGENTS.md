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
npm test        # jsdom render tests (vitest)
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

## Working copy

`.vscode/` is intentionally untracked — IDE-local config, do not commit.
