import React, { useState, useMemo } from 'react';
import {
  Banknote,
  QrCode,
  Wallet,
  Split,
  CalendarCheck,
  CheckCircle2,
  X,
  Sparkles,
  AlertCircle,
  Delete,
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

  const [paymentTab, setPaymentTab] = useState<'cash' | 'qris' | 'deposit' | 'split' | 'dp'>('cash');

  // Cash Tendered
  const [tenderedInput, setTenderedInput] = useState<string>('');
  const tenderedAmount = parseInt(tenderedInput || '0', 10);

  // QRIS Simulation
  const [isQrisProcessing, setIsQrisProcessing] = useState(false);
  const [isQrisPaid, setIsQrisPaid] = useState(false);

  // Split Payment state
  const [splitCashInput, setSplitCashInput] = useState<string>('');
  const splitCash = parseInt(splitCashInput || '0', 10);
  const splitRemaining = Math.max(0, cartTotal - splitCash);

  // DP (Made-to-Order) state
  const [dpInput, setDpInput] = useState<string>(() => String(Math.round(cartTotal * 0.5))); // default 50% DP
  const dpAmount = parseInt(dpInput || '0', 10);
  const [customCakeNotes, setCustomCakeNotes] = useState<string>(
    'Tulisan ucapan di kue: "Happy Birthday"\nLilin angka: 1 buah\nPengambilan: Besok jam 15:00 WIB'
  );

  const hasMadeToOrder = useMemo(() => cart.some((i) => i.isMadeToOrder), [cart]);

  if (!isOpen) return null;

  // Change computation for Cash
  const effectiveCashTendered = tenderedAmount > 0 ? tenderedAmount : cartTotal;
  const cashChange = Math.max(0, effectiveCashTendered - cartTotal);

  // Quick cash chips in Indonesian Rupiah
  const quickCashOptions = [
    { label: 'UANG PAS', value: cartTotal },
    { label: 'Rp 20.000', value: 20000 },
    { label: 'Rp 50.000', value: 50000 },
    { label: 'Rp 100.000', value: 100000 },
    { label: 'Rp 200.000', value: 200000 },
    { label: 'Rp 500.000', value: 500000 },
  ].filter((opt) => opt.value >= cartTotal || opt.label === 'UANG PAS');

  const handleNumpadDigit = (digit: string) => {
    posSound.beep();
    if (paymentTab === 'cash') {
      setTenderedInput((prev) => (prev === '0' ? digit : prev + digit));
    } else if (paymentTab === 'split') {
      setSplitCashInput((prev) => (prev === '0' ? digit : prev + digit));
    } else if (paymentTab === 'dp') {
      setDpInput((prev) => (prev === '0' ? digit : prev + digit));
    }
  };

  const handleNumpadDelete = () => {
    posSound.beep();
    if (paymentTab === 'cash') {
      setTenderedInput((prev) => prev.slice(0, -1));
    } else if (paymentTab === 'split') {
      setSplitCashInput((prev) => prev.slice(0, -1));
    } else if (paymentTab === 'dp') {
      setDpInput((prev) => prev.slice(0, -1));
    }
  };

  const handleNumpadClear = () => {
    if (paymentTab === 'cash') setTenderedInput('');
    else if (paymentTab === 'split') setSplitCashInput('');
    else if (paymentTab === 'dp') setDpInput('');
  };

  // Submit Payment
  const handleFinalizePayment = () => {
    const payments: PaymentComponent[] = [];
    const timestamp = new Date().toISOString();

    if (paymentTab === 'cash') {
      if (tenderedAmount > 0 && tenderedAmount < cartTotal) {
        posSound.error();
        return;
      }
      payments.push({
        method: 'cash',
        amount: cartTotal,
        tenderedCash: effectiveCashTendered,
        change: cashChange,
        timestamp,
      });
      completeOrder(payments);
      onClose();
    } else if (paymentTab === 'qris') {
      payments.push({
        method: 'qris',
        amount: cartTotal,
        reference: 'QRIS-' + Date.now().toString().slice(-6),
        timestamp,
      });
      completeOrder(payments);
      onClose();
    } else if (paymentTab === 'deposit') {
      if (selectedCustomer.depositBalance < cartTotal) {
        posSound.error();
        return;
      }
      payments.push({
        method: 'deposit',
        amount: cartTotal,
        reference: `DEPOSIT-${selectedCustomer.id}`,
        timestamp,
      });
      completeOrder(payments);
      onClose();
    } else if (paymentTab === 'split') {
      if (splitCash <= 0 || splitRemaining <= 0) {
        posSound.error();
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
      completeOrder(payments);
      onClose();
    } else if (paymentTab === 'dp') {
      if (dpAmount <= 0 || dpAmount >= cartTotal) {
        posSound.error();
        return;
      }
      payments.push({
        method: 'cash',
        amount: dpAmount,
        tenderedCash: dpAmount,
        change: 0,
        timestamp,
      });
      completeOrder(payments, {
        isDeposit: true,
        customizationNotes: customCakeNotes,
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-sm">
      <div className="flex h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] border-2 border-[#E5DACE] bg-white shadow-2xl">
        {/* Modal Top Banner */}
        <div className="flex items-center justify-between border-b-2 border-[#E5DACE] bg-[#FDFBF7] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#D97706] text-white shadow-sm">
              <Banknote className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#2D241E]">Pembayaran Kasir</h2>
              <p className="text-xs font-semibold text-[#8C7B6C]">
                Pelanggan: <span className="text-[#D97706] font-bold">{selectedCustomer.name}</span> ({cart.length} jenis item)
              </p>
            </div>
          </div>

          {/* Grand Total Display */}
          <div className="text-right">
            <span className="block text-xs font-bold uppercase tracking-wider text-[#8C7B6C]">Total Tagihan</span>
            <span className="text-2xl sm:text-3xl font-black text-[#059669] tracking-tight">
              {formatIDR(cartTotal)}
            </span>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 text-[#8C7B6C] hover:bg-[#E5DACE]/40 hover:text-[#2D241E]"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Payment Methods Nav (Big Touch Tabs) */}
        <div className="grid grid-cols-5 border-b-2 border-[#E5DACE] bg-[#FDFBF7] p-2 gap-2">
          <button
            onClick={() => { setPaymentTab('cash'); posSound.beep(); }}
            className={`flex flex-col items-center justify-center rounded-2xl py-3 px-2 text-center transition active:scale-95 ${
              paymentTab === 'cash'
                ? 'bg-white font-extrabold text-emerald-800 shadow-md ring-2 ring-emerald-500'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Banknote className={`h-6 w-6 mb-1 ${paymentTab === 'cash' ? 'text-emerald-600' : 'text-gray-400'}`} />
            <span className="text-sm">Tunai (Cash)</span>
          </button>

          <button
            onClick={() => { setPaymentTab('qris'); posSound.beep(); }}
            className={`flex flex-col items-center justify-center rounded-2xl py-3 px-2 text-center transition active:scale-95 ${
              paymentTab === 'qris'
                ? 'bg-white font-extrabold text-blue-800 shadow-md ring-2 ring-blue-500'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <QrCode className={`h-6 w-6 mb-1 ${paymentTab === 'qris' ? 'text-blue-600' : 'text-gray-400'}`} />
            <span className="text-sm">QRIS</span>
          </button>

          <button
            onClick={() => { setPaymentTab('deposit'); posSound.beep(); }}
            className={`flex flex-col items-center justify-center rounded-2xl py-3 px-2 text-center transition active:scale-95 ${
              paymentTab === 'deposit'
                ? 'bg-white font-extrabold text-purple-800 shadow-md ring-2 ring-purple-500'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Wallet className={`h-6 w-6 mb-1 ${paymentTab === 'deposit' ? 'text-purple-600' : 'text-gray-400'}`} />
            <span className="text-sm">Akun Deposit</span>
          </button>

          <button
            onClick={() => { setPaymentTab('split'); posSound.beep(); }}
            className={`flex flex-col items-center justify-center rounded-2xl py-3 px-2 text-center transition active:scale-95 ${
              paymentTab === 'split'
                ? 'bg-white font-extrabold text-amber-800 shadow-md ring-2 ring-amber-500'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Split className={`h-6 w-6 mb-1 ${paymentTab === 'split' ? 'text-amber-600' : 'text-gray-400'}`} />
            <span className="text-sm">Split / Bagi</span>
          </button>

          <button
            onClick={() => { setPaymentTab('dp'); posSound.beep(); }}
            className={`relative flex flex-col items-center justify-center rounded-2xl py-3 px-2 text-center transition active:scale-95 ${
              paymentTab === 'dp'
                ? 'bg-white font-extrabold text-rose-800 shadow-md ring-2 ring-rose-500'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {hasMadeToOrder && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-600 text-[9px] font-bold text-white items-center justify-center">!</span>
              </span>
            )}
            <CalendarCheck className={`h-6 w-6 mb-1 ${paymentTab === 'dp' ? 'text-rose-600' : 'text-gray-400'}`} />
            <span className="text-sm">DP Custom Cake</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* TAB 1: TUNAI / CASH */}
          {paymentTab === 'cash' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-full">
              {/* Left Column: Quick Cash Chips & Live Change Box */}
              <div className="md:col-span-7 flex flex-col justify-between space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                    Uang Diterima dari Pelanggan
                  </label>

                  {/* Input display */}
                  <div className="flex items-center justify-between rounded-3xl border-2 border-emerald-500 bg-emerald-50/40 p-4 shadow-inner">
                    <span className="text-lg font-bold text-emerald-800">Rp</span>
                    <input
                      type="text"
                      readOnly
                      value={tenderedInput ? parseInt(tenderedInput, 10).toLocaleString('id-ID') : cartTotal.toLocaleString('id-ID')}
                      className="w-full bg-transparent text-right text-3xl font-black text-gray-900 focus:outline-none"
                    />
                  </div>

                  {/* Quick Cash Buttons */}
                  <div className="mt-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-2">
                      Pilihan Cepat Nominal Uang (Pecahan Rupiah)
                    </span>
                    <div className="grid grid-cols-3 gap-2.5">
                      {quickCashOptions.map((opt) => (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => {
                            setTenderedInput(String(opt.value));
                            posSound.cashRegister();
                          }}
                          className={`rounded-2xl border-2 py-3 px-2 text-center font-black transition active:scale-95 ${
                            tenderedAmount === opt.value || (!tenderedInput && opt.label === 'UANG PAS')
                              ? 'border-emerald-600 bg-emerald-600 text-white shadow-md'
                              : 'border-gray-200 bg-white text-gray-800 hover:border-emerald-300 hover:bg-emerald-50/30'
                          }`}
                        >
                          <span className="text-sm sm:text-base block">{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Kembalian (Change) Display Banner - HUGE & UNMISSABLE */}
                <div className={`rounded-3xl border-2 p-5 text-center transition-all ${
                  effectiveCashTendered < cartTotal
                    ? 'border-rose-300 bg-rose-50 text-rose-800'
                    : 'border-emerald-400 bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-950 shadow-md'
                }`}>
                  {effectiveCashTendered < cartTotal ? (
                    <div className="flex items-center justify-center gap-2 text-rose-700 font-bold">
                      <AlertCircle className="h-6 w-6" />
                      <span>Uang Tunai Kurang: {formatIDR(cartTotal - effectiveCashTendered)}</span>
                    </div>
                  ) : (
                    <div>
                      <span className="block text-xs font-extrabold uppercase tracking-widest text-emerald-700">
                        KEMBALIAN KEPADA PELANGGAN
                      </span>
                      <div className="text-3xl sm:text-4xl font-black text-emerald-600 tracking-tight mt-1">
                        {formatIDR(cashChange)}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {cashChange === 0 ? 'Uang pas diterima, tidak ada kembalian.' : 'Pastikan menghitung kembalian dengan teliti.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Touch Numpad */}
              <div className="md:col-span-5 flex flex-col justify-center">
                <div className="grid grid-cols-3 gap-2.5">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handleNumpadDigit(d)}
                      className="flex h-16 items-center justify-center rounded-2xl bg-gray-100 text-2xl font-black text-gray-800 shadow-sm transition hover:bg-emerald-100 hover:text-emerald-900 active:scale-95"
                    >
                      {d}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleNumpadClear}
                    className="flex h-16 items-center justify-center rounded-2xl bg-rose-50 text-sm font-bold text-rose-600 transition hover:bg-rose-100 active:scale-95"
                  >
                    Hapus
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNumpadDigit('0')}
                    className="flex h-16 items-center justify-center rounded-2xl bg-gray-100 text-2xl font-black text-gray-800 shadow-sm transition hover:bg-emerald-100 active:scale-95"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handleNumpadDelete}
                    className="flex h-16 items-center justify-center rounded-2xl bg-gray-200 text-gray-700 transition hover:bg-gray-300 active:scale-95"
                  >
                    <Delete className="h-6 w-6" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: QRIS */}
          {paymentTab === 'qris' && (
            <div className="flex flex-col items-center justify-center py-4 text-center max-w-md mx-auto space-y-4">
              <div className="rounded-3xl border-2 border-blue-200 bg-white p-6 shadow-lg">
                <div className="mb-3 flex items-center justify-center gap-2">
                  <span className="font-black text-blue-900 text-lg tracking-wider">QRIS STANDAR NASIONAL</span>
                  <span className="rounded-md bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">GPN</span>
                </div>

                {/* Simulated QR Code with high aesthetics */}
                <div className="relative mx-auto flex h-64 w-64 items-center justify-center rounded-2xl border-4 border-gray-900 bg-white p-3 shadow-inner">
                  {/* Visual QR Pattern SVG */}
                  <svg className="w-full h-full text-gray-900" viewBox="0 0 100 100" fill="currentColor">
                    {/* Corners */}
                    <rect x="5" y="5" width="26" height="26" rx="4" />
                    <rect x="9" y="9" width="18" height="18" fill="white" />
                    <rect x="13" y="13" width="10" height="10" />

                    <rect x="69" y="5" width="26" height="26" rx="4" />
                    <rect x="73" y="9" width="18" height="18" fill="white" />
                    <rect x="77" y="13" width="10" height="10" />

                    <rect x="5" y="69" width="26" height="26" rx="4" />
                    <rect x="9" y="73" width="18" height="18" fill="white" />
                    <rect x="13" y="77" width="10" height="10" />

                    {/* Data dots */}
                    <rect x="36" y="8" width="8" height="8" />
                    <rect x="48" y="12" width="6" height="6" />
                    <rect x="36" y="24" width="6" height="6" />
                    <rect x="48" y="24" width="8" height="8" />

                    <rect x="8" y="36" width="6" height="6" />
                    <rect x="18" y="44" width="8" height="8" />
                    <rect x="34" y="38" width="12" height="12" />
                    <rect x="52" y="36" width="10" height="10" />
                    <rect x="68" y="40" width="8" height="8" />
                    <rect x="82" y="36" width="10" height="10" />

                    <rect x="36" y="56" width="10" height="10" />
                    <rect x="52" y="52" width="8" height="8" />
                    <rect x="66" y="56" width="12" height="12" />
                    <rect x="84" y="52" width="8" height="8" />

                    <rect x="38" y="72" width="8" height="8" />
                    <rect x="52" y="70" width="10" height="10" />
                    <rect x="68" y="74" width="8" height="8" />
                    <rect x="82" y="78" width="10" height="10" />
                  </svg>

                  {/* Center Badge */}
                  <div className="absolute inset-0 m-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500 shadow-md text-white font-black text-xs border-2 border-white">
                    BAKERY
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-semibold text-gray-500">Scan dengan BCA, Mandiri, GoPay, OVO, ShopeePay, DANA</p>
                  <p className="text-xl font-black text-gray-900 mt-1">{formatIDR(cartTotal)}</p>
                  <p className="text-[11px] text-gray-400">NMID: ID102003889104 - Roti Nusantara</p>
                </div>
              </div>

              {/* Status & Simulated Check */}
              <div className="w-full">
                {isQrisPaid ? (
                  <div className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-100 p-4 text-emerald-800 font-bold animate-pulse">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                    <span>Pembayaran QRIS Berhasil Diterima!</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsQrisProcessing(true);
                      setTimeout(() => {
                        setIsQrisProcessing(false);
                        setIsQrisPaid(true);
                        posSound.cashRegister();
                      }, 900);
                    }}
                    disabled={isQrisProcessing}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 px-4 font-bold text-white shadow-md hover:bg-blue-700 active:scale-95 disabled:opacity-50"
                  >
                    {isQrisProcessing ? (
                      <span>Memverifikasi Penerimaan Dana...</span>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5" />
                        <span>Simulasi Pelanggan Berhasil Scan & Bayar</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: AKUN DEPOSIT */}
          {paymentTab === 'deposit' && (
            <div className="max-w-lg mx-auto py-6 space-y-6">
              <div className="rounded-3xl border-2 border-purple-200 bg-purple-50/50 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-600 text-white font-bold">
                      <Wallet className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg">{selectedCustomer.name}</h4>
                      <p className="text-xs text-purple-700 font-medium">Saldo Deposit Pelanggan</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-purple-900">
                      {formatIDR(selectedCustomer.depositBalance)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 border-t border-purple-200 pt-4 text-xs space-y-1.5 text-gray-600">
                  <div className="flex justify-between">
                    <span>Total Belanja:</span>
                    <span className="font-bold text-gray-900">{formatIDR(cartTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sisa Saldo Setelah Transaksi:</span>
                    <span className={`font-bold ${
                      selectedCustomer.depositBalance >= cartTotal ? 'text-emerald-700' : 'text-rose-600'
                    }`}>
                      {formatIDR(selectedCustomer.depositBalance - cartTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {selectedCustomer.depositBalance < cartTotal ? (
                <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-800 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Saldo Deposit Tidak Mencukupi</strong>
                    <span>
                      Saldo pelanggan ({formatIDR(selectedCustomer.depositBalance)}) kurang dari total tagihan ({formatIDR(cartTotal)}). Silakan gunakan metode Tunai atau Split Payment.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800 flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <span>Saldo deposit mencukupi untuk pembayaran lunas otomatis.</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SPLIT PAYMENT */}
          {paymentTab === 'split' && (
            <div className="max-w-lg mx-auto py-4 space-y-4">
              <div className="rounded-2xl bg-amber-50 p-4 border border-amber-200 text-xs text-amber-900">
                Kombinasikan pembayaran Tunai (Cash) dan QRIS untuk melunasi nota ini.
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Porsi 1: Pembayaran Tunai (Cash)
                </label>
                <div className="flex items-center rounded-2xl border-2 border-amber-400 bg-white p-3">
                  <span className="text-base font-bold text-gray-500 mr-2">Rp</span>
                  <input
                    type="number"
                    value={splitCashInput}
                    onChange={(e) => setSplitCashInput(e.target.value)}
                    placeholder="Contoh: 50000"
                    className="w-full text-xl font-bold text-gray-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Porsi 2: Sisa Tagihan via QRIS
                </label>
                <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/60 p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-blue-800 block">Sisa Otomatis QRIS</span>
                    <span className="text-2xl font-black text-blue-900">{formatIDR(splitRemaining)}</span>
                  </div>
                  <QrCode className="h-8 w-8 text-blue-600" />
                </div>
              </div>

              {splitCash >= cartTotal && (
                <p className="text-xs text-rose-600 font-semibold">
                  Nominal tunai sudah melebihi atau sama dengan total. Silakan gunakan tab Tunai langsung.
                </p>
              )}
            </div>
          )}

          {/* TAB 5: DP / UANG MUKA MADE-TO-ORDER */}
          {paymentTab === 'dp' && (
            <div className="max-w-lg mx-auto py-4 space-y-4">
              <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-950 space-y-1">
                <strong className="block font-bold text-sm text-rose-900">
                  🎂 Pesanan Pre-Order / Made-to-Order Custom Cake
                </strong>
                <p>
                  Pelanggan membayar Uang Muka (DP) sekarang. Stok bahan dasar kue baru akan dipotong saat kue diambil & dilunasi (Pelunasan).
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Nominal Uang Muka (DP) yang Dibayarkan Sekarang *
                </label>
                <div className="flex items-center rounded-2xl border-2 border-rose-400 bg-white p-3">
                  <span className="text-base font-bold text-gray-500 mr-2">Rp</span>
                  <input
                    type="number"
                    value={dpInput}
                    onChange={(e) => setDpInput(e.target.value)}
                    className="w-full text-2xl font-black text-rose-700 focus:outline-none"
                  />
                </div>
                <div className="mt-2 flex justify-between text-xs text-gray-500">
                  <span>Sisa Pelunasan Nanti:</span>
                  <strong className="text-gray-900 font-bold">{formatIDR(Math.max(0, cartTotal - dpAmount))}</strong>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Instruksi Kustomisasi / Catatan Chef Kue (Wajib untuk PO) *
                </label>
                <textarea
                  rows={3}
                  value={customCakeNotes}
                  onChange={(e) => setCustomCakeNotes(e.target.value)}
                  placeholder="Misal: Tulisan di cake, lilin angka, warna krim dekorasi..."
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-sm focus:border-rose-500 focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Bottom Giant Action Button */}
        <div className="border-t border-gray-100 bg-white p-4 sm:p-6">
          <button
            type="button"
            onClick={handleFinalizePayment}
            disabled={
              (paymentTab === 'cash' && tenderedAmount > 0 && tenderedAmount < cartTotal) ||
              (paymentTab === 'deposit' && selectedCustomer.depositBalance < cartTotal) ||
              (paymentTab === 'split' && (splitCash <= 0 || splitRemaining <= 0 || splitCash >= cartTotal)) ||
              (paymentTab === 'dp' && (dpAmount <= 0 || dpAmount >= cartTotal))
            }
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-emerald-600 py-4 text-xl font-black text-white shadow-xl transition hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="h-7 w-7" />
            <span>
              {paymentTab === 'dp'
                ? `TERIMA DP ${formatIDR(dpAmount)} & CETAK NOTA PO`
                : `SELESAIKAN PEMBAYARAN ${formatIDR(cartTotal)}`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
