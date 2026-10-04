import type { Dispatch, SetStateAction } from 'react';
import { generatePONumber, generateReceiptNumber, posSound } from '../../utils/formatters';
import type { AddAuditFn } from './sliceTypes';
import { STORE_INFO } from '../../data/mockData';
import type {
  CartItem,
  CashierSession,
  Customer,
  MtoOrderItemInput,
  Order,
  PaymentComponent,
  Product,
  ProductExpiryBatch,
  ProductExpiryType,
  StockAdjustmentRecord,
  StoreBranch,
  User,
} from '../../types';

interface UseOrderSliceDeps {
  branches: StoreBranch[];
  selectedBranchId: string;
  selectedBranch: StoreBranch;
  currentUser: User;
  currentSession: CashierSession | null;
  verifySupervisorPin: (pin: string) => { success: boolean; supervisor?: User; message: string };
  taxApplied: boolean;
  orders: Order[];
  products: Product[];
  setActiveReceiptOrder: (order: Order | null) => void;
  setSelectedCustomer: (customer: Customer) => void;
  addAudit: AddAuditFn;
  setCart: Dispatch<SetStateAction<CartItem[]>>;
  setCurrentSession: Dispatch<SetStateAction<CashierSession | null>>;
  setCustomers: Dispatch<SetStateAction<Customer[]>>;
  setExpiryBatches: Dispatch<SetStateAction<ProductExpiryBatch[]>>;
  setOrderDiscountReason: Dispatch<SetStateAction<string>>;
  setOrderDiscountType: Dispatch<SetStateAction<'percent' | 'fixed' | null>>;
  setOrderDiscountValue: Dispatch<SetStateAction<number>>;
  setOrders: Dispatch<SetStateAction<Order[]>>;
  setProducts: Dispatch<SetStateAction<Product[]>>;
  setStockAdjustments: Dispatch<SetStateAction<StockAdjustmentRecord[]>>;
}

/**
 * Order (Pesanan) slice of the POS store.
 *
 * Owns: MTO creation, the full purchase-order lifecycle (reschedule pickup,
 * settle payment, ready-for-pickup, confirm pickup, supervisor-cancel,
 * duplicate-to-cart) and order-item expiry/quantity adjustment. Extracted
 * verbatim from POSContext so the provider no longer carries this domain.
 */
