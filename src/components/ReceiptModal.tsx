import React, { useState } from 'react';
import {
  Printer,
  Mail,
  CheckCircle2,
  X,
  Share2,
  AlertCircle,
  Wifi,
  Bluetooth,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { STORE_INFO } from '../data/mockData';
import { formatIDR, formatDateTime, posSound } from '../utils/formatters';
import confetti from 'canvas-confetti';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose }) => {
  const { activeReceiptOrder, reprintReceipt } = usePOS();
  const [emailInput, setEmailInput] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [printStatus, setPrintStatus] = useState<'idle' | 'printing' | 'printed'>('idle');

  // Trigger celebratory confetti when receipt opens first time
  React.useEffect(() => {
    if (isOpen && activeReceiptOrder && activeReceiptOrder.reprintCount === 0) {
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#f59e0b', '#10b981', '#6366f1'],
        });
      } catch {}
    }
    if (activeReceiptOrder?.customer.email) {
      setEmailInput(activeReceiptOrder.customer.email);
    }
  }, [isOpen, activeReceiptOrder]);

  if (!isOpen || !activeReceiptOrder) return null;

  const order = activeReceiptOrder;
  const isReprint = order.reprintCount > 0;

  const handlePrint = () => {
    setPrintStatus('printing');
    posSound.beep();
    setTimeout(() => {
      setPrintStatus('printed');
      window.print();
    }, 400);
  };

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setEmailSent(true);
    posSound.cashRegister();
    setTimeout(() => {
      setEmailSent(false);
    }, 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-sm overflow-y-auto">
      <div className="flex h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-emerald-50/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">Struk Pembayaran</h3>
              <p className="text-xs text-emerald-800 font-semibold">
                No. Nota: {order.receiptNumber} {isReprint && `(Cetak Ulang #${order.reprintCount})`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="flex-1 overflow-y-auto bg-gray-100 p-4 sm:p-6 flex justify-center">
          {/* Authentic 80mm Thermal Receipt Card */}
          <div
            id="thermal-receipt-printable"
            className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-md font-mono text-xs text-gray-800 border border-gray-200"
          >
            {/* REPRINT WATERMARK (POS-US-019) */}
            {isReprint && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10 opacity-20">
                <span className="transform -rotate-45 text-5xl font-black text-rose-600 border-4 border-rose-600 px-6 py-2 tracking-widest">
                  REPRINT #{order.reprintCount}
                </span>
              </div>
            )}

            {/* Store Branding */}
            <div className="text-center space-y-1 pb-3 border-b border-dashed border-gray-300">
              <h2 className="text-base font-black tracking-tight text-gray-950 font-sans uppercase">
                {STORE_INFO.name}
              </h2>
              <p className="text-[11px] text-gray-600">{STORE_INFO.branch}</p>
              <p className="text-[10px] text-gray-500">{STORE_INFO.address}</p>
              <p className="text-[10px] text-gray-500">Tel: {STORE_INFO.phone}</p>
              <p className="text-[10px] text-gray-400">{STORE_INFO.taxNumber}</p>
            </div>

            {/* Metadata */}
            <div className="py-2.5 border-b border-dashed border-gray-300 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>No. Struk:</span>
                <span className="font-bold">{order.receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Waktu:</span>
                <span>{formatDateTime(order.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span>Kasir:</span>
                <span>{order.cashierName}</span>
              </div>
              <div className="flex justify-between">
                <span>Pelanggan:</span>
                <span className="font-semibold">{order.customer.name} ({order.customer.category})</span>
              </div>
              {(order.isMadeToOrder || order.poNumber) && (
                <div className="rounded bg-amber-50 border border-amber-300 p-2 text-amber-950 text-[10px] space-y-0.5">
                  <div className="font-black text-amber-900 tracking-wider">
                    *** SURAT PESANAN (PURCHASE ORDER) ***
                  </div>
                  {order.poNumber && (
                    <div className="flex justify-between font-mono font-bold">
                      <span>NO. PO:</span>
                      <span>{order.poNumber}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>JADWAL AMBIL:</span>
                    <span className="font-bold">
                      {order.pickupDate || 'Hari Ini'}, {order.pickupTime || '14:00'} WIB
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>STATUS PO:</span>
                    <span className="font-bold uppercase">
                      {order.paymentStatus === 'paid' ? 'LUNAS (100%)' : 'UANG MUKA (DP)'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Itemized Lines */}
            <div className="py-3 border-b border-dashed border-gray-300 space-y-2">
              {order.items.map((item) => (
                <div key={item.id} className="text-[11px]">
                  <div className="flex justify-between font-semibold">
                    <span>{item.productName}</span>
                    <span>{formatIDR(item.unitPrice * item.quantity)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-500">
                    <span>
                      {item.quantity} x {formatIDR(item.unitPrice)}
                      {item.isPriceOverridden && ' (Harga Nego)'}
                    </span>
                    {item.itemDiscountAmount && (
                      <span className="text-rose-600">Diskon -{formatIDR(item.itemDiscountAmount * item.quantity)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals Calculation */}
            <div className="py-2.5 border-b border-dashed border-gray-300 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatIDR(order.subtotal)}</span>
              </div>

              {order.discountAmount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Diskon Nota ({order.discountReason || 'Promo'}):</span>
                  <span>-{formatIDR(order.discountAmount)}</span>
                </div>
              )}

              {order.taxApplied && (
                <div className="flex justify-between">
                  <span>PPN 11%:</span>
                  <span>{formatIDR(order.taxAmount)}</span>
                </div>
              )}

              <div className="flex justify-between text-sm font-black text-gray-950 pt-1 border-t border-gray-200">
                <span>TOTAL AKHIR:</span>
                <span>{formatIDR(order.total)}</span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="py-2.5 border-b border-dashed border-gray-300 space-y-1 text-[11px]">
              {order.payments.map((p, idx) => (
                <div key={idx} className="flex justify-between">
                  <span className="uppercase font-semibold">
                    Bayar {p.method === 'cash' ? 'Tunai' : p.method === 'qris' ? 'QRIS' : 'Akun Deposit'}:
                  </span>
                  <span>{formatIDR(p.amount)}</span>
                </div>
              ))}

              {order.payments.some((p) => p.method === 'cash' && (p.tenderedCash || 0) > 0) && (
                <>
                  <div className="flex justify-between text-gray-500 text-[10px]">
                    <span>Uang Diterima:</span>
                    <span>{formatIDR(order.payments.find((p) => p.method === 'cash')?.tenderedCash || 0)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-800 text-xs pt-0.5">
                    <span>KEMBALIAN:</span>
                    <span>{formatIDR(order.change)}</span>
                  </div>
                </>
              )}

              {order.remainingBalance > 0 && (
                <div className="flex justify-between font-bold text-rose-700 bg-rose-50 p-1 rounded text-xs">
                  <span>SISA PELUNASAN (DP):</span>
                  <span>{formatIDR(order.remainingBalance)}</span>
                </div>
              )}
            </div>

            {/* Custom Notes if Made to Order */}
            {order.customizationNotes && (
              <div className="py-2 border-b border-dashed border-gray-300 text-[10px] text-gray-600 italic">
                <span className="font-bold block not-italic">Catatan Khusus Kue:</span>
                <p className="whitespace-pre-line">{order.customizationNotes}</p>
              </div>
            )}

            {/* Footer */}
            <div className="text-center pt-3 space-y-1.5 text-[10px] text-gray-500">
              <p className="whitespace-pre-line font-medium text-gray-700">{STORE_INFO.footerNote}</p>
              <div className="pt-2 flex justify-center">
                {/* Simulated barcode */}
                <div className="flex gap-0.5 h-7 items-end">
                  {[2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 3, 1].map((w, i) => (
                    <span key={i} className="bg-gray-900 inline-block h-full" style={{ width: `${w * 1.5}px` }} />
                  ))}
                </div>
              </div>
              <p className="text-[9px] text-gray-400 font-mono tracking-widest">{order.receiptNumber}</p>
            </div>
          </div>
        </div>

        {/* Bottom Actions Toolbar */}
        <div className="border-t border-gray-100 bg-white p-4 sm:p-6 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Thermal Print Button */}
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 rounded-2xl bg-amber-600 py-3.5 px-4 font-bold text-white shadow-md hover:bg-amber-700 active:scale-95"
            >
              <Printer className="h-5 w-5" />
              <span>Cetak Struk (Bluetooth / WiFi)</span>
            </button>

            {/* Close & New Transaction */}
            <button
              onClick={onClose}
              className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 px-4 font-bold text-white shadow-md hover:bg-emerald-700 active:scale-95"
            >
              <CheckCircle2 className="h-5 w-5" />
              <span>Selesai & Transaksi Baru</span>
            </button>
          </div>

          {/* Email Receipt Option */}
          <form onSubmit={handleSendEmail} className="flex gap-2 pt-1">
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="Kirim nota digital ke email pelanggan..."
              className="flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm focus:border-amber-500 focus:bg-white focus:outline-none"
            />
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-2xl bg-gray-100 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-200 active:scale-95"
            >
              <Mail className="h-4 w-4 text-gray-600" />
              <span>{emailSent ? 'Terkirim!' : 'Kirim Struk'}</span>
            </button>
          </form>

          {emailSent && (
            <p className="text-xs text-emerald-700 font-medium text-center">
              ✓ Struk digital berhasil dikirim ke {emailInput}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
