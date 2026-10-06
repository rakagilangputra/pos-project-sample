import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { generatePONumber, generateReceiptNumber, posSound } from '../../utils/formatters';
import { DEFAULT_WALKIN_CUSTOMER, STORE_INFO } from '../../data/mockData';
import type {
  CartItem,
  CashierSession,
  CommissionLedgerEntry,
  Customer,
  Order,
  PaymentComponent,
  Product,
  ProductExpiryBatch,
  SetAsideOrder,
  StoreBranch,
  User,
} from '../../types';
import type { AddAuditFn } from './sliceTypes';

interface UseCartSliceDeps {
  currentUser: User;
  currentSession: CashierSession | null;
  setCurrentSession: Dispatch<SetStateAction<CashierSession | null>>;
  selectedCustomer: Customer;
  setSelectedCustomer: Dispatch<SetStateAction<Customer>>;
  setCustomers: Dispatch<SetStateAction<Customer[]>>;
  setExpiryBatches: Dispatch<SetStateAction<ProductExpiryBatch[]>>;
  branches: StoreBranch[];
  selectedBranchId: string;
  orders: Order[];
  setOrders: Dispatch<SetStateAction<Order[]>>;
  products: Product[];
  setProducts: Dispatch<SetStateAction<Product[]>>;
  setCommissionLedger: Dispatch<SetStateAction<CommissionLedgerEntry[]>>;
  setActiveReceiptOrder: Dispatch<SetStateAction<Order | null>>;
  setAsideOrders: SetAsideOrder[];
  setSetAsideOrders: Dispatch<SetStateAction<SetAsideOrder[]>>;
  addAudit: AddAuditFn;
}

/**
 * Cart slice of the POS store.
 *
 * Owns: the active cart, the 11% tax toggle, order-level discounts and the
 * derived cart totals, plus every cart action - add/update/remove/clear,
 * line price overrides, item and order discounts, hold/resume/cancel set-aside
 * orders and checkout (`completeOrder`). Extracted verbatim from POSContext.
 *
 * Wired after `useSessionSlice` (the cart actions read `currentSession`) and
 * before `useOrgActions` (`selectBranch` clears the cart), which keeps the
 * session -> cart -> org chain acyclic (TOKEN_OPTIMIZATION_PROGRESS.md).
 */
export function useCartSlice({
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
}: UseCartSliceDeps) {
  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [taxApplied, setTaxApplied] = useState<boolean>(true); // 11% PPN on by default
  const [orderDiscountType, setOrderDiscountType] = useState<'percent' | 'fixed' | null>(null);
  const [orderDiscountValue, setOrderDiscountValue] = useState<number>(0);
  const [orderDiscountReason, setOrderDiscountReason] = useState<string>('');
  const [orderDiscountApprovedBy, setOrderDiscountApprovedBy] = useState<string | undefined>(undefined);

  // Cart Operations (POS-US-008, POS-US-009, POS-US-020)
  const addToCart = (product: Product, quantity = 1) => {
    if (!currentSession || currentSession.status !== 'active') {
      posSound.error();
      return { success: false, warning: 'Buka sesi kasir terlebih dahulu sebelum memulai transaksi!' };
    }
    if (product.status === 'inactive') {
      posSound.error();
      return { success: false, warning: `${product.name} sedang nonaktif dan tidak dapat dijual.` };
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
    const inactiveCartItem = cart.find((item) => {
      const product = products.find((candidate) => candidate.id === item.productId);
      return product?.status === 'inactive';
    });
    if (inactiveCartItem) {
      posSound.error();
      return {
        success: false,
        message: `Produk ${inactiveCartItem.productName} sudah nonaktif dan harus dihapus dari keranjang sebelum pembayaran.`,
      };
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

  return {
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
  };
}
