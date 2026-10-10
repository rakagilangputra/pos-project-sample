import React from 'react';
import { AlertTriangle, Calendar, History, Layers, Package, Truck, Wheat } from 'lucide-react';
import type { StockLocalView } from '../StockWorkspace';

interface StokSidebarProps {
  activeView: StockLocalView;
  onSelectView: (view: StockLocalView) => void;
}

const stokViews = [
  { id: 'products', label: 'Produk (Informasi Stok)', icon: Package },
  { id: 'categories', label: 'Rekonsiliasi Kadaluwarsa (Closing)', icon: Calendar },
  { id: 'transfers', label: 'Transfer Stok', icon: Truck },
  { id: 'bad_stock', label: 'Stok Buruk / Kedaluwarsa', icon: AlertTriangle },
  { id: 'receiving', label: 'Penerimaan Barang', icon: Layers },
  { id: 'history', label: 'Riwayat Stok', icon: History },
  { id: 'raw_materials', label: 'Raw Material (Bahan Baku)', icon: Wheat },
] satisfies { id: StockLocalView; label: string; icon: typeof Package }[];

export const StokSidebar: React.FC<StokSidebarProps> = ({ activeView, onSelectView }) => (
  <aside className="order-first shrink-0 rounded-2xl border border-[#E5DACE] bg-white p-3 lg:order-last lg:h-full lg:w-[280px] lg:overflow-y-auto lg:p-4">
    <div className="hidden border-b border-[#E5DACE] px-2 pb-5 pt-2 lg:block">
      <h2 className="text-sm font-black text-[#2D241E]">STOK</h2>
      <p className="mt-1 text-xs text-[#8C7B6C]">Manajemen stok &amp; inventaris</p>
    </div>
    <nav aria-label="Submenu Stok" className="flex gap-1 overflow-x-auto sm:grid sm:grid-cols-3 sm:overflow-visible lg:mt-4 lg:grid-cols-1 lg:gap-2">
      {stokViews.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          id={id === 'raw_materials' ? 'stock-tab-raw-material' : `stock-tab-${id}`}
          type="button"
          aria-current={activeView === id ? 'page' : undefined}
          onClick={() => onSelectView(id)}
          className={`flex min-w-0 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-left text-[11px] font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97706] sm:whitespace-normal lg:gap-3 lg:py-3 lg:text-xs ${
            activeView === id
              ? 'bg-amber-50 text-[#D97706]'
              : 'text-[#6D5D50] hover:bg-[#FDFBF7] hover:text-[#2D241E]'
          }`}
        >
          <Icon className="h-4 w-4 shrink-0 lg:h-5 lg:w-5" aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  </aside>
);
