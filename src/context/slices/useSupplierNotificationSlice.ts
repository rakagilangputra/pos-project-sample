import { useEffect, useState } from 'react';
import {
  NotificationDeliveryResult,
  Order,
  Product,
  StoreBranch,
  Supplier,
  SupplierDeliveryLogEntry,
  SupplierNotificationBatch,
  User,
} from '../../types';
import {
  INITIAL_SUPPLIER_DELIVERY_LOGS,
  INITIAL_SUPPLIER_NOTIFICATION_BATCHES,
  STORE_INFO,
} from '../../data/mockData';
import { posSound } from '../../utils/formatters';
import type { AddAuditFn } from './sliceTypes';

interface UseSupplierNotificationSliceDeps {
  currentUser: User;
  suppliers: Supplier[];
  orders: Order[];
  products: Product[];
  selectedBranch: StoreBranch;
  addAudit: AddAuditFn;
}

/**
 * Supplier WhatsApp notification slice (POS-US-059 to POS-US-063).
 *
 * Owns the notification batches and delivery logs (state + persistence) plus the
 * WhatsApp message generator and the send/resend actions. Extracted verbatim
 * from POSContext.
 */
export function useSupplierNotificationSlice({
  currentUser,
  suppliers,
  orders,
  products,
  selectedBranch,
  addAudit,
}: UseSupplierNotificationSliceDeps) {
  // POS-US-059 to POS-US-063: Supplier Notification Batches & Delivery Logs
  const [supplierNotificationBatches, setSupplierNotificationBatches] = useState<SupplierNotificationBatch[]>(() => {
    const saved = localStorage.getItem('pos_supplier_batches');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const seen = new Set<string>();
          const list: SupplierNotificationBatch[] = [];
          for (const b of parsed) {
            if (b && b.id) {
              seen.add(b.id);
              list.push(b);
            }
          }
          for (const init of INITIAL_SUPPLIER_NOTIFICATION_BATCHES) {
            if (!seen.has(init.id)) {
              seen.add(init.id);
              list.push(init);
            }
          }
          return list;
        }
      } catch {}
    }
    return INITIAL_SUPPLIER_NOTIFICATION_BATCHES;
  });

  useEffect(() => {
    localStorage.setItem('pos_supplier_batches', JSON.stringify(supplierNotificationBatches));
  }, [supplierNotificationBatches]);

  const [supplierDeliveryLogs, setSupplierDeliveryLogs] = useState<SupplierDeliveryLogEntry[]>(() => {
    const saved = localStorage.getItem('pos_supplier_delivery_logs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const seen = new Set<string>();
          const list: SupplierDeliveryLogEntry[] = [];
          for (const l of parsed) {
            if (l && l.id) {
              seen.add(l.id);
              list.push(l);
            }
          }
          for (const init of INITIAL_SUPPLIER_DELIVERY_LOGS) {
            if (!seen.has(init.id)) {
              seen.add(init.id);
              list.push(init);
            }
          }
          return list;
        }
      } catch {}
    }
    return INITIAL_SUPPLIER_DELIVERY_LOGS;
  });

  useEffect(() => {
    localStorage.setItem('pos_supplier_delivery_logs', JSON.stringify(supplierDeliveryLogs));
  }, [supplierDeliveryLogs]);

  // POS-US-059 to POS-US-063: Supplier WhatsApp Order Notifications
  const generateSupplierWhatsAppMessage = (
    supplier: Supplier,
    ordersToInclude: Order[]
  ): string => {
    const todayStr = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const storeName = STORE_INFO.name;
    const branchName = selectedBranch?.name || STORE_INFO.branch;

    const orderLines = ordersToInclude.map((order) => {
      // Find consignment/supplier items belonging to this supplier
      const itemsForSupplier = order.items.filter((item) => {
        const prod = products.find((p) => p.id === item.productId);
        const itemSupplierId = item.supplierId || prod?.supplierId;
        const matchesSupplier = itemSupplierId === supplier.id && supplier.id !== 'internal';
        const isConsignment = (item.ownershipType === 'consignment') || (prod?.ownershipType === 'consignment') || Boolean(item.supplierId || prod?.supplierId);
        return matchesSupplier && isConsignment;
      });

      const itemDetails = itemsForSupplier
        .map((i) => `  - ${i.quantity}x ${i.productName}`)
        .join('\n');

      const refNumber = order.poNumber || order.receiptNumber;
      return `• *Nota/PO ${refNumber}* (Pelanggan: ${order.customer.name}):\n${itemDetails}`;
    });

    const totalQty = ordersToInclude.reduce((sum, order) => {
      const itemsForSupplier = order.items.filter((item) => {
        const prod = products.find((p) => p.id === item.productId);
        const itemSupplierId = item.supplierId || prod?.supplierId;
        const matchesSupplier = itemSupplierId === supplier.id && supplier.id !== 'internal';
        const isConsignment = (item.ownershipType === 'consignment') || (prod?.ownershipType === 'consignment') || Boolean(item.supplierId || prod?.supplierId);
        return matchesSupplier && isConsignment;
      });
      return sum + itemsForSupplier.reduce((iSum, item) => iSum + item.quantity, 0);
    }, 0);

    return (
      `Halo *${supplier.name}* (PIC: ${supplier.picName || 'Bapak/Ibu'}),\n\n` +
      `Berikut rekap pesanan produk konsinyasi (*Kue Titipan*) hari ini (${todayStr}) di *${storeName} - ${branchName}*:\n\n` +
      `${orderLines.join('\n\n')}\n\n` +
      `Total Produk Konsinyasi: *${totalQty} item/pcs*.\n` +
      `Mohon segera disiapkan sesuai pesanan di atas. Terima kasih atas kerja samanya!\n\n` +
      `— *${storeName}*`
    );
  };

  const sendSupplierWhatsAppNotification = (
    supplierId: string,
    orderIds: string[],
    simulationOutcome: NotificationDeliveryResult = 'success',
    customErrorMessage?: string
  ) => {
    if (currentUser.role === 'cashier') {
      posSound.error();
      return {
        success: false,
        result: 'failed' as NotificationDeliveryResult,
        message: 'Akses ditolak: Hanya Supervisor atau Superadmin yang dapat mengirim notifikasi WhatsApp.',
      };
    }

    const supplier = suppliers.find((s) => s.id === supplierId);
    if (!supplier) {
      posSound.error();
      return {
        success: false,
        result: 'failed' as NotificationDeliveryResult,
        message: 'Data supplier tidak ditemukan.',
      };
    }

    if (!supplier.phone || supplier.phone.trim() === '') {
      posSound.error();
      return {
        success: false,
        result: 'failed' as NotificationDeliveryResult,
        message: `Nomor telepon WhatsApp supplier ${supplier.name} belum terdaftar. Harap lengkapi pada master supplier.`,
      };
    }

    const matchingOrders = orders.filter((o) => orderIds.includes(o.id));
    if (matchingOrders.length === 0) {
      posSound.error();
      return {
        success: false,
        result: 'failed' as NotificationDeliveryResult,
        message: 'Tidak ada pesanan valid yang dipilih untuk dikirimkan.',
      };
    }

    const messageText = generateSupplierWhatsAppMessage(supplier, matchingOrders);
    const dateCode = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const supplierCode = supplier.id.replace('sup-', 'SUP').toUpperCase();
    const batchSeq = String(supplierNotificationBatches.filter((b) => b.supplierId === supplier.id).length + 1).padStart(2, '0');
    const batchId = `BATCH-${supplierCode}-${dateCode}-${batchSeq}`;

    const nowIso = new Date().toISOString();
    const isSuccess = simulationOutcome === 'success';

    let errorReason = customErrorMessage;
    if (!isSuccess && !errorReason) {
      if (simulationOutcome === 'no_internet') {
        errorReason = 'Gangguan koneksi internet gateway WhatsApp (Connection Timeout 504)';
      } else if (simulationOutcome === 'failed') {
        errorReason = 'Gagal mengirim pesan WhatsApp: Layanan gateway sibuk atau nomor tujuan tidak terjangkau (HTTP 400)';
      } else {
        errorReason = 'WhatsApp Gateway Response: Unrecognized status code / temporary rejection';
      }
    }

    const newBatch: SupplierNotificationBatch = {
      id: batchId,
      supplierId: supplier.id,
      supplierName: supplier.name,
      supplierPhone: supplier.phone,
      orderIds,
      status: simulationOutcome,
      createdAt: nowIso,
      sentAt: isSuccess ? nowIso : undefined,
      sentBy: `${currentUser.name} (${currentUser.role === 'admin' ? 'Superadmin' : 'Supervisor'})`,
      attemptsCount: 1,
      lastAttemptResult: simulationOutcome,
      lastAttemptAt: nowIso,
      lastErrorMessage: errorReason,
    };

    const newLog: SupplierDeliveryLogEntry = {
      id: 'LOG-' + Date.now().toString().slice(-7),
      batchId,
      supplierId: supplier.id,
      supplierName: supplier.name,
      supplierPhone: supplier.phone,
      orderIds,
      orderReceipts: matchingOrders.map((o) => o.poNumber || o.receiptNumber),
      attemptType: 'send',
      result: simulationOutcome,
      messageText,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      timestamp: nowIso,
      errorMessage: errorReason,
      rawResponse: simulationOutcome === 'no_internet'
        ? 'HTTP 504 GATEWAY_TIMEOUT: Route to api.whatsapp.com unreachable'
        : simulationOutcome === 'failed'
        ? 'HTTP 400 BAD_REQUEST: Delivery failed at recipient gateway'
        : simulationOutcome === 'other'
        ? 'HTTP 429 TOO_MANY_REQUESTS: Rate limit exceeded on provider'
        : 'HTTP 200 OK: message_id=wamid.HBgM...',
    };

    setSupplierNotificationBatches((prev) => [newBatch, ...prev]);
    setSupplierDeliveryLogs((prev) => [newLog, ...prev]);

    // Record Audit
    addAudit(
      'NOTIFICATION_SEND',
      'supplier',
      supplier.id,
      `Kirim notifikasi WhatsApp ke ${supplier.name} (${matchingOrders.length} pesanan, Batch: ${batchId}) - Hasil: ${simulationOutcome.toUpperCase()}`
    );

    if (isSuccess) {
      posSound.success();
      return {
        success: true,
        result: 'success',
        batchId,
        message: `Pesan WhatsApp berhasil dikirim ke ${supplier.name} (${supplier.phone}) untuk ${matchingOrders.length} pesanan.`,
      };
    } else {
      posSound.error();
      return {
        success: false,
        result: simulationOutcome,
        batchId,
        message: `Pengiriman WhatsApp ke ${supplier.name} tidak berhasil: ${errorReason}. Pesanan tetap ditandai belum terkirim.`,
      };
    }
  };

  const resendSupplierWhatsAppNotification = (
    batchId: string,
    simulationOutcome: NotificationDeliveryResult = 'success',
    customErrorMessage?: string
  ) => {
    if (currentUser.role === 'cashier') {
      posSound.error();
      return {
        success: false,
        result: 'failed' as NotificationDeliveryResult,
        message: 'Akses ditolak: Hanya Supervisor atau Superadmin yang diizinkan mengirim ulang notifikasi WhatsApp.',
      };
    }

    const batch = supplierNotificationBatches.find((b) => b.id === batchId);
    if (!batch) {
      posSound.error();
      return {
        success: false,
        result: 'failed' as NotificationDeliveryResult,
        message: 'Batch tidak ditemukan.',
      };
    }

    const supplier = suppliers.find((s) => s.id === batch.supplierId);
    if (!supplier) {
      posSound.error();
      return {
        success: false,
        result: 'failed' as NotificationDeliveryResult,
        message: 'Supplier tidak ditemukan.',
      };
    }

    if (!supplier.phone || supplier.phone.trim() === '') {
      posSound.error();
      return {
        success: false,
        result: 'failed' as NotificationDeliveryResult,
        message: `Nomor telepon WhatsApp supplier ${supplier.name} tidak valid.`,
      };
    }

    const matchingOrders = orders.filter((o) => batch.orderIds.includes(o.id));
    const messageText = generateSupplierWhatsAppMessage(supplier, matchingOrders);
    const nowIso = new Date().toISOString();
    const isSuccess = simulationOutcome === 'success';

    let errorReason = customErrorMessage;
    if (!isSuccess && !errorReason) {
      if (simulationOutcome === 'no_internet') {
        errorReason = 'Gangguan koneksi internet gateway WhatsApp (Connection Timeout 504)';
      } else if (simulationOutcome === 'failed') {
        errorReason = 'Gagal mengirim pesan WhatsApp: Nomor tujuan tidak terjangkau (HTTP 400)';
      } else {
        errorReason = 'WhatsApp Gateway Response: Other API error';
      }
    }

    setSupplierNotificationBatches((prev) =>
      prev.map((b) => {
        if (b.id !== batchId) return b;
        return {
          ...b,
          status: isSuccess ? 'success' : (b.status === 'success' ? 'success' : simulationOutcome),
          sentAt: isSuccess ? nowIso : b.sentAt,
          sentBy: `${currentUser.name} (${currentUser.role === 'admin' ? 'Superadmin' : 'Supervisor'})`,
          attemptsCount: b.attemptsCount + 1,
          lastAttemptResult: simulationOutcome,
          lastAttemptAt: nowIso,
          lastErrorMessage: isSuccess ? undefined : errorReason,
          supplierPhone: supplier.phone,
        };
      })
    );

    const newLog: SupplierDeliveryLogEntry = {
      id: 'LOG-' + Date.now().toString().slice(-7),
      batchId: batch.id,
      supplierId: supplier.id,
      supplierName: supplier.name,
      supplierPhone: supplier.phone,
      orderIds: batch.orderIds,
      orderReceipts: matchingOrders.map((o) => o.poNumber || o.receiptNumber),
      attemptType: 'resend',
      result: simulationOutcome,
      messageText,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      timestamp: nowIso,
      errorMessage: errorReason,
      rawResponse: simulationOutcome === 'no_internet'
        ? 'HTTP 504 GATEWAY_TIMEOUT: Route to api.whatsapp.com unreachable'
        : simulationOutcome === 'failed'
        ? 'HTTP 400 BAD_REQUEST: Delivery failed at recipient gateway'
        : simulationOutcome === 'other'
        ? 'HTTP 500 INTERNAL_ERROR: Unknown gateway response'
        : 'HTTP 200 OK: message_id=wamid.HBgM...',
    };

    setSupplierDeliveryLogs((prev) => [newLog, ...prev]);

    // Record Audit
    addAudit(
      'NOTIFICATION_RESEND',
      'supplier',
      supplier.id,
      `Kirim ulang notifikasi WhatsApp ke ${supplier.name} (Batch: ${batchId}, Percobaan ke-${batch.attemptsCount + 1}) - Hasil: ${simulationOutcome.toUpperCase()}`
    );

    if (isSuccess) {
      posSound.success();
      return {
        success: true,
        result: 'success',
        message: `Kirim ulang WhatsApp ke ${supplier.name} (${supplier.phone}) berhasil dilakukan.`,
      };
    } else {
      posSound.error();
      return {
        success: false,
        result: simulationOutcome,
        message: `Kirim ulang WhatsApp ke ${supplier.name} gagal: ${errorReason}.`,
      };
    }
  };

  return {
    supplierNotificationBatches,
    supplierDeliveryLogs,
    sendSupplierWhatsAppNotification,
    resendSupplierWhatsAppNotification,
    generateSupplierWhatsAppMessage,
  };
}
