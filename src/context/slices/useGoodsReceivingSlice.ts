import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { posSound } from '../../utils/formatters';
import { INITIAL_GOODS_RECEIPTS, INITIAL_PURCHASE_PLANS } from '../../data/mockData';
import type {
  GoodsReceiptRecord,
  MasterCategory,
  Product,
  ProductExpiryBatch,
  PurchasePlan,
  PurchasePlanStatus,
  PurchasePlanItemType,
  PurchasePlanProductLine,
  RawMaterial,
  ReceivingDraft,
  StockAdjustmentRecord,
  StockTransferRecord,
  StoreBranch,
  Supplier,
  User,
} from '../../types';
import type { AddAuditFn } from './sliceTypes';

interface UseGoodsReceivingSliceDeps {
  branches: StoreBranch[];
  selectedBranchId: string;
  selectedBranch: StoreBranch;
  currentUser: User;
  products: Product[];
  setProducts: Dispatch<SetStateAction<Product[]>>;
  masterCategories: MasterCategory[];
  suppliers: Supplier[];
  rawMaterials: RawMaterial[];
  stockTransfers: StockTransferRecord[];
  setExpiryBatches: Dispatch<SetStateAction<ProductExpiryBatch[]>>;
  setStockAdjustments: Dispatch<SetStateAction<StockAdjustmentRecord[]>>;
  setRawMaterials: Dispatch<SetStateAction<RawMaterial[]>>;
  addAudit: AddAuditFn;
}

/**
 * Goods receiving / purchasing slice of the POS store.
 *
 * Owns: goods receipts, the receiving draft and purchase plans (with their
 * localStorage persistence), plus `submitGoodsReceipt` and the purchase-plan
 * lifecycle - add, update, cancel, lock for receipt and unlock back to
 * planned. Extracted verbatim from POSContext.
 *
 * Wired last: receiving needs the inventory slice (`setExpiryBatches`,
 * `stockTransfers`) and the catalog slice (`setRawMaterials`), both of which sit
 * upstream. `goodsReceipts` is returned because branch views and
 * `getStockHistory` read it.
 */
