import { useEffect, useState } from 'react';
import { AuditLog, StockAdjustmentRecord, User } from '../../types';

interface UseAuditSliceDeps {
  currentUser: User;
}

/**
 * Audit slice of the POS store.
 *
 * Owns: the append-only audit log, the stock adjustment records, and the shared
 * `addAudit` logger that every other slice uses. Extracted verbatim from
 * POSContext so the provider no longer carries this domain.
 */
export function useAuditSlice({ currentUser }: UseAuditSliceDeps) {
  // Audits & Adjustments
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('pos_audit_logs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const seenIds = new Set<string>();
          return parsed.map((item: AuditLog, index: number) => {
            if (!item.id || seenIds.has(item.id)) {
              const uniqueId = `AUD-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`;
              seenIds.add(uniqueId);
              return { ...item, id: uniqueId };
            }
            seenIds.add(item.id);
            return item;
          });
        }
      } catch {}
    }
    return [];
  });

  const [stockAdjustments, setStockAdjustments] = useState<StockAdjustmentRecord[]>(() => {
    const saved = localStorage.getItem('pos_stock_adjustments');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('pos_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem('pos_stock_adjustments', JSON.stringify(stockAdjustments));
  }, [stockAdjustments]);

  // Helper to log an audit event
  const addAudit = (
    action: string,
    entityType: AuditLog['entityType'],
    entityId: string,
    details: string,
    beforeValue?: string,
    afterValue?: string
  ) => {
    const entry: AuditLog = {
      id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action,
      entityType,
      entityId,
      details,
      beforeValue,
      afterValue,
    };
    setAuditLogs((prev) => [entry, ...prev]);
  };

  return { auditLogs, stockAdjustments, setStockAdjustments, addAudit };
}
