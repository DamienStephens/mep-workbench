// Modeled DOM dashboard integration. Real-browser visual/keyboard QA is separate.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as calc from './dist/calc.js';
import { systemOptions, voltageOptions } from './dist/voltage.js';
import { createSnapshot, buildSummary, summaryFromSnapshot, copySummaryFromSnapshot, createRecordStore, projectKey, projectNames, RECORDS_KEY } from './dist/calculation-records.js';
import { transformerProtection, evaluateTransformerProtection, migrateProtectionState, transformerBreakerOptions, transformerOcpdRatings, secondaryRuleConditions } from './dist/transformer-protection.js';
import { createDashboardStore, DASHBOARD_KEY } from './dist/dashboard.js';

const source = fs.readFileSync(new URL('./dist/app.js', import.meta.url), 'utf8').replace(/^import[^\n]+\n/gm, '').replace(/route\(\);\s*$/, '');
function harness({ initial = {}, blockRead = false, blockWrite = false } = {}) {
  const data = new Map(Object.entries(initial)), writes = [];
  const storage = {
    getItem(key) { if (blockRead) throw Error('Storage blocked'); return data.get(key) ?? null; },
    setItem(key, value) { if (blockWrite) throw Error('Storage full'); writes.push(key); data.set(key, value); }
  };
  const nodes = {}, listeners = {}, dialogs = [];
  let parsedButtons = null, parsedLinks = null, navigationHTML = '', currentHTML = '', hash = '', hashChanges = 0;
  const makeNode = (attributes = {}) => ({
    attributes, dataset: {}, innerHTML: '', textContent: '',
    focus() { document.activeElement = this; },
    setAttribute(key, value) { this.attributes[key] = String(value); },
    getAttribute(key) { return this.attributes[key] ?? null; },
    addEventListener(key, callback) { listeners[key] = callback; },
    querySelector() { return null; },
    scrollIntoView() { this.scrolled = true; }
  });
  for (const key of ['#main', '#navigation', '#calculator-form', '#results', '#sources', '#reset', '#print', '#copy-summary', '#export-pdf', '#save-calculation', '#action-status', '#storage-status', '#clear-all-calculations', '#saved-heading', '#all-tools', '#add-row']) nodes[key] = makeNode();
  Object.defineProperty(nodes['#main'], 'innerHTML', {
    get() { return currentHTML; },
    set(value) { currentHTML = value; parsedButtons = null; parsedLinks = null; }
  });
  Object.defineProperty(nodes['#navigation'], 'innerHTML', {get(){return navigationHTML;},set(value){navigationHTML=value;parsedButtons=null;}});
  function buttons() {
    if (parsedButtons) return parsedButtons;
    parsedButtons = [...(navigationHTML+currentHTML).matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)].map(match => {
      const attributes = Object.fromEntries([...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(item => [item[1], item[2]]));
      const button = makeNode(attributes);
      button.innerHTML = match[2];
      button.textContent = match[2].replace(/<[^>]+>/g, '');
      for (const [key, value] of Object.entries(attributes)) if (key.startsWith('data-')) button.dataset[key.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
      return button;
    });
    return parsedButtons;
  }
  function allToolsLinks() {
    if (!parsedLinks) parsedLinks = [...currentHTML.matchAll(/<a\b[^>]*href="#all-tools"[^>]*>/g)].map(() => makeNode({ href: '#all-tools' }));
    return parsedLinks;
  }
  const document = {
    activeElement: null,
    querySelector(selector) {
      const favorite = selector.match(/^\[data-favorite="([^"]+)"\]$/);
      if (favorite) return buttons().find(button => button.dataset.favorite === favorite[1]);
      if (selector === '#all-tools [data-favorite]') return buttons().filter(button => button.dataset.favorite).at(-context.ui.modules.length);
      return nodes[selector];
    },
    querySelectorAll(selector) {
      if (selector === '[data-favorite]') return buttons().filter(button => button.dataset.favorite);
      if (selector === '[data-recent]') return buttons().filter(button => button.dataset.recent !== undefined);
      if (selector === '[data-record-action]') return buttons().filter(button => button.dataset.recordAction);
      if (selector === '[data-clear-project]') return buttons().filter(button => button.dataset.clearProject !== undefined);
      if (selector === '[data-remove]') return buttons().filter(button => button.dataset.remove !== undefined);
      if (selector === 'a[href="#all-tools"]') return allToolsLinks();
      return [];
    }
  };
  const location = {};
  Object.defineProperty(location, 'hash', {
    get() { return hash; },
    set(value) { const next = value ? `#${String(value).replace(/^#/, '')}` : ''; if (next !== hash) hashChanges++; hash = next; }
  });
  const context = vm.createContext({
    calc, systemOptions, voltageOptions, createSnapshot, buildSummary, summaryFromSnapshot, copySummaryFromSnapshot, projectKey, projectNames,
    createRecordStore: () => createRecordStore(storage), createDashboardStore: () => createDashboardStore(storage),
    transformerProtection, evaluateTransformerProtection, migrateProtectionState, transformerBreakerOptions, transformerOcpdRatings, secondaryRuleConditions,
    showRecordDialog: options => dialogs.push(options), confirmRecordClear: options => dialogs.push(options), closeRecordDialog() {},
    downloadPDF() {}, attachAmbientHelper() {}, structuredClone, console, localStorage: storage, location, document,
    navigator: { clipboard: { writeText: async () => {} } }, window: { addEventListener() {}, scrollTo() {}, print() {} }
  });
  vm.runInContext(source + ';globalThis.ui={overview,calculator,route,states,modules,dashboardStore,getCurrentSnapshot:()=>currentSnapshot};', context);
  return {
    context, ui: context.ui, nodes, document, storage, data, writes, dialogs,
    store: createRecordStore(storage), get hashChanges() { return hashChanges; },
    favorites: () => document.querySelectorAll('[data-favorite]'), recents: () => document.querySelectorAll('[data-recent]'),
    navigate(id) { location.hash = id; context.ui.route(); },
    change(name, value, tagName = 'INPUT') { listeners.change({ type: 'change', target: { name, value: String(value), tagName, dataset: {}, matches: () => true } }); }
  };
}

// Honest empty state, separate regions, and a complete tool index.
const h = harness();
h.navigate('overview');
assert.match(h.nodes['#main'].innerHTML, /<h1>Dashboard<\/h1>/);
assert.match(h.nodes['#main'].innerHTML, /Choose a star below to add your first favorite/);
assert.match(h.nodes['#main'].innerHTML, /As you edit valid calculator inputs/);
assert.match(h.nodes['#main'].innerHTML, /No saved calculations yet/);
assert.match(h.nodes['#main'].innerHTML, /id="favorites-heading"/);
assert.match(h.nodes['#main'].innerHTML, /id="recent-heading"/);
assert.match(h.nodes['#main'].innerHTML, /id="saved-recent-heading"/);
assert.equal(h.favorites().length, 2*h.ui.modules.length);
assert.equal(h.recents().length, 0);
assert.equal(h.writes.length, 0, 'Rendering overview does not create usage or overwrite stored data');

// Star controls are independent buttons. Repeated toggles retain focus and do not navigate.
const initialHashChanges = h.hashChanges;
let favorite = h.favorites().find(button => button.dataset.favorite === 'power');
assert.equal(favorite.getAttribute('type'), 'button');
assert.equal(favorite.getAttribute('aria-pressed'), 'false');
assert.match(favorite.innerHTML,/fill="none"/);
assert.match(favorite.getAttribute('aria-label'), /^Add /);
favorite.onclick();
assert.equal(h.hashChanges, initialHashChanges);
assert.equal(h.context.location.hash, '#overview');
assert.equal(h.ui.dashboardStore.isFavorite('power'), true);
favorite = h.favorites().find(button => button.dataset.favorite === 'power');
assert.equal(favorite.getAttribute('aria-pressed'), 'true');
assert.match(favorite.innerHTML,/fill="currentColor"/);
assert.match(favorite.getAttribute('aria-label'), /^Remove /);
assert.equal(h.document.activeElement, favorite);
assert.equal(h.favorites().filter(button => button.dataset.favorite === 'power').length, 3, 'Favorite appears in sidebar, favorites and all tools');
for (let index = 0; index < 6; index++) h.favorites().find(button => button.dataset.favorite === 'power').onclick();
assert.equal(h.ui.dashboardStore.isFavorite('power'), true);
assert.equal(h.hashChanges, initialHashChanges);
const refreshed = harness({ initial: Object.fromEntries(h.data) });
refreshed.navigate('overview');
assert.equal(refreshed.ui.dashboardStore.isFavorite('power'), true);

// Customize links scroll within overview without replacing its hash route.
let prevented = false;
h.document.querySelectorAll('a[href="#all-tools"]')[0].onclick({ preventDefault() { prevented = true; } });
assert.equal(prevented, true);
assert.equal(h.nodes['#all-tools'].scrolled, true);
assert.equal(h.context.location.hash, '#overview');

// Default navigation, toggles and resets do not invent recent calculation activity.
h.navigate('power');
assert.equal(h.nodes['#save-calculation'].disabled, false);
assert.equal(h.ui.dashboardStore.getSnapshot().recentEntries.length, 0);
favorite = h.favorites().find(button => button.dataset.favorite === 'power');
favorite.onclick();
assert.equal(favorite.getAttribute('aria-pressed'), 'false');
assert.match(favorite.innerHTML,/fill="none"/);
favorite.onclick();
assert.equal(favorite.getAttribute('aria-pressed'), 'true');
assert.match(favorite.innerHTML,/fill="currentColor"/);
assert.equal(h.context.location.hash, '#power');
h.navigate('amps');
h.navigate('power');
h.nodes['#reset'].onclick();
assert.equal(h.ui.dashboardStore.getSnapshot().recentEntries.length, 0);
h.change('watts', '');
assert.equal(h.nodes['#save-calculation'].disabled, true);
assert.equal(h.ui.dashboardStore.getSnapshot().recentEntries.length, 0, 'Invalid edited result is not recorded');
h.change('watts', 1200);
let recent = h.ui.dashboardStore.getSnapshot().recentEntries;
assert.equal(recent.length, 1);
assert.equal(recent[0].moduleId, 'power');
assert.equal(recent[0].state.watts, 1200);
assert.ok(Number.isFinite(Date.parse(recent[0].timestamp)));
assert.ok(recent[0].summary.length > 0);
assert.equal(h.store.list().length, 0, 'Recent input activity does not create a saved report');
h.change('watts', 2400);
assert.equal(h.ui.dashboardStore.getSnapshot().recentEntries.length, 1, 'Repeated edits deduplicate the calculator');
assert.equal(h.ui.dashboardStore.getSnapshot().recentEntries[0].state.watts, 2400);
const recentTimestamp = h.ui.dashboardStore.getSnapshot().recentEntries[0].timestamp;
h.navigate('overview');
h.navigate('power');
h.navigate('overview');
assert.equal(h.ui.dashboardStore.getSnapshot().recentEntries[0].timestamp, recentTimestamp, 'Navigation does not refresh recency');
assert.equal(h.recents().length, 1);

// Resume restores its actual input snapshot, then recalculates using today's engine.
h.ui.states.power.watts = 9999;
h.recents()[0].onclick();
assert.equal(h.ui.states.power.watts, 2400);
assert.equal(h.context.location.hash, '#power');
h.ui.route();
assert.equal(h.ui.getCurrentSnapshot().inputs.watts, 2400);
assert.match(h.nodes['#action-status'].textContent, /Resumed recent inputs and recalculated/);
assert.equal(h.ui.dashboardStore.getSnapshot().recentEntries[0].timestamp, recentTimestamp);
assert.equal(h.store.list().length, 0);

// Saving is explicit, shows a distinct section, and retains immutable saved data.
h.nodes['#save-calculation'].onclick();
h.dialogs.at(-1).onSave({ projectName: 'Panel schedule', calculationName: 'North feeder' });
assert.equal(h.store.list().length, 1);
const persistedRecords = h.storage.getItem(RECORDS_KEY);
h.navigate('overview');
assert.match(h.nodes['#main'].innerHTML, /North feeder/);
assert.match(h.nodes['#main'].innerHTML, /Panel schedule/);
assert.equal(h.recents().length, 1);
h.favorites().find(button => button.dataset.favorite === 'power').onclick();
assert.equal(h.storage.getItem(RECORDS_KEY), persistedRecords);
assert.ok(h.storage.getItem(DASHBOARD_KEY));
const saveOnly = harness();
saveOnly.navigate('power');
assert.equal(saveOnly.ui.dashboardStore.getSnapshot().recentEntries.length, 0);
saveOnly.nodes['#save-calculation'].onclick();
saveOnly.dialogs.at(-1).onSave({ projectName: 'Defaults checked', calculationName: 'Explicit save' });
assert.equal(saveOnly.ui.dashboardStore.getSnapshot().recentEntries.length, 1, 'Explicitly saving a valid result records actual activity');

// Blocked/full storage keeps controls usable and discloses the lack of persistence.
for (const options of [{ blockRead: true }, { blockWrite: true }]) {
  const blocked = harness(options);
  blocked.navigate('overview');
  blocked.favorites().find(button => button.dataset.favorite === 'power').onclick();
  assert.equal(blocked.ui.dashboardStore.isFavorite('power'), true);
  assert.match(blocked.nodes['#main'].innerHTML, /this tab only/);
  blocked.navigate('power');
  blocked.favorites().find(button => button.dataset.favorite === 'power').onclick();
  assert.match(blocked.nodes['#action-status'].textContent, /this tab only/);
  blocked.change('watts', 500);
  assert.equal(blocked.ui.dashboardStore.getSnapshot().recentEntries[0].state.watts, 500);
  blocked.navigate('overview');
  assert.match(blocked.nodes['#main'].innerHTML, /this tab only/);
}
const corruptedRaw = '{not valid JSON';
const corrupted = harness({ initial: { [DASHBOARD_KEY]: corruptedRaw, [RECORDS_KEY]: persistedRecords } });
corrupted.navigate('overview');
assert.match(corrupted.nodes['#main'].innerHTML, /damaged or from an unsupported version/);
assert.match(corrupted.nodes['#main'].innerHTML, /North feeder/);
corrupted.favorites().find(button => button.dataset.favorite === 'power').onclick();
assert.equal(corrupted.storage.getItem(DASHBOARD_KEY), corruptedRaw);
assert.equal(corrupted.storage.getItem(RECORDS_KEY), persistedRecords);

// Stored labels are escaped and obsolete calculator IDs cannot create phantom cards.
const textSafety = harness({ initial: { [DASHBOARD_KEY]: JSON.stringify({
  schemaVersion: 1,
  favoriteIds: ['power', 'removed-tool'],
  recentEntries: [
    { moduleId: 'power', timestamp: '2026-10-11T01:00:00.000Z', summary: '<img src=x onerror="bad()">', state: { watts: 600 } },
    { moduleId: 'removed-tool', timestamp: '2026-10-11T00:00:00.000Z' }
  ]
}) } });
textSafety.navigate('overview');
assert.equal(textSafety.recents().length, 1);
assert.match(textSafety.nodes['#main'].innerHTML, /&lt;img src=x onerror=&quot;bad\(\)&quot;&gt;/);
assert.doesNotMatch(textSafety.nodes['#main'].innerHTML, /<img|href="#removed-tool"/);

console.log('Dashboard UI passed: empty states, accessible repeated favorites, hash/focus preservation, genuine recent activity, resume, separate saved reports, and storage warnings.');

const css=fs.readFileSync(new URL('./dist/styles.css',import.meta.url),'utf8');
assert.match(css,/\.nav-tool[^}]*display:flex/);
assert.match(css,/white-space:nowrap/);
assert.match(source,/class="tool-heading"><h1>\$\{m.title\}<\/h1>\$\{favoriteButton\(m\)\}/);
assert.match(h.nodes['#navigation'].innerHTML,/title="Transformer protection"/);
