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

> One-off exception already on the remote: `fix/remove-header-tab-badges`
> (single commit `ef05b90`, header badge removal). Left as-is by agreement —
> do not rename it.

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
