# Reseller Purchase Planning

New Rencana Pembelian documents are centralized reseller purchase plans for
products linked to a `BELI (RESELLER)` Master Kategori. A plan may contain
multiple pickup dates and suppliers; supplier and category data are derived
from each SKU.

Open Made-to-Order demand from all active branches is aggregated per pickup
date and SKU, then ordered by pickup date, product name, supplier, and source
branch. Source branches are read-only demand context; planned quantity is one
central quantity and is not allocated to branches. Manual SKUs must be assigned
to a pickup-date group. Contributing order IDs and source branches are retained
for audit traceability.

The plan's branch is always the explicitly configured main branch. Goods
receiving for reseller plans adds actual quantities to that branch only; the
admin distributes stock to other branches through Stock Transfer.

Receiving uses an internal lock while a plan is selected in a draft. The lock
is not a user-facing status. User-facing statuses remain Direncanakan,
Terealisasi, and Dibatalkan.
