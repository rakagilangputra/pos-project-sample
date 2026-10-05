import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { posSound } from '../../utils/formatters';
import {
  INITIAL_BAD_STOCKS,
  INITIAL_EXPIRY_BATCHES,
  INITIAL_STOCK_TRANSFERS,
} from '../../data/mockData';
import type {
  BadStockRecord,
  Product,
  ProductExpiryBatch,
  StockAdjustmentRecord,
  StockTransferRecord,
  StoreBranch,
  User,
} from '../../types';
import type { AddAuditFn } from './sliceTypes';

interface UseInventorySliceDeps {
  branches: StoreBranch[];
  selectedBranchId: string;
  selectedBranch: StoreBranch;
  currentUser: User;
  isBranchReadOnly: boolean;
  products: Product[];
  setProducts: Dispatch<SetStateAction<Product[]>>;
  setStockAdjustments: Dispatch<SetStateAction<StockAdjustmentRecord[]>>;
  addAudit: AddAuditFn;
}

/**
 * Inventory slice of the POS store.
 *
 * Owns: expiry batches (FEFO), stock transfers and bad-stock records with their
 * localStorage persistence, plus the actions for creating/receiving transfers,
 * recording bad stock and destroying expired batches. Extracted verbatim from
 * POSContext.
 *
 * Wired between the session and cart slices: the cart consumes `setExpiryBatches`,
 * and the inventory actions only need org/catalog/audit state.
 */
export function useInventorySlice({
  branches,
  selectedBranchId,
  selectedBranch,
  currentUser,
  isBranchReadOnly,
  products,
  setProducts,
  setStockAdjustments,
  addAudit,
}: UseInventorySliceDeps) {
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

  return {
    expiryBatches,
    setExpiryBatches,
    stockTransfers,
    badStocks,
    createStockTransfer,
    receiveStockTransfer,
    recordBadStock,
    destroyExpiredBatches,
  };
}
