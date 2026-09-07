import React, { useState, useEffect } from 'react';
import { POSProvider, usePOS } from './context/POSContext';
import { Header, MainWorkspaceTab } from './components/Header';
import { ProductCatalog } from './components/ProductCatalog';
import { OrderCart } from './components/OrderCart';
import { CustomerModal } from './components/CustomerModal';
import { PaymentModal } from './components/PaymentModal';
import { ReceiptModal } from './components/ReceiptModal';
import { SessionModal } from './components/SessionModal';
import { HandoffModal } from './components/HandoffModal';
import { SetAsideOrdersModal } from './components/SetAsideOrdersModal';
import { AdminDashboard } from './components/AdminDashboard';
import { AuditLogView } from './components/AuditLogView';
import { StockWorkspace } from './components/StockWorkspace';
import { ConsignmentWorkspace } from './components/ConsignmentWorkspace';
import { PesananWorkspace } from './components/PesananWorkspace';
import { TransactionHistorySubView } from './components/TransactionHistorySubView';
import { BackofficeWorkspace } from './components/BackofficeWorkspace';
import { SelectStoreScreen } from './components/SelectStoreScreen';
import { SwitchStoreConfirmModal } from './components/SwitchStoreConfirmModal';
import { ShoppingCart } from 'lucide-react';
import { formatIDR } from './utils/formatters';

