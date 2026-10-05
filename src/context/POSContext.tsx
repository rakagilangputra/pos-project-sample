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
  PurchasePlanProductLine,
  PurchasePlanStatus,
  PurchasePlanItemType,
  MasterCategory,
  MasterCategoryType,
  RawMaterial,
  ProductExpiryBatch,
  GoodsReceiptItemBatch,
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
  STORE_INFO,
  INITIAL_GOODS_RECEIPTS,
  INITIAL_STOCK_TRANSFERS,
  INITIAL_BAD_STOCKS,
  INITIAL_CATEGORY_CLOSINGS,
  INITIAL_PURCHASE_PLANS,
  INITIAL_MASTER_CATEGORIES,
  INITIAL_RAW_MATERIALS,
  INITIAL_EXPIRY_BATCHES,
} from '../data/mockData';
import { generateReceiptNumber, generatePONumber, posSound } from '../utils/formatters';
import { usePreferencesSlice } from './slices/usePreferencesSlice';
import { useCatalogSlice } from './slices/useCatalogSlice';
import { useAuditSlice } from './slices/useAuditSlice';
import { useSupplierNotificationSlice } from './slices/useSupplierNotificationSlice';
import { useOrderSlice } from './slices/useOrderSlice';
import { useSessionSlice } from './slices/useSessionSlice';
import { useOrgActions, useOrgState } from './slices/useOrgSlice';

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

  // Purchase & Receiving (POS-US-059, POS-US-060, POS-US-061, POS-US-062)
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceiptRecord[]>(() => {
    const saved = localStorage.getItem('pos_goods_receipts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return INITIAL_GOODS_RECEIPTS;
  });

  useEffect(() => {
    localStorage.setItem('pos_goods_receipts', JSON.stringify(goodsReceipts));
  }, [goodsReceipts]);

  const [receivingDraft, setReceivingDraft] = useState<ReceivingDraft | null>(() => {
    const saved = localStorage.getItem('pos_receiving_draft');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return null;
  });

  useEffect(() => {
    if (receivingDraft) {
      localStorage.setItem('pos_receiving_draft', JSON.stringify(receivingDraft));
    } else {
      localStorage.removeItem('pos_receiving_draft');
    }
  }, [receivingDraft]);

  // POS-US-073, POS-US-074, POS-US-075: Rencana Pembelian (Owned Purchases Only)
  const [purchasePlans, setPurchasePlans] = useState<PurchasePlan[]>(() => {
    const saved = localStorage.getItem('pos_purchase_plans_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return INITIAL_PURCHASE_PLANS;
  });

  useEffect(() => {
    localStorage.setItem('pos_purchase_plans_v1', JSON.stringify(purchasePlans));
  }, [purchasePlans]);

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

  // Expiry Batches Tracking (FEFO & Daily Closing Expiry Reconciliation)
  const [expiryBatches, setExpiryBatches] = useState<ProductExpiryBatch[]>(() => {
    const saved = localStorage.getItem('pos_expiry_batches');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const initMap = new Map<string, ProductExpiryBatch>();
          for (const init of INITIAL_EXPIRY_BATCHES) {
            initMap.set(init.id, init);
          }
          const seen = new Set<string>();
          const result: ProductExpiryBatch[] = [];
          for (const b of parsed) {
            if (b && b.id && !seen.has(b.id)) {
              seen.add(b.id);
              const init = initMap.get(b.id);
              if (init) {
                result.push({
                  ...init,
                  remainingQuantity: b.status === 'destroyed' ? b.remainingQuantity : (b.remainingQuantity ?? init.remainingQuantity),
                  status: b.status || init.status,
                });
              } else {
                result.push(b);
              }
            }
          }
          // Ensure all initial demo batches (daily & multi_day) are present
          for (const init of INITIAL_EXPIRY_BATCHES) {
            if (!seen.has(init.id)) {
              seen.add(init.id);
              result.push(init);
            }
          }
          return result;
        }
      } catch (e) {
        console.error('Failed to parse pos_expiry_batches', e);
      }
    }
    return INITIAL_EXPIRY_BATCHES;
  });

  useEffect(() => {
    localStorage.setItem('pos_expiry_batches', JSON.stringify(expiryBatches));
  }, [expiryBatches]);

  // POS-US-070: Stock Transfers
  const [stockTransfers, setStockTransfers] = useState<StockTransferRecord[]>(() => {
    const saved = localStorage.getItem('pos_stock_transfers');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return INITIAL_STOCK_TRANSFERS;
  });

  useEffect(() => {
    localStorage.setItem('pos_stock_transfers', JSON.stringify(stockTransfers));
  }, [stockTransfers]);

  // POS-US-071: Bad Stock Records
  const [badStocks, setBadStocks] = useState<BadStockRecord[]>(() => {
    const saved = localStorage.getItem('pos_bad_stocks');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return INITIAL_BAD_STOCKS;
  });

  useEffect(() => {
    localStorage.setItem('pos_bad_stocks', JSON.stringify(badStocks));
  }, [badStocks]);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [taxApplied, setTaxApplied] = useState<boolean>(true); // 11% PPN on by default
  const [orderDiscountType, setOrderDiscountType] = useState<'percent' | 'fixed' | null>(null);
  const [orderDiscountValue, setOrderDiscountValue] = useState<number>(0);
  const [orderDiscountReason, setOrderDiscountReason] = useState<string>('');
  const [orderDiscountApprovedBy, setOrderDiscountApprovedBy] = useState<string | undefined>(undefined);

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

  // Cart Operations (POS-US-008, POS-US-009, POS-US-020)
  const addToCart = (product: Product, quantity = 1) => {
    if (!currentSession || currentSession.status !== 'active') {
      posSound.error();
      return { success: false, warning: 'Buka sesi kasir terlebih dahulu sebelum memulai transaksi!' };
    }

    let warning: string | undefined;
    if (product.stock <= 0) {
      warning = `Peringatan: Stok ${product.name} saat ini 0 (Habis). Anda tetap diizinkan menambahkan sesuai kebijakan toko.`;
    } else if (product.stock < product.lowStockThreshold) {
      warning = `Perhatian: Stok ${product.name} menipis (sisa ${product.stock}).`;
    }

    setCart((prev) => {
      const existing = prev.find(
        (item) => item.productId === product.id && !item.isPriceOverridden && !item.isMadeToOrder
      );
      if (existing) {
        return prev.map((item) =>
          item.id === existing.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      const newLine: CartItem = {
        id: 'line-' + Math.random().toString(36).slice(2, 9),
        productId: product.id,
        productName: product.name,
        category: product.category,
        unitPrice: product.price,
        originalPrice: product.price,
        isPriceOverridden: false,
        quantity,
        image: product.image,
        isMadeToOrder: product.isMadeToOrder,
        stockAvailable: product.stock,
        // Consignment snapshot (POS-US-031)
        ownershipType: product.ownershipType || 'own',
        supplierId: product.supplierId,
        supplierName: product.supplierName,
        commissionMethod: product.commissionMethod,
        commissionValue: product.commissionValue,
        commissionBasis: product.commissionBasis,
      };
      return [...prev, newLine];
    });

    posSound.beep();
    return { success: true, warning };
  };

  const updateCartQty = (lineId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(lineId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.id === lineId ? { ...item, quantity: qty } : item))
    );
    posSound.beep();
  };

  const removeFromCart = (lineId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== lineId));
    posSound.beep();
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(DEFAULT_WALKIN_CUSTOMER);
    setOrderDiscountType(null);
    setOrderDiscountValue(0);
    setOrderDiscountReason('');
    setOrderDiscountApprovedBy(undefined);
  };

  // Price Override on Cart Item (POS-US-009)
  const overrideItemPrice = (lineId: string, newPrice: number, reason: string) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === lineId) {
          addAudit(
            'PRICE_OVERRIDE',
            'price',
            item.productId,
            `Override harga ${item.productName}: Rp ${item.unitPrice.toLocaleString('id-ID')} -> Rp ${newPrice.toLocaleString('id-ID')}. Alasan: ${reason}`,
            String(item.unitPrice),
            String(newPrice)
          );
          return {
            ...item,
            unitPrice: Math.max(0, newPrice),
            isPriceOverridden: true,
            overrideReason: reason,
          };
        }
        return item;
      })
    );
    posSound.beep();
  };

  // Item Discount (POS-US-011)
  const applyItemDiscount = (lineId: string, percent: number, amount: number, reason: string) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === lineId) {
          return {
            ...item,
            itemDiscountPercent: percent,
            itemDiscountAmount: amount,
            itemDiscountReason: reason,
          };
        }
        return item;
      })
    );
    posSound.beep();
  };

  // Order Discount (POS-US-011)
  const applyOrderDiscount = (
    type: 'percent' | 'fixed',
    value: number,
    reason: string,
    approverName?: string
  ) => {
    setOrderDiscountType(type);
    setOrderDiscountValue(value);
    setOrderDiscountReason(reason);
    setOrderDiscountApprovedBy(approverName);
    addAudit(
      'ORDER_DISCOUNT_APPLIED',
      'discount',
      'active-cart',
      `Diskon ${type === 'percent' ? value + '%' : 'Rp ' + value.toLocaleString('id-ID')} diterapkan. Alasan: ${reason}. Otorisasi: ${approverName || currentUser.name}`
    );
    posSound.beep();
  };

  const removeOrderDiscount = () => {
    setOrderDiscountType(null);
    setOrderDiscountValue(0);
    setOrderDiscountReason('');
    setOrderDiscountApprovedBy(undefined);
  };

  // Computations
  const cartSubtotal = cart.reduce((sum, item) => {
    const itemBase = item.unitPrice * item.quantity;
    const itemDisc = item.itemDiscountAmount
      ? item.itemDiscountAmount * item.quantity
      : item.itemDiscountPercent
      ? (itemBase * item.itemDiscountPercent) / 100
      : 0;
    return sum + Math.max(0, itemBase - itemDisc);
  }, 0);

  let cartDiscountAmount = 0;
  if (orderDiscountType === 'percent') {
    cartDiscountAmount = (cartSubtotal * orderDiscountValue) / 100;
  } else if (orderDiscountType === 'fixed') {
    cartDiscountAmount = Math.min(cartSubtotal, orderDiscountValue);
  }

  const netAfterDiscount = Math.max(0, cartSubtotal - cartDiscountAmount);
  const cartTaxAmount = taxApplied ? Math.round(netAfterDiscount * STORE_INFO.taxRate) : 0;
  const cartTotal = netAfterDiscount + cartTaxAmount;

  // Hold / Set-Aside Order (POS-US-012)
  const holdCurrentOrder = (label?: string) => {
    if (cart.length === 0 || !currentSession) {
      posSound.error();
      return false;
    }
    const held: SetAsideOrder = {
      id: 'HOLD-' + Date.now().toString().slice(-6),
      sessionId: currentSession.id,
      customer: selectedCustomer,
      items: [...cart],
      subtotal: cartSubtotal,
      taxApplied,
      discountAmount: cartDiscountAmount,
      discountReason: orderDiscountReason,
      total: cartTotal,
      createdAt: new Date().toISOString(),
      label: label || `Parkir #${setAsideOrders.length + 1} - ${selectedCustomer.name}`,
    };
    setSetAsideOrders((prev) => [held, ...prev]);
    clearCart();
    addAudit('ORDER_SET_ASIDE', 'order', held.id, `Pesanan ditahan/parkir: ${held.label}`);
    posSound.beep();
    return true;
  };

  const resumeOrder = (id: string) => {
    const target = setAsideOrders.find((o) => o.id === id);
    if (!target) return;
    setCart(target.items);
    setSelectedCustomer(target.customer);
    setTaxApplied(target.taxApplied);
    if (target.discountAmount > 0) {
      setOrderDiscountType('fixed');
      setOrderDiscountValue(target.discountAmount);
      setOrderDiscountReason(target.discountReason || 'Diskon Dipulihkan');
    } else {
      removeOrderDiscount();
    }
    setSetAsideOrders((prev) => prev.filter((o) => o.id !== id));
    addAudit('ORDER_RESUMED', 'order', target.id, `Pesanan dilanjutkan dari parkir: ${target.label}`);
    posSound.beep();
  };

  const cancelHoldOrder = (id: string) => {
    const target = setAsideOrders.find((o) => o.id === id);
    setSetAsideOrders((prev) => prev.filter((o) => o.id !== id));
    if (target) {
      addAudit('ORDER_CANCEL_HOLD', 'order', target.id, `Pesanan parkir dibatalkan`);
    }
    posSound.beep();
  };

  // Complete Order / Process Payment (POS-US-013, POS-US-014, POS-US-015)
  const completeOrder = (
    payments: PaymentComponent[],
    options?: {
      isDeposit?: boolean;
      customizationNotes?: string;
      pickupDate?: string;
      pickupTime?: string;
      poNumber?: string;
    }
  ) => {
    if (cart.length === 0) {
      posSound.error();
      return { success: false, message: 'Keranjang belanja kosong' };
    }
    if (!currentSession || currentSession.status !== 'active') {
      posSound.error();
      return { success: false, message: 'Tidak ada sesi kasir yang aktif' };
    }

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const hasMadeToOrder = cart.some((i) => i.isMadeToOrder);
    const isDeposit = Boolean(options?.isDeposit);

    // Validation: Normal checkout requires full payment
    if (!isDeposit && !hasMadeToOrder && totalPaid < cartTotal) {
      posSound.error();
      return { success: false, message: 'Jumlah pembayaran belum mencukupi total belanja!' };
    }

    // MTO requires at least DP amount
    if (hasMadeToOrder && totalPaid <= 0) {
      posSound.error();
      return { success: false, message: 'Harap masukkan pembayaran DP atau Pelunasan!' };
    }

    const isPartial = totalPaid < cartTotal;
    const paymentStatus: Order['paymentStatus'] = isPartial ? 'partial' : 'paid';

    // Initial status for MTO: active (partially paid or paid)
    // Non-MTO: awaiting_settlement if partial, else completed
    const orderStatus: Order['orderStatus'] = hasMadeToOrder
      ? 'active'
      : isPartial
      ? 'awaiting_settlement'
      : 'completed';

    // Calculate cash change
    const cashComponent = payments.find((p) => p.method === 'cash');
    const change = cashComponent?.change || 0;

    const receiptNo = generateReceiptNumber();
    const branchName = branches.find((b) => b.id === selectedBranchId)?.name || 'Senopati Utama';
    const poNo = hasMadeToOrder
      ? options?.poNumber || generatePONumber(orders, branchName)
      : undefined;

    const newOrder: Order = {
      id: 'ORD-' + Date.now().toString().slice(-7),
      receiptNumber: receiptNo,
      poNumber: poNo,
      sessionId: currentSession.id,
      cashierId: currentUser.id,
      cashierName: currentUser.name,
      customer: selectedCustomer,
      items: [...cart],
      subtotal: cartSubtotal,
      taxApplied,
      taxRate: STORE_INFO.taxRate,
      taxAmount: cartTaxAmount,
      discountType: orderDiscountType || undefined,
      discountValue: orderDiscountValue,
      discountAmount: cartDiscountAmount,
      discountReason: orderDiscountReason,
      discountApprovedBy: orderDiscountApprovedBy,
      total: cartTotal,
      paidAmount: totalPaid,
      remainingBalance: Math.max(0, cartTotal - totalPaid),
      change,
      payments,
      paymentStatus,
      orderStatus,
      isMadeToOrder: hasMadeToOrder,
      customizationNotes: options?.customizationNotes,
      pickupDate: options?.pickupDate,
      pickupTime: options?.pickupTime,
      pickupTimeHistory: [],
      createdAt: new Date().toISOString(),
      reprintCount: 0,
    };

    // Deduct stock:
    // Ready Stock is deducted immediately upon completion.
    // Made-to-Order items are NEVER deducted at PO creation; stock deduction happens strictly at Konfirmasi Diambil!
    const nonMtoItems = cart.filter((item) => !item.isMadeToOrder);
    if (!isPartial && nonMtoItems.length > 0) {
      setProducts((prev) =>
        prev.map((prod) => {
          const cartItem = nonMtoItems.find((item) => item.productId === prod.id);
          if (cartItem) {
            return { ...prod, stock: Math.max(0, prod.stock - cartItem.quantity) };
          }
          return prod;
        })
      );

      // FEFO (First Expired, First Out) batch deduction:
      // Deducts automatically from active batches with the earliest expiry date first
      setExpiryBatches((prevBatches) => {
        let updatedBatches = [...prevBatches];
        nonMtoItems.forEach((cartItem) => {
          let needed = cartItem.quantity;
          const matchingBatches = updatedBatches
            .filter(
              (b) =>
                b.productId === cartItem.productId &&
                (!b.branchId || b.branchId === selectedBranchId) &&
                b.status === 'active' &&
                b.remainingQuantity > 0
            )
            .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

          for (const b of matchingBatches) {
            if (needed <= 0) break;
            const deduct = Math.min(b.remainingQuantity, needed);
            const newRemaining = b.remainingQuantity - deduct;
            needed -= deduct;

            updatedBatches = updatedBatches.map((orig) => {
              if (orig.id === b.id) {
                return {
                  ...orig,
                  remainingQuantity: newRemaining,
                  status: newRemaining === 0 ? 'exhausted' : 'active',
                };
              }
              return orig;
            });
          }
        });
        return updatedBatches;
      });
    }

    // Update customer deposit balance if paid by deposit account
    const depositPay = payments.find((p) => p.method === 'deposit');
    if (depositPay && depositPay.amount > 0) {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === selectedCustomer.id
            ? {
                ...c,
                depositBalance: Math.max(0, c.depositBalance - depositPay.amount),
                lastTransactionAt: new Date().toISOString(),
              }
            : c
        )
      );
    }

    // Update active cashier session totals
    const cashPortion = payments
      .filter((p) => p.method === 'cash')
      .reduce((sum, p) => sum + p.amount, 0);
    const qrisPortion = payments
      .filter((p) => p.method === 'qris')
      .reduce((sum, p) => sum + p.amount, 0);
    const depositPortion = payments
      .filter((p) => p.method === 'deposit')
      .reduce((sum, p) => sum + p.amount, 0);

    setCurrentSession((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        totalTransactions: prev.totalTransactions + 1,
        totalSales: prev.totalSales + totalPaid,
        cashSales: prev.cashSales + cashPortion,
        qrisSales: prev.qrisSales + qrisPortion,
        depositSales: prev.depositSales + depositPortion,
        expectedCash: prev.expectedCash + cashPortion,
        totalDiscounts: prev.totalDiscounts + cartDiscountAmount,
      };
    });

    setOrders((prev) => [newOrder, ...prev]);
    setActiveReceiptOrder(newOrder);

    // Record Consignment Commission Ledger Entries (POS-US-031)
    if (!isPartial) {
      const consignmentCartItems = cart.filter(
        (i) => i.ownershipType === 'consignment' && i.supplierId
      );

      if (consignmentCartItems.length > 0) {
        const newCommEntries: CommissionLedgerEntry[] = consignmentCartItems.map((item, idx) => {
          const gross = item.unitPrice * item.quantity;
          const lineItemDisc = item.itemDiscountAmount
            ? item.itemDiscountAmount * item.quantity
            : item.itemDiscountPercent
            ? Math.round((gross * item.itemDiscountPercent) / 100)
            : 0;

          const orderDiscPortion = cartSubtotal > 0
            ? Math.round((cartDiscountAmount * (gross - lineItemDisc)) / cartSubtotal)
            : 0;

          const allocatedDiscount = lineItemDisc + orderDiscPortion;
          const net = Math.max(0, gross - allocatedDiscount);

          let commAmount = 0;
          if (item.commissionMethod === 'fixed') {
            commAmount = Math.round((item.commissionValue || 0) * item.quantity);
          } else if (item.commissionMethod === 'percentage') {
            const basisAmount = item.commissionBasis === 'gross' ? gross : net;
            commAmount = Math.round((basisAmount * (item.commissionValue || 0)) / 100);
          }
          commAmount = Math.max(0, Math.min(commAmount, net));
          const storeNet = Math.max(0, net - commAmount);

          return {
            id: 'comm-' + Date.now().toString().slice(-6) + '-' + idx,
            orderId: newOrder.id,
            orderLineId: item.id,
            receiptNumber: newOrder.receiptNumber,
            productId: item.productId,
            productName: item.productName,
            supplierId: item.supplierId!,
            supplierName: item.supplierName || 'Supplier Konsinyasi',
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            grossAmount: gross,
            allocatedDiscount,
            netAmount: net,
            commissionMethod: item.commissionMethod || 'fixed',
            commissionValue: item.commissionValue || 0,
            commissionBasis: item.commissionBasis,
            commissionAmount: commAmount,
            storeNetAmount: storeNet,
            status: 'accrued',
            createdAt: new Date().toISOString(),
          };
        });

        setCommissionLedger((prev) => [...newCommEntries, ...prev]);
      }
    }

    addAudit(
      'ORDER_COMPLETE',
      'order',
      newOrder.id,
      `Transaksi Berhasil No. Struk: ${newOrder.receiptNumber} (${newOrder.customer.name}), Total: Rp ${cartTotal.toLocaleString('id-ID')}, Bayar: Rp ${totalPaid.toLocaleString('id-ID')}, Status: ${newOrder.orderStatus}`
    );

    posSound.cashRegister();
    clearCart();

    return { success: true, order: newOrder, message: 'Transaksi berhasil diselesaikan!' };
  };

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

  // Submit Goods Receipt (POS-US-059, POS-US-060, POS-US-061)
  const submitGoodsReceipt = (
    receiptData: Omit<GoodsReceiptRecord, 'id' | 'receiptNumber' | 'stockMovementRef' | 'createdAt' | 'status'>
  ) => {
    // 1. Validation
    if (!receiptData.supplierId) {
      posSound.error();
      return { success: false, message: 'Supplier mitra pengirim wajib dipilih!' };
    }
    if (!receiptData.items || receiptData.items.length === 0) {
      posSound.error();
      return { success: false, message: 'Minimal harus ada 1 baris item produk yang diterima!' };
    }
    for (const item of receiptData.items) {
      if (!item.productId) {
        posSound.error();
        return { success: false, message: 'Ada baris item yang belum memilih SKU produk!' };
      }
      if (!item.quantityReceived || item.quantityReceived <= 0) {
        posSound.error();
        return {
          success: false,
          message: `Jumlah stok jual diterima untuk "${item.productName || 'produk'}" harus lebih dari 0!`,
        };
      }
    }

    let safeTotalPurchaseCost = receiptData.totalPurchaseCost;
    let safePaymentMethod = receiptData.paymentMethod;

    if (receiptData.receiptType === 'Dibeli Sendiri') {
      if (
        safeTotalPurchaseCost === undefined ||
        safeTotalPurchaseCost === null ||
        isNaN(safeTotalPurchaseCost) ||
        safeTotalPurchaseCost < 0
      ) {
        // Auto-calculate from items if available, or fallback to 0
        safeTotalPurchaseCost = receiptData.items.reduce((sum, it) => {
          const price = it.actualBuyPrice ?? it.plannedBuyPrice ?? Math.round(it.sellingPrice * 0.6);
          return sum + (it.quantityReceived * price);
        }, 0);
      }
      if (!safePaymentMethod) {
        safePaymentMethod = 'transfer';
      }
    }

    // 2. Generate Receipt Number and Movement Reference
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const seq = String(goodsReceipts.length + 1).padStart(3, '0');
    const receiptNumber = `RCV-${dateStr}-${seq}`;
    const stockMovementRef = `MOV-IN-${receiptNumber}`;
    const id = `rec-${Date.now()}`;
    const totalQuantity = receiptData.items.reduce((sum, it) => sum + it.quantityReceived, 0);

    const newRecord: GoodsReceiptRecord = {
      ...receiptData,
      id,
      branchId: selectedBranchId,
      receiptNumber,
      totalQuantity,
      totalPurchaseCost: safeTotalPurchaseCost,
      paymentMethod: safePaymentMethod,
      status: 'submitted',
      stockMovementRef,
      submittedAt: now.toISOString(),
      createdAt: now.toISOString(),
    };

    // 3. Update stock for each product & raw material (added exactly once) and log stock movements
    const updatedProducts = [...products];
    const updatedRawMaterials = [...rawMaterials];
    const newStockAdjustments: StockAdjustmentRecord[] = [];

    receiptData.items.forEach((item) => {
      const pIdx = updatedProducts.findIndex((p) => p.id === item.productId);
      if (pIdx >= 0) {
        const prevStock = updatedProducts[pIdx].stock;
        const newStock = prevStock + item.quantityReceived;
        updatedProducts[pIdx] = {
          ...updatedProducts[pIdx],
          stock: newStock,
        };

        newStockAdjustments.push({
          id: `adj-rcv-${Date.now()}-${item.productId}`,
          productId: item.productId,
          productName: item.productName || updatedProducts[pIdx].name,
          type: 'increase',
          quantity: item.quantityReceived,
          previousStock: prevStock,
          resultingStock: newStock,
          reason: `Penerimaan Barang (${receiptData.receiptType}): ${receiptNumber} [Ref: ${stockMovementRef}]`,
          adminId: currentUser.id,
          adminName: currentUser.name,
          timestamp: now.toISOString(),
        });
      }

      const rIdx = updatedRawMaterials.findIndex((r) => r.id === item.productId);
      if (rIdx >= 0) {
        const prevStock = updatedRawMaterials[rIdx].stock;
        const newStock = prevStock + item.quantityReceived;
        updatedRawMaterials[rIdx] = {
          ...updatedRawMaterials[rIdx],
          stock: newStock,
        };

        newStockAdjustments.push({
          id: `adj-rcv-raw-${Date.now()}-${item.productId}`,
          productId: item.productId,
          productName: item.productName || updatedRawMaterials[rIdx].name,
          type: 'increase',
          quantity: item.quantityReceived,
          previousStock: prevStock,
          resultingStock: newStock,
          reason: `Penerimaan Bahan Baku (${receiptData.receiptType}): ${receiptNumber} [Ref: ${stockMovementRef}]`,
          adminId: currentUser.id,
          adminName: currentUser.name,
          timestamp: now.toISOString(),
        });
      }
    });

    setProducts(updatedProducts);
    setRawMaterials(updatedRawMaterials);
    setStockAdjustments((prev) => [...newStockAdjustments, ...prev]);
    setGoodsReceipts((prev) => [newRecord, ...prev]);

    // Generate and register Expiry Batches for saleable products
    const newBatches: ProductExpiryBatch[] = [];
    receiptData.items.forEach((item) => {
      const prod = updatedProducts.find((p) => p.id === item.productId);
      if (prod) {
        if (item.expiryBatches && item.expiryBatches.length > 0) {
          item.expiryBatches.forEach((b, bIdx) => {
            const batchQty = Number(b.quantity) || 0;
            if (batchQty > 0) {
              const expType = prod.expiryType || (b.expiryDate === (receiptData.arrivalDate || now.toISOString().slice(0, 10)) ? 'daily' : 'multi_day');
              newBatches.push({
                id: `batch-${Date.now()}-${item.productId}-${bIdx}-${Math.random().toString(36).slice(2, 6)}`,
                batchNumber: b.batchNumber || `BCH-${receiptNumber}-${bIdx + 1}`,
                productId: item.productId,
                productName: item.productName || prod.name,
                sku: item.productSku || prod.sku,
                branchId: selectedBranchId,
                branchName: selectedBranch.name,
                expiryType: expType,
                expiryDate: b.expiryDate || now.toISOString().slice(0, 10),
                initialQuantity: batchQty,
                remainingQuantity: batchQty,
                goodsReceiptId: id,
                goodsReceiptNumber: receiptNumber,
                receivedDate: receiptData.arrivalDate || now.toISOString().slice(0, 10),
                unitCost: item.actualBuyPrice || item.buyPrice || 0,
                ownershipType: prod.ownershipType || (receiptData.receiptType === 'Konsinyasi' ? 'consignment' : 'owned'),
                supplierId: receiptData.supplierId,
                supplierName: receiptData.supplierName,
                category: prod.category,
                status: 'active',
                notes: b.notes || (expType === 'daily' ? 'Batch Expired Harian' : 'Batch Expired Multi-Hari'),
                createdAt: now.toISOString(),
              });
            }
          });
        } else if (item.quantityReceived > 0) {
          const expType = prod.expiryType || 'daily';
          const defaultExp = expType === 'daily'
            ? (receiptData.arrivalDate || now.toISOString().slice(0, 10))
            : new Date(Date.now() + (prod.shelfLifeDays || 7) * 86400000).toISOString().slice(0, 10);
          newBatches.push({
            id: `batch-${Date.now()}-${item.productId}-0-${Math.random().toString(36).slice(2, 6)}`,
            batchNumber: `BCH-${receiptNumber}-1`,
            productId: item.productId,
            productName: item.productName || prod.name,
            sku: item.productSku || prod.sku,
            branchId: selectedBranchId,
            branchName: selectedBranch.name,
            expiryType: expType,
            expiryDate: defaultExp,
            initialQuantity: item.quantityReceived,
            remainingQuantity: item.quantityReceived,
            goodsReceiptId: id,
            goodsReceiptNumber: receiptNumber,
            receivedDate: receiptData.arrivalDate || now.toISOString().slice(0, 10),
            unitCost: item.actualBuyPrice || item.buyPrice || 0,
            ownershipType: prod.ownershipType || (receiptData.receiptType === 'Konsinyasi' ? 'consignment' : 'owned'),
            supplierId: receiptData.supplierId,
            supplierName: receiptData.supplierName,
            category: prod.category,
            status: 'active',
            notes: expType === 'daily' ? 'Batch Expired Harian' : 'Batch Expired Multi-Hari',
            createdAt: now.toISOString(),
          });
        }
      }
    });

    if (newBatches.length > 0) {
      setExpiryBatches((prev) => [...newBatches, ...prev]);
    }

    // 4. Atomically realize linked purchase plan (POS-US-075)
    if (receiptData.purchasePlanId) {
      setPurchasePlans((prevPlans) =>
        prevPlans.map((p) => {
          if (p.id === receiptData.purchasePlanId) {
            return {
              ...p,
              status: 'Terealisasi',
              linkedReceiptId: id,
              linkedReceiptNumber: receiptNumber,
              updatedAt: now.toISOString(),
              updatedBy: currentUser.id,
              updatedByName: `${currentUser.name} (${currentUser.role})`,
            };
          }
          return p;
        })
      );
      addAudit(
        'REALISASI_RENCANA_PEMBELIAN',
        'purchase_plan',
        receiptData.purchasePlanId,
        `Realisasi Rencana Pembelian ${receiptData.purchasePlanId} berhasil melalui Bukti Penerimaan ${receiptNumber} [Ref: ${stockMovementRef}]`
      );
    }

    // 5. Log audit trail
    addAudit(
      'SUBMIT_GOODS_RECEIPT',
      'receipt',
      receiptNumber,
      `Penerimaan Barang ${receiptNumber} (${receiptData.receiptType}) dari ${receiptData.supplierName}: ${totalQuantity} pcs masuk stok jual. Ref: ${stockMovementRef}`
    );

    // 6. Sound & Clear Draft
    posSound.cashRegister();
    setReceivingDraft(null);

    return {
      success: true,
      receipt: newRecord,
      message: `Penerimaan barang ${receiptNumber} berhasil disimpan! ${totalQuantity} pcs telah ditambahkan ke stok jual.`,
    };
  };

  // =========================================================================
  // POS-US-073, POS-US-074, POS-US-075: RENCANA PEMBELIAN (PURCHASE PLANNING)
  // Superadmin Only - Owned Purchases Only - No stock edits in this module
  // =========================================================================

  // Create Purchase Plan (Superadmin Only)
  const addPurchasePlan = (data: {
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
  }) => {
    // 1. Permission check
    if (currentUser.role !== 'admin') {
      posSound.error();
      return { success: false, message: 'Hanya Superadmin yang berhak membuat Rencana Pembelian!' };
    }

    // 2. Validate Branch
    const targetBranch = branches.find((b) => b.id === data.branchId);
    if (!targetBranch || targetBranch.status === 'inactive') {
      posSound.error();
      return { success: false, message: 'Cabang aktif wajib dipilih sebelum membuat rencana pembelian!' };
    }

    // 3. Validate Plan Name
    if (!data.namaRencana || !data.namaRencana.trim()) {
      posSound.error();
      return { success: false, message: 'Nama Rencana Pembelian wajib diisi!' };
    }

    // 4. Validate Supplier (fallback to Multi-Sumber if not specified or 'multi')
    const targetSupplier = (data.supplierId && data.supplierId !== 'multi'
      ? suppliers.find((s) => s.id === data.supplierId)
      : null) || {
      id: 'multi',
      name: 'Multi-Sumber / Terpadu',
      category: 'Campuran (In-House, Konsinyasi & Pembelian Langsung)',
    };

    // 5. Validate Product Lines
    if (!data.lines || data.lines.length === 0) {
      posSound.error();
      return { success: false, message: 'Minimal harus ada 1 baris item produk dalam rencana pembelian!' };
    }

    // Allow multiple lines if itemType or sourcePoRef differs, or aggregate
    const formattedLines: PurchasePlanProductLine[] = [];

    for (let i = 0; i < data.lines.length; i++) {
      const line = data.lines[i];
      if (!line.productId) {
        posSound.error();
        return { success: false, message: `Baris #${i + 1} belum memilih produk!` };
      }

      const prod = products.find((p) => p.id === line.productId);
      if (!prod) {
        posSound.error();
        return { success: false, message: `Produk pada baris #${i + 1} tidak ditemukan!` };
      }

      const qty = Math.floor(Number(line.plannedQuantity));
      if (isNaN(qty) || qty <= 0) {
        posSound.error();
        return {
          success: false,
          message: `Jumlah rencana beli untuk "${prod.name}" harus berupa angka bulat positif (minimal 1)!`,
        };
      }

      const price = Math.max(0, Number(line.plannedBuyPrice) || 0);
      const lineTotal = qty * price;

      // Determine itemType fallback
      let itemType: PurchasePlanItemType = line.itemType || 'direct_purchase';
      if (!line.itemType) {
        if (prod.ownershipType === 'consignment' || (prod.supplierId && prod.supplierId !== 'internal')) {
          itemType = 'consignment';
        } else if (prod.isMadeToOrder) {
          itemType = 'in_house';
        } else {
          itemType = 'direct_purchase';
        }
      }

      const lineSupplier = line.supplierId
        ? suppliers.find((s) => s.id === line.supplierId)
        : (prod.supplierId ? suppliers.find((s) => s.id === prod.supplierId) : undefined);

      formattedLines.push({
        id: `rpl-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        productId: prod.id,
        productSku: prod.sku,
        productName: prod.name,
        category: prod.categoryLabel || prod.category || 'Umum',
        plannedQuantity: qty,
        plannedBuyPrice: price,
        lineTotal,
        itemType,
        sourcePoRef: line.sourcePoRef,
        supplierId: lineSupplier?.id || line.supplierId,
        supplierName: lineSupplier?.name || line.supplierName,
        notes: line.notes,
      });
    }

    // 6. Calculate total planned value
    const totalPlannedValue = formattedLines.reduce((sum, l) => sum + l.lineTotal, 0);

    // 7. Generate ID format: RP-{BRANCHCODE}-{YYYYMM}-{NNNN}
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const cleanBranchCode = (targetBranch.code || 'CAB01').replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'CAB01';
    const prefix = `RP-${cleanBranchCode}-${yearMonth}-`;

    let maxSeq = 0;
    purchasePlans.forEach((p) => {
      if (p.id.startsWith(prefix)) {
        const seqStr = p.id.replace(prefix, '');
        const num = parseInt(seqStr, 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    });
    const seq = String(maxSeq + 1).padStart(4, '0');
    const planId = `${prefix}${seq}`;

    // 8. Create Plan object (DO NOT ADD OR EDIT STOCK QUANTITY HERE)
    const newPlan: PurchasePlan = {
      id: planId,
      namaRencana: data.namaRencana.trim(),
      branchId: targetBranch.id,
      branchCode: targetBranch.code,
      branchName: targetBranch.name,
      supplierId: targetSupplier.id,
      supplierName: targetSupplier.name,
      supplierCategory: targetSupplier.category || 'Umum',
      lines: formattedLines,
      totalPlannedValue,
      status: 'Direncanakan',
      notes: data.notes?.trim() || undefined,
      sourceOrderIds: data.sourceOrderIds,
      attachedPoNumbers: data.attachedPoNumbers,
      createdBy: currentUser.id,
      createdByName: `${currentUser.name} (${currentUser.role})`,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    setPurchasePlans((prev) => [newPlan, ...prev]);

    // 9. Audit log
    addAudit(
      'CREATE_PURCHASE_PLAN',
      'purchase_plan',
      planId,
      `Superadmin ${currentUser.name} membuat Rencana Pembelian ${planId} (${newPlan.namaRencana}) di ${targetBranch.name} untuk supplier ${targetSupplier.name} senilai Rp ${totalPlannedValue.toLocaleString('id-ID')}`
    );

    posSound.cashRegister();
    return {
      success: true,
      plan: newPlan,
      message: `Rencana Pembelian ${planId} berhasil disimpan dengan status Direncanakan!`,
    };
  };

  // Edit Purchase Plan (Superadmin Only, Only 'Direncanakan', Branch is IMMUTABLE)
  const updatePurchasePlan = (
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
  ) => {
    if (currentUser.role !== 'admin') {
      posSound.error();
      return { success: false, message: 'Hanya Superadmin yang berhak mengubah Rencana Pembelian!' };
    }

    const targetPlan = purchasePlans.find((p) => p.id === id);
    if (!targetPlan) {
      posSound.error();
      return { success: false, message: 'Rencana Pembelian tidak ditemukan!' };
    }

    if (targetPlan.status !== 'Direncanakan') {
      posSound.error();
      return {
        success: false,
        message: `Rencana Pembelian ${id} berstatus "${targetPlan.status}" dan tidak dapat diubah lagi!`,
      };
    }

    let updatedSupplierId = targetPlan.supplierId;
    let updatedSupplierName = targetPlan.supplierName;
    let updatedSupplierCategory = targetPlan.supplierCategory;

    if (data.supplierId && data.supplierId !== targetPlan.supplierId) {
      if (data.supplierId === 'multi') {
        updatedSupplierId = 'multi';
        updatedSupplierName = 'Multi-Sumber / Terpadu';
        updatedSupplierCategory = 'Campuran (In-House, Konsinyasi & Pembelian Langsung)';
      } else {
        const sup = suppliers.find((s) => s.id === data.supplierId);
        if (sup) {
          updatedSupplierId = sup.id;
          updatedSupplierName = sup.name;
          updatedSupplierCategory = sup.category || 'Umum';
        }
      }
    }

    let updatedLines = targetPlan.lines;
    if (data.lines) {
      if (data.lines.length === 0) {
        posSound.error();
        return { success: false, message: 'Minimal harus ada 1 baris item produk dalam rencana pembelian!' };
      }
      const formattedLines: PurchasePlanProductLine[] = [];

      for (let i = 0; i < data.lines.length; i++) {
        const line = data.lines[i];
        const prod = products.find((p) => p.id === line.productId);
        if (!prod) {
          posSound.error();
          return { success: false, message: `Produk pada baris #${i + 1} tidak ditemukan!` };
        }

        const qty = Math.floor(Number(line.plannedQuantity));
        if (isNaN(qty) || qty <= 0) {
          posSound.error();
          return {
            success: false,
            message: `Jumlah rencana beli untuk "${prod.name}" harus berupa angka bulat positif (minimal 1)!`,
          };
        }

        const price = Math.max(0, Number(line.plannedBuyPrice) || 0);
        const lineTotal = qty * price;

        let itemType: PurchasePlanItemType = line.itemType || 'direct_purchase';
        if (!line.itemType) {
          if (prod.ownershipType === 'consignment' || (prod.supplierId && prod.supplierId !== 'internal')) {
            itemType = 'consignment';
          } else if (prod.isMadeToOrder) {
            itemType = 'in_house';
          } else {
            itemType = 'direct_purchase';
          }
        }

        const lineSupplier = line.supplierId
          ? suppliers.find((s) => s.id === line.supplierId)
          : (prod.supplierId ? suppliers.find((s) => s.id === prod.supplierId) : undefined);

        formattedLines.push({
          id: `rpl-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
          productId: prod.id,
          productSku: prod.sku,
          productName: prod.name,
          category: prod.categoryLabel || prod.category || 'Umum',
          plannedQuantity: qty,
          plannedBuyPrice: price,
          lineTotal,
          itemType,
          sourcePoRef: line.sourcePoRef,
          supplierId: lineSupplier?.id || line.supplierId,
          supplierName: lineSupplier?.name || line.supplierName,
          notes: line.notes,
        });
      }
      updatedLines = formattedLines;
    }

    const totalPlannedValue = updatedLines.reduce((sum, l) => sum + l.lineTotal, 0);
    const now = new Date();

    const updatedPlan: PurchasePlan = {
      ...targetPlan,
      namaRencana: data.namaRencana !== undefined ? data.namaRencana.trim() : targetPlan.namaRencana,
      supplierId: updatedSupplierId,
      supplierName: updatedSupplierName,
      supplierCategory: updatedSupplierCategory,
      lines: updatedLines,
      totalPlannedValue,
      notes: data.notes !== undefined ? data.notes.trim() : targetPlan.notes,
      sourceOrderIds: data.sourceOrderIds !== undefined ? data.sourceOrderIds : targetPlan.sourceOrderIds,
      attachedPoNumbers: data.attachedPoNumbers !== undefined ? data.attachedPoNumbers : targetPlan.attachedPoNumbers,
      updatedAt: now.toISOString(),
      updatedBy: currentUser.id,
      updatedByName: `${currentUser.name} (${currentUser.role})`,
    };

    setPurchasePlans((prev) => prev.map((p) => (p.id === id ? updatedPlan : p)));

    addAudit(
      'UPDATE_PURCHASE_PLAN',
      'purchase_plan',
      id,
      `Superadmin ${currentUser.name} memperbarui Rencana Pembelian ${id} (Total Rencana: Rp ${totalPlannedValue.toLocaleString('id-ID')})`
    );

    posSound.beep();
    return {
      success: true,
      plan: updatedPlan,
      message: `Rencana Pembelian ${id} berhasil diperbarui!`,
    };
  };

  // Cancel Purchase Plan (Superadmin Only, Only 'Direncanakan')
  const cancelPurchasePlan = (id: string, reason?: string) => {
    if (currentUser.role !== 'admin') {
      posSound.error();
      return { success: false, message: 'Hanya Superadmin yang berhak membatalkan Rencana Pembelian!' };
    }

    const targetPlan = purchasePlans.find((p) => p.id === id);
    if (!targetPlan) {
      posSound.error();
      return { success: false, message: 'Rencana Pembelian tidak ditemukan!' };
    }

    if (targetPlan.status !== 'Direncanakan') {
      posSound.error();
      return {
        success: false,
        message: `Rencana Pembelian ${id} tidak dapat dibatalkan karena berstatus "${targetPlan.status}"!`,
      };
    }

    const now = new Date();
    setPurchasePlans((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        return {
          ...p,
          status: 'Dibatalkan',
          notes: reason ? `${p.notes ? p.notes + ' | ' : ''}Alasan Batal: ${reason}` : p.notes,
          updatedAt: now.toISOString(),
          updatedBy: currentUser.id,
          updatedByName: `${currentUser.name} (${currentUser.role})`,
        };
      })
    );

    addAudit(
      'CANCEL_PURCHASE_PLAN',
      'purchase_plan',
      id,
      `Superadmin ${currentUser.name} membatalkan Rencana Pembelian ${id}. ${reason ? 'Alasan: ' + reason : ''}`
    );

    posSound.beep();
    return {
      success: true,
      message: `Rencana Pembelian ${id} berhasil dibatalkan!`,
    };
  };

  // Lock Purchase Plan for Goods Receipt draft
  const lockPurchasePlanForReceipt = (id: string) => {
    const targetPlan = purchasePlans.find((p) => p.id === id);
    if (!targetPlan) {
      return { success: false, message: 'Rencana Pembelian tidak ditemukan!' };
    }
    if (targetPlan.status !== 'Direncanakan') {
      return {
        success: false,
        message: `Rencana Pembelian ${id} tidak tersedia (status: ${targetPlan.status}).`,
      };
    }

    const now = new Date();
    setPurchasePlans((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'Terkait Penerimaan', updatedAt: now.toISOString() } : p))
    );

    return { success: true, message: 'Rencana Pembelian dikunci untuk proses penerimaan barang.' };
  };

  // Unlock Purchase Plan if Goods Receipt draft is discarded
  const unlockPurchasePlanFromReceipt = (id: string) => {
    const targetPlan = purchasePlans.find((p) => p.id === id);
    if (targetPlan && targetPlan.status === 'Terkait Penerimaan') {
      const now = new Date();
      setPurchasePlans((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: 'Direncanakan', updatedAt: now.toISOString() } : p))
      );
    }
    return { success: true, message: 'Rencana Pembelian dikembalikan ke status Direncanakan.' };
  };

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

  // POS-US-070: Stock Transfers
  const createStockTransfer = (data: {
    fromBranchId: string;
    toBranchId: string;
    productId: string;
    quantity: number;
    notes?: string;
  }) => {
    if (isBranchReadOnly || selectedBranch.status === 'inactive') {
      posSound.error();
      return { success: false, message: 'Cabang nonaktif tidak dapat membuat transfer stok.' };
    }
    if (data.fromBranchId === data.toBranchId) {
      posSound.error();
      return { success: false, message: 'Cabang tujuan harus berbeda dari cabang asal.' };
    }
    if (data.quantity <= 0) {
      posSound.error();
      return { success: false, message: 'Jumlah transfer harus lebih dari 0.' };
    }

    const sourceProduct = products.find((p) => p.id === data.productId);
    if (!sourceProduct) return { success: false, message: 'Produk tidak ditemukan.' };
    if (sourceProduct.stock < data.quantity) {
      posSound.error();
      return { success: false, message: `Stok tidak mencukupi! Stok saat ini: ${sourceProduct.stock}` };
    }

    const fromBranch = branches.find((b) => b.id === data.fromBranchId);
    const toBranch = branches.find((b) => b.id === data.toBranchId);

    // Deduct stock from source product
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === data.productId) {
          return { ...p, stock: p.stock - data.quantity };
        }
        // In destination branch, mark inTransitStock
        if (p.branchId === data.toBranchId && (p.sku === sourceProduct.sku || p.name === sourceProduct.name)) {
          return { ...p, inTransitStock: (p.inTransitStock || 0) + data.quantity };
        }
        return p;
      })
    );

    const transferNo = `TRF-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;
    const newRecord: StockTransferRecord = {
      id: 'trf-' + Date.now().toString(),
      transferNo,
      fromBranchId: data.fromBranchId,
      fromBranchName: fromBranch?.name || 'Cabang Asal',
      toBranchId: data.toBranchId,
      toBranchName: toBranch?.name || 'Cabang Tujuan',
      productId: sourceProduct.id,
      productName: sourceProduct.name,
      sku: sourceProduct.sku,
      quantity: data.quantity,
      status: 'in_transit',
      notes: data.notes,
      createdBy: `${currentUser.name} (${currentUser.role})`,
      createdAt: new Date().toISOString(),
    };

    setStockTransfers((prev) => [newRecord, ...prev]);

    addAudit(
      'STOCK_TRANSFER_SEND',
      'stock',
      newRecord.id,
      `Transfer ${data.quantity} pcs ${sourceProduct.name} dari ${fromBranch?.name} ke ${toBranch?.name} (${transferNo}) dibuat oleh ${currentUser.name}`
    );

    posSound.beep();
    return { success: true, message: `Transfer ${transferNo} berhasil dibuat (${data.quantity} pcs dalam pengiriman).` };
  };

  const receiveStockTransfer = (transferId: string) => {
    if (isBranchReadOnly || selectedBranch.status === 'inactive') {
      posSound.error();
      return { success: false, message: 'Cabang nonaktif tidak dapat menerima transfer stok.' };
    }

    const trf = stockTransfers.find((t) => t.id === transferId);
    if (!trf) return { success: false, message: 'Data transfer tidak ditemukan.' };
    if (trf.status !== 'in_transit') return { success: false, message: 'Transfer sudah diproses sebelumnya.' };

    // Increase target branch sellable stock & decrease in-transit
    setProducts((prev) =>
      prev.map((p) => {
        if (p.branchId === trf.toBranchId && (p.sku === trf.sku || p.name === trf.productName)) {
          return {
            ...p,
            stock: p.stock + trf.quantity,
            inTransitStock: Math.max(0, (p.inTransitStock || 0) - trf.quantity),
          };
        }
        return p;
      })
    );

    setStockTransfers((prev) =>
      prev.map((t) =>
        t.id === transferId
          ? {
              ...t,
              status: 'received',
              receivedAt: new Date().toISOString(),
              receivedBy: `${currentUser.name} (${currentUser.role})`,
            }
          : t
      )
    );

    addAudit(
      'STOCK_TRANSFER_RECEIVE',
      'stock',
      transferId,
      `Penerimaan transfer ${trf.transferNo} (${trf.quantity} pcs ${trf.productName}) di ${trf.toBranchName} oleh ${currentUser.name}`
    );

    posSound.beep();
    return { success: true, message: `Transfer ${trf.transferNo} berhasil diterima! Stok siap jual bertambah ${trf.quantity} pcs.` };
  };

  // POS-US-071: Record Bad Stock
  const recordBadStock = (data: {
    branchId: string;
    productId: string;
    quantity: number;
    reason: any;
    disposition: any;
    notes?: string;
  }) => {
    if (isBranchReadOnly || selectedBranch.status === 'inactive') {
      posSound.error();
      return { success: false, message: 'Cabang nonaktif tidak dapat mencatat stok buruk.' };
    }
    if (data.quantity <= 0) {
      posSound.error();
      return { success: false, message: 'Jumlah stok buruk harus lebih dari 0.' };
    }

    const target = products.find((p) => p.id === data.productId);
    if (!target) return { success: false, message: 'Produk tidak ditemukan.' };
    if (target.stock < data.quantity) {
      posSound.error();
      return { success: false, message: `Stok tidak mencukupi! Stok saat ini: ${target.stock}` };
    }

    // Deduct sellable stock & add to badStock
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === data.productId) {
          return {
            ...p,
            stock: p.stock - data.quantity,
            badStock: (p.badStock || 0) + data.quantity,
          };
        }
        return p;
      })
    );

    const recordNo = `BAD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;
    const newRecord: BadStockRecord = {
      id: 'bad-' + Date.now().toString(),
      recordNo,
      branchId: data.branchId,
      productId: target.id,
      productName: target.name,
      sku: target.sku,
      quantity: data.quantity,
      reason: data.reason,
      disposition: data.disposition,
      notes: data.notes,
      recordedBy: `${currentUser.name} (${currentUser.role})`,
      createdAt: new Date().toISOString(),
    };

    setBadStocks((prev) => [newRecord, ...prev]);

    addAudit(
      'STOCK_BAD_RECORD',
      'stock',
      newRecord.id,
      `Pencatatan stok buruk/kadaluwarsa (${recordNo}): ${data.quantity} pcs ${target.name}. Alasan: ${data.reason}. Tindakan: ${data.disposition}`
    );

    posSound.beep();
    return { success: true, message: `Stok buruk ${recordNo} (${data.quantity} pcs) berhasil dicatat dan dipotong dari stok jual.` };
  };

  // Expiry Reconciliation & Stock Destruction Trigger (Requirement: Superadmin Only with Audit Log)
  const destroyExpiredBatches = (batchIds: string[], reasonNote?: string) => {
    if (currentUser.role !== 'admin' && (currentUser.role as string) !== 'superadmin') {
      posSound.error();
      return {
        success: false,
        message: 'Akses Ditolak: Otorisasi pemusnahan stok kadaluwarsa hanya dapat dilakukan oleh Admin / Superadmin.',
      };
    }

    if (isBranchReadOnly || selectedBranch.status === 'inactive') {
      posSound.error();
      return { success: false, message: 'Cabang nonaktif tidak dapat melakukan pemusnahan stok!' };
    }

    const targetBatches = expiryBatches.filter(
      (b) => batchIds.includes(b.id) && b.status === 'active' && b.remainingQuantity > 0
    );

    if (targetBatches.length === 0) {
      posSound.error();
      return { success: false, message: 'Tidak ada batch stok aktif yang dipilih untuk dimusnahkan.' };
    }

    const now = new Date();
    const nowStr = now.toISOString();
    const dateCode = nowStr.slice(0, 10).replace(/-/g, '');
    const destructionRecordNo = `DST-EXP-${dateCode}-${Date.now().toString().slice(-4)}`;

    const updatedProducts = [...products];
    const newBadStockRecords: BadStockRecord[] = [];
    const newAdjustments: StockAdjustmentRecord[] = [];
    let totalPcs = 0;

    targetBatches.forEach((batch) => {
      const qty = batch.remainingQuantity;
      totalPcs += qty;

      const pIdx = updatedProducts.findIndex((p) => p.id === batch.productId);
      if (pIdx >= 0) {
        const prevStock = updatedProducts[pIdx].stock;
        const newStock = Math.max(0, prevStock - qty);
        updatedProducts[pIdx] = {
          ...updatedProducts[pIdx],
          stock: newStock,
          badStock: (updatedProducts[pIdx].badStock || 0) + qty,
        };

        newAdjustments.push({
          id: `adj-dst-${Date.now()}-${batch.id}`,
          productId: batch.productId,
          productName: batch.productName,
          type: 'decrease',
          quantity: qty,
          previousStock: prevStock,
          resultingStock: newStock,
          reason: `Pemusnahan Kadaluwarsa [${destructionRecordNo}] - Batch No: ${batch.batchNumber || batch.id} (Exp: ${batch.expiryDate})`,
          adminId: currentUser.id,
          adminName: currentUser.name,
          timestamp: nowStr,
        });
      }

      newBadStockRecords.push({
        id: `bad-${Date.now()}-${batch.id}`,
        recordNo: `${destructionRecordNo}-${batch.id.slice(-4)}`,
        branchId: batch.branchId || selectedBranchId,
        productId: batch.productId,
        productName: batch.productName,
        sku: batch.sku,
        quantity: qty,
        reason: 'expired',
        disposition: 'disposed',
        notes: reasonNote || `Pemusnahan stok kadaluwarsa (Batch Exp: ${batch.expiryDate}) pada Closing Harian. Asal Penerimaan: ${batch.goodsReceiptNumber || '-'}`,
        recordedBy: `${currentUser.name} (Superadmin)`,
        createdAt: nowStr,
      });
    });

    // Mark batches as destroyed
    setExpiryBatches((prev) =>
      prev.map((b) => {
        if (batchIds.includes(b.id)) {
          return {
            ...b,
            status: 'destroyed',
            remainingQuantity: 0,
            destroyedAt: nowStr,
            destroyedBy: `${currentUser.name} (Superadmin)`,
            destructionRecordNo,
            notes: reasonNote ? `${b.notes ? b.notes + ' | ' : ''}${reasonNote}` : b.notes,
          };
        }
        return b;
      })
    );

    setProducts(updatedProducts);
    setBadStocks((prev) => [...newBadStockRecords, ...prev]);
    setStockAdjustments((prev) => [...newAdjustments, ...prev]);

    // Requirement 6: Audit log
    addAudit(
      'STOCK_DESTROY_EXPIRED',
      'stock',
      destructionRecordNo,
      `Pemusnahan Stok Kadaluwarsa Berita Acara ${destructionRecordNo}: ${totalPcs} pcs (${targetBatches.length} batch) dieksekusi oleh Superadmin ${currentUser.name} pada cabang ${selectedBranch.name}.`
    );

    posSound.beep();
    return {
      success: true,
      recordNo: destructionRecordNo,
      totalPcs,
      totalBatches: targetBatches.length,
      message: `Pemusnahan ${totalPcs} pcs stok kadaluwarsa (${targetBatches.length} batch) berhasil dieksekusi oleh Superadmin dan dicatat ke Audit Log & Waste History (${destructionRecordNo}).`,
    };
  };

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
