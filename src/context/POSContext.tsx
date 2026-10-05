import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  StoreBranch,
  User,
  Customer,
  Product,
  ProductCategoryItem,
  CartItem,
  Order,
  CashierSession,
  SetAsideOrder,
  AuditLog,
  PaymentComponent,
  StockAdjustmentRecord,
  Supplier,
  CommissionLedgerEntry,
  SupplierSettlementCycle,
  GoodsReceiptRecord,
  ReceivingDraft,
  MtoOrderItemInput,
  StockTransferRecord,
  BadStockRecord,
  CategoryClosingSession,
  StockHistoryItem,
  SupplierNotificationBatch,
  SupplierDeliveryLogEntry,
  NotificationDeliveryResult,
  NotificationAttemptType,
  PurchasePlan,
  PurchasePlanItemType,
  MasterCategory,
  MasterCategoryType,
  RawMaterial,
  ProductExpiryBatch,
  ProductExpiryType,
} from '../types';
import {
  INITIAL_USERS,
  DEFAULT_WALKIN_CUSTOMER,
  INITIAL_PRODUCTS,
  INITIAL_CATEGORIES,
  INITIAL_SUPPLIERS,
  INITIAL_COMMISSION_LEDGER,
  INITIAL_SETTLEMENT_CYCLES,
  INITIAL_ORDERS,
  INITIAL_CATEGORY_CLOSINGS,
  INITIAL_MASTER_CATEGORIES,
  INITIAL_RAW_MATERIALS,
} from '../data/mockData';
import { posSound } from '../utils/formatters';
import { usePreferencesSlice } from './slices/usePreferencesSlice';
import { useCatalogSlice } from './slices/useCatalogSlice';
import { useAuditSlice } from './slices/useAuditSlice';
import { useSupplierNotificationSlice } from './slices/useSupplierNotificationSlice';
import { useOrderSlice } from './slices/useOrderSlice';
import { useSessionSlice } from './slices/useSessionSlice';
import { useOrgActions, useOrgState } from './slices/useOrgSlice';
import { useCartSlice } from './slices/useCartSlice';
import { useInventorySlice } from './slices/useInventorySlice';
import { useGoodsReceivingSlice } from './slices/useGoodsReceivingSlice';

interface POSContextType {
  // Store Branches & Multi-Branch Management
  branches: StoreBranch[];
  selectedBranchId: string;
  selectedBranch: StoreBranch;
  isBranchReadOnly: boolean;
  isStoreSelectionModalOpen: boolean;
  setIsStoreSelectionModalOpen: (open: boolean) => void;
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (has: boolean) => void;
  confirmSwitchStore: { isOpen: boolean; targetBranchId: string | null };
  requestSwitchBranch: (targetBranchId: string) => void;
  confirmAndSwitchBranch: () => void;
  cancelSwitchBranch: () => void;
  selectBranch: (branchId: string, force?: boolean) => boolean;
  addBranch: (data: Omit<StoreBranch, "id" | "createdAt">) => { success: boolean; branch?: StoreBranch; message: string };
  updateBranch: (id: string, data: Partial<StoreBranch>) => { success: boolean; branch?: StoreBranch; message: string };
  toggleBranchStatus: (id: string) => { success: boolean; message: string };

  // Superadmin User Access Management (RBAC)
  addUser: (userData: Omit<User, "id">) => { success: boolean; user?: User; message: string };
  updateUser: (id: string, data: Partial<User>) => { success: boolean; user?: User; message: string };
  toggleUserStatus: (id: string) => { success: boolean; message: string };

  // Localization & Audio
  lang: 'id' | 'en';
  setLang: (lang: 'id' | 'en') => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;

  // Active User & Auth
  currentUser: User;
  users: User[];
  switchUser: (userId: string, pin: string) => { success: boolean; message: string };
  verifySupervisorPin: (pin: string) => { success: boolean; supervisor?: User; message: string };



  // Cashier Session
  currentSession: CashierSession | null;
  closedSessions: CashierSession[];
  openSession: (openingCash: number) => void;
  correctOpeningCash: (newAmount: number, adminPin: string, reason: string) => boolean;
  handOffSession: (newCashierId: string, pin: string) => { success: boolean; message: string };
  closeSession: (
    actualCash: number,
    varianceReason: string,
    supervisorPin: string
  ) => { success: boolean; message: string };
  openSupportSessionCorrection: (
    sessionId: string,
    action: string,
    reason: string,
    adminPin: string
  ) => boolean;

  // Category Master (POS-US-028)
  categories: ProductCategoryItem[];
  addCategory: (name: string, description?: string) => { success: boolean; category?: ProductCategoryItem; message: string };

  // Product Master (POS-US-029 & POS-US-072)
  products: Product[];
  addProduct: (productData: Omit<Product, 'id'>) => { success: boolean; product?: Product; message: string };
  updateProductInfo: (
    productId: string,
    info: Partial<Omit<Product, 'id' | 'branchId' | 'stock' | 'inTransitStock' | 'badStock'>>
  ) => { success: boolean; message: string };
  manualAdjustStock: (
    productId: string,
    type: 'increase' | 'decrease',
    quantity: number,
    reason: string
  ) => { success: boolean; message: string };

  // Raw Material Master (Bahan Baku)
  rawMaterials: RawMaterial[];
  addRawMaterial: (data: Omit<RawMaterial, 'id' | 'createdAt' | 'updatedAt'>) => { success: boolean; rawMaterial?: RawMaterial; message: string };
  updateRawMaterial: (id: string, data: Partial<RawMaterial>) => { success: boolean; rawMaterial?: RawMaterial; message: string };
  deleteRawMaterial: (id: string) => { success: boolean; message: string };

  // Category Daily Closing (POS-US-069) & Expiry Batch Reconciliation
  categoryClosings: CategoryClosingSession[];
  submitCategoryClosing: (session: CategoryClosingSession) => { success: boolean; message: string };
  saveCategoryClosingDraft: (session: CategoryClosingSession) => { success: boolean; message: string };
  expiryBatches: ProductExpiryBatch[];
  allExpiryBatches: ProductExpiryBatch[];
  destroyExpiredBatches: (batchIds: string[], reasonNote?: string) => {
    success: boolean;
    recordNo?: string;
    totalPcs?: number;
    totalBatches?: number;
    message: string;
  };

  // Stock Transfer Between Branches (POS-US-070)
  stockTransfers: StockTransferRecord[];
  createStockTransfer: (data: {
    fromBranchId: string;
    toBranchId: string;
    productId: string;
    quantity: number;
    notes?: string;
  }) => { success: boolean; message: string };
  receiveStockTransfer: (transferId: string) => { success: boolean; message: string };

  // Bad Stock / Expired Record (POS-US-071)
  badStocks: BadStockRecord[];
  recordBadStock: (data: {
    branchId: string;
    productId: string;
    quantity: number;
    reason: any;
    disposition: any;
    notes?: string;
  }) => { success: boolean; message: string };

  // Consolidated Stock History (POS-US-072)
  getStockHistory: (productId?: string, branchId?: string) => StockHistoryItem[];

  // Supplier Master (POS-US-030)
  suppliers: Supplier[];
  addSupplier: (supplierData: Omit<Supplier, 'id' | 'createdAt'>) => { success: boolean; supplier?: Supplier; message: string };
  updateSupplier: (id: string, supplierData: Partial<Supplier>) => { success: boolean; supplier?: Supplier; message: string };

  // Consignment Commission & Settlements (POS-US-031, POS-US-032, POS-US-034, POS-US-035)
  commissionLedger: CommissionLedgerEntry[];
  settlementCycles: SupplierSettlementCycle[];
  recordSettlementPayment: (
    cycleId: string,
    paymentMethod: 'cash' | 'transfer' | 'qris' | 'other',
    reference: string,
    notes: string,
    supervisorPin?: string,
    paymentAmount?: number
  ) => { success: boolean; message: string };
  generateSettlementCycles: () => { count: number };

  // Customers
  customers: Customer[];
  selectedCustomer: Customer;
  setSelectedCustomer: (customer: Customer) => void;
  addCustomer: (customerData: Omit<Customer, 'id' | 'createdAt'>) => Customer;

