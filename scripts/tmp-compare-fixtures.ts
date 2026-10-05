/* Temporary verification script for TOKEN_OPTIMIZATION_PLAN Step 1 — delete after use. */
import * as mock from '../src/data/mockData';
import * as fCustomers from '../src/data/fixtures/customers';
import * as fDates from '../src/data/fixtures/dates';
import * as fInventory from '../src/data/fixtures/inventory';
import * as fMaster from '../src/data/fixtures/masterData';
import * as fOrders from '../src/data/fixtures/orders';
import * as fSuppliers from '../src/data/fixtures/suppliers';

const fixtureModules: Record<string, Record<string, unknown>> = {
  'fixtures/customers': fCustomers as unknown as Record<string, unknown>,
  'fixtures/dates': fDates as unknown as Record<string, unknown>,
  'fixtures/inventory': fInventory as unknown as Record<string, unknown>,
  'fixtures/masterData': fMaster as unknown as Record<string, unknown>,
  'fixtures/orders': fOrders as unknown as Record<string, unknown>,
  'fixtures/suppliers': fSuppliers as unknown as Record<string, unknown>,
};

type Result = { file: string; name: string; status: 'EQUAL' | 'DIFF' | 'MISSING_IN_MOCK'; detail?: string; rawEqual?: boolean };
const results: Result[] = [];

const stable = (value: unknown): string => {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return '{' + Object.keys(obj).sort().map((k) => JSON.stringify(k) + ':' + stable(obj[k])).join(',') + '}';
  }
  if (value instanceof Date) return 'DATE(' + value.toISOString() + ')';
  return JSON.stringify(value);
};

for (const [file, mod] of Object.entries(fixtureModules)) {
  for (const [name, value] of Object.entries(mod)) {
    if (!(name in mock)) {
      results.push({ file, name, status: 'MISSING_IN_MOCK' });
      continue;
    }
    const a = stable(value);
    const b = stable((mock as unknown as Record<string, unknown>)[name]);
    const rawA = JSON.stringify(value);
    const rawB = JSON.stringify((mock as unknown as Record<string, unknown>)[name]);
    if (a === b) {
      results.push({ file, name, status: 'EQUAL', rawEqual: rawA === rawB });
    } else {
      results.push({ file, name, status: 'DIFF', detail: `fixture=${a.length}B mock=${b.length}B` });
    }
  }
}

// Dates inside fixtures are computed at import time; date-based exports may differ
// only because of that. Flag which export names embed date-derived strings.
for (const r of results) {
  const raw = r.status === 'EQUAL' ? (r.rawEqual ? ' RAW_EQ' : ' RAW_DIFF(key-order?)') : '';
  console.log(`${r.status.padEnd(14)} ${r.file}/${r.name}${r.detail ? '  ' + r.detail : ''}${raw}`);
}
const equal = results.filter((r) => r.status === 'EQUAL').length;
const rawDiff = results.filter((r) => r.status === 'EQUAL' && !r.rawEqual);
const diff = results.filter((r) => r.status === 'DIFF');
const missing = results.filter((r) => r.status === 'MISSING_IN_MOCK');
console.log(`\nTOTAL=${results.length} EQUAL=${equal} DIFF=${diff.length} MISSING_IN_MOCK=${missing.length}`);
if (diff.length) {
  console.log('DIFF exports:', diff.map((d) => d.name).join(', '));
}
if (rawDiff.length) {
  console.log('RAW JSON differs despite stable-equal:', rawDiff.map((d) => d.name).join(', '));
}
