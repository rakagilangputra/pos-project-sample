# Project Documentation

This folder is the working product documentation for the bakery POS + mini ERP
prototype. Add requirements here before asking for implementation so the agent
can compare the request with existing workflows and identify gaps early.

## Folders

- `requirements/` — one file per feature, workflow, or product change.
- `decisions/` — decisions that affect behavior, terminology, permissions, or
  prototype assumptions.
- `validation/` — browser test walkthroughs and client demonstration scripts.

## Recommended requirement lifecycle

Use a clear status in the front matter or title:

`Draft` → `Needs clarification` → `Ready` → `In progress` → `Validated` →
`Superseded`

Do not delete an old requirement when the product changes. Mark it superseded
and link to the newer document so the reasoning remains traceable.

## Naming

Use lowercase kebab-case filenames, for example:

`cashier-refund-flow.md`

Keep each requirement focused on one outcome or workflow. Larger initiatives
can have an overview file linking to smaller requirements.