  // Cart Management
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => { success: boolean; warning?: string };
  updateCartQty: (lineId: string, qty: number) => void;
  removeFromCart: (lineId: string) => void;
  clearCart: () => void;
  overrideItemPrice: (lineId: string, newPrice: number, reason: string) => void;
  applyItemDiscount: (lineId: string, percent: number, amount: number, reason: string) => void;

  // Order Discounts & Tax
  taxApplied: boolean;
  setTaxApplied: (applied: boolean) => void;
  orderDiscountType: 'percent' | 'fixed' | null;
  orderDiscountValue: number;
  orderDiscountReason: string;
  orderDiscountApprovedBy?: string;
  applyOrderDiscount: (
    type: 'percent' | 'fixed',
    value: number,
    reason: string,
    approverName?: string
  ) => void;
  removeOrderDiscount: () => void;

  // Cart Calculations
  cartSubtotal: number;
  cartTaxAmount: number;
  cartDiscountAmount: number;
  cartTotal: number;

  // Hold / Set-Aside Orders
  setAsideOrders: SetAsideOrder[];
  holdCurrentOrder: (label?: string) => boolean;
  resumeOrder: (id: string) => void;
  cancelHoldOrder: (id: string) => void;

  // Checkout & Transactions & MTO POs
  completeOrder: (
    payments: PaymentComponent[],
    options?: {
      isDeposit?: boolean;
      customizationNotes?: string;
      pickupDate?: string;
      pickupTime?: string;
      poNumber?: string;
    }
  ) => { success: boolean; order?: Order; message: string };
  createMtoOrder: (input: {
    productId?: string;
    quantity?: number;
    customPrice?: number;
    items?: MtoOrderItemInput[];
    customer: Customer;
    pickupDate: string;
    pickupTime: string;
    customizationNotes: string;
    payments: PaymentComponent[];
  }) => { success: boolean; order?: Order; message: string };
  orders: Order[];
  settleMadeToOrder: (orderId: string, payment: PaymentComponent) => { success: boolean; message: string };
  updatePoPickupTime: (orderId: string, newTime: string) => { success: boolean; message: string };
  updateOrderItemExpiryAndQty: (
    orderId: string,
    itemId: string,
    newQuantity: number,
    newExpiryDate: string
  ) => { success: boolean; message: string };
  settlePoPayment: (orderId: string, payments: PaymentComponent[]) => { success: boolean; message: string };
  markPoReadyForPickup: (orderId: string) => { success: boolean; message: string };
  confirmPoPickup: (orderId: string, collectorName: string) => { success: boolean; message: string };
  cancelPoWithSupervisor: (orderId: string, reason: string, supervisorPin: string) => { success: boolean; message: string };
  duplicatePoToCart: (orderId: string, selectedItemIds: string[]) => { success: boolean; message: string };
  voidOrder: (orderId: string, reason: string, supervisorPin: string) => { success: boolean; message: string };
  refundOrder: (
    orderId: string,
    amount: number,
    reason: string,
    refundMethod: 'cash' | 'qris' | 'deposit',
    supervisorPin: string
  ) => { success: boolean; message: string };
  reprintReceipt: (orderId: string, supervisorPin?: string) => { success: boolean; order?: Order; message: string };

  // Current Active Receipt Modal
  activeReceiptOrder: Order | null;
  setActiveReceiptOrder: (order: Order | null) => void;

  // Auditing
  auditLogs: AuditLog[];
  stockAdjustments: StockAdjustmentRecord[];

  // Purchase & Receiving (POS-US-059, POS-US-060, POS-US-061, POS-US-062)
  goodsReceipts: GoodsReceiptRecord[];
  receivingDraft: ReceivingDraft | null;
  setReceivingDraft: React.Dispatch<React.SetStateAction<ReceivingDraft | null>>;
  submitGoodsReceipt: (
    receiptData: Omit<GoodsReceiptRecord, 'id' | 'receiptNumber' | 'stockMovementRef' | 'createdAt' | 'status'>
  ) => { success: boolean; receipt?: GoodsReceiptRecord; message: string };

  // Supplier WhatsApp Order Notification (POS-US-059 to POS-US-063)
  supplierNotificationBatches: SupplierNotificationBatch[];
  supplierDeliveryLogs: SupplierDeliveryLogEntry[];
  sendSupplierWhatsAppNotification: (
    supplierId: string,
    orderIds: string[],
    simulationOutcome?: NotificationDeliveryResult,
    customErrorMessage?: string
  ) => { success: boolean; result: NotificationDeliveryResult; message: string; batchId?: string };
  resendSupplierWhatsAppNotification: (
    batchId: string,
    simulationOutcome?: NotificationDeliveryResult,
    customErrorMessage?: string
  ) => { success: boolean; result: NotificationDeliveryResult; message: string };
  generateSupplierWhatsAppMessage: (
    supplier: Supplier,
    ordersToInclude: Order[]
  ) => string;

  // Purchase Planning (POS-US-073, POS-US-074, POS-US-075)
  purchasePlans: PurchasePlan[];
  addPurchasePlan: (data: {
    namaRencana: string;
    branchId: string;
    supplierId?: string;
    lines: {
      productId: string;
      plannedQuantity: number;
      plannedBuyPrice: number;
      itemType?: PurchasePlanItemType;
      sourcePoRef?: string;
      supplierId?: string;
      supplierName?: string;
      notes?: string;
    }[];
    notes?: string;
    sourceOrderIds?: string[];
    attachedPoNumbers?: string[];
  }) => { success: boolean; plan?: PurchasePlan; message: string };
  updatePurchasePlan: (
    id: string,
    data: {
      namaRencana?: string;
      supplierId?: string;
      lines?: {
        productId: string;
        plannedQuantity: number;
        plannedBuyPrice: number;
        itemType?: PurchasePlanItemType;
        sourcePoRef?: string;
        supplierId?: string;
        supplierName?: string;
        notes?: string;
      }[];
      notes?: string;
      sourceOrderIds?: string[];
      attachedPoNumbers?: string[];
    }
  ) => { success: boolean; plan?: PurchasePlan; message: string };
  cancelPurchasePlan: (id: string, reason?: string) => { success: boolean; message: string };
  lockPurchasePlanForReceipt: (id: string) => { success: boolean; message: string };
  unlockPurchasePlanFromReceipt: (id: string) => { success: boolean; message: string };

  // Master Kategori (HQ Category Management)
  masterCategories: MasterCategory[];
  addMasterCategory: (data: Omit<MasterCategory, 'createdAt'>) => { success: boolean; category?: MasterCategory; message: string };
  updateMasterCategory: (id: string, data: Partial<MasterCategory>) => { success: boolean; message: string };
  deleteMasterCategory: (id: string) => { success: boolean; message: string };
}

const POSContext = createContext<POSContextType | undefined>(undefined);

