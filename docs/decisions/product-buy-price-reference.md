# Product Harga Beli Reference

## Decision

Products may store an optional `buyPrice` value as a master-product reference.
It is entered as a non-negative number in the create and edit product forms.

## Workflow boundary

`buyPrice` does not replace the actual buy price recorded on a goods receipt.
Receiving remains the source of truth for transaction-specific purchase costs,
including prices that vary by delivery or supplier settlement.

Blank input is stored as empty/undefined. Existing products without the field
remain valid and display an empty input until a user adds a reference value.
