# Current Architecture and Change Guide

This document describes the repository as it exists today. It is intended to
help future agents investigate quickly and make focused changes without
re-reading the whole application.

## One-minute mental model

```text
main.tsx
  └── App.tsx
        ├── POSProvider (shared state and business actions)
        ├── Header (role-aware tab navigation)
        ├── cashier POS: ProductCatalog + OrderCart + cashier modals
        └── lazy-loaded workspaces:
              Pesanan, Dashboard, Audit, Konsinyasi, Stok, Backoffice

POSProvider
  ├── domain slices in context/slices/
  ├── types from types.ts
  ├── initial demo data from data/fixtures/ via data/mockData.ts
  └── localStorage persistence in the browser
```

There is currently no database, API-backed repository, authentication server,
or server-side business state. `server.ts` only hosts Vite in development and
serves `dist` in production; its health endpoint is not used by the UI.

## Runtime and delivery boundaries

| Area | Location | Responsibility |
| --- | --- | --- |
| Browser entry | `src/main.tsx` | Mounts React and global CSS. |
| Application shell | `src/App.tsx` | Owns top-level tab, cashier sub-view, modal, and access-routing state. |
| Navigation/chrome | `src/components/Header.tsx` | Defines `MainWorkspaceTab`, tab labels, and role-based visibility. |
| Shared domain state | `src/context/POSContext.tsx` | Creates `POSProvider`, wires slices, and exposes the large `usePOS()` contract. |
| Domain state/actions | `src/context/slices/` | Local state and actions grouped by operational domain. |
| UI | `src/components/` | Workspaces, views, tables, forms, and modals. |
| Types | `src/types.ts` | Shared business entities and status unions. |
| Demo data | `src/data/fixtures/` | Canonical seed datasets by domain. |
| Fixture compatibility | `src/data/mockData.ts` | Re-exports fixture data so existing imports keep working; also contains the settlement seed exception. |
| Cross-cutting helpers | `src/utils/formatters.ts` | Currency/date formatting, ID generation, and POS sound. |
| Focused selectors | `src/hooks/useDomainHooks.ts` | Smaller hooks that select subsets from the large context object. |
| Dev/production server | `server.ts` | Express wrapper around Vite middleware or static `dist`. |
| Netlify output | `netlify.toml` | Builds with Vite and publishes `dist`; SPA fallback routes to `index.html`. |

## Current domain map

| Domain | Main slice(s) | Main UI areas |
| --- | --- | --- |
| Organization, branches, users, customers | `useOrgSlice.ts` | Header, store selection, customer modal, backoffice |
| Preferences | `usePreferencesSlice.ts` | Header/settings controls |
| Catalog and raw materials | `useCatalogSlice.ts` | Product/catalog, stock, backoffice |
| Cart and checkout | `useCartSlice.ts` | Product catalog, order cart, payment, receipt |
| Cashier sessions | `useSessionSlice.ts` | Session, handoff, header |
| Orders / PO / MTO | `useOrderSlice.ts` plus some order actions in `POSContext.tsx` | Pesanan, transaction history, receipt |
| Inventory | `useInventorySlice.ts` plus some stock actions in `POSContext.tsx` | Stock workspace and stock subviews |
| Goods receiving / purchase plans | `useGoodsReceivingSlice.ts` | Goods receiving, purchase plan |
| Suppliers / consignment | supplier notification slice and `POSContext.tsx` actions | Consignment and supplier notification workspaces |
| Audit | `useAuditSlice.ts` | Audit log and cross-domain mutation logging |

The extraction into slices is partial. `POSContext.tsx` remains the wiring
point and still contains direct state, persistence, and several business
actions. Treat it as an orchestration layer plus legacy domain logic, not as a
thin context file.

## State and persistence model

The provider initializes state from `localStorage` when available, otherwise
from fixtures, then writes updated state back to `localStorage`. Important
keys include:

`pos_products`, `pos_orders`, `pos_current_user`, `pos_current_session`,
`pos_held_orders`, `pos_branches`, `pos_selected_branch_id`, `pos_users`,
`pos_customers`, `pos_suppliers`, `pos_commission_ledger`,
`pos_settlement_cycles`, `pos_goods_receipts`, `pos_purchase_plans_v1`,
`pos_expiry_batches`, `pos_stock_transfers`, `pos_bad_stocks`,
`pos_category_closings`, `pos_audit_logs`, and `pos_stock_adjustments`.

This has useful prototype behavior: a client can refresh the page and keep demo
changes. It also creates a common source of confusion: stale browser data can
survive code changes. When a behavior seems impossible, test with the current
localStorage data in mind before changing fixtures or business logic.

When changing a persisted entity:

