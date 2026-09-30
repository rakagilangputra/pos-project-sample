import React, { useState, useRef, useEffect } from 'react';
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
  Lock,
  Eye,
  CheckCircle2,
  ClipboardList,
  Check,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { formatIDR } from '../utils/formatters';

export type MainWorkspaceTab =
  | 'pos'
  | 'pesanan'
  | 'dashboard'
  | 'audit'
  | 'konsinyasi'
  | 'stok'
  | 'backoffice';

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
  const {
    currentSession,
    currentUser,
    setAsideOrders,
    selectedBranch,
    branches,
    requestSwitchBranch,
    setIsStoreSelectionModalOpen,
    isBranchReadOnly,
  } = usePOS();

  const [isStoreDropdownOpen, setIsStoreDropdownOpen] = useState(false);
  const storeDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (storeDropdownRef.current && !storeDropdownRef.current.contains(e.target as Node)) {
        setIsStoreDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isCashier = currentUser.role === 'cashier';
  const isSuperadmin = currentUser.role === 'admin';

  // Navigation tabs configuration
  const allTabs: {
    id: MainWorkspaceTab;
    label: string;
    icon: React.ReactNode;
    restrictedToManagement?: boolean;
    restrictedToSuperadmin?: boolean;
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
      // Intentionally no badge. The old "N Overdue" / "N Due" pill was driven by seeded
      // settlement cycles whose `status` was hard-coded, so the warning could never clear
      // as time passed. Retired seeds are purged in POSContext (RETIRED_SEED_IDS).
      id: 'konsinyasi',
      label: 'Konsinyasi',
      icon: <Building2 className="h-3.5 w-3.5" />,
      restrictedToManagement: true,
    },
    {
      id: 'stok',
      label: 'Stok',
      icon: <Package className="h-3.5 w-3.5" />,
      restrictedToManagement: true,
    },
    {
      id: 'backoffice',
      label: 'Backoffice HQ',
      icon: <Store className="h-3.5 w-3.5" />,
      restrictedToSuperadmin: true,
    },
  ];

  // Filter tabs by role
  const visibleTabs = allTabs.filter((tab) => {
    if (tab.restrictedToSuperadmin && !isSuperadmin) return false;
    if (tab.restrictedToManagement && isCashier) return false;
    return true;
  });

  // Eligible branches for quick switch dropdown
  const selectableBranches = isSuperadmin
    ? branches
    : branches.filter(
        (b) =>
          Array.isArray(currentUser.assignedBranchIds) &&
          currentUser.assignedBranchIds.includes(b.id) &&
          b.status === 'active'
      );

  const handleBranchClick = (branchId: string) => {
    setIsStoreDropdownOpen(false);
    requestSwitchBranch(branchId);
  };

  return (
    <header className="h-14 shrink-0 bg-white border-b border-[#E5E7EB] px-3 sm:px-5 flex items-center justify-between select-none relative z-40">
      {/* Left: Persistent Store Selector */}
      <div className="flex items-center gap-2">
        {/* Persistent Top-Bar Store Selector */}
        <div className="relative" ref={storeDropdownRef}>
          {isCashier ? (
            /* Cashier: Branch locked by session */
            <div
              id="current-store-display-locked"
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50/80 px-2.5 py-1 text-xs text-gray-700 shadow-2xs"
              title={isBranchReadOnly ? 'Mode Lihat Saja (Read-only)' : 'Cabang Aktif Beroperasi'}
            >
              {isBranchReadOnly ? (
                <Eye className="h-3.5 w-3.5 text-rose-600 shrink-0" />
              ) : (
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
              <span className="font-semibold text-gray-900 max-w-[140px] truncate">
                {selectedBranch?.name || 'Senopati'}
              </span>
              {isBranchReadOnly && (
                <span className="rounded bg-rose-100 px-1 py-0.2 text-[9px] font-bold text-rose-700">
                  Lihat
                </span>
              )}
            </div>
          ) : (
            /* Supervisor / Superadmin: Compact Interactive Selector */
            <div className="relative">
              <button
                id="current-store-selector-btn"
                type="button"
                onClick={() => setIsStoreDropdownOpen((prev) => !prev)}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition active:scale-95 shadow-2xs ${
                  isBranchReadOnly
                    ? 'border-rose-200 bg-rose-50/80 text-rose-900 hover:bg-rose-100/80'
                    : 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50 hover:border-gray-300'
                }`}
                title={isBranchReadOnly ? 'Cabang dalam mode Lihat Saja (Read-only) - Klik untuk beralih' : 'Cabang Aktif & Dapat Dioperasikan - Klik untuk beralih'}
              >
                {isBranchReadOnly ? (
                  <Eye className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                ) : (
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}
                <span className="font-bold text-gray-900 max-w-[130px] sm:max-w-[160px] truncate">
                  {selectedBranch?.name || 'Pilih Cabang'}
                </span>
                {isBranchReadOnly ? (
                  <span className="flex items-center gap-0.5 rounded bg-rose-100 px-1 py-0.2 text-[9px] font-bold text-rose-700">
                    Lihat
                  </span>
                ) : (
                  <span className="hidden xl:inline-block rounded bg-emerald-50 px-1 py-0.2 text-[9px] font-bold text-emerald-700 border border-emerald-200">
                    Aktif
                  </span>
                )}
                <ChevronDown className="h-3 w-3 text-gray-400 shrink-0 ml-0.5" />
              </button>

              {/* Dropdown Menu */}
              {isStoreDropdownOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-64 rounded-2xl border border-gray-200 bg-white p-2 shadow-xl animate-in fade-in zoom-in-95 duration-150 z-50">
                  <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Pilih Cabang Toko
                  </div>
                  <div className="space-y-1 mt-1">
                    {selectableBranches.map((b) => {
                      const isSelected = selectedBranch?.id === b.id;
                      const isInactive = !isSuperadmin && b.status === 'inactive';

                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => handleBranchClick(b.id)}
                          className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs transition ${
                            isSelected
                              ? 'bg-amber-50 font-bold text-amber-950'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              {isInactive ? (
                                <Eye className="h-3 w-3 text-rose-500" />
                              ) : (
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                              )}
                              <span className="font-bold text-gray-900">{b.name}</span>
                            </div>
                            <span className="text-[10px] text-gray-400 ml-3">{b.code} • {b.city}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {isInactive ? (
                              <span className="rounded bg-rose-100 px-1 py-0.2 text-[9px] font-bold text-rose-700">
                                Lihat
                              </span>
                            ) : (
                              <span className="rounded bg-emerald-50 px-1 py-0.2 text-[9px] font-bold text-emerald-700">
                                Aktif
                              </span>
                            )}
                            {isSelected && <Check className="h-4 w-4 text-amber-600" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  
                  <div className="mt-2 border-t border-gray-100 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsStoreDropdownOpen(false);
                        setIsStoreSelectionModalOpen(true);
                      }}
                      className="w-full rounded-xl py-1.5 text-center text-xs font-bold text-amber-700 hover:bg-amber-50 transition"
                    >
                      Buka Layar Pilih Cabang...
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Center: Navigation Tabs */}
      <nav className="flex items-center gap-1 rounded-lg bg-[#F7F7F5] border border-[#E5E7EB] p-0.5 max-w-full overflow-x-auto">
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
              </button>
            );
          })}
        </div>
      </nav>

      {/* Right: Actions & Operator Status */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Parkir Nota Shortcut Badge */}
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

        {/* Status Shift & Kas */}
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

        {/* Active Cashier Switcher Profile */}
        <button
          onClick={onOpenHandoffModal}
          className="flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white p-1 pr-2 hover:border-[#D97706] active:scale-95 transition"
        >
          <div className="h-6 w-6 rounded-full bg-[#F7F7F5] border border-[#E5E7EB] text-[#1F2937] flex items-center justify-center font-bold text-[10px]">
            {currentUser.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
          </div>
          <div className="text-left leading-tight hidden lg:block">
            <span className="block text-xs font-bold text-[#1F2937]">{currentUser.name}</span>
            <span className="block text-[9px] font-medium text-[#6B7280] uppercase">
              {currentUser.role === 'admin' ? 'Superadmin' : currentUser.role}
            </span>
          </div>
          <ChevronDown className="h-3 w-3 text-[#6B7280]" />
        </button>
      </div>
    </header>
  );
};
