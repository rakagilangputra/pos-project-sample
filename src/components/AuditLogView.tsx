import React, { useState } from 'react';
import { ShieldCheck, Search, Filter, Calendar, User, FileText } from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { formatDateTime } from '../utils/formatters';

export const AuditLogView: React.FC = () => {
  const { auditLogs } = usePOS();
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');

  const filteredLogs = auditLogs.filter((log) => {
    if (filterAction !== 'all' && log.action !== filterAction) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchAction = log.action.toLowerCase().includes(q);
      const matchUser = log.actorName.toLowerCase().includes(q);
      const matchSpv = (log.supervisorName || '').toLowerCase().includes(q);
      const matchDetails = log.details.toLowerCase().includes(q);
      if (!matchAction && !matchUser && !matchSpv && !matchDetails) return false;
    }
    return true;
  });

  const getActionBadgeColor = (action: string) => {
    if (action.includes('VOID') || action.includes('REFUND')) return 'bg-rose-100 text-rose-800';
    if (action.includes('DISCOUNT') || action.includes('OVERRIDE')) return 'bg-amber-100 text-amber-900';
    if (action.includes('STOCK')) return 'bg-blue-100 text-blue-800';
    if (action.includes('SESSION')) return 'bg-emerald-100 text-emerald-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-gray-50/50">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-emerald-600" />
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              Audit Trail & Catatan Keamanan
            </h2>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Log permanen untuk semua tindakan sensitif (Void, Refund, Diskon, Override Harga, Koreksi Kas, dan Stok)
          </p>
        </div>

        <span className="rounded-2xl bg-white border border-gray-200 px-3.5 py-2 text-xs font-bold text-gray-700 shadow-xs">
          Total Rekaman: <strong>{auditLogs.length} Entri</strong>
        </span>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari aksi, kasir, supervisor, atau alasan..."
            className="w-full rounded-2xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="rounded-2xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs font-bold text-gray-700 focus:outline-none"
          >
            <option value="all">Semua Jenis Aksi</option>
            <option value="ORDER_VOIDED">Order Voided</option>
            <option value="ORDER_REFUNDED">Order Refunded</option>
            <option value="RECEIPT_REPRINTED">Receipt Reprinted</option>
            <option value="ORDER_DISCOUNT_APPLIED">Discount Applied</option>
            <option value="MANUAL_STOCK_ADJUSTMENT">Stock Adjustment</option>
            <option value="SESSION_OPENED">Session Opened</option>
            <option value="SESSION_CLOSED">Session Closed</option>
            <option value="OPENING_CASH_CORRECTED">Opening Cash Corrected</option>
          </select>
        </div>
      </div>

      {/* Log List */}
      <div className="space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-12 text-center text-gray-400">
            <FileText className="mx-auto h-12 w-12 text-gray-300 mb-2" />
            <p className="font-bold text-gray-600">Tidak ada log yang sesuai filter.</p>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="rounded-3xl border border-gray-200 bg-white p-4 shadow-xs transition hover:border-gray-300 space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-xl px-2.5 py-1 text-xs font-black tracking-wide ${getActionBadgeColor(
                      log.action
                    )}`}
                  >
                    {log.action}
                  </span>
                  <span className="text-xs text-gray-400 font-medium">
                    {formatDateTime(log.timestamp)}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="text-gray-600">
                    Operator: <strong className="text-gray-900">{log.actorName}</strong> ({log.actorRole})
                  </span>
                  {log.supervisorName && (
                    <span className="rounded-md bg-amber-50 px-2 py-0.5 text-amber-900 font-bold border border-amber-200">
                      Disetujui SPV: {log.supervisorName}
                    </span>
                  )}
                </div>
              </div>

              {/* Log Details Display */}
              <div className="rounded-2xl bg-gray-50/80 p-3 text-xs text-gray-700">
                <p className="font-medium text-gray-800">{log.details}</p>
                {(log.beforeValue || log.afterValue) && (
                  <div className="mt-2 flex items-center gap-4 text-[11px] font-mono">
                    {log.beforeValue && (
                      <span className="text-rose-700">Sebelum: {log.beforeValue}</span>
                    )}
                    {log.beforeValue && log.afterValue && <span>→</span>}
                    {log.afterValue && (
                      <span className="text-emerald-700">Sesudah: {log.afterValue}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
