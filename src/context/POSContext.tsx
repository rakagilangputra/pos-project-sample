import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
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
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_CUSTOMERS,
  DEFAULT_WALKIN_CUSTOMER,
  INITIAL_PRODUCTS,
  INITIAL_CATEGORIES,
  INITIAL_SUPPLIERS,
  INITIAL_COMMISSION_LEDGER,
  INITIAL_SETTLEMENT_CYCLES,
  INITIAL_ORDERS,
  STORE_INFO,
  INITIAL_GOODS_RECEIPTS,
} from '../data/mockData';
import { generateReceiptNumber, posSound } from '../utils/formatters';

interface POSContextType {
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

  // Product Master (POS-US-029)
  products: Product[];
  addProduct: (productData: Omit<Product, 'id'>) => { success: boolean; product?: Product; message: string };
  manualAdjustStock: (
    productId: string,
    type: 'increase' | 'decrease',
    quantity: number,
    reason: string
  ) => { success: boolean; message: string };

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
    productId: string;
    quantity: number;
    customPrice?: number;
    customer: Customer;
    pickupDate: string;
    pickupTime: string;
    customizationNotes: string;
    payments: PaymentComponent[];
  }) => { success: boolean; order?: Order; message: string };
  orders: Order[];
  settleMadeToOrder: (orderId: string, payment: PaymentComponent) => { success: boolean; message: string };
  updatePoPickupTime: (orderId: string, newTime: string) => { success: boolean; message: string };
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
}

const POSContext = createContext<POSContextType | undefined>(undefined);

