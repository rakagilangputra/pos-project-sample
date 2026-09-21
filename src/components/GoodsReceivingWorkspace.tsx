import React, { useState, useMemo } from 'react';
import {
  PackagePlus,
  Truck,
  FileText,
  Search,
  Check,
  AlertCircle,
  Calendar,
  Building2,
  DollarSign,
  Plus,
  Trash2,
  Eye,
  Layers,
  ArrowRight,
  ClipboardList,
  CheckCircle2,
  Info,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { GoodsReceiptRecord, ReceiptType, Product, GoodsReceiptItemBatch } from '../types';
import { formatIDR, formatDateTime } from '../utils/formatters';

interface ReceiptItemRowState {
  tempId: string;
  productId: string;
  quantityReceived: number;
  actualBuyPrice?: number;
  // Plan reference if linked to a purchase plan
  plannedLineId?: string;
  plannedProductId?: string;
  plannedProductName?: string;
  plannedSku?: string;
  plannedCategory?: string;
  plannedQuantity?: number;
  plannedBuyPrice?: number;
  plannedLineTotal?: number;
  // Sub-batch multi expiry dates (Option A)
  expiryBatches?: GoodsReceiptItemBatch[];
}

export const GoodsReceivingWorkspace: React.FC = () => {
  const {
    goodsReceipts,
    suppliers,
    products,
    rawMaterials = [],
    currentUser,
    receivingDraft,
    setReceivingDraft,
    submitGoodsReceipt,
    purchasePlans,
    lockPurchasePlanForReceipt,
    unlockPurchasePlanFromReceipt,
    selectedBranchId,
  } = usePOS();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedReceipt, setSelectedReceipt] = useState<GoodsReceiptRecord | null>(null);

  // New Receipt Form State / Modal
  const [isCreatingReceipt, setIsCreatingReceipt] = useState(false);

  // Form fields
  const [receiptType, setReceiptType] = useState<ReceiptType>(receivingDraft?.receiptType || 'Dibeli Sendiri');
  const [sumberPenerimaan, setSumberPenerimaan] = useState<'Manual' | 'Dari Rencana Pembelian'>('Manual');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');

  const [arrivalDate, setArrivalDate] = useState<string>(
    receivingDraft?.arrivalDate || new Date().toISOString().slice(0, 10)
  );
  const [supplierId, setSupplierId] = useState<string>(receivingDraft?.supplierId || suppliers[0]?.id || '');
  const [receivedBy, setReceivedBy] = useState<string>(
    receivingDraft?.receivedBy || `${currentUser.name} (${currentUser.role})`
  );
  const [remarks, setRemarks] = useState<string>(receivingDraft?.remarks || '');
  const [totalPurchaseCost, setTotalPurchaseCost] = useState<string>(
    receivingDraft?.totalPurchaseCost ? String(receivingDraft.totalPurchaseCost) : ''
  );
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'qris' | 'deposit'>(
    receivingDraft?.paymentMethod || 'transfer'
  );

  // Items in receipt being created
  const [receiptItems, setReceiptItems] = useState<ReceiptItemRowState[]>(
    receivingDraft?.items?.map((it, idx) => ({
      tempId: `item-${idx}`,
      productId: it.productId,
      quantityReceived: it.quantityReceived,
    })) || [{ tempId: 'item-1', productId: products[0]?.id || '', quantityReceived: 10 }]
  );

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Owned products only (for Dibeli Sendiri and Purchase Plans)
  const ownedProducts = useMemo(() => {
    return products.filter((p) => p.ownershipType !== 'consignment');
  }, [products]);

  // Eligible purchase plans for current branch (Direncanakan, or currently selected)
  const eligiblePurchasePlans = useMemo(() => {
    return purchasePlans.filter((p) => {
      const branchMatches = !p.branchId || p.branchId === selectedBranchId;
      const statusMatches = p.status === 'Direncanakan' || p.id === selectedPlanId;
      return branchMatches && statusMatches;
    });
  }, [purchasePlans, selectedBranchId, selectedPlanId]);

  // Selected plan object
  const activePlanObj = useMemo(() => {
    if (!selectedPlanId) return null;
    return purchasePlans.find((p) => p.id === selectedPlanId) || null;
  }, [purchasePlans, selectedPlanId]);

  // Filtered receipts
  const filteredReceipts = useMemo(() => {
    return goodsReceipts.filter((r) => {
      const matchSearch =
        r.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.stockMovementRef.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.purchasePlanId && r.purchasePlanId.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchType = filterType === 'all' || r.receiptType === filterType;

      return matchSearch && matchType;
    });
  }, [goodsReceipts, searchQuery, filterType]);

  // Handle switching source: 'Manual' | 'Dari Rencana Pembelian'
  const handleSwitchSumber = (newSumber: 'Manual' | 'Dari Rencana Pembelian') => {
    if (newSumber === sumberPenerimaan) return;
    setFormError('');

    if (newSumber === 'Manual') {
      if (selectedPlanId) {
        unlockPurchasePlanFromReceipt(selectedPlanId);
        setSelectedPlanId('');
      }
      setReceiptItems([{ tempId: 'item-1', productId: products[0]?.id || '', quantityReceived: 10 }]);
      setTotalPurchaseCost('');
      setSumberPenerimaan('Manual');
    } else {
      // Switch to 'Dari Rencana Pembelian'
      setSumberPenerimaan('Dari Rencana Pembelian');
      if (eligiblePurchasePlans.length > 0) {
        handleSelectPlan(eligiblePurchasePlans[0].id);
      } else {
        setSelectedPlanId('');
        setReceiptItems([]);
      }
    }
  };

  // Handle choosing a plan
  const handleSelectPlan = (planId: string) => {
    if (selectedPlanId && selectedPlanId !== planId) {
      unlockPurchasePlanFromReceipt(selectedPlanId);
    }

    setSelectedPlanId(planId);
    if (!planId) {
      setReceiptItems([]);
      return;
    }

    const plan = purchasePlans.find((p) => p.id === planId);
    if (plan) {
      // Lock plan as Terkait Penerimaan
      lockPurchasePlanForReceipt(plan.id);
      setSupplierId(plan.supplierId);

      // Pre-fill lines with planned values and actual quantity initially 0
      const defaultExp = arrivalDate || new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
      const lines: ReceiptItemRowState[] = plan.lines.map((l, idx) => ({
        tempId: `plan-line-${l.id}-${idx}`,
        productId: l.productId,
        quantityReceived: 0, // initially 0 per requirements
        actualBuyPrice: l.plannedBuyPrice,
        plannedLineId: l.id,
        plannedProductId: l.productId,
        plannedProductName: l.productName,
        plannedSku: l.productSku,
        plannedCategory: l.category,
        plannedQuantity: l.plannedQuantity,
        plannedBuyPrice: l.plannedBuyPrice,
        plannedLineTotal: l.lineTotal,
        expiryBatches: [
          {
            batchNumber: 'BCH-01',
            expiryDate: defaultExp,
            quantity: 0,
          },
        ],
      }));

      setReceiptItems(lines);
      setTotalPurchaseCost(String(plan.totalPlannedValue || 0));
    }
  };

  // Quick fill all planned items with planned quantities (convenience action)
  const handleFillAllPlannedQuantities = () => {
    setFormError('');
    const defaultExp = arrivalDate || new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
    setReceiptItems((prev) =>
      prev.map((item) => {
        if (item.plannedQuantity !== undefined) {
          return {
            ...item,
            quantityReceived: item.plannedQuantity,
            actualBuyPrice: item.plannedBuyPrice ?? item.actualBuyPrice,
            expiryBatches: [
              {
                batchNumber: 'BCH-01',
                expiryDate: defaultExp,
                quantity: item.plannedQuantity,
              },
            ],
          };
        }
        return item;
      })
    );
  };

  // Add item row (Manual or extra actual item in plan)
  const handleAddItemRow = () => {
    const listToChoose = receiptType === 'Dibeli Sendiri' ? ownedProducts : products;
    const unselectedProd = listToChoose.find((p) => !receiptItems.some((i) => i.productId === p.id));
    const defaultProdId = unselectedProd ? unselectedProd.id : listToChoose[0]?.id || '';
    const defaultProd = listToChoose.find((p) => p.id === defaultProdId);
    const isMultiDay = defaultProd?.expiryType === 'multi_day';
    const shelfDays = defaultProd?.shelfLifeDays || 7;
    const defaultExp = isMultiDay
      ? new Date(Date.now() + shelfDays * 86400000).toISOString().slice(0, 10)
      : (arrivalDate || new Date().toISOString().slice(0, 10));
    const initialQty = sumberPenerimaan === 'Dari Rencana Pembelian' ? 0 : 10;

    setReceiptItems((prev) => [
      ...prev,
      {
        tempId: 'item-' + Date.now(),
        productId: defaultProdId,
        quantityReceived: initialQty,
        actualBuyPrice: defaultProd ? Math.round(defaultProd.price * 0.6) : 0,
        expiryBatches: [
          {
            batchNumber: 'BCH-01',
            expiryDate: defaultExp,
            quantity: initialQty,
          },
        ],
      },
    ]);
  };

  // Remove item row
  const handleRemoveItemRow = (tempId: string) => {
    if (receiptItems.length <= 1) {
      setFormError('Minimal harus ada 1 baris item produk dalam formulir penerimaan!');
      return;
    }
    setReceiptItems((prev) => prev.filter((i) => i.tempId !== tempId));
  };

  // Multi-Batch (Option A): Add Sub-batch to item
  const handleAddBatch = (itemTempId: string) => {
    setReceiptItems((prev) =>
      prev.map((item) => {
        if (item.tempId !== itemTempId) return item;
        const currentBatches =
          item.expiryBatches && item.expiryBatches.length > 0
            ? [...item.expiryBatches]
            : [
                {
                  batchNumber: 'BCH-01',
                  expiryDate: arrivalDate || new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
                  quantity: item.quantityReceived || 0,
                },
              ];
        const nextBatchNum = currentBatches.length + 1;
        const nextExp = new Date(Date.now() + (4 + nextBatchNum) * 86400000).toISOString().slice(0, 10);
        const newBatch: GoodsReceiptItemBatch = {
          batchNumber: `BCH-${String(nextBatchNum).padStart(2, '0')}`,
          expiryDate: nextExp,
          quantity: 0,
        };
        return {
          ...item,
          expiryBatches: [...currentBatches, newBatch],
        };
      })
    );
  };

  // Multi-Batch: Update batch field
  const handleUpdateBatchField = (
    itemTempId: string,
    batchIndex: number,
    field: keyof GoodsReceiptItemBatch,
    val: any
  ) => {
    setReceiptItems((prev) =>
      prev.map((item) => {
        if (item.tempId !== itemTempId) return item;
        const currentBatches =
          item.expiryBatches && item.expiryBatches.length > 0
            ? [...item.expiryBatches]
            : [
                {
                  batchNumber: 'BCH-01',
                  expiryDate: arrivalDate || new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
                  quantity: item.quantityReceived || 0,
                },
              ];
        const updatedBatches = currentBatches.map((b, i) =>
          i === batchIndex ? { ...b, [field]: val } : b
        );
        const sumQty = updatedBatches.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
        return {
          ...item,
          expiryBatches: updatedBatches,
          quantityReceived: sumQty > 0 ? sumQty : item.quantityReceived,
        };
      })
    );
  };

  // Multi-Batch: Remove batch
  const handleRemoveBatch = (itemTempId: string, batchIndex: number) => {
    setReceiptItems((prev) =>
      prev.map((item) => {
        if (item.tempId !== itemTempId) return item;
        const batches = (item.expiryBatches || []).filter((_, i) => i !== batchIndex);
        const sumQty = batches.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
        return {
          ...item,
          expiryBatches: batches,
          quantityReceived: sumQty > 0 ? sumQty : item.quantityReceived,
        };
      })
    );
  };

  // Update item row
  const handleUpdateItemRow = (
    tempId: string,
    field: 'productId' | 'quantityReceived' | 'actualBuyPrice',
    value: any
  ) => {
    setReceiptItems((prev) =>
      prev.map((item) => {
        if (item.tempId === tempId) {
          const updated = { ...item, [field]: value };
          // If product changed, update default actual buy price if not planned
          if (field === 'productId') {
            const prod = products.find((p) => p.id === value);
            if (prod && !item.plannedLineId) {
              updated.actualBuyPrice = Math.round(prod.price * 0.6);
              const isMultiDay = prod.expiryType === 'multi_day';
              const shelfDays = prod.shelfLifeDays || 7;
              const defaultExp = isMultiDay
                ? new Date(Date.now() + shelfDays * 86400000).toISOString().slice(0, 10)
                : (arrivalDate || new Date().toISOString().slice(0, 10));
              if (updated.expiryBatches && updated.expiryBatches.length <= 1) {
                updated.expiryBatches = [
                  {
                    batchNumber: updated.expiryBatches?.[0]?.batchNumber || 'BCH-01',
                    expiryDate: defaultExp,
                    quantity: updated.quantityReceived || 0,
                  },
                ];
              }
            }
          }
          // If quantity received changed and single batch, sync the batch quantity
          if (field === 'quantityReceived') {
            const qty = Number(value) || 0;
            if (!updated.expiryBatches || updated.expiryBatches.length <= 1) {
              const exp =
                updated.expiryBatches?.[0]?.expiryDate ||
                arrivalDate ||
                new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
              updated.expiryBatches = [
                {
                  batchNumber: updated.expiryBatches?.[0]?.batchNumber || 'BCH-01',
                  expiryDate: exp,
                  quantity: qty,
                },
              ];
            }
          }
          return updated;
        }
        return item;
      })
    );
  };

  // Calculate actual totals for plan-linked receipt
  const planActualTotals = useMemo(() => {
    const totalActualQty = receiptItems.reduce((sum, it) => sum + (Number(it.quantityReceived) || 0), 0);
    const totalActualCost = receiptItems.reduce((sum, it) => {
      const q = Math.max(0, Number(it.quantityReceived) || 0);
      const p = Math.max(0, Number(it.actualBuyPrice) || 0);
      return sum + q * p;
    }, 0);

    const totalPlannedQty = activePlanObj?.lines.reduce((sum, l) => sum + l.plannedQuantity, 0) || 0;
    const totalPlannedValue = activePlanObj?.totalPlannedValue || 0;

    return { totalActualQty, totalActualCost, totalPlannedQty, totalPlannedValue };
  }, [receiptItems, activePlanObj]);

  // Close create modal safely and unlock plan if needed
  const handleCloseCreateModal = () => {
    if (selectedPlanId) {
      unlockPurchasePlanFromReceipt(selectedPlanId);
      setSelectedPlanId('');
    }
    setIsCreatingReceipt(false);
    setFormError('');
    setFormSuccess('');
    setReceiptItems([{ tempId: 'item-1', productId: products[0]?.id || '', quantityReceived: 10 }]);
    setRemarks('');
    setTotalPurchaseCost('');
  };

  // Handle Submit Form
  const handleSubmitForm = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    setFormError('');
    setFormSuccess('');

    // 1. Supplier Check
    const sup = suppliers.find((s) => s.id === supplierId) || suppliers[0];
    if (!sup) {
      setFormError('Mitra supplier pengirim wajib dipilih!');
      return;
    }

    const isFromPlan = receiptType === 'Dibeli Sendiri' && sumberPenerimaan === 'Dari Rencana Pembelian';

    if (isFromPlan) {
      if (!selectedPlanId || !activePlanObj) {
        setFormError('Silakan pilih Dokumen Rencana Pembelian yang valid!');
        return;
      }

      // "Submit stock only from final actual positive received quantities, allow planned and actual values to differ without blocking the receipt"
      const positiveItems = receiptItems.filter((it) => (Number(it.quantityReceived) || 0) > 0);

      if (positiveItems.length === 0) {
        setFormError(
          'Minimal harus ada 1 produk dengan kuantitas aktual diterima > 0! Silakan isi kolom "Aktual Diterima" atau klik tombol "Isi Semua Sesuai Rencana".'
        );
        return;
      }

      // Validate expiry dates for finished products
      for (const item of positiveItems) {
        const prod = products.find((p) => p.id === item.productId);
        if (prod) {
          const batches = item.expiryBatches || [];
          for (const b of batches) {
            if (!b.expiryDate) {
              setFormError(`Tanggal kadaluwarsa (Expiry Date) wajib diisi untuk produk jadi: ${prod.name}!`);
              return;
            }
          }
        }
      }

      const formattedItems = positiveItems.map((item) => {
        const prod = products.find((p) => p.id === item.productId);
        const defaultExp = arrivalDate || new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
        let resolvedBatches = item.expiryBatches && item.expiryBatches.length > 0 ? item.expiryBatches : undefined;
        if (prod && (!resolvedBatches || resolvedBatches.length === 0)) {
          resolvedBatches = [
            {
              batchNumber: 'BCH-01',
              expiryDate: defaultExp,
              quantity: Number(item.quantityReceived),
            },
          ];
        }

        return {
          id: 'rec-it-' + Math.random().toString(36).substring(2, 9),
          productId: item.productId,
          productSku: prod ? prod.sku : item.plannedSku || 'SKU-UNKNOWN',
          productName: prod ? prod.name : item.plannedProductName || 'Produk',
          sellingPrice: prod ? prod.price : 0,
          quantityReceived: Number(item.quantityReceived),
          plannedQuantity: item.plannedQuantity,
          plannedBuyPrice: item.plannedBuyPrice,
          actualBuyPrice: item.actualBuyPrice,
          expiryBatches: resolvedBatches,
        };
      });

      const totalQuantity = formattedItems.reduce((sum, it) => sum + it.quantityReceived, 0);
      const rawCost = parseFloat(totalPurchaseCost);
      const costNum = !isNaN(rawCost) && rawCost >= 0 ? rawCost : planActualTotals.totalActualCost;

      setIsSubmitting(true);
      const res = submitGoodsReceipt({
        receiptType: 'Dibeli Sendiri',
        sourceType: 'Dari Rencana Pembelian',
        purchasePlanId: activePlanObj.id,
        totalPlannedValue: activePlanObj.totalPlannedValue,
        arrivalDate,
        supplierId: sup.id,
        supplierName: sup.name,
        receivedBy,
        items: formattedItems,
        totalQuantity,
        remarks: remarks || `Penerimaan dari Rencana Pembelian ${activePlanObj.id}`,
        totalPurchaseCost: costNum,
        paymentMethod: paymentMethod || 'transfer',
      });
      setIsSubmitting(false);

      if (res.success) {
        setFormSuccess(res.message);
        setSelectedPlanId('');
        setIsCreatingReceipt(false);
        setReceiptItems([{ tempId: 'item-1', productId: products[0]?.id || '', quantityReceived: 10 }]);
        setRemarks('');
        setTotalPurchaseCost('');
      } else {
        setFormError(res.message || 'Gagal menyimpan penerimaan barang.');
      }
    } else {
      // Manual Mode (Dibeli Sendiri Manual or Konsinyasi)
      const positiveItems = receiptItems.filter((it) => (Number(it.quantityReceived) || 0) > 0);
      if (positiveItems.length === 0) {
        setFormError('Minimal harus ada 1 produk dengan kuantitas barang diterima lebih dari 0!');
        return;
      }

      // Validate expiry dates for finished products (raw material optional per requirement 2)
      for (const item of positiveItems) {
        const prod = products.find((p) => p.id === item.productId);
        if (prod) {
          const batches = item.expiryBatches || [];
          for (const b of batches) {
            if (!b.expiryDate) {
              setFormError(`Tanggal kadaluwarsa (Expiry Date) wajib diisi untuk produk jadi: ${prod.name}!`);
              return;
            }
          }
        }
      }

      const formattedItems = positiveItems.map((item) => {
        const prod = products.find((p) => p.id === item.productId);
        const raw = rawMaterials.find((r) => r.id === item.productId);
        const defaultExp = arrivalDate || new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
        let resolvedBatches = item.expiryBatches && item.expiryBatches.length > 0 ? item.expiryBatches : undefined;
        if (prod && (!resolvedBatches || resolvedBatches.length === 0)) {
          resolvedBatches = [
            {
              batchNumber: 'BCH-01',
              expiryDate: defaultExp,
              quantity: Number(item.quantityReceived),
            },
          ];
        }

        return {
          id: 'rec-it-' + Math.random().toString(36).substring(2, 9),
          productId: item.productId,
          productSku: prod ? prod.sku : (raw ? raw.sku : 'SKU-UNKNOWN'),
          productName: prod ? prod.name : (raw ? `[Bahan Baku] ${raw.name}` : 'Produk'),
          sellingPrice: prod ? prod.price : (raw ? raw.costPrice : 0),
          quantityReceived: Number(item.quantityReceived) || 0,
          actualBuyPrice: item.actualBuyPrice ?? (prod ? Math.round(prod.price * 0.6) : (raw ? raw.costPrice : 0)),
          expiryBatches: resolvedBatches,
        };
      });

      const totalQuantity = formattedItems.reduce((sum, it) => sum + it.quantityReceived, 0);
      
      let costNum: number | undefined = undefined;
      if (receiptType === 'Dibeli Sendiri') {
        const parsedCost = parseFloat(totalPurchaseCost);
        if (!isNaN(parsedCost) && parsedCost >= 0) {
          costNum = parsedCost;
        } else {
          costNum = formattedItems.reduce((sum, it) => sum + (it.quantityReceived * (it.actualBuyPrice || 0)), 0);
        }
      }

      setIsSubmitting(true);
      const res = submitGoodsReceipt({
        receiptType,
        sourceType: 'Manual',
        arrivalDate,
        supplierId: sup.id,
        supplierName: sup.name,
        receivedBy,
        items: formattedItems,
        totalQuantity,
        remarks,
        totalPurchaseCost: costNum,
        paymentMethod: receiptType === 'Dibeli Sendiri' ? paymentMethod || 'transfer' : undefined,
      });
      setIsSubmitting(false);

      if (res.success) {
        setFormSuccess(res.message);
        setIsCreatingReceipt(false);
        setReceiptItems([{ tempId: 'item-1', productId: products[0]?.id || '', quantityReceived: 10 }]);
        setRemarks('');
        setTotalPurchaseCost('');
      } else {
        setFormError(res.message || 'Gagal menyimpan penerimaan barang.');
      }
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between border-b-2 border-[#E5DACE] bg-[#FDFBF7] px-6 py-4 gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#D97706] text-white shadow-xs font-black">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-[#2D241E]">
              Penerimaan Barang & Pembelian Supplier (Goods Receipt)
            </h2>
            <p className="text-xs text-[#8C7B6C] font-semibold">
              Pencatatan barang masuk dari supplier dengan integrasi rencana pembelian dan penambahan otomatis ke stok jual
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="new-goods-receipt-btn"
            onClick={() => {
              setIsCreatingReceipt(true);
              setFormError('');
              setFormSuccess('');
            }}
            className="flex items-center gap-2 rounded-xl bg-[#D97706] px-4 py-2.5 text-xs font-black text-white hover:bg-amber-700 shadow-xs active:scale-95 transition"
          >
            <PackagePlus className="h-4 w-4" />
            <span>Catat Penerimaan Barang Baru</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#E5DACE] bg-white px-6 py-3.5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8C7B6C]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari No. Terima / Supplier / Ref / RP-..."
              className="w-64 rounded-xl border-2 border-[#E5DACE] bg-[#FDFBF7] pl-9 pr-3.5 py-2 text-xs font-semibold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-xl border-2 border-[#E5DACE] bg-[#FDFBF7] px-3.5 py-2 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
          >
            <option value="all">Semua Tipe Penerimaan</option>
            <option value="Dibeli Sendiri">Dibeli Sendiri (Pembelian Langsung)</option>
            <option value="Konsinyasi">Konsinyasi (Barang Titipan)</option>
          </select>
        </div>

        <div className="text-xs font-bold text-[#8C7B6C]">
          Total Tercatat: <span className="text-[#2D241E] font-black">{filteredReceipts.length}</span> Bukti Penerimaan
        </div>
      </div>

      {/* Main Content: List of Receipts */}
      <div className="flex-1 overflow-y-auto p-6 bg-[#FDFBF7] scrollbar-thin">
        {filteredReceipts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 rounded-2xl border-2 border-dashed border-[#E5DACE] bg-white p-8 text-center">
            <Truck className="h-12 w-12 text-[#8C7B6C] opacity-40 mb-3" />
            <h3 className="text-sm font-black text-[#2D241E]">Belum Ada Bukti Penerimaan Barang</h3>
            <p className="text-xs text-[#8C7B6C] mt-1 max-w-sm">
              Catat penerimaan barang baru dari supplier (secara manual atau dari Rencana Pembelian) untuk menambah stok jual toko secara akurat & traceable.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredReceipts.map((rec) => (
              <div
                key={rec.id}
                className="rounded-2xl border-2 border-[#E5DACE] bg-white p-5 shadow-xs hover:border-[#D97706] transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-black text-[#D97706]">
                      {rec.receiptNumber}
                    </span>
                    <span
                      className={`rounded-lg px-2.5 py-1 text-xs font-black ${
                        rec.receiptType === 'Dibeli Sendiri'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {rec.receiptType}
                    </span>
                    {rec.purchasePlanId ? (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-900 border border-amber-200">
                        <ClipboardList className="h-3 w-3 text-amber-600" />
                        <span>Dari Rencana: <strong>{rec.purchasePlanId}</strong></span>
                      </span>
                    ) : (
                      <span className="rounded-lg bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-600">
                        Sumber: Manual
                      </span>
                    )}
                    <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Stok Jual Ditambahkan
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-[#8C7B6C]">
                    <div className="flex items-center gap-1 text-[#2D241E] font-bold">
                      <Building2 className="h-3.5 w-3.5 text-[#D97706]" />
                      <span>{rec.supplierName}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Tiba: {rec.arrivalDate}</span>
                    </div>
                    <div>
                      Penerima: <span className="font-bold text-[#2D241E]">{rec.receivedBy}</span>
                    </div>
                    <div>
                      Ref Stok: <span className="font-mono font-bold text-[#D97706]">{rec.stockMovementRef}</span>
                    </div>
                  </div>

                  {rec.totalPurchaseCost !== undefined && (
                    <div className="text-xs font-bold text-[#2D241E]">
                      Biaya Pembelian: <span className="text-emerald-700 font-black">{formatIDR(rec.totalPurchaseCost)}</span> ({rec.paymentMethod?.toUpperCase()})
                    </div>
                  )}

                  <div className="text-xs text-[#2D241E] font-medium bg-[#FDFBF7] p-2.5 rounded-xl border border-[#E5DACE]">
                    <span className="font-bold text-[#8C7B6C]">{rec.items.length} jenis produk</span> ({rec.totalQuantity} pcs total):{' '}
                    {rec.items.map((it) => `${it.productName} (${it.quantityReceived} pcs)`).join(', ')}
                    {rec.remarks && <span className="block italic text-[11px] text-[#8C7B6C] mt-1">Catatan: {rec.remarks}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  <button
                    onClick={() => setSelectedReceipt(rec)}
                    className="flex items-center gap-1.5 rounded-xl border-2 border-[#E5DACE] bg-[#FDFBF7] px-4 py-2 text-xs font-bold text-[#2D241E] hover:bg-[#E5DACE] transition"
                  >
                    <Eye className="h-4 w-4 text-[#D97706]" />
                    <span>Detail Bukti</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* CREATE RECEIPT MODAL / FULLVIEW */}
      {/* ========================================================================= */}
      {isCreatingReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="flex h-[92vh] w-full max-w-5xl flex-col rounded-3xl bg-white shadow-2xl border-2 border-[#E5DACE] overflow-hidden animate-fadeIn">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b-2 border-[#E5DACE] bg-[#FDFBF7] px-6 py-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#D97706] text-white font-black">
                  <PackagePlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#2D241E]">Catat Penerimaan Barang Baru</h3>
                  <p className="text-xs text-[#8C7B6C] font-semibold">
                    Input fisik barang datang dari supplier & tambahkan langsung ke stok jual
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseCreateModal}
                className="rounded-xl border border-[#E5DACE] bg-white px-4 py-2 text-xs font-bold text-[#8C7B6C] hover:bg-[#E5DACE] transition"
              >
                ✕ Tutup
              </button>
            </div>

            {/* Form Container */}
            <form onSubmit={handleSubmitForm} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
              {formError && (
                <div className="flex items-center gap-2 rounded-2xl border-2 border-rose-300 bg-rose-50 p-4 text-xs font-bold text-rose-800">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
              {formSuccess && (
                <div className="flex items-center gap-2 rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4 text-xs font-bold text-emerald-800">
                  <Check className="h-5 w-5 shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* Receipt Type Selection */}
              <div className="rounded-2xl border-2 border-[#E5DACE] bg-[#FDFBF7] p-5 space-y-3">
                <label className="text-xs font-black uppercase tracking-wider text-[#8C7B6C]">
                  Tipe Penerimaan Barang <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setReceiptType('Dibeli Sendiri');
                    }}
                    className={`flex flex-col items-center justify-center rounded-2xl border-2 p-4 transition ${
                      receiptType === 'Dibeli Sendiri'
                        ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-sm font-black'
                        : 'border-[#E5DACE] bg-white text-[#8C7B6C] hover:bg-white/80 font-bold'
                    }`}
                  >
                    <DollarSign className="h-6 w-6 text-blue-700 mb-1" />
                    <span className="text-sm">Dibeli Sendiri</span>
                    <span className="text-[10px] text-[#8C7B6C]">Pembelian langsung & pelunasan kas toko / transfer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (selectedPlanId) {
                        unlockPurchasePlanFromReceipt(selectedPlanId);
                        setSelectedPlanId('');
                      }
                      setSumberPenerimaan('Manual');
                      setReceiptType('Konsinyasi');
                    }}
                    className={`flex flex-col items-center justify-center rounded-2xl border-2 p-4 transition ${
                      receiptType === 'Konsinyasi'
                        ? 'border-purple-600 bg-purple-50 text-purple-900 shadow-sm font-black'
                        : 'border-[#E5DACE] bg-white text-[#8C7B6C] hover:bg-white/80 font-bold'
                    }`}
                  >
                    <Building2 className="h-6 w-6 text-purple-700 mb-1" />
                    <span className="text-sm">Konsinyasi (Titipan)</span>
                    <span className="text-[10px] text-[#8C7B6C]">Barang titipan supplier dihitung saat terjual / settlement</span>
                  </button>
                </div>
              </div>

              {/* Sumber Penerimaan: Only for Dibeli Sendiri */}
              {receiptType === 'Dibeli Sendiri' && (
                <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/50 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-black uppercase tracking-wider text-amber-900">
                        Sumber Penerimaan <span className="text-rose-500">*</span>
                      </label>
                      <p className="text-[11px] text-amber-800">
                        Pilih apakah penerimaan ini didasarkan pada Rencana Pembelian yang sudah dibuat Superadmin atau input manual langsung.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      id="sumber-manual-btn"
                      type="button"
                      onClick={() => handleSwitchSumber('Manual')}
                      className={`flex items-center justify-center gap-2 rounded-xl border-2 p-3 text-xs font-black transition ${
                        sumberPenerimaan === 'Manual'
                          ? 'border-amber-600 bg-white text-amber-900 shadow-xs'
                          : 'border-amber-200 bg-amber-100/50 text-[#8C7B6C] hover:bg-white'
                      }`}
                    >
                      <FileText className="h-4 w-4" />
                      <span>Manual (Tanpa Rencana Pembelian)</span>
                    </button>

                    <button
                      id="sumber-rencana-btn"
                      type="button"
                      onClick={() => handleSwitchSumber('Dari Rencana Pembelian')}
                      className={`flex items-center justify-center gap-2 rounded-xl border-2 p-3 text-xs font-black transition ${
                        sumberPenerimaan === 'Dari Rencana Pembelian'
                          ? 'border-amber-600 bg-white text-amber-900 shadow-xs'
                          : 'border-amber-200 bg-amber-100/50 text-[#8C7B6C] hover:bg-white'
                      }`}
                    >
                      <ClipboardList className="h-4 w-4" />
                      <span>Dari Rencana Pembelian (Purchase Plan)</span>
                    </button>
                  </div>

                  {/* If Dari Rencana Pembelian: Plan Selector Dropdown */}
                  {sumberPenerimaan === 'Dari Rencana Pembelian' && (
                    <div className="mt-3 pt-3 border-t border-amber-200 space-y-2">
                      <label className="text-xs font-bold text-amber-950">
                        Pilih Dokumen Rencana Pembelian (Status: Direncanakan) <span className="text-rose-500">*</span>
                      </label>
                      {eligiblePurchasePlans.length === 0 ? (
                        <div className="rounded-xl bg-white p-3 text-xs text-rose-700 border border-rose-200 font-medium">
                          Tidak ada Rencana Pembelian berstatus <strong>Direncanakan</strong> untuk cabang ini. Silakan buat Rencana Pembelian baru terlebih dahulu di menu <em>Backoffice HQ &gt; Rencana Pembelian</em>, atau beralih ke mode <strong>Manual</strong>.
                        </div>
                      ) : (
                        <select
                          id="select-purchase-plan-dropdown"
                          value={selectedPlanId}
                          onChange={(e) => handleSelectPlan(e.target.value)}
                          className="w-full rounded-xl border-2 border-amber-300 bg-white px-3.5 py-2.5 text-xs font-bold text-[#2D241E] focus:border-amber-600 focus:outline-none"
                        >
                          <option value="">-- Pilih Dokumen Rencana Pembelian --</option>
                          {eligiblePurchasePlans.map((p) => (
                            <option key={p.id} value={p.id}>
                              [{p.id}] {p.namaRencana} - Supplier: {p.supplierName} ({p.lines.length} produk, {formatIDR(p.totalPlannedValue)})
                            </option>
                          ))}
                        </select>
                      )}

                      {activePlanObj && (
                        <div className="flex items-center gap-2 text-xs font-bold text-purple-900 bg-purple-50 p-2.5 rounded-xl border border-purple-200">
                          <Layers className="h-4 w-4 text-purple-700 shrink-0" />
                          <span>
                            Rencana <strong>{activePlanObj.id}</strong> otomatis terkunci sebagai{' '}
                            <span className="underline">Terkait Penerimaan</span>. Setelah penerimaan berhasil disimpan, status rencana akan otomatis menjadi <span className="underline text-emerald-700">Terealisasi</span>.
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Basic Meta */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#2D241E]">
                    Mitra Supplier <span className="text-rose-500">*</span>
                    {sumberPenerimaan === 'Dari Rencana Pembelian' && selectedPlanId && (
                      <span className="text-[10px] text-amber-700 font-normal ml-1">(Terkunci dari Rencana)</span>
                    )}
                  </label>
                  <select
                    value={supplierId}
                    disabled={sumberPenerimaan === 'Dari Rencana Pembelian' && Boolean(selectedPlanId)}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className={`w-full rounded-xl border-2 border-[#E5DACE] px-3 py-2 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none ${
                      sumberPenerimaan === 'Dari Rencana Pembelian' && selectedPlanId ? 'bg-gray-100 opacity-80 cursor-not-allowed' : 'bg-[#FDFBF7]'
                    }`}
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#2D241E]">
                    Tanggal Tiba / Kiriman <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={arrivalDate}
                    onChange={(e) => setArrivalDate(e.target.value)}
                    className="w-full rounded-xl border-2 border-[#E5DACE] bg-[#FDFBF7] px-3 py-2 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#2D241E]">Petugas Penerima</label>
                  <input
                    type="text"
                    value={receivedBy}
                    onChange={(e) => setReceivedBy(e.target.value)}
                    className="w-full rounded-xl border-2 border-[#E5DACE] bg-[#FDFBF7] px-3 py-2 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
                  />
                </div>
              </div>

              {/* If Dibeli Sendiri: Total Cost & Payment Method */}
              {receiptType === 'Dibeli Sendiri' && (
                <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/50 p-5 space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-blue-900">
                    Informasi Pembelian & Pembayaran (Dibeli Sendiri)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-[#2D241E]">
                          Total Biaya Pembelian Aktual (Rp) <span className="text-rose-500">*</span>
                        </label>
                        {sumberPenerimaan === 'Dari Rencana Pembelian' && (
                          <button
                            type="button"
                            onClick={() => setTotalPurchaseCost(String(planActualTotals.totalActualCost))}
                            className="text-[10px] font-bold text-blue-700 hover:underline"
                          >
                            Hitung otomatis ({formatIDR(planActualTotals.totalActualCost)})
                          </button>
                        )}
                      </div>
                      <input
                        type="number"
                        value={totalPurchaseCost}
                        onChange={(e) => setTotalPurchaseCost(e.target.value)}
                        placeholder={sumberPenerimaan === 'Dari Rencana Pembelian' ? String(planActualTotals.totalActualCost) : 'Contoh: 1500000'}
                        className="w-full rounded-xl border-2 border-[#E5DACE] bg-white px-3 py-2 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#2D241E]">
                        Metode Pembayaran <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e: any) => setPaymentMethod(e.target.value)}
                        className="w-full rounded-xl border-2 border-[#E5DACE] bg-white px-3 py-2 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
                      >
                        <option value="transfer">Transfer Bank (BCA/Mandiri)</option>
                        <option value="cash">Kas Tunai (Petty Cash)</option>
                        <option value="qris">QRIS Toko</option>
                        <option value="deposit">Deposit Supplier</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* ITEMS SECTION: SIDE-BY-SIDE IF DARI RENCANA PEMBELIAN, OR STANDARD TABLE */}
              {/* ========================================================================= */}
              {receiptType === 'Dibeli Sendiri' && sumberPenerimaan === 'Dari Rencana Pembelian' ? (
                /* SIDE-BY-SIDE PLANNED VS ACTUAL TABLE */
                <div className="rounded-2xl border-2 border-amber-300 bg-white p-5 space-y-4 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center gap-2">
                        <Layers className="h-4 w-4 text-amber-600" />
                        <span>Verifikasi Fisik: Rencana Pembelian (Planned) vs Aktual Diterima (Actual)</span>
                      </h4>
                      <p className="text-[11px] text-[#8C7B6C] mt-0.5">
                        Isi kuantitas aktual barang yang benar-benar diterima (&gt; 0). Nilai rencana dan aktual diperbolehkan berbeda tanpa memblokir proses penerimaan.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleFillAllPlannedQuantities}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-black text-white hover:bg-emerald-700 shadow-xs transition"
                        title="Isi seluruh kuantitas aktual sesuai dengan target rencana"
                      >
                        <Sparkles className="h-4 w-4" />
                        <span>Isi Semua Sesuai Rencana</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleAddItemRow}
                        className="flex items-center gap-1.5 rounded-xl bg-amber-100 border border-amber-300 px-3 py-1.5 text-xs font-black text-amber-900 hover:bg-amber-200 transition"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Tambah Item Tambahan</span>
                      </button>
                    </div>
                  </div>

                  {/* Side-by-side Table */}
                  <div className="space-y-3">
                    {receiptItems.map((item, idx) => {
                      const actualQty = Number(item.quantityReceived) || 0;
                      const actualPrice = Number(item.actualBuyPrice) || 0;
                      const actualSubtotal = actualQty * actualPrice;
                      const plannedQty = item.plannedQuantity || 0;
                      const qtyDiff = actualQty - plannedQty;

                      return (
                        <div
                          key={item.tempId}
                          className="grid grid-cols-1 lg:grid-cols-12 gap-3 rounded-2xl border-2 border-[#E5DACE] bg-[#FAF8F5] p-3.5 items-center"
                        >
                          {/* Row Number & Line Indicator */}
                          <div className="lg:col-span-1 flex items-center justify-between lg:justify-center">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-200 text-xs font-black text-amber-900">
                              #{idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveItemRow(item.tempId)}
                              className="lg:hidden p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg"
                              title="Hapus baris"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          {/* LEFT: PLANNED BOX (READ-ONLY REFERENCE) */}
                          <div className="lg:col-span-5 rounded-xl border border-[#E5DACE] bg-white p-3 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-wider text-[#8C7B6C]">
                                Sisi Terencana (Planned)
                              </span>
                              {item.plannedCategory && (
                                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold text-gray-700">
                                  {item.plannedCategory}
                                </span>
                              )}
                            </div>
                            <div className="font-bold text-xs text-[#2D241E]">
                              {item.plannedProductName || 'Item Tambahan (Tidak Ada di Rencana)'}
                            </div>
                            <div className="text-[11px] font-mono text-[#8C7B6C]">
                              SKU: {item.plannedSku || '-'}
                            </div>
                            <div className="flex items-center justify-between pt-1 border-t border-dashed border-gray-200 text-xs">
                              <span className="font-bold text-blue-900">
                                Rencana: {item.plannedQuantity ?? 0} pcs
                              </span>
                              <span className="text-[#8C7B6C]">
                                @ {formatIDR(item.plannedBuyPrice ?? 0)}
                              </span>
                              <span className="font-black text-amber-900">
                                {formatIDR(item.plannedLineTotal ?? 0)}
                              </span>
                            </div>
                          </div>

                          {/* MIDDLE: ARROW */}
                          <div className="hidden lg:flex lg:col-span-1 justify-center text-amber-600">
                            <ArrowRight className="h-5 w-5" />
                          </div>

                          {/* RIGHT: ACTUAL BOX (EDITABLE) */}
                          <div className="lg:col-span-5 rounded-xl border border-amber-300 bg-amber-50/40 p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-wider text-amber-900">
                                Sisi Aktual Diterima (Editable Actuals)
                              </span>

                              {/* Variance Badge */}
                              {item.plannedQuantity !== undefined && (
                                <>
                                  {actualQty === 0 && (
                                    <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-700">
                                      Belum Diterima (0 pcs)
                                    </span>
                                  )}
                                  {actualQty > 0 && qtyDiff === 0 && (
                                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800 border border-emerald-300">
                                      ✓ Sesuai Rencana
                                    </span>
                                  )}
                                  {actualQty > 0 && qtyDiff > 0 && (
                                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-800 border border-blue-300">
                                      +{qtyDiff} pcs (Lebih)
                                    </span>
                                  )}
                                  {actualQty > 0 && qtyDiff < 0 && (
                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800 border border-amber-300">
                                      {qtyDiff} pcs (Kurang)
                                    </span>
                                  )}
                                </>
                              )}
                            </div>

                            {/* Actual Product Select (Editable) */}
                            <div>
                              <label className="text-[10px] font-bold text-[#8C7B6C] block mb-0.5">Produk Diterima</label>
                              <select
                                value={item.productId}
                                onChange={(e) => handleUpdateItemRow(item.tempId, 'productId', e.target.value)}
                                className="w-full rounded-lg border border-[#E5DACE] bg-white px-2.5 py-1 text-xs font-bold text-[#2D241E] focus:outline-none"
                              >
                                {ownedProducts.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    [{p.sku}] {p.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Inputs: Actual Qty & Actual Buy Price */}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-bold text-[#2D241E] block mb-0.5">
                                  Aktual Diterima (pcs) <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  value={item.quantityReceived}
                                  onChange={(e) =>
                                    handleUpdateItemRow(item.tempId, 'quantityReceived', parseInt(e.target.value) || 0)
                                  }
                                  className="w-full rounded-lg border-2 border-amber-300 bg-white px-2.5 py-1 text-xs font-black text-emerald-800 focus:outline-none"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] font-bold text-[#2D241E] block mb-0.5">
                                  Harga Beli Aktual (Rp)
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  value={item.actualBuyPrice ?? 0}
                                  onChange={(e) =>
                                    handleUpdateItemRow(item.tempId, 'actualBuyPrice', parseFloat(e.target.value) || 0)
                                  }
                                  className="w-full rounded-lg border border-[#E5DACE] bg-white px-2.5 py-1 text-xs font-bold text-[#2D241E] focus:outline-none"
                                />
                              </div>
                            </div>

                            {/* Multi-Batch Expiry Dates per Item */}
                            <div className="pt-2 border-t border-amber-200/70 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5 text-amber-700" />
                                  <span className="text-[10px] font-black text-amber-950 uppercase tracking-wider">
                                    Batch & Tanggal Kadaluwarsa
                                  </span>
                                  <span className="rounded bg-emerald-100 border border-emerald-300 px-1 py-0.2 text-[9px] font-bold text-emerald-800">
                                    FEFO
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleAddBatch(item.tempId)}
                                  className="flex items-center gap-1 rounded-md bg-amber-200/80 hover:bg-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-900 transition"
                                >
                                  <Plus className="h-3 w-3" />
                                  <span>+ Expire Lain</span>
                                </button>
                              </div>

                              <div className="space-y-1">
                                {(item.expiryBatches || [
                                  {
                                    batchNumber: 'BCH-01',
                                    expiryDate: arrivalDate || new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
                                    quantity: actualQty,
                                  },
                                ]).map((batch, bIdx) => (
                                  <div
                                    key={bIdx}
                                    className="flex items-center gap-2 bg-white/90 rounded-lg p-1.5 border border-amber-200 text-xs"
                                  >
                                    <div className="w-18">
                                      <label className="text-[8px] font-bold text-[#8C7B6C] block">Batch</label>
                                      <input
                                        type="text"
                                        value={batch.batchNumber}
                                        onChange={(e) =>
                                          handleUpdateBatchField(item.tempId, bIdx, 'batchNumber', e.target.value)
                                        }
                                        className="w-full rounded border border-[#E5DACE] bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#2D241E]"
                                      />
                                    </div>
                                    <div className="flex-1">
                                      <label className="text-[8px] font-bold text-[#2D241E] block">
                                        Tgl Kadaluwarsa <span className="text-rose-500">*</span>
                                      </label>
                                      <input
                                        type="date"
                                        value={batch.expiryDate}
                                        onChange={(e) =>
                                          handleUpdateBatchField(item.tempId, bIdx, 'expiryDate', e.target.value)
                                        }
                                        className="w-full rounded border border-amber-300 bg-white px-1.5 py-0.5 text-[11px] font-bold text-[#2D241E] focus:outline-none"
                                      />
                                    </div>
                                    <div className="w-20">
                                      <label className="text-[8px] font-bold text-emerald-800 block text-center">
                                        Qty (pcs)
                                      </label>
                                      <input
                                        type="number"
                                        min={0}
                                        value={batch.quantity}
                                        onChange={(e) =>
                                          handleUpdateBatchField(
                                            item.tempId,
                                            bIdx,
                                            'quantity',
                                            parseInt(e.target.value) || 0
                                          )
                                        }
                                        className="w-full rounded border border-amber-300 bg-white px-1.5 py-0.5 text-[11px] font-black text-emerald-800 text-center focus:outline-none"
                                      />
                                    </div>
                                    {(item.expiryBatches?.length || 0) > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveBatch(item.tempId, bIdx)}
                                        className="p-1 text-rose-500 hover:bg-rose-50 rounded self-end mb-0.5"
                                        title="Hapus batch"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-dashed border-amber-200 text-xs">
                              <span className="text-[#8C7B6C] text-[11px]">Subtotal Aktual:</span>
                              <span className="font-black text-emerald-800">{formatIDR(actualSubtotal)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* STANDARD MANUAL ITEMS LIST */
                <div className="rounded-2xl border-2 border-[#E5DACE] bg-white p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-[#8C7B6C]">
                        Daftar Item Produk Diterima (Add to Sellable Stock)
                      </h4>
                      <p className="text-[11px] text-[#8C7B6C]">
                        Pilih produk master yang sudah dibuat. Stok akan bertambah otomatis begitu disimpan.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddItemRow}
                      className="flex items-center gap-1 rounded-xl bg-amber-100 px-3 py-1.5 text-xs font-bold text-[#D97706] hover:bg-amber-200 transition"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Tambah Baris Produk</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {receiptItems.map((item, idx) => {
                      const selectedProd = products.find((p) => p.id === item.productId);
                      const isRaw = rawMaterials.some((r) => r.id === item.productId);
                      const itemBatches = item.expiryBatches || [
                        {
                          batchNumber: 'BCH-01',
                          expiryDate: arrivalDate || new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
                          quantity: item.quantityReceived || 0,
                        },
                      ];

                      return (
                        <div
                          key={item.tempId}
                          className="rounded-xl border-2 border-[#E5DACE] bg-[#FDFBF7] p-3.5 space-y-2.5"
                        >
                          <div className="flex flex-col sm:flex-row items-center gap-3">
                            <div className="w-8 text-xs font-bold text-[#8C7B6C] text-center">#{idx + 1}</div>

                            <div className="flex-1 w-full space-y-1">
                              <label className="text-[10px] font-bold text-[#8C7B6C]">Produk / Bahan Baku Master</label>
                              <select
                                value={item.productId}
                                onChange={(e) => handleUpdateItemRow(item.tempId, 'productId', e.target.value)}
                                className="w-full rounded-lg border border-[#E5DACE] bg-white px-3 py-1.5 text-xs font-bold text-[#2D241E] focus:outline-none"
                              >
                                <optgroup label="🥖 Produk Jadi (Finished Goods)">
                                  {products.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      [{p.sku}] {p.name} (Stok Saat Ini: {p.stock} pcs)
                                    </option>
                                  ))}
                                </optgroup>
                                {rawMaterials.length > 0 && (
                                  <optgroup label="🥚 Raw Material (Bahan Baku)">
                                    {rawMaterials.map((r) => (
                                      <option key={r.id} value={r.id}>
                                        [{r.sku}] {r.name} (Stok Saat Ini: {r.stock} {r.unit})
                                      </option>
                                    ))}
                                  </optgroup>
                                )}
                              </select>
                            </div>

                            <div className="w-full sm:w-40 space-y-1">
                              <label className="text-[10px] font-bold text-[#2D241E]">Jumlah Diterima (Pcs)</label>
                              <input
                                type="number"
                                min={1}
                                value={item.quantityReceived}
                                onChange={(e) =>
                                  handleUpdateItemRow(item.tempId, 'quantityReceived', parseInt(e.target.value) || 0)
                                }
                                className="w-full rounded-lg border border-[#E5DACE] bg-white px-3 py-1.5 text-xs font-bold text-[#2D241E] focus:outline-none"
                              />
                            </div>

                            {selectedProd && (
                              <div className="hidden sm:block w-32 text-right">
                                <span className="text-[10px] text-[#8C7B6C] block">Harga Jual</span>
                                <span className="text-xs font-bold text-[#2D241E]">{formatIDR(selectedProd.price)}</span>
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => handleRemoveItemRow(item.tempId)}
                              className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 transition self-end sm:self-center"
                              title="Hapus baris"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Multi-Batch Expiry Dates per Item */}
                          <div className="pt-2 border-t border-amber-200/70 bg-amber-50/50 rounded-lg p-2.5 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-amber-700" />
                                <span className="text-[10px] font-black text-amber-950 uppercase tracking-wider">
                                  Batch & Tanggal Kadaluwarsa
                                </span>
                                {selectedProd?.expiryType === 'multi_day' ? (
                                  <span className="rounded bg-blue-100 border border-blue-300 px-1.5 py-0.5 text-[9px] font-black text-blue-900">
                                    ⏳ Expired &gt; 1 Hari (Closing Harian)
                                  </span>
                                ) : selectedProd?.expiryType === 'daily' ? (
                                  <span className="rounded bg-amber-100 border border-amber-300 px-1.5 py-0.5 text-[9px] font-black text-amber-900">
                                    ⚡ Expired Harian
                                  </span>
                                ) : isRaw ? (
                                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-medium text-gray-600">
                                    Opsional Bahan Baku
                                  </span>
                                ) : (
                                  <span className="rounded bg-emerald-100 border border-emerald-300 px-1 py-0.2 text-[9px] font-bold text-emerald-800">
                                    Wajib FEFO
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleAddBatch(item.tempId)}
                                className="flex items-center gap-1 rounded-md bg-amber-200/80 hover:bg-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-900 transition cursor-pointer"
                              >
                                <Plus className="h-3 w-3" />
                                <span>+ Expire Lain</span>
                              </button>
                            </div>

                            <div className="space-y-1.5">
                              {itemBatches.map((batch, bIdx) => (
                                <div
                                  key={bIdx}
                                  className="bg-white rounded-lg p-2 border border-amber-200 text-xs space-y-1.5"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="w-20">
                                      <label className="text-[8px] font-bold text-[#8C7B6C] block">Batch</label>
                                      <input
                                        type="text"
                                        value={batch.batchNumber}
                                        onChange={(e) =>
                                          handleUpdateBatchField(item.tempId, bIdx, 'batchNumber', e.target.value)
                                        }
                                        className="w-full rounded border border-[#E5DACE] bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#2D241E]"
                                      />
                                    </div>
                                    <div className="flex-1">
                                      <label className="text-[8px] font-bold text-[#2D241E] block">
                                        Tgl Kadaluwarsa <span className={isRaw ? 'text-gray-400' : 'text-rose-500'}>*</span>
                                      </label>
                                      <input
                                        type="date"
                                        value={batch.expiryDate}
                                        onChange={(e) =>
                                          handleUpdateBatchField(item.tempId, bIdx, 'expiryDate', e.target.value)
                                        }
                                        className="w-full rounded border border-amber-300 bg-white px-1.5 py-0.5 text-[11px] font-bold text-[#2D241E] focus:outline-none"
                                      />
                                    </div>
                                    <div className="w-20">
                                      <label className="text-[8px] font-bold text-emerald-800 block text-center">
                                        Qty (pcs)
                                      </label>
                                      <input
                                        type="number"
                                        min={0}
                                        value={batch.quantity}
                                        onChange={(e) =>
                                          handleUpdateBatchField(
                                            item.tempId,
                                            bIdx,
                                            'quantity',
                                            parseInt(e.target.value) || 0
                                          )
                                        }
                                        className="w-full rounded border border-amber-300 bg-white px-1.5 py-0.5 text-[11px] font-black text-emerald-800 text-center focus:outline-none"
                                      />
                                    </div>
                                    {itemBatches.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveBatch(item.tempId, bIdx)}
                                        className="p-1 text-rose-500 hover:bg-rose-50 rounded self-end mb-0.5"
                                        title="Hapus batch"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    )}
                                  </div>

                                  {/* Quick date presets for multi_day or any product */}
                                  <div className="flex items-center justify-between pt-1 border-t border-dashed border-gray-100">
                                    <span className="text-[9px] text-[#8C7B6C] font-medium">
                                      {selectedProd?.expiryType === 'multi_day'
                                        ? '⏳ Penyesuaian Expiry > 1 Hari (Masuk Closing Harian):'
                                        : 'Shortcut Hari:'}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      {[
                                        { label: '+3H', days: 3 },
                                        { label: '+7H', days: 7 },
                                        { label: '+14H', days: 14 },
                                        { label: '+30H', days: 30 },
                                      ].map((preset) => (
                                        <button
                                          key={preset.days}
                                          type="button"
                                          onClick={() => {
                                            const d = new Date(Date.now() + preset.days * 86400000).toISOString().slice(0, 10);
                                            handleUpdateBatchField(item.tempId, bIdx, 'expiryDate', d);
                                          }}
                                          className="rounded border border-amber-300 bg-amber-50 hover:bg-amber-100 px-1.5 py-0.5 text-[9px] font-black text-amber-900 transition cursor-pointer"
                                        >
                                          {preset.label}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Remarks */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#2D241E]">Catatan / Keterangan Kondisi Barang (Opsional)</label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Contoh: Kemasan aman, diterima lengkap tanpa ada barang cacat..."
                  className="w-full rounded-xl border-2 border-[#E5DACE] bg-[#FDFBF7] px-3.5 py-2 text-xs font-semibold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
                />
              </div>

              {/* Validation Warning right above Submit Button if any */}
              {receiptType === 'Dibeli Sendiri' && sumberPenerimaan === 'Dari Rencana Pembelian' && planActualTotals.totalActualQty === 0 && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Total aktual diterima masih 0 pcs. Masukkan kuantitas aktual atau klik &quot;Isi Semua Sesuai Rencana&quot;.</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleFillAllPlannedQuantities}
                    className="underline font-bold text-amber-950 hover:text-emerald-700 text-xs shrink-0"
                  >
                    Isi Semua Sekarang
                  </button>
                </div>
              )}

              {/* Modal Footer Actions - Bottom-right Tutup button */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t-2 border-[#E5DACE]">
                <div className="text-xs text-[#8C7B6C] font-semibold">
                  {receiptType === 'Dibeli Sendiri' && sumberPenerimaan === 'Dari Rencana Pembelian' ? (
                    <span>
                      Total Realisasi: <strong className="text-emerald-700 font-bold">{planActualTotals.totalActualQty} pcs</strong> barang masuk stok jual
                    </span>
                  ) : (
                    <span>
                      Total Diterima: <strong className="text-emerald-700 font-bold">{receiptItems.reduce((s, i) => s + (Number(i.quantityReceived) || 0), 0)} pcs</strong> barang masuk stok jual
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 self-end">
                  <button
                    id="submit-goods-receipt-save-btn"
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 rounded-xl bg-[#D97706] px-6 py-2.5 text-xs font-black text-white hover:bg-amber-700 active:scale-95 transition shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    <Check className="h-4 w-4" />
                    <span>{isSubmitting ? 'Menyimpan...' : 'Simpan & Tambah ke Stok Jual'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseCreateModal}
                    className="rounded-xl border border-[#E5DACE] bg-white px-5 py-2.5 text-xs font-bold text-[#8C7B6C] hover:bg-[#E5DACE] transition"
                  >
                    Tutup / Batal
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DETAIL RECEIPT MODAL (NO NESTED POPUPS, BOTTOM-RIGHT TUTUP BUTTON) */}
      {/* ========================================================================= */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="flex w-full max-w-3xl flex-col rounded-3xl bg-white shadow-2xl border-2 border-[#E5DACE] overflow-hidden animate-fadeIn">
            <div className="flex items-center justify-between border-b-2 border-[#E5DACE] bg-[#FDFBF7] px-6 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-amber-100 px-2 py-0.5 text-[11px] font-black text-[#D97706]">
                    {selectedReceipt.receiptNumber}
                  </span>
                  {selectedReceipt.purchasePlanId && (
                    <span className="rounded-lg bg-blue-100 px-2 py-0.5 text-[11px] font-black text-blue-900 border border-blue-200">
                      Rencana: {selectedReceipt.purchasePlanId}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-black text-[#2D241E] mt-1">Detail Bukti Penerimaan Barang</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="rounded-xl border border-[#E5DACE] bg-white px-4 py-2 text-xs font-bold text-[#8C7B6C] hover:bg-[#E5DACE]"
              >
                ✕ Tutup
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs scrollbar-thin">
              <div className="grid grid-cols-2 gap-4 rounded-2xl bg-[#FDFBF7] p-4 border border-[#E5DACE]">
                <div>
                  <span className="text-[#8C7B6C] block">Tipe Penerimaan:</span>
                  <strong className="text-[#2D241E] text-sm">{selectedReceipt.receiptType}</strong>
                </div>
                <div>
                  <span className="text-[#8C7B6C] block">Sumber Penerimaan:</span>
                  <strong className="text-[#2D241E] text-sm">
                    {selectedReceipt.sourceType || (selectedReceipt.purchasePlanId ? 'Dari Rencana Pembelian' : 'Manual')}
                  </strong>
                </div>
                <div>
                  <span className="text-[#8C7B6C] block">Tanggal Tiba:</span>
                  <strong className="text-[#2D241E] text-sm">{selectedReceipt.arrivalDate}</strong>
                </div>
                <div>
                  <span className="text-[#8C7B6C] block">Mitra Supplier:</span>
                  <strong className="text-[#2D241E] text-sm">{selectedReceipt.supplierName}</strong>
                </div>
                <div>
                  <span className="text-[#8C7B6C] block">Petugas Penerima:</span>
                  <strong className="text-[#2D241E] text-sm">{selectedReceipt.receivedBy}</strong>
                </div>
                <div>
                  <span className="text-[#8C7B6C] block">Traceable Stock Movement Ref:</span>
                  <strong className="font-mono text-[#D97706] text-sm">{selectedReceipt.stockMovementRef}</strong>
                </div>
                {selectedReceipt.totalPurchaseCost !== undefined && (
                  <>
                    <div>
                      <span className="text-[#8C7B6C] block">Total Biaya Pembelian:</span>
                      <strong className="text-emerald-700 text-sm">{formatIDR(selectedReceipt.totalPurchaseCost)}</strong>
                    </div>
                    <div>
                      <span className="text-[#8C7B6C] block">Metode Pembayaran:</span>
                      <strong className="text-[#2D241E] text-sm uppercase">{selectedReceipt.paymentMethod}</strong>
                    </div>
                  </>
                )}
              </div>

              {selectedReceipt.purchasePlanId && selectedReceipt.totalPlannedValue !== undefined && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-blue-900 font-bold">
                    <ClipboardList className="h-4 w-4 text-blue-700" />
                    <span>Total Nilai Rencana Awal:</span>
                  </div>
                  <span className="font-black text-blue-950">{formatIDR(selectedReceipt.totalPlannedValue)}</span>
                </div>
              )}

              <div className="space-y-2">
                <h4 className="font-black text-[#2D241E]">
                  Daftar Item Barang Diterima ({selectedReceipt.totalQuantity} pcs total):
                </h4>
                <div className="rounded-2xl border border-[#E5DACE] overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#FDFBF7] border-b border-[#E5DACE] text-[#8C7B6C]">
                        <th className="p-3">SKU</th>
                        <th className="p-3">Nama Produk</th>
                        {selectedReceipt.purchasePlanId && (
                          <th className="p-3 text-right">Rencana Qty</th>
                        )}
                        <th className="p-3 text-right">Aktual Diterima</th>
                        {selectedReceipt.purchasePlanId && (
                          <th className="p-3 text-right">Harga Beli Aktual</th>
                        )}
                        <th className="p-3 text-right">Harga Jual</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReceipt.items.map((it) => (
                        <tr key={it.id} className="border-b border-[#E5DACE]/60 hover:bg-[#FDFBF7]/50">
                          <td className="p-3 font-mono font-bold text-[#D97706]">{it.productSku}</td>
                          <td className="p-3 font-bold text-[#2D241E]">
                            <div>{it.productName}</div>
                            {it.expiryBatches && it.expiryBatches.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {it.expiryBatches.map((b, bi) => (
                                  <span
                                    key={bi}
                                    className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-900 border border-amber-200"
                                  >
                                    <Calendar className="h-2.5 w-2.5 text-amber-700" />
                                    <span>{b.batchNumber}: Exp {b.expiryDate} ({b.quantity} pcs)</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          {selectedReceipt.purchasePlanId && (
                            <td className="p-3 text-right font-bold text-blue-900">
                              {it.plannedQuantity !== undefined ? `${it.plannedQuantity} pcs` : '-'}
                            </td>
                          )}
                          <td className="p-3 text-right font-black text-emerald-700">
                            +{it.quantityReceived} pcs
                          </td>
                          {selectedReceipt.purchasePlanId && (
                            <td className="p-3 text-right font-bold text-gray-700">
                              {it.actualBuyPrice ? formatIDR(it.actualBuyPrice) : '-'}
                            </td>
                          )}
                          <td className="p-3 text-right font-bold text-[#2D241E]">
                            {formatIDR(it.sellingPrice)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedReceipt.remarks && (
                <div className="rounded-xl bg-amber-50/60 p-3.5 border border-amber-200">
                  <span className="font-bold text-amber-900 block mb-1">Catatan Kondisi Barang:</span>
                  <p className="text-amber-800 italic">{selectedReceipt.remarks}</p>
                </div>
              )}
            </div>

            {/* Bottom-right Tutup button */}
            <div className="flex items-center justify-end gap-3 border-t-2 border-[#E5DACE] bg-[#FDFBF7] px-6 py-4">
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="rounded-xl bg-[#2D241E] px-5 py-2 text-xs font-bold text-white hover:bg-black transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
