import React, { useState } from 'react';
import {
  Coins,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  X,
  Calculator,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { formatIDR, formatDateTime, posSound } from '../utils/formatters';
import { SupervisorPinModal } from './SupervisorPinModal';

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SessionModal: React.FC<SessionModalProps> = ({ isOpen, onClose }) => {
  const {
    currentSession,
    closedSessions,
    openSession,
    closeSession,
    correctOpeningCash,
    openSupportSessionCorrection,
    currentUser,
    setAsideOrders,
  } = usePOS();

  // Mode: 'overview' | 'open_session' | 'close_session' | 'history'
  const [mode, setMode] = useState<'overview' | 'open_session' | 'close_session' | 'history'>('overview');

  // Open Session state
  const [openingCashInput, setOpeningCashInput] = useState<string>('200000');

  // Close Session state
  const [actualCashInput, setActualCashInput] = useState<string>('');
  const [varianceReason, setVarianceReason] = useState<string>('');
  const [closeError, setCloseError] = useState<string>('');

  // Supervisor PIN modal
  const [pinModal, setPinModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    action: (spvName: string) => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    action: () => {},
  });

  if (!isOpen) return null;

  const actualCash = parseInt(actualCashInput || '0', 10);
  const expectedCash = currentSession?.expectedCash || 0;
  const variance = actualCash - expectedCash;
  const isVarianceSignificant = Math.abs(variance) > 10000;

  // Handle Open Shift
  const handleOpenShift = () => {
    const amount = parseInt(openingCashInput || '0', 10);
    openSession(amount);
    setMode('overview');
  };

  // Handle Request Close Shift
  const handleRequestClose = () => {
    if (!actualCashInput.trim()) {
      setCloseError('Masukkan jumlah uang fisik di laci kasir!');
      posSound.error();
      return;
    }

    if (setAsideOrders.length > 0) {
      setCloseError(`Selesaikan atau hapus ${setAsideOrders.length} pesanan parkir terlebih dahulu.`);
      posSound.error();
      return;
    }

    if (isVarianceSignificant && !varianceReason.trim()) {
      setCloseError('Selisih kas lebih dari ±Rp 10.000! Wajib isi alasan selisih.');
      posSound.error();
      return;
    }

    // Open SPV PIN modal
    setPinModal({
      isOpen: true,
      title: 'Otorisasi Tutup Shift & Rekonsiliasi Kas',
      description: `Konfirmasi tutup sesi kasir ${currentSession?.cashierName}. Ekspektasi: ${formatIDR(
        expectedCash
      )}, Fisik: ${formatIDR(actualCash)}, Selisih: ${formatIDR(variance)}. Masukkan PIN SPV/Admin:`,
      action: (spvName) => {
        const res = closeSession(actualCash, varianceReason, '8888'); // verified inside pin modal
        if (res.success) {
          setMode('overview');
        } else {
          setCloseError(res.message);
        }
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-sm">
      <div className="flex h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-amber-50/70 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-sm">
              <Coins className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900">Manajemen Shift & Rekonsiliasi Kas</h3>
              <p className="text-xs text-amber-900 font-semibold">
                Status: {currentSession ? 'Shift Sedang Aktif' : 'Shift Belum Dibuka'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50 px-6 pt-2 gap-2 text-xs font-bold">
          <button
            onClick={() => setMode('overview')}
            className={`py-3 px-4 rounded-t-2xl border-b-2 transition ${
              mode === 'overview'
                ? 'border-amber-600 bg-white text-amber-900 shadow-xs'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Ringkasan Shift Aktif
          </button>

          {!currentSession && (
            <button
              onClick={() => setMode('open_session')}
              className={`py-3 px-4 rounded-t-2xl border-b-2 transition ${
                mode === 'open_session'
                  ? 'border-amber-600 bg-white text-amber-900 shadow-xs'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Buka Shift Kasir Baru
            </button>
          )}

          {currentSession && (
            <button
              onClick={() => {
                setActualCashInput(String(currentSession.expectedCash));
                setMode('close_session');
              }}
              className={`py-3 px-4 rounded-t-2xl border-b-2 transition ${
                mode === 'close_session'
                  ? 'border-rose-600 bg-white text-rose-900 shadow-xs'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Tutup & Rekonsiliasi Shift
            </button>
          )}

          <button
            onClick={() => setMode('history')}
            className={`py-3 px-4 rounded-t-2xl border-b-2 transition ${
              mode === 'history'
                ? 'border-amber-600 bg-white text-amber-900 shadow-xs'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Riwayat Sesi Selesai ({closedSessions.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: OVERVIEW */}
          {mode === 'overview' && (
            <div className="space-y-6">
              {currentSession ? (
                <>
                  {/* Current Active Session Card */}
                  <div className="rounded-3xl border-2 border-emerald-200 bg-emerald-50/30 p-6 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-200 pb-4">
                      <div>
                        <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-800">
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                          Shift Kasir Sedang Berjalan
                        </span>
                        <h4 className="text-xl font-black text-gray-900 mt-1">
                          Kasir: {currentSession.cashierName}
                        </h4>
                        <p className="text-xs text-gray-500">
                          ID Sesi: {currentSession.id} • Dimulai: {formatDateTime(currentSession.startTime)}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-gray-400 block uppercase">Modal Awal Kasir</span>
                        <span className="text-xl font-black text-gray-900">
                          {formatIDR(currentSession.openingCash)}
                        </span>
                      </div>
                    </div>

                    {/* KPI Grid */}
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="rounded-2xl bg-white p-3.5 border border-emerald-100 shadow-xs">
                        <span className="text-[11px] font-bold text-gray-400 uppercase block">Total Transaksi</span>
                        <span className="text-xl font-black text-gray-900 mt-0.5 block">
                          {currentSession.totalTransactions} Nota
                        </span>
                      </div>

                      <div className="rounded-2xl bg-white p-3.5 border border-emerald-100 shadow-xs">
                        <span className="text-[11px] font-bold text-gray-400 uppercase block">Total Penjualan</span>
                        <span className="text-xl font-black text-emerald-700 mt-0.5 block">
                          {formatIDR(currentSession.totalSales)}
                        </span>
                      </div>

                      <div className="rounded-2xl bg-white p-3.5 border border-emerald-100 shadow-xs">
                        <span className="text-[11px] font-bold text-gray-400 uppercase block">Penjualan Tunai</span>
                        <span className="text-xl font-black text-gray-900 mt-0.5 block">
                          {formatIDR(currentSession.cashSales)}
                        </span>
                      </div>

                      <div className="rounded-2xl bg-white p-3.5 border border-emerald-100 shadow-xs">
                        <span className="text-[11px] font-bold text-gray-400 uppercase block">Penjualan Non-Tunai</span>
                        <span className="text-xl font-black text-blue-800 mt-0.5 block">
                          {formatIDR(currentSession.qrisSales + currentSession.depositSales)}
                        </span>
                      </div>
                    </div>

                    {/* Expected Drawer Cash Banner */}
                    <div className="mt-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 p-4 text-white flex items-center justify-between shadow-md">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">
                          Ekspektasi Uang Tunai di Laci Saat Ini
                        </span>
                        <p className="text-xs text-emerald-200 mt-0.5">
                          (Modal Awal + Transaksi Tunai - Refund)
                        </p>
                      </div>
                      <span className="text-2xl sm:text-3xl font-black text-white">
                        {formatIDR(currentSession.expectedCash)}
                      </span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => {
                        setActualCashInput(String(currentSession.expectedCash));
                        setMode('close_session');
                      }}
                      className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-rose-600 py-3.5 px-4 font-black text-white shadow-md hover:bg-rose-700 active:scale-95"
                    >
                      <Lock className="h-5 w-5" />
                      <span>Tutup Shift & Hitung Kas Fisik</span>
                    </button>

                    {/* Admin Opening Cash Correction (POS-US-003) */}
                    <button
                      onClick={() => {
                        const newAmtStr = window.prompt(
                          'Masukkan nilai Modal Awal baru (Koreksi Admin):',
                          String(currentSession.openingCash)
                        );
                        if (newAmtStr) {
                          const newAmt = parseInt(newAmtStr, 10);
                          const pin = window.prompt('Masukkan PIN Supervisor/Admin:');
                          if (pin) {
                            correctOpeningCash(newAmt, pin, 'Koreksi kesalahan input modal');
                          }
                        }
                      }}
                      className="rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-xs font-bold text-gray-700 hover:bg-gray-100"
                    >
                      Koreksi Modal Awal
                    </button>
                  </div>
                </>
              ) : (
                <div className="rounded-3xl border-2 border-dashed border-gray-300 p-12 text-center">
                  <Coins className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                  <h4 className="text-lg font-bold text-gray-800">Tidak ada sesi kasir yang aktif</h4>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-6">
                    Buka sesi kasir baru dengan mendeklarasikan uang modal awal di laci kasir untuk mulai bertransaksi.
                  </p>
                  <button
                    onClick={() => setMode('open_session')}
                    className="inline-flex items-center gap-2 rounded-2xl bg-amber-600 px-6 py-3.5 font-bold text-white shadow-md hover:bg-amber-700 active:scale-95"
                  >
                    <Unlock className="h-5 w-5" />
                    <span>Buka Sesi Kasir Sekarang</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BUKA SESI KASIR BARU */}
          {mode === 'open_session' && (
            <div className="max-w-md mx-auto space-y-6 py-4">
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 mb-3">
                  <Unlock className="h-7 w-7" />
                </div>
                <h4 className="text-xl font-black text-gray-900">Buka Sesi Kasir Baru</h4>
                <p className="text-xs text-gray-500 mt-1">
                  Operator: <strong className="text-gray-800">{currentUser.name}</strong>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                  Modal Awal di Laci Kasir (Cash Float) *
                </label>
                <div className="flex items-center rounded-3xl border-2 border-amber-500 bg-amber-50/40 p-4 shadow-inner">
                  <span className="text-lg font-bold text-amber-800 mr-2">Rp</span>
                  <input
                    type="number"
                    value={openingCashInput}
                    onChange={(e) => setOpeningCashInput(e.target.value)}
                    className="w-full bg-transparent text-2xl font-black text-gray-900 focus:outline-none"
                    autoFocus
                  />
                </div>

                {/* Quick denomination buttons */}
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {['100000', '200000', '300000', '500000'].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setOpeningCashInput(amt)}
                      className="rounded-xl border border-gray-200 bg-white py-2 text-xs font-bold text-gray-700 hover:bg-amber-50 active:scale-95"
                    >
                      {formatIDR(parseInt(amt, 10))}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setMode('overview')}
                  className="flex-1 rounded-2xl border border-gray-200 py-3.5 text-sm font-bold text-gray-600 hover:bg-gray-100"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleOpenShift}
                  className="flex-1 rounded-2xl bg-amber-600 py-3.5 text-sm font-bold text-white shadow-md hover:bg-amber-700 active:scale-95"
                >
                  Mulai Sesi Kasir
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: TUTUP & REKONSILIASI SHIFT */}
          {mode === 'close_session' && currentSession && (
            <div className="max-w-xl mx-auto space-y-5 py-2">
              <div className="border-b border-gray-200 pb-3">
                <h4 className="text-lg font-black text-gray-900">Rekonsiliasi Kas Laci (Shift Closing)</h4>
                <p className="text-xs text-gray-500">
                  Pastikan menghitung seluruh uang tunai fisik yang ada di laci kasir saat ini.
                </p>
              </div>

              {closeError && (
                <div className="rounded-2xl bg-rose-50 border border-rose-300 p-3.5 text-xs font-bold text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
                  <span>{closeError}</span>
                </div>
              )}

              {/* Calculation Breakdown */}
              <div className="rounded-2xl bg-gray-50 p-4 border border-gray-200 space-y-2 text-xs text-gray-700">
                <div className="flex justify-between">
                  <span>Modal Awal:</span>
                  <span className="font-bold">{formatIDR(currentSession.openingCash)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Penjualan Tunai (+):</span>
                  <span className="font-bold text-emerald-700">+{formatIDR(currentSession.cashSales)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Refund Tunai (-):</span>
                  <span className="font-bold text-rose-600">-{formatIDR(currentSession.totalRefunds)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 font-black text-gray-900 text-sm">
                  <span>Ekspektasi Kas Sistem:</span>
                  <span>{formatIDR(expectedCash)}</span>
                </div>
              </div>

              {/* Physical Cash Entry */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-800 mb-1">
                  Jumlah Uang Tunai Fisik di Laci Kasir (Dihitung Manual) *
                </label>
                <div className="flex items-center rounded-3xl border-2 border-emerald-500 bg-emerald-50/40 p-4 shadow-inner">
                  <span className="text-lg font-bold text-emerald-800 mr-2">Rp</span>
                  <input
                    type="number"
                    value={actualCashInput}
                    onChange={(e) => {
                      setActualCashInput(e.target.value);
                      setCloseError('');
                    }}
                    placeholder="Hitung uang tunai fisik..."
                    className="w-full bg-transparent text-2xl font-black text-gray-900 focus:outline-none"
                    autoFocus
                  />
                </div>
              </div>

              {/* Live Variance Calculation Banner (POS-US-005) */}
              <div
                className={`rounded-2xl border-2 p-4 text-center ${
                  variance === 0
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                    : isVarianceSignificant
                    ? 'border-rose-400 bg-rose-50 text-rose-950'
                    : 'border-amber-300 bg-amber-50 text-amber-950'
                }`}
              >
                <span className="text-xs font-bold uppercase tracking-wider block">
                  {variance === 0 ? 'Kas Seimbang (Sesuai)' : variance > 0 ? 'Kas Berlebih (Lebih)' : 'Kas Kurang (Defisit)'}
                </span>
                <span className="text-2xl font-black block mt-0.5">
                  {formatIDR(Math.abs(variance))}
                </span>
                {isVarianceSignificant && (
                  <p className="text-xs text-rose-700 font-semibold mt-1">
                    ⚠️ Selisih melebihi toleransi ±Rp 10.000. Alasan wajib diisi & memerlukan persetujuan Supervisor.
                  </p>
                )}
              </div>

              {/* Variance Reason (Mandatory if variance > 10.000) */}
              {isVarianceSignificant && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-rose-800 mb-1">
                    Alasan Selisih Kas * (Wajib jika selisih &gt; Rp 10.000)
                  </label>
                  <textarea
                    rows={2}
                    value={varianceReason}
                    onChange={(e) => setVarianceReason(e.target.value)}
                    placeholder="Jelaskan penyebab selisih kas (misal: kembalian salah pecahan / uang terselip)..."
                    className="w-full rounded-2xl border-2 border-rose-300 bg-rose-50/20 p-3 text-sm focus:border-rose-500 focus:bg-white focus:outline-none"
                  />
                </div>
              )}

              {/* Close Shift Submit */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setMode('overview')}
                  className="flex-1 rounded-2xl border border-gray-200 py-3.5 text-sm font-bold text-gray-600 hover:bg-gray-100"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleRequestClose}
                  className="flex-1 rounded-2xl bg-rose-600 py-3.5 text-sm font-bold text-white shadow-md hover:bg-rose-700 active:scale-95"
                >
                  Otorisasi & Tutup Sesi
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: RIWAYAT SESI SELESAI & SUPPORT SESSION (POS-US-006) */}
          {mode === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-gray-900">Daftar Sesi Kasir yang Telah Ditutup</h4>
                <span className="text-xs text-gray-500">Total {closedSessions.length} sesi</span>
              </div>

              {closedSessions.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">Belum ada sesi kasir yang ditutup.</p>
              ) : (
                closedSessions.map((session) => (
                  <div
                    key={session.id}
                    className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2">
                      <div>
                        <span className="font-extrabold text-gray-900 text-sm">
                          Sesi #{session.id} — Kasir: {session.cashierName}
                        </span>
                        <p className="text-xs text-gray-500">
                          {formatDateTime(session.startTime)} s/d {session.endTime ? formatDateTime(session.endTime) : '-'}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-700">
                          Disetujui: {session.closingApprovedBy || 'Supervisor'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-gray-400 block">Total Penjualan:</span>
                        <span className="font-bold text-gray-900">{formatIDR(session.totalSales)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Ekspektasi Kas:</span>
                        <span className="font-bold text-gray-900">{formatIDR(session.expectedCash)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Fisik Kas:</span>
                        <span className="font-bold text-gray-900">{formatIDR(session.actualCash || 0)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Selisih:</span>
                        <span className={`font-black ${(session.variance || 0) !== 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                          {formatIDR(session.variance || 0)}
                        </span>
                      </div>
                    </div>

                    {session.varianceReason && (
                      <p className="text-xs text-rose-800 bg-rose-50 p-2 rounded-xl">
                        Catatan Selisih: {session.varianceReason}
                      </p>
                    )}

                    {/* Admin Support Session correction button (POS-US-006) */}
                    <div className="pt-2 border-t border-gray-100 flex justify-end">
                      <button
                        onClick={() => {
                          const action = window.prompt('Tulis tindakan koreksi support session:');
                          if (!action) return;
                          const reason = window.prompt('Alasan koreksi administratif:') || 'Audit';
                          const adminPin = window.prompt('Masukkan PIN Admin (9999):');
                          if (adminPin) {
                            openSupportSessionCorrection(session.id, action, reason, adminPin);
                          }
                        }}
                        className="text-xs font-bold text-amber-800 hover:text-amber-900 underline"
                      >
                        Buka Support Session (Admin Only)
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Supervisor Pin Verification Modal */}
      <SupervisorPinModal
        isOpen={pinModal.isOpen}
        onClose={() => setPinModal((p) => ({ ...p, isOpen: false }))}
        title={pinModal.title}
        description={pinModal.description}
        onSuccess={(spvName) => {
          pinModal.action(spvName);
        }}
      />
    </div>
  );
};
