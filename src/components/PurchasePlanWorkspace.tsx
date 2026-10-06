import React, { useState, useMemo } from 'react';
import {
  ClipboardList,
  Plus,
  Search,
  Building2,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  ArrowLeft,
  Edit3,
  Ban,
  FileText,
  DollarSign,
  Package,
  Trash2,
  Info,
  ShieldAlert,
  Calendar,
  X,
  Layers,
  ArrowUpRight,
  Eye,
  Paperclip,
  CheckSquare,
  Square,
  Sparkles,
  ChevronDown,
  Filter,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { PurchasePlan, PurchasePlanStatus, Product, PurchasePlanItemType, Order } from '../types';
import { formatIDR, formatDateTime } from '../utils/formatters';

interface ProductLineInput {
  tempId: string;
  productId: string;
  plannedQuantity: number;
  plannedBuyPrice: number;
  itemType: PurchasePlanItemType;
  sourcePoRef?: string;
  supplierId?: string;
  notes?: string;
}

export const PurchasePlanWorkspace: React.FC = () => {
  const {
    currentUser,
    branches,
    suppliers,
    products,
    purchasePlans,
    orders,
    addPurchasePlan,
    updatePurchasePlan,
    cancelPurchasePlan,
  } = usePOS();

  // Superadmin permission verification
  const isSuperadmin = currentUser.role === 'admin';

  // Navigation state within module: 'list' | 'create' | 'detail' | 'edit'
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'detail' | 'edit'>('list');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  // List Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBranchId, setFilterBranchId] = useState('all');
  const [filterSupplierId, setFilterSupplierId] = useState('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Form State (Create / Edit)
  const [formNamaRencana, setFormNamaRencana] = useState('');
  const [formBranchId, setFormBranchId] = useState('');
  const [formSupplierId, setFormSupplierId] = useState('multi');
  const [formNotes, setFormNotes] = useState('');
  const [formLines, setFormLines] = useState<ProductLineInput[]>([]);
  const [formSourceOrderIds, setFormSourceOrderIds] = useState<string[]>([]);
  const [formAttachedPoNumbers, setFormAttachedPoNumbers] = useState<string[]>([]);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Multi-PO Attachment Modal State
  const [isAttachPoModalOpen, setIsAttachPoModalOpen] = useState(false);
  const [tempSelectedPoIds, setTempSelectedPoIds] = useState<string[]>([]);
  const [poSearchQuery, setPoSearchQuery] = useState('');

  // Form Line Type Filter tab in editor
  const [lineTypeTab, setLineTypeTab] = useState<'all' | PurchasePlanItemType>('all');

  // Cancel Modal State (Superadmin cancellation)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  // Active customer orders eligible for attaching to purchase plan (excluding voided/cancelled)
  const availableOrdersForPlanning = useMemo(() => {
    return orders.filter((o) => o.orderStatus !== 'voided' && o.orderStatus !== 'cancelled');
  }, [orders]);

  // Available products
  const allProducts = products;
  const ownedProducts = products;

  // Total estimation of plan form lines
  const calculatedFormTotal = useMemo(() => {
    return formLines.reduce(
      (sum, l) => sum + (Number(l.plannedQuantity) || 0) * (Number(l.plannedBuyPrice) || 0),
      0
    );
  }, [formLines]);

  // Selected plan detail object
  const activePlan = useMemo(() => {
    if (!selectedPlanId) return null;
    return purchasePlans.find((p) => p.id === selectedPlanId) || null;
  }, [purchasePlans, selectedPlanId]);

  // Filtered plans list
  const filteredPlans = useMemo(() => {
    return purchasePlans.filter((plan) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = plan.id.toLowerCase().includes(q);
        const matchName = plan.namaRencana.toLowerCase().includes(q);
        const matchSupplier = plan.supplierName.toLowerCase().includes(q);
        const matchPo = plan.attachedPoNumbers?.some((po) => po.toLowerCase().includes(q));
        if (!matchId && !matchName && !matchSupplier && !matchPo) return false;
      }

      if (filterBranchId !== 'all' && plan.branchId !== filterBranchId) {
        return false;
      }

      if (filterSupplierId !== 'all' && plan.supplierId !== filterSupplierId) {
        return false;
      }

      if (filterStatus !== 'all' && plan.status !== filterStatus) {
        return false;
      }

      if (filterStartDate) {
        const planDateStr = plan.createdAt.substring(0, 10);
        if (planDateStr < filterStartDate) return false;
      }
      if (filterEndDate) {
        const planDateStr = plan.createdAt.substring(0, 10);
        if (planDateStr > filterEndDate) return false;
      }

      return true;
    });
  }, [purchasePlans, searchQuery, filterBranchId, filterSupplierId, filterStatus, filterStartDate, filterEndDate]);

  // Statistics counters
  const stats = useMemo(() => {
    const total = purchasePlans.length;
    const direncanakan = purchasePlans.filter((p) => p.status === 'Direncanakan').length;
    const terkait = purchasePlans.filter((p) => p.status === 'Terkait Penerimaan').length;
    const terealisasi = purchasePlans.filter((p) => p.status === 'Terealisasi').length;
    const dibatalkan = purchasePlans.filter((p) => p.status === 'Dibatalkan').length;
    const totalPlannedValue = purchasePlans
      .filter((p) => p.status !== 'Dibatalkan')
      .reduce((sum, p) => sum + p.totalPlannedValue, 0);

    return { total, direncanakan, terkait, terealisasi, dibatalkan, totalPlannedValue };
  }, [purchasePlans]);

  // Helper to infer item type for an item or product
  const inferItemType = (prod?: Product, cartItemOwnership?: string): PurchasePlanItemType => {
    if (!prod) return 'direct_purchase';
    if (prod.ownershipType === 'consignment' || cartItemOwnership === 'consignment') {
      return 'consignment';
    }
    if (prod.isMadeToOrder || prod.category === 'Pastry' || prod.category === 'Bakery' || prod.categoryLabel?.toLowerCase().includes('pastry') || prod.categoryLabel?.toLowerCase().includes('roti')) {
      return 'in_house';
    }
    return 'direct_purchase';
  };

  // Initialize Create Form
  const handleStartCreate = () => {
    if (!isSuperadmin) return;
    const firstActiveBranch = branches.find((b) => b.status !== 'inactive') || branches[0];
    const defaultProduct = products[0];

    setFormNamaRencana('');
    setFormBranchId(firstActiveBranch?.id || '');
    setFormSupplierId('multi');
    setFormNotes('');
    setFormSourceOrderIds([]);
    setFormAttachedPoNumbers([]);
    setFormLines(
      defaultProduct
        ? [
            {
              tempId: `line-${Date.now()}-1`,
              productId: defaultProduct.id,
              plannedQuantity: 10,
              plannedBuyPrice: Math.round(defaultProduct.price * 0.6),
              itemType: inferItemType(defaultProduct),
              sourcePoRef: 'Input Manual',
              supplierId: defaultProduct.supplierId || suppliers[0]?.id,
            },
          ]
        : []
    );
    setFormError('');
    setFormSuccess('');
    setViewMode('create');
  };

  // Initialize Edit Form
  const handleStartEdit = (plan: PurchasePlan) => {
    if (!isSuperadmin) return;
    if (plan.status !== 'Direncanakan') {
      alert(`Hanya rencana berstatus "Direncanakan" yang dapat diedit! (Status saat ini: ${plan.status})`);
      return;
    }

    setSelectedPlanId(plan.id);
    setFormNamaRencana(plan.namaRencana);
    setFormBranchId(plan.branchId); // Locked in UI
    setFormSupplierId(plan.supplierId);
    setFormNotes(plan.notes || '');
    setFormSourceOrderIds(plan.sourceOrderIds || []);
    setFormAttachedPoNumbers(plan.attachedPoNumbers || []);
    setFormLines(
      plan.lines.map((l, idx) => ({
        tempId: `line-${Date.now()}-${idx}`,
        productId: l.productId,
        plannedQuantity: l.plannedQuantity,
        plannedBuyPrice: l.plannedBuyPrice,
        itemType: l.itemType || 'direct_purchase',
        sourcePoRef: l.sourcePoRef || 'Rencana Awal',
        supplierId: l.supplierId,
        notes: l.notes,
      }))
    );
    setFormError('');
    setFormSuccess('');
    setViewMode('edit');
  };

  // View Detail
  const handleViewDetail = (planId: string) => {
    setSelectedPlanId(planId);
    setViewMode('detail');
  };

  // Add line to form
  const handleAddFormLine = (preferredType: PurchasePlanItemType = 'direct_purchase') => {
    const prodToAdd = products[0];
    if (!prodToAdd) {
      setFormError('Tidak ada produk yang tersedia.');
      return;
    }
    setFormLines((prev) => [
      ...prev,
      {
        tempId: `line-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productId: prodToAdd.id,
        plannedQuantity: 10,
        plannedBuyPrice: Math.round(prodToAdd.price * 0.6),
        itemType: preferredType,
        sourcePoRef: preferredType === 'adhoc' ? 'Ad-Hoc / Tambahan' : 'Input Manual',
        supplierId: prodToAdd.supplierId || (suppliers[0]?.id),
      },
    ]);
  };

  // Add Ad-Hoc Plan Line
  const handleAddAdhocLine = () => {
    handleAddFormLine('adhoc');
  };

  // Remove line from form
  const handleRemoveFormLine = (tempId: string) => {
    if (formLines.length <= 1) {
      setFormError('Minimal harus ada 1 baris item produk dalam rencana pembelian!');
      return;
    }
    setFormLines((prev) => prev.filter((l) => l.tempId !== tempId));
  };

  // Update line in form
  const handleUpdateFormLine = (
    tempId: string,
    field: keyof ProductLineInput,
    value: any
  ) => {
    setFormLines((prev) =>
      prev.map((l) => {
        if (l.tempId === tempId) {
          return { ...l, [field]: value };
        }
        return l;
      })
    );
  };

  // Open Multi-PO attach modal
  const handleOpenAttachPoModal = () => {
    setTempSelectedPoIds([...formSourceOrderIds]);
    setPoSearchQuery('');
    setIsAttachPoModalOpen(true);
  };

  // Confirm attach selected POs and pull items into formLines
  const handleConfirmAttachOrders = () => {
    if (tempSelectedPoIds.length === 0) {
      setIsAttachPoModalOpen(false);
      return;
    }

    const selectedOrders = availableOrdersForPlanning.filter((o) => tempSelectedPoIds.includes(o.id));
    const attachedPoNumbers = selectedOrders.map((o) => `#${o.orderNumber}`);

    // Aggregate items across selected POs by productId and inferred itemType
    interface AggregatedItem {
      productId: string;
      productName: string;
      quantity: number;
      price: number;
      itemType: PurchasePlanItemType;
      sourcePos: string[];
      supplierId?: string;
    }

    const aggregatedMap = new Map<string, AggregatedItem>();

    selectedOrders.forEach((order) => {
      order.items.forEach((item) => {
        const prod = products.find((p) => p.id === item.productId);
        const itemType = inferItemType(prod, item.ownershipType);
        const aggKey = `${item.productId}_${itemType}`;

        if (!aggregatedMap.has(aggKey)) {
          aggregatedMap.set(aggKey, {
            productId: item.productId,
            productName: item.productName || prod?.name || 'Item',
            quantity: item.quantity,
            price: Math.round(item.unitPrice * 0.6),
            itemType,
            sourcePos: [`#${order.orderNumber}`],
            supplierId: item.supplierId || prod?.supplierId,
          });
        } else {
          const existing = aggregatedMap.get(aggKey)!;
          existing.quantity += item.quantity;
          if (!existing.sourcePos.includes(`#${order.orderNumber}`)) {
            existing.sourcePos.push(`#${order.orderNumber}`);
          }
        }
      });
    });

    // Retain existing manual/adhoc lines if any, or combine
    const preservedLines = formLines.filter((l) => !l.sourcePoRef?.startsWith('PO #'));

    const newLinesFromPo: ProductLineInput[] = Array.from(aggregatedMap.values()).map((agg, idx) => ({
      tempId: `po-line-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      productId: agg.productId,
      plannedQuantity: agg.quantity,
      plannedBuyPrice: agg.price,
      itemType: agg.itemType,
      sourcePoRef: `PO ${agg.sourcePos.join(', ')}`,
      supplierId: agg.supplierId || (suppliers[0]?.id),
      notes: `Kebutuhan dari ${agg.sourcePos.join(', ')}`,
    }));

    const finalLines = [...newLinesFromPo, ...preservedLines];

    setFormLines(finalLines);
    setFormSourceOrderIds(tempSelectedPoIds);
    setFormAttachedPoNumbers(attachedPoNumbers);

    // Auto-suggest name if empty
    if (!formNamaRencana.trim() || formNamaRencana.startsWith('Rencana Pengadaan PO:')) {
      const summaryPos = attachedPoNumbers.slice(0, 3).join(', ') + (attachedPoNumbers.length > 3 ? ` (+${attachedPoNumbers.length - 3} PO)` : '');
      setFormNamaRencana(`Rencana Pengadaan PO: ${summaryPos}`);
    }

    // Default supplier to multi
    if (!formSupplierId || formSupplierId === '') {
      setFormSupplierId('multi');
    }

    setIsAttachPoModalOpen(false);
  };

  // Selected supplier in form for category preview
  const formSelectedSupplier = useMemo(() => {
    if (formSupplierId === 'multi') {
      return { id: 'multi', name: 'Multi-Sumber / Terpadu', category: 'In-House, Konsinyasi & Supplier Langsung' };
    }
    return suppliers.find((s) => s.id === formSupplierId);
  }, [suppliers, formSupplierId]);

  // Handle Save Plan (Create or Edit)
  const handleSavePlan = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!formNamaRencana.trim()) {
      setFormError('Nama Rencana Pembelian wajib diisi!');
      return;
    }

    if (!formBranchId) {
      setFormError('Cabang wajib dipilih!');
      return;
    }

    if (formLines.length === 0) {
      setFormError('Minimal harus ada 1 baris item produk!');
      return;
    }

    // Validate quantities
    for (let i = 0; i < formLines.length; i++) {
      const l = formLines[i];
      if (!l.plannedQuantity || l.plannedQuantity <= 0) {
        setFormError(`Kuantitas pada baris #${i + 1} harus lebih besar dari 0!`);
        return;
      }
    }

    if (viewMode === 'create') {
      const res = addPurchasePlan({
        namaRencana: formNamaRencana,
        branchId: formBranchId,
        supplierId: formSupplierId,
        lines: formLines.map((l) => ({
          productId: l.productId,
          plannedQuantity: Number(l.plannedQuantity),
          plannedBuyPrice: Number(l.plannedBuyPrice) || 0,
          itemType: l.itemType,
          sourcePoRef: l.sourcePoRef,
          supplierId: l.supplierId,
          notes: l.notes,
        })),
        notes: formNotes,
        sourceOrderIds: formSourceOrderIds,
        attachedPoNumbers: formAttachedPoNumbers,
      });

      if (res.success && res.plan) {
        setFormSuccess(res.message);
        setSelectedPlanId(res.plan.id);
        setTimeout(() => {
          setViewMode('detail');
        }, 800);
      } else {
        setFormError(res.message);
      }
    } else if (viewMode === 'edit' && selectedPlanId) {
      const res = updatePurchasePlan(selectedPlanId, {
        namaRencana: formNamaRencana,
        supplierId: formSupplierId,
        lines: formLines.map((l) => ({
          productId: l.productId,
          plannedQuantity: Number(l.plannedQuantity),
          plannedBuyPrice: Number(l.plannedBuyPrice) || 0,
          itemType: l.itemType,
          sourcePoRef: l.sourcePoRef,
          supplierId: l.supplierId,
          notes: l.notes,
        })),
        notes: formNotes,
        sourceOrderIds: formSourceOrderIds,
        attachedPoNumbers: formAttachedPoNumbers,
      });

      if (res.success && res.plan) {
        setFormSuccess(res.message);
        setTimeout(() => {
          setViewMode('detail');
        }, 800);
      } else {
        setFormError(res.message);
      }
    }
  };

  // Open Cancel Modal
  const handleOpenCancelModal = (planId: string) => {
    setCancelTargetId(planId);
    setCancelReason('');
    setCancelError('');
    setIsCancelModalOpen(true);
  };

  // Confirm Cancellation
  const handleConfirmCancel = () => {
    if (!cancelTargetId) return;
    setCancelError('');

    const res = cancelPurchasePlan(cancelTargetId, cancelReason.trim());
    if (res.success) {
      setIsCancelModalOpen(false);
      setCancelTargetId(null);
    } else {
      setCancelError(res.message);
    }
  };

  // Status Badge Component
  const renderStatusBadge = (status: PurchasePlanStatus) => {
    switch (status) {
      case 'Direncanakan':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700 border border-blue-200">
            <Clock className="h-3 w-3" />
            <span>Direncanakan</span>
          </span>
        );
      case 'Terkait Penerimaan':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-black text-purple-700 border border-purple-200">
            <Layers className="h-3 w-3" />
            <span>Terkait Penerimaan</span>
          </span>
        );
      case 'Terealisasi':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3" />
            <span>Terealisasi</span>
          </span>
        );
      case 'Dibatalkan':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-black text-rose-700 border border-rose-200">
            <XCircle className="h-3 w-3" />
            <span>Dibatalkan</span>
          </span>
        );
      default:
        return null;
    }
  };

  // If not Superadmin, block access cleanly
  if (!isSuperadmin) {
    return (
      <div className="flex h-full w-full items-center justify-center p-6 bg-[#FAF8F5]">
        <div className="max-w-md rounded-3xl border-2 border-rose-200 bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-black text-[#2D241E]">Akses Khusus Superadmin</h2>
          <p className="mt-2 text-xs text-[#8C7B6C] leading-relaxed">
            Modul <strong>Rencana Pembelian (PO Owned Goods)</strong> hanya dapat diakses, dibuat, dan dikelola oleh peran <strong>Superadmin</strong>. Peran Anda saat ini: <span className="font-bold text-rose-600 uppercase">{currentUser.role}</span>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white">
      {/* ========================================================================= */}
      {/* 1. LIST VIEW */}
      {/* ========================================================================= */}
      {viewMode === 'list' && (
        <div className="flex flex-col h-full overflow-hidden">
          {/* Top Banner & Module Header */}
          <div className="border-b-2 border-[#E5DACE] bg-[#FDFBF7] px-6 py-3.5 shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-xs font-black">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-[#2D241E]">
                    Rencana Pembelian Barang (Purchase Plan)
                  </h2>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-800 border border-blue-200 uppercase">
                    Owned Purchases Only
                  </span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800 border border-amber-200 uppercase">
                    Superadmin Only
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  id="btn-buat-rencana-baru"
                  type="button"
                  onClick={handleStartCreate}
                  className="flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-black text-white hover:bg-amber-700 active:scale-95 transition shadow-xs"
                >
                  <Plus className="h-4 w-4" />
                  <span>Buat Rencana Baru</span>
                </button>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#E5DACE] bg-[#FDFBF7] px-6 py-3 shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8C7B6C]" />
                <input
                  id="search-purchase-plan-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari ID (RP-...) / Nama Rencana..."
                  className="w-60 rounded-xl border-2 border-[#E5DACE] bg-white pl-9 pr-3 py-1.5 text-xs font-semibold text-[#2D241E] focus:border-amber-600 focus:outline-none"
                />
              </div>

              {/* Branch Filter */}
              <select
                id="filter-branch-select"
                value={filterBranchId}
                onChange={(e) => setFilterBranchId(e.target.value)}
                className="rounded-xl border-2 border-[#E5DACE] bg-white px-3 py-1.5 text-xs font-bold text-[#2D241E] focus:border-amber-600 focus:outline-none"
              >
                <option value="all">Semua Cabang</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>

              {/* Supplier Filter */}
              <select
                id="filter-supplier-select"
                value={filterSupplierId}
                onChange={(e) => setFilterSupplierId(e.target.value)}
                className="rounded-xl border-2 border-[#E5DACE] bg-white px-3 py-1.5 text-xs font-bold text-[#2D241E] focus:border-amber-600 focus:outline-none"
              >
                <option value="all">Semua Supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                id="filter-status-select"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-xl border-2 border-[#E5DACE] bg-white px-3 py-1.5 text-xs font-bold text-[#2D241E] focus:border-amber-600 focus:outline-none"
              >
                <option value="all">Semua Status</option>
                <option value="Direncanakan">Direncanakan</option>
                <option value="Terkait Penerimaan">Terkait Penerimaan</option>
                <option value="Terealisasi">Terealisasi</option>
                <option value="Dibatalkan">Dibatalkan</option>
              </select>

              {/* Date Range */}
              <div className="flex items-center gap-1 text-xs text-[#8C7B6C] bg-white border-2 border-[#E5DACE] rounded-xl px-2.5 py-1">
                <Calendar className="h-3.5 w-3.5 text-[#8C7B6C]" />
                <span className="text-[10px] font-bold">Dari:</span>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="text-xs font-semibold text-[#2D241E] focus:outline-none bg-transparent"
                />
                <span className="text-[10px] font-bold ml-1">S/D:</span>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="text-xs font-semibold text-[#2D241E] focus:outline-none bg-transparent"
                />
              </div>

              {(searchQuery || filterBranchId !== 'all' || filterSupplierId !== 'all' || filterStatus !== 'all' || filterStartDate || filterEndDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterBranchId('all');
                    setFilterSupplierId('all');
                    setFilterStatus('all');
                    setFilterStartDate('');
                    setFilterEndDate('');
                  }}
                  className="flex items-center gap-1 rounded-xl px-2 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 transition"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Reset Filter</span>
                </button>
              )}
            </div>

            <span className="text-xs font-bold text-[#8C7B6C]">
              Menampilkan {filteredPlans.length} dari {purchasePlans.length} rencana
            </span>
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
            {filteredPlans.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#E5DACE] bg-[#FAF8F5] p-12 text-center">
                <ClipboardList className="h-12 w-12 text-[#8C7B6C] opacity-40 mb-3" />
                <h3 className="text-sm font-black text-[#2D241E]">Tidak Ada Rencana Pembelian Ditemukan</h3>
                <p className="text-xs text-[#8C7B6C] mt-1 max-w-sm">
                  Tidak ada data yang cocok dengan kriteria pencarian atau filter yang dipilih. Silakan buat rencana baru atau bersihkan filter.
                </p>
                <button
                  type="button"
                  onClick={handleStartCreate}
                  className="mt-4 flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-black text-white hover:bg-amber-700 shadow-xs transition"
                >
                  <Plus className="h-4 w-4" />
                  <span>Buat Rencana Pembelian Baru</span>
                </button>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border-2 border-[#E5DACE] bg-white shadow-xs">
                <table className="w-full text-left text-xs text-[#2D241E]">
                  <thead className="border-b-2 border-[#E5DACE] bg-[#FDFBF7] text-[11px] font-black uppercase tracking-wider text-[#8C7B6C]">
                    <tr>
                      <th className="px-4 py-3">ID Rencana</th>
                      <th className="px-4 py-3">Nama Rencana</th>
                      <th className="px-4 py-3">Cabang</th>
                      <th className="px-4 py-3">Supplier & Kategori</th>
                      <th className="px-4 py-3 text-center">Baris Item</th>
                      <th className="px-4 py-3 text-right">Total Nilai Rencana</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5DACE]/60 font-semibold">
                    {filteredPlans.map((plan) => (
                      <tr key={plan.id} className="hover:bg-[#FAF8F5] transition">
                        <td className="px-4 py-3 font-mono font-black text-amber-900">
                          {plan.id}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-[#2D241E]">{plan.namaRencana}</div>
                          <div className="text-[11px] text-[#8C7B6C]">{formatDateTime(plan.createdAt)}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-[#2D241E]">{plan.branchName}</span>
                          <span className="block text-[10px] text-[#8C7B6C]">{plan.branchCode}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-[#2D241E]">{plan.supplierName}</span>
                          <span className="inline-block ml-1.5 rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-black text-gray-700 border border-gray-200">
                            {plan.supplierCategory || 'Umum'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-black text-gray-800">
                            {plan.lines.length} produk
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-black text-amber-900">
                          {formatIDR(plan.totalPlannedValue)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {renderStatusBadge(plan.status)}
                          {plan.linkedReceiptNumber && (
                            <span className="block mt-1 text-[10px] font-bold text-emerald-700">
                              Ref: {plan.linkedReceiptNumber}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              id={`btn-detail-plan-${plan.id}`}
                              type="button"
                              onClick={() => handleViewDetail(plan.id)}
                              className="rounded-lg bg-gray-100 p-1.5 text-gray-700 hover:bg-amber-100 hover:text-amber-900 transition"
                              title="Lihat Detail Rencana"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            {plan.status === 'Direncanakan' && isSuperadmin && (
                              <>
                                <button
                                  id={`btn-edit-plan-${plan.id}`}
                                  type="button"
                                  onClick={() => handleStartEdit(plan)}
                                  className="rounded-lg bg-blue-50 p-1.5 text-blue-700 hover:bg-blue-100 transition"
                                  title="Edit Rencana"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </button>
                                <button
                                  id={`btn-cancel-plan-${plan.id}`}
                                  type="button"
                                  onClick={() => handleOpenCancelModal(plan.id)}
                                  className="rounded-lg bg-rose-50 p-1.5 text-rose-700 hover:bg-rose-100 transition"
                                  title="Batalkan Rencana"
                                >
                                  <Ban className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. DETAIL VIEW */}
      {/* ========================================================================= */}
      {viewMode === 'detail' && activePlan && (
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header Bar */}
          <div className="border-b-2 border-[#E5DACE] bg-[#FDFBF7] px-6 py-4 shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E5DACE] bg-white text-gray-700 hover:bg-gray-100 transition"
                  title="Kembali ke Daftar Rencana"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded-lg">
                      {activePlan.id}
                    </span>
                    {renderStatusBadge(activePlan.status)}
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-800 border border-blue-200 uppercase">
                      Owned Purchases
                    </span>
                  </div>
                  <h2 className="text-base font-black text-[#2D241E] mt-1">{activePlan.namaRencana}</h2>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {activePlan.status === 'Direncanakan' && isSuperadmin && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleStartEdit(activePlan)}
                      className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-700 active:scale-95 transition shadow-xs"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Edit Rencana</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenCancelModal(activePlan.id)}
                      className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-rose-700 active:scale-95 transition shadow-xs"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      <span>Batalkan Rencana</span>
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="rounded-xl border border-[#E5DACE] bg-white px-4 py-2 text-xs font-bold text-[#8C7B6C] hover:bg-[#E5DACE] transition"
                >
                  Tutup / Kembali
                </button>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
            {/* Notice */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-900 flex items-start gap-3">
              <Info className="h-5 w-5 shrink-0 text-amber-700 mt-0.5" />
              <div>
                <p className="font-bold">Informasi Stok & Alur Penerimaan:</p>
                <p className="mt-0.5 text-amber-800 leading-relaxed">
                  Rencana pembelian ini merupakan dokumen acuan pengadaan. Kuantitas stok produk di cabang <strong>{activePlan.branchName}</strong> tidak bertambah sampai bukti penerimaan resmi dicatat pada menu <em>Penerimaan Barang Baru &gt; Dibeli Sendiri &gt; Dari Rencana Pembelian</em>.
                </p>
              </div>
            </div>

            {/* Plan Header Card */}
            <div className="rounded-3xl border-2 border-[#E5DACE] bg-white p-6 shadow-xs">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#8C7B6C] mb-4">
                Header Rencana Pembelian
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-[#E5DACE] bg-[#FAF8F5] p-3.5">
                  <span className="text-[10px] font-bold uppercase text-[#8C7B6C] block">Cabang Alokasi</span>
                  <span className="text-xs font-black text-[#2D241E] mt-0.5 block">{activePlan.branchName}</span>
                  <span className="text-[11px] text-[#8C7B6C] block">Kode: {activePlan.branchCode}</span>
                </div>

                <div className="rounded-2xl border border-[#E5DACE] bg-[#FAF8F5] p-3.5">
                  <span className="text-[10px] font-bold uppercase text-[#8C7B6C] block">Mitra Supplier</span>
                  <span className="text-xs font-black text-[#2D241E] mt-0.5 block">{activePlan.supplierName}</span>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded inline-block mt-0.5">
                    Kategori: {activePlan.supplierCategory || 'Umum'} (Read-only)
                  </span>
                </div>

                <div className="rounded-2xl border border-[#E5DACE] bg-[#FAF8F5] p-3.5">
                  <span className="text-[10px] font-bold uppercase text-[#8C7B6C] block">Waktu Dibuat & Pembuat</span>
                  <span className="text-xs font-bold text-[#2D241E] mt-0.5 block">{formatDateTime(activePlan.createdAt)}</span>
                  <span className="text-[11px] text-[#8C7B6C] block">Oleh: {activePlan.createdByName}</span>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5">
                  <span className="text-[10px] font-bold uppercase text-amber-800 block">Total Nilai Rencana</span>
                  <span className="text-base font-black text-amber-900 mt-0.5 block">
                    {formatIDR(activePlan.totalPlannedValue)}
                  </span>
                  <span className="text-[11px] text-amber-700 block">{activePlan.lines.length} baris produk</span>
                </div>
              </div>

              {activePlan.linkedReceiptNumber && (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                    <span className="text-xs font-bold text-emerald-900">
                      Telah Terealisasi melalui Bukti Penerimaan Barang: <strong>{activePlan.linkedReceiptNumber}</strong>
                    </span>
                  </div>
                </div>
              )}

              {/* Attached Customer POs Card */}
              {activePlan.attachedPoNumbers && activePlan.attachedPoNumbers.length > 0 && (
                <div className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50/70 p-3.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Paperclip className="h-4 w-4 text-indigo-700" />
                    <span className="text-xs font-black text-indigo-950 uppercase tracking-wider">
                      Terhubung Dengan {activePlan.attachedPoNumbers.length} PO Pelanggan / Pesanan Penjualan
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {activePlan.attachedPoNumbers.map((poNum) => (
                      <span
                        key={poNum}
                        className="inline-flex items-center gap-1 rounded-lg border border-indigo-300 bg-white px-2.5 py-1 text-xs font-extrabold text-indigo-900 shadow-2xs"
                      >
                        <CheckSquare className="h-3.5 w-3.5 text-indigo-600" />
                        {poNum}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {activePlan.notes && (
                <div className="mt-4 rounded-xl bg-gray-50 p-3 text-xs text-gray-700 border border-gray-200">
                  <span className="font-bold text-gray-900 block mb-0.5">Catatan Rencana:</span>
                  <p className="italic">{activePlan.notes}</p>
                </div>
              )}
            </div>

            {/* Product Lines Table */}
            <div className="rounded-3xl border-2 border-[#E5DACE] bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#8C7B6C]">
                    Daftar Baris Produk Yang Direncanakan (Product Lines)
                  </h3>
                  <p className="text-[11px] text-[#8C7B6C]">
                    Termasuk barang Pembelian Langsung, Produksi In-House, Titipan Konsinyasi, dan Item Ad-Hoc.
                  </p>
                </div>
                <span className="text-xs font-black text-amber-900 bg-amber-50 border border-amber-200 px-3 py-1 rounded-xl">
                  Total: {formatIDR(activePlan.totalPlannedValue)}
                </span>
              </div>

              <div className="overflow-hidden rounded-2xl border border-[#E5DACE]">
                <table className="w-full text-left text-xs text-[#2D241E]">
                  <thead className="border-b border-[#E5DACE] bg-[#FDFBF7] text-[10px] font-black uppercase tracking-wider text-[#8C7B6C]">
                    <tr>
                      <th className="px-4 py-3 text-center">No</th>
                      <th className="px-4 py-3">Tipe & Sumber</th>
                      <th className="px-4 py-3">Produk</th>
                      <th className="px-4 py-3">Kategori & Supplier</th>
                      <th className="px-4 py-3 text-right">Rencana Qty</th>
                      <th className="px-4 py-3 text-right">Harga Beli</th>
                      <th className="px-4 py-3 text-right">Subtotal Rencana</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5DACE]/60 font-semibold">
                    {activePlan.lines.map((line, idx) => {
                      const itemTypeLabel =
                        line.itemType === 'in_house'
                          ? 'Produksi In-House'
                          : line.itemType === 'consignment'
                          ? 'Titipan Konsinyasi'
                          : line.itemType === 'adhoc'
                          ? 'Ad-Hoc / Tambahan'
                          : 'Pembelian Langsung';

                      const itemTypeStyle =
                        line.itemType === 'in_house'
                          ? 'bg-blue-100 text-blue-900 border-blue-200'
                          : line.itemType === 'consignment'
                          ? 'bg-purple-100 text-purple-900 border-purple-200'
                          : line.itemType === 'adhoc'
                          ? 'bg-amber-100 text-amber-900 border-amber-200'
                          : 'bg-emerald-100 text-emerald-900 border-emerald-200';

                      return (
                        <tr key={line.id} className="hover:bg-[#FAF8F5]">
                          <td className="px-4 py-3 text-center font-bold text-gray-500">{idx + 1}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${itemTypeStyle}`}
                            >
                              {itemTypeLabel}
                            </span>
                            {line.sourcePoRef && (
                              <div className="text-[10px] font-bold text-indigo-700 mt-1 flex items-center gap-1">
                                <Paperclip className="h-3 w-3" />
                                <span>{line.sourcePoRef}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-[#2D241E]">{line.productName}</div>
                            <div className="text-[10px] font-mono text-[#8C7B6C]">{line.productSku}</div>
                            {line.notes && <div className="text-[10px] italic text-gray-600 mt-0.5">{line.notes}</div>}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-block rounded-lg bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-700 border border-gray-200">
                              {line.category || 'Umum'}
                            </span>
                            {line.supplierName && (
                              <div className="text-[10px] font-semibold text-gray-600 mt-0.5">
                                Supplier: {line.supplierName}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-black text-blue-900">
                            {line.plannedQuantity} pcs
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-gray-800">
                            {formatIDR(line.plannedBuyPrice)}
                          </td>
                          <td className="px-4 py-3 text-right font-black text-amber-900">
                            {formatIDR(line.lineTotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t-2 border-[#E5DACE] bg-[#FDFBF7] font-black">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-right text-xs uppercase tracking-wider text-[#8C7B6C]">
                        Total Nilai Rencana Pembelian:
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-blue-900">
                        {activePlan.lines.reduce((sum, l) => sum + l.plannedQuantity, 0)} pcs
                      </td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3 text-right text-sm text-amber-900">
                        {formatIDR(activePlan.totalPlannedValue)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. CREATE & EDIT FORM */}
      {/* ========================================================================= */}
      {(viewMode === 'create' || viewMode === 'edit') && (
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="border-b-2 border-[#E5DACE] bg-[#FDFBF7] px-6 py-4 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setViewMode(viewMode === 'edit' ? 'detail' : 'list')}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E5DACE] bg-white text-gray-700 hover:bg-gray-100 transition"
                  title="Kembali"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div>
                  <h2 className="text-base font-black text-[#2D241E]">
                    {viewMode === 'create' ? 'Buat Rencana Pembelian Baru' : `Edit Rencana: ${selectedPlanId}`}
                  </h2>
                  <p className="text-xs text-[#8C7B6C]">
                    {viewMode === 'create'
                      ? 'ID akan otomatis dibuat sesuai format: RP-{BRANCHCODE}-{YYYYMM}-{NNNN}'
                      : 'Cabang tidak dapat diubah setelah rencana dibuat.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewMode(viewMode === 'edit' ? 'detail' : 'list')}
                className="rounded-xl border border-[#E5DACE] bg-white px-4 py-2 text-xs font-bold text-[#8C7B6C] hover:bg-[#E5DACE] transition"
              >
                Tutup / Batal
              </button>
            </div>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSavePlan} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
            {formError && (
              <div className="rounded-xl border-2 border-rose-300 bg-rose-50 p-4 text-xs font-bold text-rose-800">
                {formError}
              </div>
            )}
            {formSuccess && (
              <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4 text-xs font-bold text-emerald-800">
                {formSuccess}
              </div>
            )}

            {/* General Information Card */}
            <div className="rounded-3xl border-2 border-[#E5DACE] bg-white p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#8C7B6C]">
                Informasi Utama Rencana
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Plan Name */}
                <div className="sm:col-span-3 space-y-1.5">
                  <label className="text-xs font-bold text-[#2D241E]">
                    Nama / Keterangan Rencana Pembelian <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="input-plan-name"
                    type="text"
                    value={formNamaRencana}
                    onChange={(e) => setFormNamaRencana(e.target.value)}
                    placeholder="Contoh: Pengadaan Tepung & Butter Awal Pekan"
                    className="w-full rounded-xl border-2 border-[#E5DACE] bg-[#FDFBF7] px-3.5 py-2 text-xs font-bold text-[#2D241E] focus:border-amber-600 focus:outline-none"
                    required
                  />
                </div>

                {/* Branch Selection (IMMUTABLE on edit) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#2D241E]">
                    Cabang Alokasi <span className="text-rose-500">*</span>
                    {viewMode === 'edit' && (
                      <span className="ml-1 text-[10px] text-amber-700 font-normal">(Terkunci - Tidak dapat diubah)</span>
                    )}
                  </label>
                  <select
                    id="input-plan-branch"
                    value={formBranchId}
                    disabled={viewMode === 'edit'}
                    onChange={(e) => setFormBranchId(e.target.value)}
                    className={`w-full rounded-xl border-2 border-[#E5DACE] px-3 py-2 text-xs font-bold text-[#2D241E] focus:border-amber-600 focus:outline-none ${
                      viewMode === 'edit' ? 'bg-gray-100 cursor-not-allowed opacity-80' : 'bg-[#FDFBF7]'
                    }`}
                  >
                    {branches
                      .filter((b) => b.status !== 'inactive' || b.id === formBranchId)
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                  </select>
                </div>

                {/* Supplier Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#2D241E]">
                    Mitra Supplier / Sumber Utama <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="input-plan-supplier"
                    value={formSupplierId}
                    onChange={(e) => setFormSupplierId(e.target.value)}
                    className="w-full rounded-xl border-2 border-[#E5DACE] bg-[#FDFBF7] px-3 py-2 text-xs font-bold text-[#2D241E] focus:border-amber-600 focus:outline-none"
                  >
                    <option value="multi">
                      ⭐ Multi-Sumber / Terpadu (In-House, Konsinyasi & Supplier)
                    </option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Read-Only Supplier Category */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#2D241E]">
                    Kategori Sumber <span className="text-[10px] text-gray-500 font-normal">(Read-only)</span>
                  </label>
                  <div className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-3.5 py-2 text-xs font-black text-gray-700 truncate">
                    {formSelectedSupplier?.category || 'Umum'}
                  </div>
                </div>
              </div>

              {/* Customer PO Attachment Card */}
              <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50/60 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-indigo-700" />
                    <div>
                      <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider">
                        Tautkan Dengan Pesanan Pelanggan (PO)
                      </h4>
                      <p className="text-[11px] text-indigo-800">
                        Otomatis tarik seluruh item produk dari multiple PO pelanggan ke dalam rencana pembelian ini.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenAttachPoModal}
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-black text-white hover:bg-indigo-700 active:scale-95 transition shadow-2xs"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{formAttachedPoNumbers.length > 0 ? 'Kelola Tautan PO' : 'Pilih Multi-PO Pelanggan'}</span>
                  </button>
                </div>

                {formAttachedPoNumbers.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {formAttachedPoNumbers.map((poNum) => (
                      <span
                        key={poNum}
                        className="inline-flex items-center gap-1 rounded-lg border border-indigo-300 bg-white px-2.5 py-1 text-xs font-black text-indigo-900 shadow-2xs"
                      >
                        <CheckSquare className="h-3.5 w-3.5 text-indigo-600" />
                        {poNum}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] italic text-indigo-700/80">
                    Belum ada PO pelanggan yang ditautkan. Anda dapat menambah item secara manual di bawah.
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#2D241E]">Catatan Tambahan Rencana (Opsional)</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Catatan jadwal pengiriman, syarat kemasan, instruksi khusus, dll."
                  className="w-full rounded-xl border-2 border-[#E5DACE] bg-[#FDFBF7] px-3.5 py-2 text-xs font-semibold text-[#2D241E] focus:border-amber-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Product Lines Card */}
            <div className="rounded-3xl border-2 border-[#E5DACE] bg-white p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#8C7B6C]">
                    Baris Produk Rencana (Product Lines)
                  </h3>
                  <p className="text-[11px] text-[#8C7B6C]">
                    Atur item dari Pembelian Langsung, Produksi In-House, Titipan Konsinyasi, atau Tambahan Ad-Hoc.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAddFormLine('direct_purchase')}
                    className="flex items-center gap-1 rounded-xl bg-emerald-50 border border-emerald-300 px-2.5 py-1.5 text-xs font-bold text-emerald-900 hover:bg-emerald-100 transition"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ Pembelian Direct</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddFormLine('in_house')}
                    className="flex items-center gap-1 rounded-xl bg-blue-50 border border-blue-300 px-2.5 py-1.5 text-xs font-bold text-blue-900 hover:bg-blue-100 transition"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ In-House</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddFormLine('consignment')}
                    className="flex items-center gap-1 rounded-xl bg-purple-50 border border-purple-300 px-2.5 py-1.5 text-xs font-bold text-purple-900 hover:bg-purple-100 transition"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ Konsinyasi</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAddAdhocLine}
                    className="flex items-center gap-1 rounded-xl bg-amber-50 border border-amber-300 px-2.5 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 transition"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>+ Ad-Hoc</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {formLines.map((line, idx) => {
                  const selectedProd = products.find((p) => p.id === line.productId);
                  const lineTotal = Math.max(0, line.plannedQuantity) * Math.max(0, line.plannedBuyPrice);

                  return (
                    <div
                      key={line.tempId}
                      className="rounded-2xl border-2 border-[#E5DACE] bg-[#FAF8F5] p-3.5 space-y-2.5"
                    >
                      <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#E5DACE] text-xs font-black text-[#2D241E]">
                          {idx + 1}
                        </span>

                        {/* Item Type Select */}
                        <div className="w-36">
                          <label className="text-[10px] font-bold text-[#8C7B6C] block mb-1">Tipe Item</label>
                          <select
                            value={line.itemType}
                            onChange={(e) =>
                              handleUpdateFormLine(
                                line.tempId,
                                'itemType',
                                e.target.value as PurchasePlanItemType
                              )
                            }
                            className="w-full rounded-xl border border-[#E5DACE] bg-white px-2.5 py-1.5 text-xs font-bold text-[#2D241E] focus:outline-none"
                          >
                            <option value="direct_purchase">Pembelian Direct</option>
                            <option value="in_house">Produksi In-House</option>
                            <option value="consignment">Titipan Konsinyasi</option>
                            <option value="adhoc">Ad-Hoc / Tambahan</option>
                          </select>
                        </div>

                        {/* Product Select */}
                        <div className="flex-1 min-w-[180px]">
                          <label className="text-[10px] font-bold text-[#8C7B6C] block mb-1">
                            Pilih Produk <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={line.productId}
                            onChange={(e) => {
                              const newProdId = e.target.value;
                              const newProd = products.find((p) => p.id === newProdId);
                              handleUpdateFormLine(line.tempId, 'productId', newProdId);
                              if (newProd) {
                                handleUpdateFormLine(
                                  line.tempId,
                                  'plannedBuyPrice',
                                  Math.round(newProd.price * 0.6)
                                );
                                if (newProd.supplierId) {
                                  handleUpdateFormLine(line.tempId, 'supplierId', newProd.supplierId);
                                }
                              }
                            }}
                            className="w-full rounded-xl border border-[#E5DACE] bg-white px-3 py-1.5 text-xs font-bold text-[#2D241E] focus:outline-none"
                          >
                            {allProducts.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.sku}) [{p.category || 'Umum'}]
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Supplier (if multi-sumber) */}
                        {formSupplierId === 'multi' && (
                          <div className="w-44">
                            <label className="text-[10px] font-bold text-[#8C7B6C] block mb-1">Supplier/Sumber</label>
                            <select
                              value={line.supplierId || ''}
                              onChange={(e) => handleUpdateFormLine(line.tempId, 'supplierId', e.target.value)}
                              className="w-full rounded-xl border border-[#E5DACE] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#2D241E] focus:outline-none"
                            >
                              <option value="">(Bawaan Master/In-House)</option>
                              {suppliers.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Planned Quantity */}
                        <div className="w-24">
                          <label className="text-[10px] font-bold text-[#8C7B6C] block mb-1">
                            Qty (pcs) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={line.plannedQuantity}
                            onChange={(e) =>
                              handleUpdateFormLine(
                                line.tempId,
                                'plannedQuantity',
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-full rounded-xl border border-[#E5DACE] bg-white px-2.5 py-1.5 text-xs font-black text-blue-900 focus:outline-none"
                          />
                        </div>

                        {/* Planned Buy Price */}
                        <div className="w-32">
                          <label className="text-[10px] font-bold text-[#8C7B6C] block mb-1">
                            Harga Beli (Rp)
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={line.plannedBuyPrice}
                            onChange={(e) =>
                              handleUpdateFormLine(
                                line.tempId,
                                'plannedBuyPrice',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-full rounded-xl border border-[#E5DACE] bg-white px-2.5 py-1.5 text-xs font-bold text-[#2D241E] focus:outline-none"
                          />
                        </div>

                        {/* Line Subtotal */}
                        <div className="w-32 text-right">
                          <span className="text-[10px] font-bold text-[#8C7B6C] block">Subtotal</span>
                          <span className="text-xs font-black text-amber-900 block mt-1 truncate">
                            {formatIDR(lineTotal)}
                          </span>
                        </div>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => handleRemoveFormLine(line.tempId)}
                          className="rounded-xl p-2 text-rose-600 hover:bg-rose-100 transition shrink-0"
                          title="Hapus baris"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Source PO & Notes Sub-Row */}
                      <div className="flex flex-wrap items-center gap-2 pl-10 text-[11px]">
                        {line.sourcePoRef && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-indigo-100 text-indigo-900 px-2 py-0.5 font-bold">
                            <Paperclip className="h-3 w-3" />
                            {line.sourcePoRef}
                          </span>
                        )}
                        <input
                          type="text"
                          value={line.notes || ''}
                          onChange={(e) => handleUpdateFormLine(line.tempId, 'notes', e.target.value)}
                          placeholder="Catatan khusus baris ini (misal: stok cadangan ad-hoc)..."
                          className="flex-1 rounded-lg border border-[#E5DACE] bg-white px-2.5 py-1 text-xs text-[#2D241E] focus:outline-none"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary Footer */}
              <div className="flex items-center justify-between pt-4 border-t-2 border-[#E5DACE]">
                <span className="text-xs font-bold text-[#8C7B6C]">
                  Total Item: {formLines.length} baris produk
                </span>
                <div className="text-right">
                  <span className="text-xs text-[#8C7B6C] mr-2">Total Estimasi Nilai Rencana:</span>
                  <span className="text-base font-black text-amber-900">{formatIDR(calculatedFormTotal)}</span>
                </div>
              </div>
            </div>

            {/* Bottom Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t-2 border-[#E5DACE]">
              <button
                type="button"
                onClick={() => setViewMode(viewMode === 'edit' ? 'detail' : 'list')}
                className="rounded-xl border border-[#E5DACE] bg-white px-5 py-2.5 text-xs font-bold text-[#8C7B6C] hover:bg-[#E5DACE] transition"
              >
                Tutup / Batal
              </button>
              <button
                id="btn-simpan-rencana-pembelian"
                type="submit"
                className="flex items-center gap-2 rounded-xl bg-amber-600 px-6 py-2.5 text-xs font-black text-white hover:bg-amber-700 active:scale-95 transition shadow-xs"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  {viewMode === 'create' ? 'Simpan Rencana Pembelian' : 'Simpan Perubahan'}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. CANCEL CONFIRMATION MODAL (NO NESTED POPUPS, BOTTOM-RIGHT TUTUP BUTTON) */}
      {/* ========================================================================= */}
      {isCancelModalOpen && cancelTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border-2 border-[#E5DACE] space-y-4">
            <div className="flex items-center gap-3 text-rose-700">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100">
                <Ban className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#2D241E]">Batalkan Rencana Pembelian?</h3>
                <p className="text-xs text-[#8C7B6C]">ID: {cancelTargetId}</p>
              </div>
            </div>

            <p className="text-xs text-[#2D241E] leading-relaxed">
              Rencana pembelian yang dibatalkan tidak akan dapat ditautkan ke proses penerimaan barang. Tindakan ini hanya dapat dilakukan oleh Superadmin.
            </p>

            {cancelError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs font-bold text-rose-800">
                {cancelError}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#2D241E]">Alasan Pembatalan (Opsional):</label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Contoh: Supplier kehabisan stok bahan baku / perubahan rencana anggaran"
                className="w-full rounded-xl border-2 border-[#E5DACE] bg-[#FDFBF7] p-2.5 text-xs text-[#2D241E] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5DACE]">
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition"
              >
                Konfirmasi Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCancelModalOpen(false);
                  setCancelTargetId(null);
                }}
                className="rounded-xl bg-[#2D241E] px-5 py-2 text-xs font-bold text-white hover:bg-black transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MULTI-PO ATTACHMENT MODAL */}
      {/* ========================================================================= */}
      {isAttachPoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl border-2 border-[#E5DACE] space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#E5DACE] pb-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
                  <Paperclip className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#2D241E]">
                    Tautkan Pesanan Pelanggan (PO) ke Rencana Pembelian
                  </h3>
                  <p className="text-xs text-[#8C7B6C]">
                    Pilih satu atau beberapa PO pelanggan sekaligus. Item akan otomatis digabungkan ke rencana.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAttachPoModalOpen(false)}
                className="rounded-xl p-2 text-gray-500 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            {/* Search filter for POs */}
            <div className="relative shrink-0">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C7B6C]" />
              <input
                type="text"
                value={poSearchQuery}
                onChange={(e) => setPoSearchQuery(e.target.value)}
                placeholder="Cari No. PO (#1001), Nama Pelanggan, atau Produk..."
                className="w-full rounded-xl border border-[#E5DACE] bg-[#FAF8F5] pl-9 pr-3 py-2 text-xs font-semibold text-[#2D241E] focus:outline-none"
              />
            </div>

            {/* PO List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {availableOrdersForPlanning.filter((order) => {
                if (!poSearchQuery.trim()) return true;
                const q = poSearchQuery.toLowerCase();
                const matchNum = order.orderNumber.toLowerCase().includes(q);
                const matchCust = order.customerName?.toLowerCase().includes(q);
                const matchItem = order.items.some((i) => i.productName.toLowerCase().includes(q));
                return matchNum || matchCust || matchItem;
              }).length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-500 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                  Tidak ada Pesanan Pelanggan (PO) aktif yang sesuai dengan pencarian.
                </div>
              ) : (
                availableOrdersForPlanning
                  .filter((order) => {
                    if (!poSearchQuery.trim()) return true;
                    const q = poSearchQuery.toLowerCase();
                    const matchNum = order.orderNumber.toLowerCase().includes(q);
                    const matchCust = order.customerName?.toLowerCase().includes(q);
                    const matchItem = order.items.some((i) => i.productName.toLowerCase().includes(q));
                    return matchNum || matchCust || matchItem;
                  })
                  .map((order) => {
                    const isSelected = tempSelectedPoIds.includes(order.id);
                    return (
                      <div
                        key={order.id}
                        onClick={() => {
                          if (isSelected) {
                            setTempSelectedPoIds(tempSelectedPoIds.filter((id) => id !== order.id));
                          } else {
                            setTempSelectedPoIds([...tempSelectedPoIds, order.id]);
                          }
                        }}
                        className={`cursor-pointer rounded-2xl border-2 p-3.5 transition flex items-start gap-3 ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/70 shadow-xs'
                            : 'border-[#E5DACE] bg-[#FAF8F5] hover:bg-white'
                        }`}
                      >
                        <div className="pt-0.5">
                          {isSelected ? (
                            <CheckSquare className="h-5 w-5 text-indigo-700" />
                          ) : (
                            <Square className="h-5 w-5 text-gray-400" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-[#2D241E]">
                              PO #{order.orderNumber}
                            </span>
                            <span className="text-xs font-black text-amber-900">
                              {formatIDR(order.totalAmount)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-gray-600">
                            <span className="font-semibold">{order.customerName || 'Pelanggan Umum'}</span>
                            <span>•</span>
                            <span>{formatDateTime(order.createdAt)}</span>
                            <span>•</span>
                            <span className="font-bold text-indigo-900">{order.items.length} item</span>
                          </div>

                          {/* Preview item list */}
                          <div className="flex flex-wrap gap-1 pt-1">
                            {order.items.slice(0, 4).map((it, i) => (
                              <span
                                key={i}
                                className="inline-block rounded bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-700 border border-gray-200"
                              >
                                {it.productName} ({it.quantity}x)
                              </span>
                            ))}
                            {order.items.length > 4 && (
                              <span className="inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-600">
                                +{order.items.length - 4} item lagi
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-[#E5DACE] shrink-0">
              <span className="text-xs font-bold text-indigo-900">
                Terpilih: <strong>{tempSelectedPoIds.length} PO Pelanggan</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAttachPoModalOpen(false)}
                  className="rounded-xl border border-[#E5DACE] bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAttachOrders}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-black text-white hover:bg-indigo-700 transition shadow-xs"
                >
                  Terapkan & Tarik Item
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
