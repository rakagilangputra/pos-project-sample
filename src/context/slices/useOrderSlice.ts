import { useRef, type Dispatch, type SetStateAction } from 'react';
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
  customers: Customer[];
  products: Product[];
  setActiveReceiptOrder: (order: Order | null) => void;
  addAudit: AddAuditFn;
  setCurrentSession: Dispatch<SetStateAction<CashierSession | null>>;
  setCustomers: Dispatch<SetStateAction<Customer[]>>;
  setExpiryBatches: Dispatch<SetStateAction<ProductExpiryBatch[]>>;
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
  customers,
  products,
  setActiveReceiptOrder,
  addAudit,
  setCurrentSession,
  setCustomers,
  setExpiryBatches,
  setOrders,
  setProducts,
  setStockAdjustments,
}: UseOrderSliceDeps) {
  const processedCancellations = useRef(new Set<string>());
  const processedPickups = useRef(new Set<string>());
  const processedPayments = useRef(new Set<string>());
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
    if (selectedBranch.status === 'inactive' || (currentSession.branchId && currentSession.branchId !== selectedBranchId) || (input.customer.branchId && input.customer.branchId !== selectedBranchId) || input.customer.category === 'Walk-in') {
      return { success: false, message: 'Pilih pelanggan bernama pada cabang aktif.' };
    }
    const pickupAt = new Date(`${input.pickupDate}T${input.pickupTime}:00`);
    if (!input.pickupDate || !input.pickupTime || !Number.isFinite(pickupAt.getTime()) || pickupAt.getTime() < Date.now()) {
      return { success: false, message: 'Jadwal ambil harus berada di masa depan.' };
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
      if (!product.isMadeToOrder || product.status === 'inactive' || (product.branchId && product.branchId !== selectedBranchId)) {
        return { success: false, message: 'Pilih produk MTO aktif dari cabang saat ini.' };
      }
      if (!Number.isInteger(itemInput.quantity) || itemInput.quantity <= 0) {
        posSound.error();
        return { success: false, message: `Jumlah pesanan untuk "${product.name}" harus lebih dari 0` };
      }

      const unitPrice =
        itemInput.customPrice !== undefined && itemInput.customPrice >= 0
          ? itemInput.customPrice
          : product.price;
      if (!Number.isFinite(unitPrice) || unitPrice < 0) return { success: false, message: 'Harga produk tidak valid.' };

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
        ownershipType: itemInput.ownershipType || product.ownershipType || 'own',
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

    if (input.payments.length > 1 || input.payments.some((p) => !Number.isFinite(p.amount) || p.amount <= 0 || p.method === 'pay_tomorrow')) {
      return { success: false, message: 'Gunakan satu metode untuk pembayaran awal yang valid, atau simpan tanpa pembayaran.' };
    }
    const totalPaid = input.payments.reduce((sum, p) => sum + p.amount, 0);
    if (totalPaid > total) return { success: false, message: 'Pembayaran melebihi total PO.' };
    if (input.payments[0]?.method === 'deposit' && (customers.find((c) => c.id === input.customer.id)?.depositBalance ?? 0) < totalPaid) {
      return { success: false, message: 'Saldo deposit pelanggan tidak mencukupi.' };
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
    if (input.payments[0]?.method === 'deposit') {
      setCustomers((prev) => prev.map((c) => c.id === input.customer.id ? { ...c, depositBalance: c.depositBalance - totalPaid } : c));
    }

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
        totalTransactions: prev.totalTransactions + 1,
        totalSales: prev.totalSales + totalPaid,
        cashSales: prev.cashSales + cashPortion,
        qrisSales: prev.qrisSales + qrisPortion,
        depositSales: prev.depositSales + depositPortion,
        expectedCash: prev.expectedCash + cashPortion,
      };
    });

    const paymentSummaryText = totalPaid === 0
      ? `Belum dibayar (Sisa Rp ${total.toLocaleString('id-ID')})`
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
  const settleMadeToOrder = (orderId: string, payment: PaymentComponent) => settlePoPayment(orderId, [payment]);

  // MTO Purchase Order (PO) Management
  const updatePoPickupSchedule = (orderId: string, newDate: string, newTime: string) => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) {
      posSound.error();
      return { success: false, message: 'Pesanan tidak ditemukan' };
    }
    if (!target.isMadeToOrder || (target.branchId && target.branchId !== selectedBranchId) || selectedBranch.status === 'inactive' || !['active', 'ready_for_pickup', 'overdue'].includes(target.orderStatus)) {
      posSound.error();
      return { success: false, message: 'Jam ambil pesanan yang sudah selesai atau batal tidak dapat diubah!' };
    }
    const scheduledAt = new Date(`${newDate}T${newTime}:00`);
    if (!newDate || !newTime || !Number.isFinite(scheduledAt.getTime()) || scheduledAt.getTime() < Date.now()) {
      posSound.error();
      return { success: false, message: 'Jam pengambilan baru wajib diisi!' };
    }

    const prevTime = target.pickupTime || '00:00';
    const now = new Date().toISOString();

    const historyEntry = {
      previousDate: target.pickupDate || '',
      newDate,
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
              pickupDate: newDate,
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
      `Perubahan jadwal ambil PO ${target.poNumber || target.receiptNumber} dari ${target.pickupDate} ${prevTime} ke ${newDate} ${newTime.trim()} oleh ${currentUser.name}`
    );

    posSound.beep();
    return {
      success: true,
      message: `Jadwal pengambilan berhasil diubah menjadi ${newDate} ${newTime.trim()}!`,
    };
  };
  const updatePoPickupTime = (orderId: string, newTime: string) => updatePoPickupSchedule(orderId, orders.find((o) => o.id === orderId)?.pickupDate || '', newTime);

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
    if (target.isMadeToOrder) return { success: false, message: 'Item PO MTO yang sudah disimpan tidak dapat diubah.' };
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
    if (!target.isMadeToOrder || (target.branchId && target.branchId !== selectedBranchId) || selectedBranch.status === 'inactive' || !['active', 'ready_for_pickup', 'overdue'].includes(target.orderStatus)) {
      posSound.error();
      return { success: false, message: 'Pesanan yang selesai atau batal tidak dapat dilakukan pelunasan!' };
    }
    if (newPayments.length !== 1 || newPayments[0].method === 'pay_tomorrow' || !Number.isFinite(newPayments[0].amount) || newPayments[0].amount <= 0 || newPayments[0].amount > target.remainingBalance) {
      return { success: false, message: 'Gunakan satu metode dan nominal tidak melebihi sisa tagihan.' };
    }
    if (newPayments[0].method === 'deposit') {
      const customer = customers.find((c) => c.id === target.customer.id);
      if (!customer || customer.depositBalance < newPayments[0].amount) return { success: false, message: 'Saldo deposit tidak mencukupi.' };
    }
    const paymentKey = `${orderId}:${target.paidAmount}`;
    if (processedPayments.current.has(paymentKey)) return { success: false, message: 'Pembayaran ini sudah diproses.' };
    processedPayments.current.add(paymentKey);

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
    if (!target.isMadeToOrder || (target.branchId && target.branchId !== selectedBranchId) || selectedBranch.status === 'inactive' || !['active', 'overdue'].includes(target.orderStatus)) {
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
    if (processedPickups.current.has(orderId)) return { success: false, message: 'Pengambilan PO sudah diproses.' };
    const target = orders.find((o) => o.id === orderId);
    if (!target) {
      posSound.error();
      return { success: false, message: 'Pesanan tidak ditemukan' };
    }
    if (!target.isMadeToOrder || (target.branchId && target.branchId !== selectedBranchId) || selectedBranch.status === 'inactive' || target.orderStatus !== 'ready_for_pickup') {
      posSound.error();
      return { success: false, message: 'Hanya PO Siap Diambil pada cabang aktif yang dapat diserahkan.' };
    }
    if (!collectorName.trim()) {
      posSound.error();
      return { success: false, message: 'Nama pengambil pesanan wajib diisi!' };
    }
    if (target.remainingBalance > 0) return { success: false, message: 'Lunasi seluruh sisa tagihan sebelum konfirmasi pengambilan.' };
    processedPickups.current.add(orderId);

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
    if (processedCancellations.current.has(orderId)) return { success: false, message: 'Pembatalan PO sudah diproses.' };
    const target = orders.find((o) => o.id === orderId);
    if (!target) {
      posSound.error();
      return { success: false, message: 'Pesanan tidak ditemukan' };
    }
    if (!target.isMadeToOrder || (target.branchId && target.branchId !== selectedBranchId) || selectedBranch.status === 'inactive' || !['active', 'overdue'].includes(target.orderStatus)) {
      posSound.error();
      return { success: false, message: 'Hanya PO aktif pada cabang ini yang dapat dibatalkan.' };
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
    processedCancellations.current.add(orderId);

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
              paymentStatus: o.paymentStatus,
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

  return {
    createMtoOrder,
    settleMadeToOrder,
    updatePoPickupTime,
    updatePoPickupSchedule,
    updateOrderItemExpiryAndQty,
    settlePoPayment,
    markPoReadyForPickup,
    confirmPoPickup,
    cancelPoWithSupervisor,
  };
}
