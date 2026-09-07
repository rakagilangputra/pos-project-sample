import React, { useState, useEffect } from 'react';
import { usePOS } from '../context/POSContext';
import { PaymentComponent } from '../types';
import { formatIDR, posSound } from '../utils/formatters';

interface CreateMtoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateMtoModal({ isOpen, onClose }: CreateMtoModalProps) {
  const { products, customers, createMtoOrder } = usePOS();
  const mtoProducts = products.filter((p) => p.isMadeToOrder);
  const [selectedProductId, setSelectedProductId] = useState(mtoProducts[0]?.id || '');
  const selectedProduct = mtoProducts.find((p) => p.id === selectedProductId) || mtoProducts[0];

  const [quantity, setQuantity] = useState(1);
  const [customPrice, setCustomPrice] = useState(selectedProduct ? String(selectedProduct.price) : '0');
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || 'cust-1');

  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const [pickupDate, setPickupDate] = useState(tomorrow);
  const [pickupTime, setPickupTime] = useState('10:00');
  const [customizationNotes, setCustomizationNotes] = useState('');

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris' | 'transfer' | 'deposit'>('cash');
  const [paidAmountInput, setPaidAmountInput] = useState('');

  useEffect(() => {
    if (selectedProduct) {
      setCustomPrice(String(selectedProduct.price));
    }
  }, [selectedProductId]);

  const unitP = parseFloat(customPrice) || selectedProduct?.price || 0;
  const total = unitP * quantity;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find((c) => c.id === selectedCustomerId) || customers[0];
    if (!cust) {
      alert('Pilih pelanggan terlebih dahulu');
      return;
    }
    const paidAmt = parseFloat(paidAmountInput) || 0;
    if (paidAmt <= 0) {
      alert('Masukkan jumlah pembayaran DP atau pembayaran pertama yang valid');
      return;
    }

    const payments: PaymentComponent[] = [
      {
        method: paymentMethod,
        amount: paidAmt,
        change: paymentMethod === 'cash' ? Math.max(0, paidAmt - total) : 0,
        timestamp: new Date().toISOString(),
      }
    ];

    const res = createMtoOrder({
      productId: selectedProductId,
      quantity,
      customPrice: parseFloat(customPrice) || undefined,
      customer: cust,
      pickupDate,
      pickupTime,
      customizationNotes,
      payments,
    });

    if (res.success) {
      posSound.cashRegister();
      alert(res.message);
      onClose();
    } else {
      alert(res.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-xl rounded-3xl bg-white border-2 border-[#E5DACE] p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-[#E5DACE] pb-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎂</span>
            <h3 className="text-lg font-black text-[#2D241E]">Pembuatan PO Made-to-Order (MTO)</h3>
          </div>
          <button onClick={onClose} className="rounded-xl border border-[#E5DACE] px-3 py-1 text-xs font-bold text-[#8C7B6C] hover:text-[#2D241E]">
            ✕ Tutup
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#6B7280] mb-1">Pilih Produk Made-to-Order</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full rounded-xl border border-[#E5DACE] px-3 py-2.5 text-sm font-semibold bg-[#FDFBF7]"
            >
              {mtoProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({formatIDR(p.price)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#6B7280] mb-1">Jumlah (Qty)</label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full rounded-xl border border-[#E5DACE] px-3 py-2 text-sm font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#6B7280] mb-1">Harga Satuan (Rp)</label>
              <input
                type="number"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                className="w-full rounded-xl border border-[#E5DACE] px-3 py-2 text-sm font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#6B7280] mb-1">Pelanggan</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full rounded-xl border border-[#E5DACE] px-3 py-2 text-sm font-semibold bg-[#FDFBF7]"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone || 'Tanpa No. Telp'})
                </option>
              ))}
            </select>
          </div>

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

          <div>
            <label className="block text-xs font-bold text-[#6B7280] mb-1">Catatan Kustomisasi (Tulisan Kue, Tema, dll)</label>
            <textarea
              rows={3}
              value={customizationNotes}
              onChange={(e) => setCustomizationNotes(e.target.value)}
              placeholder="Contoh: Tulisan 'Happy Birthday Rina', warna tema pink pastel..."
              className="w-full rounded-xl border border-[#E5DACE] px-3 py-2 text-sm font-semibold"
            />
          </div>

          <div className="border-t border-[#E5DACE] pt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#6B7280] mb-1">Metode Pembayaran / DP</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full rounded-xl border border-[#E5DACE] px-3 py-2 text-sm font-semibold bg-[#FDFBF7]"
              >
                <option value="cash">Tunai (Cash)</option>
                <option value="qris">QRIS</option>
                <option value="transfer">Transfer Bank</option>
                <option value="deposit">Deposit Pelanggan</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#6B7280] mb-1">Nominal Dibayar (DP/Lunas)</label>
              <input
                type="number"
                value={paidAmountInput}
                onChange={(e) => setPaidAmountInput(e.target.value)}
                placeholder={`Total: ${formatIDR(total)}`}
                className="w-full rounded-xl border border-[#E5DACE] px-3 py-2 text-sm font-semibold"
              />
            </div>
          </div>

          <div className="flex items-center justify-between bg-[#F7F7F5] p-3 rounded-2xl text-sm font-bold">
            <span>Total PO: {formatIDR(total)}</span>
            <span className="text-amber-700">Sisa Piutang: {formatIDR(Math.max(0, total - (parseFloat(paidAmountInput) || 0)))}</span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#E5DACE] px-4 py-2 text-xs font-bold text-[#8C7B6C] hover:text-[#2D241E]"
            >
              Batal
            </button>
            <button
              type="submit"
              className="rounded-xl bg-[#D97706] px-5 py-2 text-xs font-black text-white hover:bg-amber-700 shadow-xs"
            >
              Buat PO Made-to-Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
