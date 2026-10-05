import { useEffect, useState } from 'react';
import { posSound } from '../../utils/formatters';
import { INITIAL_USERS } from '../../data/mockData';
import type { CashierSession, SetAsideOrder, User } from '../../types';
import type { AddAuditFn } from './sliceTypes';

interface UseSessionSliceDeps {
  currentUser: User;
  setAsideOrders: SetAsideOrder[];
  addAudit: AddAuditFn;
  verifySupervisorPin: (pin: string) => { success: boolean; supervisor?: User; message: string };
}

/**
 * Session (Sesi Kasir / shift) slice of the POS store.
 *
 * Owns: the active cashier session and the closed-session history (state +
 * localStorage persistence) plus the shift lifecycle actions - open, correct
 * opening cash, close & reconcile, and support corrections on closed sessions.
 * Extracted verbatim from POSContext so the provider no longer carries this domain.
 *
 * `handOffSession` intentionally stays in POSContext: it is the only session
 * action that reads the `users` list, so moving it here would re-introduce a
 * dependency cycle with the org slice (see TOKEN_OPTIMIZATION_PROGRESS.md).
 */
export function useSessionSlice({
  currentUser,
  setAsideOrders,
  addAudit,
  verifySupervisorPin,
}: UseSessionSliceDeps) {
  // Cashier Session
  const [currentSession, setCurrentSession] = useState<CashierSession | null>(() => {
    const saved = localStorage.getItem('pos_current_session');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    // Pre-create an initial active session for instant cashier demo readiness!
    const initialSession: CashierSession = {
      id: 'SES-' + Date.now().toString().slice(-6),
      cashierId: INITIAL_USERS[0].id,
      cashierName: INITIAL_USERS[0].name,
      startTime: new Date().toISOString(),
      openingCash: 200000, // Rp 200.000 starting cash drawer
      expectedCash: 200000,
      status: 'active',
      totalTransactions: 0,
      totalSales: 0,
      cashSales: 0,
      qrisSales: 0,
      depositSales: 0,
      totalRefunds: 0,
      totalDiscounts: 0,
      handOffHistory: [],
    };
    return initialSession;
  });

  const [closedSessions, setClosedSessions] = useState<CashierSession[]>(() => {
    const saved = localStorage.getItem('pos_closed_sessions');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [];
  });

  useEffect(() => {
    if (currentSession) {
      localStorage.setItem('pos_current_session', JSON.stringify(currentSession));
    } else {
      localStorage.removeItem('pos_current_session');
    }
  }, [currentSession]);

  useEffect(() => {
    localStorage.setItem('pos_closed_sessions', JSON.stringify(closedSessions));
  }, [closedSessions]);

  // Open Cashier Session (POS-US-003)
  const openSession = (openingCash: number) => {
    if (currentSession && currentSession.status === 'active') {
      return;
    }
    const newSession: CashierSession = {
      id: 'SES-' + Date.now().toString().slice(-6),
      cashierId: currentUser.id,
      cashierName: currentUser.name,
      startTime: new Date().toISOString(),
      openingCash: Math.max(0, openingCash),
      expectedCash: Math.max(0, openingCash),
      status: 'active',
      totalTransactions: 0,
      totalSales: 0,
      cashSales: 0,
      qrisSales: 0,
      depositSales: 0,
      totalRefunds: 0,
      totalDiscounts: 0,
      handOffHistory: [],
    };
    setCurrentSession(newSession);
    addAudit(
      'SESSION_OPEN',
      'session',
      newSession.id,
      `Sesi Kasir dibuka oleh ${currentUser.name} dengan Modal Awal: Rp ${openingCash.toLocaleString('id-ID')}`
    );
    posSound.beep();
  };

  // Correct Opening Cash (POS-US-003)
  const correctOpeningCash = (newAmount: number, adminPin: string, reason: string) => {
    const auth = verifySupervisorPin(adminPin);
    if (!auth.success || !currentSession) {
      posSound.error();
      return false;
    }
    const oldAmount = currentSession.openingCash;
    const diff = newAmount - oldAmount;
    setCurrentSession((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        openingCash: newAmount,
        openingCashCorrected: true,
        openingCashOld: oldAmount,
        expectedCash: prev.expectedCash + diff,
      };
    });
    addAudit(
      'CORRECT_OPENING_CASH',
      'session',
      currentSession.id,
      `Koreksi Modal Awal oleh ${auth.supervisor?.name}. Alasan: ${reason}`,
      `Rp ${oldAmount}`,
      `Rp ${newAmount}`
    );
    posSound.cashRegister();
    return true;
  };

  // Close and Reconcile Session (POS-US-005)
  const closeSession = (
    actualCash: number,
    varianceReason: string,
    supervisorPin: string
  ) => {
    if (!currentSession) {
      return { success: false, message: 'Tidak ada sesi kasir aktif' };
    }

    // Check if any held orders exist that block closing
    if (setAsideOrders.length > 0) {
      posSound.error();
      return {
        success: false,
        message: `Masih ada ${setAsideOrders.length} pesanan yang ditahan (parkir). Selesaikan atau batalkan terlebih dahulu sebelum tutup kasir.`,
      };
    }

    const expected = currentSession.expectedCash;
    const variance = actualCash - expected;
    const varianceThreshold = 10000; // Rp 10.000

    // If variance > Rp 10.000 or < -Rp 10.000, reason is mandatory
    if (Math.abs(variance) > varianceThreshold && !varianceReason.trim()) {
      posSound.error();
      return {
        success: false,
        message: 'Selisih melebihi ±Rp 10.000! Alasan selisih kas wajib diisi.',
      };
    }

    // Manager approval is required
    const auth = verifySupervisorPin(supervisorPin);
    if (!auth.success) {
      posSound.error();
      return { success: false, message: 'Otorisasi Supervisor diperlukan untuk menutup shift!' };
    }

    const closed: CashierSession = {
      ...currentSession,
      endTime: new Date().toISOString(),
      actualCash,
      variance,
      varianceReason: varianceReason.trim() || undefined,
      closingApprovedBy: auth.supervisor?.name,
      status: 'closed',
    };

    setClosedSessions((prev) => [closed, ...prev]);
    setCurrentSession(null);

    addAudit(
      'SESSION_CLOSE',
      'session',
      closed.id,
      `Tutup Sesi oleh ${currentUser.name}, disetujui ${auth.supervisor?.name}. Fisik: Rp ${actualCash.toLocaleString('id-ID')}, Ekspektasi: Rp ${expected.toLocaleString('id-ID')}, Selisih: Rp ${variance.toLocaleString('id-ID')}`
    );
    posSound.cashRegister();
    return { success: true, message: 'Sesi Kasir berhasil ditutup dan direkonsiliasi.' };
  };

  // Support Session Correction for Closed Session (POS-US-006)
  const openSupportSessionCorrection = (
    sessionId: string,
    action: string,
    reason: string,
    adminPin: string
  ) => {
    const auth = verifySupervisorPin(adminPin);
    if (!auth.success || auth.supervisor?.role !== 'admin') {
      posSound.error();
      return false;
    }
    setClosedSessions((prev) =>
      prev.map((s) => {
        if (s.id === sessionId) {
          const correction = {
            adminId: auth.supervisor!.id,
            adminName: auth.supervisor!.name,
            timestamp: new Date().toISOString(),
            action,
            reason,
            beforeValue: `Status: ${s.status}`,
            afterValue: `Audited Support Correction: ${action}`,
          };
          return {
            ...s,
            supportCorrections: [...(s.supportCorrections || []), correction],
          };
        }
        return s;
      })
    );
    addAudit(
      'SUPPORT_SESSION_CORRECTION',
      'session',
      sessionId,
      `Koreksi Support Session oleh Admin ${auth.supervisor.name}. Aksi: ${action}. Alasan: ${reason}`
    );
    posSound.beep();
    return true;
  };

  return {
    currentSession,
    setCurrentSession,
    closedSessions,
    openSession,
    correctOpeningCash,
    closeSession,
    openSupportSessionCorrection,
  };
}
