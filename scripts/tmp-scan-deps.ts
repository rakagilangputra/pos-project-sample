/* Temporary analysis script for TOKEN_OPTIMIZATION_PLAN Step 2 — delete after use. */
import { readFileSync } from 'fs';

const src = readFileSync('src/context/POSContext.tsx', 'utf8').split(/\r?\n/);

const known = [
  'branches', 'setBranches', 'users', 'setUsers', 'selectedBranchId', 'setSelectedBranchId',
  'isStoreSelectionModalOpen', 'setIsStoreSelectionModalOpen', 'hasUnsavedChanges', 'setHasUnsavedChanges',
  'confirmSwitchStore', 'setConfirmSwitchStore', 'currentUser', 'setCurrentUser', 'selectedBranch', 'isBranchReadOnly',
  'lang', 'setLang', 'soundEnabled', 'setSoundEnabled',
  'currentSession', 'setCurrentSession', 'closedSessions', 'setClosedSessions',
  'products', 'setProducts', 'suppliers', 'setSuppliers',
  'commissionLedger', 'setCommissionLedger', 'settlementCycles', 'setSettlementCycles',
  'customers', 'setCustomers', 'selectedCustomer', 'setSelectedCustomer',
  'goodsReceipts', 'setGoodsReceipts', 'receivingDraft', 'setReceivingDraft',
  'purchasePlans', 'setPurchasePlans', 'categoryClosings', 'setCategoryClosings',
  'expiryBatches', 'setExpiryBatches', 'stockTransfers', 'setStockTransfers',
  'badStocks', 'setBadStocks', 'cart', 'setCart', 'taxApplied', 'setTaxApplied',
  'orderDiscountType', 'setOrderDiscountType', 'orderDiscountValue', 'setOrderDiscountValue',
  'orderDiscountReason', 'setOrderDiscountReason', 'orderDiscountApprovedBy', 'setOrderDiscountApprovedBy',
  'setAsideOrders', 'setSetAsideOrders', 'orders', 'setOrders',
  'activeReceiptOrder', 'setActiveReceiptOrder',
  'auditLogs', 'stockAdjustments', 'setStockAdjustments', 'addAudit',
  'categories', 'masterCategories', 'rawMaterials', 'setRawMaterials',
  'addCategory', 'addMasterCategory', 'updateMasterCategory', 'deleteMasterCategory',
  'addRawMaterial', 'updateRawMaterial', 'deleteRawMaterial',
  'switchUser', 'selectBranch', 'requestSwitchBranch', 'confirmAndSwitchBranch', 'cancelSwitchBranch',
  'addBranch', 'updateBranch', 'toggleBranchStatus', 'addUser', 'updateUser', 'toggleUserStatus',
  'verifySupervisorPin', 'openSession', 'correctOpeningCash', 'handOffSession', 'closeSession',
  'openSupportSessionCorrection', 'addCustomer', 'addProduct', 'addSupplier', 'updateSupplier',
  'recordSettlementPayment', 'generateSettlementCycles',
  'addToCart', 'updateCartQty', 'removeFromCart', 'clearCart', 'overrideItemPrice',
  'applyItemDiscount', 'applyOrderDiscount', 'removeOrderDiscount',
  'cartSubtotal', 'netAfterDiscount', 'cartTaxAmount', 'cartDiscountAmount', 'cartTotal',
  'holdCurrentOrder', 'resumeOrder', 'cancelHoldOrder', 'completeOrder',
  'voidOrder', 'refundOrder', 'reprintReceipt', 'manualAdjustStock', 'submitGoodsReceipt',
  'addPurchasePlan', 'updatePurchasePlan', 'cancelPurchasePlan', 'lockPurchasePlanForReceipt',
  'unlockPurchasePlanFromReceipt', 'updateProductInfo', 'submitCategoryClosing', 'saveCategoryClosingDraft',
  'createStockTransfer', 'receiveStockTransfer', 'recordBadStock', 'destroyExpiredBatches', 'getStockHistory',
  'createMtoOrder', 'settleMadeToOrder', 'updatePoPickupTime', 'updateOrderItemExpiryAndQty',
  'settlePoPayment', 'markPoReadyForPickup', 'confirmPoPickup', 'cancelPoWithSupervisor', 'duplicatePoToCart',
  'sendSupplierWhatsAppNotification', 'resendSupplierWhatsAppNotification',
  'supplierNotificationBatches', 'supplierDeliveryLogs',
  'posSound', 'generateReceiptNumber', 'generatePONumber',
];

const blocks: Record<string, [number, number]> = {
  'S1 session-state': [485, 531],
  'S1 session-actions': [1096, 1310],
  'S2 org-state': [382, 451],
  'S2 customers-state': [683, 697],
  'S2 org-actions-a': [918, 1095],
  'S2 org-actions-b addCustomer': [1311, 1325],
  'S3 cart-state': [842, 861],
  'S3 cart-actions': [1600, 1822],
  'S3 completeOrder': [1824, 2083],
  'S4 inventory-state': [762, 841],
  'S4 inventory-actions': [3154, 3464],
  'S5 gr-state': [698, 745],
  'S5 gr-actions': [2384, 3053],
};

for (const [name, [a, b]] of Object.entries(blocks)) {
  const text = src.slice(a - 1, b).join('\n');
  const ids = new Set(text.match(/\b[A-Za-z_$][\w$]*\b/g) ?? []);
  const refs = known.filter((k) => ids.has(k));
  // names declared INSIDE the block (const/let/function) that also appear as refs -> local shadow
  const declared = new Set<string>();
  for (const m of text.matchAll(/\b(?:const|let|function|var)\s+([A-Za-z_$][\w$]*)/g)) declared.add(m[1]);
  const shadow = refs.filter((r) => declared.has(r));
  const deps = refs.filter((r) => !declared.has(r));
  console.log(`\n### ${name} [${a}-${b}]  (${b - a + 1} lines)`);
  console.log(`  deps (${deps.length}): ${deps.join(', ')}`);
  if (shadow.length) console.log(`  LOCAL declarations shadowing known names: ${shadow.join(', ')}`);
}
