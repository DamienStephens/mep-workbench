import assert from 'node:assert/strict';
import { createDashboardStore, DASHBOARD_KEY, MAX_RECENT_ENTRIES } from './dist/dashboard.js';
import { RECORDS_KEY } from './dist/calculation-records.js';

const memoryStorage = (initial = {}) => {
  const values = new Map(Object.entries(initial));
  const reads = [], writes = [];
  return {
    values, reads, writes,
    getItem(key) { reads.push(key); return values.get(key) ?? null; },
    setItem(key, value) { writes.push([key, value]); values.set(key, value); }
  };
};
const at = number => `2026-10-11T${String(number).padStart(2, '0')}:00:00.000Z`;

// A fresh browser has neither invented usage nor preselected favorites.
const storage = memoryStorage({ [RECORDS_KEY]: '{"existing":"saved records"}', 'mep-workbench-v1': '{"existing":"inputs"}' });
const store = createDashboardStore(storage);
assert.deepEqual(store.getSnapshot(), { favoriteIds: [], recentEntries: [], warning: '' });
assert.equal(storage.writes.length, 0);
assert.notEqual(DASHBOARD_KEY, RECORDS_KEY);
assert.notEqual(DASHBOARD_KEY, 'mep-workbench-v1');
assert.equal(store.isFavorite('conductor'), false);
assert.deepEqual(store.toggleFavorite('conductor').favoriteIds, ['conductor']);
assert.equal(store.isFavorite('conductor'), true);
assert.deepEqual(store.toggleFavorite('drop').favoriteIds, ['conductor', 'drop']);
assert.deepEqual(store.toggleFavorite('conductor').favoriteIds, ['drop']);
for (let index = 0; index < 20; index++) store.toggleFavorite('conductor');
assert.deepEqual(store.getSnapshot().favoriteIds, ['drop']);
store.toggleFavorite('conductor');
assert.deepEqual(createDashboardStore(storage).getSnapshot().favoriteIds, ['drop', 'conductor']);
assert.equal(storage.values.get(RECORDS_KEY), '{"existing":"saved records"}');
assert.equal(storage.values.get('mep-workbench-v1'), '{"existing":"inputs"}');
assert.ok(storage.reads.every(key => key === DASHBOARD_KEY));
assert.ok(storage.writes.every(([key]) => key === DASHBOARD_KEY));

// Invalid identifiers do not become HTML, routes, or persisted entries.
const beforeInvalid = store.getSnapshot();
for (const id of ['', null, 123, '<script>', '../saved', 'x'.repeat(65), 'has space']) {
  assert.deepEqual(store.toggleFavorite(id), beforeInvalid);
  assert.deepEqual(store.recordCalculation({ moduleId: id }), beforeInvalid);
}
for (const entry of [undefined, [], 'conductor', { moduleId: 'conductor', timestamp: 'no date' }]) {
  assert.deepEqual(store.recordCalculation(entry), beforeInvalid);
}

// Only explicit activity creates recents; data is a detached snapshot.
const inputs = { current: 80, rows: [{ size: '4', count: 3 }], mode: 'standard' };
store.recordCalculation({ moduleId: 'conductor', timestamp: at(1), state: inputs, summary: '  3 × #4 AWG  ' });
inputs.rows[0].count = 500;
assert.equal(store.getSnapshot().recentEntries[0].state.rows[0].count, 3);
assert.equal(store.getSnapshot().recentEntries[0].summary, '3 × #4 AWG');
const detached = store.getSnapshot();
detached.favoriteIds.push('fake');
detached.recentEntries[0].state.current = 9999;
assert.equal(store.isFavorite('fake'), false);
assert.equal(store.getSnapshot().recentEntries[0].state.current, 80);
store.recordCalculation({ moduleId: 'drop', timestamp: at(2), state: { length: 150 } });
store.recordCalculation({ moduleId: 'conductor', timestamp: at(3), state: { current: 100 } });
assert.deepEqual(store.getSnapshot().recentEntries.map(item => item.moduleId), ['conductor', 'drop']);
assert.equal(store.getSnapshot().recentEntries[0].state.current, 100);
store.recordCalculation({ moduleId: 'conductor', timestamp: at(0), state: { current: 1 } });
assert.equal(store.getSnapshot().recentEntries[0].state.current, 100);
for (let index = 4; index < 15; index++) store.recordCalculation({ moduleId: `module-${index}`, timestamp: at(index) });
assert.equal(store.getSnapshot().recentEntries.length, MAX_RECENT_ENTRIES);
assert.deepEqual(store.getSnapshot().recentEntries.map(item => item.moduleId), Array.from({ length: 8 }, (_, index) => `module-${14 - index}`));
assert.deepEqual(createDashboardStore(storage).getSnapshot(), store.getSnapshot());