export function useGoodsReceivingSlice({
  branches,
  selectedBranchId,
  selectedBranch,
  currentUser,
  products,
  setProducts,
  masterCategories,
  suppliers,
  rawMaterials,
  stockTransfers,
  setExpiryBatches,
  setStockAdjustments,
  setRawMaterials,
  addAudit,
}: UseGoodsReceivingSliceDeps) {
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

  // POS-US-073, POS-US-074, POS-US-075: Reseller purchase planning
  const [purchasePlans, setPurchasePlans] = useState<PurchasePlan[]>(() => {
    const saved = localStorage.getItem('pos_purchase_plans_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((plan: PurchasePlan) => ({
            ...plan,
            status: plan.status === ('Terkait Penerimaan' as PurchasePlanStatus) ? 'Direncanakan' : plan.status,
            receivingLocked: plan.receivingLocked || plan.status === ('Terkait Penerimaan' as PurchasePlanStatus),
          }));
        }
      } catch {}
    }
    return INITIAL_PURCHASE_PLANS;
  });

  useEffect(() => {
    localStorage.setItem('pos_purchase_plans_v1', JSON.stringify(purchasePlans));
  }, [purchasePlans]);

  const mainBranch = branches.find((branch) => branch.isMainBranch)
    || branches.find((branch) => branch.id === 'branch-senopati')
    || branches.find((branch) => branch.status === 'active')
    || branches[0];

  // Submit Goods Receipt (POS-US-059, POS-US-060, POS-US-061)
  const submitGoodsReceipt = (
    receiptData: Omit<GoodsReceiptRecord, 'id' | 'receiptNumber' | 'stockMovementRef' | 'createdAt' | 'status'>
  ) => {
    // 1. Validation
    const linkedPlan = receiptData.purchasePlanId
      ? purchasePlans.find((plan) => plan.id === receiptData.purchasePlanId)
      : undefined;
    if (linkedPlan && (!mainBranch || selectedBranchId !== mainBranch.id)) {
      posSound.error();
      return { success: false, message: `Rencana reseller hanya dapat diterima di ${mainBranch?.name || 'Cabang Utama'}!` };
    }
    if (linkedPlan && linkedPlan.status !== 'Direncanakan') {
      posSound.error();
      return { success: false, message: `Rencana ${linkedPlan.id} sudah tidak berstatus Direncanakan.` };
    }
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
      if (linkedPlan) {
        const product = products.find((candidate) => candidate.id === item.productId);
        const supplier = product?.supplierId ? suppliers.find((candidate) => candidate.id === product.supplierId) : undefined;
        const categoryId = product?.masterCategoryId || supplier?.masterCategoryId;
        const category = categoryId ? masterCategories.find((candidate) => candidate.id === categoryId) : undefined;
        if (!product || !supplier || category?.categoryType !== 'BELI (RESELLER)') {
          posSound.error();
          return { success: false, message: `SKU ${item.productName || item.productId} bukan produk reseller yang valid.` };
        }
        const mainCatalogProduct = products.find((candidate) => candidate.branchId === mainBranch?.id && (candidate.sku === item.productSku || candidate.name === item.productName));
        if (!mainCatalogProduct) {
          posSound.error();
          return { success: false, message: `SKU ${item.productName || item.productId} belum memiliki master produk di Cabang Utama.` };
        }
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
      branchId: linkedPlan ? mainBranch!.id : selectedBranchId,
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
      const pIdx = linkedPlan
        ? updatedProducts.findIndex((p) => p.branchId === mainBranch!.id && (p.sku === item.productSku || p.name === item.productName))
        : updatedProducts.findIndex((p) => p.id === item.productId);
      if (pIdx >= 0) {
        const prevStock = updatedProducts[pIdx].stock;
        const newStock = prevStock + item.quantityReceived;
        updatedProducts[pIdx] = {
          ...updatedProducts[pIdx],
          stock: newStock,
        };

        newStockAdjustments.push({
          id: `adj-rcv-${Date.now()}-${item.productId}`,
          productId: pIdx >= 0 ? updatedProducts[pIdx].id : item.productId,
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
      const prod = linkedPlan
        ? updatedProducts.find((p) => p.branchId === mainBranch!.id && (p.sku === item.productSku || p.name === item.productName))
        : updatedProducts.find((p) => p.id === item.productId);
      if (prod) {
        if (item.expiryBatches && item.expiryBatches.length > 0) {
          item.expiryBatches.forEach((b, bIdx) => {
            const batchQty = Number(b.quantity) || 0;
            if (batchQty > 0) {
              const expType = prod.expiryType || (b.expiryDate === (receiptData.arrivalDate || now.toISOString().slice(0, 10)) ? 'daily' : 'multi_day');
              newBatches.push({
                id: `batch-${Date.now()}-${item.productId}-${bIdx}-${Math.random().toString(36).slice(2, 6)}`,
                batchNumber: b.batchNumber || `BCH-${receiptNumber}-${bIdx + 1}`,
                productId: prod.id,
                productName: item.productName || prod.name,
                sku: item.productSku || prod.sku,
                branchId: linkedPlan ? mainBranch!.id : selectedBranchId,
                branchName: linkedPlan ? mainBranch!.name : selectedBranch.name,
                expiryType: expType,
                expiryDate: b.expiryDate || now.toISOString().slice(0, 10),
                initialQuantity: batchQty,
                remainingQuantity: batchQty,
                goodsReceiptId: id,
                goodsReceiptNumber: receiptNumber,
                receivedDate: receiptData.arrivalDate || now.toISOString().slice(0, 10),
                unitCost: item.actualBuyPrice || item.buyPrice || 0,
                // `Product.ownershipType` is 'own'|'consignment' while
                // `ProductExpiryBatch.ownershipType` is 'owned'|'consignment'.
                // Normalize instead of casting, matching useOrderSlice. The
                // `||` fallback is kept so a falsy product value still falls
                // back to the receipt type.
                ownershipType: (prod.ownershipType || (receiptData.receiptType === 'Konsinyasi' ? 'consignment' : 'owned')) === 'consignment' ? 'consignment' : 'owned',
                supplierId: item.supplierId || receiptData.supplierId,
                supplierName: item.supplierName || receiptData.supplierName,
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
            productId: prod.id,
            productName: item.productName || prod.name,
            sku: item.productSku || prod.sku,
            branchId: linkedPlan ? mainBranch!.id : selectedBranchId,
            branchName: linkedPlan ? mainBranch!.name : selectedBranch.name,
            expiryType: expType,
            expiryDate: defaultExp,
            initialQuantity: item.quantityReceived,
            remainingQuantity: item.quantityReceived,
            goodsReceiptId: id,
            goodsReceiptNumber: receiptNumber,
            receivedDate: receiptData.arrivalDate || now.toISOString().slice(0, 10),
            unitCost: item.actualBuyPrice || item.buyPrice || 0,
            // Normalize 'own' -> 'owned'; see the note on the batch above.
            ownershipType: (prod.ownershipType || (receiptData.receiptType === 'Konsinyasi' ? 'consignment' : 'owned')) === 'consignment' ? 'consignment' : 'owned',
            supplierId: item.supplierId || receiptData.supplierId,
            supplierName: item.supplierName || receiptData.supplierName,
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
              receivingLocked: false,
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
  // Superadmin only - centralized reseller purchasing; no stock edits at plan creation
  // =========================================================================

  // Create Purchase Plan (Superadmin Only)
  const addPurchasePlan = (data: {
    namaRencana: string;
    lines: {
      productId: string;
      plannedQuantity: number;
      plannedBuyPrice: number;
      pickupDate: string;
      sourceBranchIds?: string[];
      sourceBranchNames?: string[];
      sourceOrderIds?: string[];
      masterCategoryId?: string;
      itemType?: PurchasePlanItemType;
      sourcePoRef?: string;
      supplierId?: string;
      supplierName?: string;
      notes?: string;
    }[];
    notes?: string;
    sourceOrderIds?: string[];
  }) => {
    // 1. Permission check
    if (currentUser.role !== 'admin') {
      posSound.error();
      return { success: false, message: 'Hanya Superadmin yang berhak membuat Rencana Pembelian!' };
    }

    // 2. Validate Branch
    if (!mainBranch || mainBranch.status === 'inactive') {
      posSound.error();
      return { success: false, message: 'Cabang Utama aktif wajib tersedia sebelum membuat rencana pembelian!' };
    }
    const targetBranch = mainBranch;

    // 3. Validate Plan Name
    if (!data.namaRencana || !data.namaRencana.trim()) {
      posSound.error();
      return { success: false, message: 'Nama Rencana Pembelian wajib diisi!' };
    }

    // 4. Validate product lines from reseller-linked master data.
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

      const lineSupplier = prod.supplierId ? suppliers.find((supplier) => supplier.id === prod.supplierId) : undefined;
      const lineCategoryId = prod.masterCategoryId || lineSupplier?.masterCategoryId;
      const lineCategory = lineCategoryId ? masterCategories.find((category) => category.id === lineCategoryId) : undefined;
      if (!lineSupplier || !lineCategory || lineCategory.categoryType !== 'BELI (RESELLER)') {
        posSound.error();
        return { success: false, message: `Produk pada baris #${i + 1} belum terhubung ke supplier reseller dan Master Kategori reseller!` };
      }
      if (!line.pickupDate) {
        posSound.error();
        return { success: false, message: `Pickup date pada baris #${i + 1} wajib diisi!` };
      }

      const qty = Number(line.plannedQuantity);
      if (!Number.isInteger(qty) || qty <= 0) {
        posSound.error();
        return {
          success: false,
          message: `Jumlah rencana beli untuk "${prod.name}" harus berupa angka bulat positif (minimal 1)!`,
        };
      }

      const price = Number(line.plannedBuyPrice);
      if (!Number.isFinite(price) || price < 0) {
        posSound.error();
        return { success: false, message: `Harga beli pada baris #${i + 1} harus berupa angka nol atau lebih.` };
      }
      const lineTotal = qty * price;

      // Determine itemType fallback
      let itemType: PurchasePlanItemType = line.itemType || 'direct_purchase';
      if (!line.itemType) {
        if (prod.ownershipType === 'consignment') {
          itemType = 'consignment';
        } else if (prod.isMadeToOrder) {
          itemType = 'in_house';
        } else {
          itemType = 'direct_purchase';
        }
      }

      formattedLines.push({
        id: `rpl-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        productId: prod.id,
        productSku: prod.sku,
        productName: prod.name,
        category: prod.categoryLabel || prod.category || 'Umum',
        plannedQuantity: qty,
        plannedBuyPrice: price,
        lineTotal,
        pickupDate: line.pickupDate,
        sourceBranchIds: line.sourceBranchIds,
        sourceBranchNames: line.sourceBranchNames,
        sourceOrderIds: line.sourceOrderIds,
        masterCategoryId: lineCategory.id,
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
    const supplierIds = Array.from(new Set(formattedLines.map((line) => line.supplierId).filter(Boolean)));
    const supplierNames = Array.from(new Set(formattedLines.map((line) => line.supplierName).filter(Boolean)));
    const newPlan: PurchasePlan = {
      id: planId,
      namaRencana: data.namaRencana.trim(),
      branchId: targetBranch.id,
      branchCode: targetBranch.code,
      branchName: targetBranch.name,
      supplierId: supplierIds.length === 1 ? supplierIds[0]! : 'multi',
      supplierName: supplierNames.length === 1 ? supplierNames[0]! : `${supplierNames.length} supplier reseller`,
      supplierCategory: 'BELI (RESELLER)',
      lines: formattedLines,
      totalPlannedValue,
      status: 'Direncanakan',
      notes: data.notes?.trim() || undefined,
      sourceOrderIds: data.sourceOrderIds,
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
      `Superadmin ${currentUser.name} membuat Rencana Pembelian ${planId} (${newPlan.namaRencana}) untuk penerimaan terpusat di ${targetBranch.name} senilai Rp ${totalPlannedValue.toLocaleString('id-ID')}`
    );

    posSound.cashRegister();
    return {
      success: true,
      plan: newPlan,
      message: `Rencana Pembelian ${planId} berhasil disimpan dengan status Direncanakan!`,
    };
  };

  // Edit Purchase Plan (Superadmin Only, reseller header is immutable)
  const updatePurchasePlan = (
    id: string,
    data: {
      namaRencana?: string;
      lines?: {
        productId: string;
        plannedQuantity: number;
        plannedBuyPrice: number;
        pickupDate: string;
        sourceBranchIds?: string[];
        sourceBranchNames?: string[];
        sourceOrderIds?: string[];
        masterCategoryId?: string;
        itemType?: PurchasePlanItemType;
        sourcePoRef?: string;
        supplierId?: string;
        supplierName?: string;
        notes?: string;
      }[];
      notes?: string;
      sourceOrderIds?: string[];
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

    if (targetPlan.status !== 'Direncanakan' || targetPlan.receivingLocked) {
      posSound.error();
      return {
        success: false,
        message: `Rencana Pembelian ${id} sedang tidak dapat diubah (status: ${targetPlan.status}).`,
      };
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
        const lineSupplier = prod.supplierId ? suppliers.find((supplier) => supplier.id === prod.supplierId) : undefined;
        const lineCategoryId = prod.masterCategoryId || lineSupplier?.masterCategoryId;
        const lineCategory = lineCategoryId ? masterCategories.find((category) => category.id === lineCategoryId) : undefined;
        if (!lineSupplier || !lineCategory || lineCategory.categoryType !== 'BELI (RESELLER)') {
          posSound.error();
          return { success: false, message: `Produk pada baris #${i + 1} belum terhubung ke supplier reseller!` };
        }
        if (!line.pickupDate) {
          posSound.error();
          return { success: false, message: `Pickup date pada baris #${i + 1} wajib diisi!` };
        }

        const qty = Number(line.plannedQuantity);
        if (!Number.isInteger(qty) || qty <= 0) {
          posSound.error();
          return {
            success: false,
            message: `Jumlah rencana beli untuk "${prod.name}" harus berupa angka bulat positif (minimal 1)!`,
          };
        }

        const price = Number(line.plannedBuyPrice);
        if (!Number.isFinite(price) || price < 0) {
          posSound.error();
          return { success: false, message: `Harga beli pada baris #${i + 1} harus berupa angka nol atau lebih.` };
        }
        const lineTotal = qty * price;

        let itemType: PurchasePlanItemType = line.itemType || 'direct_purchase';
        if (!line.itemType) {
          if (prod.ownershipType === 'consignment') {
            itemType = 'consignment';
          } else if (prod.isMadeToOrder) {
            itemType = 'in_house';
          } else {
            itemType = 'direct_purchase';
          }
        }

        formattedLines.push({
          id: `rpl-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
          productId: prod.id,
          productSku: prod.sku,
          productName: prod.name,
          category: prod.categoryLabel || prod.category || 'Umum',
          plannedQuantity: qty,
          plannedBuyPrice: price,
          lineTotal,
          pickupDate: line.pickupDate,
          sourceBranchIds: line.sourceBranchIds,
          sourceBranchNames: line.sourceBranchNames,
          sourceOrderIds: line.sourceOrderIds,
          masterCategoryId: lineCategory.id,
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
      lines: updatedLines,
      totalPlannedValue,
      notes: data.notes !== undefined ? data.notes.trim() : targetPlan.notes,
      sourceOrderIds: data.sourceOrderIds !== undefined ? data.sourceOrderIds : targetPlan.sourceOrderIds,
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

    if (targetPlan.status !== 'Direncanakan' || targetPlan.receivingLocked) {
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
    if (!mainBranch || selectedBranchId !== mainBranch.id) {
      return { success: false, message: `Rencana reseller hanya dapat diproses di ${mainBranch?.name || 'Cabang Utama'}.` };
    }
    const targetPlan = purchasePlans.find((p) => p.id === id);
    if (!targetPlan) {
      return { success: false, message: 'Rencana Pembelian tidak ditemukan!' };
    }
    if (targetPlan.status !== 'Direncanakan' || targetPlan.receivingLocked) {
      return {
        success: false,
        message: `Rencana Pembelian ${id} tidak tersedia (status: ${targetPlan.status}).`,
      };
    }

    const now = new Date();
    setPurchasePlans((prev) =>
      prev.map((p) => (p.id === id ? { ...p, receivingLocked: true, updatedAt: now.toISOString() } : p))
    );

    return { success: true, message: 'Rencana Pembelian dikunci untuk proses penerimaan barang.' };
  };

  // Unlock Purchase Plan if Goods Receipt draft is discarded
  const unlockPurchasePlanFromReceipt = (id: string) => {
    const targetPlan = purchasePlans.find((p) => p.id === id);
    if (targetPlan && targetPlan.receivingLocked) {
      const now = new Date();
      setPurchasePlans((prev) =>
        prev.map((p) => (p.id === id ? { ...p, receivingLocked: false, updatedAt: now.toISOString() } : p))
      );
    }
    return { success: true, message: 'Rencana Pembelian dikembalikan ke status Direncanakan.' };
  };

  return {
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
  };
}
