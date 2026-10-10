import React, { useMemo, useState } from 'react';
import { Ban, Calendar, CheckCircle2, ChevronDown, ChevronRight, Clock, Eye, FileText, Package, Plus, Search, ShieldAlert, Trash2, Truck, XCircle } from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { Product, PurchasePlan, PurchasePlanStatus } from '../types';
import { formatIDR } from '../utils/formatters';

interface ProductLineInput {
  tempId: string;
  productId: string;
  pickupDate: string;
  plannedQuantity: number;
  plannedBuyPrice: number;
  sourceBranchNames: string[];
  sourceOrderIds: string[];
}

interface DemandEntry {
  productId: string;
  sku: string;
  productName: string;
  pickupDate: string;
  quantity: number;
  supplierName: string;
  sourceBranchNames: string[];
  sourceBranchIds: string[];
  sourceOrderIds: string[];
}

const today = () => new Date().toISOString().slice(0, 10);
const dateLabel = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
const uniqueStrings = (values: (string | undefined)[]) => Array.from(new Set(values.filter((value): value is string => Boolean(value))));

export const PurchasePlanWorkspace: React.FC = () => {
  const { currentUser, branches, products, suppliers, masterCategories, orders, purchasePlans, addPurchasePlan, updatePurchasePlan, cancelPurchasePlan } = usePOS();
  const isSuperadmin = currentUser.role === 'admin';
  const mainBranch = useMemo(() => branches.find((branch) => branch.isMainBranch) || branches.find((branch) => branch.id === 'branch-senopati') || branches.find((branch) => branch.status === 'active') || branches[0], [branches]);
  const resellerSupplierIds = useMemo(() => new Set(suppliers.filter((supplier) => masterCategories.find((category) => category.id === supplier.masterCategoryId)?.categoryType === 'BELI (RESELLER)').map((supplier) => supplier.id)), [masterCategories, suppliers]);
  const resellerProducts = useMemo(() => products.filter((product) => product.supplierId && resellerSupplierIds.has(product.supplierId)), [products, resellerSupplierIds]);
  const catalogBySku = useMemo(() => {
    const result = new Map<string, Product>();
    [...resellerProducts].sort((a, b) => Number(b.branchId === mainBranch?.id) - Number(a.branchId === mainBranch?.id)).forEach((product) => {
      if (!result.has(product.sku)) result.set(product.sku, product);
    });
    return result;
  }, [mainBranch?.id, resellerProducts]);
  const catalogProducts = useMemo(() => Array.from(catalogBySku.values()), [catalogBySku]);

  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit' | 'detail'>('list');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | PurchasePlanStatus>('all');
  const [formName, setFormName] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formLines, setFormLines] = useState<ProductLineInput[]>([]);
  const [newDate, setNewDate] = useState(today());
  const [manualDateGroups, setManualDateGroups] = useState<string[]>([]);
  const [manualProductByDate, setManualProductByDate] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [cancelPlanId, setCancelPlanId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const demandEntries = useMemo<DemandEntry[]>(() => {
    const demand = new Map<string, DemandEntry>();
    const activeBranches = new Map(branches.filter((branch) => branch.status !== 'inactive').map((branch) => [branch.id, branch]));
    const excluded = new Set(['cancelled', 'voided', 'picked_up', 'ready_for_pickup']);
    orders
      .filter((order) => order.isMadeToOrder && !excluded.has(order.orderStatus) && Boolean(order.pickupDate) && (order.pickupDate || '') >= today() && activeBranches.has(order.branchId || ''))
      .sort((a, b) => (a.pickupDate || '').localeCompare(b.pickupDate || ''))
      .forEach((order) => {
        const branch = activeBranches.get(order.branchId || '');
        order.items.forEach((item) => {
          const sourceProduct = products.find((product) => product.id === item.productId);
          if (!sourceProduct?.supplierId || !resellerSupplierIds.has(sourceProduct.supplierId) || !order.pickupDate) return;
          const product = catalogBySku.get(sourceProduct.sku) || sourceProduct;
          const supplier = suppliers.find((candidate) => candidate.id === product.supplierId);
          if (!supplier) return;
          const key = `${order.pickupDate}::${product.sku}`;
          const current = demand.get(key) || {
            productId: product.id,
            sku: product.sku,
            productName: product.name,
            pickupDate: order.pickupDate,
            quantity: 0,
            supplierName: supplier.name,
            sourceBranchNames: [],
            sourceBranchIds: [],
            sourceOrderIds: [],
          };
          current.quantity += item.quantity;
          if (branch && !current.sourceBranchNames.includes(branch.name)) current.sourceBranchNames.push(branch.name);
          if (branch && !current.sourceBranchIds.includes(branch.id)) current.sourceBranchIds.push(branch.id);
          if (!current.sourceOrderIds.includes(order.id)) current.sourceOrderIds.push(order.id);
          demand.set(key, current);
        });
      });
    return [...demand.values()].sort((a, b) => a.pickupDate.localeCompare(b.pickupDate) || a.productName.localeCompare(b.productName) || a.supplierName.localeCompare(b.supplierName) || a.sourceBranchNames.join(',').localeCompare(b.sourceBranchNames.join(',')));
  }, [branches, catalogBySku, orders, products, resellerSupplierIds, suppliers]);
  const demandByKey = useMemo(() => new Map(demandEntries.map((entry) => [`${entry.pickupDate}::${entry.sku}`, entry])), [demandEntries]);
  const demandDates = useMemo(() => Array.from(new Set(demandEntries.map((entry) => entry.pickupDate))), [demandEntries]);
  const formDates = useMemo(() => Array.from(new Set([...demandDates, ...manualDateGroups, ...formLines.map((line) => line.pickupDate)].filter(Boolean))).sort(), [demandDates, formLines, manualDateGroups]);
  const formTotal = useMemo(() => formLines.reduce((sum, line) => sum + line.plannedQuantity * line.plannedBuyPrice, 0), [formLines]);
  const activePlan = selectedPlanId ? purchasePlans.find((plan) => plan.id === selectedPlanId) : undefined;

  const isCompatible = (plan: PurchasePlan) => plan.lines.some((line) => {
    const product = products.find((candidate) => candidate.id === line.productId);
    return Boolean((product?.supplierId && resellerSupplierIds.has(product.supplierId)) || (line.supplierId && resellerSupplierIds.has(line.supplierId)));
  });
  const visiblePlans = useMemo(() => purchasePlans.filter((plan) => {
    if (!isCompatible(plan) || (filterStatus !== 'all' && plan.status !== filterStatus)) return false;
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return plan.id.toLowerCase().includes(query) || plan.namaRencana.toLowerCase().includes(query) || plan.lines.some((line) => line.productName.toLowerCase().includes(query) || line.productSku.toLowerCase().includes(query) || (line.supplierName || '').toLowerCase().includes(query));
  }), [filterStatus, products, purchasePlans, resellerSupplierIds, searchQuery]);
  const stats = useMemo(() => ({ total: visiblePlans.length, planned: visiblePlans.filter((plan) => plan.status === 'Direncanakan').length, realized: visiblePlans.filter((plan) => plan.status === 'Terealisasi').length, cancelled: visiblePlans.filter((plan) => plan.status === 'Dibatalkan').length }), [visiblePlans]);

  const resetForm = () => { setFormName(''); setFormNotes(''); setFormLines([]); setNewDate(today()); setManualDateGroups([]); setManualProductByDate({}); setExpandedDates({}); setFormError(''); setFormSuccess(''); };
  const startCreate = () => { if (isSuperadmin) { resetForm(); setViewMode('create'); } };
  const startEdit = (plan: PurchasePlan) => {
    if (plan.status !== 'Direncanakan' || plan.receivingLocked) { alert('Rencana ini sedang terkunci atau sudah tidak dapat diedit.'); return; }
    setSelectedPlanId(plan.id);
    setFormName(plan.namaRencana);
    setFormNotes(plan.notes || '');
    setFormLines(plan.lines.map((line, index) => ({ tempId: `${line.id}-${index}`, productId: line.productId, pickupDate: line.pickupDate || today(), plannedQuantity: line.plannedQuantity, plannedBuyPrice: line.plannedBuyPrice, sourceBranchNames: line.sourceBranchNames || [], sourceOrderIds: line.sourceOrderIds || [] })));
    setNewDate(today());
    setManualDateGroups([]);
    setManualProductByDate({});
    setExpandedDates({});
    setFormError(''); setFormSuccess(''); setViewMode('edit');
  };
  const addLine = (productId: string, pickupDate: string, recommended?: DemandEntry) => {
    const selectedProduct = products.find((candidate) => candidate.id === productId) || catalogBySku.get(productId);
    if (!selectedProduct || !pickupDate) return;
    const product = catalogBySku.get(selectedProduct.sku) || selectedProduct;
    const existing = formLines.find((line) => line.productId === product.id && line.pickupDate === pickupDate);
    if (existing) {
      setFormLines((previous) => previous.map((line) => line.tempId === existing.tempId ? { ...line, plannedQuantity: line.plannedQuantity + (recommended?.quantity || 1) } : line));
      return;
    }
    setFormLines((previous) => [...previous, { tempId: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, productId: product.id, pickupDate, plannedQuantity: recommended?.quantity || 1, plannedBuyPrice: product.buyPrice ?? 0, sourceBranchNames: recommended?.sourceBranchNames || [], sourceOrderIds: recommended?.sourceOrderIds || [] }]);
    setExpandedDates((previous) => ({ ...previous, [pickupDate]: true }));
  };
  const openDateGroup = () => {
    if (!newDate) {
      setFormError('Tanggal pickup wajib dipilih.');
      return;
    }
    setManualDateGroups((previous) => previous.includes(newDate) ? previous : [...previous, newDate]);
    setExpandedDates((previous) => ({ ...previous, [newDate]: true }));
    setFormError('');
  };
  const removeDateGroup = (date: string) => {
    if (formLines.some((line) => line.pickupDate === date) || demandEntries.some((entry) => entry.pickupDate === date)) {
      setFormError('Tanggal hanya dapat dihapus jika belum memiliki SKU atau rekomendasi MTO.');
      return;
    }
    setManualDateGroups((previous) => previous.filter((groupDate) => groupDate !== date));
    setExpandedDates((previous) => {
      const next = { ...previous };
      delete next[date];
      return next;
    });
    setManualProductByDate((previous) => {
      const next = { ...previous };
      delete next[date];
      return next;
    });
    setFormError('');
  };
  const updateLine = (tempId: string, field: 'plannedQuantity' | 'plannedBuyPrice' | 'pickupDate', value: string) => setFormLines((previous) => previous.map((line) => line.tempId === tempId ? { ...line, [field]: field === 'pickupDate' ? value : Number(value) } : line));

  const savePlan = (event: React.FormEvent) => {
    event.preventDefault(); setFormError('');
    if (!formName.trim()) return setFormError('Nama Rencana Pembelian wajib diisi.');
    if (!formLines.length) return setFormError('Pilih atau tambahkan minimal satu SKU.');
    for (const [index, line] of formLines.entries()) {
      if (!line.pickupDate) return setFormError(`Pickup date pada baris ${index + 1} wajib diisi.`);
      if (!Number.isInteger(line.plannedQuantity) || line.plannedQuantity <= 0) return setFormError(`Quantity pada baris ${index + 1} harus berupa bilangan bulat positif.`);
      if (!Number.isFinite(line.plannedBuyPrice) || line.plannedBuyPrice < 0) return setFormError(`Harga beli pada baris ${index + 1} tidak valid.`);
    }
    const payloadLines = formLines.map((line) => {
      const product = products.find((candidate) => candidate.id === line.productId) || catalogBySku.get(line.productId);
      const demand = product ? demandByKey.get(`${line.pickupDate}::${product.sku}`) : undefined;
      return { productId: product?.id || line.productId, pickupDate: line.pickupDate, plannedQuantity: line.plannedQuantity, plannedBuyPrice: line.plannedBuyPrice, sourceBranchNames: line.sourceBranchNames.length ? line.sourceBranchNames : demand?.sourceBranchNames, sourceBranchIds: demand?.sourceBranchIds, sourceOrderIds: line.sourceOrderIds.length ? line.sourceOrderIds : demand?.sourceOrderIds, masterCategoryId: product?.masterCategoryId };
    });
    const sourceOrderIds = uniqueStrings(payloadLines.flatMap((line) => line.sourceOrderIds || []));
    const result = viewMode === 'create' ? addPurchasePlan({ namaRencana: formName, lines: payloadLines, notes: formNotes, sourceOrderIds }) : updatePurchasePlan(selectedPlanId || '', { namaRencana: formName, lines: payloadLines, notes: formNotes, sourceOrderIds });
    if (!result.success || !result.plan) return setFormError(result.message);
    setFormSuccess(result.message); setSelectedPlanId(result.plan.id); setTimeout(() => setViewMode('detail'), 500);
  };

  const statusBadge = (status: PurchasePlanStatus) => {
    const config = { Direncanakan: ['bg-blue-50 text-blue-700 border-blue-200', Clock], Terealisasi: ['bg-emerald-50 text-emerald-700 border-emerald-200', CheckCircle2], Dibatalkan: ['bg-rose-50 text-rose-700 border-rose-200', XCircle] }[status];
    const Icon = config[1];
    return <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-black ${config[0]}`}><Icon className="h-3 w-3" />{status}</span>;
  };
  const groupedFormLines = formDates.map((date) => ({ date, lines: formLines.filter((line) => line.pickupDate === date), recommendations: demandEntries.filter((entry) => entry.pickupDate === date) }));
  const groupedPlanLines = (plan: PurchasePlan) => Array.from(new Set(plan.lines.map((line) => line.pickupDate || 'Tanpa tanggal'))).sort().map((date) => ({ date, lines: plan.lines.filter((line) => (line.pickupDate || 'Tanpa tanggal') === date) }));

  if (!isSuperadmin) return <div className="flex h-full items-center justify-center bg-[#FAF8F5] p-6"><div className="max-w-md rounded-3xl border-2 border-rose-200 bg-white p-8 text-center shadow-lg"><ShieldAlert className="mx-auto h-10 w-10 text-rose-600" /><h2 className="mt-3 text-xl font-black">Akses Khusus Superadmin</h2><p className="mt-2 text-xs text-[#8C7B6C]">Rencana Pembelian reseller hanya dapat dikelola oleh Superadmin.</p></div></div>;

  if (viewMode === 'detail' && activePlan) {
    return <div className="flex h-full flex-col overflow-auto bg-[#FAF8F5] p-6"><div className="mx-auto w-full max-w-6xl space-y-4"><button className="text-xs font-black text-[#B86206]" onClick={() => setViewMode('list')}>← Kembali ke Rencana Pembelian</button><section className="rounded-3xl border border-[#E5DACE] bg-white p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-widest text-[#8C7B6C]">{activePlan.id}</p><h1 className="mt-1 text-2xl font-black">{activePlan.namaRencana}</h1><p className="mt-1 text-xs text-[#8C7B6C]">Penerimaan terpusat: {activePlan.branchName}</p></div><div className="flex gap-2">{statusBadge(activePlan.status)}{activePlan.receivingLocked && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700">Terkunci penerimaan</span>}</div></div><div className="mt-5 grid gap-3 sm:grid-cols-4"><div className="rounded-2xl bg-[#FDFBF7] p-3"><p className="text-[10px] text-[#8C7B6C]">SKU</p><p className="text-lg font-black">{activePlan.lines.length}</p></div><div className="rounded-2xl bg-[#FDFBF7] p-3"><p className="text-[10px] text-[#8C7B6C]">Quantity</p><p className="text-lg font-black">{activePlan.lines.reduce((sum, line) => sum + line.plannedQuantity, 0)}</p></div><div className="rounded-2xl bg-[#FDFBF7] p-3"><p className="text-[10px] text-[#8C7B6C]">Supplier</p><p className="text-lg font-black">{uniqueStrings(activePlan.lines.map((line) => line.supplierId)).length}</p></div><div className="rounded-2xl bg-[#FDFBF7] p-3"><p className="text-[10px] text-[#8C7B6C]">Nilai rencana</p><p className="text-lg font-black">{formatIDR(activePlan.totalPlannedValue)}</p></div></div></section>{groupedPlanLines(activePlan).map((group) => <section key={group.date} className="rounded-3xl border border-[#E5DACE] bg-white p-5"><h2 className="flex items-center gap-2 text-sm font-black"><Calendar className="h-4 w-4 text-[#B86206]" />{group.date === 'Tanpa tanggal' ? group.date : dateLabel(group.date)}</h2><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="border-b border-[#E5DACE] text-[10px] uppercase tracking-wider text-[#8C7B6C]"><tr><th className="p-2">SKU</th><th className="p-2">Supplier</th><th className="p-2">Sumber cabang</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Harga beli</th><th className="p-2 text-right">Subtotal</th></tr></thead><tbody>{group.lines.map((line) => <tr key={line.id} className="border-b border-[#F0E9E1]"><td className="p-2"><strong>{line.productName}</strong><span className="ml-2 text-[10px] text-[#8C7B6C]">{line.productSku}</span></td><td className="p-2">{line.supplierName || '-'}</td><td className="p-2">{line.sourceBranchNames?.join(', ') || 'Input manual'}</td><td className="p-2 text-right font-black">{line.plannedQuantity}</td><td className="p-2 text-right">{formatIDR(line.plannedBuyPrice)}</td><td className="p-2 text-right font-black">{formatIDR(line.lineTotal)}</td></tr>)}</tbody></table></div></section>)}{activePlan.notes && <section className="rounded-3xl border border-[#E5DACE] bg-white p-5 text-xs"><strong>Catatan:</strong> {activePlan.notes}</section>}<div className="flex gap-2">{activePlan.status === 'Direncanakan' && !activePlan.receivingLocked && <><button onClick={() => startEdit(activePlan)} className="rounded-xl bg-[#DF7900] px-4 py-2.5 text-xs font-black text-white">Edit Rencana</button><button onClick={() => setCancelPlanId(activePlan.id)} className="rounded-xl border border-rose-200 px-4 py-2.5 text-xs font-black text-rose-700">Batalkan</button></>}<button onClick={() => setViewMode('list')} className="rounded-xl border border-[#E5DACE] px-4 py-2.5 text-xs font-black">Tutup</button></div></div></div>;
  }

  if (viewMode === 'create' || viewMode === 'edit') {
    return <div className="flex h-full flex-col overflow-auto bg-[#FAF8F5] p-6"><form onSubmit={savePlan} className="mx-auto w-full max-w-6xl space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><button type="button" className="text-xs font-black text-[#B86206]" onClick={() => setViewMode('list')}>← Kembali</button><h1 className="mt-2 text-2xl font-black">{viewMode === 'create' ? 'Buat Rencana Pembelian' : 'Edit Rencana Pembelian'}</h1><p className="mt-1 text-xs text-[#8C7B6C]">Semua SKU reseller akan diterima di {mainBranch?.name || 'Cabang Utama'}.</p></div><div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800"><Truck className="mr-1 inline h-4 w-4" />Penerimaan terpusat</div></div>{(formError || formSuccess) && <div className={`rounded-2xl border p-3 text-xs font-bold ${formError ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{formError || formSuccess}</div>}<section className="rounded-3xl border border-[#E5DACE] bg-white p-5"><label className="text-xs font-black">Nama Rencana Pembelian <span className="text-rose-500">*</span></label><input value={formName} onChange={(event) => setFormName(event.target.value)} className="mt-2 w-full rounded-xl border border-[#DCCFC1] px-4 py-3 text-sm font-bold outline-none" placeholder="Contoh: Pembelian reseller minggu ini" /><label className="mt-4 block text-xs font-black">Catatan (opsional)</label><textarea value={formNotes} onChange={(event) => setFormNotes(event.target.value)} className="mt-2 w-full rounded-xl border border-[#DCCFC1] px-4 py-3 text-xs outline-none" rows={2} /></section><section className="rounded-3xl border border-[#E5DACE] bg-white p-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-sm font-black">Rekomendasi SKU dari MTO</h2><p className="mt-1 text-[11px] text-[#8C7B6C]">Demand semua cabang aktif; cabang hanya informasi sumber.</p></div><div className="flex items-end gap-2"><label className="text-[10px] font-black text-[#8C7B6C]">Tambah tanggal<input type="date" value={newDate} onChange={(event) => setNewDate(event.target.value)} className="mt-1 block rounded-lg border border-[#DCCFC1] px-2 py-2 text-xs" /></label><button type="button" onClick={openDateGroup} className="rounded-xl border border-[#DCCFC1] px-3 py-2 text-xs font-black">Tambah tanggal pembelian</button></div></div><div className="mt-4 space-y-3">{groupedFormLines.map((group) => { const open = expandedDates[group.date] !== false; const isManualDate = manualDateGroups.includes(group.date); const canRemoveDate = isManualDate && group.lines.length === 0 && group.recommendations.length === 0; return <div key={group.date} className="rounded-2xl border border-[#E5DACE] bg-[#FDFBF7]"><div className="flex items-center gap-2"><button type="button" onClick={() => setExpandedDates((previous) => ({ ...previous, [group.date]: !open }))} className="flex w-full items-center justify-between px-4 py-3 text-left"><span className="flex items-center gap-2 text-xs font-black"><Calendar className="h-4 w-4 text-[#B86206]" />{dateLabel(group.date)}<span className="rounded-full bg-white px-2 py-0.5 text-[10px] text-[#8C7B6C]">{group.lines.length} dipilih / {group.recommendations.length} rekomendasi</span></span>{open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</button>{canRemoveDate && <button type="button" onClick={() => removeDateGroup(group.date)} className="mr-3 rounded-lg p-2 text-rose-600 hover:bg-rose-50" aria-label="Hapus tanggal" title="Hapus tanggal"><Trash2 className="h-4 w-4" /></button>}</div>{open && <div className="border-t border-[#E5DACE] p-3"><div className="space-y-2">{group.recommendations.map((recommendation) => { const selected = formLines.some((line) => line.productId === recommendation.productId && line.pickupDate === group.date); return <div key={`${recommendation.pickupDate}-${recommendation.sku}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-xs"><div><p className="font-black">{recommendation.productName} <span className="ml-1 text-[10px] text-[#8C7B6C]">{recommendation.sku}</span></p><p className="mt-1 text-[10px]">{recommendation.supplierName} · Demand MTO {recommendation.quantity} pcs · Cabang: {recommendation.sourceBranchNames.join(', ')}</p></div><button type="button" disabled={selected} onClick={() => addLine(recommendation.productId, group.date, recommendation)} className="rounded-lg bg-blue-600 px-3 py-2 text-[10px] font-black text-white disabled:bg-slate-300">{selected ? 'Sudah dipilih' : '+ Pilih SKU'}</button></div>; })}{group.recommendations.length === 0 && <p className="py-3 text-xs text-[#8C7B6C]">Tidak ada demand MTO. Gunakan SKU manual di bawah.</p>}</div><div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-[#DCCFC1] bg-white p-3"><label className="min-w-[220px] flex-1 text-[10px] font-black text-[#8C7B6C]">SKU reseller manual<select value={manualProductByDate[group.date] || ''} onChange={(event) => setManualProductByDate((previous) => ({ ...previous, [group.date]: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#DCCFC1] px-2 py-2 text-xs font-bold"><option value="">Pilih SKU</option>{catalogProducts.sort((a, b) => a.name.localeCompare(b.name)).map((product) => <option key={product.id} value={product.id}>{product.name} ({product.sku})</option>)}</select></label><button type="button" onClick={() => { const productId = manualProductByDate[group.date]; if (!productId) { setFormError(`Pilih SKU manual untuk tanggal ${dateLabel(group.date)}.`); return; } addLine(productId, group.date); setManualProductByDate((previous) => ({ ...previous, [group.date]: '' })); setFormError(''); }} className="rounded-lg bg-[#DF7900] px-3 py-2 text-[10px] font-black text-white">+ Tambah SKU</button></div><div className="mt-3 space-y-2">{group.lines.map((line) => { const product = products.find((candidate) => candidate.id === line.productId) || catalogBySku.get(line.productId); const demand = product ? demandByKey.get(`${line.pickupDate}::${product.sku}`) : undefined; return <div key={line.tempId} className="grid gap-2 rounded-xl border border-[#E5DACE] bg-white p-3 md:grid-cols-[minmax(0,1.6fr)_110px_150px_auto]"><div><p className="text-xs font-black">{product?.name || line.productId} <span className="ml-1 text-[10px] font-normal text-[#8C7B6C]">{product?.sku}</span></p><p className="text-[10px] text-[#8C7B6C]">{product?.supplierName || suppliers.find((supplier) => supplier.id === product?.supplierId)?.name || '-'} · {demand ? `Rekomendasi ${demand.quantity} pcs` : 'Input manual'}</p>{(demand?.sourceBranchNames || line.sourceBranchNames).length > 0 && <p className="text-[10px] text-blue-700">Sumber cabang: {(demand?.sourceBranchNames || line.sourceBranchNames).join(', ')}</p>}</div><label className="text-[10px] font-black text-[#8C7B6C]">Quantity<input type="number" min="1" step="1" value={line.plannedQuantity} onChange={(event) => updateLine(line.tempId, 'plannedQuantity', event.target.value)} className="mt-1 w-full rounded-lg border border-[#DCCFC1] px-2 py-2 text-xs font-black" /></label><label className="text-[10px] font-black text-[#8C7B6C]">Harga beli<input type="number" min="0" step="1" value={line.plannedBuyPrice} onChange={(event) => updateLine(line.tempId, 'plannedBuyPrice', event.target.value)} className="mt-1 w-full rounded-lg border border-[#DCCFC1] px-2 py-2 text-xs font-black" /></label><button type="button" onClick={() => setFormLines((previous) => previous.filter((item) => item.tempId !== line.tempId))} className="self-end rounded-lg p-2 text-rose-600" aria-label="Hapus SKU"><Trash2 className="h-4 w-4" /></button></div>; })}</div></div>}</div>; })}</div></section><section className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-[#E5DACE] bg-white p-5"><div className="text-xs">{formLines.length} SKU · {formLines.reduce((sum, line) => sum + line.plannedQuantity, 0)} pcs · {formatIDR(formTotal)}</div><div className="flex gap-2"><button type="button" onClick={() => setViewMode('list')} className="rounded-xl border border-[#DCCFC1] px-4 py-2.5 text-xs font-black">Batal</button><button type="submit" className="rounded-xl bg-[#DF7900] px-5 py-2.5 text-xs font-black text-white">{viewMode === 'create' ? 'Simpan Rencana' : 'Simpan Perubahan'}</button></div></section></form></div>;
  }

  return <div className="flex h-full flex-col overflow-auto bg-[#FAF8F5] p-6"><div className="mx-auto w-full max-w-6xl space-y-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-widest text-[#B86206]">Backoffice HQ</p><h1 className="mt-1 text-2xl font-black">Rencana Pembelian Reseller</h1><p className="mt-1 text-xs text-[#8C7B6C]">Pembelian terpusat di {mainBranch?.name || 'Cabang Utama'} untuk distribusi melalui transfer stok.</p></div><button onClick={startCreate} className="rounded-xl bg-[#DF7900] px-4 py-3 text-xs font-black text-white"><Plus className="mr-1 inline h-4 w-4" />Buat Rencana</button></div><div className="grid gap-3 sm:grid-cols-4"><div className="rounded-2xl border border-[#E5DACE] bg-white p-4"><p className="text-[10px] text-[#8C7B6C]">Total</p><p className="text-2xl font-black">{stats.total}</p></div><div className="rounded-2xl border border-blue-100 bg-blue-50 p-4"><p className="text-[10px] text-blue-700">Direncanakan</p><p className="text-2xl font-black text-blue-800">{stats.planned}</p></div><div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4"><p className="text-[10px] text-emerald-700">Terealisasi</p><p className="text-2xl font-black text-emerald-800">{stats.realized}</p></div><div className="rounded-2xl border border-rose-100 bg-rose-50 p-4"><p className="text-[10px] text-rose-700">Dibatalkan</p><p className="text-2xl font-black text-rose-800">{stats.cancelled}</p></div></div><div className="flex flex-wrap gap-2 rounded-2xl border border-[#E5DACE] bg-white p-3"><div className="relative min-w-[240px] flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8C7B6C]" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Cari ID, nama, SKU, supplier..." className="w-full rounded-xl border border-[#DCCFC1] py-2 pl-9 pr-3 text-xs outline-none" /></div><select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value as 'all' | PurchasePlanStatus)} className="rounded-xl border border-[#DCCFC1] px-3 py-2 text-xs font-bold"><option value="all">Semua status</option><option value="Direncanakan">Direncanakan</option><option value="Terealisasi">Terealisasi</option><option value="Dibatalkan">Dibatalkan</option></select></div><section className="overflow-hidden rounded-3xl border border-[#E5DACE] bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-[#FDFBF7] text-[10px] uppercase tracking-wider text-[#8C7B6C]"><tr><th className="p-4">ID / Nama Rencana</th><th className="p-4">Pickup date</th><th className="p-4">Supplier</th><th className="p-4">SKU</th><th className="p-4">Nilai</th><th className="p-4">Status</th><th className="p-4">Aksi</th></tr></thead><tbody>{visiblePlans.map((plan) => <tr key={plan.id} className="border-t border-[#F0E9E1]"><td className="p-4"><p className="font-black">{plan.namaRencana}</p><p className="text-[10px] text-[#8C7B6C]">{plan.id} · {plan.branchName}</p></td><td className="p-4">{uniqueStrings(plan.lines.map((line) => line.pickupDate)).map((date) => dateLabel(date)).join(', ') || '-'}</td><td className="p-4">{uniqueStrings(plan.lines.map((line) => line.supplierName)).join(', ') || plan.supplierName}</td><td className="p-4">{plan.lines.length}</td><td className="p-4 font-black">{formatIDR(plan.totalPlannedValue)}</td><td className="p-4">{statusBadge(plan.status)}</td><td className="p-4"><div className="flex gap-1"><button title="Detail" onClick={() => { setSelectedPlanId(plan.id); setViewMode('detail'); }} className="rounded-lg p-2 text-blue-700"><Eye className="h-4 w-4" /></button>{plan.status === 'Direncanakan' && !plan.receivingLocked && <button title="Edit" onClick={() => startEdit(plan)} className="rounded-lg p-2 text-[#B86206]"><FileText className="h-4 w-4" /></button>}{plan.status === 'Direncanakan' && !plan.receivingLocked && <button title="Batalkan" onClick={() => setCancelPlanId(plan.id)} className="rounded-lg p-2 text-rose-700"><Ban className="h-4 w-4" /></button>}</div></td></tr>)}</tbody></table>{visiblePlans.length === 0 && <div className="p-12 text-center text-xs text-[#8C7B6C]"><Package className="mx-auto mb-2 h-8 w-8 opacity-40" />Belum ada rencana pembelian reseller yang sesuai filter.</div>}</div></section><p className="text-[11px] text-[#8C7B6C]">{visiblePlans.length} dokumen · Cabang penerimaan tetap {mainBranch?.name || 'Cabang Utama'}.</p>{cancelPlanId && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl"><h2 className="text-lg font-black">Batalkan rencana pembelian?</h2><p className="mt-2 text-xs text-[#8C7B6C]">Dokumen tidak dihapus dan tetap tersimpan sebagai Dibatalkan.</p><textarea value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} className="mt-4 w-full rounded-xl border border-[#DCCFC1] p-3 text-xs" rows={3} /><div className="mt-4 flex justify-end gap-2"><button onClick={() => setCancelPlanId(null)} className="rounded-xl border border-[#DCCFC1] px-4 py-2 text-xs font-black">Tutup</button><button onClick={() => { const result = cancelPurchasePlan(cancelPlanId, cancelReason); if (result.success) { setCancelPlanId(null); setCancelReason(''); } }} className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-black text-white">Batalkan</button></div></div></div>}</div></div>;
};
