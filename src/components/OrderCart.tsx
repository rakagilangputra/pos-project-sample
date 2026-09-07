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

  const hasMto = cart.some((i) => i.isMadeToOrder);
  const isWalkIn =
    selectedCustomer.id === 'cust-walkin' ||
    selectedCustomer.id === 'walk-in' ||
    selectedCustomer.category === 'Walk-in' ||
    selectedCustomer.name.toLowerCase().includes('walk-in') ||
    selectedCustomer.name.toLowerCase().includes('umum');

  return (
    <div className="flex h-full flex-col bg-white overflow-hidden select-none">
      {/* Customer Header Bar (POS-US-038) - Static */}
      <div className="flex items-center justify-between border-b border-[#E5E7EB] bg-white px-4 py-3 shrink-0">
        <button
          onClick={onOpenCustomerModal}
          className="flex items-center gap-2.5 text-left group max-w-[220px] truncate"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#D97706] text-white shadow-xs">
            <User className="h-4 w-4" />
          </div>
          <div className="truncate">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">
              Pelanggan
            </span>
            <span className="block text-xs sm:text-sm font-bold text-[#1F2937] truncate group-hover:text-[#D97706]">
              {selectedCustomer.name}
            </span>
          </div>
        </button>

        <div className="flex items-center gap-1.5">
          <span className="bg-[#F7F7F5] border border-[#E5E7EB] text-[10px] font-semibold px-2 py-0.5 rounded-md text-[#6B7280]">
            {cart.reduce((s, i) => s + i.quantity, 0)} item
          </span>
          <button
            onClick={onOpenCustomerModal}
            className="rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1 text-xs font-semibold text-[#1F2937] hover:border-[#D97706] hover:bg-[#F7F7F5] active:scale-95 transition"
          >
            Ubah
          </button>
        </div>
      </div>

      {/* MTO Named Customer Required Alert */}
      {hasMto && isWalkIn && (
        <div className="mx-3 mt-2 shrink-0 rounded-xl bg-amber-50 border border-amber-300 p-2.5 flex items-start gap-2.5 text-amber-950 shadow-xs">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
          <div className="text-xs flex-1">
            <p className="font-bold text-amber-900 leading-tight">MTO Wajib Pelanggan Bernama</p>
            <p className="text-[11px] text-amber-800 mt-0.5 leading-normal">
              Pelanggan Umum (Walk-in) tidak dapat digunakan untuk pesanan Made-to-Order.
            </p>
            <button
              type="button"
              onClick={onOpenCustomerModal}
              className="mt-2 inline-flex items-center gap-1 rounded-lg bg-[#D97706] px-2.5 py-1 text-xs font-bold text-white shadow-xs hover:bg-amber-700 active:scale-95 transition"
            >
              <User className="h-3 w-3" />
              <span>Pilih / Tambah Pelanggan</span>
            </button>
          </div>
        </div>
      )}

      {/* Cart Items List (POS-US-038) - Scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2 scrollbar-thin">
        {cart.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-6 text-[#6B7280]">
            <ShoppingBag className="h-10 w-10 mb-2 stroke-[1.4] text-[#E5E7EB]" />
            <p className="font-semibold text-[#1F2937] text-sm">Nota Masih Kosong</p>
            <p className="text-xs text-[#6B7280] max-w-xs mt-0.5">
              Pilih menu dari katalog untuk memasukkan pesanan ke kasir.
            </p>
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={item.id}
              className="flex flex-col rounded-xl border border-[#E5E7EB] bg-white p-2.5 hover:border-[#D97706] transition"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <h5 className="text-xs sm:text-sm font-bold text-[#1F2937] leading-snug">
                      {item.productName}
                    </h5>
                    {item.isMadeToOrder && (
                      <span className="rounded bg-rose-50 border border-rose-200 px-1 text-[9px] font-semibold text-rose-700">
                        PO
                      </span>
                    )}
                  </div>

                  {/* Price & Overridden status */}
                  <div className="flex items-center gap-1.5 mt-0.5 text-xs">
                    <span className="font-semibold text-[#D97706]">
                      {formatIDR(item.unitPrice)}
                    </span>
                    {item.isPriceOverridden && (
                      <span className="rounded bg-amber-50 border border-amber-200 px-1 text-[9px] font-medium text-amber-800">
                        Nego (Asli: {formatIDR(item.originalPrice)})
                      </span>
                    )}
                  </div>
                </div>

                {/* Line Total */}
                <span className="text-xs sm:text-sm font-bold text-[#1F2937]">
                  {formatIDR(item.unitPrice * item.quantity)}
                </span>
              </div>

              {/* Contextual Controls: Price Override, Delete, Quantity [-] [+] */}
              <div className="mt-2 flex items-center justify-between pt-1.5 border-t border-[#E5E7EB]">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setOverrideLineId(item.id);
                      setOverridePriceInput(String(item.unitPrice));
                    }}
                    title="Ubah Harga Item Ini"
                    className="flex items-center gap-1 rounded-md border border-[#E5E7EB] bg-white px-2 py-1 text-[10px] font-semibold text-[#6B7280] hover:text-[#1F2937] hover:border-[#D97706]"
                  >
                    <Pencil className="h-2.5 w-2.5" />
                    <span>Ubah</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => removeFromCart(item.id)}
                    className="p-1 rounded-md text-[#6B7280] hover:bg-rose-50 hover:text-rose-600"
                    title="Hapus Item"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateCartQty(item.id, item.quantity - 1)}
                    className="flex h-6 w-6 items-center justify-center rounded-md border border-[#E5E7EB] bg-white text-[#1F2937] font-semibold hover:bg-[#F7F7F5] active:scale-95 transition"
                  >
                    <Minus className="h-3 w-3" />
                  </button>

                  <span className="w-6 text-center text-xs font-bold text-[#1F2937]">
                    {item.quantity}
                  </span>

                  <button
                    type="button"
                    onClick={() => updateCartQty(item.id, item.quantity + 1)}
                    className="flex h-6 w-6 items-center justify-center rounded-md bg-[#D97706] text-white font-semibold hover:bg-amber-700 active:scale-95 transition"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cart Actions Toolbar (POS-US-038) - Static */}
      {cart.length > 0 && (
        <div className="shrink-0 border-t border-[#E5E7EB] bg-[#F7F7F5] p-3 space-y-2">
          {/* Prominent Secondary Order Action: Parkir Pesanan */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleHoldOrder}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-white py-2 text-xs font-semibold text-[#1F2937] hover:border-[#D97706] hover:bg-amber-50/50 active:scale-95 transition"
            >
              <Clock className="h-4 w-4 text-[#D97706]" />
              <span>Parkir Pesanan</span>
            </button>
          </div>

          {/* Secondary Actions: Diskon, PPN, Batal */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            {/* Diskon Nota */}
            <button
              onClick={() => setIsDiscountModalOpen(true)}
              className={`flex items-center justify-center gap-1.5 rounded-lg border py-1.5 text-xs font-medium transition active:scale-95 ${
                orderDiscountValue > 0
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                  : 'border-[#E5E7EB] bg-white text-[#6B7280] hover:text-[#1F2937]'
              }`}
            >
              <Percent className="h-3.5 w-3.5 text-[#059669]" />
              <span>{orderDiscountValue > 0 ? 'Diskon Aktif' : 'Diskon'}</span>
            </button>

            {/* PPN 11% Toggle */}
            <button
              onClick={() => {
                setTaxApplied(!taxApplied);
                posSound.beep();
              }}
              className={`flex items-center justify-center gap-1.5 rounded-lg border py-1.5 text-xs font-medium transition active:scale-95 ${
                taxApplied
                  ? 'border-blue-500 bg-blue-50 text-blue-800'
                  : 'border-[#E5E7EB] bg-white text-[#6B7280] hover:text-[#1F2937]'
              }`}
            >
              <Tag className={`h-3.5 w-3.5 ${taxApplied ? 'text-blue-600' : 'text-[#6B7280]'}`} />
              <span>PPN 11% {taxApplied ? '✓' : ''}</span>
            </button>

            {/* Clear Cart */}
            <button
              type="button"
              onClick={() => {
                clearCart();
              }}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 active:scale-95 transition"
            >
              <Trash2 className="h-3.5 w-3.5 text-rose-500" />
              <span>Kosongkan</span>
            </button>
          </div>
        </div>
      )}

      {/* Totals & Grand Checkout Area (POS-US-038) - Static */}
      <div className="shrink-0 p-4 sm:p-5 bg-white border-t border-[#E5E7EB] flex flex-col gap-3">
        {/* Breakdown Summary */}
        <div className="space-y-1 text-xs">
          <div className="flex justify-between text-[#6B7280]">
            <span>Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} item)</span>
            <span className="font-semibold text-[#1F2937]">{formatIDR(cartSubtotal)}</span>
          </div>

          {cartDiscountAmount > 0 && (
            <div className="flex justify-between text-rose-600 font-semibold">
              <span className="flex items-center gap-1">
                <span>Diskon ({orderDiscountReason || 'Nota'})</span>
                <button
                  onClick={removeOrderDiscount}
                  className="text-[10px] text-rose-500 underline ml-1"
                >
                  Hapus
                </button>
              </span>
              <span>-{formatIDR(cartDiscountAmount)}</span>
            </div>
          )}

          {taxApplied && (
            <div className="flex justify-between text-[#6B7280]">
              <span>PPN (11%)</span>
              <span className="font-semibold text-[#1F2937]">{formatIDR(cartTaxAmount)}</span>
            </div>
          )}

          <div className="flex justify-between text-lg sm:text-xl font-bold pt-2 border-t border-[#E5E7EB] text-[#1F2937]">
            <span>Total</span>
            <span className="text-[#D97706]">{formatIDR(cartTotal)}</span>
          </div>
        </div>

        {/* ONE DOMINANT PRIMARY ACTION: BAYAR */}
        <button
          id="cart-pay-grand-btn"
          onClick={() => {
            if (hasMto && isWalkIn) {
              posSound.error();
              onOpenCustomerModal();
              return;
            }
            onOpenPaymentModal();
          }}
          disabled={cart.length === 0}
          className={`w-full py-3.5 sm:py-4 rounded-xl font-bold text-sm sm:text-base shadow-sm active:scale-[0.99] transition disabled:opacity-40 disabled:cursor-not-allowed uppercase flex items-center justify-center gap-2 ${
            hasMto && isWalkIn
              ? 'bg-amber-600 hover:bg-amber-700 text-white'
              : 'bg-[#D97706] hover:bg-amber-700 text-white'
          }`}
        >
          {hasMto && isWalkIn ? (
            <>
              <User className="h-5 w-5" />
              <span>Wajib Pilih Pelanggan (MTO)</span>
            </>
          ) : (
            <>
              <CreditCard className="h-5 w-5" />
              <span>{hasMto ? `Buat PO MTO (${formatIDR(cartTotal)})` : `Bayar ${formatIDR(cartTotal)}`}</span>
            </>
          )}
        </button>
      </div>

      {/* MODAL 1: PRICE OVERRIDE (POS-US-040 standard bottom-right Close) */}
      {overrideLineId && activeOverrideItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-[#1F2937]">
              Ubah Harga: {activeOverrideItem.productName}
            </h3>
            <p className="text-xs text-[#6B7280]">
              Harga master: <strong className="text-[#1F2937]">{formatIDR(activeOverrideItem.originalPrice)}</strong>. Perubahan hanya berlaku pada nota aktif ini.
            </p>

            <div>
              <label className="block text-xs font-semibold text-[#1F2937] mb-1">
                Harga Baru per Satuan (Rp) *
              </label>
              <input
                type="number"
                value={overridePriceInput}
                onChange={(e) => setOverridePriceInput(e.target.value)}
                className="w-full rounded-xl border border-[#E5E7EB] p-2.5 text-base font-bold text-[#1F2937] focus:border-[#D97706] focus:outline-none"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1F2937] mb-1">
                Alasan Perubahan Harga
              </label>
              <input
                type="text"
                value={overrideReasonInput}
                onChange={(e) => setOverrideReasonInput(e.target.value)}
                placeholder="Contoh: Kesepakatan borongan / diskon fisik"
                className="w-full rounded-xl border border-[#E5E7EB] p-2 text-xs focus:border-[#D97706] focus:outline-none"
              />
            </div>

            {/* Footer with primary before Close, Close at bottom right (POS-US-040) */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={handleConfirmPriceOverride}
                className="rounded-xl bg-[#D97706] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-700 active:scale-95"
              >
                Terapkan Perubahan
              </button>
              <button
                type="button"
                onClick={() => setOverrideLineId(null)}
                className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-xs font-semibold text-[#6B7280] hover:text-[#1F2937] hover:bg-[#F7F7F5]"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ORDER DISCOUNT (POS-US-040 standard bottom-right Close) */}
      {isDiscountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-[#1F2937]">
              Terapkan Diskon Nota
            </h3>

            {/* Percent or Fixed Switch */}
            <div className="grid grid-cols-2 gap-1.5 bg-[#F7F7F5] border border-[#E5E7EB] p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setDiscountTypeInput('percent')}
                className={`py-1.5 rounded-lg text-xs font-semibold transition ${
                  discountTypeInput === 'percent'
                    ? 'bg-white text-[#1F2937] shadow-xs border border-[#E5E7EB]'
                    : 'text-[#6B7280]'
                }`}
              >
                Persentase (%)
              </button>
              <button
                type="button"
                onClick={() => setDiscountTypeInput('fixed')}
                className={`py-1.5 rounded-lg text-xs font-semibold transition ${
                  discountTypeInput === 'fixed'
                    ? 'bg-white text-[#1F2937] shadow-xs border border-[#E5E7EB]'
                    : 'text-[#6B7280]'
                }`}
              >
                Nominal (Rp)
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1F2937] mb-1">
                Besaran Diskon {discountTypeInput === 'percent' ? '(%)' : '(Rp)'} *
              </label>
              <input
                type="number"
                value={discountValueInput}
                onChange={(e) => setDiscountValueInput(e.target.value)}
                className="w-full rounded-xl border border-[#E5E7EB] p-2.5 text-lg font-bold text-[#1F2937] focus:border-[#D97706] focus:outline-none"
              />
            </div>

            {/* Predefined Reasons */}
            <div>
              <label className="block text-xs font-semibold text-[#1F2937] mb-1">
                Alasan Diskon
              </label>
              <div className="flex flex-wrap gap-1 mb-2">
                {['Promo Member', 'Promo Pembukaan', 'Karyawan', 'Diskon Khusus'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setDiscountReasonInput(r)}
                    className="rounded-lg border border-[#E5E7EB] bg-[#F7F7F5] px-2 py-1 text-[11px] font-medium text-[#1F2937] hover:border-[#D97706]"
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
                className="w-full rounded-xl border border-[#E5E7EB] p-2 text-xs focus:border-[#D97706] focus:outline-none"
              />
            </div>

            {/* Footer with primary before Close, Close at bottom right (POS-US-040) */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={handleApplyDiscount}
                className="rounded-xl bg-[#059669] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 active:scale-95"
              >
                Terapkan Diskon
              </button>
              <button
                type="button"
                onClick={() => setIsDiscountModalOpen(false)}
                className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-xs font-semibold text-[#6B7280] hover:text-[#1F2937] hover:bg-[#F7F7F5]"
              >
                Tutup
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