// JSON-safe state tolerates cycles, getters and malformed values without changing inputs.
const unsafeState = JSON.parse('{"__proto__":{"polluted":true},"constructor":"bad","normal":42}');
unsafeState.circular = unsafeState;
unsafeState.notFinite = Infinity;
unsafeState.fn = () => {};
unsafeState.list = [1, undefined, NaN, 4];
unsafeState.long = 'a'.repeat(3000);
Object.defineProperty(unsafeState, 'getter', { enumerable: true, get() { throw Error('Must not execute.'); } });
const sanitized = store.recordCalculation({ moduleId: 'safe', timestamp: at(15), state: unsafeState, summary: 's'.repeat(500) }).recentEntries[0];
assert.equal(sanitized.state.normal, 42);
assert.equal(sanitized.state.circular, undefined);
assert.equal(sanitized.state.notFinite, undefined);
assert.equal(sanitized.state.fn, undefined);
assert.equal(sanitized.state.getter, undefined);
assert.equal(Object.hasOwn(sanitized.state, '__proto__'), false);
assert.equal(Object.hasOwn(sanitized.state, 'constructor'), false);
assert.equal({}.polluted, undefined);
assert.deepEqual(sanitized.state.list, [1, null, null, 4]);
assert.equal(sanitized.state.long.length, 2000);
assert.equal(sanitized.summary.length, 240);
assert.deepEqual(createDashboardStore(storage).getSnapshot(), store.getSnapshot());
store.recordCalculation({ moduleId: 'huge', timestamp: at(16), state: Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`key${i}`, 'x'.repeat(2000)])) });
assert.equal(store.getSnapshot().recentEntries[0].state, undefined);
// Truncated deep/broad data must remain valid when read back on the next visit.
let deepState = ['leaf'];
for (let index = 0; index < 12; index++) deepState = [deepState];
store.recordCalculation({ moduleId: 'deep', timestamp: at(17), state: { nested: deepState } });
assert.deepEqual(createDashboardStore(storage).getSnapshot(), store.getSnapshot());
store.recordCalculation({ moduleId: 'broad', timestamp: at(18), state: { nested: Array.from({ length: 100 }, () => Array.from({ length: 100 }, () => 1)) } });
assert.deepEqual(createDashboardStore(storage).getSnapshot(), store.getSnapshot());
const getterArray = [];
Object.defineProperty(getterArray, '0', { enumerable: true, get() { throw Error('Must not execute array getter.'); } });
store.recordCalculation({ moduleId: 'array-getter', timestamp: at(19), state: { items: getterArray } });
assert.deepEqual(store.getSnapshot().recentEntries[0].state, { items: [null] });
assert.deepEqual(createDashboardStore(storage).getSnapshot(), store.getSnapshot());

// Damage/unknown versions are never overwritten, even after in-memory changes.
const invalidDocuments = [
  '{broken', 'null', '[]',
  JSON.stringify({ schemaVersion: 999, favoriteIds: [], recentEntries: [] }),
  JSON.stringify({ schemaVersion: 1, favoriteIds: ['<bad>'], recentEntries: [] }),
  JSON.stringify({ schemaVersion: 1, favoriteIds: [], recentEntries: [{ moduleId: 'drop', timestamp: 'broken' }] }),
  JSON.stringify({ schemaVersion: 1, favoriteIds: [], recentEntries: [{ moduleId: 'drop', timestamp: at(1), state: ['not', 'object'] }] }),
  '{"schemaVersion":1,"favoriteIds":[],"recentEntries":[{"moduleId":"drop","timestamp":"2026-10-11T01:00:00.000Z","state":{"__proto__":{"polluted":true}}}]}',
  JSON.stringify({ schemaVersion: 1, favoriteIds: [], recentEntries: Array.from({ length: 9 }, (_, i) => ({ moduleId: `module-${i}`, timestamp: at(i) })) })
];
for (const raw of invalidDocuments) {
  const badStorage = memoryStorage({ [DASHBOARD_KEY]: raw });
  const badStore = createDashboardStore(badStorage);
  assert.match(badStore.getSnapshot().warning, /damaged|unsupported/);
  assert.deepEqual(badStore.getSnapshot().recentEntries, []);
  badStore.toggleFavorite('conductor');
  badStore.recordCalculation({ moduleId: 'conductor', timestamp: at(1) });
  assert.equal(badStore.isFavorite('conductor'), true);
  assert.equal(badStore.getSnapshot().recentEntries.length, 1);
  assert.equal(badStorage.values.get(DASHBOARD_KEY), raw);
  assert.equal(badStorage.writes.length, 0);
}

// Unreadable storage stays untouched; failed writes keep usable in-memory state.
let attemptedWrite = false;
const blocked = createDashboardStore({ getItem() { throw Error('Blocked'); }, setItem() { attemptedWrite = true; } });
blocked.toggleFavorite('conductor');
blocked.recordCalculation({ moduleId: 'conductor', timestamp: at(1) });
assert.equal(blocked.getSnapshot().recentEntries.length, 1);
assert.equal(blocked.isFavorite('conductor'), true);
assert.match(blocked.getSnapshot().warning, /this tab only/);
assert.equal(attemptedWrite, false);
let full = true;
const quotaStorage = memoryStorage();
const setItem = quotaStorage.setItem.bind(quotaStorage);
quotaStorage.setItem = (key, value) => { if (full) throw Error('Quota exceeded'); setItem(key, value); };
const quotaStore = createDashboardStore(quotaStorage);
quotaStore.toggleFavorite('drop');
assert.equal(quotaStore.isFavorite('drop'), true);
assert.match(quotaStore.getSnapshot().warning, /unavailable or full/);
assert.equal(quotaStorage.values.has(DASHBOARD_KEY), false);
full = false;
quotaStore.recordCalculation({ moduleId: 'drop', timestamp: at(1) });
assert.equal(quotaStore.getSnapshot().warning, '');
assert.deepEqual(createDashboardStore(quotaStorage).getSnapshot(), quotaStore.getSnapshot());
assert.match(createDashboardStore(null).getSnapshot().warning, /this tab only/);

// Default storage access also survives a browser security getter throwing.
const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
try {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw Error('SecurityError'); } });
  const privateStore = createDashboardStore();
  assert.doesNotThrow(() => privateStore.toggleFavorite('drop'));
  assert.match(privateStore.getSnapshot().warning, /this tab only/);
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  assert.deepEqual(createDashboardStore().getSnapshot(), store.getSnapshot());
} finally {
  if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage);
  else delete globalThis.localStorage;
}

console.log('Dashboard persistence tests passed: favorites, actual recents, sanitization, storage isolation and failure recovery.');
