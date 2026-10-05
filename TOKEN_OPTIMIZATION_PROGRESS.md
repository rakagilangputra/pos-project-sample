# Token Optimization — Execution Progress (Handoff Doc)

**Branch:** `fix/revision-pos-input` · **HEAD when saved:** `c0d2c43` · **Updated:** 2026-10-05
**Plan file:** `TOKEN_OPTIMIZATION_PLAN.md` (authoritative step list — this doc adds design/state)

Read this file first, then the plan. **`src/context/POSContext.tsx` has NOT been modified yet** —
all Step 2 work so far is analysis/design, captured below so it does not have to be redone.

## Status overview

| Plan step | Status | Commit |
|---|---|---|
| 1. De-duplicate seed data | ✅ DONE, verified, committed, pushed | `c0d2c43` |
| 2. POSContext slice extraction (5 slices) | ✅ **ALL 5 DONE** (session, org, cart, inventory, goods receiving) | `c34be0f` |
| fix. Ownership `'own'` vs `'owned'` | ✅ normalized; the two type-only casts deleted | `52ab553` |
| 3. Fix stale AGENTS.md | ✅ DONE — real gate documented | `d728269` |
| 4. Prune unused dependencies | ✅ DONE — 7 deps removed (50 packages) | `7230737` |
| 5. Final validation + push | ✅ DONE — lint, build, dev smoke, invariants | — |

**Nothing is outstanding. This plan is fully executed.**

### Final validation (Step 5)
- `npm run lint` ✅ clean · `npm run build` ✅ (4.0 s) · dev smoke ✅ (6/6 routes 200)
- `POSContextType` (310 lines) and `value={{…}}` (129 lines) **byte-identical to baseline `2bfc6ab`**
- Ownership fix confirmed in the shipped 1 MB bundle: 0 erased casts remain
- `package-lock.json` gitignored — `main` deleted it deliberately in `856e275`, so re-adding a
  regenerated 3,825-line lockfile would override that decision.

**Standing caveat:** with no test suite in this repo, "no behavior change" rests on the
byte-identical diffs, the 8-case truth table for the ownership normalization, and type-check +
build + module-load smoke — not on automated assertions.

**`src/context/POSContext.tsx` is now 1,879 lines** (was 3,765 at the start of Step 2) and holds only
the context interface, auth state, a handful of cross-cutting derivations, the branch views and the
`value={{…}}` object. Everything else lives in `src/context/slices/`.

**Final provider wiring order** (matters — the graph is acyclic only in this order):

```
usePreferencesSlice → useOrgState() → currentUser → useAuditSlice → useCatalogSlice
  → useSessionSlice → useInventorySlice → useCartSlice → useOrgActions
  → useGoodsReceivingSlice → useOrderSlice → useSupplierNotificationSlice
```

**Steps 3–5 are now done too** — AGENTS.md documents the real gate, 7 unused dependencies are
pruned, and the final `lint`/`build`/smoke pass is green. `scripts/tmp-compare-fixtures.ts` and
`scripts/tmp-scan-deps.ts` were deleted earlier (`f1dd658`) — the temporary analysis tooling is gone.

**Note on `npm test`:** this is now settled — `package.json` has **no `test` script** (only
`dev`/`build`/`start`/`preview`/`clean`/`lint`). AGENTS.md no longer references one (`d728269`).
**Wiring gotcha:** the editor tool rewrites files with LF endings. After each commit run
`git diff --stat`; if Git warns "LF will be replaced by CRLF", normalize the touched file back to CRLF
(the repo is `core.autocrlf=true`, so committed content is unaffected either way).

## Verification commands (Windows)

```sh
npm run lint        # tsc --noEmit  — run after EVERY slice commit
npm run build       # vite build    — final validation (plan Step 5)
npm.cmd run dev     # smoke check http://localhost:3000 (use npm.cmd if ps1 blocked)
```
There is **no test script** (that stale claim in AGENTS.md is plan Step 3). Admin login: `usr-4` / PIN `9999`.

## Temp tooling (committed in `scripts/`)

