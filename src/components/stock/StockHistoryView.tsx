import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  ArrowDownRight,
  ArrowUpRight,
  ClipboardCheck,
  Truck,
  AlertTriangle,
  Building2,
  Calendar,
} from 'lucide-react';
import { usePOS } from '../../context/POSContext';
import { formatDateTime } from '../../utils/formatters';

interface StockHistoryViewProps {
  onBackToProducts: () => void;
}

export const StockHistoryView: React.FC<StockHistoryViewProps> = ({
  onBackToProducts,
}) => {
  const { selectedBranch, getStockHistory } = usePOS();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const historyList = useMemo(() => {
    return getStockHistory(undefined, selectedBranch.id);
  }, [getStockHistory, selectedBranch.id]);

  const filteredHistory = useMemo(() => {
    return historyList.filter((item) => {
      // Filter type
      if (filterType !== 'all') {
        if (filterType === 'receiving' && item.type !== 'receiving') return false;
        if (filterType === 'daily_closing' && item.type !== 'daily_closing') return false;
        if (filterType === 'transfer' && !item.type.startsWith('transfer')) return false;
        if (filterType === 'bad_stock' && item.type !== 'bad_stock') return false;
      }

      // Search
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesProd = item.productName.toLowerCase().includes(q);
        const matchesSku = item.sku.toLowerCase().includes(q);
        const matchesRef = item.referenceNo.toLowerCase().includes(q);
        const matchesActor = item.actorName.toLowerCase().includes(q);
        if (!matchesProd && !matchesSku && !matchesRef && !matchesActor) return false;
      }

      return true;
    });
  }, [historyList, filterType, search]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5DACE] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-black text-base text-[#2D241E]">
              Riwayat Pergerakan Stok Cabang (Audit Trail)
            </h3>
            <span className="rounded-md bg-amber-100 text-amber-900 px-2 py-0.5 text-[11px] font-bold">
              {selectedBranch.name}
            </span>
          </div>
          <p className="text-xs text-[#8C7B6C] mt-0.5">
            Catatan penerimaan barang, penutupan harian, transfer cabang, dan disposisi stok buruk.
          </p>
        </div>

        <button
          type="button"
          onClick={onBackToProducts}
          className="rounded-xl border border-[#E5DACE] bg-white px-4 py-2 text-xs font-bold text-[#6D5D50] hover:bg-[#FDFBF7] transition self-start"
        >
          Kembali ke Daftar Produk
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border-2 border-[#E5DACE] p-3 rounded-2xl shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C7B6C]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari produk, SKU, no referensi, atau operator..."
            className="w-full rounded-xl border border-[#E5DACE] bg-[#FDFBF7] pl-9 pr-3 py-1.5 text-xs font-medium text-[#2D241E] focus:outline-none focus:border-[#D97706]"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: 'Semua' },
            { id: 'receiving', label: 'Penerimaan' },
            { id: 'daily_closing', label: 'Closing Harian' },
            { id: 'transfer', label: 'Transfer' },
            { id: 'bad_stock', label: 'Stok Buruk' },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setFilterType(pill.id)}
              className={`rounded-xl px-3 py-1 text-xs font-bold transition ${
                filterType === pill.id
                  ? 'bg-[#D97706] text-white'
                  : 'bg-[#FDFBF7] text-[#6D5D50] border border-[#E5DACE] hover:bg-amber-50'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-2.5">
        {filteredHistory.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-2xl bg-white border border-[#E5DACE] p-8 text-center text-[#8C7B6C]">
            <History className="h-10 w-10 opacity-30 mb-2 text-[#8C7B6C]" />
            <p className="font-black text-sm text-[#2D241E]">Tidak Ada Catatan Riwayat</p>
            <p className="text-xs text-[#8C7B6C] max-w-sm mt-1">
              Tidak ditemukan data pergerakan stok yang sesuai dengan kriteria pencarian.
            </p>
          </div>
        ) : (
          filteredHistory.map((item) => {
            const isPositive = item.quantityChange > 0;
            const isNeutral = item.quantityChange === 0;

            return (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl border-2 border-[#E5DACE] bg-white p-3.5 text-xs gap-3 shadow-xs"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-black text-sm text-[#2D241E]">{item.productName}</span>
                    <span className="font-mono text-[10px] text-[#8C7B6C]">{item.sku}</span>

                    {/* Badge */}
                    {item.type === 'receiving' && (
                      <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        Penerimaan Barang
                      </span>
                    )}
                    {item.type === 'daily_closing' && (
                      <span className="rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                        Penutupan Harian
                      </span>
                    )}
                    {item.type === 'transfer_out' && (
                      <span className="rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                        {item.typeLabel}
                      </span>
                    )}
                    {item.type === 'transfer_in' && (
                      <span className="rounded-md bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
                        {item.typeLabel}
                      </span>
                    )}
                    {item.type === 'bad_stock' && (
                      <span className="rounded-md bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                        Stok Buruk / Kedaluwarsa
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#2D241E] font-medium">{item.notes}</p>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#8C7B6C]">
                    <span>Ref: <strong className="font-mono text-[#2D241E]">{item.referenceNo}</strong></span>
                    <span>•</span>
                    <span>Operator: {item.actorName}</span>
                    <span>•</span>
                    <span>{formatDateTime(item.timestamp)}</span>
                  </div>
                </div>

                <div className="sm:text-right shrink-0 border-t sm:border-t-0 border-[#E5DACE] pt-2 sm:pt-0">
                  <span
                    className={`font-black text-sm inline-block rounded-lg px-2.5 py-1 ${
                      isPositive
                        ? 'bg-emerald-100 text-emerald-900'
                        : isNeutral
                        ? 'bg-gray-100 text-gray-700'
                        : 'bg-rose-100 text-rose-900'
                    }`}
                  >
                    {isPositive ? `+${item.quantityChange}` : item.quantityChange} pcs
                  </span>

                  {item.previousStock !== undefined && item.resultingStock !== undefined && (
                    <div className="text-[11px] text-[#8C7B6C] mt-1">
                      Stok: {item.previousStock} → <strong className="text-[#2D241E]">{item.resultingStock}</strong>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom-Right Tutup button */}
      <div className="flex items-center justify-end border-t border-[#E5DACE] pt-3">
        <button
          type="button"
          onClick={onBackToProducts}
          className="rounded-xl border border-[#E5DACE] bg-white px-6 py-2 text-xs font-black text-[#2D241E] hover:bg-[#E5DACE] active:scale-95 transition"
        >
          Tutup
        </button>
      </div>
    </div>
  );
};