export const POSProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Locale & Sound
  const [lang, setLang] = useState<'id' | 'en'>(() => {
    return (localStorage.getItem('pos_lang') as 'id' | 'en') || 'id';
  });
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('pos_sound') !== 'false';
  });

  useEffect(() => {
    localStorage.setItem('pos_lang', lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('pos_sound', String(soundEnabled));
    posSound.enabled = soundEnabled;
  }, [soundEnabled]);

  // Users & Auth
  const [users] = useState<User[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const saved = localStorage.getItem('pos_current_user');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return INITIAL_USERS[0]; // Rina Kartika (Kasir)
  });

  useEffect(() => {
    localStorage.setItem('pos_current_user', JSON.stringify(currentUser));
  }, [currentUser]);

  // Cashier Session
  const [currentSession, setCurrentSession] = useState<CashierSession | null>(() => {
    const saved = localStorage.getItem('pos_current_session');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    // Pre-create an initial active session for instant cashier demo readiness!
    const initialSession: CashierSession = {
      id: 'SES-' + Date.now().toString().slice(-6),
      cashierId: INITIAL_USERS[0].id,
      cashierName: INITIAL_USERS[0].name,
      startTime: new Date().toISOString(),
      openingCash: 200000, // Rp 200.000 starting cash drawer
      expectedCash: 200000,
      status: 'active',
      totalTransactions: 0,
      totalSales: 0,
      cashSales: 0,
      qrisSales: 0,
      depositSales: 0,
      totalRefunds: 0,
      totalDiscounts: 0,
      handOffHistory: [],
    };
    return initialSession;
  });

  const [closedSessions, setClosedSessions] = useState<CashierSession[]>(() => {
    const saved = localStorage.getItem('pos_closed_sessions');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [];
  });

  useEffect(() => {
    if (currentSession) {
      localStorage.setItem('pos_current_session', JSON.stringify(currentSession));
    } else {
      localStorage.removeItem('pos_current_session');
    }
  }, [currentSession]);

  useEffect(() => {
    localStorage.setItem('pos_closed_sessions', JSON.stringify(closedSessions));
  }, [closedSessions]);

  // Category Master (POS-US-028)
  const [categories, setCategories] = useState<ProductCategoryItem[]>(() => {
    const saved = localStorage.getItem('pos_categories');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const seen = new Set<string>();
          const result: ProductCategoryItem[] = [];
          for (const item of parsed) {
            if (item && item.id && !seen.has(item.id)) {
              seen.add(item.id);
              result.push(item);
            }
          }
          return result;
        }
      } catch {}
    }
    return INITIAL_CATEGORIES;
  });

  useEffect(() => {
    localStorage.setItem('pos_categories', JSON.stringify(categories));
  }, [categories]);

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
    const saved = localStorage.getItem('pos_settlement_cycles');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const seen = new Set<string>();
          const result: SupplierSettlementCycle[] = [];
          for (const cycle of parsed) {
            if (cycle && cycle.id && !seen.has(cycle.id)) {
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

  // Customers
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('pos_customers');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return INITIAL_CUSTOMERS;
  });

  const [selectedCustomer, setSelectedCustomer] = useState<Customer>(DEFAULT_WALKIN_CUSTOMER);

  useEffect(() => {
    localStorage.setItem('pos_customers', JSON.stringify(customers));
  }, [customers]);

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

  // Audits & Adjustments
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('pos_audit_logs');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [];
  });

  const [stockAdjustments, setStockAdjustments] = useState<StockAdjustmentRecord[]>(() => {
    const saved = localStorage.getItem('pos_stock_adjustments');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('pos_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem('pos_stock_adjustments', JSON.stringify(stockAdjustments));
  }, [stockAdjustments]);

  // Receipt Modal State
  const [activeReceiptOrder, setActiveReceiptOrder] = useState<Order | null>(null);

  // Helper to log an audit event
  const addAudit = (
    action: string,
    entityType: 'order' | 'session' | 'stock' | 'user' | 'price' | 'discount' | 'supplier' | 'consignment' | 'category' | 'product' | 'receipt',
    entityId: string,
    details: string,
    beforeValue?: string,
    afterValue?: string
  ) => {
    const entry: AuditLog = {
      id: 'AUD-' + Date.now().toString().slice(-6),
      timestamp: new Date().toISOString(),
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action,
      entityType,
      entityId,
      details,
      beforeValue,
      afterValue,
    };
    setAuditLogs((prev) => [entry, ...prev]);
  };

  // Switch User / Cashier Login (POS-US-004, POS-US-023)
  const switchUser = (userId: string, pin: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) {
      posSound.error();
      return { success: false, message: 'Pengguna tidak ditemukan' };
    }
    if (target.pin !== pin) {
      posSound.error();
      return { success: false, message: 'PIN Salah. Silakan coba lagi.' };
    }
    setCurrentUser(target);
    posSound.beep();
    addAudit('LOGIN_SWITCH', 'user', target.id, `Kasir berganti ke ${target.name} (${target.role})`);
    return { success: true, message: `Berhasil login sebagai ${target.name}` };
  };

  // Verify Supervisor / Manager PIN (POS-US-011, POS-US-016, POS-US-017, POS-US-019)
  const verifySupervisorPin = (pin: string) => {
    const supervisor = users.find(
      (u) => (u.role === 'supervisor' || u.role === 'admin') && u.pin === pin
    );
    if (supervisor) {
      return { success: true, supervisor, message: 'Otorisasi Disetujui' };
    }
    return { success: false, message: 'PIN Supervisor/Admin tidak valid!' };
  };

  // Open Cashier Session (POS-US-003)
  const openSession = (openingCash: number) => {
    if (currentSession && currentSession.status === 'active') {
      return;
    }
    const newSession: CashierSession = {
      id: 'SES-' + Date.now().toString().slice(-6),
      cashierId: currentUser.id,
      cashierName: currentUser.name,
      startTime: new Date().toISOString(),
      openingCash: Math.max(0, openingCash),
      expectedCash: Math.max(0, openingCash),
      status: 'active',
      totalTransactions: 0,
      totalSales: 0,
      cashSales: 0,
      qrisSales: 0,
      depositSales: 0,
      totalRefunds: 0,
      totalDiscounts: 0,
      handOffHistory: [],
    };
    setCurrentSession(newSession);
    addAudit(
      'SESSION_OPEN',
      'session',
      newSession.id,
      `Sesi Kasir dibuka oleh ${currentUser.name} dengan Modal Awal: Rp ${openingCash.toLocaleString('id-ID')}`
    );
    posSound.beep();
  };

  // Correct Opening Cash (POS-US-003)
  const correctOpeningCash = (newAmount: number, adminPin: string, reason: string) => {
    const auth = verifySupervisorPin(adminPin);
    if (!auth.success || !currentSession) {
      posSound.error();
      return false;
    }
    const oldAmount = currentSession.openingCash;
    const diff = newAmount - oldAmount;
    setCurrentSession((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        openingCash: newAmount,
        openingCashCorrected: true,
        openingCashOld: oldAmount,
        expectedCash: prev.expectedCash + diff,
      };
    });
    addAudit(
      'CORRECT_OPENING_CASH',
      'session',
      currentSession.id,
      `Koreksi Modal Awal oleh ${auth.supervisor?.name}. Alasan: ${reason}`,
      `Rp ${oldAmount}`,
      `Rp ${newAmount}`
    );
    posSound.cashRegister();
    return true;
  };

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

  // Close and Reconcile Session (POS-US-005)
  const closeSession = (
    actualCash: number,
    varianceReason: string,
    supervisorPin: string
  ) => {
    if (!currentSession) {
      return { success: false, message: 'Tidak ada sesi kasir aktif' };
    }

    // Check if any held orders exist that block closing
    if (setAsideOrders.length > 0) {
      posSound.error();
      return {
        success: false,
        message: `Masih ada ${setAsideOrders.length} pesanan yang ditahan (parkir). Selesaikan atau batalkan terlebih dahulu sebelum tutup kasir.`,
      };
    }

    const expected = currentSession.expectedCash;
    const variance = actualCash - expected;
    const varianceThreshold = 10000; // Rp 10.000

    // If variance > Rp 10.000 or < -Rp 10.000, reason is mandatory
    if (Math.abs(variance) > varianceThreshold && !varianceReason.trim()) {
      posSound.error();
      return {
        success: false,
        message: 'Selisih melebihi ±Rp 10.000! Alasan selisih kas wajib diisi.',
      };
    }

    // Manager approval is required
    const auth = verifySupervisorPin(supervisorPin);
    if (!auth.success) {
      posSound.error();
      return { success: false, message: 'Otorisasi Supervisor diperlukan untuk menutup shift!' };
    }

    const closed: CashierSession = {
      ...currentSession,
      endTime: new Date().toISOString(),
      actualCash,
      variance,
      varianceReason: varianceReason.trim() || undefined,
      closingApprovedBy: auth.supervisor?.name,
      status: 'closed',
    };

    setClosedSessions((prev) => [closed, ...prev]);
    setCurrentSession(null);

    addAudit(
      'SESSION_CLOSE',
      'session',
      closed.id,
      `Tutup Sesi oleh ${currentUser.name}, disetujui ${auth.supervisor?.name}. Fisik: Rp ${actualCash.toLocaleString('id-ID')}, Ekspektasi: Rp ${expected.toLocaleString('id-ID')}, Selisih: Rp ${variance.toLocaleString('id-ID')}`
    );
    posSound.cashRegister();
    return { success: true, message: 'Sesi Kasir berhasil ditutup dan direkonsiliasi.' };
  };

  // Support Session Correction for Closed Session (POS-US-006)
  const openSupportSessionCorrection = (
    sessionId: string,
    action: string,
    reason: string,
    adminPin: string
  ) => {
    const auth = verifySupervisorPin(adminPin);
    if (!auth.success || auth.supervisor?.role !== 'admin') {
      posSound.error();
      return false;
    }
    setClosedSessions((prev) =>
      prev.map((s) => {
        if (s.id === sessionId) {
          const correction = {
            adminId: auth.supervisor!.id,
            adminName: auth.supervisor!.name,
            timestamp: new Date().toISOString(),
            action,
            reason,
            beforeValue: `Status: ${s.status}`,
            afterValue: `Audited Support Correction: ${action}`,
          };
          return {
            ...s,
            supportCorrections: [...(s.supportCorrections || []), correction],
          };
        }
        return s;
      })
    );
    addAudit(
      'SUPPORT_SESSION_CORRECTION',
      'session',
      sessionId,
      `Koreksi Support Session oleh Admin ${auth.supervisor.name}. Aksi: ${action}. Alasan: ${reason}`
    );
    posSound.beep();
    return true;
  };

  // Add Customer (POS-US-001)
  const addCustomer = (customerData: Omit<Customer, 'id' | 'createdAt'>) => {
    const newCust: Customer = {
      ...customerData,
      id: 'cust-' + Date.now().toString().slice(-5),
      createdAt: new Date().toISOString(),
    };
    setCustomers((prev) => [newCust, ...prev]);
    setSelectedCustomer(newCust);
    addAudit('CUSTOMER_ADD', 'order', newCust.id, `Pelanggan baru ditambahkan: ${newCust.name} (${newCust.category})`);
    posSound.beep();
    return newCust;
  };

  // Product Category Master (POS-US-028)
  const addCategory = (name: string, description?: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return { success: false, message: 'Nama kategori produk tidak boleh kosong!' };
    }
    const isDuplicate = categories.some(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      return { success: false, message: `Kategori "${trimmed}" sudah ada!` };
    }

    const id = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const newCat: ProductCategoryItem = {
      id,
      name: trimmed,
      description: description?.trim() || undefined,
      icon: '🏷️',
    };

    setCategories((prev) => [...prev, newCat]);
    addAudit(
      'CATEGORY_CREATE',
      'category',
      id,
      `Kategori produk baru dibuat: "${trimmed}" oleh ${currentUser.name}`
    );
    posSound.beep();
    return { success: true, category: newCat, message: `Kategori "${trimmed}" berhasil dibuat!` };
  };

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
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const poNo = hasMadeToOrder
      ? options?.poNumber || `PO-${datePrefix}-${Math.floor(100 + Math.random() * 900)}`
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

  const createMtoOrder = (input: {
    productId: string;
    quantity: number;
    customPrice?: number;
    customer: Customer;
    pickupDate: string;
    pickupTime: string;
    customizationNotes: string;
    payments: PaymentComponent[];
  }) => {
    if (!currentSession || currentSession.status !== 'active') {
      posSound.error();
      return { success: false, message: 'Tidak ada sesi kasir yang aktif' };
    }
    const product = products.find((p) => p.id === input.productId);
    if (!product || !product.isMadeToOrder) {
      posSound.error();
      return { success: false, message: 'Produk Made-to-Order tidak valid' };
    }
    if (input.quantity <= 0) {
      posSound.error();
      return { success: false, message: 'Jumlah pesanan harus lebih dari 0' };
    }
    const unitPrice = input.customPrice !== undefined && input.customPrice >= 0 ? input.customPrice : product.price;
    const subtotal = unitPrice * input.quantity;
    const taxRate = taxApplied ? STORE_INFO.taxRate : 0;
    const taxAmount = Math.round(subtotal * taxRate);
    const total = subtotal + taxAmount;

    const totalPaid = input.payments.reduce((sum, p) => sum + p.amount, 0);
    if (totalPaid <= 0) {
      posSound.error();
      return { success: false, message: 'Harap masukkan pembayaran DP atau Pelunasan!' };
    }

    const isPartial = totalPaid < total;
    const paymentStatus: Order['paymentStatus'] = isPartial ? 'partial' : 'paid';
    const orderStatus: Order['orderStatus'] = 'active';

    const cashComponent = input.payments.find((p) => p.method === 'cash');
    const change = cashComponent?.change || 0;

    const receiptNo = generateReceiptNumber();
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const poNo = `PO-${datePrefix}-${Math.floor(100 + Math.random() * 900)}`;

    const cartItem: CartItem = {
      id: 'line-' + Math.random().toString(36).slice(2, 9),
      productId: product.id,
      productName: product.name,
      category: product.category,
      unitPrice,
      originalPrice: product.price,
      isPriceOverridden: input.customPrice !== undefined && input.customPrice !== product.price,
      quantity: input.quantity,
      image: product.image,
      isMadeToOrder: true,
      stockAvailable: product.stock,
      ownershipType: product.ownershipType || 'own',
      supplierId: product.supplierId,
      supplierName: product.supplierName,
      commissionMethod: product.commissionMethod,
      commissionValue: product.commissionValue,
      commissionBasis: product.commissionBasis,
      customizationNotes: input.customizationNotes,
    };

    const newOrder: Order = {
      id: 'ORD-' + Date.now().toString().slice(-7),
      receiptNumber: receiptNo,
      poNumber: poNo,
      sessionId: currentSession.id,
      cashierId: currentUser.id,
      cashierName: currentUser.name,
      customer: input.customer,
      items: [cartItem],
      subtotal,
      taxApplied,
      taxRate: STORE_INFO.taxRate,
      taxAmount,
      discountAmount: 0,
      total,
      paidAmount: totalPaid,
      remainingBalance: Math.max(0, total - totalPaid),
      change,
      payments: input.payments,
      paymentStatus,
      orderStatus,
      isMadeToOrder: true,
      customizationNotes: input.customizationNotes,
      pickupDate: input.pickupDate,
      pickupTime: input.pickupTime,
      pickupTimeHistory: [],
      createdAt: new Date().toISOString(),
      reprintCount: 0,
    };

    setOrders((prev) => [newOrder, ...prev]);

    const cashPortion = input.payments
      .filter((p) => p.method === 'cash')
      .reduce((sum, p) => sum + p.amount, 0);
    const qrisPortion = input.payments
      .filter((p) => p.method === 'qris')
      .reduce((sum, p) => sum + p.amount, 0);
    const depositPortion = input.payments
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
      };
    });

    addAudit(
      'ORDER_CREATE_PO',
      'order',
      newOrder.id,
      `Membuat PO Made-to-Order baru ${poNo} untuk ${input.customer.name} (Total: Rp ${total.toLocaleString('id-ID')}, DP: Rp ${totalPaid.toLocaleString('id-ID')})`
    );

    setActiveReceiptOrder(newOrder);
    posSound.cashRegister();

    return { success: true, order: newOrder, message: `PO Made-to-Order ${poNo} berhasil dibuat!` };
  };

  // Settle Made-to-Order Remaining Balance (POS-US-014)
  const settleMadeToOrder = (orderId: string, payment: PaymentComponent) => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) return { success: false, message: 'Pesanan tidak ditemukan' };

    const newPaid = target.paidAmount + payment.amount;
    const newRemaining = Math.max(0, target.total - newPaid);
    const isNowPaid = newRemaining === 0;

    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          return {
            ...o,
            paidAmount: newPaid,
            remainingBalance: newRemaining,
            paymentStatus: isNowPaid ? 'paid' : 'partial',
            orderStatus: isNowPaid ? 'completed' : 'awaiting_settlement',
            payments: [...o.payments, payment],
          };
        }
        return o;
      })
    );

    // If fully settled, now deduct the base stock! (POS-US-014, POS-US-020)
    if (isNowPaid) {
      setProducts((prev) =>
        prev.map((prod) => {
          // deduct base cake tart
          if (prod.id === 'prod-11') {
            return { ...prod, stock: Math.max(0, prod.stock - 1) };
          }
          return prod;
        })
      );
    }

    // Update session
    if (currentSession && payment.method === 'cash') {
      setCurrentSession((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          cashSales: prev.cashSales + payment.amount,
          expectedCash: prev.expectedCash + payment.amount,
        };
      });
    }

    addAudit(
      'ORDER_SETTLEMENT',
      'order',
      orderId,
      `Pelunasan Pesanan Custom ${target.receiptNumber} sebesar Rp ${payment.amount.toLocaleString('id-ID')}`
    );

    posSound.cashRegister();
    return { success: true, message: 'Pelunasan pesanan berhasil dicatat!' };
  };

  // MTO Purchase Order (PO) Management
  const updatePoPickupTime = (orderId: string, newTime: string) => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) {
      posSound.error();
      return { success: false, message: 'Pesanan tidak ditemukan' };
    }
    if (target.orderStatus === 'picked_up' || target.orderStatus === 'cancelled') {
      posSound.error();
      return { success: false, message: 'Jam ambil pesanan yang sudah selesai atau batal tidak dapat diubah!' };
    }
    if (!newTime.trim()) {
      posSound.error();
      return { success: false, message: 'Jam pengambilan baru wajib diisi!' };
    }

    const prevTime = target.pickupTime || '00:00';
    const now = new Date().toISOString();

    const historyEntry = {
      previousTime: prevTime,
      newTime: newTime.trim(),
      updatedBy: currentUser.name,
      timestamp: now,
    };

    // If new time makes scheduled time future and order was overdue, reactivate
    let newStatus = target.orderStatus;
    if (target.pickupDate) {
      const scheduledDateTime = new Date(`${target.pickupDate}T${newTime.trim()}:00`);
      if (scheduledDateTime.getTime() > Date.now() && target.orderStatus === 'overdue') {
        newStatus = 'active';
      }
    }

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              pickupTime: newTime.trim(),
              orderStatus: newStatus,
              pickupTimeHistory: [...(o.pickupTimeHistory || []), historyEntry],
            }
          : o
      )
    );

    addAudit(
      'PO_RESCHEDULE_TIME',
      'order',
      orderId,
      `Perubahan jam ambil PO ${target.poNumber || target.receiptNumber} dari ${prevTime} ke ${newTime.trim()} oleh ${currentUser.name}`
    );

    posSound.beep();
    return {
      success: true,
      message: `Jam pengambilan berhasil diubah menjadi ${newTime.trim()}!`,
    };
  };

  const settlePoPayment = (orderId: string, newPayments: PaymentComponent[]) => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) {
      posSound.error();
      return { success: false, message: 'Pesanan tidak ditemukan' };
    }
    if (target.orderStatus === 'picked_up' || target.orderStatus === 'cancelled') {
      posSound.error();
      return { success: false, message: 'Pesanan yang selesai atau batal tidak dapat dilakukan pelunasan!' };
    }

    const additionalPaid = newPayments.reduce((s, p) => s + p.amount, 0);
    if (additionalPaid <= 0) {
      posSound.error();
      return { success: false, message: 'Nominal pelunasan harus lebih dari 0!' };
    }

    const newTotalPaid = target.paidAmount + additionalPaid;
    const newRemaining = Math.max(0, target.total - newTotalPaid);
    const isFullyPaid = newRemaining === 0;

    // Deduct deposit if deposit method used
    const depositComp = newPayments.find((p) => p.method === 'deposit');
    if (depositComp && depositComp.amount > 0) {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === target.customer.id
            ? {
                ...c,
                depositBalance: Math.max(0, c.depositBalance - depositComp.amount),
                lastTransactionAt: new Date().toISOString(),
              }
            : c
        )
      );
    }

    // Update active cashier session
    const cashPortion = newPayments.filter((p) => p.method === 'cash').reduce((s, p) => s + p.amount, 0);
    const qrisPortion = newPayments.filter((p) => p.method === 'qris').reduce((s, p) => s + p.amount, 0);
    const depositPortion = newPayments.filter((p) => p.method === 'deposit').reduce((s, p) => s + p.amount, 0);

    if (currentSession) {
      setCurrentSession((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          totalSales: prev.totalSales + additionalPaid,
          cashSales: prev.cashSales + cashPortion,
          qrisSales: prev.qrisSales + qrisPortion,
          depositSales: prev.depositSales + depositPortion,
          expectedCash: prev.expectedCash + cashPortion,
        };
      });
    }

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              paidAmount: newTotalPaid,
              remainingBalance: newRemaining,
              paymentStatus: isFullyPaid ? 'paid' : 'partial',
              payments: [...o.payments, ...newPayments],
            }
          : o
      )
    );

    addAudit(
      'PO_PAYMENT_SETTLEMENT',
      'order',
      orderId,
      `Pelunasan PO ${target.poNumber || target.receiptNumber} (${target.customer.name}) sebesar Rp ${additionalPaid.toLocaleString('id-ID')} via ${newPayments.map((p) => p.method.toUpperCase()).join('+')}. Sisa Tagihan: Rp ${newRemaining.toLocaleString('id-ID')}`
    );

    posSound.cashRegister();
    return {
      success: true,
      message: `Pelunasan sebesar Rp ${additionalPaid.toLocaleString('id-ID')} berhasil dicatat! Status: ${isFullyPaid ? 'Lunas' : 'Sisa Rp ' + newRemaining.toLocaleString('id-ID')}`,
    };
  };

  const markPoReadyForPickup = (orderId: string) => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) {
      posSound.error();
      return { success: false, message: 'Pesanan tidak ditemukan' };
    }
    if (target.orderStatus === 'picked_up' || target.orderStatus === 'cancelled') {
      posSound.error();
      return { success: false, message: 'Status pesanan tidak dapat diubah!' };
    }

    const now = new Date().toISOString();

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              orderStatus: 'ready_for_pickup',
              readyAt: now,
              readyBy: currentUser.name,
            }
          : o
      )
    );

    addAudit(
      'PO_READY_FOR_PICKUP',
      'order',
      orderId,
      `PO ${target.poNumber || target.receiptNumber} (${target.customer.name}) ditandai Siap Diambil oleh ${currentUser.name}`
    );

    posSound.beep();
    return {
      success: true,
      message: `Pesanan ${target.poNumber || target.receiptNumber} berhasil ditandai Siap Diambil!`,
    };
  };

  const confirmPoPickup = (orderId: string, collectorName: string) => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) {
      posSound.error();
      return { success: false, message: 'Pesanan tidak ditemukan' };
    }
    if (target.orderStatus === 'picked_up') {
      posSound.error();
      return { success: false, message: 'Pesanan ini sudah pernah diambil!' };
    }
    if (target.orderStatus === 'cancelled') {
      posSound.error();
      return { success: false, message: 'Pesanan ini sudah dibatalkan!' };
    }
    if (!collectorName.trim()) {
      posSound.error();
      return { success: false, message: 'Nama pengambil pesanan wajib diisi!' };
    }

    const now = new Date().toISOString();

    // Deduct stock exactly once if not yet deducted
    if (!target.stockDeducted) {
      setProducts((prev) =>
        prev.map((prod) => {
          let qtyToDeduct = 0;
          for (const item of target.items) {
            if (item.productId === prod.id) {
              qtyToDeduct += item.quantity;
            }
            if (item.baseProductId === prod.id || (item.isMadeToOrder && prod.id === 'prod-11')) {
              qtyToDeduct += item.quantity;
            }
          }
          if (qtyToDeduct > 0) {
            return { ...prod, stock: Math.max(0, prod.stock - qtyToDeduct) };
          }
          return prod;
        })
      );

      // Record stock adjustment
      target.items.forEach((item) => {
        const adj: StockAdjustmentRecord = {
          id: 'ADJ-' + Date.now().toString().slice(-6) + '-' + Math.random().toString(36).slice(2, 5),
          productId: item.productId,
          productName: item.productName,
          type: 'decrease',
          quantity: item.quantity,
          previousStock: item.stockAvailable,
          resultingStock: Math.max(0, item.stockAvailable - item.quantity),
          reason: `Pengambilan Pesanan PO ${target.poNumber || target.receiptNumber} oleh ${collectorName.trim()}`,
          adminId: currentUser.id,
          adminName: currentUser.name,
          timestamp: now,
        };
        setStockAdjustments((prev) => [adj, ...prev]);
      });
    }

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              orderStatus: 'picked_up',
              collectorName: collectorName.trim(),
              pickedUpAt: now,
              pickedUpBy: currentUser.name,
              stockDeducted: true,
            }
          : o
      )
    );

    addAudit(
      'PO_PICKUP_CONFIRMED',
      'order',
      orderId,
      `Konfirmasi Pengambilan PO ${target.poNumber || target.receiptNumber} (${target.customer.name}). Pengambil: ${collectorName.trim()}. Petugas: ${currentUser.name}. Sisa Tagihan: Rp ${target.remainingBalance.toLocaleString('id-ID')}`
    );

    posSound.cashRegister();
    return {
      success: true,
      message: `Pesanan ${target.poNumber || target.receiptNumber} berhasil diambil oleh ${collectorName.trim()}!`,
    };
  };

  const cancelPoWithSupervisor = (orderId: string, reason: string, supervisorPin: string) => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) {
      posSound.error();
      return { success: false, message: 'Pesanan tidak ditemukan' };
    }
    if (target.orderStatus === 'picked_up') {
      posSound.error();
      return { success: false, message: 'Pesanan yang sudah diambil tidak dapat dibatalkan!' };
    }
    if (target.orderStatus === 'cancelled') {
      posSound.error();
      return { success: false, message: 'Pesanan ini sudah dibatalkan sebelumnya!' };
    }
    if (!reason.trim()) {
      posSound.error();
      return { success: false, message: 'Alasan pembatalan pesanan wajib diisi!' };
    }

    const auth = verifySupervisorPin(supervisorPin);
    if (!auth.success || !auth.supervisor) {
      posSound.error();
      return { success: false, message: 'Otorisasi Supervisor diperlukan untuk membatalkan pesanan!' };
    }

    const now = new Date().toISOString();
    const creditRef = `REF-BATAL-${target.poNumber || target.receiptNumber}`;

    // Credit all received payments to customer deposit account
    if (target.paidAmount > 0) {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === target.customer.id
            ? {
                ...c,
                depositBalance: c.depositBalance + target.paidAmount,
                lastTransactionAt: now,
              }
            : c
        )
      );
    }

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              orderStatus: 'cancelled',
              paymentStatus: 'refunded',
              cancellationReason: reason.trim(),
              cancellationApprovedBy: auth.supervisor!.name,
              cancellationCreditRef: creditRef,
              cancelledAt: now,
            }
          : o
      )
    );

    addAudit(
      'PO_CANCELLED',
      'order',
      orderId,
      `Pembatalan PO ${target.poNumber || target.receiptNumber} (${target.customer.name}) disetujui oleh SPV ${auth.supervisor.name}. Alasan: ${reason.trim()}. Dana Rp ${target.paidAmount.toLocaleString('id-ID')} dikreditkan ke Akun Deposit Pelanggan (Ref: ${creditRef}).`
    );

    posSound.beep();
    return {
      success: true,
      message: `Pesanan ${target.poNumber || target.receiptNumber} berhasil dibatalkan. Dana Rp ${target.paidAmount.toLocaleString('id-ID')} telah dikreditkan ke Akun Deposit ${target.customer.name}.`,
    };
  };

  const duplicatePoToCart = (orderId: string, selectedItemIds: string[]) => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) {
      posSound.error();
      return { success: false, message: 'Pesanan tidak ditemukan' };
    }
    if (target.orderStatus !== 'picked_up') {
      posSound.error();
      return {
        success: false,
        message: 'Duplikat pesanan hanya diizinkan untuk pesanan yang sudah Selesai (Picked Up)!',
      };
    }
    if (selectedItemIds.length === 0) {
      posSound.error();
      return { success: false, message: 'Pilih minimal satu item untuk diduplikasi!' };
    }

    const itemsToDuplicate = target.items.filter((i) => selectedItemIds.includes(i.id));
    if (itemsToDuplicate.length === 0) {
      posSound.error();
      return { success: false, message: 'Tidak ada item yang cocok untuk diduplikasi!' };
    }

    // Reset payment, customization notes, schedule, fulfillment status
    const freshCartItems: CartItem[] = itemsToDuplicate.map((item, idx) => {
      const prodMaster = products.find((p) => p.id === item.productId);
      return {
        id: 'dup-' + Date.now().toString().slice(-6) + '-' + idx,
        productId: item.productId,
        productName: item.productName,
        unitPrice: item.unitPrice,
        originalPrice: item.originalPrice || item.unitPrice,
        quantity: item.quantity,
        isPriceOverridden: item.isPriceOverridden,
        overrideReason: item.overrideReason,
        isMadeToOrder: item.isMadeToOrder,
        baseProductId: item.baseProductId,
        category: item.category,
        stockAvailable: prodMaster?.stock ?? item.stockAvailable,
        ownershipType: item.ownershipType,
        supplierId: item.supplierId,
        supplierName: item.supplierName,
        commissionMethod: item.commissionMethod,
        commissionValue: item.commissionValue,
        commissionBasis: item.commissionBasis,
      };
    });

    setCart(freshCartItems);
    setSelectedCustomer(target.customer);
    setOrderDiscountType(null);
    setOrderDiscountValue(0);
    setOrderDiscountReason('');

    addAudit(
      'PO_DUPLICATE_DRAFT',
      'order',
      orderId,
      `Duplikasi pesanan selesai ${target.poNumber || target.receiptNumber} ke keranjang kasir untuk ${target.customer.name}. Jumlah item: ${freshCartItems.length}`
    );

    posSound.cashRegister();
    return {
      success: true,
      message: `Berhasil menduplikasi ${freshCartItems.length} item ke Kasir untuk pelanggan ${target.customer.name}!`,
    };
  };

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

    if (receiptData.receiptType === 'Dibeli Sendiri') {
      if (
        receiptData.totalPurchaseCost === undefined ||
        receiptData.totalPurchaseCost === null ||
        isNaN(receiptData.totalPurchaseCost) ||
        receiptData.totalPurchaseCost < 0
      ) {
        posSound.error();
        return { success: false, message: 'Total biaya pembelian wajib diisi untuk penerimaan Dibeli Sendiri!' };
      }
      if (!receiptData.paymentMethod) {
        posSound.error();
        return { success: false, message: 'Metode pembayaran wajib dipilih untuk penerimaan Dibeli Sendiri!' };
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
      receiptNumber,
      totalQuantity,
      status: 'submitted',
      stockMovementRef,
      submittedAt: now.toISOString(),
      createdAt: now.toISOString(),
    };

    // 3. Update stock for each product (added exactly once) and log stock movements
    const updatedProducts = [...products];
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
    });

    setProducts(updatedProducts);
    setStockAdjustments((prev) => [...newStockAdjustments, ...prev]);
    setGoodsReceipts((prev) => [newRecord, ...prev]);

    // 4. Log audit trail
    addAudit(
      'SUBMIT_GOODS_RECEIPT',
      'receipt',
      receiptNumber,
      `Penerimaan Barang ${receiptNumber} (${receiptData.receiptType}) dari ${receiptData.supplierName}: ${totalQuantity} pcs masuk stok jual. Ref: ${stockMovementRef}`
    );

    // 5. Sound & Clear Draft
    posSound.cashRegister();
    setReceivingDraft(null);

    return {
      success: true,
      receipt: newRecord,
      message: `Penerimaan barang ${receiptNumber} berhasil disimpan! ${totalQuantity} pcs telah ditambahkan ke stok jual.`,
    };
  };

  return (
    <POSContext.Provider
      value={{
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
        categories,
        addCategory,
        products,
        addProduct,
        manualAdjustStock,
        suppliers,
        addSupplier,
        updateSupplier,
        commissionLedger,
        settlementCycles,
        recordSettlementPayment,
        generateSettlementCycles,
        customers,
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
        setAsideOrders,
        holdCurrentOrder,
        resumeOrder,
        cancelHoldOrder,
        completeOrder,
        createMtoOrder,
        orders,
        settleMadeToOrder,
        updatePoPickupTime,
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
        auditLogs,
        stockAdjustments,
        goodsReceipts,
        receivingDraft,
        setReceivingDraft,
        submitGoodsReceipt,
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