const POSMainContent: React.FC = () => {
  const { cart, cartTotal, currentUser } = usePOS();

  // Active top-level workspace tab
  const [currentTab, setCurrentTab] = useState<MainWorkspaceTab>('pos');

  // Cashier internal sub-view: 'catalog' | 'history'
  const [cashierSubView, setCashierSubView] = useState<'catalog' | 'history'>('catalog');

  // Core Cashier Modals
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [isHandoffModalOpen, setIsHandoffModalOpen] = useState(false);
  const [isHeldOrdersModalOpen, setIsHeldOrdersModalOpen] = useState(false);

  // Mobile cart drawer toggle
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Enforce role-based access control:
  // Cashiers can access 'pos' and 'pesanan', but not management/backoffice tabs
  useEffect(() => {
    if (currentUser.role === 'cashier' && currentTab !== 'pos' && currentTab !== 'pesanan') {
      setCurrentTab('pos');
    }
    if (currentUser.role === 'supervisor' && currentTab === 'backoffice') {
      setCurrentTab('dashboard');
    }
  }, [currentUser.role, currentTab]);

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Guard navigation to cashier history when payment is currently in progress
  const handleOpenCashierHistory = () => {
    if (isPaymentModalOpen) {
      alert('Selesaikan atau batalkan proses pembayaran terlebih dahulu sebelum membuka riwayat transaksi.');
      return;
    }
    setCashierSubView('history');
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#FDFBF7] text-[#2D241E] font-sans antialiased">
      {/* Top Header Navigation (Role-aware primary workspace tabs with persistent Store selector) */}
      <Header
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (currentUser.role === 'cashier' && tab !== 'pos' && tab !== 'pesanan') {
            return;
          }
          if (currentUser.role === 'supervisor' && tab === 'backoffice') {
            return;
          }
          setCurrentTab(tab);
        }}
        onOpenSessionModal={() => setIsSessionModalOpen(true)}
        onOpenHandoffModal={() => setIsHandoffModalOpen(true)}
        onOpenHeldOrdersModal={() => setIsHeldOrdersModalOpen(true)}
      />

      {/* Main Workspace Area */}
      <main className="relative flex flex-1 min-h-0 overflow-hidden p-2.5 sm:p-4">
        {/* TAB 1: KASIR (POS) */}
        {currentTab === 'pos' && (
          <div className="flex h-full w-full gap-3 sm:gap-4 overflow-hidden">
            {/* Left Main Pane: Either Catalog OR Transaction History Sub-View */}
            <section className="flex-1 overflow-hidden flex flex-col">
              {cashierSubView === 'catalog' ? (
                <ProductCatalog
                  onOpenHistory={handleOpenCashierHistory}
                />
              ) : (
                <TransactionHistorySubView
                  onBackToCashier={() => setCashierSubView('catalog')}
                />
              )}
            </section>

            {/* Right Aside: Order Cart (Active cart state preserved during history navigation) */}
            <aside className="hidden md:flex w-[380px] lg:w-[430px] xl:w-[460px] bg-white border-2 border-[#E5DACE] rounded-[2rem] flex flex-col overflow-hidden shadow-lg">
              <OrderCart
                onOpenCustomerModal={() => setIsCustomerModalOpen(true)}
                onOpenPaymentModal={() => setIsPaymentModalOpen(true)}
              />
            </aside>

            {/* Mobile / Tablet Cart Floating Action Bar */}
            <div className="md:hidden fixed bottom-3 left-3 right-3 z-30">
              <button
                onClick={() => setIsMobileCartOpen(true)}
                className="flex w-full items-center justify-between rounded-2xl bg-[#D97706] px-5 py-4 text-white shadow-xl active:scale-95 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <ShoppingCart className="h-6 w-6" />
                    {cartItemCount > 0 && (
                      <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#059669] text-[11px] font-black text-white ring-2 ring-white">
                        {cartItemCount}
                      </span>
                    )}
                  </div>
                  <span className="font-extrabold text-base">Lihat Keranjang</span>
                </div>
                <span className="text-lg font-black">{formatIDR(cartTotal)}</span>
              </button>
            </div>

            {/* Mobile Cart Drawer Modal */}
            {isMobileCartOpen && (
              <div className="md:hidden fixed inset-0 z-50 flex flex-col bg-white animate-fadeIn">
                <div className="flex items-center justify-between border-b-2 border-[#E5DACE] px-4 py-3 bg-[#FDFBF7]">
                  <h3 className="font-extrabold text-base text-[#2D241E]">Keranjang Belanja</h3>
                  <button
                    onClick={() => setIsMobileCartOpen(false)}
                    className="rounded-xl border-2 border-[#E5DACE] px-3 py-1.5 text-xs font-bold text-[#8C7B6C] hover:text-[#2D241E]"
                  >
                    Tutup
                  </button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <OrderCart
                    onOpenCustomerModal={() => {
                      setIsMobileCartOpen(false);
                      setIsCustomerModalOpen(true);
                    }}
                    onOpenPaymentModal={() => {
                      setIsMobileCartOpen(false);
                      setIsPaymentModalOpen(true);
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PESANAN (Cashiers, Supervisors & Admin - Operational PO Management) */}
        {currentTab === 'pesanan' && (
          <PesananWorkspace
            onNavigateToPOS={() => setCurrentTab('pos')}
          />
        )}

        {/* TAB 3: DASHBOARD (Supervisors / Admin) */}
        {currentTab === 'dashboard' && currentUser.role !== 'cashier' && (
          <AdminDashboard
            onOpenConsignmentModal={() => setCurrentTab('konsinyasi')}
          />
        )}

        {/* TAB 4: AUDIT LOG (Supervisors / Admin) */}
        {currentTab === 'audit' && currentUser.role !== 'cashier' && (
          <AuditLogView />
        )}

        {/* TAB 5: KONSINYASI (Supervisors / Admin - Dedicated Workspace) */}
        {currentTab === 'konsinyasi' && currentUser.role !== 'cashier' && (
          <ConsignmentWorkspace />
        )}

        {/* TAB 6: STOK (Supervisors / Admin - Dedicated Workspace) */}
        {currentTab === 'stok' && currentUser.role !== 'cashier' && (
          <StockWorkspace />
        )}

        {/* TAB 7: BACKOFFICE HQ (Superadmin only) */}
        {currentTab === 'backoffice' && currentUser.role === 'admin' && (
          <BackofficeWorkspace />
        )}
      </main>

      {/* ESSENTIAL CASHIER WORKFLOW MODALS */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
      />

      <ReceiptModal />

      <SessionModal
        isOpen={isSessionModalOpen}
        onClose={() => setIsSessionModalOpen(false)}
      />

      <HandoffModal
        isOpen={isHandoffModalOpen}
        onClose={() => setIsHandoffModalOpen(false)}
      />

      <SetAsideOrdersModal
        isOpen={isHeldOrdersModalOpen}
        onClose={() => setIsHeldOrdersModalOpen(false)}
      />

      {/* MANDATORY MULTI-BRANCH SELECT STORE SCREEN & CONFIRMATION MODALS */}
      <SelectStoreScreen />
      <SwitchStoreConfirmModal />
    </div>
  );
};

export function App() {
  return (
    <POSProvider>
      <POSMainContent />
    </POSProvider>
  );
}

export default App;
