import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  User,
  Customer,
  Product,
  CartItem,
  Order,
  CashierSession,
  SetAsideOrder,
  AuditLog,
  PaymentComponent,
  StockAdjustmentRecord,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_CUSTOMERS,
  DEFAULT_WALKIN_CUSTOMER,
  INITIAL_PRODUCTS,
  STORE_INFO,
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

  // Catalog & Inventory
  products: Product[];
  manualAdjustStock: (
    productId: string,
    type: 'increase' | 'decrease',
    quantity: number,
    reason: string
  ) => { success: boolean; message: string };

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

  // Checkout & Transactions
  completeOrder: (
    payments: PaymentComponent[],
    options?: {
      isDeposit?: boolean;
      customizationNotes?: string;
    }
  ) => { success: boolean; order?: Order; message: string };
  orders: Order[];
  settleMadeToOrder: (orderId: string, payment: PaymentComponent) => { success: boolean; message: string };
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

  // Catalog & Products
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('pos_products');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return INITIAL_PRODUCTS;
  });

  useEffect(() => {
    localStorage.setItem('pos_products', JSON.stringify(products));
  }, [products]);

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
      try { return JSON.parse(saved); } catch {}
    }
    return [];
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
    entityType: 'order' | 'session' | 'stock' | 'user' | 'price' | 'discount',
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
    options?: { isDeposit?: boolean; customizationNotes?: string }
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
    const isDeposit = Boolean(options?.isDeposit);
    const hasMadeToOrder = cart.some((i) => i.isMadeToOrder);

    // Validation
    if (!isDeposit && totalPaid < cartTotal) {
      posSound.error();
      return { success: false, message: 'Jumlah pembayaran belum mencukupi total belanja!' };
    }

    const isPartial = isDeposit && totalPaid < cartTotal;
    const paymentStatus: Order['paymentStatus'] = isPartial ? 'partial' : 'paid';
    const orderStatus: Order['orderStatus'] = isPartial ? 'awaiting_settlement' : 'completed';

    // Calculate cash change
    const cashComponent = payments.find((p) => p.method === 'cash');
    const change = cashComponent?.change || 0;

    const receiptNo = generateReceiptNumber();
    const newOrder: Order = {
      id: 'ORD-' + Date.now().toString().slice(-7),
      receiptNumber: receiptNo,
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
      createdAt: new Date().toISOString(),
      reprintCount: 0,
    };

    // Deduct stock:
    // Ready Stock is deducted immediately upon completion.
    // Made-to-Order with deposit is NOT deducted until settlement!
    if (!isPartial) {
      setProducts((prev) =>
        prev.map((prod) => {
          const cartItem = cart.find((item) => item.productId === prod.id);
          if (cartItem) {
            return { ...prod, stock: Math.max(0, prod.stock - cartItem.quantity) };
          }
          // Also handle Made-to-Order base product link deduction
          const mtoItem = cart.find((item) => item.isMadeToOrder && prod.id === 'prod-11'); // Black Forest base
          if (mtoItem && prod.id === 'prod-11') {
            return { ...prod, stock: Math.max(0, prod.stock - mtoItem.quantity) };
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
        products,
        manualAdjustStock,
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
        orders,
        settleMadeToOrder,
        voidOrder,
        refundOrder,
        reprintReceipt,
        activeReceiptOrder,
        setActiveReceiptOrder,
        auditLogs,
        stockAdjustments,
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