- `scripts/tmp-compare-fixtures.ts` — Step 1 verifier: imports `mockData` + all `fixtures/*`, deep-compares
  every export (stable-sorted + raw JSON). Re-run: `node_modules\.bin\tsx.CMD scripts\tmp-compare-fixtures.ts`
  Expected: `EQUAL=21 RAW_EQ`, `DIFF=INITIAL_SETTLEMENT_CYCLES` (fixtures copy is stale on purpose),
  `MISSING_IN_MOCK=4` (date helpers, never part of mockData's API).
- `scripts/tmp-scan-deps.ts` — Step 2 dependency scanner. **Line ranges are valid only for the current
  (un-refactored) POSContext.tsx**; they break once edits start. Update ranges or delete when no longer useful.
- Delete both files in Step 5 (they are marked temporary in their headers).

## Step 1 — DONE (commit `c0d2c43`)

`src/data/mockData.ts`: 2,281 lines → **91 lines** (−2,278 lines). Verified equivalence before rewriting:

- All 22 mockData exports exist in `src/data/fixtures/`; runtime deep-compare showed **21/22 byte-identical
  (raw `JSON.stringify` equal, key order included)**.
- `INITIAL_SETTLEMENT_CYCLES` **differs** (mockData has the intentionally-trimmed 2-cycle version;
  `fixtures/suppliers.ts` still carries the removed `overdue`/`due` seeds). Per plan Step 1.2 it **stays inline
  in mockData.ts** with a comment explaining why it is not re-exported. Do NOT "fix" this without reading
  the comment in `src/data/mockData.ts` (permanent-badge bug; POS-US-032/034/035 history).
- mockData now re-exports from `./fixtures/{masterData,customers,orders,suppliers,inventory}`; all existing
  `from '../data/mockData'` imports keep working unchanged.
- `npm run lint` passed at commit time.

## Step 2 — Slice extraction: DESIGN (not yet implemented)

### Established pattern (follow exactly)

`src/context/slices/useXSlice.ts` — hook receives an explicit typed `UseXDeps` interface, body is the
provider code moved **verbatim**, returns the moved names. Wired near the top of `POSContext.tsx` via
destructure so every previously-existing local name still exists → the `value={{...}}` object
(lines 3624–3752) and `interface POSContextType` (lines 68–380) stay **byte-identical** (hard rule).
Precedent: `usePreferencesSlice`, `useCatalogSlice`, `useAuditSlice`, `useOrderSlice`,
`useSupplierNotificationSlice`.

### The blocker that was solved: a 3-way hook cycle

A naive "one hook per slice" split is **cyclic** (deps verified by scan; single call sites noted):

- session actions → `users` state (org) — only `handOffSession` L1161
- session actions → `verifySupervisorPin` (org) — L1130/1240/1276
- org actions → `currentSession` (session) — only `toggleBranchStatus` L1029
- org actions → `setCart` (cart) — only `selectBranch` L958
- cart actions → `currentSession` (session) — L1602/1772/1778/1838/1884/1994
- cart actions → `selectedCustomer`/`setCustomers` (org) — L1670/1779/1787/1800/1887/1970-1972
- cart actions → `setExpiryBatches` (inventory) — L1931
- inventory & goods-receiving actions → `branches`/`selectedBranch` (org)

**Chosen solution (all hard rules preserved):** split ONLY the org slice into two hooks —
`useOrgState()` (pure state, **zero deps**, wired early) and `useOrgActions(deps)` (wired after cart).
Everything else is a single hook. Also: `handOffSession` and `setAsideOrders` state **stay in the
provider** (plan only mandates "open/close/correct actions" + "cart, discounts, tax" for those domains),
which removes the last cycle edges.

`currentUser`/`setCurrentUser` state **stays in the provider** (lines 452–476) — cross-cutting auth state
consumed by `useAuditSlice`/`useCatalogSlice` before any new slice exists.

### Final provider wiring order (target state after all 5 commits)

> Numbered with **pre-Commit-1** line numbers (3,765-line file) — it is a *structural* map of what
> moves/stays. Use the refreshed range table above for exact current line numbers.

```
1  imports + interface (lines 68–380)            — UNCHANGED
2  [org state block L382–451]                    — REMOVED → useOrgState()
3  currentUser state L452–476                    — STAYS in provider
4  NEW: const { branches, users, selectedBranchId, isStoreSelectionModalOpen, set…,
        hasUnsavedChanges, set…, confirmSwitchStore, set…, customers, selectedCustomer,
        setCustomers, setSelectedCustomer, verifySupervisorPin } = useOrgState();
5  selectedBranch / isBranchReadOnly L478–480    — STAYS (uses branches from step 4)
6  usePreferencesSlice L483                      — STAYS
7  [session state L485–531]                      — REMOVED → useSessionSlice()
8  products/suppliers/commissionLedger/settlementCycles state L535–681 — STAY
9  [customers state L683–697]                    — REMOVED → useOrgState()
10 [goods-receiving state L698–745]              — REMOVED → useGoodsReceivingSlice()
11 categoryClosings state L746–761               — STAYS
12 [inventory state L762–841]                    — REMOVED → useInventorySlice()
13 [cart state L842–848]                         — REMOVED → useCartSlice()
14 setAsideOrders state L850–861                 — STAYS (session guard + hold actions dep)
15 orders L863–893, activeReceiptOrder L897–898  — STAY
16 useAuditSlice L901, useCatalogSlice L903–916  — STAY (catalog's selectedBranchId now from step 4)
17 NEW wiring block (replaces removed L918–1095 + L1096–1158 + L1207–1310):
      useSessionSlice        → after audit (needs addAudit, verifySupervisorPin)
      useInventorySlice      → after catalog (needs products, branches)
      useCartSlice           → after inventory (needs setExpiryBatches) + session + orgState
      useOrgActions          → after cart (needs setCart) + session (needs currentSession)
      useGoodsReceivingSlice → after inventory+catalog (needs expiryBatches, rawMaterials)
18 handOffSession L1159–1206                     — STAYS in place (users←orgState, currentSession←session)
19 addProduct/addSupplier/… L1331–1599           — STAY
20 [cart actions L1600–2083]                     — REMOVED → useCartSlice()
21 useOrderSlice L2084–2121                      — STAYS; deps update: currentSession/
      setCurrentSession←session, verifySupervisorPin/setSelectedCustomer/setCustomers←orgState,
      taxApplied/setCart/setOrderDiscount*←cart, setExpiryBatches←inventory
22 void/refund/reprint/manualAdjust L2122–2383   — STAY (verifySupervisorPin now from orgState)
23 [goods-receiving actions L2384–3053]          — REMOVED → useGoodsReceivingSlice()
24 updateProductInfo L3054, category closings L3107–3153 — STAY
25 [inventory actions L3154–3464]                — REMOVED → useInventorySlice()
26 getStockHistory L3465, supplierNotification L3583, branch views L3599, value L3622 — STAY
```

Dependency check for step 17 at its position (all satisfied): session←{orgState.verifySupervisorPin,
prov.setAsideOrders(851), addAudit(901)}; inventory←{orgState.branches, prov.selectedBranch(478),
products(536), setStockAdjustments(901)}; cart←{session, orgState, inventory.setExpiryBatches,
prov.orders(864)/setActiveReceiptOrder(898)/setCommissionLedger(618)/setProducts(536)/setAsideOrders(851)};
orgActions←{session.currentSession, cart.setCart, orgState, addAudit}; gr←{inventory, catalog.rawMaterials,
orgState.branches, prov.products/suppliers, setStockAdjustments}.

### Exact block ranges — **refreshed for the post-Commit-1 tree (3,572 lines)**

| Slice file | Blocks to move (line ranges, inclusive) | Provider keeps from that area |
|---|---|---|
| `useSessionSlice.ts` | ✅ **DONE in Commit 1** — state + `openSession`/`correctOpeningCash`/`closeSession`/`openSupportSessionCorrection`. Wired ~L818–835 | `handOffSession` **840–886** (stays in the provider — it reads `users` + `currentSession`) |
| `useOrgSlice.ts` | ✅ **DONE in Commit 2** — `useOrgState` (zero deps, wired ~L412–434) + `useOrgActions` (wired ~L888–920, after the session slice). Owns branches/users/selected branch/switch guards/customers/`verifySupervisorPin` + 12 actions | `currentUser` **386–410**, `handOffSession` **840–886**, `selectedBranch`/`isBranchReadOnly` **435–437** |
| `useCartSlice.ts` | state **743–749**; actions **1196–1678** (addToCart → hold/resume/cancelHold + completeOrder) | `setAsideOrders` **751–762**, `useOrderSlice` wiring **1680–1716** |
| `useInventorySlice.ts` | state **663–741**; actions **2750–3059** (create/receive transfer, bad stock, destroyExpiredBatches) | categoryClosings state **647–662** + its actions; `getStockHistory` **3061–** and the supplier-notification wiring stay |
| `useGoodsReceivingSlice.ts` | state **599–646**; actions **1980–2648** (submitGoodsReceipt + all purchase-plan fns) | `updateProductInfo` (2650+) and category-closing actions stay |

Re-verify each range before splicing (`git` moves lines after every commit) — the fastest way is the
same line-range splice used in Commit 1: print the first/last line of each range and confirm it is the
expected comment / closing `};` before writing the slice file.

### Dependency scan results (from `scripts/tmp-scan-deps.ts`, pre-refactor line numbers)

- **session actions** (1096–1310): `users` (only L1161 → handoff stays out), `currentUser`,
  `setCurrentUser` (check: may be handoff-only — verify when extracting), `currentSession`,
  `setCurrentSession`, `setClosedSessions`, `setAsideOrders` (closeSession guard L1218), `addAudit`,
  `verifySupervisorPin`, `posSound`. (`orders` in the raw scan was a **false positive** — comment text only.)
- **org state**: self-contained; `verifySupervisorPin` uses **only `users`** (L1087) → `useOrgState` has **no deps**.
- **org actions** (918–1084 + 1311–1325): `branches/setBranches`, `users/setUsers`,
  `selectedBranchId/setSelectedBranchId`, modal/unsaved/confirm flags (all from own state),
  `currentUser/setCurrentUser` (provider), `currentSession` (session), `setCart` (cart),
  `setCustomers/setSelectedCustomer` (own), `addAudit`, `posSound`, `DEFAULT_WALKIN_CUSTOMER` (mockData import).
- **cart actions** (1600–2083): `currentUser`, `currentSession/setCurrentSession` (session),
  `selectedCustomer/setSelectedCustomer/setCustomers` (orgState), `setExpiryBatches` (inventory),
  `branches/selectedBranchId` (orgState), `orders/setOrders`, `setProducts`, `setCommissionLedger`,
  `setActiveReceiptOrder`, `setAsideOrders/setSetAsideOrders` (provider), `addAudit`, `posSound`,
  `generateReceiptNumber/generatePONumber` (formatters import). Own state: cart, tax, orderDiscount*.
- **inventory actions** (3154–3464): `branches`, `selectedBranchId`, `currentUser`, `selectedBranch`,
  `isBranchReadOnly`, `products/setProducts`, `setStockAdjustments` (audit slice), `addAudit`, `posSound`.
- **gr actions** (2384–3053): `branches`, `selectedBranchId`, `currentUser`, `selectedBranch`,
  `products/setProducts`, `suppliers`, `goodsReceipts/setGoodsReceipts` (own), `setReceivingDraft` (own),
  `purchasePlans/setPurchasePlans` (own), `expiryBatches/setExpiryBatches` (inventory),
  `setStockAdjustments`, `rawMaterials/setRawMaterials` (catalog slice), `addAudit`, `posSound`.

### Commit recipe (plan order, one commit each, `npm run lint` after each)

1. **✅ Commit 1 — DONE (session).** Shipped `useSessionSlice.ts`; removed blocks 485–531, 1096–1158,
   1207–1310 (old numbering) and wired the slice at old ~L1096, i.e. right after `verifySupervisorPin`.
   Returns `currentSession, setCurrentSession, closedSessions, openSession, correctOpeningCash,
   closeSession, openSupportSessionCorrection`; `setClosedSessions` stays internal to the slice.
   `useOrderSlice` needed **no** call-site change. `handOffSession` stayed exactly where it was.
2. **✅ Commit 2 — DONE (org).** Shipped `useOrgSlice.ts` with `useOrgState()` (zero deps) and
   `useOrgActions(deps)`. Wired `useOrgState` right after the `currentUser` block and `useOrgActions`
   **after** the session slice (not at the old action location — it needs `currentSession`). The session
   slice, `useCatalogSlice` and `useOrderSlice` call sites needed **no** edits: their dep names resolve
   from the `useOrgState` destructure. Dropped the now-unused `INITIAL_BRANCHES` / `INITIAL_CUSTOMERS`
   imports from the provider.
3. **Commit 3 — cart.** Create `useCartSlice.ts` (state 743–749 + actions 1196–1678). Wire it right
   after the session wiring (~818–835) and **before** `useOrgActions` (888) — the required order is
   session → cart → orgActions, and that ordering already holds after Commit 2, so the session wiring
   does **not** need to move (the earlier draft of this doc said it did; it doesn't). Cart state and
   actions are in scope for everything after, so `setCart` reaches `useOrgActions` and `useOrderSlice`
   from the destructure. `setAsideOrders`/`setSetAsideOrders` state **stays in the provider** (751–762)
   and is passed in. `setExpiryBatches` is still provider state here (inventory not yet extracted) —
   fine. Update `useOrderSlice` deps (`taxApplied`, `setCart`, `setOrderDiscountType/Value/Reason`)
   only if the names don't resolve from the destructure.
4. **Commit 4 — inventory.** Create `useInventorySlice.ts`; insert its wiring **between session and
   cart** (cart needs `setExpiryBatches`). Update `useOrderSlice` dep (`setExpiryBatches`) and check
   `getStockHistory` + branch views still resolve via the same destructure names.
5. **Commit 5 — goods-receiving.** Create `useGoodsReceivingSlice.ts`; wire after `useOrgActions`.
   Remove state 698–745 + actions 2384–3053. Value object untouched.

**Extraction tip:** move blocks verbatim with a script (read line ranges, splice into the new file)
instead of retyping — same technique as Step 1's mockData splice. Indentation: hook bodies are already
at the 2-space depth the provider used, so lines can be copied as-is.

**Invariants to re-check after every commit:**
- `interface POSContextType` (68–380) and the `value={{…}}` literal (3624–3752): **git diff must show ZERO changes**.
- Every local name used by `value` still exists in provider scope (destructured from slices).
- Hook call order deterministic, no conditional hooks.
- `npm run lint` clean.

## Steps 3–5 (from the plan — untouched)

- **Step 3:** in `AGENTS.md`, replace the `npm test # jsdom render tests (vitest)` verification line with
  `npm run lint` + `npm run build`.
- **Step 4:** remove from `package.json`: `motion`, `dotenv`, `esbuild`, `autoprefixer`, `jsdom`,
  `@types/jsdom` (verified zero imports in `src/` + `server.ts`). Decide on `@google/genai`: keep iff
  preserving the README's documented `GEMINI_API_KEY` path, else remove + update the README env section.
  Re-run `npm install` to refresh the lockfile.
- **Step 5:** `npm run lint`, `npm run build`, `npm.cmd run dev` smoke check, push
  `fix/revision-pos-input` to origin, delete `scripts/tmp-*.ts`, update this doc + the plan's Status line.

## Expected outcome (from plan)

POSContext −40–60% (the design above removes ~1,900 of 3,765 lines ≈ 50%); ~74 KB seed duplication
already removed; AGENTS.md fixed; zero behavior change.

## Repo notes

- `.vscode/` is intentionally untracked — never commit it (AGENTS.md).
- Standing branch: `fix/revision-pos-input` — do not create new branches.
- Commits use conventional style, e.g. `refactor(context): extract the session/shift slice out of POSContext`.