- keep old records readable where practical;
- avoid renaming a storage key casually;
- provide a small compatibility/defaulting path for newly added fields;
- document intentional reset or migration behavior;
- validate both a fresh browser profile and an existing demo profile.

## Where to start when investigating

Use the smallest relevant path instead of reading all of `POSContext.tsx`.

| User request | Start with | Then inspect |
| --- | --- | --- |
| POS sale, cart, payment, receipt | `App.tsx`, `ProductCatalog.tsx`, `OrderCart.tsx` | `useCartSlice.ts`, `PaymentModal.tsx`, `useOrderSlice.ts` |
| Order / PO / MTO | `PesananWorkspace.tsx` | `useOrderSlice.ts`, relevant modal, `types.ts` order types |
| Stock or expiry | `StockWorkspace.tsx` and `components/stock/` | `useInventorySlice.ts`, `useGoodsReceivingSlice.ts`, product types |
| Goods receiving / purchase plan | `GoodsReceivingWorkspace.tsx` or `PurchasePlanWorkspace.tsx` | `useGoodsReceivingSlice.ts`, inventory fixtures |
| Supplier / consignment | `ConsignmentWorkspace.tsx` | supplier fixtures, relevant `POSContext.tsx` actions |
| Login, PIN, branch, role | `Header.tsx`, `SelectStoreScreen.tsx` | `useOrgSlice.ts`, `useSessionSlice.ts`, role types |
| Navigation, tab labels, badges | `Header.tsx`, `App.tsx` | `AGENTS.md` UI assertions |
| Seed/demo data | `data/mockData.ts` | matching file under `data/fixtures/` |
| Currency, dates, generated IDs | `utils/formatters.ts` | the calling domain action |

For a change, identify these four points before editing:

1. the entry UI where the user starts;
2. the action that changes state;
3. the type and persisted collection involved;
4. the UI that proves the changed state.

## Rules for safe incremental changes

### Prefer an existing slice and workspace

Put a new action in the closest existing domain slice when one exists. Reuse
the established result shape (`{ success, message, ... }`) and existing audit,
sound, permission, branch-read-only, and persistence patterns. Do not create a
second store or a parallel copy of products/orders.

### Treat `types.ts` as a contract

Add or update the type first when introducing a real business concept or status.
Search all consumers of a changed union or interface before editing behavior.
Avoid broad “cleanup” of unrelated types during a feature change because many
workspaces consume the same file.

### Keep fixtures canonical

Add seed data to the matching file under `src/data/fixtures/`. Preserve the
`src/data/mockData.ts` compatibility re-export unless deliberately migrating
all imports. Do not add one-off demo records inside a component.

### Preserve role and branch rules

Role filtering is implemented in both the header and the app shell. Many
mutations also check `isBranchReadOnly` or supervisor/admin authorization. A new
management action must be checked at the UI boundary and in the action itself;
the UI guard alone is not enough.

### Avoid broad context refactors during feature work

`POSContext.tsx` is high-coupling. A feature request should not also rename the
context, replace the state model, migrate every component to a new store, or
reorganize all folders unless that is the explicit task. Those changes make
browser validation and rollback much harder.

### Code-split heavy workspaces

The management workspaces are already lazy-loaded in `App.tsx` to keep the
cashier experience lighter. Keep large, infrequently used workspaces behind
`Suspense` and avoid importing them into the initial POS path unnecessarily.

## Token-efficient agent workflow

For future tasks, the recommended investigation sequence is:

1. Read `AGENTS.md`, `PROJECT_GUIDANCE.md`, and this file.
2. Search by the user-visible label, entity name, action name, and localStorage
   key using `rg`.
3. Read only the relevant component, slice, type section, and fixture section.
4. Trace the four points listed above: start UI, state action, type/storage,
   proof UI.
5. Make one focused patch.
6. Validate the exact browser scenario, then run lint and build.

Useful searches:

```powershell
rg -n "visible label|actionName|EntityName|pos_storage_key" src
rg -n "usePOS\(|useCart\(|useInventory\(|useOrders\(" src
rg -n "localStorage\.(getItem|setItem)" src
```

Do not request or load entire 1,000–2,000 line workspaces unless the change
truly crosses their full workflow. Targeted searches reduce context cost and
make regressions easier to reason about.

## Known architectural risks

- The shared context is still a large “god object”; changing its interface can
  affect many screens at once.
- Business logic is split between slices and `POSContext.tsx`, so the same
  domain may require checking both locations.
- Browser persistence has no formal schema versioning or migration framework.
- Fixtures and existing localStorage can represent different states after a
  feature change.
- There is no automated browser test suite; UI behavior must be manually
  verified on localhost.
- Some large workspaces combine rendering, validation, and business actions,
  so avoid mixing visual refactors with business-rule changes when possible.

