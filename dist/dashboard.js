// Dashboard preferences are independent from saved calculation records and inputs.
export const DASHBOARD_KEY = 'mep-workbench-dashboard-v1';
export const MAX_RECENT_ENTRIES = 8;
const MAX_FAVORITES = 100;
const MAX_STATE_BYTES = 24000;
const MAX_STRING_LENGTH = 2000;
const MAX_SUMMARY_LENGTH = 240;
const MAX_COLLECTION_LENGTH = 100;
const MAX_DEPTH = 8;
const forbiddenKeys = new Set(['__proto__', 'prototype', 'constructor']);
const validId = value => typeof value === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(value);
const plainObject = value => {
  if (value === null || typeof value !== 'object' || Object.prototype.toString.call(value) !== '[object Object]') return false;
  const prototype = Object.getPrototypeOf(value);
  // Support ordinary objects from another frame/realm as well as this one.
  return prototype === null || Object.getPrototypeOf(prototype) === null;
};
const clone = value => JSON.parse(JSON.stringify(value));
const unavailableWarning = 'Favorites and recent calculations are available in this tab only because browser storage is unavailable or full.';
const damagedWarning = 'Dashboard data is damaged or from an unsupported version and has been left untouched. Favorites and recent calculations are available in this tab only.';

// Retain ordinary JSON input values without callable values, prototype keys,
// cycles, non-finite numbers, or unbounded payloads. This does not render HTML;
// callers must escape summary/state text when presenting it in the UI.
function sanitizeState(value) {
  if (!plainObject(value)) return undefined;
  const ancestors = new WeakSet();
  let remaining = 2000;
  function visit(item, depth) {
    if (depth > MAX_DEPTH || --remaining < 0) return undefined;
    if (item === null || typeof item === 'boolean') return item;
    if (typeof item === 'number') return Number.isFinite(item) ? item : undefined;
    if (typeof item === 'string') return item.slice(0, MAX_STRING_LENGTH);
    if ((!Array.isArray(item) && !plainObject(item)) || ancestors.has(item)) return undefined;
    ancestors.add(item);
    let result;
    if (Array.isArray(item)) {
      // Preserve array positions when dropping a non-JSON value.
      result = [];
      if (depth < MAX_DEPTH) {
        for (let index = 0; index < Math.min(item.length, MAX_COLLECTION_LENGTH) && remaining > 0; index++) {
          const descriptor = Object.getOwnPropertyDescriptor(item, String(index));
          result.push(visit(descriptor && 'value' in descriptor ? descriptor.value : null, depth + 1) ?? null);
        }
      }
    } else {
      result = {};
      for (const key of Object.keys(item).slice(0, MAX_COLLECTION_LENGTH)) {
        if (remaining <= 0) break;
        if (forbiddenKeys.has(key) || key.length > 100) continue;
        // Do not invoke getters on a caller-provided object.
        const descriptor = Object.getOwnPropertyDescriptor(item, key);
        if (!descriptor || !('value' in descriptor)) continue;
        const child = visit(descriptor.value, depth + 1);
        if (child !== undefined) result[key] = child;
      }
    }
    ancestors.delete(item);
    return result;
  }
  const result = visit(value, 0);
  return result && JSON.stringify(result).length <= MAX_STATE_BYTES ? result : undefined;
}

