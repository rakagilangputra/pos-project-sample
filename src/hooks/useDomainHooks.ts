/**
 * Targeted Domain Hooks
 * 
 * Instead of consuming the entire 110-key god object from usePOS(),
 * components and AI agents can import these focused hooks to access only the
 * domain state and actions they need. This drastically cuts token usage and cognitive overhead.
 */

import { usePOS } from '../context/POSContext';

/**
 * 1. Cart & POS Checkout Domain Hook
 */
export const useCart = () => {
  const {
    cart,
    addToCart,
    updateCartQty,
    removeFromCart,
    clearCart,
    overrideItemPrice,
    applyItemDiscount,
    cartSubtotal,
    cartTaxAmount,
    cartDiscountAmount,
    cartTotal,
    taxApplied,
    setTaxApplied,
    orderDiscountType,
    orderDiscountValue,
    orderDiscountReason,
    applyOrderDiscount,
    removeOrderDiscount,
  } = usePOS();

  return {
    cart,
    addToCart,
    updateCartQty,
    removeFromCart,
    clearCart,
    overrideItemPrice,
    applyItemDiscount,
    cartSubtotal,
    cartTaxAmount,
    cartDiscountAmount,
    cartTotal,
    taxApplied,
    setTaxApplied,
    orderDiscountType,
    orderDiscountValue,
    orderDiscountReason,
    applyOrderDiscount,
    removeOrderDiscount,
  };
};

/**
 * 2. Store & Branch Access Domain Hook
 */
export const useStoreBranch = () => {
  const {
    branches,
    selectedBranchId,
    selectedBranch,
    isBranchReadOnly,
    isStoreSelectionModalOpen,
    setIsStoreSelectionModalOpen,
    selectBranch,
    addBranch,
    updateBranch,
    toggleBranchStatus,
    currentUser,
    users,
    switchUser,
    verifySupervisorPin,
  } = usePOS();

  return {
    branches,
    selectedBranchId,
    selectedBranch,
    isBranchReadOnly,
    isStoreSelectionModalOpen,
    setIsStoreSelectionModalOpen,
    selectBranch,
    addBranch,
    updateBranch,
    toggleBranchStatus,
    currentUser,
    users,
    switchUser,
    verifySupervisorPin,
  };
};

/**
 * 3. Suppliers & Consignment Accounting Domain Hook
 */
export const useSuppliers = () => {
  const {
    suppliers,
    addSupplier,
    updateSupplier,
    commissionLedger,
    settlementCycles,
    recordSettlementPayment,
    generateSettlementCycles,
    masterCategories,
  } = usePOS();

  return {
    suppliers,
    addSupplier,
    updateSupplier,
    commissionLedger,
    settlementCycles,
    recordSettlementPayment,
    generateSettlementCycles,
    masterCategories,
  };
};

/**
 * 4. PO / MTO Orders Management Domain Hook
 */
export const useOrders = () => {
  const {
    orders,
    createMtoOrder,
    completeOrder,
    settleMadeToOrder,
    settlePoPayment,
    markPoReadyForPickup,
    confirmPoPickup,
    cancelPoWithSupervisor,
    voidOrder,
    refundOrder,
    reprintReceipt,
  } = usePOS();

  return {
    orders,
    createMtoOrder,
    completeOrder,
    settleMadeToOrder,
    settlePoPayment,
    markPoReadyForPickup,
    confirmPoPickup,
    cancelPoWithSupervisor,
    voidOrder,
    refundOrder,
    reprintReceipt,
  };
};

/**
 * 5. Stock, Raw Materials & Inventory Domain Hook
 */
export const useInventory = () => {
  const {
    products,
    categories,
    selectedBranch,
    isBranchReadOnly,
    addProduct,
    updateProductInfo,
    manualAdjustStock,
    createStockTransfer,
    receiveStockTransfer,
    recordBadStock,
    destroyExpiredBatches,
    goodsReceipts,
    purchasePlans,
    rawMaterials,
    expiryBatches,
    categoryClosings,
  } = usePOS();

  return {
    products,
    categories,
    selectedBranch,
    isBranchReadOnly,
    addProduct,
    updateProductInfo,
    manualAdjustStock,
    createStockTransfer,
    receiveStockTransfer,
    recordBadStock,
    destroyExpiredBatches,
    goodsReceipts,
    purchasePlans,
    rawMaterials,
    expiryBatches,
    categoryClosings,
  };
};
