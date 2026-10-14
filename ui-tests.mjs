import { createSnapshot, buildSummary, summaryFromSnapshot, copySummaryFromSnapshot, createRecordStore } from './dist/calculation-records.js';
import { transformerProtection, evaluateTransformerProtection, migrateProtectionState,transformerBreakerOptions, transformerOcpdRatings, secondaryRuleConditions } from './dist/transformer-protection.js';
// Node-only regression tests for rendered HTML constraints and result rendering.
// This models number-input validity; it does not replace real-browser visual QA.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as calc from './dist/calc.js';
import { systemOptions, voltageOptions } from './dist/voltage.js';

const source = fs.readFileSync(new URL('./dist/app.js', import.meta.url), 'utf8')
  .replace(/^import[^\n]+\n/gm, '')
  .replace(/route\(\);\s*$/, '');
let passed = 0;
function test(name, fn) {
  try { fn(); passed++; }
  catch (error) { console.error(`FAIL ${name}`); throw error; }
}
function inputFromHTML(tag) {
  const attrs = Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
  return {
    ...attrs,
    setAttribute(key, value) { this[key] = value; },
    checkValidity() {
      if (this.value.trim() === '') return !/\brequired\b/.test(tag);
      const value = Number(this.value);
      if (!Number.isFinite(value)) return false;
      if (attrs.min !== undefined && value < Number(attrs.min)) return false;
      if (attrs.max !== undefined && value > Number(attrs.max)) return false;
      if (attrs.step === 'any') return true;
      // HTML number-input step base is min, then the value attribute, then zero.
      const base = Number(attrs.min ?? attrs.value ?? 0);
      const steps = (value - base) / Number(attrs.step ?? 1);
      return Math.abs(steps - Math.round(steps)) < 1e-8;
    }
  };
}
function harness(saved = {}) {
  const nodes = { '#results': { innerHTML: '' }, '#sources': { innerHTML: '' } };
  let inputs = [];
  const context = vm.createContext({createSnapshot, buildSummary, summaryFromSnapshot, copySummaryFromSnapshot, createRecordStore, transformerProtection, evaluateTransformerProtection, migrateProtectionState,transformerBreakerOptions, transformerOcpdRatings, secondaryRuleConditions,
    calc, systemOptions, voltageOptions, structuredClone, console,
    localStorage: { getItem: () => JSON.stringify(saved), setItem() {} },
    window: { addEventListener() {} },
    document: {
      querySelector: selector => nodes[selector],
      querySelectorAll: selector => selector === '#calculator-form input:not([data-ambient-helper])' ? inputs : []
    }
  });
  vm.runInContext(source + '\nglobalThis.ui = { modules, states, fieldHTML, rowsHTML, calculate, defaults };', context);
  const ui = context.ui;
  function render(id, overrides = {}) {
    const module = ui.modules.find(m => m.id === id);
    Object.assign(ui.states[id], overrides);
    const state = ui.states[id];
    const html = module.fields.map(f => ui.fieldHTML(f, state)).join('') + (id === 'conduit' ? ui.rowsHTML(state) : '');
    inputs = [...html.matchAll(/<input\b[^>]*>/g)].map(m => inputFromHTML(m[0]));
    ui.calculate(module);
    return { inputs, html, output: nodes['#results'].innerHTML, state };
  }
  return { ui, render };
}
function successful(rendered) {
  assert.ok(rendered.inputs.every(input => input.checkValidity()), 'Every visible number input must satisfy its HTML constraints');
  assert.ok(rendered.output.includes('result-hero'), 'Rendered result hero is missing');
  assert.ok(!rendered.output.includes('role="alert"'), 'Unexpected validation error');
  assert.ok(rendered.inputs.every(input => input['aria-invalid'] === 'false'));
}
function hero(rendered, value, unit) {
  successful(rendered);
  assert.ok(rendered.output.includes(`<div class="result-value">${value}<span class="result-unit">${unit}</span>`), `Expected primary output ${value} ${unit}`);
}

