// Modeled DOM behavior and source-contract tests. These are not visual browser QA:
// the browser, rather than this harness, supplies native modal focus containment,
// background inertness, layout, and the Escape-to-cancel event translation.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {projectKey, projectNames, defaultCalculationName, createRecordStore, createSnapshot} from './dist/calculation-records.js';

const source = fs.readFileSync(new URL('./dist/record-dialog.js', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('./dist/app.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('./dist/styles.css', import.meta.url), 'utf8');
const decode = text => text.replace(/&(amp|lt|gt|quot|#39);/g, (_, entity) => ({amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'"})[entity]);

function harness() {
  const document = {activeElement: null};
  class Element {
    constructor(tag) {
      this.tagName = tag.toUpperCase();
      this.children = [];
      this.attributes = {};
      this.listeners = {};
      this.parentElement = null;
      this.hidden = false;
      this.disabled = false;
      this.open = false;
      this.focusCount = 0;
      this.showModalCount = 0;
      this.closeCount = 0;
      this._text = '';
      this._value = undefined;
    }
    setAttribute(key, value) {
      this.attributes[key] = String(value);
      if (key === 'hidden' || key === 'disabled') this[key] = true;
      if (key === 'value') this._value = String(value);
    }
    getAttribute(key) { return this.attributes[key] ?? null; }
    hasAttribute(key) { return Object.hasOwn(this.attributes, key); }
    get isConnected() { return this === document.body || Boolean(this.parentElement?.isConnected); }
    get value() {
      if (this._value !== undefined) return this._value;
      if (this.tagName === 'SELECT') return (this.children.find(node => node.hasAttribute('selected')) || this.children[0])?.value ?? '';
      return '';
    }
    set value(value) { this._value = String(value); }
    get textContent() { return this._text + this.children.map(node => node.textContent).join(''); }
    set textContent(value) { this.children.forEach(node => { node.parentElement = null; }); this.children = []; this._text = String(value); }
    appendChild(node) { node.parentElement = this; this.children.push(node); return node; }
    remove() {
      if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(node => node !== this);
      this.parentElement = null;
    }
    set innerHTML(html) {
      this._html = html;
      this.children = [];
      this._text = '';
      const stack = [this];
      for (const [token] of html.matchAll(/<[^>]*>|[^<]+/g)) {
        if (token.startsWith('</')) { stack.pop(); continue; }
        if (!token.startsWith('<')) { stack.at(-1)._text += decode(token); continue; }
        const match = /^<([a-z][\w-]*)([^>]*)>/i.exec(token);
        if (!match) continue;
        const node = new Element(match[1]);
        for (const attribute of match[2].matchAll(/([^\s=/>]+)(?:="([^"]*)"|='([^']*)'|=([^\s>]+))?/g)) {
          node.setAttribute(attribute[1], decode(attribute[2] ?? attribute[3] ?? attribute[4] ?? ''));
        }
        stack.at(-1).appendChild(node);
        if (!['INPUT', 'BR', 'HR', 'IMG', 'META', 'LINK'].includes(node.tagName)) stack.push(node);
      }
    }
    get innerHTML() { return this._html ?? ''; }
    querySelectorAll(selector) {
      const found = [];
      const matches = node => selector.startsWith('#') ? node.getAttribute('id') === selector.slice(1) : node.tagName.toLowerCase() === selector;
      for (const child of this.children) {
        if (matches(child)) found.push(child);
        found.push(...child.querySelectorAll(selector));
      }
      return found;
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
    addEventListener(type, callback) { (this.listeners[type] ??= []).push(callback); }
    dispatch(type) {
      const event = {type, target: this, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }};
      for (const callback of this.listeners[type] ?? []) callback(event);
      this[`on${type}`]?.(event);
      return event;
    }
    focus() { if (this.isConnected && !this.disabled) { document.activeElement = this; this.focusCount++; } }
    showModal() { assert.ok(this.isConnected, 'Dialog is mounted before showModal'); this.open = true; this.showModalCount++; }
    close() {
      if (!this.open) return;
      this.open = false;
      this.closeCount++;
      // Dispatch immediately so tests can inspect the eventual close cleanup.
      this.dispatch('close');
    }
  }
  document.body = new Element('body');
  document.createElement = tag => new Element(tag);
  document.querySelector = selector => document.body.querySelector(selector);
  const trigger = document.body.appendChild(new Element('button'));
  trigger.focus();
  let nativeCalls = 0;
  const forbiddenNativeDialog = () => { nativeCalls++; throw Error('Native prompt/confirm is forbidden for record dialogs'); };
  const context = vm.createContext({document, projectKey, projectNames, defaultCalculationName, prompt: forbiddenNativeDialog, confirm: forbiddenNativeDialog, window: {prompt: forbiddenNativeDialog, confirm: forbiddenNativeDialog}});
  vm.runInContext(source.replace(/^import[^\n]*\n/gm, '').replace(/\bexport\s+/g, '') + '\nglobalThis.ui = {showRecordDialog, confirmRecordClear, closeRecordDialog};', context);
  return {document, trigger, ui: context.ui, get nativeCalls() { return nativeCalls; }};
}

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; }
  catch (error) { console.error(`Record dialog: ${name}`); throw error; }
}
const records = [
  {projectName: 'North Wing', trashedAt: null},
  {projectName: '  NORTH   WING ', trashedAt: null},
  {projectName: 'South Wing', trashedAt: null},
  {projectName: 'Old Project', trashedAt: '2026-10-10T10:00:00.000Z'}
];
const field = (dialog, id) => {
  const node = dialog.querySelector(`#${id}`);
  assert.ok(node, `Expected #${id}`);
  return node;
};
const submit = dialog => dialog.querySelector('form').dispatch('submit');

test('empty library starts a native modal with a focused optional new-project field', () => {
  const h = harness();
  const dialog = h.ui.showRecordDialog({onSave() { assert.fail('Opening a dialog must not save'); }});
  assert.equal(dialog.tagName, 'DIALOG');
  assert.equal(dialog.className, 'record-dialog');
  assert.equal(dialog.showModalCount, 1);
  assert.equal(dialog.open, true);
  assert.equal(field(dialog, 'record-project-choice').value, 'new');
  assert.equal(field(dialog, 'record-project-choice').children.length, 1);
  assert.equal(field(dialog, 'record-new-project-field').hidden, false);
  assert.equal(field(dialog, 'record-new-project').disabled, false);
  assert.equal(field(dialog, 'record-new-project').value, '');
  assert.equal(h.document.activeElement, field(dialog, 'record-new-project'));
  assert.equal(field(dialog, 'record-calculation-name').value, '');
  assert.equal(field(dialog, 'record-calculation-name').hasAttribute('required'), false);
  assert.match(field(dialog, 'record-calculation-name').getAttribute('placeholder'), /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
});

test('normalized existing project is selected once and skips its new-name field', () => {
  const h = harness();
  const dialog = h.ui.showRecordDialog({records, projectName: '  noRTH\t  wing  ', calculationName: 'Feeder A', onSave() {}});
  const options = field(dialog, 'record-project-choice').children;
  assert.deepEqual(options.map(option => option.textContent), [...projectNames(records), 'New project…']);
  assert.equal(options.filter(option => projectKey(option.textContent) === projectKey('North Wing')).length, 1);
  assert.equal(options[Number(field(dialog, 'record-project-choice').value)].textContent, 'North Wing');
  assert.equal(field(dialog, 'record-new-project-field').hidden, true);
  assert.equal(field(dialog, 'record-new-project').disabled, true);
  assert.equal(field(dialog, 'record-new-project').value, '');
  assert.equal(h.document.activeElement, field(dialog, 'record-calculation-name'));
  assert.equal(field(dialog, 'record-calculation-name').value, 'Feeder A');
});

test('project selection toggles the new-name field, preserves typing, and focuses it', () => {
  const h = harness();
  let saved;
  const dialog = h.ui.showRecordDialog({records, projectName: 'North Wing', onSave: names => { saved = names; }});
  const choice = field(dialog, 'record-project-choice');
  const input = field(dialog, 'record-new-project');
  const original = choice.value;
  choice.value = 'new'; choice.dispatch('change');
  assert.equal(field(dialog, 'record-new-project-field').hidden, false);
  assert.equal(input.disabled, false);
  assert.equal(h.document.activeElement, input);
  input.value = 'West Wing';
  choice.value = original; choice.dispatch('change');
  assert.equal(field(dialog, 'record-new-project-field').hidden, true);
  assert.equal(input.disabled, true);
  assert.equal(input.value, 'West Wing');
  choice.value = 'new'; choice.dispatch('change');
  assert.equal(input.value, 'West Wing');
  field(dialog, 'record-calculation-name').value = 'New feeder';
  assert.equal(submit(dialog).defaultPrevented, true);
  assert.equal(saved.projectName, 'West Wing');
  assert.equal(saved.calculationName, 'New feeder');
  assert.equal(dialog.isConnected, false);
  assert.equal(h.document.activeElement, h.trigger);
  assert.equal(h.nativeCalls, 0);
});

test('saving an existing project uses its canonical label and ignores hidden typing', () => {
  const h = harness(); let saved;
  const dialog = h.ui.showRecordDialog({records, projectName: 'north wing', onSave: names => { saved = names; }});
  field(dialog, 'record-new-project').value = 'Ignored stale project';
  submit(dialog);
  assert.equal(saved.projectName, 'North Wing');
  assert.equal(saved.calculationName, '', 'Blank name reaches the storage defaulting layer');
  assert.equal(dialog.open, false);
  assert.equal(dialog.closeCount, 1);
});

test('unrecognized project preserves its supplied name in the new-project field', () => {
  const h = harness();
  const dialog = h.ui.showRecordDialog({records, projectName: 'West Wing', onSave() {}});
  assert.equal(field(dialog, 'record-project-choice').value, 'new');
  assert.equal(field(dialog, 'record-new-project').value, 'West Wing');
  assert.equal(h.document.activeElement, field(dialog, 'record-new-project'));
});

test('blank project and calculation names save as Unassigned and local date/time', () => {
  const h = harness();
  const data = new Map();
  const store = createRecordStore({getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value)});
  const snapshot = createSnapshot({id: 'test-calculation', title: 'Test calculation', fields: []}, {load: 100}, {results: [{label: 'Load', value: 100, unit: 'A'}], steps: [], warnings: [], sources: []});
  let saved;
  const before = new Date();
  const dialog = h.ui.showRecordDialog({onSave: names => { saved = store.save(snapshot, names); }});
  field(dialog, 'record-new-project').value = '  ';
  field(dialog, 'record-calculation-name').value = '  ';
  submit(dialog);
  const after = new Date();
  assert.equal(saved.projectName, 'Unassigned');
  assert.ok([defaultCalculationName(before), defaultCalculationName(after)].includes(saved.calculationName));
  assert.equal(store.load(saved.id).calculationName, saved.calculationName);
  assert.equal(dialog.open, false);
});

test('rename mode preserves names and has the correct heading and submit action', () => {
  const h = harness(); let saved;
  const dialog = h.ui.showRecordDialog({records, projectName: 'North Wing', calculationName: 'Feeder A', rename: true, onSave: names => { saved = names; }});
  assert.equal(field(dialog, 'record-dialog-title').textContent, 'Rename calculation');
  assert.equal(field(dialog, 'record-dialog-submit').textContent, 'Save changes');
  field(dialog, 'record-calculation-name').value = 'Feeder B'; submit(dialog);
  assert.equal(saved.projectName, 'North Wing');
  assert.equal(saved.calculationName, 'Feeder B');
});

for (const method of ['cancel button', 'Escape cancel event', 'native close', 'navigation close']) {
  test(`${method} dismisses without mutation and restores trigger focus`, () => {
    const h = harness(); let saves = 0;
    const dialog = h.ui.showRecordDialog({onSave() { saves++; }});
    if (method === 'cancel button') field(dialog, 'record-dialog-cancel').dispatch('click');
    if (method === 'Escape cancel event') assert.equal(dialog.dispatch('cancel').defaultPrevented, true);
    if (method === 'native close') dialog.close();
    if (method === 'navigation close') h.ui.closeRecordDialog();
    assert.equal(saves, 0);
    assert.equal(dialog.open, false);
    assert.equal(dialog.isConnected, false);
    assert.equal(dialog.closeCount, 1);
    assert.equal(h.document.activeElement, h.trigger);
    h.ui.closeRecordDialog();
    assert.equal(dialog.closeCount, 1, 'Repeated cleanup is harmless');
  });
}

test('a removed trigger is not focused after page content is replaced', () => {
  const h = harness();
  const dialog = h.ui.showRecordDialog({onSave() {}});
  h.trigger.remove();
  const heading = h.document.body.appendChild(h.document.createElement('h1'));
  heading.focus();
  dialog.close();
  assert.equal(h.trigger.focusCount, 1);
  assert.equal(h.document.activeElement, heading);
});

test('closing after a library rerender focuses the replacement saved heading', () => {
  const h = harness();
  const dialog = h.ui.showRecordDialog({onSave() {}});
  h.trigger.remove();
  const heading = h.document.body.appendChild(h.document.createElement('h1'));
  heading.setAttribute('id', 'saved-heading');
  dialog.close();
  assert.equal(h.trigger.focusCount, 1);
  assert.equal(h.document.activeElement, heading);
  assert.equal(heading.focusCount, 1);
});

test('reopening replaces the previous modal and preserves the original focus target', () => {
  const h = harness();
  const first = h.ui.showRecordDialog({onSave() { assert.fail('Reopening must not save'); }});
  const second = h.ui.showRecordDialog({rename: true, onSave() {}});
  assert.equal(first.open, false);
  assert.equal(first.isConnected, false);
  assert.equal(h.document.body.querySelectorAll('dialog').length, 1);
  assert.equal(second.open, true);
  second.close();
  assert.equal(h.document.activeElement, h.trigger);
});

test('save callback errors remain in the modal with entered values for a successful retry', () => {
  const h = harness(); let attempts = 0;
  const dialog = h.ui.showRecordDialog({onSave() { if (++attempts === 1) throw Error('Storage is full <retry>'); }});
  field(dialog, 'record-new-project').value = 'West Wing';
  field(dialog, 'record-calculation-name').value = 'Feeder A';
  submit(dialog);
  const error = field(dialog, 'record-dialog-error');
  assert.equal(error.textContent, 'Storage is full <retry>');
  assert.equal(error.children.length, 0, 'Callback errors are text, never injected markup');
  assert.equal(error.hidden, false);
  assert.equal(error.getAttribute('role'), 'alert');
  assert.equal(dialog.open, true);
  assert.equal(dialog.isConnected, true);
  assert.equal(field(dialog, 'record-new-project').value, 'West Wing');
  assert.equal(field(dialog, 'record-calculation-name').value, 'Feeder A');
  submit(dialog);
  assert.equal(attempts, 2);
  assert.equal(dialog.open, false);
  assert.equal(dialog.isConnected, false);
});

for (const [projectName, count] of [[undefined, 3], ['North Wing', 1]]) {
  test(`bulk clear ${projectName === undefined ? 'all' : 'project'} names its scope and needs submit`, () => {
    const h = harness(); let confirmed = 0;
    const dialog = h.ui.confirmRecordClear({projectName, count, onConfirm() { confirmed++; }});
    assert.equal(dialog.showModalCount, 1);
    assert.equal(confirmed, 0);
    assert.equal(field(dialog, 'record-dialog-title').textContent, projectName === undefined ? 'Clear all saved calculations?' : 'Clear project North Wing?');
    assert.equal(field(dialog, 'record-dialog-submit').textContent, 'Move to trash');
    const help = field(dialog, 'record-dialog-help').textContent;
    assert.match(help, new RegExp(`Move ${count} saved calculation${count === 1 ? '' : 's'}`));
    if (projectName !== undefined) assert.match(help, /in North Wing/);
    assert.match(help, /restore.*Trash/);
    assert.match(help, /Nothing will be permanently deleted/);
    assert.equal(submit(dialog).defaultPrevented, true);
    assert.equal(confirmed, 1);
    assert.equal(dialog.open, false);
    assert.equal(h.document.activeElement, h.trigger);
    assert.equal(h.nativeCalls, 0);
  });
}

test('bulk clear cancel and Escape never confirm a destructive action', () => {
  for (const method of ['click', 'cancel']) {
    const h = harness(); let confirmed = 0;
    const dialog = h.ui.confirmRecordClear({count: 4, onConfirm() { confirmed++; }});
    if (method === 'click') field(dialog, 'record-dialog-cancel').dispatch('click'); else dialog.dispatch('cancel');
    assert.equal(confirmed, 0);
    assert.equal(dialog.isConnected, false);
    assert.equal(h.document.activeElement, h.trigger);
  }
});

test('bulk clear callback failures keep confirmation open and retryable', () => {
  const h = harness(); let attempts = 0;
  const dialog = h.ui.confirmRecordClear({count: 2, onConfirm() { if (++attempts === 1) throw Error('Could not write storage'); }});
  submit(dialog);
  assert.equal(dialog.open, true);
  assert.equal(field(dialog, 'record-dialog-error').textContent, 'Could not write storage');
  assert.equal(field(dialog, 'record-dialog-error').hidden, false);
  submit(dialog);
  assert.equal(attempts, 2);
  assert.equal(dialog.isConnected, false);
});

test('project and calculation strings are escaped in options, values, headings, and help', () => {
  const h = harness();
  const unsafe = `<img src=x onerror="bad()"> & 'quoted'`;
  const dialog = h.ui.showRecordDialog({records: [{projectName: unsafe}], projectName: unsafe, calculationName: unsafe, onSave() {}});
  assert.equal(field(dialog, 'record-project-choice').children[0].textContent, unsafe);
  assert.equal(field(dialog, 'record-calculation-name').value, unsafe);
  assert.equal(dialog.querySelectorAll('img').length, 0);
  assert.match(dialog.innerHTML, /&lt;img/);
  const clear = h.ui.confirmRecordClear({projectName: unsafe, count: 1, onConfirm() {}});
  assert.equal(field(clear, 'record-dialog-title').textContent, `Clear project ${unsafe}?`);
  assert.ok(field(clear, 'record-dialog-help').textContent.includes(unsafe));
  assert.equal(clear.querySelectorAll('img').length, 0);
  const fresh = h.ui.showRecordDialog({projectName: unsafe, onSave() {}});
  assert.equal(field(fresh, 'record-new-project').value, unsafe);
  assert.equal(fresh.querySelectorAll('img').length, 0);
});

test('save and clear dialogs have valid accessible labels and initially hidden alerts', () => {
  for (const open of [ui => ui.showRecordDialog({onSave() {}}), ui => ui.confirmRecordClear({count: 1, onConfirm() {}})]) {
    const h = harness(); const dialog = open(h.ui);
    for (const attribute of ['aria-labelledby', 'aria-describedby']) {
      const id = dialog.getAttribute(attribute);
      assert.ok(id);
      assert.equal(dialog.querySelectorAll(`#${id}`).length, 1);
      assert.ok(field(dialog, id).textContent.length);
    }
    assert.equal(field(dialog, 'record-dialog-error').hidden, true);
    assert.equal(field(dialog, 'record-dialog-error').getAttribute('role'), 'alert');
    assert.equal(field(dialog, 'record-dialog-cancel').getAttribute('type'), 'button');
    assert.equal(field(dialog, 'record-dialog-submit').getAttribute('type'), 'submit');
    for (const label of dialog.querySelectorAll('label')) assert.ok(field(dialog, label.getAttribute('for')));
    for (const input of dialog.querySelectorAll('input')) assert.equal(input.getAttribute('maxlength'), '100');
  }
});

test('actual app navigation closes the modal before rendering each destination', () => {
  assert.match(app, /window\.addEventListener\(['"]hashchange['"],\s*route\)/);
  const routeSource = app.slice(app.indexOf('function route()'), app.indexOf("window.addEventListener('hashchange'"));
  assert.ok(routeSource.startsWith('function route()'));
  for (const [hash, expected] of [['', 'overview'], ['#saved', 'saved'], ['#conductor', 'conductor']]) {
    const h = harness(); let rendered;
    const dialog = h.ui.showRecordDialog({onSave() { assert.fail('Navigation must not submit'); }});
    const render = name => {
      assert.equal(dialog.isConnected, false, 'Dialog is closed before destination rendering');
      rendered = name;
    };
    vm.runInNewContext(routeSource + '\nroute();', {closeRecordDialog: h.ui.closeRecordDialog, location: {hash}, overview: () => render('overview'), savedLibrary: () => render('saved'), calculator: render, loadedNotice: null, window: {scrollTo() {}}});
    assert.equal(rendered, expected);
    assert.equal(h.document.activeElement, h.trigger);
  }
});

test('save, rename, and bulk clear avoid native prompt and confirm', () => {
  assert.doesNotMatch(source, /\b(?:prompt|confirm)\s*\(/);
  assert.doesNotMatch(app, /\b(?:prompt|confirm)\s*\(/);
  assert.match(app, /showRecordDialog\(/);
  assert.match(app, /confirmRecordClear\(/);
  assert.match(source, /dialog\.showModal\(\)/);
});

test('modal and controls use live light/dark tokens and honor hidden content', () => {
  const rule = css.match(/\.record-dialog\s*\{([^}]+)\}/)?.[1];
  assert.ok(rule);
  assert.match(rule, /background:\s*var\(--surface\)/);
  assert.match(rule, /color:\s*var\(--ink\)/);
  assert.match(rule, /border:[^;]*var\(--line\)/);
  assert.match(rule, /max-height:/);
  assert.match(rule, /overflow:\s*auto/);
  assert.match(css, /\.record-dialog\s+\[hidden\]\s*\{\s*display:\s*none\s*\}/);
  assert.match(css, /\.record-dialog::backdrop\s*\{/);
  const controls = css.match(/\.field input,\.field select\s*\{([^}]+)\}/)?.[1];
  assert.ok(controls);
  assert.match(controls, /background:\s*var\(--surface\)/);
  assert.match(controls, /color:\s*var\(--ink\)/);
  const light = css.match(/:root\s*\{([^}]+)\}/)?.[1];
  const dark = css.match(/:root\[data-theme="dark"\]\s*\{([^}]+)\}/)?.[1];
  for (const theme of [light, dark]) for (const token of ['surface', 'ink', 'line']) assert.match(theme, new RegExp(`--${token}:`));
  assert.doesNotMatch(source, /style=|data-theme=/, 'Dialogs inherit the current app theme rather than freezing inline colors');
});

console.log(`${passed} record-dialog modeled-DOM and source-contract tests passed (not visual browser QA).`);
