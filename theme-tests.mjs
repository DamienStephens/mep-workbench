// Behavior tests with a minimal DOM. These do not substitute for visual browser QA.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync(new URL('./dist/theme.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('./dist/index.html', import.meta.url), 'utf8');
function harness({saved = null, dark = false, restricted = false, ready = false, matchMedia = true} = {}) {
  const root = {dataset: {}};
  const listeners = {}, attributes = {}, writes = [], meta = {};
  let mounted = ready;
  const button = {setAttribute(k,v) {attributes[k] = v}, addEventListener(k,fn) {listeners[k] = fn}};
  const media = {matches: dark, addEventListener(k,fn) {listeners.system = fn}};
  const document = {documentElement: root, readyState: ready ? 'complete' : 'loading',
    getElementById: () => mounted ? button : null, querySelector: () => ({setAttribute(k,v){meta[k]=v}}),
    addEventListener(k,fn) {listeners[k] = fn}};
  const window = {addEventListener(k,fn) {listeners[k] = fn}};
  if (matchMedia) window.matchMedia = () => media;
  vm.runInNewContext(source, {document, window, localStorage: {
    getItem() {if (restricted) throw Error('blocked'); return saved},
    setItem(k,v) {if (restricted) throw Error('blocked'); writes.push([k,v])}
  }});
  return {root, attributes, writes, media, listeners, meta, mount() {mounted = true; listeners.DOMContentLoaded()}, click() {listeners.click()}};
}
let passed = 0;
function test(name, fn) {try {fn(); passed++} catch (e) {console.error(name); throw e}}
for (const dark of [true, false]) test(`System ${dark} applied before DOM ready`, () => {
  const h = harness({dark}); assert.equal(h.root.dataset.theme, dark ? 'dark' : 'light');
  h.mount(); assert.equal(h.attributes['aria-pressed'], String(dark));
  assert.equal(h.meta.content, dark ? '#161616' : '#ffffff');
});
for (const saved of ['light','dark']) test(`Saved ${saved} overrides system`, () => {
  const h = harness({saved, dark: saved !== 'dark'}); assert.equal(h.root.dataset.theme, saved);
  h.mount(); h.media.matches = !h.media.matches; h.listeners.system(); assert.equal(h.root.dataset.theme, saved);
});
test('Two clicks alternate and save explicit preference', () => {
  const h = harness(); h.mount(); h.click(); assert.equal(h.root.dataset.theme,'dark'); assert.equal(h.attributes['aria-pressed'],'true');
  h.click(); assert.equal(h.root.dataset.theme,'light'); assert.equal(h.attributes['aria-pressed'],'false');
  assert.deepEqual(h.writes, [['mep-workbench-theme','dark'], ['mep-workbench-theme','light']]);
  h.media.matches = true; h.listeners.system(); assert.equal(h.root.dataset.theme,'light');
});
test('Invalid saved values fall back and follow live system changes', () => {
  const h = harness({saved:'invalid'}); h.mount(); h.media.matches = true; h.listeners.system(); assert.equal(h.root.dataset.theme,'dark');
});
test('Unavailable storage never breaks initialization or toggle', () => {
  const h = harness({restricted:true, dark:true}); h.mount(); h.click(); assert.equal(h.root.dataset.theme,'light');
});
test('Cross-tab updates sync and deleting preference restores system', () => {
  const h = harness({saved:'light', dark:true}); h.mount();
  h.listeners.storage({key:'other',newValue:'dark'}); assert.equal(h.root.dataset.theme,'light');
  h.listeners.storage({key:'mep-workbench-theme',newValue:'dark'}); assert.equal(h.root.dataset.theme,'dark');
  h.listeners.storage({key:'mep-workbench-theme',newValue:'light'}); assert.equal(h.root.dataset.theme,'light');
  h.listeners.storage({key:null,newValue:null}); assert.equal(h.root.dataset.theme,'dark');
});
test('No matchMedia falls back safely to light', () => {
  const h = harness({matchMedia:false,ready:true}); assert.equal(h.root.dataset.theme,'light'); h.click(); assert.equal(h.root.dataset.theme,'dark');
});
test('HTML loads early standalone script and versions all assets', () => {
  assert.ok(html.indexOf('./theme.js?v=2.14.0') < html.indexOf('./styles.css?v=2.14.0'));
  assert.match(html, /src="\.\/app\.js\?v=2\.14\.0"/);
  assert.match(html, /id="theme-toggle"[^>]*type="button"[^>]*aria-label="Dark mode"[^>]*aria-pressed="false"/);
  assert.ok(!html.includes('v1.0.1'));
});
console.log(`${passed} theme tests passed.`);
