import React, { useState } from 'react';
import {
  Trash2,
  Plus,
  Minus,
  Percent,
  Tag,
  Clock,
  User,
  Check,
  AlertCircle,
  ShoppingBag,
  ReceiptText,
  CreditCard,
  Pencil,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { formatIDR, posSound } from '../utils/formatters';
import { CartItem } from '../types';
import { SupervisorPinModal } from './SupervisorPinModal';

interface OrderCartProps {
  onOpenCustomerModal: () => void;
  onOpenPaymentModal: () => void;
}

export const OrderCart: React.FC<OrderCartProps> = ({
  onOpenCustomerModal,
  onOpenPaymentModal,
}) => {
  const {
    cart,
    selectedCustomer,
    updateCartQty,
    removeFromCart,
    clearCart,
    overrideItemPrice,
    taxApplied,
    setTaxApplied,
    orderDiscountType,
    orderDiscountValue,
    orderDiscountReason,
    applyOrderDiscount,
    removeOrderDiscount,
    cartSubtotal,
    cartTaxAmount,
    cartDiscountAmount,
    cartTotal,
    holdCurrentOrder,
    currentSession,
  } = usePOS();

  // Price Override Modal state
  const [overrideLineId, setOverrideLineId] = useState<string | null>(null);
  const [overridePriceInput, setOverridePriceInput] = useState<string>('');
  const [overrideReasonInput, setOverrideReasonInput] = useState<string>('');

  // Order Discount Modal state
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [discountTypeInput, setDiscountTypeInput] = useState<'percent' | 'fixed'>('percent');
  const [discountValueInput, setDiscountValueInput] = useState<string>('10');
  const [discountReasonInput, setDiscountReasonInput] = useState<string>('Promo Toko');

  // Supervisor PIN modal state
  const [pinModalConfig, setPinModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onSuccess: (supervisorName: string) => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onSuccess: () => {},
  });

  const activeOverrideItem = cart.find((i) => i.id === overrideLineId);

  // Submit Price Override
  const handleConfirmPriceOverride = () => {
    if (!overrideLineId) return;
    const newPrice = parseInt(overridePriceInput || '0', 10);
    overrideItemPrice(overrideLineId, newPrice, overrideReasonInput || 'Kesepakatan Kasir');
    setOverrideLineId(null);
    setOverridePriceInput('');
    setOverrideReasonInput('');
  };

  // Submit Order Discount
  const handleApplyDiscount = () => {
    const val = parseFloat(discountValueInput || '0');
    if (val <= 0) return;

    // Threshold check: discounts > 20% or > Rp 50.000 require manager approval
    const exceedsThreshold =
      (discountTypeInput === 'percent' && val > 20) ||
      (discountTypeInput === 'fixed' && val > 50000);

    if (exceedsThreshold) {
      setPinModalConfig({
        isOpen: true,
        title: 'Otorisasi Diskon Khusus',
        description: `Diskon sebesar ${
          discountTypeInput === 'percent' ? val + '%' : formatIDR(val)
        } melebihi batas standar kasir. Masukkan PIN Supervisor:`,
        onSuccess: (supervisorName) => {
          applyOrderDiscount(discountTypeInput, val, discountReasonInput, supervisorName);
          setIsDiscountModalOpen(false);
        },
      });
    } else {
      applyOrderDiscount(discountTypeInput, val, discountReasonInput);
      setIsDiscountModalOpen(false);
    }
  };

  const handleHoldOrder = () => {
    if (cart.length === 0) return;
    const label = window.prompt('Beri label / nomor meja pesanan (opsional):', `Meja ${cart.length}`);
    holdCurrentOrder(label || undefined);
  };

  return (
    <div className="flex h-full flex-col bg-white overflow-hidden select-none">
      {/* Customer Header Bar (POS-US-001, POS-US-002) */}
      <div className="flex items-center justify-between border-b-2 border-[#E5DACE] bg-white px-5 py-4">
        <button
          onClick={onOpenCustomerModal}
          className="flex items-center gap-3 text-left group max-w-[240px] truncate"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#D97706] text-white shadow-xs">
            <User className="h-4 w-4" />
          </div>
          <div className="truncate">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#8C7B6C]">
              Pelanggan
            </span>
            <span className="block text-sm font-bold text-[#2D241E] truncate group-hover:text-[#D97706]">
              {selectedCustomer.name}
            </span>
          </div>
        </button>

        <div className="flex items-center gap-2">
          <span className="bg-[#E5DACE] text-[11px] font-bold px-2.5 py-1 rounded-lg text-[#2D241E]">
            {cart.reduce((s, i) => s + i.quantity, 0)} ITEM
          </span>
          <button
            onClick={onOpenCustomerModal}
            className="rounded-xl border-2 border-[#E5DACE] bg-[#FDFBF7] px-2.5 py-1 text-xs font-bold text-[#2D241E] hover:border-[#D97706] active:scale-95 transition"
          >
            Ubah
          </button>
        </div>
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {cart.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-6 text-[#8C7B6C]">
            <ShoppingBag className="h-14 w-14 mb-3 stroke-[1.3] text-[#E5DACE]" />
            <p className="font-bold text-[#2D241E] text-base">Keranjang Kosong</p>
            <p className="text-xs text-[#8C7B6C] max-w-xs mt-1">
              Sentuh menu roti atau pastry di sebelah kiri untuk menambahkan pesanan ke nota.
            </p>
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={item.id}
              className="flex flex-col rounded-2xl border-2 border-[#E5DACE] bg-white p-3.5 shadow-2xs hover:border-[#D97706] transition"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <h5 className="text-sm font-bold text-[#2D241E] leading-snug">
                      {item.productName}
                    </h5>
                    {item.isMadeToOrder && (
                      <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold text-rose-800">
                        PO
                      </span>
                    )}
                  </div>

                  {/* Price & Overridden status */}
                  <div className="flex items-center gap-2 mt-0.5 text-xs">
                    <span className="font-bold text-[#D97706]">
                      {formatIDR(item.unitPrice)}
                    </span>
                    {item.isPriceOverridden && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold text-amber-900">
                        Nego (Asli: {formatIDR(item.originalPrice)})
                      </span>
                    )}
                  </div>
                </div>

                {/* Line Total */}
                <span className="text-sm font-bold text-[#2D241E]">
                  {formatIDR(item.unitPrice * item.quantity)}
                </span>
              </div>

              {/* Touch Controls for Quantity & Price Override */}
              <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-[#E5DACE]/60">
                <div className="flex items-center gap-1">
                  {/* Price Override button (POS-US-009) */}
                  <button
                    type="button"
                    onClick={() => {
                      setOverrideLineId(item.id);
                      setOverridePriceInput(String(item.unitPrice));
                    }}
                    title="Ubah / Override Harga Item Ini"
                    className="flex items-center gap-1 rounded-xl bg-[#FDFBF7] border border-[#E5DACE] px-2 py-1.5 text-[11px] font-bold text-[#2D241E] hover:border-[#D97706]"
                  >
                    <Pencil className="h-3 w-3 text-[#8C7B6C]" />
                    <span>Ubah</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => removeFromCart(item.id)}
                    className="p-1.5 rounded-xl text-[#8C7B6C] hover:bg-rose-50 hover:text-rose-600"
                    title="Hapus Item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* BENTO TOUCH QUANTITY BUTTONS */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateCartQty(item.id, item.quantity - 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FDFBF7] border border-[#E5DACE] text-[#2D241E] font-bold hover:bg-[#E5DACE] active:scale-90"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>

                  <span className="w-7 text-center text-sm font-bold text-[#2D241E]">
                    {item.quantity}
                  </span>

                  <button
                    type="button"
                    onClick={() => updateCartQty(item.id, item.quantity + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#D97706] text-white font-bold hover:brightness-95 active:scale-90 shadow-2xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cart Actions Toolbar */}
      {cart.length > 0 && (
        <div className="border-t-2 border-[#E5DACE] bg-[#FDFBF7] p-3">
          <div className="grid grid-cols-4 gap-2">
            {/* Parkir Pesanan (POS-US-012) */}
            <button
              onClick={handleHoldOrder}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-[#E5DACE] bg-white py-2 text-center text-[11px] font-bold text-[#2D241E] hover:border-[#D97706] active:scale-95 transition"
            >
              <Clock className="h-4 w-4 mb-0.5 text-[#D97706]" />
              <span>Parkir</span>
            </button>

            {/* Diskon Nota (POS-US-011) */}
            <button
              onClick={() => setIsDiscountModalOpen(true)}
              className={`flex flex-col items-center justify-center rounded-2xl border-2 py-2 text-center text-[11px] font-bold transition active:scale-95 ${
                orderDiscountValue > 0
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                  : 'border-[#E5DACE] bg-white text-[#2D241E] hover:border-[#D97706]'
              }`}
            >
              <Percent className="h-4 w-4 mb-0.5 text-[#059669]" />
              <span>{orderDiscountValue > 0 ? 'Diskon' : 'Diskon'}</span>
            </button>

            {/* PPN 11% Toggle (POS-US-010) */}
            <button
              onClick={() => {
                setTaxApplied(!taxApplied);
                posSound.beep();
              }}
              className={`flex flex-col items-center justify-center rounded-2xl border-2 py-2 text-center text-[11px] font-bold transition active:scale-95 ${
                taxApplied
                  ? 'border-blue-500 bg-blue-50 text-blue-800'
                  : 'border-[#E5DACE] bg-white text-[#8C7B6C] hover:border-[#D97706]'
              }`}
            >
              <Tag className={`h-4 w-4 mb-0.5 ${taxApplied ? 'text-blue-600' : 'text-[#8C7B6C]'}`} />
              <span>PPN 11% {taxApplied ? '✓' : ''}</span>
            </button>

            {/* Clear Cart */}
            <button
              onClick={() => {
                if (window.confirm('Kosongkan semua item di keranjang ini?')) {
                  clearCart();
                }
              }}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-[#E5DACE] bg-white py-2 text-center text-[11px] font-bold text-rose-600 hover:border-rose-300 hover:bg-rose-50 active:scale-95 transition"
            >
              <Trash2 className="h-4 w-4 mb-0.5 text-rose-500" />
              <span>Batal</span>
            </button>
          </div>
        </div>
      )}

      {/* Totals & Grand Checkout Area - Bento Style */}
      <div className="p-5 sm:p-6 bg-[#FDFBF7] border-t-2 border-[#E5DACE] flex flex-col gap-4">
        {/* Breakdown Summary */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm text-[#8C7B6C]">
            <span>Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} item)</span>
            <span className="font-bold text-[#2D241E]">{formatIDR(cartSubtotal)}</span>
          </div>

          {cartDiscountAmount > 0 && (
            <div className="flex justify-between text-sm text-rose-600 font-bold">
              <span className="flex items-center gap-1">
                <span>Diskon ({orderDiscountReason || 'Nota'})</span>
                <button
                  onClick={removeOrderDiscount}
                  className="text-[10px] text-rose-500 underline ml-1"
                >
                  hapus
                </button>
              </span>
              <span>-{formatIDR(cartDiscountAmount)}</span>
            </div>
          )}

          {taxApplied && (
            <div className="flex justify-between text-sm text-[#8C7B6C]">
              <span>PPN (11%)</span>
              <span className="font-bold text-[#2D241E]">{formatIDR(cartTaxAmount)}</span>
            </div>
          )}

          <div className="flex justify-between text-2xl font-black mt-2 text-[#2D241E]">
            <span>Total</span>
            <span>{formatIDR(cartTotal)}</span>
          </div>
        </div>

        {/* BENTO CHARGE BUTTON */}
        <button
          onClick={onOpenPaymentModal}
          disabled={cart.length === 0}
          className="bg-[#059669] text-white w-full py-4 sm:py-5 rounded-2xl font-black text-xl sm:text-2xl shadow-md hover:brightness-95 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed uppercase"
        >
          CHARGE {formatIDR(cartTotal)}
        </button>
      </div>

      {/* MODAL 1: PRICE OVERRIDE (POS-US-009) */}
      {overrideLineId && activeOverrideItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border-2 border-[#E5DACE] bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#2D241E]">
              Override Harga: {activeOverrideItem.productName}
            </h3>
            <p className="text-xs text-[#8C7B6C]">
              Harga master katalog: <strong className="text-[#2D241E]">{formatIDR(activeOverrideItem.originalPrice)}</strong>. Perubahan harga hanya berlaku untuk nota ini.
            </p>

            <div>
              <label className="block text-xs font-bold text-[#2D241E] mb-1">
                Harga Baru per Satuan (Rp) *
              </label>
              <input
                type="number"
                value={overridePriceInput}
                onChange={(e) => setOverridePriceInput(e.target.value)}
                className="w-full rounded-2xl border-2 border-[#E5DACE] p-3 text-lg font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2D241E] mb-1">
                Alasan Perubahan Harga
              </label>
              <input
                type="text"
                value={overrideReasonInput}
                onChange={(e) => setOverrideReasonInput(e.target.value)}
                placeholder="Misal: Nego borongan / dekat expired"
                className="w-full rounded-2xl border-2 border-[#E5DACE] p-2.5 text-sm focus:border-[#D97706] focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOverrideLineId(null)}
                className="flex-1 rounded-2xl border-2 border-[#E5DACE] py-2.5 text-sm font-bold text-[#8C7B6C] hover:text-[#2D241E]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmPriceOverride}
                className="flex-1 rounded-2xl bg-[#D97706] py-2.5 text-sm font-bold text-white shadow-sm hover:brightness-95 active:scale-95"
              >
                Terapkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ORDER DISCOUNT (POS-US-011) */}
      {isDiscountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border-2 border-[#E5DACE] bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#2D241E]">
              Terapkan Diskon Nota
            </h3>

            {/* Percent or Fixed Switch */}
            <div className="grid grid-cols-2 gap-2 bg-[#FDFBF7] border border-[#E5DACE] p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setDiscountTypeInput('percent')}
                className={`py-2 rounded-xl text-xs font-bold transition ${
                  discountTypeInput === 'percent'
                    ? 'bg-white text-[#2D241E] shadow-sm border border-[#E5DACE]'
                    : 'text-[#8C7B6C]'
                }`}
              >
                Persentase (%)
              </button>
              <button
                type="button"
                onClick={() => setDiscountTypeInput('fixed')}
                className={`py-2 rounded-xl text-xs font-bold transition ${
                  discountTypeInput === 'fixed'
                    ? 'bg-white text-[#2D241E] shadow-sm border border-[#E5DACE]'
                    : 'text-[#8C7B6C]'
                }`}
              >
                Nominal Tetap (Rp)
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2D241E] mb-1">
                Besaran Diskon {discountTypeInput === 'percent' ? '(%)' : '(Rp)'} *
              </label>
              <input
                type="number"
                value={discountValueInput}
                onChange={(e) => setDiscountValueInput(e.target.value)}
                className="w-full rounded-2xl border-2 border-[#E5DACE] p-3 text-xl font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
              />
            </div>

            {/* Predefined Reasons */}
            <div>
              <label className="block text-xs font-bold text-[#2D241E] mb-1">
                Alasan Diskon
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {['Promo Member', 'Promo Grand Opening', 'Karyawan Toko', 'Roti Kemarin (Disc)'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setDiscountReasonInput(r)}
                    className="rounded-xl border border-[#E5DACE] bg-[#FDFBF7] px-2.5 py-1 text-[11px] font-medium text-[#2D241E] hover:border-[#D97706]"
                  >
                    {r}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={discountReasonInput}
                onChange={(e) => setDiscountReasonInput(e.target.value)}
                placeholder="Atau tulis alasan manual..."
                className="w-full rounded-2xl border-2 border-[#E5DACE] p-2 text-xs focus:border-[#D97706] focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDiscountModalOpen(false)}
                className="flex-1 rounded-2xl border-2 border-[#E5DACE] py-2.5 text-sm font-bold text-[#8C7B6C] hover:text-[#2D241E]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApplyDiscount}
                className="flex-1 rounded-2xl bg-[#059669] py-2.5 text-sm font-bold text-white shadow-sm hover:brightness-95 active:scale-95"
              >
                Terapkan Diskon
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reusable Supervisor PIN Modal */}
      <SupervisorPinModal
        isOpen={pinModalConfig.isOpen}
        onClose={() => setPinModalConfig((p) => ({ ...p, isOpen: false }))}
        title={pinModalConfig.title}
        description={pinModalConfig.description}
        onSuccess={pinModalConfig.onSuccess}
      />
    </div>
  );
};
