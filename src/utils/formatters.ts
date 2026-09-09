export function formatIDR(amount: number): string {
  if (isNaN(amount) || amount === undefined || amount === null) {
    return 'Rp 0';
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace('IDR', 'Rp');
}

export function formatDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date) + ' WIB';
  } catch {
    return isoString;
  }
}

export function formatDateShort(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return isoString;
  }
}

export function generateReceiptNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `RN-${year}${month}${day}-${randomSuffix}`;
}

/**
 * Store initials alias for PO Number
 * Senopati Utama -> SPU
 */
export function getBranchInitials(branchNameOrId?: string): string {
  if (!branchNameOrId) return 'SPU';
  const val = branchNameOrId.toLowerCase();
  if (val.includes('senopati') || val.includes('cab-01') || val.includes('spu')) return 'SPU';
  if (val.includes('kemang') || val.includes('cab-02') || val.includes('kma')) return 'KMA';
  if (val.includes('bintaro') || val.includes('cab-03') || val.includes('bts')) return 'BTS';
  
  const clean = branchNameOrId.replace(/cabang/i, '').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 3) {
    return (words[0][0] + words[1][0] + words[2][0]).toUpperCase();
  }
  if (words.length === 2) {
    return (words[0].slice(0, 2) + words[1][0]).toUpperCase();
  }
  return clean.slice(0, 3).toUpperCase() || 'SPU';
}

/**
 * Generate PO Number with format: [xxx]-[xxxxxx]-[xxxx]
 * 1. Store initials alias: e.g. SPU (Senopati Utama)
 * 2. Date in format yy-mm-dd (6 characters: yymmdd)
 * 3. Daily PO sequence count during that day (4 digits: 0001, 0002, ...)
 */
export function generatePONumber(
  existingOrders: Array<{ poNumber?: string; createdAt?: string }> = [],
  branchNameOrId: string = 'SPU',
  date: Date = new Date()
): string {
  const branchInitials = getBranchInitials(branchNameOrId);
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const dateCode = `${yy}${mm}${dd}`;

  const prefix = `${branchInitials}-${dateCode}-`;
  let maxSeq = 0;

  for (const order of existingOrders) {
    if (!order.poNumber) continue;
    if (order.poNumber.startsWith(prefix)) {
      const seqStr = order.poNumber.slice(prefix.length);
      const num = parseInt(seqStr, 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  }

  const nextSeq = String(maxSeq + 1).padStart(4, '0');
  return `${prefix}${nextSeq}`;
}

// Pleasant Web Audio sound chimes for touch POS feedback
class POSAudio {
  private ctx: AudioContext | null = null;
  public enabled = true;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  beep() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, this.ctx.currentTime); // A5
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch {
      // AudioContext unavailable or restricted
    }
  }

  cashRegister() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      // Dual high chime
      const now = this.ctx.currentTime;
      [587.33, 880, 1174.66].forEach((freq, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(freq, now + i * 0.06);
        gain.gain.setValueAtTime(0.1, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.2);
      });
    } catch {
      // ignore
    }
  }

  success() {
    this.cashRegister();
  }

  error() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.2);
    } catch {
      // ignore
    }
  }
}

export const posSound = new POSAudio();