export function useOrderSlice({
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
}: UseOrderSliceDeps) {
  const createMtoOrder = (input: {
    productId?: string;
    quantity?: number;
    customPrice?: number;
    items?: MtoOrderItemInput[];
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

    // Support both multiple items array and single item backward compatibility
    const itemInputs: MtoOrderItemInput[] =
      input.items && input.items.length > 0
        ? input.items
        : input.productId && input.quantity
        ? [
            {
              productId: input.productId,
              quantity: input.quantity,
              customPrice: input.customPrice,
              customizationNotes: input.customizationNotes,
            },
          ]
        : [];

    if (itemInputs.length === 0) {
      posSound.error();
      return { success: false, message: 'Minimal pilih 1 produk pesanan' };
    }

    const cartItems: CartItem[] = [];
    let subtotal = 0;

    for (const itemInput of itemInputs) {
      const product = products.find((p) => p.id === itemInput.productId);
      if (!product) {
        posSound.error();
        return { success: false, message: `Produk tidak valid` };
      }
      if (itemInput.quantity <= 0) {
        posSound.error();
        return { success: false, message: `Jumlah pesanan untuk "${product.name}" harus lebih dari 0` };
      }

      const unitPrice =
        itemInput.customPrice !== undefined && itemInput.customPrice >= 0
          ? itemInput.customPrice
          : product.price;

      const lineTotal = unitPrice * itemInput.quantity;
      subtotal += lineTotal;

      const cartItem: CartItem = {
        id: 'line-' + Math.random().toString(36).slice(2, 9),
        productId: product.id,
        productName: product.name,
        category: product.category,
        unitPrice,
        originalPrice: product.price,
        isPriceOverridden: itemInput.customPrice !== undefined && itemInput.customPrice !== product.price,
        quantity: itemInput.quantity,
        image: product.image,
        isMadeToOrder: true,
        stockAvailable: product.stock,
        ownershipType: itemInput.ownershipType || (itemInput.supplierId && itemInput.supplierId !== 'internal' ? 'consignment' : (product.ownershipType || 'own')),
        supplierId: itemInput.supplierId !== undefined ? (itemInput.supplierId === 'internal' ? undefined : itemInput.supplierId) : product.supplierId,
        supplierName: itemInput.supplierName !== undefined ? itemInput.supplierName : product.supplierName,
        commissionMethod: product.commissionMethod,
        commissionValue: product.commissionValue,
        commissionBasis: product.commissionBasis,
        customizationNotes: itemInput.customizationNotes || input.customizationNotes,
        expiryType: itemInput.expiryType || product.expiryType || 'daily',
        expiryDate: itemInput.expiryDate || (itemInput.expiryType === 'multi_day' ? new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10) : input.pickupDate || new Date().toISOString().slice(0, 10)),
      };

      cartItems.push(cartItem);
    }

    const taxRate = taxApplied ? STORE_INFO.taxRate : 0;
    const taxAmount = Math.round(subtotal * taxRate);
    const total = subtotal + taxAmount;

    const totalPaid = input.payments.reduce((sum, p) => sum + p.amount, 0);
    const hasPayTomorrow = input.payments.some((p) => p.method === 'pay_tomorrow');
    if (totalPaid <= 0 && !hasPayTomorrow) {
      posSound.error();
      return { success: false, message: 'Harap masukkan pembayaran DP atau pilih metode Dibayar Besok!' };
    }

    const isUnpaid = totalPaid === 0;
    const isPartial = totalPaid < total;
    const paymentStatus: Order['paymentStatus'] = isUnpaid ? 'unpaid' : (isPartial ? 'partial' : 'paid');
    const orderStatus: Order['orderStatus'] = 'active';

    const cashComponent = input.payments.find((p) => p.method === 'cash');
    const change = cashComponent?.change || 0;

    const receiptNo = generateReceiptNumber();
    const branchName = branches.find((b) => b.id === selectedBranchId)?.name || 'Senopati Utama';
    const poNo = generatePONumber(orders, branchName);

    const newOrder: Order = {
      id: 'ORD-' + Date.now().toString().slice(-7),
      branchId: selectedBranchId,
      receiptNumber: receiptNo,
      poNumber: poNo,
      sessionId: currentSession.id,
      cashierId: currentUser.id,
      cashierName: currentUser.name,
      customer: input.customer,
      items: cartItems,
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

    // Register batches for order items so they appear in Daily Closing (Requirement 2 & 3)
    const orderBatches: ProductExpiryBatch[] = [];
    cartItems.forEach((ci, ciIdx) => {
      const expType = ci.expiryType || 'daily';
      const expDate = ci.expiryDate || (expType === 'daily' ? input.pickupDate || new Date().toISOString().slice(0, 10) : new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
      orderBatches.push({
        id: `batch-ord-${Date.now()}-${ci.productId}-${ciIdx}`,
        batchNumber: `BCH-PO-${poNo}-${ciIdx + 1}`,
        productId: ci.productId,
        productName: ci.productName,
        sku: ci.productId,
        branchId: selectedBranchId,
        branchName: branchName,
        expiryType: expType,
        expiryDate: expDate,
        initialQuantity: ci.quantity,
        remainingQuantity: ci.quantity,
        goodsReceiptId: newOrder.id,
        goodsReceiptNumber: poNo,
        receivedDate: new Date().toISOString().slice(0, 10),
        unitCost: ci.unitPrice,
        ownershipType: ci.ownershipType === 'consignment' ? 'consignment' : 'owned',
        supplierId: ci.supplierId,
        supplierName: ci.supplierName,
        category: ci.category,
        status: 'active',
        notes: `Batch PO ${poNo} (${expType === 'daily' ? 'Expired Harian' : 'Expired > 1 Hari: ' + expDate})`,
        createdAt: new Date().toISOString(),
      });
    });
    if (orderBatches.length > 0) {
      setExpiryBatches((prev) => [...orderBatches, ...prev]);
    }

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
        totalTransactions: prev.totalTransactions + (totalPaid > 0 ? 1 : 0),
        totalSales: prev.totalSales + totalPaid,
        cashSales: prev.cashSales + cashPortion,
        qrisSales: prev.qrisSales + qrisPortion,
        depositSales: prev.depositSales + depositPortion,
        expectedCash: prev.expectedCash + cashPortion,
      };
    });

    const paymentSummaryText = hasPayTomorrow
      ? `Dibayar Besok (DP Rp ${totalPaid.toLocaleString('id-ID')}, Sisa Rp ${(total - totalPaid).toLocaleString('id-ID')})`
      : `DP/Bayar: Rp ${totalPaid.toLocaleString('id-ID')}`;

    addAudit(
      'ORDER_CREATE_PO',
      'order',
      newOrder.id,
      `Membuat PO Made-to-Order baru ${poNo} (${cartItems.length} item) untuk ${input.customer.name} (Total: Rp ${total.toLocaleString('id-ID')}, ${paymentSummaryText})`
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

  // Requirement 3: Penyesuaian Kuantitas dan Tanggal Expiry Date Item Pesanan
  const updateOrderItemExpiryAndQty = (
    orderId: string,
    itemId: string,
    newQuantity: number,
    newExpiryDate: string
  ) => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) {
      posSound.error();
      return { success: false, message: 'Pesanan tidak ditemukan!' };
    }
    const targetItem = target.items.find((it) => it.id === itemId || it.productId === itemId);
    if (!targetItem) {
      posSound.error();
      return { success: false, message: 'Item produk pesanan tidak ditemukan!' };
    }

    const qty = Math.max(1, newQuantity);
    const updatedItems = target.items.map((it) => {
      if (it.id === targetItem.id) {
        return {
          ...it,
          quantity: qty,
          expiryType: 'multi_day' as ProductExpiryType,
          expiryDate: newExpiryDate,
        };
      }
      return it;
    });

    const newSubtotal = updatedItems.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
    const taxAmt = target.taxApplied ? Math.round(newSubtotal * (target.taxRate || 0.11)) : 0;
    const newTotal = newSubtotal + taxAmt;

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              items: updatedItems,
              subtotal: newSubtotal,
              taxAmount: taxAmt,
              total: newTotal,
              remainingBalance: Math.max(0, newTotal - o.paidAmount),
            }
          : o
      )
    );

    // Sync or register batch in ProductExpiryBatch so it appears in Closing Harian!
    const batchId = `batch-po-${target.id}-${targetItem.productId}`;
    const nowStr = new Date().toISOString();
    setExpiryBatches((prev) => {
      const existingIdx = prev.findIndex(
        (b) => b.id === batchId || (b.goodsReceiptId === target.id && b.productId === targetItem.productId)
      );
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = {
          ...copy[existingIdx],
          expiryType: 'multi_day',
          expiryDate: newExpiryDate,
          initialQuantity: qty,
          remainingQuantity: qty,
          status: 'active',
          notes: `Penyesuaian kuantitas (${qty} pcs) & Tanggal Expiry (${newExpiryDate})`,
        };
        return copy;
      } else {
        const newBatch: ProductExpiryBatch = {
          id: batchId,
          batchNumber: `BCH-PO-${target.poNumber || target.receiptNumber}`,
          productId: targetItem.productId,
          productName: targetItem.productName,
          sku: targetItem.productId,
          branchId: selectedBranchId,
          branchName: selectedBranch.name,
          expiryType: 'multi_day',
          expiryDate: newExpiryDate,
          initialQuantity: qty,
          remainingQuantity: qty,
          goodsReceiptId: target.id,
          goodsReceiptNumber: target.poNumber || target.receiptNumber,
          receivedDate: nowStr.slice(0, 10),
          unitCost: targetItem.unitPrice,
          ownershipType: targetItem.ownershipType === 'consignment' ? 'consignment' : 'owned',
          supplierId: targetItem.supplierId,
          supplierName: targetItem.supplierName,
          category: targetItem.category,
          status: 'active',
          notes: `Batch Penyesuaian Pesanan (${target.poNumber || target.receiptNumber}) - Exp: ${newExpiryDate}`,
          createdAt: nowStr,
        };
        return [newBatch, ...prev];
      }
    });

    addAudit(
      'PO_ITEM_EXPIRY_UPDATE',
      'order',
      orderId,
      `Penyesuaian item PO ${target.poNumber || target.receiptNumber}: ${targetItem.productName}, Kuantitas: ${qty} pcs, Expiry Date: ${newExpiryDate} oleh ${currentUser.name}`
    );

    posSound.beep();
    return {
      success: true,
      message: `Kuantitas (${qty} pcs) & Tanggal Expiry (${newExpiryDate}) untuk ${targetItem.productName} berhasil diperbarui dan muncul di Closing Harian!`,
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
  return {
    createMtoOrder,
    settleMadeToOrder,
    updatePoPickupTime,
    updateOrderItemExpiryAndQty,
    settlePoPayment,
    markPoReadyForPickup,
    confirmPoPickup,
    cancelPoWithSupervisor,
    duplicatePoToCart,
  };
}
