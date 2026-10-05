import type { AuditLog } from '../../types';

/**
 * Signature of the shared audit logger provided by `useAuditSlice`. Slices that
 * need to record audit events receive this via their dependency object instead
 * of importing the whole provider, which keeps slice-to-slice coupling to a
 * single explicit type.
 */
export type AddAuditFn = (
  action: string,
  entityType: AuditLog['entityType'],
  entityId: string,
  details: string,
  beforeValue?: string,
  afterValue?: string
) => void;