test('Constraint model reproduces original PF step mismatch', () => {
  for (const value of [0.8, 1]) assert.equal(inputFromHTML(`<input type="number" min="0.001" max="1" step="0.01" value="${value}" required>`).checkValidity(), false);
});
for (const id of ['conductor', 'service', 'transformer', 'power', 'amps', 'conduit', 'drop', 'box']) {
  test(`${id}: default inputs render results`, () => successful(harness().render(id)));
}
test('Service inputs retain Load with inline allowance guidance and unchanged results', () => {
  for (const id of ['service']) {
    const h = harness();
    const rendered = h.render(id);
    successful(rendered);
    assert.match(rendered.html, /<label for="field-load">Load <span class="field-unit">\(A\)<\/span><\/label>/);
    assert.match(rendered.html, /<small id="hint-load">Total sizing current, already including any required continuous-load allowance\. No extra 125% multiplier is applied\.<\/small>/);
    const field = h.ui.modules.find(m => m.id === id).fields.find(f => f.key === 'load');
    field.label = 'Design load';
    assert.equal(h.render(id).output, rendered.output, 'Changing the input label must not change calculated results');
    assert.equal(rendered.inputs.find(input => input.name === 'load')['aria-describedby'], 'hint-load');
  }
});
test('1000 W at PF .8 produces 1250 VA', () => hero(harness().render('power'), '1,250', 'VA'));
test('1250 VA at PF .8 produces 1000 W', () => hero(harness().render('power', { mode: 'vaToWatts' }), '1,000', 'W'));
test('2400 W at 240 V and PF 1 produces 10 A', () => hero(harness().render('amps'), '10.0', 'A'));
test('10 A at 240 V and PF 1 produces 2400 W', () => hero(harness().render('amps', { mode: 'ampsToWatts', value: 10 }), '2,400', 'W'));
test('Current hero retains a trailing decimal, zero and direct raw rounding', () => {
  hero(harness().render('amps', { value: 0 }), '0.0', 'A');
  hero(harness().render('amps', { value: 149.988, voltage: 120, pf: 1 }), '1.2', 'A');
  hero(harness().render('transformer', { kva: 48, primary: 480, secondary: 240, primaryPhase: '1', secondaryPhase: '1' }), '100.0', 'A');
});
for (const pf of [.001, .8, .85, .9, .9876, 1]) {
  for (const mode of ['wattsToVA', 'vaToWatts']) test(`power ${mode}, PF ${pf}`, () => {
    const rendered = harness().render('power', { mode, pf });
    successful(rendered);
    assert.ok(rendered.html.includes('step="any"'));
    assert.equal(rendered.html.includes('name="watts"'), mode === 'wattsToVA');
    assert.equal(rendered.html.includes('name="va"'), mode === 'vaToWatts');
  });
  for (const mode of ['wattsToAmps', 'ampsToWatts']) for (const phase of ['1', '3']) test(`amps ${mode}, ${phase}-phase, PF ${pf}`, () => {
    const value = mode === 'ampsToWatts' ? 10 : 2400;
    const rendered = harness().render('amps', { mode, phase, pf, value });
    const expected = mode === 'ampsToWatts' ? (phase === '3' ? Math.sqrt(3) : 1) * 240 * value * pf : value / ((phase === '3' ? Math.sqrt(3) : 1) * 240 * pf);
    const formatted = mode === 'wattsToAmps' ? expected.toFixed(1) : new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 }).format(Number(expected.toFixed(3)));
    hero(rendered, formatted, mode === 'ampsToWatts' ? 'W' : 'A');
  });
}
for (const id of ['power', 'amps']) for (const pf of ['', 0, -.1, 1.001]) test(`${id} rejects invalid PF ${JSON.stringify(pf)}`, () => {
  const rendered = harness().render(id, { pf });
  assert.ok(rendered.output.includes('role="alert"'));
  assert.ok(!rendered.output.includes('result-hero'));
  assert.equal(rendered.inputs.find(i => i.name === 'pf')['aria-invalid'], 'true');
});
test('Saved inputs survive and calculate in both converters', () => {
  const h = harness({ power: { mode: 'vaToWatts', va: 2000, pf: .85 }, amps: { mode: 'ampsToWatts', value: 10, voltage: 240, phase: '1', pf: .9 } });
  hero(h.render('power'), '1,700', 'W');
  hero(h.render('amps'), '2,160', 'W');
  assert.equal(h.ui.states.power.pf, .85);
  assert.equal(h.ui.states.amps.pf, .9);
});
test('Compact results keep conductor size, OCPD and EMT above details', () => {
  const {output}=harness().render('conductor');
  const [visible,additional,details]=output.split('<details');
  for(const label of ['Copper conductor per set','Total OCPD','Minimum raceway per set','Separate raceways'])assert.ok(visible.includes(label),label);
  assert.ok(additional.includes('Additional results'));
  assert.ok(additional.includes('Actual fill per raceway'));
  assert.ok(!additional.includes('Method'));
  assert.ok(details.includes('Calculation details'));
  assert.ok(!details.includes('metric-grid'));
  assert.ok(details.includes('Method'));
  assert.ok(!/<details[^>]*\sopen(?:[\s>])/.test(output));
});
test('Safety conditions stay outside collapsed details', () => {
  for(const id of ['conductor','service']) {
    const {output}=harness().render(id,{terminal:90,terminal90Confirmed:true,parallelSets:2,...(id==='conductor'?{ocpd:200}:{load:200})});
    const visible=output.split('<details')[0];
    assert.ok(visible.includes('90°C equipment rating condition'));
    assert.ok(visible.includes('1/0 AWG'));
  }
  assert.ok(harness().render('conductor',{terminal:90}).output.split('<details')[0].includes('design assumption'));
  assert.ok(harness().render('amps',{voltageMode:'custom',voltage:245,voltageConfirmed:true}).output.split('<details')[0].includes('custom 245 V'));
});
test('Failed target and fill checks remain prominent', () => {
  for(const [id,state,expected] of [['conduit',{trade:'1/2',rows:[{size:'10',count:40}]},'Exceeds fill limit'],['drop',{length:1000},'At or above 5%'],['box',{volume:1},'Insufficient volume']]) {
    assert.ok(harness().render(id,state).output.split('<details')[0].includes(expected));
  }
});
test('All result data and warnings remain available in the presentation', () => {
  const h=harness();
  for(const m of h.ui.modules){
    const {output,state}=h.render(m.id,m.id==='protection'?{installationConfirmed:true}:{});
    const result=(m.id==='protection'?evaluateTransformerProtection:calc[m.id])(state);
    for(const r of result.results) {
      assert.ok(output.includes(r.label),`${m.id}: ${r.label}`);
      if(r.displayValue!==undefined) {
        assert.match(r.displayValue,/^\d+\.\d$/);
        assert.ok(output.includes(`>${r.displayValue}<span class="result-unit">A</span>`)||output.includes(`>${r.displayValue} <span class="metric-unit">A</span>`),`${m.id}: ${r.label} must retain the exact fixed-decimal display text`);
      }
    }
    for(const warning of result.warnings) assert.ok(output.includes(warning.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;')),`${m.id}: missing warning`);
  }
});
test('700/750 kcmil appear in conduit and drop dropdowns, remain excluded from box fill', () => {
  const h = harness();
  for (const id of ['conduit', 'drop']) {
    const rendered = h.render(id);
    for (const size of (id==='drop'?['750']:['700','750'])) assert.match(rendered.html, new RegExp(`<option value="${size}"[^>]*>${size} kcmil`));
    assert.doesNotMatch(rendered.html, /value="740"|value="800"/);
  }
  const rendered = h.render('box');
  for (const size of ['600', '700', '750']) assert.ok(!rendered.html.includes(`value="${size}"`));
});
for (const size of ['700', '750']) test(`${size} kcmil saved conduit/drop selections survive reload and render results`, () => {
  const h = harness({conduit:{rows:[{size,count:3}],trade:'auto'},drop:{size}});
  for (const id of ['conduit','drop']) {
    const rendered=h.render(id);if(id==='drop'&&size==='700'){assert.match(rendered.output,/No supported impedance/);assert.match(rendered.html,/saved: 700/);continue}successful(rendered);
    assert.match(rendered.html,new RegExp(`<option value="${size}" selected>${size} kcmil`));
  }
  assert.match(h.render('conduit').output,/3 in\./);
});
for (const id of ['conductor','service']) for (const [material,load,terminal,parallelSets,size] of [
  ['copper',450,75,1,'700'],['copper',400,60,1,'750'],
  ['aluminum',350,75,1,'700'],['aluminum',1600,60,5,'750']
]) test(`${id} renders ${size} kcmil ${material} result`, () => {
  const h=harness(), rendered=h.render(id,{material,...(id==='service'?{load}:{}),terminal,parallelSets,configuration:'three-phase-3-wire',ambient:30,ocpd:id==='conductor'?load:0});
  successful(rendered);assert.match(rendered.output,new RegExp(`<div class="result-value">${size} kcmil</div>`));
  assert.match(rendered.html,id==='conductor'?/OCPD Rating/:/<label for="field-load">Load /);
  if(id==='service')assert.doesNotMatch(rendered.output,/Base-minimum Cu EGC/);
  else assert.match(rendered.output,/Base-minimum Cu EGC/);
  const failed=h.render(id,{load:600,parallelSets:1,...(id==='conductor'?{ocpd:600}:{})});
  assert.match(failed.output,/role="alert"/);assert.match(failed.output,/through 750 kcmil/);
});
test('Standalone result removes old target and size recommendation', () => {
  const r=harness().render('drop',{size:'750',length:2000,current:100,voltage:120,phase:'1',target:3});
  successful(r);assert.doesNotMatch(r.output,/Minimum size for drop only|Target check/);assert.match(r.output,/Percentage voltage drop/);
});
console.log(`${passed} UI regression tests passed; 0 failed`);
