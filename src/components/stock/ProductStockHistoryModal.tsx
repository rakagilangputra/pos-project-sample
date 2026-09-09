import React, { useState, useMemo } from 'react';
import {
  X,
  History,
  Package,
  Calendar,
  Truck,
  ArrowDownRight,
  ArrowUpRight,
  AlertTriangle,
  ClipboardCheck,
  Building2,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import { Product, StockHistoryItem } from '../../types';
import { formatDateTime } from '../../utils/formatters';

interface ProductStockHistoryModalProps {
  product: Product | null;
  branchName: string;
  historyItems: StockHistoryItem[];
  onClose: () => void;
}

export const ProductStockHistoryModal: React.FC<ProductStockHistoryModalProps> = ({
  product,
  branchName,
  historyItems,
  onClose,
}) => {
  const [filterType, setFilterType] = useState<string>('all');

  const filteredHistory = useMemo(() => {
    if (!product) return [];
    return historyItems.filter((item) => {
      if (item.productId !== product.id) return false;
      if (filterType !== 'all') {
        if (filterType === 'receiving' && item.type !== 'receiving') return false;
        if (filterType === 'daily_closing' && item.type !== 'daily_closing') return false;
        if (filterType === 'transfer' && !item.type.startsWith('transfer')) return false;
        if (filterType === 'bad_stock' && item.type !== 'bad_stock') return false;
      }
      return true;
    });
  }, [historyItems, product, filterType]);

  if (!product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn">
      <div className="flex w-full max-w-3xl max-h-[90vh] flex-col rounded-3xl bg-[#FDFBF7] border-2 border-[#E5DACE] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5DACE] bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-[#D97706] border border-amber-200">
              <History className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-[#2D241E]">
                  Riwayat Stok — {product.name}
                </h3>
                <span className="rounded-lg bg-[#F5EFEB] px-2 py-0.5 text-[11px] font-bold text-[#6D5D50]">
                  {product.sku}
                </span>
              </div>
              <p className="text-xs text-[#8C7B6C] flex items-center gap-1.5 mt-0.5">
                <Building2 className="h-3.5 w-3.5" />
                <span>{branchName}</span>
                <span>•</span>
                <span>Stok Saat Ini: <strong>{product.stock} pcs</strong></span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#E5DACE] bg-white text-[#8C7B6C] hover:bg-[#F5EFEB] hover:text-[#2D241E] transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#E5DACE] bg-[#FDFBF7] px-6 py-3">
          <span className="text-xs font-bold text-[#8C7B6C] flex items-center gap-1 mr-1">
            <Filter className="h-3.5 w-3.5" />
            Filter:
          </span>
          {[
            { id: 'all', label: 'Semua Riwayat' },
            { id: 'receiving', label: 'Penerimaan' },
            { id: 'daily_closing', label: 'Penutupan Harian' },
            { id: 'transfer', label: 'Transfer Cabang' },
            { id: 'bad_stock', label: 'Stok Buruk / Expired' },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setFilterType(pill.id)}
              className={`rounded-xl px-3 py-1 text-xs font-bold transition ${
                filterType === pill.id
                  ? 'bg-[#D97706] text-white shadow-xs'
                  : 'bg-white text-[#6D5D50] border border-[#E5DACE] hover:bg-amber-50/60'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* List of Records */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filteredHistory.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center rounded-2xl bg-white border border-[#E5DACE] p-8 text-center text-[#8C7B6C]">
              <History className="h-12 w-12 opacity-30 mb-2.5 text-[#8C7B6C]" />
              <p className="font-black text-sm text-[#2D241E]">
                Belum Ada Riwayat Pergerakan Stok
              </p>
              <p className="text-xs text-[#8C7B6C] max-w-sm mt-1">
                Produk ini belum memiliki catatan penerimaan barang, penutupan harian, transfer cabang, maupun pencatatan stok buruk di cabang {branchName}.
              </p>
            </div>
          ) : (
            filteredHistory.map((item) => {
              const isPositive = item.quantityChange > 0;
              const isNeutral = item.quantityChange === 0;

              return (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl border-2 border-[#E5DACE] bg-white p-4 text-xs gap-3 shadow-xs"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Event Type Badge */}
                      {item.type === 'receiving' && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                          <ArrowDownRight className="h-3.5 w-3.5" />
                          Penerimaan Barang
                        </span>
                      )}
                      {item.type === 'daily_closing' && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                          <ClipboardCheck className="h-3.5 w-3.5" />
                          Penutupan Harian
                        </span>
                      )}
                      {item.type === 'transfer_out' && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-bold text-blue-800">
                          <Truck className="h-3.5 w-3.5" />
                          {item.typeLabel}
                        </span>
                      )}
                      {item.type === 'transfer_in' && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[11px] font-bold text-indigo-800">
                          <Truck className="h-3.5 w-3.5" />
                          {item.typeLabel}
                        </span>
                      )}
                      {item.type === 'bad_stock' && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 border border-rose-200 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Stok Buruk / Kedaluwarsa
                        </span>
                      )}
                      {item.type === 'manual' && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 border border-gray-200 px-2 py-0.5 text-[11px] font-bold text-gray-800">
                          Koreksi Manual
                        </span>
                      )}

                      <span className="text-[11px] text-[#8C7B6C] font-mono font-semibold">
                        Ref: {item.referenceNo}
                      </span>
                    </div>

                    <p className="text-xs text-[#2D241E] font-medium leading-relaxed">
                      {item.notes}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#8C7B6C]">
                      <span>Operator: <strong className="text-[#6D5D50]">{item.actorName}</strong></span>
                      <span>•</span>
                      <span>{formatDateTime(item.timestamp)}</span>
                    </div>
                  </div>

                  {/* Quantity & Stock Change */}
                  <div className="sm:text-right border-t sm:border-t-0 border-[#E5DACE] pt-2 sm:pt-0 shrink-0">
                    <div
                      className={`text-sm font-black inline-block rounded-lg px-2 py-0.5 ${
                        isPositive
                          ? 'bg-emerald-100 text-emerald-900'
                          : isNeutral
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-rose-100 text-rose-900'
                      }`}
                    >
                      {isPositive ? `+${item.quantityChange}` : `${item.quantityChange}`} pcs
                    </div>

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

        {/* Footer with Bottom-Right Tutup button */}
        <div className="flex items-center justify-end border-t border-[#E5DACE] bg-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#E5DACE] bg-[#FDFBF7] px-6 py-2.5 text-xs font-black text-[#2D241E] hover:bg-[#E5DACE] active:scale-95 transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
