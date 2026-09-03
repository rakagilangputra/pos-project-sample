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
  Building2,
  AlertTriangle,
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
  onOpenConsignmentModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  onOpenSessionModal,
  onOpenHandoffModal,
  onOpenHeldOrdersModal,
  onOpenHistoryModal,
  onOpenInventoryModal,
  onOpenConsignmentModal,
}) => {
  const { currentSession, currentUser, setAsideOrders, settlementCycles } = usePOS();

  // Check overdue or due cycles (POS-US-034)
  const overdueCount = settlementCycles.filter((c) => c.status === 'overdue').length;
  const dueTodayCount = settlementCycles.filter((c) => c.status === 'due').length;

  return (
    <header className="h-14 shrink-0 bg-white border-b border-[#E5E7EB] px-3 sm:px-5 flex items-center justify-between select-none">
      {/* Brand & Store Name */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-[#D97706] rounded-lg flex items-center justify-center text-white font-bold text-base shadow-xs">
          S
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-bold tracking-tight text-[#1F2937]">
              SweetCrust Bakery
            </h1>
            <span className="hidden sm:inline-block rounded bg-[#F7F7F5] border border-[#E5E7EB] px-1.5 py-0.2 text-[10px] font-medium text-[#6B7280]">
              Reg 01
            </span>
          </div>
        </div>
      </div>

      {/* Center Navigation Tabs */}
      <nav className="flex items-center gap-1 rounded-lg bg-[#F7F7F5] border border-[#E5E7EB] p-0.5">
        <button
          onClick={() => onSelectTab('pos')}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
            currentTab === 'pos'
              ? 'bg-white text-[#1F2937] shadow-xs border border-[#E5E7EB]'
              : 'text-[#6B7280] hover:text-[#1F2937]'
          }`}
        >
          <ShoppingBag className="h-3.5 w-3.5" />
          <span>Kasir (POS)</span>
        </button>

        <button
          onClick={() => onSelectTab('dashboard')}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
            currentTab === 'dashboard'
              ? 'bg-white text-[#1F2937] shadow-xs border border-[#E5E7EB]'
              : 'text-[#6B7280] hover:text-[#1F2937]'
          }`}
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => onSelectTab('audit')}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
            currentTab === 'audit'
              ? 'bg-white text-[#1F2937] shadow-xs border border-[#E5E7EB]'
              : 'text-[#6B7280] hover:text-[#1F2937]'
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Audit Log</span>
        </button>
      </nav>

      {/* Right Actions & Operator Status */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Parkir Nota Shortcut Badge (POS-US-012) */}
        {setAsideOrders.length > 0 && (
          <button
            onClick={onOpenHeldOrdersModal}
            className="flex items-center gap-1.5 rounded-lg bg-[#D97706] px-2.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-amber-700 active:scale-95"
          >
            <Clock className="h-3.5 w-3.5" />
            <span>{setAsideOrders.length} Diparkir</span>
          </button>
        )}

        {/* Konsinyasi Management Shortcut (POS-US-030 to 035) */}
        <button
          id="header-consignment-btn"
          onClick={onOpenConsignmentModal}
          className={`relative flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition active:scale-95 ${
            overdueCount > 0
              ? 'border-rose-400 bg-rose-50 text-rose-800'
              : dueTodayCount > 0
              ? 'border-amber-400 bg-amber-50 text-amber-900'
              : 'border-[#E5E7EB] bg-white text-[#1F2937] hover:border-[#D97706]'
          }`}
          title="Manajemen Titipan & Settlement Konsinyasi"
        >
          <Building2 className="h-3.5 w-3.5 text-[#D97706]" />
          <span className="hidden sm:inline">Konsinyasi</span>
          {(overdueCount > 0 || dueTodayCount > 0) && (
            <span
              className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold text-white ${
                overdueCount > 0 ? 'bg-rose-600' : 'bg-amber-600'
              }`}
            >
              {overdueCount > 0 ? `${overdueCount} Overdue` : `${dueTodayCount} Due`}
            </span>
          )}
        </button>

        {/* Riwayat Transaksi Shortcut */}
        <button
          onClick={onOpenHistoryModal}
          className="hidden md:flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#1F2937] hover:border-[#D97706] active:scale-95 transition"
          title="Lihat Riwayat Nota, Void & Refund"
        >
          <History className="h-3.5 w-3.5 text-[#6B7280]" />
          <span>Riwayat</span>
        </button>

        {/* Manajemen Stok Shortcut */}
        <button
          id="header-stock-btn"
          onClick={onOpenInventoryModal}
          className="hidden md:flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#1F2937] hover:border-[#D97706] active:scale-95 transition"
          title="Manajemen & Koreksi Stok Roti"
        >
          <Package className="h-3.5 w-3.5 text-[#6B7280]" />
          <span>Stok</span>
        </button>

        {/* Status Shift & Kas (POS-US-003, POS-US-005) */}
        <button
          onClick={onOpenSessionModal}
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition active:scale-95 ${
            currentSession
              ? 'border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
              : 'border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100'
          }`}
        >
          <Coins className={`h-3.5 w-3.5 ${currentSession ? 'text-[#059669]' : 'text-rose-600'}`} />
          <span className="hidden sm:inline">
            {currentSession ? `Kas: ${formatIDR(currentSession.expectedCash)}` : 'Buka Shift'}
          </span>
        </button>

        {/* Active Cashier Switcher Profile (POS-US-004) */}
        <button
          onClick={onOpenHandoffModal}
          className="flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white p-1 pr-2 hover:border-[#D97706] active:scale-95 transition"
        >
          <div className="h-6 w-6 rounded-full bg-[#F7F7F5] border border-[#E5E7EB] text-[#1F2937] flex items-center justify-center font-bold text-[10px]">
            {currentUser.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
          </div>
          <div className="text-left leading-tight hidden lg:block">
            <span className="block text-xs font-bold text-[#1F2937]">{currentUser.name}</span>
            <span className="block text-[9px] font-medium text-[#6B7280] uppercase">{currentUser.role}</span>
          </div>
          <ChevronDown className="h-3 w-3 text-[#6B7280]" />
        </button>
      </div>
    </header>

  );
};
