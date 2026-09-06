import React, { useState, useMemo } from 'react';
import {
  Banknote,
  QrCode,
  Wallet,
  Split,
  CalendarCheck,
  CheckCircle2,
  X,
  AlertCircle,
  Delete,
  Calendar,
  Clock,
  ClipboardList,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { formatIDR, posSound } from '../utils/formatters';
import { PaymentComponent } from '../types';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose }) => {
  const {
    cart,
    cartTotal,
    selectedCustomer,
    completeOrder,
  } = usePOS();

  const hasMadeToOrder = useMemo(() => cart.some((i) => i.isMadeToOrder), [cart]);

  // Is walk-in customer check
  const isWalkIn =
    selectedCustomer.id === 'cust-walkin' ||
    selectedCustomer.id === 'walk-in' ||
    selectedCustomer.category === 'Walk-in' ||
    selectedCustomer.name.toLowerCase().includes('walk-in') ||
    selectedCustomer.name.toLowerCase().includes('umum');

  // MTO Configuration State
  const [mtoPaymentMode, setMtoPaymentMode] = useState<'dp' | 'full'>('dp');
  const [mtoDpInput, setMtoDpInput] = useState<string>(() => String(Math.round(cartTotal * 0.5)));
  const mtoDpAmount = parseInt(mtoDpInput || '0', 10);

  // Tomorrow date YYYY-MM-DD
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  const [pickupDate, setPickupDate] = useState<string>(tomorrowStr);
  const [pickupTime, setPickupTime] = useState<string>('14:00');
  const [customizationNotes, setCustomizationNotes] = useState<string>(
    'Tulisan ucapan di kue: "Happy Birthday"\nLilin angka: 1 buah\nPengambilan: Besok jam 14:00 WIB'
  );

  // Payment Method Tabs
  const [paymentTab, setPaymentTab] = useState<'cash' | 'qris' | 'deposit' | 'split'>('cash');

  // Amount that needs to be paid right now
  const amountToPay = hasMadeToOrder && mtoPaymentMode === 'dp' ? mtoDpAmount : cartTotal;
  const remainingBalance = Math.max(0, cartTotal - amountToPay);

  // Cash Tendered
  const [tenderedInput, setTenderedInput] = useState<string>('');
  const tenderedAmount = parseInt(tenderedInput || '0', 10);
  const effectiveCashTendered = tenderedAmount > 0 ? tenderedAmount : amountToPay;
  const cashChange = Math.max(0, effectiveCashTendered - amountToPay);

  // Split Payment state
  const [splitCashInput, setSplitCashInput] = useState<string>('');
  const splitCash = parseInt(splitCashInput || '0', 10);
  const splitRemaining = Math.max(0, amountToPay - splitCash);

  // QRIS state
  const [isQrisProcessing, setIsQrisProcessing] = useState(false);

  if (!isOpen) return null;

  // Quick cash chips
  const quickCashOptions = [
    { label: 'UANG PAS', value: amountToPay },
    { label: 'Rp 50.000', value: 50000 },
    { label: 'Rp 100.000', value: 100000 },
    { label: 'Rp 200.000', value: 200000 },
    { label: 'Rp 500.000', value: 500000 },
  ].filter((opt) => opt.value >= amountToPay || opt.label === 'UANG PAS');

  const handleNumpadDigit = (digit: string) => {
    posSound.beep();
    if (paymentTab === 'cash') {
      setTenderedInput((prev) => (prev === '0' ? digit : prev + digit));
    } else if (paymentTab === 'split') {
      setSplitCashInput((prev) => (prev === '0' ? digit : prev + digit));
    }
  };

  const handleNumpadDelete = () => {
    posSound.beep();
    if (paymentTab === 'cash') {
      setTenderedInput((prev) => prev.slice(0, -1));
    } else if (paymentTab === 'split') {
      setSplitCashInput((prev) => prev.slice(0, -1));
    }
  };

  const handleNumpadClear = () => {
    if (paymentTab === 'cash') setTenderedInput('');
    else if (paymentTab === 'split') setSplitCashInput('');
  };

  // Submit Payment
  const handleFinalizePayment = () => {
    // Validate MTO requirements
    if (hasMadeToOrder) {
      if (isWalkIn) {
        posSound.error();
        alert('Pelanggan Umum (Walk-in) tidak dapat digunakan untuk pesanan Made-to-Order! Silakan pilih atau tambahkan pelanggan bernama di keranjang kasir.');
        return;
      }
      if (!pickupDate) {
        posSound.error();
        alert('Tanggal pengambilan pesanan (PO) wajib diisi!');
        return;
      }
      if (!pickupTime) {
        posSound.error();
        alert('Jam pengambilan pesanan (PO) wajib diisi!');
        return;
      }
      if (mtoPaymentMode === 'dp' && (mtoDpAmount <= 0 || mtoDpAmount >= cartTotal)) {
        posSound.error();
        alert('Nominal DP harus lebih dari Rp 0 dan kurang dari total tagihan!');
        return;
      }
    }

    const payments: PaymentComponent[] = [];
    const timestamp = new Date().toISOString();

    if (paymentTab === 'cash') {
      if (tenderedAmount > 0 && tenderedAmount < amountToPay) {
        posSound.error();
        alert('Nominal uang tunai yang diterima belum mencukupi!');
        return;
      }
      payments.push({
        method: 'cash',
        amount: amountToPay,
        tenderedCash: effectiveCashTendered,
        change: cashChange,
        timestamp,
      });
    } else if (paymentTab === 'qris') {
      payments.push({
        method: 'qris',
        amount: amountToPay,
        reference: 'QRIS-' + Date.now().toString().slice(-6),
        timestamp,
      });
    } else if (paymentTab === 'deposit') {
      if (selectedCustomer.depositBalance < amountToPay) {
        posSound.error();
        alert(`Saldo deposit pelanggan (${formatIDR(selectedCustomer.depositBalance)}) tidak mencukupi untuk pembayaran ${formatIDR(amountToPay)}!`);
        return;
      }
      payments.push({
        method: 'deposit',
        amount: amountToPay,
        reference: `DEPOSIT-${selectedCustomer.id}`,
        timestamp,
      });
    } else if (paymentTab === 'split') {
      if (splitCash <= 0 || splitRemaining <= 0) {
        posSound.error();
        alert('Silakan masukkan porsi tunai yang valid untuk split payment!');
        return;
      }
      payments.push({
        method: 'cash',
        amount: splitCash,
        tenderedCash: splitCash,
        change: 0,
        timestamp,
      });
      payments.push({
        method: 'qris',
        amount: splitRemaining,
        reference: 'SPLIT-QRIS-' + Date.now().toString().slice(-4),
        timestamp,
      });
    }

    const isDeposit = hasMadeToOrder && mtoPaymentMode === 'dp';

    completeOrder(payments, {
      isDeposit,
      customizationNotes: hasMadeToOrder ? customizationNotes : undefined,
      pickupDate: hasMadeToOrder ? pickupDate : undefined,
      pickupTime: hasMadeToOrder ? pickupTime : undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs select-none">
      <div className="flex h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-2xl">
        {/* Top Header Banner */}
        <div className="flex items-center justify-between border-b border-[#E5E7EB] bg-[#F7F7F5] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D97706] text-white shadow-xs">
              {hasMadeToOrder ? <ClipboardList className="h-5 w-5" /> : <Banknote className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1F2937]">
                {hasMadeToOrder ? 'Pembuatan PO Made-to-Order' : 'Pembayaran Kasir'}
              </h2>
              <p className="text-xs text-[#6B7280]">
                Pelanggan: <strong className="text-[#1F2937]">{selectedCustomer.name}</strong> ({cart.length} jenis item)
              </p>
            </div>
          </div>

          {/* Grand Total Display */}
          <div className="text-right">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
              {hasMadeToOrder && mtoPaymentMode === 'dp' ? 'Nominal DP Dibayar' : 'Total Tagihan'}
            </span>
            <span className="text-2xl sm:text-3xl font-black text-[#D97706] tracking-tight">
              {formatIDR(amountToPay)}
            </span>
            {hasMadeToOrder && mtoPaymentMode === 'dp' && (
              <span className="block text-[11px] text-[#6B7280]">
                Total PO: {formatIDR(cartTotal)} (Sisa: {formatIDR(remainingBalance)})
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-[#6B7280] hover:bg-[#E5E7EB] hover:text-[#1F2937]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* MTO Validation Warning if Walk-in */}
        {hasMadeToOrder && isWalkIn && (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-2.5 flex items-center gap-2 text-xs text-rose-900 font-semibold">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>
              Perhatian: Pelanggan Umum (Walk-in) tidak dapat digunakan untuk pesanan PO Made-to-Order. Harap pilih pelanggan terdaftar di keranjang.
            </span>
          </div>
        )}

        {/* Middle Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* MTO Setup Panel */}
          {hasMadeToOrder && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50/50 p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-amber-200/80 pb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                  <CalendarCheck className="h-4 w-4 text-[#D97706]" />
                  Informasi PO & Jadwal Pengambilan (Wajib)
                </span>
                <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                  Made-to-Order
                </span>
              </div>

              {/* Pickup Date and Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-amber-950 mb-1">
                    Tanggal Pengambilan *
                  </label>
                  <div className="flex items-center rounded-xl border border-amber-300 bg-white px-3 py-2">
                    <Calendar className="h-4 w-4 text-[#D97706] mr-2" />
                    <input
                      type="date"
                      value={pickupDate}
                      onChange={(e) => setPickupDate(e.target.value)}
                      className="w-full text-xs font-bold text-[#1F2937] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-950 mb-1">
                    Jam Pengambilan (WIB) *
                  </label>
                  <div className="flex items-center rounded-xl border border-amber-300 bg-white px-3 py-2">
                    <Clock className="h-4 w-4 text-[#D97706] mr-2" />
                    <input
                      type="time"
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                      className="w-full text-xs font-bold text-[#1F2937] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Customization Notes */}
              <div>
                <label className="block text-xs font-bold text-amber-950 mb-1">
                  Catatan Kustomisasi Kue / Permintaan Khusus
                </label>
                <textarea
                  rows={2}
                  value={customizationNotes}
                  onChange={(e) => setCustomizationNotes(e.target.value)}
                  placeholder="Misal: Tulisan ucapan, lilin angka, ornamen warna..."
                  className="w-full rounded-xl border border-amber-300 bg-white p-2.5 text-xs text-[#1F2937] focus:outline-none"
                />
              </div>

              {/* Payment Option: DP vs Full Payment */}
              <div>
                <label className="block text-xs font-bold text-amber-950 mb-1.5">
                  Pilihan Pembayaran PO
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setMtoPaymentMode('dp'); posSound.beep(); }}
                    className={`rounded-xl p-2.5 text-left border transition ${
                      mtoPaymentMode === 'dp'
                        ? 'bg-white border-[#D97706] ring-1 ring-[#D97706] shadow-xs'
                        : 'bg-white/60 border-amber-200 text-[#6B7280] hover:bg-white'
                    }`}
                  >
                    <span className="block text-xs font-bold text-[#1F2937]">Uang Muka (DP)</span>
                    <span className="text-[11px] text-[#6B7280]">Bayar sebagian, pelunasan saat pengambilan</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setMtoPaymentMode('full'); posSound.beep(); }}
                    className={`rounded-xl p-2.5 text-left border transition ${
                      mtoPaymentMode === 'full'
                        ? 'bg-white border-[#059669] ring-1 ring-[#059669] shadow-xs'
                        : 'bg-white/60 border-amber-200 text-[#6B7280] hover:bg-white'
                    }`}
                  >
                    <span className="block text-xs font-bold text-[#1F2937]">Lunas (100%)</span>
                    <span className="text-[11px] text-[#6B7280]">Bayar penuh sekarang: {formatIDR(cartTotal)}</span>
                  </button>
                </div>

                {mtoPaymentMode === 'dp' && (
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex-1 flex items-center rounded-xl border border-amber-300 bg-white px-3 py-2">
                      <span className="text-xs font-bold text-[#6B7280] mr-2">Nominal DP: Rp</span>
                      <input
                        type="number"
                        value={mtoDpInput}
                        onChange={(e) => setMtoDpInput(e.target.value)}
                        className="w-full text-sm font-bold text-[#1F2937] focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setMtoDpInput(String(Math.round(cartTotal * 0.3)))}
                        className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                      >
                        30%
                      </button>
                      <button
                        type="button"
                        onClick={() => setMtoDpInput(String(Math.round(cartTotal * 0.5)))}
                        className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                      >
                        50%
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Payment Instrument Tabs */}
          <div>
            <span className="block text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-2">
              Pilih Metode Pembayaran ({formatIDR(amountToPay)})
            </span>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'cash', label: 'Tunai (Cash)', icon: Banknote },
                { id: 'qris', label: 'QRIS', icon: QrCode },
                { id: 'deposit', label: 'Akun Deposit', icon: Wallet },
                { id: 'split', label: 'Split (Cash+QRIS)', icon: Split },
              ].map((tab) => {
                const Icon = tab.icon;
                const isSelected = paymentTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => { setPaymentTab(tab.id as any); posSound.beep(); }}
                    className={`flex flex-col items-center justify-center rounded-xl p-3 text-center transition ${
                      isSelected
                        ? 'bg-[#1F2937] text-white shadow-xs font-bold'
                        : 'bg-[#F7F7F5] border border-[#E5E7EB] text-[#6B7280] hover:text-[#1F2937] hover:bg-white'
                    }`}
                  >
                    <Icon className="h-5 w-5 mb-1" />
                    <span className="text-xs font-semibold">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Specific Content */}
          {paymentTab === 'cash' && (
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-1">
                  Uang Diterima dari Pelanggan
                </label>
                <div className="flex items-center justify-between rounded-xl border border-[#E5E7EB] bg-[#F7F7F5] p-3">
                  <span className="text-sm font-bold text-[#6B7280]">Rp</span>
                  <input
                    type="text"
                    readOnly
                    value={tenderedInput ? parseInt(tenderedInput, 10).toLocaleString('id-ID') : amountToPay.toLocaleString('id-ID')}
                    className="w-full bg-transparent text-right text-2xl font-black text-[#1F2937] focus:outline-none"
                  />
                </div>
              </div>

              {/* Quick Cash Chips */}
              <div>
                <span className="text-[11px] font-bold text-[#6B7280] block mb-1.5">Pilihan Cepat Nominal</span>
                <div className="grid grid-cols-5 gap-2">
                  {quickCashOptions.map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => {
                        setTenderedInput(String(opt.value));
                        posSound.cashRegister();
                      }}
                      className="rounded-lg border border-[#E5E7EB] bg-white py-2 text-center text-xs font-bold text-[#1F2937] hover:border-[#D97706] hover:bg-[#F7F7F5] active:scale-95 transition"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Numpad */}
              <div className="grid grid-cols-4 gap-2 pt-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '000'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleNumpadDigit(digit)}
                    className="rounded-xl border border-[#E5E7EB] bg-[#F7F7F5] py-2.5 text-center text-sm font-bold text-[#1F2937] hover:bg-white active:scale-95 transition"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleNumpadDelete}
                  className="rounded-xl border border-[#E5E7EB] bg-[#F7F7F5] py-2.5 text-center text-sm font-bold text-rose-600 hover:bg-white active:scale-95 transition flex items-center justify-center"
                >
                  <Delete className="h-4 w-4" />
                </button>
              </div>

              {/* Change calculation */}
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-center justify-between text-xs font-bold text-emerald-900">
                <span>Kembalian:</span>
                <span className="text-base font-black">{formatIDR(cashChange)}</span>
              </div>
            </div>
          )}

          {paymentTab === 'qris' && (
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 text-center space-y-3">
              <span className="text-xs font-bold text-[#6B7280]">Scan Kode QRIS Pembayaran</span>
              <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/50">
                <QrCode className="h-24 w-24 text-blue-600" />
              </div>
              <p className="text-xs font-bold text-[#1F2937]">
                Total: {formatIDR(amountToPay)}
              </p>
              <p className="text-[11px] text-[#6B7280]">
                Mendukung GoPay, OVO, Dana, ShopeePay, BCA, Mandiri, dan seluruh aplikasi perbankan.
              </p>
            </div>
          )}

          {paymentTab === 'deposit' && (
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 space-y-3">
              <span className="text-xs font-bold text-[#6B7280]">Pembayaran dengan Akun Saldo Deposit</span>
              <div className="rounded-xl bg-purple-50 border border-purple-200 p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-purple-900 block font-semibold">Saldo Tersedia</span>
                  <span className="text-lg font-black text-purple-950">
                    {formatIDR(selectedCustomer.depositBalance)}
                  </span>
                </div>
                <Wallet className="h-8 w-8 text-purple-600" />
              </div>
              {selectedCustomer.depositBalance < amountToPay && (
                <p className="text-xs text-rose-600 font-bold">
                  Saldo deposit tidak mencukupi untuk membayar {formatIDR(amountToPay)}.
                </p>
              )}
            </div>
          )}

          {paymentTab === 'split' && (
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 space-y-3">
              <span className="text-xs font-bold text-[#6B7280]">Split Payment (Tunai + QRIS)</span>
              <div>
                <label className="block text-xs font-semibold text-[#1F2937] mb-1">Porsi Tunai (Rp)</label>
                <input
                  type="number"
                  value={splitCashInput}
                  onChange={(e) => setSplitCashInput(e.target.value)}
                  placeholder="Contoh: 50000"
                  className="w-full rounded-xl border border-[#E5E7EB] bg-[#F7F7F5] px-3 py-2 text-sm font-bold text-[#1F2937] focus:outline-none"
                />
              </div>
              <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-blue-900 block">Sisa Otomatis via QRIS</span>
                  <span className="text-base font-black text-blue-950">{formatIDR(splitRemaining)}</span>
                </div>
                <QrCode className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions with Primary and Mandatory Tutup at Bottom Right */}
        <div className="border-t border-[#E5E7EB] bg-[#F7F7F5] p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleFinalizePayment}
            disabled={hasMadeToOrder && isWalkIn}
            className="w-full sm:flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#D97706] py-3 text-sm sm:text-base font-bold text-white shadow-xs transition hover:bg-amber-700 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed uppercase"
          >
            <CheckCircle2 className="h-5 w-5" />
            <span>
              {hasMadeToOrder
                ? `Buat & Cetak PO (${mtoPaymentMode === 'dp' ? 'DP ' + formatIDR(amountToPay) : 'Lunas ' + formatIDR(amountToPay)})`
                : `Selesaikan Pembayaran ${formatIDR(cartTotal)}`}
            </span>
          </button>

          {/* Mandatory Bottom-Right Visible Tutup Button */}
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto rounded-xl border border-[#E5E7EB] bg-white px-6 py-3 text-xs font-bold text-[#1F2937] hover:bg-gray-50 active:scale-95 transition text-center"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
