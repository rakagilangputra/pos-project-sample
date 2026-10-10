# Reseller Purchase Planning

New Rencana Pembelian documents are single-supplier plans for products in a
`BELI (RESELLER)` Master Kategori. The product list is filtered by the selected
supplier.

Open Made-to-Order demand for the selected branch is aggregated per supplier
product and ordered by nearest pickup date. The admin may adjust the final
quantity for both MTO fulfillment and additional stock; the UI does not store
these as separate purposes. Contributing order IDs are retained for audit
traceability.

Receiving uses an internal lock while a plan is selected in a draft. The lock
is not a user-facing status. User-facing statuses remain Direncanakan,
Terealisasi, and Dibatalkan.