function validStoredState(value, depth = 0, budget = { remaining: 2000 }) {
  if (depth > MAX_DEPTH || --budget.remaining < 0) return false;
  if (value === null || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string') return value.length <= MAX_STRING_LENGTH;
  if (Array.isArray(value)) return value.length <= MAX_COLLECTION_LENGTH && value.every(item => validStoredState(item, depth + 1, budget));
  if (!plainObject(value)) return false;
  const keys = Object.keys(value);
  return keys.length <= MAX_COLLECTION_LENGTH && keys.every(key => !forbiddenKeys.has(key) && key.length <= 100 && validStoredState(value[key], depth + 1, budget));
}

function timestamp(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function readData(raw) {
  if (typeof raw !== 'string' || raw.length > 250000) throw Error('Invalid dashboard data.');
  const data = JSON.parse(raw);
  if (!plainObject(data) || data.schemaVersion !== 1 || !Array.isArray(data.favoriteIds) ||
      data.favoriteIds.length > MAX_FAVORITES || !data.favoriteIds.every(validId) ||
      !Array.isArray(data.recentEntries) || data.recentEntries.length > MAX_RECENT_ENTRIES) throw Error('Invalid dashboard data.');
  const recentEntries = [];
  const seen = new Set();
  for (const entry of data.recentEntries) {
    if (!plainObject(entry) || !validId(entry.moduleId) || !timestamp(entry.timestamp) || seen.has(entry.moduleId) ||
        (entry.summary !== undefined && (typeof entry.summary !== 'string' || entry.summary.length > MAX_SUMMARY_LENGTH)) ||
        (entry.state !== undefined && (!plainObject(entry.state) || !validStoredState(entry.state) || JSON.stringify(entry.state).length > MAX_STATE_BYTES))) throw Error('Invalid dashboard entry.');
    seen.add(entry.moduleId);
    const clean = { moduleId: entry.moduleId, timestamp: timestamp(entry.timestamp) };
    if (entry.state !== undefined) clean.state = entry.state;
    if (entry.summary !== undefined) clean.summary = entry.summary;
    recentEntries.push(clean);
  }
  recentEntries.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
  return { favoriteIds: [...new Set(data.favoriteIds)], recentEntries };
}

/**
 * Small, synchronous dashboard store. Storage is optional; pass a Storage-like
 * object for tests, or null to explicitly use memory only. Only this module's
 * dedicated key is read or written. Corrupt/unreadable storage is never replaced.
 * A snapshot includes a warning string (empty when persistence is available).
 * Invalid IDs/entries are ignored. Call recordCalculation only after actual user
 * calculation activity, never just to populate the dashboard or render a route.
 */
export function createDashboardStore(storage) {
  let data = { favoriteIds: [], recentEntries: [] };
  let warning = '';
  let canWrite = false;
  try {
    if (storage === undefined) storage = globalThis.localStorage;
    if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') throw Error('Storage unavailable.');
    const raw = storage.getItem(DASHBOARD_KEY);
    if (raw !== null) {
      try { data = readData(raw); }
      catch { warning = damagedWarning; }
    }
    canWrite = !warning;
  } catch { warning = unavailableWarning; }

  function getSnapshot() { return { ...clone(data), warning }; }
  function persist() {
    if (canWrite) {
      try {
        storage.setItem(DASHBOARD_KEY, JSON.stringify({ schemaVersion: 1, ...data }));
        warning = '';
      } catch { warning = unavailableWarning; }
    }
    return getSnapshot();
  }
  return {
    getSnapshot,
    isFavorite(moduleId) { return data.favoriteIds.includes(moduleId); },
    toggleFavorite(moduleId) {
      if (!validId(moduleId)) return getSnapshot();
      if (data.favoriteIds.includes(moduleId)) data.favoriteIds = data.favoriteIds.filter(id => id !== moduleId);
      else if (data.favoriteIds.length < MAX_FAVORITES) data.favoriteIds.push(moduleId);
      else return getSnapshot();
      return persist();
    },
    recordCalculation(entry) {
      if (!plainObject(entry) || !validId(entry.moduleId)) return getSnapshot();
      const at = entry.timestamp === undefined ? new Date().toISOString() : timestamp(entry.timestamp);
      if (!at) return getSnapshot();
      const previous = data.recentEntries.find(item => item.moduleId === entry.moduleId);
      if (previous && Date.parse(previous.timestamp) > Date.parse(at)) return getSnapshot();
      const recent = { moduleId: entry.moduleId, timestamp: at };
      const state = sanitizeState(entry.state);
      if (state !== undefined) recent.state = state;
      if (typeof entry.summary === 'string' && entry.summary.trim()) recent.summary = entry.summary.trim().slice(0, MAX_SUMMARY_LENGTH);
      data.recentEntries = [recent, ...data.recentEntries.filter(item => item.moduleId !== entry.moduleId)]
        .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)).slice(0, MAX_RECENT_ENTRIES);
      return persist();
    }
  };
}
