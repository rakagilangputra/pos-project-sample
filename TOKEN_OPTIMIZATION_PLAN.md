# Token-Usage Optimization Plan — `fix/revision-pos-input`

**Status:** Step 1 ✅ done (`c0d2c43`); Step 2 🟡 fully designed, not yet coded; Steps 3–5 ⬜ not started — **continuation guide: `TOKEN_OPTIMIZATION_PROGRESS.md`** · **Branch:** `fix/revision-pos-input` · **Created:** 2026-04-10 · **Updated:** 2026-10-05

## Goal

Reduce tokens consumed by AI agents (and humans) reading this codebase, with **zero substantial behavior change** — pure refactors, deletions of dead code, and doc fixes only. Public exports and runtime behavior must stay identical.

## Context / current state

- `src/context/POSContext.tsx` — **131.6 KB / 3,405 lines** (was reduced ~1,600 lines already; 5 slices extracted: preferences, catalog, audit, supplier-notification, order).
- `src/data/fixtures/` — **76 KB, 6 files, imported by NOBODY**; exports duplicate `src/data/mockData.ts` (74 KB) names exactly (`INITIAL_PRODUCTS`, `INITIAL_ORDERS`, …).
- `AGENTS.md` references `npm test` (vitest) — **no test script, no vitest dep, zero test files exist**.
- Unused deps (zero imports in `src/` or `server.ts`): `@google/genai`, `dotenv`, `motion`, `esbuild`, `autoprefixer`, `jsdom`, `@types/jsdom`.
- Baseline verified: `npm run lint` (tsc --noEmit) ✅ passes at `1238bc1`.

## Execution steps (in order)

### Step 1 — De-duplicate seed data
1. Diff `src/data/fixtures/*` exports vs `src/data/mockData.ts` exports for content equivalence.
2. If equivalent → replace `mockData.ts` bodies with re-exports from `fixtures/` (all existing `from '../data/mockData'` imports keep working). If any export differs → keep the differing data inline in `mockData.ts` and only re-export identical ones.
3. Fallback: if equivalence fails broadly, delete the unused `src/data/fixtures/` folder instead.
4. ✅ Verify: `npm run lint`.

### Step 2 — Continue POSContext slice extraction
Follow the established pattern (`src/context/slices/useXSlice.ts` + `sliceTypes.ts`, wired at top of `POSContext.tsx`). Extract in this order, one commit each:
1. Session/shift slice (`currentSession`, `closedSessions`, open/close/correct actions)
2. Branches/users/customers slice
3. Cart/checkout slice (cart, discounts, tax)
4. Inventory/stock slice (transfers, bad stock, expiry batches)
5. Goods-receiving/purchase-plan slice

**Rule:** the context's public value shape must stay byte-identical. Run `npm run lint` after each slice.

### Step 3 — Fix stale AGENTS.md
Replace the `npm test # jsdom render tests (vitest)` line with the real verification set: `npm run lint` + `npm run build`.

### Step 4 — Prune unused dependencies
Remove from `package.json`: `motion`, `dotenv`, `esbuild`, `autoprefixer`, `jsdom`, `@types/jsdom`. Keep `@google/genai` **only if** you want to preserve the documented `GEMINI_API_KEY` future path (README references it); otherwise remove it and update the README env-var section. Re-run `npm install` to refresh the lockfile.

### Step 5 — Final validation
```
npm run lint      # tsc --noEmit
npm run build     # vite build
npm.cmd run dev   # smoke check http://localhost:3000
```
Commit per step on `fix/revision-pos-input`, push to origin.

## Out of scope (would be substantial — do NOT do in this pass)
- Splitting the 80–110 KB workspace components (Pesanan, Backoffice, GoodsReceiving, PurchasePlan).
- Rewriting components from `usePOS()` → `useDomainHooks` (large diff, marginal token win).

## Expected outcome
- POSContext shrinks 40–60% in this pass.
- ~74 KB of duplicated seed data removed from agent context.
- AGENTS.md stops directing agents to a nonexistent test command.
- Zero runtime/behavior changes.

## Notes for the executing agent
- Standing branch is `fix/revision-pos-input` (see AGENTS.md) — do NOT create a new branch.
- Windows: use `npm.cmd` if PowerShell execution policy blocks `npm.ps1`.
- Admin login for manager-only tabs: user `usr-4`, PIN `9999`.
- `.vscode/` is intentionally untracked — never commit it.
