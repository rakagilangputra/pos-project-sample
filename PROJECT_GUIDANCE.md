# Project Guidance: Bakery POS + Mini ERP Prototype

This repository is a client-facing prototype for a bakery point-of-sale (POS)
application with lightweight ERP capabilities. Its purpose is to demonstrate
how a bakery store can operate day to day: selling products, managing orders,
tracking stock, receiving goods, handling suppliers and consignment, and
reviewing operational information.

The primary objective is a believable, understandable customer experience.
This is a prototype, so a complete and coherent workflow is more valuable than
premature production infrastructure.

## Product context

- The product owner is a product manager who is learning software development.
- Requirements may arrive as PRDs, notes, screenshots, or conversations.
- Some existing requirements came from earlier AI-assisted work and may be
  inconsistent with the current application. Treat them as input to validate,
  not as unquestionable truth.
- The application is primarily evaluated in a browser by walking through
  realistic bakery-store scenarios.
- The current delivery path is local development on port 3000, GitHub for
  version control, and Netlify for deployment and client demonstrations.

## Guidance for the agent

Before implementing a requirement:

1. Read `AGENTS.md` and follow its repository rules.
2. Read the relevant files in `docs/requirements/`.
3. Inspect the existing UI and state model before proposing new patterns.
4. Restate the intended user outcome and identify gaps, contradictions, or
   workflow risks. Ask focused questions only when the missing decision would
   materially change the behavior.
5. Prefer the smallest coherent change that can be demonstrated end to end.

When requirements conflict, use this order of priority:

1. Explicit acceptance criteria in the newest approved requirement.
2. The established operational workflow of a bakery store.
3. Existing application behavior that users already rely on.
4. Visual preference or implementation convenience.

Do not silently invent business rules for money, stock, permissions, refunds,
or accounting. If a prototype assumption is necessary, document it in the
relevant requirement or decision log and make the UI behavior visible.

## UX and prototype principles

- Optimize for the cashier and store operator completing common tasks quickly.
- Keep labels, navigation, terminology, and status meanings consistent.
- Make important state visible: loading, empty, success, warning, error,
  approval required, and completed.
- Preserve user input where possible when validation fails.
- Use realistic bakery examples and amounts so a client can understand the
  workflow without an explanation from the developer.
- Favor clear touch-friendly controls over dense enterprise screens.
- Design for the happy path first, then cover the most likely operational
  exceptions: out-of-stock items, cancelled orders, wrong payment, damaged
  goods, stock discrepancies, and manager approval.
- Avoid adding a new modal, table, badge, or terminology pattern when an
  existing project pattern can be reused.

## Definition of ready

A requirement is ready for implementation when it explains:

- the user and their permission level;
- the business problem or store scenario;
- the starting point and trigger;
- the expected steps and visible result;
- relevant data and state changes;
- important edge cases and permission constraints;
- acceptance criteria that can be checked in the browser.

## Definition of done

A change is complete when:

- the intended workflow works in the browser at `http://localhost:3000`;
- the UI is consistent with nearby screens and existing terminology;
- the main happy path and material edge cases have been manually checked;
- `npm run lint` passes;
- `npm run build` passes;
- any requirement or assumption changes are documented;
- the change is small enough to review, commit, push, and merge incrementally.

The repository's `AGENTS.md` contains the authoritative commands and additional
checks for the current project.

## Suggested delivery loop

1. Add or update a requirement in `docs/requirements/`.
2. Review the workflow, assumptions, and acceptance criteria.
3. Implement one coherent slice.
4. Run the app locally and validate it in a browser on port 3000.
5. Run lint and build.
6. Record notable decisions or known gaps in `docs/decisions/`.
7. Commit and push the focused change to the standing project branch.
8. Merge incrementally after the browser behavior matches expectations.

## Documentation map

- `docs/ARCHITECTURE.md` — current structure, state flow, change boundaries,
  and token-efficient investigation paths.
- `docs/README.md` — how project documentation is organized.
- `docs/requirements/` — incoming and approved product requirements.
- `docs/decisions/` — decisions and explicit prototype assumptions.
- `docs/validation/` — browser walkthroughs and client-demo checklists.