export const POSProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Multi-Branch State & Store Management, the customer list and the
  // supervisor PIN check are extracted to src/context/slices/useOrgSlice.ts
  // (useOrgState wired in just below, useOrgActions further down).

  // Users & Auth
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const saved = localStorage.getItem('pos_current_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) {
          return {
            ...parsed,
            assignedBranchIds:
              Array.isArray(parsed.assignedBranchIds) && parsed.assignedBranchIds.length > 0
                ? parsed.assignedBranchIds
                : parsed.role === 'admin'
                ? ['branch-senopati', 'branch-kemang', 'branch-bintaro']
                : ['branch-senopati'],
          };
        }
      } catch {}
    }
    return INITIAL_USERS[0]; // Rina Kartika (Kasir)
  });

  useEffect(() => {
    localStorage.setItem('pos_current_user', JSON.stringify(currentUser));
  }, [currentUser]);

  // Branches, users, selected branch, switch-guard flags, customers and
  // verifySupervisorPin — extracted to src/context/slices/useOrgSlice.ts.
  // Wired here (zero dependencies) so every later slice can read org state.
  const {
    branches,
    setBranches,
    users,
    setUsers,
    selectedBranchId,
    setSelectedBranchId,
    isStoreSelectionModalOpen,
    setIsStoreSelectionModalOpen,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    confirmSwitchStore,
    setConfirmSwitchStore,
    customers,
    setCustomers,
    selectedCustomer,
    setSelectedCustomer,
    verifySupervisorPin,
  } = useOrgState();

  const selectedBranch = branches.find((b) => b.id === selectedBranchId) || branches[0];
  // Superadmin has full operational access across all stores; other roles follow branch active/inactive status
  const isBranchReadOnly = currentUser?.role === 'admin' ? false : (selectedBranch?.status === "inactive");

  // Locale & Sound — extracted to slice (src/context/slices/usePreferencesSlice.ts)
  const { lang, setLang, soundEnabled, setSoundEnabled } = usePreferencesSlice();

  // Cashier Session state + open/close/correct/support actions — extracted to
  // src/context/slices/useSessionSlice.ts (wired in after verifySupervisorPin below).

  // Category Master, Master Kategori & Raw Materials state + persistence are
  // extracted to src/context/slices/useCatalogSlice.ts (wired in after addAudit below).

  // Catalog & Products (POS-US-029)
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('pos_products');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const seenIds = new Set<string>();
          const result: Product[] = [];

          for (const item of parsed) {
            if (!item || !item.id || seenIds.has(item.id)) continue;
            seenIds.add(item.id);

            const initMatch = INITIAL_PRODUCTS.find((p) => p.id === item.id);
            if (initMatch) {
              result.push({
                ...initMatch,
                ...item,
                ownershipType: item.ownershipType || initMatch.ownershipType || 'own',
                supplierId: item.supplierId || initMatch.supplierId,
                supplierName: item.supplierName || initMatch.supplierName,
                commissionMethod: item.commissionMethod || initMatch.commissionMethod,
                commissionValue: item.commissionValue ?? initMatch.commissionValue,
                commissionBasis: item.commissionBasis || initMatch.commissionBasis,
              });
            } else {
              result.push(item);
            }
          }

          // Add any missing initial products (e.g. prod-23, prod-24)
          for (const init of INITIAL_PRODUCTS) {
            if (!seenIds.has(init.id)) {
              seenIds.add(init.id);
              result.push(init);
            }
          }

          return result;
        }
      } catch {}
    }
    return INITIAL_PRODUCTS;
  });

  useEffect(() => {
    localStorage.setItem('pos_products', JSON.stringify(products));
  }, [products]);

  // Supplier Master (POS-US-030)
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem('pos_suppliers');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const seen = new Set<string>();
          const result: Supplier[] = [];
          for (const s of parsed) {
            if (s && s.id && !seen.has(s.id)) {
              seen.add(s.id);
              result.push(s);
            }
          }
          for (const init of INITIAL_SUPPLIERS) {
            if (!seen.has(init.id)) {
              seen.add(init.id);
              result.push(init);
            }
          }
          return result;
        }
      } catch {}
    }
    return INITIAL_SUPPLIERS;
  });

  useEffect(() => {
    localStorage.setItem('pos_suppliers', JSON.stringify(suppliers));
  }, [suppliers]);

  // Consignment Commission Ledger (POS-US-031)
  const [commissionLedger, setCommissionLedger] = useState<CommissionLedgerEntry[]>(() => {
    const saved = localStorage.getItem('pos_commission_ledger');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const seen = new Set<string>();
          const result: CommissionLedgerEntry[] = [];
          for (const entry of parsed) {
            if (entry && entry.id && !seen.has(entry.id)) {
              seen.add(entry.id);
              result.push(entry);
            }
          }
          return result;
        }
      } catch {}
    }
    return INITIAL_COMMISSION_LEDGER;
  });

  useEffect(() => {
    localStorage.setItem('pos_commission_ledger', JSON.stringify(commissionLedger));
  }, [commissionLedger]);

  // Supplier Settlement Cycles (POS-US-032, POS-US-034, POS-US-035)
  const [settlementCycles, setSettlementCycles] = useState<SupplierSettlementCycle[]>(() => {
    // Retired demo seeds, removed from INITIAL_SETTLEMENT_CYCLES because they carried a
    // hard-coded 'overdue' / 'due' status (see the note in src/data/mockData.ts). An
    // earlier build already wrote them into this localStorage cache, and the top-up loop
    // below would happily keep them alive, so purge any stale copy on load. Runtime cycle
    // ids look like `SET-<epoch6>-<rand3>` (see generateSettlementCycles), so this list
    // can never match a genuine cycle.
    const RETIRED_SEED_IDS = new Set(['SET-202608-OVERDUE', 'SET-202609-DUE-TODAY']);

    const saved = localStorage.getItem('pos_settlement_cycles');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const seen = new Set<string>();
          const result: SupplierSettlementCycle[] = [];
          for (const cycle of parsed) {
            if (cycle && cycle.id && !seen.has(cycle.id) && !RETIRED_SEED_IDS.has(cycle.id)) {
              seen.add(cycle.id);
              result.push(cycle);
            }
          }
          for (const init of INITIAL_SETTLEMENT_CYCLES) {
            if (!seen.has(init.id)) {
              seen.add(init.id);
              result.push(init);
            }
          }
          return result;
        }
      } catch {}
    }
    return INITIAL_SETTLEMENT_CYCLES;
  });

  useEffect(() => {
    localStorage.setItem('pos_settlement_cycles', JSON.stringify(settlementCycles));
  }, [settlementCycles]);

  // Customers (list + selected customer) — extracted to
  // src/context/slices/useOrgSlice.ts (useOrgState above).

  // Goods receipts, receiving draft and purchase-plan state — extracted to
  // src/context/slices/useGoodsReceivingSlice.ts (wired in after useOrgActions).

  // POS-US-069: Category Daily Closings
  const [categoryClosings, setCategoryClosings] = useState<CategoryClosingSession[]>(() => {
    const saved = localStorage.getItem('pos_category_closings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return INITIAL_CATEGORY_CLOSINGS;
  });

  useEffect(() => {
    localStorage.setItem('pos_category_closings', JSON.stringify(categoryClosings));
  }, [categoryClosings]);

  // Expiry batches, stock transfers and bad-stock state — extracted to
  // src/context/slices/useInventorySlice.ts (wired in after the session slice below).

  // Cart state (cart, taxApplied, order-level discount fields) — extracted to
  // src/context/slices/useCartSlice.ts (wired in after the session slice below).

  // Set-aside orders
  const [setAsideOrders, setSetAsideOrders] = useState<SetAsideOrder[]>(() => {
    const saved = localStorage.getItem('pos_held_orders');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('pos_held_orders', JSON.stringify(setAsideOrders));
  }, [setAsideOrders]);

  // Orders
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('pos_orders');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const seen = new Set<string>();
          const list: Order[] = [];
          for (const o of parsed) {
            if (o && o.id) {
              seen.add(o.id);
              list.push(o);
            }
          }
          for (const init of INITIAL_ORDERS) {
            if (!seen.has(init.id)) {
              seen.add(init.id);
              list.push(init);
            }
          }
          return list;
        }
      } catch {}
    }
    return INITIAL_ORDERS;
  });

  useEffect(() => {
    localStorage.setItem('pos_orders', JSON.stringify(orders));
  }, [orders]);

  // Audit log & stock adjustments state — extracted to src/context/slices/useAuditSlice.ts

  // Receipt Modal State
  const [activeReceiptOrder, setActiveReceiptOrder] = useState<Order | null>(null);

  // Audit log, stock adjustments & the shared addAudit logger — extracted to slice
  const { auditLogs, stockAdjustments, setStockAdjustments, addAudit } = useAuditSlice({ currentUser });

  // Catalog master data (categories, master categories, raw materials) — extracted to slice
  const {
    categories,
    masterCategories,
    rawMaterials,
    setRawMaterials,
    addCategory,
    addMasterCategory,
    updateMasterCategory,
    deleteMasterCategory,
    addRawMaterial,
    updateRawMaterial,
    deleteRawMaterial,
  } = useCatalogSlice({ selectedBranchId, currentUserName: currentUser.name, addAudit });

  // User login/switching, branch selection + CRUD/status, user CRUD/status and
  // customer creation — extracted to src/context/slices/useOrgSlice.ts.
  // The org state comes from useOrgState above; these actions are wired below
  // the session slice because selectBranch clears the cart and
  // toggleBranchStatus reads the active session.
  // Cashier Session actions — extracted to src/context/slices/useSessionSlice.ts
  const {
    currentSession,
    setCurrentSession,
    closedSessions,
    openSession,
    correctOpeningCash,
    closeSession,
    openSupportSessionCorrection,
  } = useSessionSlice({
    currentUser,
    setAsideOrders,
    addAudit,
    verifySupervisorPin,
  });
  // Expiry batches, stock transfers and bad stock (state + actions) — extracted to
  // src/context/slices/useInventorySlice.ts (wired in below, before the cart slice,
  // which consumes setExpiryBatches).
  const {
    expiryBatches,
    setExpiryBatches,
    stockTransfers,
    badStocks,
    createStockTransfer,
    receiveStockTransfer,
    recordBadStock,
    destroyExpiredBatches,
  } = useInventorySlice({
    branches,
    selectedBranchId,
    selectedBranch,
    currentUser,
    isBranchReadOnly,
    products,
    setProducts,
    setStockAdjustments,
    addAudit,
  });

  // Cart state + cart/discount/tax actions — extracted to
  // src/context/slices/useCartSlice.ts (wired in below, after the session slice
  // and before useOrgActions, which clears the cart when switching branch).
  const {
    cart,
    setCart,
    taxApplied,
    setTaxApplied,
    orderDiscountType,
    setOrderDiscountType,
    orderDiscountValue,
    setOrderDiscountValue,
    orderDiscountReason,
    setOrderDiscountReason,
    orderDiscountApprovedBy,
    setOrderDiscountApprovedBy,
    addToCart,
    updateCartQty,
    removeFromCart,
    clearCart,
    overrideItemPrice,
    applyItemDiscount,
    applyOrderDiscount,
    removeOrderDiscount,
    cartSubtotal,
    cartTaxAmount,
    cartDiscountAmount,
    cartTotal,
    holdCurrentOrder,
    resumeOrder,
    cancelHoldOrder,
    completeOrder,
  } = useCartSlice({
    currentUser,
    currentSession,
    setCurrentSession,
    selectedCustomer,
    setSelectedCustomer,
    setCustomers,
    setExpiryBatches,
    branches,
    selectedBranchId,
    orders,
    setOrders,
    products,
    setProducts,
    setCommissionLedger,
    setActiveReceiptOrder,
    setAsideOrders,
    setSetAsideOrders,
    addAudit,
  });


  // Hand Off Active Session (POS-US-004)
  const handOffSession = (newCashierId: string, pin: string) => {
    const receivingCashier = users.find((u) => u.id === newCashierId);
    if (!receivingCashier) {
      posSound.error();
      return { success: false, message: 'Kasir penerima tidak ditemukan' };
    }
    if (receivingCashier.pin !== pin) {
      posSound.error();
      return { success: false, message: 'PIN Kasir Penerima Salah' };
    }
    if (!currentSession) {
      return { success: false, message: 'Tidak ada sesi aktif' };
    }

    const previousName = currentUser.name;
    const previousId = currentUser.id;

    setCurrentSession((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        cashierId: receivingCashier.id,
        cashierName: receivingCashier.name,
        handOffHistory: [
          ...prev.handOffHistory,
          {
            fromCashierId: previousId,
            fromCashierName: previousName,
            toCashierId: receivingCashier.id,
            toCashierName: receivingCashier.name,
            timestamp: new Date().toISOString(),
          },
        ],
      };
    });

    setCurrentUser(receivingCashier);
    addAudit(
      'SESSION_HANDOFF',
      'session',
      currentSession.id,
      `Serah terima sesi dari ${previousName} kepada ${receivingCashier.name}`
    );
    posSound.beep();
    return { success: true, message: `Sesi berhasil diserahkan ke ${receivingCashier.name}` };
  };

  const {
    switchUser,
    selectBranch,
    requestSwitchBranch,
    confirmAndSwitchBranch,
    cancelSwitchBranch,
    addBranch,
    updateBranch,
    toggleBranchStatus,
    addUser,
    updateUser,
    toggleUserStatus,
    addCustomer,
  } = useOrgActions({
    branches,
    setBranches,
    users,
    setUsers,
    selectedBranchId,
    setSelectedBranchId,
    setIsStoreSelectionModalOpen,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    confirmSwitchStore,
    setConfirmSwitchStore,
    setCustomers,
    setSelectedCustomer,
    currentUser,
    setCurrentUser,
    currentSession,
    setCart,
    addAudit,
  });
  // Goods receipts, receiving draft, purchase plans and their actions — extracted
  // to src/context/slices/useGoodsReceivingSlice.ts (wired in below, after the
  // inventory and catalog slices that it depends on).
  const {
    goodsReceipts,
    setGoodsReceipts,
    receivingDraft,
    setReceivingDraft,
    purchasePlans,
    submitGoodsReceipt,
    addPurchasePlan,
    updatePurchasePlan,
    cancelPurchasePlan,
    lockPurchasePlanForReceipt,
    unlockPurchasePlanFromReceipt,
  } = useGoodsReceivingSlice({
    branches,
    selectedBranchId,
    selectedBranch,
    currentUser,
    products,
    setProducts,
    suppliers,
    rawMaterials,
    stockTransfers,
    setExpiryBatches,
    setStockAdjustments,
    setRawMaterials,
    addAudit,
  });


  // addCategory: extracted to src/context/slices/useCatalogSlice.ts

  // Master Kategori CRUD: extracted to src/context/slices/useCatalogSlice.ts

  // Product Master (POS-US-029)
  const addProduct = (productData: Omit<Product, 'id'>) => {
    const trimmedName = productData.name.trim();
    const trimmedSku = productData.sku.trim().toUpperCase();

    if (!trimmedName) {
      return { success: false, message: 'Nama produk wajib diisi!' };
    }
    if (!trimmedSku) {
      return { success: false, message: 'Kode produk / SKU wajib diisi!' };
    }

    const isDuplicateSku = products.some(
      (p) => p.sku.toLowerCase() === trimmedSku.toLowerCase()
    );
    if (isDuplicateSku) {
      return { success: false, message: `Kode SKU "${trimmedSku}" sudah terdaftar!` };
    }

    const id = 'prod-' + Date.now().toString().slice(-6);
    const newProd: Product = {
      ...productData,
      id,
      branchId: selectedBranchId,
      name: trimmedName,
      sku: trimmedSku,
      stock: 0, // POS-US-062: Product master is created with zero stock; first stock comes only from submitted receipt
      lowStockThreshold: Math.max(0, productData.lowStockThreshold || 3),
      price: Math.max(0, productData.price || 0),
    };

    setProducts((prev) => [newProd, ...prev]);

    addAudit(
      'PRODUCT_CREATE',
      'product',
      id,
      `Master Produk baru: ${newProd.name} (SKU: ${newProd.sku}), Kepemilikan: ${newProd.ownershipType === 'consignment' ? 'Konsinyasi (' + newProd.supplierName + ')' : 'Milik Sendiri'}, Stok: 0 (Menunggu Penerimaan), Harga: Rp ${newProd.price.toLocaleString('id-ID')}`
    );
    posSound.beep();
    return { success: true, product: newProd, message: `Produk "${newProd.name}" berhasil ditambahkan dengan stok 0!` };
  };

  // Raw Material CRUD: extracted to src/context/slices/useCatalogSlice.ts

  // Supplier Master (POS-US-030)
  const addSupplier = (supplierData: Omit<Supplier, 'id' | 'createdAt'>) => {
    const trimmedName = supplierData.name.trim();
    if (!trimmedName) {
      return { success: false, message: 'Nama supplier wajib diisi!' };
    }
    const isDuplicate = suppliers.some(
      (s) => s.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      return { success: false, message: `Supplier "${trimmedName}" sudah terdaftar!` };
    }

    const id = 'sup-' + Date.now().toString().slice(-5);
    const newSup: Supplier = {
      ...supplierData,
      id,
      branchId: selectedBranchId,
      name: trimmedName,
      picName: supplierData.picName.trim(),
      phone: supplierData.phone.trim(),
      createdAt: new Date().toISOString(),
    };

    setSuppliers((prev) => [...prev, newSup]);
    addAudit(
      'SUPPLIER_CREATE',
      'supplier',
      id,
      `Supplier baru terdaftar: ${newSup.name} (PIC: ${newSup.picName || '-'}, Jadwal: ${newSup.scheduleType})`
    );
    posSound.beep();
    return { success: true, supplier: newSup, message: `Supplier "${newSup.name}" berhasil disimpan!` };
  };

  const updateSupplier = (id: string, supplierData: Partial<Supplier>) => {
    const target = suppliers.find((s) => s.id === id);
    if (!target) return { success: false, message: 'Supplier tidak ditemukan!' };

    setSuppliers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...supplierData, updatedAt: new Date().toISOString() } : s))
    );
    addAudit(
      'SUPPLIER_UPDATE',
      'supplier',
      id,
      `Data supplier diperbarui: ${target.name} oleh ${currentUser.name}`
    );
    posSound.beep();
    return { success: true, message: `Data supplier "${target.name}" berhasil diperbarui!` };
  };

  // Supplier Settlement Payment (POS-US-035)
  const recordSettlementPayment = (
    cycleId: string,
    paymentMethod: 'cash' | 'transfer' | 'qris' | 'other',
    reference: string,
    notes: string,
    supervisorPin?: string,
    paymentAmount?: number
  ) => {
    const target = settlementCycles.find((c) => c.id === cycleId);
    if (!target) return { success: false, message: 'Siklus settlement tidak ditemukan' };
    if (target.status === 'settled') {
      return { success: false, message: 'Siklus ini sudah lunas sebelumnya!' };
    }
    if (['transfer', 'qris'].includes(paymentMethod) && !reference.trim()) {
      return { success: false, message: 'Nomor referensi / bukti transfer wajib diisi!' };
    }

    const actualAmount = paymentAmount !== undefined ? paymentAmount : target.storeNetAfterCommission;
    const targetSup = suppliers.find((s) => s.id === target.supplierId);
    const prevPiutang = targetSup?.balance || 0;
    const totalCoverage = actualAmount + prevPiutang;

    if (totalCoverage < target.storeNetAfterCommission) {
      return {
        success: false,
        message: `Nominal pembayaran (${actualAmount.toLocaleString('id-ID')}) + Piutang Supplier (${prevPiutang.toLocaleString('id-ID')}) belum mencukupi Total Tagihan (${target.storeNetAfterCommission.toLocaleString('id-ID')})!`,
      };
    }

    const now = new Date().toISOString();
    // New piutang supplier: (Nominal + Piutang Sebelumnya) - Total Tagihan
    const newPiutang = Math.max(0, totalCoverage - target.storeNetAfterCommission);
    const piutangUsed = Math.min(prevPiutang, target.storeNetAfterCommission - actualAmount);

    // Update supplier piutang balance
    setSuppliers((prev) =>
      prev.map((s) => {
        if (s.id === target.supplierId) {
          return {
            ...s,
            balance: newPiutang,
            balanceUpdatedAt: now,
            updatedAt: now,
          };
        }
        return s;
      })
    );

    if (newPiutang > prevPiutang) {
      const added = newPiutang - prevPiutang;
      addAudit(
        'SUPPLIER_BALANCE_ADD',
        'supplier',
        target.supplierId,
        `Kelebihan pembayaran settlement ${cycleId} sebesar Rp ${added.toLocaleString('id-ID')} dicatat sebagai Piutang Supplier ${target.supplierName}. Total Piutang: Rp ${newPiutang.toLocaleString('id-ID')}`
      );
    } else if (newPiutang < prevPiutang) {
      const deducted = prevPiutang - newPiutang;
      addAudit(
        'SUPPLIER_BALANCE_DEDUCT',
        'supplier',
        target.supplierId,
        `Piutang Supplier ${target.supplierName} sebesar Rp ${deducted.toLocaleString('id-ID')} diperhitungkan untuk pelunasan settlement ${cycleId}. Sisa Piutang: Rp ${newPiutang.toLocaleString('id-ID')}`
      );
    }

    setSettlementCycles((prev) =>
      prev.map((c) =>
        c.id === cycleId
          ? {
              ...c,
              status: 'settled',
              paymentMethod,
              paymentAmount: actualAmount,
              piutangUsed: Math.max(0, piutangUsed),
              newPiutangGenerated: newPiutang > prevPiutang ? (newPiutang - prevPiutang) : 0,
              totalSettledBuyAmount: target.storeNetAfterCommission,
              paymentReference: reference.trim() || undefined,
              settlementNotes: notes.trim() || undefined,
              settledBy: currentUser.name,
              settledAt: now,
            }
          : c
      )
    );

    // Update associated commission ledger entries to 'settled'
    setCommissionLedger((prev) =>
      prev.map((entry) =>
        target.commissionEntryIds.includes(entry.id)
          ? { ...entry, status: 'settled', settlementId: cycleId }
          : entry
      )
    );

    addAudit(
      'SETTLEMENT_PAYMENT',
      'consignment',
      cycleId,
      `Pembayaran Settlement Hak Supplier: ${target.supplierName} sebesar Rp ${actualAmount.toLocaleString('id-ID')} (Tagihan: Rp ${target.storeNetAfterCommission.toLocaleString('id-ID')}${prevPiutang > 0 ? `, Piutang Digunakan: Rp ${Math.max(0, piutangUsed).toLocaleString('id-ID')}` : ''}${newPiutang > prevPiutang ? `, Piutang Baru: Rp ${(newPiutang - prevPiutang).toLocaleString('id-ID')}` : ''}) via ${paymentMethod.toUpperCase()}${reference ? ' (Ref: ' + reference + ')' : ''}. Dicatat oleh ${currentUser.name}`
    );

    posSound.cashRegister();
    const successMsg =
      newPiutang > prevPiutang
        ? `Settlement untuk ${target.supplierName} LUNAS. Kelebihan Rp ${(newPiutang - prevPiutang).toLocaleString('id-ID')} dicatat sebagai Piutang Supplier.`
        : prevPiutang > 0
        ? `Settlement untuk ${target.supplierName} berhasil dicatat LUNAS (Nominal Rp ${actualAmount.toLocaleString('id-ID')} + Piutang Supplier Rp ${Math.max(0, piutangUsed).toLocaleString('id-ID')}).`
        : `Settlement untuk ${target.supplierName} berhasil dicatat LUNAS.`;
    return { success: true, message: successMsg };
  };

  // Generate / Recalculate Settlement Cycles (POS-US-032)
  const generateSettlementCycles = () => {
    // Check accrued entries not yet in any cycle
    const accruedEntries = commissionLedger.filter((c) => c.status === 'accrued');
    if (accruedEntries.length === 0) return { count: 0 };

    // Group by supplier
    const bySupplier: { [key: string]: CommissionLedgerEntry[] } = {};
    accruedEntries.forEach((entry) => {
      if (!bySupplier[entry.supplierId]) bySupplier[entry.supplierId] = [];
      bySupplier[entry.supplierId].push(entry);
    });

    const newCycles: SupplierSettlementCycle[] = [];
    Object.entries(bySupplier).forEach(([supId, entries]) => {
      const sup = suppliers.find((s) => s.id === supId);
      const gross = entries.reduce((sum, e) => sum + e.grossAmount, 0);
      const discs = entries.reduce((sum, e) => sum + e.allocatedDiscount, 0);
      const net = entries.reduce((sum, e) => sum + e.netAmount, 0);
      const comm = entries.reduce((sum, e) => sum + e.commissionAmount, 0);
      const storeNet = entries.reduce((sum, e) => sum + e.storeNetAmount, 0);

      const cycleId = 'SET-' + Date.now().toString().slice(-6) + '-' + Math.random().toString(36).slice(2, 5);
      const dueDate = sup?.nextDueDate || new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];

      const isDue = dueDate === new Date().toISOString().split('T')[0];
      const isOverdue = dueDate < new Date().toISOString().split('T')[0];
      const status: SupplierSettlementCycle['status'] = isOverdue ? 'overdue' : isDue ? 'due' : 'upcoming';

      newCycles.push({
        id: cycleId,
        supplierId: supId,
        supplierName: sup?.name || entries[0]?.supplierName || 'Supplier Konsinyasi',
        periodStart: entries[entries.length - 1]?.createdAt.split('T')[0] || new Date().toISOString().split('T')[0],
        periodEnd: new Date().toISOString().split('T')[0],
        dueDate,
        grossItemSales: gross,
        discounts: discs,
        netItemSales: net,
        commissionPayable: comm,
        storeNetAfterCommission: storeNet,
        status,
        commissionEntryIds: entries.map((e) => e.id),
        createdAt: new Date().toISOString(),
      });
    });

    if (newCycles.length > 0) {
      setSettlementCycles((prev) => [...newCycles, ...prev]);
      // Update commission ledger status to 'included'
      const includedIds = new Set(newCycles.flatMap((c) => c.commissionEntryIds));
      setCommissionLedger((prev) =>
        prev.map((e) => (includedIds.has(e.id) ? { ...e, status: 'included' } : e))
      );
    }

    return { count: newCycles.length };
  };

  // Cart actions (add/update/remove/clear, price overrides, item + order
  // discounts, hold/resume/cancel, completeOrder) — extracted to
  // src/context/slices/useCartSlice.ts.
  // MTO / purchase-order lifecycle & order item expiry-qty — extracted to
  // src/context/slices/useOrderSlice.ts
  const {
    createMtoOrder,
    settleMadeToOrder,
    updatePoPickupTime,
    updateOrderItemExpiryAndQty,
    settlePoPayment,
    markPoReadyForPickup,
    confirmPoPickup,
    cancelPoWithSupervisor,
    duplicatePoToCart,
  } = useOrderSlice({
    branches,
    selectedBranchId,
    selectedBranch,
    currentUser,
    currentSession,
    verifySupervisorPin,
    taxApplied,
    orders,
    products,
    setActiveReceiptOrder,
    setSelectedCustomer,
    addAudit,
    setCart,
    setCurrentSession,
    setCustomers,
    setExpiryBatches,
    setOrderDiscountReason,
    setOrderDiscountType,
    setOrderDiscountValue,
    setOrders,
    setProducts,
    setStockAdjustments,
  });


  // Void Order within Grace Period (POS-US-016)
  const voidOrder = (orderId: string, reason: string, supervisorPin: string) => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) {
      posSound.error();
      return { success: false, message: 'Transaksi tidak ditemukan' };
    }
    if (target.orderStatus === 'voided') {
      posSound.error();
      return { success: false, message: 'Transaksi ini sudah pernah di-void!' };
    }

    // Check grace period (5 minutes = 300,000 ms)
    const elapsedMinutes = (Date.now() - new Date(target.createdAt).getTime()) / (1000 * 60);
    if (elapsedMinutes > 5) {
      posSound.error();
      return {
        success: false,
        message: 'Masa tenggang void (5 menit) telah terlewati. Silakan gunakan fitur Refund / Pengembalian!',
      };
    }

    const auth = verifySupervisorPin(supervisorPin);
    if (!auth.success) {
      posSound.error();
      return { success: false, message: 'Otorisasi Supervisor diperlukan untuk Void!' };
    }

    // Restore stock
    setProducts((prev) =>
      prev.map((prod) => {
        const item = target.items.find((i) => i.productId === prod.id);
        if (item) {
          return { ...prod, stock: prod.stock + item.quantity };
        }
        return prod;
      })
    );

    // Reverse payment in session
    const cashPortion = target.payments
      .filter((p) => p.method === 'cash')
      .reduce((sum, p) => sum + p.amount, 0);

    if (currentSession) {
      setCurrentSession((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          totalRefunds: prev.totalRefunds + target.paidAmount,
          expectedCash: Math.max(0, prev.expectedCash - cashPortion),
        };
      });
    }

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              orderStatus: 'voided',
              paymentStatus: 'refunded',
              voidReason: reason,
              voidApprovedBy: auth.supervisor?.name,
            }
          : o
      )
    );

    // Reverse Consignment Commission Ledger (POS-US-031 AC-08)
    setCommissionLedger((prev) =>
      prev.map((entry) =>
        entry.orderId === orderId && entry.status !== 'reversed'
          ? {
              ...entry,
              status: 'reversed',
              reversedAt: new Date().toISOString(),
              reversalReason: `Void Transaksi: ${reason}`,
            }
          : entry
      )
    );

    addAudit(
      'ORDER_VOID',
      'order',
      target.id,
      `Void Transaksi ${target.receiptNumber} oleh ${currentUser.name}, disetujui ${auth.supervisor?.name}. Alasan: ${reason}`
    );

    posSound.beep();
    return { success: true, message: `Transaksi ${target.receiptNumber} berhasil dibatalkan (VOID).` };
  };

  // Refund Order (POS-US-017)
  const refundOrder = (
    orderId: string,
    amount: number,
    reason: string,
    refundMethod: 'cash' | 'qris' | 'deposit',
    supervisorPin: string
  ) => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) {
      posSound.error();
      return { success: false, message: 'Transaksi tidak ditemukan' };
    }
    if (amount <= 0 || amount > target.paidAmount) {
      posSound.error();
      return { success: false, message: 'Jumlah refund tidak valid atau melebihi total bayar!' };
    }

    const auth = verifySupervisorPin(supervisorPin);
    if (!auth.success) {
      posSound.error();
      return { success: false, message: 'Otorisasi Supervisor diperlukan untuk Refund!' };
    }

    const isFullRefund = amount >= target.paidAmount;
    const newStatus = isFullRefund ? 'refunded' : 'partially_refunded';

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              orderStatus: newStatus,
              refundAmount: (o.refundAmount || 0) + amount,
              refundReason: reason,
              refundApprovedBy: auth.supervisor?.name,
            }
          : o
      )
    );

    if (currentSession && refundMethod === 'cash') {
      setCurrentSession((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          totalRefunds: prev.totalRefunds + amount,
          expectedCash: Math.max(0, prev.expectedCash - amount),
        };
      });
    }

    // Reverse Consignment Commission Ledger (POS-US-031 AC-09)
    if (isFullRefund) {
      setCommissionLedger((prev) =>
        prev.map((entry) =>
          entry.orderId === orderId && entry.status !== 'reversed'
            ? {
                ...entry,
                status: 'reversed',
                reversedAt: new Date().toISOString(),
                reversalReason: `Refund Transaksi: ${reason}`,
              }
            : entry
        )
      );
    }

    addAudit(
      'ORDER_REFUND',
      'order',
      target.id,
      `Refund ${newStatus} ${target.receiptNumber} sebesar Rp ${amount.toLocaleString('id-ID')} via ${refundMethod}. Disetujui ${auth.supervisor?.name}. Alasan: ${reason}`
    );

    posSound.cashRegister();
    return { success: true, message: `Refund Rp ${amount.toLocaleString('id-ID')} berhasil diproses.` };
  };

  // Reprint Receipt with Approval (POS-US-019)
  const reprintReceipt = (orderId: string, supervisorPin?: string) => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) return { success: false, message: 'Transaksi tidak ditemukan' };

    if (target.reprintCount >= 3) {
      posSound.error();
      return { success: false, message: 'Batas cetak ulang (3x) untuk struk ini sudah tercapai!' };
    }

    if (supervisorPin) {
      const auth = verifySupervisorPin(supervisorPin);
      if (!auth.success) {
        posSound.error();
        return { success: false, message: 'PIN Supervisor tidak valid untuk reprint!' };
      }
    }

    const updated: Order = {
      ...target,
      reprintCount: target.reprintCount + 1,
    };

    setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
    setActiveReceiptOrder(updated);

    addAudit(
      'RECEIPT_REPRINT',
      'order',
      target.id,
      `Cetak ulang struk ${target.receiptNumber} ke-${updated.reprintCount}`
    );

    posSound.beep();
    return { success: true, order: updated, message: 'Struk siap dicetak ulang.' };
  };

  // Manual Stock Adjustment (POS-US-021)
  const manualAdjustStock = (
    productId: string,
    type: 'increase' | 'decrease',
    quantity: number,
    reason: string
  ) => {
    if (quantity <= 0) {
      posSound.error();
      return { success: false, message: 'Jumlah penyesuaian harus lebih dari 0' };
    }
    if (!reason.trim()) {
      posSound.error();
      return { success: false, message: 'Alasan penyesuaian stok wajib diisi!' };
    }

    const target = products.find((p) => p.id === productId);
    if (!target) return { success: false, message: 'Produk tidak ditemukan' };

    const oldStock = target.stock;
    const newStock = type === 'increase' ? oldStock + quantity : Math.max(0, oldStock - quantity);

    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stock: newStock } : p))
    );

    const record: StockAdjustmentRecord = {
      id: 'ADJ-' + Date.now().toString().slice(-6),
      productId,
      productName: target.name,
      type,
      quantity,
      previousStock: oldStock,
      resultingStock: newStock,
      reason,
      adminId: currentUser.id,
      adminName: currentUser.name,
      timestamp: new Date().toISOString(),
    };
    setStockAdjustments((prev) => [record, ...prev]);

    addAudit(
      'STOCK_ADJUSTMENT',
      'stock',
      productId,
      `Penyesuaian stok ${target.name} (${type === 'increase' ? '+' : '-'}${quantity}). Stok: ${oldStock} -> ${newStock}. Alasan: ${reason}`
    );

    posSound.beep();
    return { success: true, message: `Stok ${target.name} berhasil diperbarui: ${newStock}` };
  };

  // Goods receipt submission and the purchase-plan lifecycle (add, update,
  // cancel, lock for receipt, unlock) — extracted to
  // src/context/slices/useGoodsReceivingSlice.ts.
  // POS-US-072 & POS-US-067: Update Product Information (Master data only, NEVER stock or Stok Awal)
  const updateProductInfo = (
    productId: string,
    info: Partial<Omit<Product, 'id' | 'branchId' | 'stock' | 'inTransitStock' | 'badStock'>>
  ) => {
    if (currentUser.role !== 'admin') {
      posSound.error();
      return { success: false, message: 'Hanya Superadmin yang berwenang mengubah informasi produk!' };
    }
    if (isBranchReadOnly || selectedBranch.status === 'inactive') {
      posSound.error();
      return { success: false, message: 'Cabang nonaktif tidak dapat diubah (Mode Hanya Baca).' };
    }

    const target = products.find((p) => p.id === productId);
    if (!target) return { success: false, message: 'Produk tidak ditemukan.' };

    // Explicitly guarantee stock, inTransitStock, badStock are never modified
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        return {
          ...p,
          ...(info.name !== undefined ? { name: info.name.trim() } : {}),
          ...(info.sku !== undefined ? { sku: info.sku.trim().toUpperCase() } : {}),
          ...(info.category !== undefined ? { category: info.category } : {}),
          ...(info.categoryLabel !== undefined ? { categoryLabel: info.categoryLabel } : {}),
          ...(info.price !== undefined ? { price: Math.max(0, info.price) } : {}),
          ...(info.isPriceCustomizable !== undefined ? { isPriceCustomizable: info.isPriceCustomizable } : {}),
          ...(info.lowStockThreshold !== undefined ? { lowStockThreshold: Math.max(0, info.lowStockThreshold) } : {}),
          ...(info.image !== undefined ? { image: info.image } : {}),
          ...(info.description !== undefined ? { description: info.description } : {}),
          ...(info.ownershipType !== undefined ? { ownershipType: info.ownershipType } : {}),
          ...(info.supplierId !== undefined ? { supplierId: info.supplierId } : {}),
          ...(info.supplierName !== undefined ? { supplierName: info.supplierName } : {}),
          ...(info.commissionMethod !== undefined ? { commissionMethod: info.commissionMethod } : {}),
          ...(info.commissionValue !== undefined ? { commissionValue: info.commissionValue } : {}),
          ...(info.commissionBasis !== undefined ? { commissionBasis: info.commissionBasis } : {}),
        };
      })
    );

    addAudit(
      'PRODUCT_UPDATE_INFO',
      'product',
      productId,
      `Superadmin ${currentUser.name} memperbarui informasi produk ${target.name} (SKU: ${info.sku || target.sku}) di ${selectedBranch.name}. Stok fisik tidak diubah.`
    );

    posSound.beep();
    return { success: true, message: `Informasi produk ${info.name || target.name} berhasil disimpan.` };
  };

  // POS-US-069: Category Daily Stock Closing
  const submitCategoryClosing = (session: CategoryClosingSession) => {
    if (isBranchReadOnly || selectedBranch.status === 'inactive') {
      posSound.error();
      return { success: false, message: 'Cabang nonaktif tidak dapat melakukan penutupan stok!' };
    }

    // Update sellable stock for each counted product
    setProducts((prev) =>
      prev.map((p) => {
        const row = session.rows.find((r) => r.productId === p.id);
        if (row) {
          return { ...p, stock: Math.max(0, row.actualClosingStock) };
        }
        return p;
      })
    );

    const completeSession: CategoryClosingSession = {
      ...session,
      status: 'submitted',
      submittedBy: `${currentUser.name} (${currentUser.role})`,
      submittedAt: new Date().toISOString(),
    };

    setCategoryClosings((prev) => [completeSession, ...prev.filter((c) => c.id !== session.id)]);

    addAudit(
      'STOCK_DAILY_CLOSING',
      'stock',
      session.categoryId,
      `Penutupan stok harian kategori ${session.categoryName} (${session.closingDate}) disubmit oleh ${currentUser.name}. ${session.rows.length} produk dihitung fisik.`
    );

    posSound.beep();
    return { success: true, message: `Penutupan harian kategori ${session.categoryName} berhasil disubmit!` };
  };

  const saveCategoryClosingDraft = (session: CategoryClosingSession) => {
    setCategoryClosings((prev) => [
      { ...session, status: 'draft' },
      ...prev.filter((c) => c.id !== session.id),
    ]);
    posSound.beep();
    return { success: true, message: 'Draft penutupan berhasil disimpan.' };
  };

  // Stock transfers, bad stock and expired-batch destruction actions — extracted to
  // src/context/slices/useInventorySlice.ts.
  // POS-US-072: Consolidated Stock History (Penerimaan, Daily Closing, Transfers, Bad Stock)
  const getStockHistory = (productId?: string, branchId?: string): StockHistoryItem[] => {
    const targetBranchId = branchId || selectedBranchId;
    const list: StockHistoryItem[] = [];

    // 1. Goods Receipts
    goodsReceipts.forEach((r) => {
      if (r.branchId && r.branchId !== targetBranchId) return;
      if (r.status !== 'submitted') return;
      r.items.forEach((item) => {
        if (productId && item.productId !== productId) return;
        list.push({
          id: `rcv-${r.id}-${item.id}`,
          branchId: r.branchId || targetBranchId,
          productId: item.productId,
          productName: item.productName,
          sku: item.productSku,
          type: 'receiving',
          typeLabel: 'Penerimaan Barang',
          quantityChange: item.quantityReceived,
          referenceNo: r.receiptNumber,
          notes: r.remarks || `Penerimaan dari ${r.supplierName}`,
          actorName: r.receivedBy,
          timestamp: r.submittedAt || r.createdAt,
        });
      });
    });

    // 2. Category Daily Closings
    categoryClosings.forEach((c) => {
      if (c.branchId !== targetBranchId) return;
      if (c.status !== 'submitted') return;
      c.rows.forEach((row) => {
        if (productId && row.productId !== productId) return;
        list.push({
          id: `cls-${c.id}-${row.productId}`,
          branchId: c.branchId,
          productId: row.productId,
          productName: row.productName,
          sku: row.sku,
          type: 'daily_closing',
          typeLabel: 'Penutupan Harian (Closing)',
          quantityChange: row.variance,
          previousStock: row.systemStock,
          resultingStock: row.actualClosingStock,
          referenceNo: c.id,
          notes: row.remark || `Penutupan Kategori ${c.categoryName} (${c.closingDate})`,
          actorName: c.submittedBy || 'Supervisor',
          timestamp: c.submittedAt || c.createdAt,
        });
      });
    });

    // 3. Stock Transfers (Out & In)
    stockTransfers.forEach((t) => {
      if (productId && t.productId !== productId) return;

      // Outgoing from this branch
      if (t.fromBranchId === targetBranchId) {
        list.push({
          id: `trf-out-${t.id}`,
          branchId: t.fromBranchId,
          productId: t.productId,
          productName: t.productName,
          sku: t.sku,
          type: 'transfer_out',
          typeLabel: `Transfer Keluar (ke ${t.toBranchName})`,
          quantityChange: -t.quantity,
          referenceNo: t.transferNo,
          notes: t.notes || `Kirim ke ${t.toBranchName}`,
          actorName: t.createdBy,
          timestamp: t.createdAt,
        });
      }

      // Incoming to this branch (if received)
      if (t.toBranchId === targetBranchId && t.status === 'received') {
        list.push({
          id: `trf-in-${t.id}`,
          branchId: t.toBranchId,
          productId: t.productId,
          productName: t.productName,
          sku: t.sku,
          type: 'transfer_in',
          typeLabel: `Transfer Masuk (dari ${t.fromBranchName})`,
          quantityChange: t.quantity,
          referenceNo: t.transferNo,
          notes: t.notes || `Penerimaan dari ${t.fromBranchName}`,
          actorName: t.receivedBy || 'Staff',
          timestamp: t.receivedAt || t.createdAt,
        });
      }
    });

    // 4. Bad Stock / Expired
    badStocks.forEach((b) => {
      if (b.branchId !== targetBranchId) return;
      if (productId && b.productId !== productId) return;
      list.push({
        id: `bad-${b.id}`,
        branchId: b.branchId,
        productId: b.productId,
        productName: b.productName,
        sku: b.sku,
        type: 'bad_stock',
        typeLabel: `Stok Buruk (${b.reason === 'expired' ? 'Kedaluwarsa' : 'Rusak'})`,
        quantityChange: -b.quantity,
        referenceNo: b.recordNo,
        notes: `${b.disposition === 'disposed' ? 'Dimusnahkan' : 'Retur Supplier'}. ${b.notes || ''}`,
        actorName: b.recordedBy,
        timestamp: b.createdAt,
      });
    });

    // Sort by timestamp descending
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  // Supplier WhatsApp notifications - extracted to src/context/slices/useSupplierNotificationSlice.ts
  const {
    supplierNotificationBatches,
    supplierDeliveryLogs,
    sendSupplierWhatsAppNotification,
    resendSupplierWhatsAppNotification,
    generateSupplierWhatsAppMessage,
  } = useSupplierNotificationSlice({
    currentUser,
    suppliers,
    orders,
    products,
    selectedBranch,
    addAudit,
  });

  // Branch-Filtered Data Views
  const branchProducts = products.filter((p) => !p.branchId || p.branchId === selectedBranchId);
  const branchRawMaterials = rawMaterials.filter((r) => !r.branchId || r.branchId === selectedBranchId);
  const branchCategories = categories.filter((c) => !c.branchId || c.branchId === selectedBranchId);
  const branchSuppliers = suppliers.filter((s) => !s.branchId || s.branchId === selectedBranchId);
  const branchCustomers = [
    DEFAULT_WALKIN_CUSTOMER,
    ...customers.filter((c) => c.id !== "cust-walkin" && (!c.branchId || c.branchId === selectedBranchId)),
  ];
  const branchOrders = orders.filter((o) => !o.branchId || o.branchId === selectedBranchId);
  const branchGoodsReceipts = goodsReceipts.filter((g) => !g.branchId || g.branchId === selectedBranchId);
  const branchCommissionLedger = commissionLedger.filter((c) => !c.branchId || c.branchId === selectedBranchId);
  const branchSettlementCycles = settlementCycles.filter((s) => !s.branchId || s.branchId === selectedBranchId);
  const branchAuditLogs = auditLogs.filter((a) => !a.branchId || a.branchId === selectedBranchId);
  const branchStockAdjustments = stockAdjustments.filter((a) => !a.branchId || a.branchId === selectedBranchId);
  const branchSetAsideOrders = setAsideOrders.filter((s) => !s.branchId || s.branchId === selectedBranchId);
  const branchCategoryClosings = categoryClosings.filter((c) => !c.branchId || c.branchId === selectedBranchId);
  const branchExpiryBatches = expiryBatches.filter((b) => !b.branchId || b.branchId === selectedBranchId);
  const branchStockTransfers = stockTransfers.filter(
    (t) => t.fromBranchId === selectedBranchId || t.toBranchId === selectedBranchId
  );
  const branchBadStocks = badStocks.filter((b) => !b.branchId || b.branchId === selectedBranchId);

  return (
    <POSContext.Provider
      value={{
        branches,
        selectedBranchId,
        selectedBranch,
        isBranchReadOnly,
        isStoreSelectionModalOpen,
        setIsStoreSelectionModalOpen,
        hasUnsavedChanges,
        setHasUnsavedChanges,
        confirmSwitchStore,
        requestSwitchBranch,
        confirmAndSwitchBranch,
        cancelSwitchBranch,
        selectBranch,
        addBranch,
        updateBranch,
        toggleBranchStatus,
        addUser,
        updateUser,
        toggleUserStatus,
        lang,
        setLang,
        soundEnabled,
        setSoundEnabled,
        currentUser,
        users,
        switchUser,
        verifySupervisorPin,
        currentSession,
        closedSessions,
        openSession,
        correctOpeningCash,
        handOffSession,
        closeSession,
        openSupportSessionCorrection,
        categories: branchCategories,
        addCategory,
        products: branchProducts,
        addProduct,
        updateProductInfo,
        manualAdjustStock,
        rawMaterials: branchRawMaterials,
        addRawMaterial,
        updateRawMaterial,
        deleteRawMaterial,
        categoryClosings: branchCategoryClosings,
        submitCategoryClosing,
        saveCategoryClosingDraft,
        expiryBatches: branchExpiryBatches,
        allExpiryBatches: expiryBatches,
        destroyExpiredBatches,
        stockTransfers: branchStockTransfers,
        createStockTransfer,
        receiveStockTransfer,
        badStocks: branchBadStocks,
        recordBadStock,
        getStockHistory,
        suppliers: branchSuppliers,
        addSupplier,
        updateSupplier,
        commissionLedger: branchCommissionLedger,
        settlementCycles: branchSettlementCycles,
        recordSettlementPayment,
        generateSettlementCycles,
        customers: branchCustomers,
        selectedCustomer,
        setSelectedCustomer,
        addCustomer,
        cart,
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        overrideItemPrice,
        applyItemDiscount,
        taxApplied,
        setTaxApplied,
        orderDiscountType,
        orderDiscountValue,
        orderDiscountReason,
        orderDiscountApprovedBy,
        applyOrderDiscount,
        removeOrderDiscount,
        cartSubtotal,
        cartTaxAmount,
        cartDiscountAmount,
        cartTotal,
        setAsideOrders: branchSetAsideOrders,
        holdCurrentOrder,
        resumeOrder,
        cancelHoldOrder,
        completeOrder,
        createMtoOrder,
        orders: branchOrders,
        settleMadeToOrder,
        updatePoPickupTime,
        updateOrderItemExpiryAndQty,
        settlePoPayment,
        markPoReadyForPickup,
        confirmPoPickup,
        cancelPoWithSupervisor,
        duplicatePoToCart,
        voidOrder,
        refundOrder,
        reprintReceipt,
        activeReceiptOrder,
        setActiveReceiptOrder,
        auditLogs: branchAuditLogs,
        stockAdjustments: branchStockAdjustments,
        goodsReceipts: branchGoodsReceipts,
        receivingDraft,
        setReceivingDraft,
        submitGoodsReceipt,
        supplierNotificationBatches,
        supplierDeliveryLogs,
        sendSupplierWhatsAppNotification,
        resendSupplierWhatsAppNotification,
        generateSupplierWhatsAppMessage,
        purchasePlans,
        addPurchasePlan,
        updatePurchasePlan,
        cancelPurchasePlan,
        lockPurchasePlanForReceipt,
        unlockPurchasePlanFromReceipt,
        masterCategories,
        addMasterCategory,
        updateMasterCategory,
        deleteMasterCategory,
      }}
    >
      {children}
    </POSContext.Provider>
  );
};

export const usePOS = (): POSContextType => {
  const ctx = useContext(POSContext);
  if (!ctx) {
    throw new Error('usePOS must be used within a POSProvider');
  }
  return ctx;
};
