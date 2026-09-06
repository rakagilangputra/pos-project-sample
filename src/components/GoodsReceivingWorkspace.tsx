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
  ArrowDownRight,
  ShieldCheck,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { GoodsReceiptRecord, ReceiptType } from '../types';
import { formatIDR, formatDateTime } from '../utils/formatters';

export const GoodsReceivingWorkspace: React.FC = () => {
  const {
    goodsReceipts,
    suppliers,
    products,
    currentUser,
    receivingDraft,
    setReceivingDraft,
    submitGoodsReceipt,
  } = usePOS();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedReceipt, setSelectedReceipt] = useState<GoodsReceiptRecord | null>(null);

  // New Receipt Form State / Modal
  const [isCreatingReceipt, setIsCreatingReceipt] = useState(false);

  // Form fields
  const [receiptType, setReceiptType] = useState<ReceiptType>(receivingDraft?.receiptType || 'Dibeli Sendiri');
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
  const [receiptItems, setReceiptItems] = useState<
    { tempId: string; productId: string; quantityReceived: number }[]
  >(receivingDraft?.items || [{ tempId: 'item-1', productId: products[0]?.id || '', quantityReceived: 10 }]);

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Filtered receipts
  const filteredReceipts = useMemo(() => {
    return goodsReceipts.filter((r) => {
      if (filterType !== 'all' && r.receiptType !== filterType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNum = r.receiptNumber.toLowerCase().includes(q);
        const matchSup = r.supplierName.toLowerCase().includes(q);
        const matchRef = r.stockMovementRef.toLowerCase().includes(q);
        if (!matchNum && !matchSup && !matchRef) return false;
      }
      return true;
    });
  }, [goodsReceipts, filterType, searchQuery]);

  // Add item row
  const handleAddItemRow = () => {
    const unselectedProd = products.find((p) => !receiptItems.some((i) => i.productId === p.id));
    const defaultProdId = unselectedProd ? unselectedProd.id : products[0]?.id || '';
    setReceiptItems((prev) => [
      ...prev,
      { tempId: 'item-' + Date.now(), productId: defaultProdId, quantityReceived: 10 },
    ]);
  };

  // Remove item row
  const handleRemoveItemRow = (tempId: string) => {
    if (receiptItems.length <= 1) {
      setFormError('Minimal harus ada 1 baris item produk dalam penerimaan!');
      return;
    }
    setReceiptItems((prev) => prev.filter((i) => i.tempId !== tempId));
  };

  // Update item row
  const handleUpdateItemRow = (tempId: string, field: 'productId' | 'quantityReceived', value: any) => {
    setReceiptItems((prev) =>
      prev.map((item) => {
        if (item.tempId === tempId) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  // Handle Submit Form
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const sup = suppliers.find((s) => s.id === supplierId);
    if (!sup) {
      setFormError('Mitra supplier pengirim wajib dipilih!');
      return;
    }

    const formattedItems = receiptItems.map((item) => {
      const prod = products.find((p) => p.id === item.productId);
      return {
        id: 'rec-it-' + Math.random().toString(36).substring(2, 9),
        productId: item.productId,
        productSku: prod ? prod.sku : 'SKU-UNKNOWN',
        productName: prod ? prod.name : 'Produk',
        sellingPrice: prod ? prod.price : 0,
        quantityReceived: Number(item.quantityReceived) || 0,
      };
    });

    const totalQuantity = formattedItems.reduce((sum, it) => sum + it.quantityReceived, 0);
    const costNum = receiptType === 'Dibeli Sendiri' ? parseFloat(totalPurchaseCost) : undefined;

    const res = submitGoodsReceipt({
      receiptType,
      arrivalDate,
      supplierId: sup.id,
      supplierName: sup.name,
      receivedBy,
      items: formattedItems,
      totalQuantity,
      remarks,
      totalPurchaseCost: costNum,
      paymentMethod: receiptType === 'Dibeli Sendiri' ? paymentMethod : undefined,
    });

    if (res.success) {
      setFormSuccess(res.message);
      setIsCreatingReceipt(false);
      // Reset form
      setReceiptItems([{ tempId: 'item-1', productId: products[0]?.id || '', quantityReceived: 10 }]);
      setRemarks('');
      setTotalPurchaseCost('');
    } else {
      setFormError(res.message);
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
              POS-US-059, 060, 061, 062: Pencatatan barang masuk dari supplier dengan penambahan otomatis ke stok jual
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="new-goods-receipt-btn"
            onClick={() => setIsCreatingReceipt(true)}
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
              placeholder="Cari No. Terima / Supplier / Ref..."
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

      {/* Main Content: Table of Receipts */}
      <div className="flex-1 overflow-y-auto p-6 bg-[#FDFBF7]">
        {filteredReceipts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 rounded-2xl border-2 border-dashed border-[#E5DACE] bg-white p-8 text-center">
            <Truck className="h-12 w-12 text-[#8C7B6C] opacity-40 mb-3" />
            <h3 className="text-sm font-black text-[#2D241E]">Belum Ada Bukti Penerimaan Barang</h3>
            <p className="text-xs text-[#8C7B6C] mt-1">
              Catat penerimaan barang baru dari supplier untuk menambah stok jual toko secara akurat & traceable.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredReceipts.map((rec) => (
              <div
                key={rec.id}
                className="rounded-2xl border-2 border-[#E5DACE] bg-white p-5 shadow-xs hover:border-[#D97706] transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
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
                    <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Submitted & Stock Added
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

      {/* CREATE RECEIPT MODAL / FULLVIEW */}
      {isCreatingReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="flex h-[90vh] w-full max-w-4xl flex-col rounded-3xl bg-white shadow-2xl border-2 border-[#E5DACE] overflow-hidden animate-fadeIn">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b-2 border-[#E5DACE] bg-[#FDFBF7] px-6 py-4">
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
                onClick={() => setIsCreatingReceipt(false)}
                className="rounded-xl border border-[#E5DACE] bg-white px-4 py-2 text-xs font-bold text-[#8C7B6C] hover:bg-[#E5DACE]"
              >
                ✕ Tutup
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitForm} className="flex-1 overflow-y-auto p-6 space-y-6">
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

              {/* Receipt Type Selection (POS-US-059 & 060) */}
              <div className="rounded-2xl border-2 border-[#E5DACE] bg-[#FDFBF7] p-5 space-y-3">
                <label className="text-xs font-black uppercase tracking-wider text-[#8C7B6C]">
                  Tipe Penerimaan Barang <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setReceiptType('Dibeli Sendiri')}
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
                    onClick={() => setReceiptType('Konsinyasi')}
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

              {/* Basic Meta */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#2D241E]">
                    Mitra Supplier <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full rounded-xl border-2 border-[#E5DACE] bg-[#FDFBF7] px-3 py-2 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
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

              {/* If Dibeli Sendiri: Total Cost & Payment Method (POS-US-060) */}
              {receiptType === 'Dibeli Sendiri' && (
                <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/50 p-5 space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-blue-900">
                    Informasi Pembelian & Pembayaran (Dibeli Sendiri)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#2D241E]">
                        Total Biaya Pembelian (Rp) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={totalPurchaseCost}
                        onChange={(e) => setTotalPurchaseCost(e.target.value)}
                        placeholder="Contoh: 1500000"
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

              {/* Items List (POS-US-061 & POS-US-062) */}
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
                    return (
                      <div
                        key={item.tempId}
                        className="flex flex-col sm:flex-row items-center gap-3 rounded-xl border-2 border-[#E5DACE] bg-[#FDFBF7] p-3"
                      >
                        <div className="w-8 text-xs font-bold text-[#8C7B6C] text-center">#{idx + 1}</div>

                        <div className="flex-1 w-full space-y-1">
                          <label className="text-[10px] font-bold text-[#8C7B6C]">Produk Master</label>
                          <select
                            value={item.productId}
                            onChange={(e) => handleUpdateItemRow(item.tempId, 'productId', e.target.value)}
                            className="w-full rounded-lg border border-[#E5DACE] bg-white px-3 py-1.5 text-xs font-bold text-[#2D241E] focus:outline-none"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                [{p.sku}] {p.name} (Stok Saat Ini: {p.stock})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="w-full sm:w-40 space-y-1">
                          <label className="text-[10px] font-bold text-[#8C7B6C]">Jumlah Diterima (Pcs)</label>
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
                    );
                  })}
                </div>
              </div>

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

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t-2 border-[#E5DACE]">
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-xl bg-[#D97706] px-6 py-2.5 text-xs font-black text-white hover:bg-amber-700 active:scale-95 transition shadow-xs"
                >
                  <Check className="h-4 w-4" />
                  <span>Simpan & Tambah ke Stok Jual</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingReceipt(false)}
                  className="rounded-xl border border-[#E5DACE] bg-white px-5 py-2.5 text-xs font-bold text-[#8C7B6C] hover:bg-[#E5DACE] transition"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL RECEIPT MODAL */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="flex w-full max-w-2xl flex-col rounded-3xl bg-white shadow-2xl border-2 border-[#E5DACE] overflow-hidden animate-fadeIn">
            <div className="flex items-center justify-between border-b-2 border-[#E5DACE] bg-[#FDFBF7] px-6 py-4">
              <div>
                <span className="rounded-lg bg-amber-100 px-2 py-0.5 text-[11px] font-black text-[#D97706]">
                  {selectedReceipt.receiptNumber}
                </span>
                <h3 className="text-base font-black text-[#2D241E] mt-1">Detail Bukti Penerimaan Barang</h3>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="rounded-xl border border-[#E5DACE] bg-white px-4 py-2 text-xs font-bold text-[#8C7B6C] hover:bg-[#E5DACE]"
              >
                ✕ Tutup
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-4 rounded-2xl bg-[#FDFBF7] p-4 border border-[#E5DACE]">
                <div>
                  <span className="text-[#8C7B6C] block">Tipe Penerimaan:</span>
                  <strong className="text-[#2D241E] text-sm">{selectedReceipt.receiptType}</strong>
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
                <div className="col-span-2">
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

              <div className="space-y-2">
                <h4 className="font-black text-[#2D241E]">Daftar Item Barang Diterima ({selectedReceipt.totalQuantity} pcs total):</h4>
                <div className="rounded-2xl border border-[#E5DACE] overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#FDFBF7] border-b border-[#E5DACE] text-[#8C7B6C]">
                        <th className="p-3">SKU</th>
                        <th className="p-3">Nama Produk</th>
                        <th className="p-3 text-right">Qty Diterima</th>
                        <th className="p-3 text-right">Harga Jual</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReceipt.items.map((it) => (
                        <tr key={it.id} className="border-b border-[#E5DACE]/60 hover:bg-[#FDFBF7]/50">
                          <td className="p-3 font-mono font-bold text-[#D97706]">{it.productSku}</td>
                          <td className="p-3 font-bold text-[#2D241E]">{it.productName}</td>
                          <td className="p-3 text-right font-black text-emerald-700">+{it.quantityReceived} pcs</td>
                          <td className="p-3 text-right font-bold text-[#2D241E]">{formatIDR(it.sellingPrice)}</td>
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

            <div className="flex items-center justify-end gap-3 border-t-2 border-[#E5DACE] bg-[#FDFBF7] px-6 py-4">
              <button
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
