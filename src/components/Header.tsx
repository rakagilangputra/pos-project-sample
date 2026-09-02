import React from 'react';
import {
  Store,
  Clock,
  Coins,
  History,
  Package,
  ShieldCheck,
  LayoutDashboard,
  ShoppingBag,
  UserCheck,
  ChevronDown,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { formatIDR } from '../utils/formatters';

interface HeaderProps {
  currentTab: 'pos' | 'dashboard' | 'audit';
  onSelectTab: (tab: 'pos' | 'dashboard' | 'audit') => void;
  onOpenSessionModal: () => void;
  onOpenHandoffModal: () => void;
  onOpenHeldOrdersModal: () => void;
  onOpenHistoryModal: () => void;
  onOpenInventoryModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  onOpenSessionModal,
  onOpenHandoffModal,
  onOpenHeldOrdersModal,
  onOpenHistoryModal,
  onOpenInventoryModal,
}) => {
  const { currentSession, currentUser, setAsideOrders, cart } = usePOS();

  return (
    <header className="h-16 shrink-0 bg-white border-b-2 border-[#E5DACE] px-3 sm:px-6 flex items-center justify-between shadow-xs select-none">
      {/* Brand & Store Name */}
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 bg-[#D97706] rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-xs">
          S
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-xl font-bold tracking-tight text-[#2D241E]">
              SweetCrust Bakery
            </h1>
            <span className="hidden sm:inline-block rounded-md bg-[#E5DACE]/60 px-2 py-0.5 text-[10px] font-bold text-[#8C7B6C] uppercase tracking-wider">
              Register 01
            </span>
          </div>
          <p className="text-xs font-medium text-[#8C7B6C] hidden sm:block">Touchscreen Bakery POS</p>
        </div>
      </div>

      {/* Center Navigation Tabs */}
      <nav className="flex items-center gap-1 rounded-2xl bg-[#FDFBF7] border border-[#E5DACE] p-1">
        <button
          onClick={() => onSelectTab('pos')}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition active:scale-95 ${
            currentTab === 'pos'
              ? 'bg-[#D97706] text-white shadow-xs'
              : 'text-[#8C7B6C] hover:text-[#2D241E]'
          }`}
        >
          <ShoppingBag className="h-4 w-4" />
          <span>Kasir (POS)</span>
        </button>

        <button
          onClick={() => onSelectTab('dashboard')}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition active:scale-95 ${
            currentTab === 'dashboard'
              ? 'bg-[#D97706] text-white shadow-xs'
              : 'text-[#8C7B6C] hover:text-[#2D241E]'
          }`}
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => onSelectTab('audit')}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition active:scale-95 ${
            currentTab === 'audit'
              ? 'bg-[#D97706] text-white shadow-xs'
              : 'text-[#8C7B6C] hover:text-[#2D241E]'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Audit Log</span>
        </button>
      </nav>

      {/* Right Actions & Operator Status */}
      <div className="flex items-center gap-2">
        {/* Parkir Nota Shortcut Badge (POS-US-012) */}
        {setAsideOrders.length > 0 && (
          <button
            onClick={onOpenHeldOrdersModal}
            className="flex items-center gap-1.5 rounded-2xl bg-[#D97706] px-3 py-2 text-xs font-bold text-white shadow-sm hover:brightness-95 active:scale-95 animate-pulse"
          >
            <Clock className="h-4 w-4" />
            <span>{setAsideOrders.length} Diparkir</span>
          </button>
        )}

        {/* Riwayat Transaksi Shortcut */}
        <button
          onClick={onOpenHistoryModal}
          className="hidden md:flex items-center gap-1.5 rounded-2xl border-2 border-[#E5DACE] bg-white px-3 py-2 text-xs font-bold text-[#2D241E] hover:border-[#D97706] active:scale-95 transition"
          title="Lihat Riwayat Nota, Void & Refund"
        >
          <History className="h-4 w-4 text-[#8C7B6C]" />
          <span>Riwayat</span>
        </button>

        {/* Manajemen Stok Shortcut */}
        <button
          onClick={onOpenInventoryModal}
          className="hidden md:flex items-center gap-1.5 rounded-2xl border-2 border-[#E5DACE] bg-white px-3 py-2 text-xs font-bold text-[#2D241E] hover:border-[#D97706] active:scale-95 transition"
          title="Manajemen & Koreksi Stok Roti"
        >
          <Package className="h-4 w-4 text-[#8C7B6C]" />
          <span>Stok</span>
        </button>

        {/* Status Shift & Kas (POS-US-003, POS-US-005) */}
        <button
          onClick={onOpenSessionModal}
          className={`flex items-center gap-2 rounded-2xl border-2 px-3 py-2 text-xs font-bold transition active:scale-95 ${
            currentSession
              ? 'border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
              : 'border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100'
          }`}
        >
          <Coins className={`h-4 w-4 ${currentSession ? 'text-[#059669]' : 'text-rose-600'}`} />
          <span className="hidden sm:inline">
            {currentSession ? `Shift: ${formatIDR(currentSession.expectedCash)}` : 'Buka Shift'}
          </span>
        </button>

        {/* Active Cashier Switcher Profile (POS-US-004) */}
        <button
          onClick={onOpenHandoffModal}
          className="flex items-center gap-2.5 rounded-2xl border-2 border-[#E5DACE] bg-white p-1.5 pr-3 hover:border-[#D97706] active:scale-95 transition shadow-xs"
        >
          <div className="h-8 w-8 rounded-full bg-[#E5DACE] text-[#2D241E] flex items-center justify-center font-bold text-xs">
            {currentUser.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
          </div>
          <div className="text-left leading-tight hidden lg:block">
            <span className="block text-xs font-bold text-[#2D241E]">{currentUser.name}</span>
            <span className="block text-[10px] font-semibold text-[#8C7B6C] uppercase">{currentUser.role}</span>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-[#8C7B6C]" />
        </button>
      </div>
    </header>
  );
};
