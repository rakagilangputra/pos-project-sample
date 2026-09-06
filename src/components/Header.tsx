import React, { useState } from 'react';
import {
  Store,
  Clock,
  Coins,
  Package,
  ShieldCheck,
  LayoutDashboard,
  ShoppingBag,
  ChevronDown,
  Building2,
  MoreHorizontal,
  ClipboardList,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { formatIDR } from '../utils/formatters';

export type MainWorkspaceTab = 'pos' | 'pesanan' | 'dashboard' | 'audit' | 'konsinyasi' | 'stok';

interface HeaderProps {
  currentTab: MainWorkspaceTab;
  onSelectTab: (tab: MainWorkspaceTab) => void;
  onOpenSessionModal: () => void;
  onOpenHandoffModal: () => void;
  onOpenHeldOrdersModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  onOpenSessionModal,
  onOpenHandoffModal,
  onOpenHeldOrdersModal,
}) => {
  const { currentSession, currentUser, setAsideOrders, settlementCycles, orders } = usePOS();
  const [isOverflowMenuOpen, setIsOverflowMenuOpen] = useState(false);

  // Check overdue or due cycles (POS-US-034 & POS-US-047)
  const overdueCount = settlementCycles.filter((c) => c.status === 'overdue').length;
  const dueTodayCount = settlementCycles.filter((c) => c.status === 'due').length;

  const activePoCount = orders.filter(
    (o) =>
      (o.isMadeToOrder || o.poNumber) &&
      (o.orderStatus === 'active' || o.orderStatus === 'ready_for_pickup' || o.orderStatus === 'overdue')
  ).length;

  const isCashier = currentUser.role === 'cashier';

  // Navigation tabs configuration (POS-US-047 AC-01, AC-02)
  const allTabs: {
    id: MainWorkspaceTab;
    label: string;
    icon: React.ReactNode;
    badge?: React.ReactNode;
    restrictedToManagement?: boolean;
  }[] = [
    {
      id: 'pos',
      label: 'Kasir (POS)',
      icon: <ShoppingBag className="h-3.5 w-3.5" />,
    },
    {
      id: 'pesanan',
      label: 'Pesanan',
      icon: <ClipboardList className="h-3.5 w-3.5" />,
      restrictedToManagement: false,
      badge:
        activePoCount > 0 ? (
          <span className="rounded-full bg-amber-500 px-1.5 py-0.2 text-[9px] font-bold text-white">
            {activePoCount}
          </span>
        ) : null,
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="h-3.5 w-3.5" />,
      restrictedToManagement: true,
    },
    {
      id: 'audit',
      label: 'Audit Log',
      icon: <ShieldCheck className="h-3.5 w-3.5" />,
      restrictedToManagement: true,
    },
    {
      id: 'konsinyasi',
      label: 'Konsinyasi',
      icon: <Building2 className="h-3.5 w-3.5" />,
      restrictedToManagement: true,
      badge:
        overdueCount > 0 ? (
          <span className="rounded-full bg-rose-600 px-1.5 py-0.2 text-[9px] font-bold text-white">
            {overdueCount} Overdue
          </span>
        ) : dueTodayCount > 0 ? (
          <span className="rounded-full bg-amber-600 px-1.5 py-0.2 text-[9px] font-bold text-white">
            {dueTodayCount} Due
          </span>
        ) : null,
    },
    {
      id: 'stok',
      label: 'Stok',
      icon: <Package className="h-3.5 w-3.5" />,
      restrictedToManagement: true,
    },
  ];

  // Filter tabs by role: Cashiers only see 'pos' (POS-US-047 AC-02)
  const visibleTabs = allTabs.filter((tab) => {
    if (isCashier && tab.restrictedToManagement) return false;
    return true;
  });

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

      {/* Center Navigation Tabs (POS-US-047 AC-01, AC-02, AC-03, AC-04) */}
      <nav className="flex items-center gap-1 rounded-lg bg-[#F7F7F5] border border-[#E5E7EB] p-0.5 max-w-full">
        {/* Desktop Visible Tabs */}
        <div className="flex items-center gap-1">
          {visibleTabs.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`nav-tab-${tab.id}`}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-1.5 rounded-md px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition active:scale-95 whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-[#1F2937] shadow-xs border border-[#E5E7EB]'
                    : 'text-[#6B7280] hover:text-[#1F2937]'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Right Actions & Operator Status */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Parkir Nota Shortcut Badge (POS-US-012) */}
        {setAsideOrders.length > 0 && (
          <button
            onClick={onOpenHeldOrdersModal}
            className="flex items-center gap-1.5 rounded-lg bg-[#D97706] px-2.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-amber-700 active:scale-95"
            title="Daftar Nota Diparkir / Ditunda"
          >
            <Clock className="h-3.5 w-3.5" />
            <span>{setAsideOrders.length} Diparkir</span>
          </button>
        )}

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
