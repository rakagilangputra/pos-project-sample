import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Package, Calendar, Clock, User, CreditCard } from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { PaymentComponent, MtoOrderItemInput, ProductExpiryType } from '../types';
import { formatIDR, posSound } from '../utils/formatters';

interface CreateMtoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ProductRowState {
  id: string;
  productId: string;
  quantity: number;
  customPrice: string;
  customizationNotes: string;
  supplierId?: string;
  expiryType?: ProductExpiryType;
  expiryDate?: string;
}

export function CreateMtoModal({ isOpen, onClose }: CreateMtoModalProps) {
  const { products, customers, suppliers, createMtoOrder } = usePOS();
  const mtoProducts = products.filter((p) => p.isMadeToOrder);
  const selectableProducts = mtoProducts.length > 0 ? mtoProducts : products;

  const createInitialRow = (): ProductRowState => {
    const defaultProduct = selectableProducts[0] || products[0];
    const isMultiDay = defaultProduct?.expiryType === 'multi_day';
    const shelfDays = defaultProduct?.shelfLifeDays || 7;
    const defaultExpiry = isMultiDay
      ? new Date(Date.now() + shelfDays * 86400000).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    return {
      id: 'row-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      productId: defaultProduct ? defaultProduct.id : '',
      quantity: 1,
      customPrice: defaultProduct ? String(defaultProduct.price) : '0',
      customizationNotes: '',
      supplierId: defaultProduct?.supplierId || 'internal',
      expiryType: defaultProduct?.expiryType || 'daily',
      expiryDate: defaultExpiry,
    };
  };

  const [productRows, setProductRows] = useState<ProductRowState[]>([createInitialRow()]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || 'cust-1');

  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const [pickupDate, setPickupDate] = useState(tomorrow);
  const [pickupTime, setPickupTime] = useState('10:00');
  const [customizationNotes, setCustomizationNotes] = useState('');

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris' | 'transfer' | 'deposit' | 'pay_tomorrow'>('cash');
  const [paidAmountInput, setPaidAmountInput] = useState('');

  // Reset or sync rows when modal opens
  useEffect(() => {
    if (isOpen && productRows.length === 0) {
      setProductRows([createInitialRow()]);
    }
  }, [isOpen]);

  const handleAddRow = () => {
    const defaultProduct = selectableProducts[0] || products[0];
    const isMultiDay = defaultProduct?.expiryType === 'multi_day';
    const shelfDays = defaultProduct?.shelfLifeDays || 7;
    const defaultExpiry = isMultiDay
      ? new Date(Date.now() + shelfDays * 86400000).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    const newRow: ProductRowState = {
      id: 'row-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      productId: defaultProduct ? defaultProduct.id : '',
      quantity: 1,
      customPrice: defaultProduct ? String(defaultProduct.price) : '0',
      customizationNotes: '',
      supplierId: defaultProduct?.supplierId || 'internal',
      expiryType: defaultProduct?.expiryType || 'daily',
      expiryDate: defaultExpiry,
    };
    setProductRows((prev) => [...prev, newRow]);
  };

  const handleRemoveRow = (rowId: string) => {
    if (productRows.length <= 1) return;
    setProductRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  const handleProductChange = (rowId: string, newProductId: string) => {
    const prod = products.find((p) => p.id === newProductId);
    const isMultiDay = prod?.expiryType === 'multi_day';
    const shelfDays = prod?.shelfLifeDays || 7;
    const defaultExpiry = isMultiDay
      ? new Date(Date.now() + shelfDays * 86400000).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    setProductRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        return {
          ...r,
          productId: newProductId,
          customPrice: prod ? String(prod.price) : r.customPrice,
          supplierId: prod?.supplierId || 'internal',
          expiryType: prod?.expiryType || 'daily',
          expiryDate: defaultExpiry,
        };
      })
    );
  };

  const handleExpiryTypeChange = (rowId: string, type: ProductExpiryType) => {
    setProductRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const prod = products.find((p) => p.id === r.productId);
        const shelfDays = prod?.shelfLifeDays || 7;
        const newExpiry =
          type === 'multi_day'
            ? new Date(Date.now() + shelfDays * 86400000).toISOString().slice(0, 10)
            : new Date().toISOString().slice(0, 10);
        return { ...r, expiryType: type, expiryDate: newExpiry };
      })
    );
  };

  const handleExpiryDateChange = (rowId: string, date: string) => {
    setProductRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, expiryDate: date } : r))
    );
  };

  const handleSupplierChange = (rowId: string, newSupplierId: string) => {
    setProductRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, supplierId: newSupplierId } : r))
    );
  };

  const handleQuantityChange = (rowId: string, qty: number) => {
    setProductRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, quantity: Math.max(1, qty) } : r))
    );
  };

  const handlePriceChange = (rowId: string, price: string) => {
    setProductRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, customPrice: price } : r))
    );
  };

  const handleRowNotesChange = (rowId: string, notes: string) => {
    setProductRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, customizationNotes: notes } : r))
    );
  };

  // Calculate Subtotal & Total
  const totalItemsCount = productRows.reduce((sum, r) => sum + (r.quantity || 1), 0);
  const total = productRows.reduce((sum, r) => {
    const prod = products.find((p) => p.id === r.productId);
    const unitPrice = parseFloat(r.customPrice) >= 0 ? parseFloat(r.customPrice) : (prod?.price || 0);
    return sum + unitPrice * (r.quantity || 1);
  }, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find((c) => c.id === selectedCustomerId) || customers[0];
    if (!cust) {
      alert('Pilih pelanggan terlebih dahulu');
      return;
    }

    if (productRows.length === 0) {
      alert('Tambahkan minimal 1 produk pesanan');
      return;
    }

    const items: MtoOrderItemInput[] = productRows.map((r) => {
      const prod = products.find((p) => p.id === r.productId);
      const unitP = parseFloat(r.customPrice) >= 0 ? parseFloat(r.customPrice) : (prod?.price || 0);
      const chosenSup = suppliers.find((s) => s.id === r.supplierId);
      const isInternal = !r.supplierId || r.supplierId === 'internal';

      return {
        productId: r.productId,
        quantity: r.quantity || 1,
        customPrice: unitP,
        customizationNotes: r.customizationNotes.trim() || undefined,
        supplierId: isInternal ? undefined : chosenSup?.id,
        supplierName: isInternal ? 'Produksi Sendiri' : chosenSup?.name,
        ownershipType: isInternal ? 'own' : 'consignment',
        expiryType: r.expiryType || prod?.expiryType || 'daily',
        expiryDate: r.expiryDate || (
          (r.expiryType || prod?.expiryType) === 'multi_day'
            ? new Date(Date.now() + (prod?.shelfLifeDays || 7) * 86400000).toISOString().slice(0, 10)
            : new Date().toISOString().slice(0, 10)
        ),
      };
    });

    const isPayTomorrow = paymentMethod === 'pay_tomorrow';
    const paidAmt = parseFloat(paidAmountInput) >= 0 ? parseFloat(paidAmountInput) : 0;

    if (!isPayTomorrow && paidAmt <= 0) {
      alert('Masukkan jumlah pembayaran DP atau pembayaran pertama yang valid');
      return;
    }

    const payments: PaymentComponent[] = [
      {
        method: paymentMethod,
        amount: paidAmt,
        change: paymentMethod === 'cash' ? Math.max(0, paidAmt - total) : 0,
        timestamp: new Date().toISOString(),
      },
    ];

    const res = createMtoOrder({
      items,
      customer: cust,
      pickupDate,
      pickupTime,
      customizationNotes,
      payments,
    });

    if (res.success) {
      posSound.cashRegister();
      alert(res.message);
      // Reset form
      setProductRows([createInitialRow()]);
      setCustomizationNotes('');
      setPaidAmountInput('');
      setPaymentMethod('cash');
      onClose();
    } else {
      alert(res.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-2xl rounded-3xl bg-white border-2 border-[#E5DACE] p-6 shadow-2xl overflow-y-auto max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#E5DACE] pb-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎂</span>
            <div>
              <h3 className="text-lg font-black text-[#2D241E]">Pembuatan PO Made-to-Order (MTO)</h3>
              <p className="text-xs text-[#8C7B6C]">Dukung pesanan banyak produk dengan harga kustom per item</p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="rounded-xl border border-[#E5DACE] px-3 py-1.5 text-xs font-bold text-[#8C7B6C] hover:text-[#2D241E] hover:bg-gray-50 transition"
          >
            ✕ Tutup
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Multiple Products Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-[#D97706]" />
                <label className="text-xs font-black uppercase tracking-wider text-[#6B7280]">
                  Daftar Produk Pesanan ({productRows.length} Produk, {totalItemsCount} Qty)
                </label>
              </div>
              <button
                type="button"
                onClick={handleAddRow}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900 hover:bg-amber-100 hover:border-amber-400 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                Tambah Produk
              </button>
            </div>

            <div className="space-y-3">
              {productRows.map((row, index) => {
                const rowProduct = products.find((p) => p.id === row.productId);
                const rowUnitP = parseFloat(row.customPrice) >= 0 ? parseFloat(row.customPrice) : (rowProduct?.price || 0);
                const rowSubtotal = rowUnitP * (row.quantity || 1);

                return (
                  <div
                    key={row.id}
                    className="rounded-2xl border border-[#E5DACE] bg-[#FDFBF7] p-3.5 space-y-3 transition hover:border-amber-300"
                  >
                    <div className="flex items-center justify-between border-b border-[#E5DACE]/60 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-[10px] font-black text-white">
                          {index + 1}
                        </span>
                        <span className="text-xs font-bold text-[#2D241E]">
                          Item #{index + 1}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-[#D97706]">
                          Subtotal: {formatIDR(rowSubtotal)}
                        </span>
                        {productRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(row.id)}
                            title="Hapus produk ini"
                            className="rounded-lg p-1 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Product Selection */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-[#6B7280] mb-1">Pilih Produk</label>
                        <select
                          value={row.productId}
                          onChange={(e) => handleProductChange(row.id, e.target.value)}
                          className="w-full rounded-xl border border-[#E5DACE] bg-white px-3 py-2 text-sm font-semibold text-[#2D241E] focus:border-amber-500 focus:outline-none"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} {p.isMadeToOrder ? '🎂 [MTO]' : ''} — Standar {formatIDR(p.price)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[#6B7280] mb-1">
                          Sumber / Mitra Supplier
                        </label>
                        <select
                          value={row.supplierId || 'internal'}
                          onChange={(e) => handleSupplierChange(row.id, e.target.value)}
                          className="w-full rounded-xl border border-[#E5DACE] bg-white px-3 py-2 text-xs font-semibold text-[#2D241E] focus:border-amber-500 focus:outline-none"
                        >
                          <option value="internal">🏭 Produksi Sendiri (Dapur In-House)</option>
                          <optgroup label="Mitra Supplier (Titipan / Pesan Luar)">
                            {suppliers.map((s) => (
                              <option key={s.id} value={s.id}>
                                🤝 {s.name} ({s.phone || 'Tanpa WA'})
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </div>
                    </div>

                    {row.supplierId && row.supplierId !== 'internal' ? (
                      <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-[11px] text-emerald-800 flex items-center gap-1.5">
                        <span className="font-bold">✓ Mitra Supplier:</span> Pesanan item ini otomatis muncul di tab <strong>Notifikasi Supplier (WhatsApp Gateway)</strong>
                      </div>
                    ) : (
                      <div className="rounded-lg bg-amber-50/60 border border-amber-200/60 px-3 py-1 text-[10px] text-amber-800">
                        ℹ️ <strong>Produksi Sendiri:</strong> Dikerjakan tim dapur pastry internal (tidak membutuhkan WhatsApp vendor eksternal).
                      </div>
                    )}

                    {/* Quantity and Custom Price */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-[#6B7280] mb-1">
                          Jumlah (Qty)
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={row.quantity}
                          onChange={(e) => handleQuantityChange(row.id, parseInt(e.target.value) || 1)}
                          className="w-full rounded-xl border border-[#E5DACE] bg-white px-3 py-2 text-sm font-semibold text-[#2D241E]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[#6B7280] mb-1 flex items-center justify-between">
                          <span>Harga Satuan (Rp)</span>
                          {rowProduct && parseFloat(row.customPrice) !== rowProduct.price && (
                            <span className="text-[10px] text-amber-700 font-bold bg-amber-100 px-1.5 py-0.5 rounded">
                              Harga Kustom
                            </span>
                          )}
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={row.customPrice}
                          onChange={(e) => handlePriceChange(row.id, e.target.value)}
                          placeholder="0"
                          className="w-full rounded-xl border border-[#E5DACE] bg-white px-3 py-2 text-sm font-semibold text-[#2D241E]"
                        />
                      </div>
                    </div>

                    {/* Expiry Configuration: Multi-day Expiry Adjustment */}
                    {row.expiryType === 'multi_day' ? (
                      <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-2.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[9px] font-black text-white uppercase tracking-wider">
                              ⏳ Expired &gt; 1 Hari
                            </span>
                            <span className="text-xs font-bold text-[#1F2937]">
                              Atur Tanggal Expiry Date
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleExpiryTypeChange(row.id, 'daily')}
                            className="text-[10px] font-bold text-[#8C7B6C] hover:text-[#2D241E] hover:underline cursor-pointer"
                          >
                            Ubah ke Harian
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                          <div>
                            <label className="block text-[10px] font-bold text-[#6B7280] mb-0.5">
                              Tanggal Kadaluwarsa
                            </label>
                            <input
                              type="date"
                              value={row.expiryDate || ''}
                              onChange={(e) => handleExpiryDateChange(row.id, e.target.value)}
                              className="w-full rounded-lg border border-blue-300 bg-white px-2.5 py-1 text-xs font-bold text-[#2D241E] focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-[#6B7280] mb-0.5">
                              Shortcut Hari
                            </label>
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
                                    handleExpiryDateChange(row.id, d);
                                  }}
                                  className="flex-1 rounded-md border border-blue-200 bg-white py-1 text-[10px] font-bold text-blue-800 hover:bg-blue-100 transition cursor-pointer"
                                >
                                  {preset.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="text-[10px] text-blue-800 font-medium">
                          ℹ️ Item ini akan dicatat dalam batch stok dan otomatis muncul di menu <strong>Closing Harian</strong>.
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50/50 px-2.5 py-1.5 text-[11px] text-amber-900">
                        <div className="flex items-center gap-1.5">
                          <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[9px] font-black text-white uppercase">
                            ⚡ Expired Harian
                          </span>
                          <span>Produk segar harian (habis saat closing hari H).</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleExpiryTypeChange(row.id, 'multi_day')}
                          className="text-[10px] font-bold text-blue-700 hover:underline cursor-pointer"
                        >
                          Atur Expiry &gt; 1 Hari
                        </button>
                      </div>
                    )}

                    {/* Specific Item Customization Note */}
                    <div>
                      <input
                        type="text"
                        value={row.customizationNotes}
                        onChange={(e) => handleRowNotesChange(row.id, e.target.value)}
                        placeholder="Catatan khusus produk ini (opsional, contoh: Tulisan lilin, diameter 22cm...)"
                        className="w-full rounded-xl border border-[#E5DACE] bg-white px-3 py-1.5 text-xs text-[#2D241E] placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick add product button under rows */}
            <button
              type="button"
              onClick={handleAddRow}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#E5DACE] py-2.5 text-xs font-bold text-[#8C7B6C] hover:border-amber-400 hover:bg-amber-50/50 hover:text-amber-900 transition"
            >
              <Plus className="h-4 w-4" />
              + Tambah Produk Lain ke PO Ini
            </button>
          </div>

          {/* Pelanggan */}
          <div>
            <label className="block text-xs font-bold text-[#6B7280] mb-1">Pelanggan</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full rounded-xl border border-[#E5DACE] px-3 py-2 text-sm font-semibold bg-[#FDFBF7] text-[#2D241E]"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone || 'Tanpa No. Telp'})
                </option>
              ))}
            </select>
          </div>

          {/* Tanggal & Jam Ambil */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#6B7280] mb-1">Tanggal Ambil</label>
              <input
                type="date"
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                className="w-full rounded-xl border border-[#E5DACE] px-3 py-2 text-sm font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#6B7280] mb-1">Jam Ambil</label>
              <input
                type="time"
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                className="w-full rounded-xl border border-[#E5DACE] px-3 py-2 text-sm font-semibold"
              />
            </div>
          </div>

          {/* Catatan Kustomisasi Keseluruhan */}
          <div>
            <label className="block text-xs font-bold text-[#6B7280] mb-1">
              Catatan Kustomisasi Keseluruhan (Tulisan Kue, Tema Acara, dll)
            </label>
            <textarea
              rows={2}
              value={customizationNotes}
              onChange={(e) => setCustomizationNotes(e.target.value)}
              placeholder="Contoh: Pengambilan jam 10 pagi, box diikat pita emas..."
              className="w-full rounded-xl border border-[#E5DACE] px-3 py-2 text-sm font-semibold"
            />
          </div>

          {/* Pembayaran / DP */}
          <div className="border-t border-[#E5DACE] pt-3 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label id="lbl-payment-method-dp" className="block text-xs font-bold text-[#6B7280] mb-1">
                  Metode Pembayaran / DP
                </label>
                <select
                  id="select-mto-payment-method"
                  value={paymentMethod}
                  onChange={(e) => {
                    const nextMethod = e.target.value as any;
                    setPaymentMethod(nextMethod);
                    if (nextMethod === 'pay_tomorrow') {
                      setPaidAmountInput('0');
                    } else if (paidAmountInput === '0') {
                      setPaidAmountInput('');
                    }
                  }}
                  className="w-full rounded-xl border border-[#E5DACE] px-3 py-2 text-sm font-semibold bg-[#FDFBF7] text-[#2D241E] focus:border-[#D97706] focus:outline-none focus:ring-1 focus:ring-[#D97706] transition"
                >
                  <option value="cash">Tunai (Cash)</option>
                  <option value="qris">QRIS</option>
                  <option value="transfer">Transfer Bank</option>
                  <option value="deposit">Deposit Pelanggan</option>
                  <option value="pay_tomorrow">Dibayar Besok (DP Rp 0 / Bayar Saat Ambil)</option>
                </select>
              </div>

              <div>
                <label id="lbl-paid-amount" className="block text-xs font-bold text-[#6B7280] mb-1 flex items-center justify-between">
                  <span>Nominal Dibayar (DP/Lunas)</span>
                  {paymentMethod === 'pay_tomorrow' ? (
                    <span className="text-[10px] text-blue-700 font-bold bg-blue-100 px-1.5 py-0.5 rounded">
                      Boleh Kosong / Rp 0
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-700 font-medium">
                      Minimal DP/Lunas
                    </span>
                  )}
                </label>
                <input
                  id="input-mto-paid-amount"
                  type="number"
                  min={0}
                  value={paidAmountInput}
                  onChange={(e) => setPaidAmountInput(e.target.value)}
                  placeholder={paymentMethod === 'pay_tomorrow' ? '0 (Dibayar saat ambil)' : `Total: ${formatIDR(total)}`}
                  className="w-full rounded-xl border border-[#E5DACE] px-3 py-2 text-sm font-semibold text-[#2D241E] focus:border-[#D97706] focus:outline-none focus:ring-1 focus:ring-[#D97706] transition placeholder:text-gray-400"
                />
              </div>
            </div>

            {paymentMethod === 'pay_tomorrow' && (
              <div className="rounded-xl bg-blue-50/80 border border-blue-200 p-2.5 text-xs text-blue-900 flex items-start gap-2">
                <span className="text-base leading-none">🗓️</span>
                <div>
                  <strong className="font-bold">Dibayar Besok:</strong> Pelanggan tidak membayar DP saat pemesanan dibuat (DP Rp 0). Seluruh tagihan sebesar <strong>{formatIDR(total)}</strong> akan dilunasi saat pesanan diambil esok hari.
                </div>
              </div>
            )}
          </div>

          {/* Summary Box */}
          <div className="flex items-center justify-between bg-[#F7F7F5] p-3.5 rounded-2xl text-sm font-bold border border-[#E5DACE]/60">
            <div>
              <span className="text-xs text-gray-500 block">Total PO ({productRows.length} Produk, {totalItemsCount} Item)</span>
              <span className="text-base font-black text-[#2D241E]">{formatIDR(total)}</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-500 block">Sisa Piutang</span>
              <span className="text-base font-black text-amber-700">
                {formatIDR(Math.max(0, total - (parseFloat(paidAmountInput) || 0)))}
              </span>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#E5DACE] px-4 py-2.5 text-xs font-bold text-[#8C7B6C] hover:text-[#2D241E] hover:bg-gray-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="rounded-xl bg-[#D97706] px-5 py-2.5 text-xs font-black text-white hover:bg-amber-700 transition shadow-xs"
            >
              Buat PO Made-to-Order ({productRows.length} Produk)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
