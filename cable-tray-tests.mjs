import assert from 'node:assert/strict';
import {calculateCableTray, tray, cableTrayWidths, cableTrayAreaTable, cableTraySingleAreaTable, cableTrayConductorSizes, cableTraySingleSizes, cableTrayDiameterReferences} from './dist/cable-tray.js';

let tests = 0;
const check = (name, fn) => {try {fn(); tests++;} catch (error) {error.message = `${name}: ${error.message}`; throw error;}};
const row = (od = 1, count = 12, sizeClass = 'small') => ({name: 'Cable', od, count, sizeClass});
const base = {trayType: 'ladder', service: 'power', width: 'auto', depth: 4, voltage: 600, rows: [row()]};
const run = input => {const result = tray({...base, ...input}); assert.equal(result.error, undefined, result.error); assert.ok(!/NaN|Infinity/.test(JSON.stringify(result))); return result;};
const invalid = (input, message) => {const result = tray({...base, ...input}); assert.ok(result.error); if (message) assert.match(result.error, message); assert.deepEqual(result.results, []); assert.equal(result.selectedWidth, undefined); assert.ok(result.sources.length);};
const near = (a, b) => assert.ok(Math.abs(a - b) <= Math.max(1, Math.abs(b)) * 1e-12, `${a} != ${b}`);
const label = (result, name) => {const found = result.results.find(r => r.label === name); assert.ok(found, `Missing ${name}`); return found.value;};
// Find a reproducibly exact floating-point area fixture. Threshold decisions are
// made on unrounded arithmetic, not with a broad tolerance or display rounding.
function areaRow(area, sizeClass = 'small') {
  for (let count = 1; count <= 4096; count++) {
    const od = Math.sqrt(4 * area / (Math.PI * count));
    if (od <= 3 && count * Math.PI * od * od / 4 === area) return row(od, count, sizeClass);
  }
  throw Error(`No exact boundary fixture for area ${area}`);
}

check('export alias and exact supported tables', () => {
  assert.equal(tray, calculateCableTray);
  assert.deepEqual(cableTrayWidths, [6, 9, 12, 18, 24, 30, 36]);
  assert.deepEqual(cableTrayAreaTable.ladder, [7, 10.5, 14, 21, 28, 35, 42]);
  assert.deepEqual(cableTrayAreaTable.solid, [5.5, 8, 11, 16.5, 22, 27.5, 33]);
});
check('small ladder golden fixture', () => {
  const r = run({});
  assert.equal(r.minimumWidth, 9); assert.equal(r.selectedWidth, 9); assert.equal(r.mode, 'small');
  assert.equal(r.section, '392.22(A)(1)(b)'); near(r.totalArea, 3 * Math.PI); near(r.utilization, 3 * Math.PI / 10.5 * 100);
  assert.equal(label(r, 'Tray sizing check'), 'Within modeled sizing limits');
});
check('small solid golden fixture', () => {
  const r = run({trayType: 'solid'}); assert.equal(r.minimumWidth, 12); assert.equal(r.allowableArea, 11); assert.equal(r.section, '392.22(A)(3)(b)');
});
for (const trayType of ['ladder', 'solid']) {
  check(`${trayType} large 6 and 7 cable golden fixtures`, () => {
    const six = run({trayType, rows: [row(1.75, 6, 'large')]});
    const seven = run({trayType, rows: [row(1.75, 7, 'large')]});
    assert.equal(six.minimumWidth, 12); assert.equal(seven.minimumWidth, 18); near(six.largeDiameterSum, 10.5);
    near(six.allowableWidth, trayType === 'ladder' ? 12 : 10.8);
    assert.equal(six.requiredArea, null); assert.ok(six.warnings.some(w => /single layer/.test(w)));
  });
  check(`${trayType} mixed golden fixture and separate actual area`, () => {
    const r = run({trayType, rows: [row(1.75, 3, 'large'), row(0.6, 10)]});
    assert.equal(r.minimumWidth, trayType === 'ladder' ? 9 : 12); assert.equal(r.mode, 'mixed');
    near(r.smallArea, 0.9 * Math.PI); near(r.largeDiameterSum, 5.25);
    near(r.totalArea, 3 * Math.PI * 1.75 ** 2 / 4 + 0.9 * Math.PI);
    near(r.allowableArea, trayType === 'ladder' ? 4.2 : 5.75);
    near(r.requiredArea, r.smallArea + (trayType === 'ladder' ? 1.2 : 1) * r.largeDiameterSum);
    assert.notEqual(r.requiredArea, r.totalArea);
    near(r.utilization, r.requiredArea / r.tableBase * 100);
    assert.ok(r.warnings.some(w => /do not place smaller cables on top/.test(w)));
    label(r, 'Mixed-rule budget usage');
  });
  check(`${trayType} control-only golden depth 4 and capped depth 8`, () => {
    const four = run({trayType, service: 'control', rows: [row(0.5, 100)]});
    const eight = run({trayType, service: 'control', depth: 8, rows: [row(0.5, 100)]});
    near(four.totalArea, 25 * Math.PI / 4); assert.equal(four.minimumWidth, trayType === 'ladder' ? 12 : 18);
    assert.equal(eight.minimumWidth, 9); assert.equal(eight.creditedDepth, 6);
    assert.equal(four.creditedDepth, 4); assert.ok(eight.warnings.some(w => /Only 6 in/.test(w)));
  });
  check(`${trayType} changing control conductor size does not change method`, () => {
    const a = run({trayType, service: 'control', rows: [row(0.5, 100)]});
    const b = run({trayType, service: 'control', rows: [row(0.5, 100, 'large')]});
    assert.equal(a.minimumWidth, b.minimumWidth); assert.equal(a.mode, b.mode); assert.equal(a.utilization, b.utilization);
  });
  check(`${trayType} power table capacity does not grow with depth`, () => {
    const a = run({trayType, depth: 3}), b = run({trayType, depth: 100});
    assert.equal(a.minimumWidth, b.minimumWidth); assert.equal(a.allowableArea, b.allowableArea); assert.equal(a.creditedDepth, null);
  });
  check(`${trayType} large exact width boundary and tiny excess`, () => {
    const od = trayType === 'ladder' ? 1 : 0.9;
    const at = run({trayType, width: 6, rows: [row(od, 6, 'large')]});
    const above = run({trayType, width: 6, rows: [row(od + 1e-10, 6, 'large')]});
    assert.equal(at.status, 'pass'); assert.equal(at.utilization, 100); assert.equal(above.status, 'fail'); assert.equal(above.minimumWidth, 9);
  });
  check(`${trayType} negative mixed residual cannot pass or make infinity`, () => {
    const r = run({trayType, width: 6, rows: [row(1, 8, 'large'), row(0.01, 1)]});
    assert.ok(r.allowableArea < 0); assert.equal(r.status, 'fail'); assert.ok(r.utilization > 100);
    assert.ok(r.warnings.some(w => /negative/.test(w))); assert.equal(r.candidates[0].geometricPass, false);
  });
  check(`${trayType} zero mixed residual rejects any positive small area`, () => {
    const deduction = trayType === 'ladder' ? 1.2 : 1;
    const r = run({trayType, width: 6, depth: 8, rows: [row(cableTrayAreaTable[trayType][0] / deduction, 1, 'large'), row(0.001, 1)]});
    near(r.allowableArea, 0); assert.equal(r.status, 'fail'); assert.ok(r.utilization > 100);
  });
  for (const [index, width] of cableTrayWidths.entries()) {
    check(`${trayType} ${width}in all-small exact area boundary`, () => {
      const bound = cableTrayAreaTable[trayType][index], cable = areaRow(bound);
      const at = run({trayType, width, rows: [cable]});
      const above = run({trayType, width, rows: [{...cable, od: cable.od * (1 + 1e-10)}]});
      assert.equal(at.totalArea, bound); assert.equal(at.status, 'pass'); assert.equal(at.minimumWidth, width);
      assert.equal(above.status, 'fail'); assert.ok(above.utilization > 100);
    });
    check(`${trayType} ${width}in mixed exact residual boundary`, () => {
      const deduction = trayType === 'ladder' ? 1.2 : 1;
      const allowance = cableTrayAreaTable[trayType][index] - deduction * 2;
      const small = areaRow(allowance), large = row(1, 2, 'large');
      const at = run({trayType, width, rows: [large, small]});
      const above = run({trayType, width, rows: [large, {...small, od: small.od * (1 + 1e-10)}]});
      assert.equal(at.smallArea, allowance); assert.equal(at.status, 'pass'); assert.equal(at.minimumWidth, width);
      assert.equal(above.status, 'fail'); near(at.utilization, 100);
    });
    check(`${trayType} ${width}in control exact area boundary`, () => {
      const area = (trayType === 'ladder' ? 0.5 : 0.4) * width * 4, cable = areaRow(area);
      const at = run({trayType, service: 'control', width, rows: [cable]});
      const above = run({trayType, service: 'control', width, rows: [{...cable, od: cable.od * (1 + 1e-10)}]});
      assert.equal(at.totalArea, area); assert.equal(at.status, 'pass'); assert.equal(at.minimumWidth, width);
      assert.equal(above.status, 'fail'); assert.equal(at.utilization, 100);
    });
  }
}

check('single-layer solid method keeps 90 percent width separate from area', () => {
  const r = run({trayType: 'solid', width: 6, rows: [row(1, 6, 'large')]});
  assert.equal(r.status, 'fail'); assert.equal(r.minimumWidth, 9); near(r.requiredWidth, 6 / 0.9); assert.equal(r.allowableArea, null);
});
check('diameter sum includes quantities', () => {
  const r = run({rows: [row(1, 4, 'large'), row(2, 3, 'large')]}); near(r.largeDiameterSum, 10); assert.equal(r.minimumWidth, 12); assert.equal(r.totalCount, 7);
});
check('row splitting and ordering preserve size selection', () => {
  const a = run({rows: [row(1, 12)]}), b = run({rows: [row(1, 5), row(1, 7)]});
  near(a.totalArea, b.totalArea); assert.equal(a.minimumWidth, b.minimumWidth);
  const mixed = [row(1.75, 3, 'large'), row(0.6, 10)];
  assert.equal(run({rows: mixed}).minimumWidth, run({rows: mixed.toReversed ? mixed.toReversed() : [...mixed].reverse()}).minimumWidth);
});
check('input and row objects remain untouched', () => {
  const input = structuredClone(base), before = structuredClone(input); tray(input); assert.deepEqual(input, before);
});
check('explicit too-small width fails but reports next supported size', () => {
  const r = run({width: 6}); assert.equal(r.status, 'fail'); assert.equal(r.selectedWidth, 6); assert.equal(r.minimumWidth, 9); assert.ok(r.warnings.some(w => /selected 6 in.*fails/.test(w)));
});
check('explicit larger width assesses that width without changing minimum', () => {
  const r = run({width: 18}); assert.equal(r.status, 'pass'); assert.equal(r.selectedWidth, 18); assert.equal(r.minimumWidth, 9); assert.equal(r.allowableArea, 21);
});
check('auto overrange never selects maximum width as a passing size', () => {
  const r = run({rows: [row(1, 100)]}); assert.equal(r.status, 'fail'); assert.equal(r.minimumWidth, null); assert.equal(r.selectedWidth, null); assert.equal(r.assessedWidth, 36); assert.ok(r.warnings.some(w => /not a selected or recommended/.test(w)));
});
check('manual overrange continues to show requested failed size', () => {
  const r = run({width: 12, rows: [row(1, 100)]}); assert.equal(r.status, 'fail'); assert.equal(r.minimumWidth, null); assert.equal(r.selectedWidth, 12);
});
check('numeric UI string inputs are supported', () => {
  const r = run({width: '9', depth: '4', voltage: '600', rows: [row('1', '12')]}); assert.equal(r.selectedWidth, 9); assert.equal(r.status, 'pass');
});
check('2,000 V boundary included', () => {assert.equal(run({voltage: 2000}).status, 'pass'); invalid({voltage: 2000.00001}, /2,000/);});
check('3 in conservative power-depth boundary included', () => {assert.equal(run({depth: 3}).status, 'pass'); invalid({depth: 2.999999}, /calculator scope limit/);});
check('shallow control-only tray remains supported', () => {const r = run({service: 'control', depth: 0.5, rows: [row(0.5, 1)]}); assert.equal(r.status, 'pass'); assert.equal(r.creditedDepth, 0.5);});
check('control at 6 and beyond 6 has identical capacity', () => {for (const depth of [6, 6.000001, 8, 100]) assert.equal(run({service: 'control', depth, width: 6}).allowableArea, 18);});
check('individual OD must fit actual depth', () => {invalid({rows: [row(4.00000001, 1, 'large')]}, /exceeds.*usable tray depth/); assert.equal(run({rows: [row(4, 1, 'large')]}).status, 'pass');});
check('depth fit uses actual depth rather than credited control depth', () => {const r = run({service: 'control', depth: 8, rows: [row(7, 1)]}); assert.equal(r.maxDiameter, 7); assert.equal(r.creditedDepth, 6); assert.equal(r.candidates[0].geometricPass, false);});
check('source and scope caveats always present', () => {
  const r = run({}); assert.ok(r.sources.some(s => /modeled provisions checked/.test(s.label))); assert.ok(!r.warnings.some(w => /Named modeled NEC provisions were checked/.test(w))); assert.ok(r.warnings.some(w => /Ampacity/.test(w))); assert.ok(r.steps.some(s => /bare conductor cross sections are not used/.test(s)));
});
check('small class is distinct from cable diameter', () => {
  const r = run({rows: [row(2, 3)]}); assert.equal(r.mode, 'small'); assert.equal(r.minimumWidth, 9);
  assert.equal(run({rows: [row(0.5, 20, 'large')]}).mode, 'large');
});
check('no bare-area fallback', () => invalid({rows: [{count: 10, area: 0.1, sizeClass: 'small'}]}, /overall cable diameter/));
check('unsupported nonround construction and mixed per-row kinds are rejected', () => {
  for (const cableKind of ['singleconductor', 'nonround', 'unknown', null]) invalid({cableKind}, /round multiconductor/);
  invalid({cableKind: 'single'}, /explicit supported conductor size/);
  invalid({cableShape: 'oval'}, /round multiconductor/);
  invalid({rows: [{...row(), cableKind: 'single'}]}, /mixed single-conductor/);
  invalid({rows: [{...row(), cableShape: 'oval'}]}, /only round multiconductor/);
  assert.equal(run({cableKind: 'multiconductor', cableShape: 'round'}).status, 'pass');
});
for (const trayType of ['wire-basket', 'ventilated-channel', 'mesh', '__proto__', '', null, undefined]) check(`unsupported tray type ${String(trayType)}`, () => invalid({trayType}, /other tray types/));
for (const service of ['mixed', 'lighting', '__proto__', '', null, undefined]) check(`unsupported service ${String(service)}`, () => invalid({service}, /Select power/));
for (const width of [0, 2, 4, 8, 16, 20, 48, 'Auto', '', null, undefined, NaN, Infinity, true, []]) check(`unsupported width ${String(width)}`, () => invalid({width}, /supported actual inside width/));
for (const voltage of [0, -1, '', ' ', null, undefined, NaN, Infinity, true, []]) check(`invalid voltage ${String(voltage)}`, () => invalid({voltage}));
for (const depth of [0, -1, '', ' ', null, undefined, NaN, Infinity, true, []]) check(`invalid depth ${String(depth)}`, () => invalid({depth}));
for (const od of [0, -1, '', ' ', null, undefined, NaN, Infinity, true, [], 1e-300]) check(`invalid cable OD ${String(od)}`, () => invalid({rows: [{...row(), od}]}));
for (const count of [0, -1, 1.1, '', ' ', null, undefined, NaN, Infinity, true, [], Number.MAX_SAFE_INTEGER + 1]) check(`invalid cable quantity ${String(count)}`, () => invalid({rows: [{...row(), count}]}));
for (const sizeClass of ['4/0', 'large-ish', '', null, undefined, '__proto__']) check(`invalid size class ${String(sizeClass)}`, () => invalid({rows: [{...row(), sizeClass}]}));
for (const rows of [[], null, undefined, {}, [null], [1], [[]]]) check(`invalid row list ${JSON.stringify(rows)}`, () => invalid({rows}));
check('aggregate quantity safe-integer overflow rejected', () => invalid({rows: [row(0.1, Number.MAX_SAFE_INTEGER), row(0.1, 1)]}, /combined cable quantity/));
check('derived area overflow rejected', () => invalid({depth: 1e308, rows: [row(1e308, 1)]}, /numeric range/));
check('null and nonobject calls return errors rather than throwing', () => {for (const p of [null, undefined, 0, '', [], true]) assert.ok(tray(p).error);});



const singleRow = (size = '1/0', od = 0.5, count = 3, arrangement = 'flat') => ({name: 'Individual conductors', size, od, count, arrangement});
const singleBase = {cableKind: 'single', service: 'power', industrialQualified: true, cableListed: true, rungSpacing: 9, rungSpacingConfirmed: true, boundGroupsConfirmed: true, rows: [singleRow()]};
const runSingle = input => {const r=run({...singleBase, ...input});assert.equal(r.eligibilityConfirmed,false);assert.equal(r.numericalPass,r.status==='conditional');return r;};
const invalidSingle = (input, message) => invalid({...singleBase, ...input}, message);

check('bounded single conductor table and immutable size/reference exports', () => {
  assert.deepEqual(cableTraySingleAreaTable, [6.5, 9.5, 13, 19.5, 26, 32.5, 39]);
  assert.ok(cableTraySingleSizes.includes('1/0')); assert.ok(cableTraySingleSizes.includes('750'));
  assert.ok(!cableTraySingleSizes.includes('1')); assert.ok(!cableTraySingleSizes.includes('800'));
  for (const values of [cableTrayConductorSizes, cableTraySingleSizes, cableTraySingleAreaTable, cableTrayDiameterReferences, ...Object.values(cableTrayDiameterReferences).map(r => r.diameters)]) assert.equal(Object.isFrozen(values), true);
});
check('selected multiconductor size derives threshold and ignores stale legacy class', () => {
  const small = run({rows: [{...row(), size: '3/0', sizeClass: 'large'}]});
  const large = run({rows: [{...row(), size: '4/0', sizeClass: 'small'}]});
  assert.equal(small.mode, 'small'); assert.equal(large.mode, 'large'); assert.equal(large.rows[0].sizeClass, 'large');
  assert.equal(small.rows[0].od, large.rows[0].od);
});
for (const size of cableTrayConductorSizes) check(`explicit multiconductor ${size} classification`, () => {
  const r = run({rows: [{size, od: 0.25, count: 1}]});
  assert.equal(r.rows[0].sizeClass, cableTrayConductorSizes.indexOf(size) >= cableTrayConductorSizes.indexOf('4/0') ? 'large' : 'small');
});
check('legacy absent size and layout preserve numerical behavior', () => {
  const old = run({}), explicit = run({rows: [{...row(), size: '', arrangement: 'unspecified'}]});
  assert.equal(old.minimumWidth, 9); assert.equal(old.minimumWidth, explicit.minimumWidth);
  assert.equal(old.rows[0].size, null); assert.equal(old.geometry.width, null); assert.equal(old.geometry.complete, false);
  assert.ok(old.warnings.some(w => /No exact AWG/.test(w)));
});
check('new flat multiconductor layout checks side-by-side width separately', () => {
  const r = run({rows: [{...row(), size: '12', arrangement: 'flat'}]});
  assert.equal(r.minimumWidth, 12); assert.equal(r.geometry.width, 12); assert.equal(r.geometry.height, 1);
  assert.equal(r.candidates[1].rulePass, true); assert.equal(r.candidates[1].geometricPass, false);
});
check('small multiconductor triangle packages retain full area, reduce envelope', () => {
  const r = run({width: 6, rows: [{size: '12', od: 1, count: 6, arrangement: 'triangle'}]});
  assert.equal(r.status, 'pass'); assert.equal(r.geometry.width, 4); near(r.geometry.height, 1 + Math.sqrt(3) / 2);
  assert.equal(r.geometry.rows[0].groupSize, 3); assert.equal(r.geometry.rows[0].groupCount, 2); near(r.totalArea, 1.5 * Math.PI);
});
check('square geometry and mixed-size row envelopes use each row OD', () => {
  const r = run({rows: [{size: '12', od: 1, count: 4, arrangement: 'square'}, {size: '12', od: 0.5, count: 3, arrangement: 'triangle'}]});
  assert.equal(r.geometry.width, 3); assert.equal(r.geometry.height, 2); assert.equal(r.geometry.rows[1].x, 2);
  assert.equal(r.geometry.rows[0].groupCount, 1); assert.equal(r.totalCount, 7);
});
check('layout exceeding depth cannot be repaired by auto wider tray', () => {
  const r = run({depth: 3, rows: [{size: '12', od: 1.6, count: 4, arrangement: 'square'}]});
  assert.equal(r.status, 'fail'); assert.equal(r.minimumWidth, null); assert.equal(r.selectedWidth, null);
  assert.ok(r.warnings.some(w => /exceeds usable tray depth/.test(w)));
  assert.equal(label(r, 'Minimum supported inside width'), 'None: layout exceeds usable depth');
  assert.ok(r.candidates.every(c => !c.geometricPass));
});
check('layout height exact depth boundary and just over', () => {
  const at = run({depth: 3, rows: [{size: '12', od: 1.5, count: 4, arrangement: 'square'}]});
  const over = run({depth: 3, rows: [{size: '12', od: 1.5000000001, count: 4, arrangement: 'square'}]});
  assert.equal(at.status, 'pass'); assert.equal(over.status, 'fail');
});
for (const arrangement of ['triangle', 'square']) check(`large multiconductor ${arrangement} never reports passing stacked arrangement`, () => {
  const r = run({rows: [{size: '4/0', od: 0.5, count: arrangement === 'triangle' ? 3 : 4, arrangement}]});
  assert.equal(r.status, 'fail'); assert.equal(r.numericalPass, true); assert.equal(r.eligibilityConfirmed, false);
  assert.equal(r.arrangementProhibited, true); assert.equal(r.minimumWidth, null); assert.equal(r.selectedWidth, null);
  assert.match(label(r, 'Minimum supported inside width'), /None: change prohibited/);
  assert.match(label(r, 'Selected inside width'), /No supported selection/);
  assert.ok(r.candidates.every(c => !c.pass)); assert.ok(r.candidates.some(c => c.sizingPass));
  assert.ok(r.warnings.some(w => /must remain in a single layer/.test(w)));
});
check('large cables flat alongside small grouped cables have a supported geometry', () => {
  const r = run({rows: [{size: '4/0', od: 0.5, count: 2, arrangement: 'flat'}, {size: '12', od: 0.5, count: 3, arrangement: 'triangle'}]});
  assert.equal(r.status, 'pass'); assert.equal(r.mode, 'mixed'); assert.equal(r.geometry.width, 2);
});
check('control-only grouped cables retain control area method regardless of size', () => {
  const r = run({service: 'control', rows: [{size: '4/0', od: 1, count: 4, arrangement: 'square'}]});
  assert.equal(r.status, 'pass'); assert.equal(r.mode, 'control'); assert.equal(r.geometry.width, 2);
});
check('partial unspecified layout does not claim complete packing', () => {
  const r = run({rows: [{...row(1, 2), arrangement: 'flat'}, row(1, 3)]});
  assert.equal(r.geometry.complete, false); assert.equal(r.geometry.width, null); assert.equal(r.geometry.knownWidth, 2);
  assert.ok(r.steps.some(s => /partial lower bound/.test(s)));
});
for (const arrangement of ['triangle', 'square']) for (const count of [1, 2, 5, 7]) if (count % (arrangement === 'triangle' ? 3 : 4)) check(`reject incomplete ${arrangement} count ${count}`, () => invalid({rows: [{...row(0.5, count), arrangement}]}, /complete groups/));
for (const arrangement of ['hex', '__proto__', 1, true, []]) check(`reject unsupported arrangement ${String(arrangement)}`, () => invalid({rows: [{...row(), arrangement}]}, /select area screening/));
for (const size of ['legacy', '4/0 AWG', '225', '__proto__', true, []]) check(`reject unsupported explicit size ${String(size)}`, () => invalid({rows: [{...row(), size}]}, /supported AWG/));

check('single 1/0 golden flat fixture', () => {
  const r = runSingle({}); assert.equal(r.status, 'conditional'); assert.equal(r.mode, 'single-diameter'); assert.equal(r.section, '392.22(B)(1)(d)');
  assert.equal(r.minimumWidth, 6); assert.equal(r.diameterSum, 1.5); assert.equal(r.requiredWidth, 1.5); assert.equal(r.requiredArea, null);
  near(r.totalArea, 3 * Math.PI * 0.25 / 4); assert.equal(r.geometry.width, 1.5);
});
for (const size of cableTraySingleSizes) check(`single ${size} chooses correct fill branch`, () => {
  const r = runSingle({rows: [singleRow(size)]}); assert.equal(r.mode, size.endsWith('/0') ? 'single-diameter' : 'single-area');
});
check('any 1/0 through 4/0 sums all diameters including large single conductors', () => {
  const r = runSingle({width: 6, rows: [singleRow('1/0', 0.5, 1), singleRow('750', 1, 6)]});
  assert.equal(r.diameterSum, 6.5); assert.equal(r.status, 'fail'); assert.equal(r.minimumWidth, 9); assert.equal(r.mode, 'single-diameter');
});
check('triangle packaging never reduces single individual-diameter demand', () => {
  const r = runSingle({width: 6, rows: [singleRow('4/0', 1.1, 6, 'triangle')]});
  near(r.geometry.width, 4.4); near(r.diameterSum, 6.6); assert.equal(r.candidates[0].geometricPass, true);
  assert.equal(r.candidates[0].rulePass, false); assert.equal(r.status, 'fail'); assert.equal(r.minimumWidth, 9);
});
check('square packaging never reduces single individual-diameter demand', () => {
  const r = runSingle({width: 6, rows: [singleRow('2/0', 1, 8, 'square')]});
  assert.equal(r.geometry.width, 4); assert.equal(r.diameterSum, 8); assert.equal(r.status, 'fail'); assert.equal(r.minimumWidth, 9);
});
check('all 250+ single area uses its own table and complete areas', () => {
  const r = runSingle({width: 6, rows: [singleRow('250', 1.2, 6, 'triangle')]});
  near(r.geometry.width, 4.8); assert.equal(r.mode, 'single-area'); assert.equal(r.allowableArea, 6.5);
  assert.equal(r.section, '392.22(B)(1)(b)'); assert.equal(r.status, 'fail'); assert.equal(r.minimumWidth, 9);
  near(r.totalArea, 6 * Math.PI * 1.2 ** 2 / 4);
});
check('all 250+ flat area pass does not override insufficient layout width', () => {
  const r = runSingle({width: 6, rows: [singleRow('250', 1.1, 6)]});
  assert.equal(r.candidates[0].rulePass, true); assert.equal(r.candidates[0].geometricPass, false); assert.equal(r.status, 'fail'); assert.equal(r.minimumWidth, 9);
});
check('single all 250+ area depth capacity does not grow', () => {
  for (const depth of [3, 4, 6, 10]) assert.equal(runSingle({depth, width: 6, rows: [singleRow('250')]}).allowableArea, 6.5);
});
for (const [index, width] of cableTrayWidths.entries()) {
  check(`single ${width}in exact diameter sum and tiny excess`, () => {
    const at = runSingle({width, rows: [singleRow('1/0', 1, width, 'unspecified')]});
    const over = runSingle({width, rows: [singleRow('1/0', 1 + 1e-10, width, 'unspecified')]});
    assert.equal(at.status, 'conditional'); assert.equal(at.utilization, 100); assert.equal(at.minimumWidth, width); assert.equal(over.status, 'fail');
  });
  check(`single ${width}in exact area and tiny excess`, () => {
    const bound = cableTraySingleAreaTable[index], area = areaRow(bound), cable = singleRow('250', area.od, area.count, 'unspecified');
    const at = runSingle({width, rows: [cable]});
    const over = runSingle({width, rows: [{...cable, od: cable.od * (1 + 1e-10)}]});
    assert.equal(at.status, 'conditional'); assert.equal(at.totalArea, bound); assert.equal(at.utilization, 100); assert.equal(at.minimumWidth, width); assert.equal(over.status, 'fail');
  });
}
check('single automatic overrange does not recommend 36 inches', () => {
  const r = runSingle({rows: [singleRow('1/0', 1, 100)]}); assert.equal(r.status, 'fail'); assert.equal(r.selectedWidth, null); assert.equal(r.minimumWidth, null); assert.equal(r.assessedWidth, 36);
});
check('single eligibility is always assumed and never has installation-passing candidates', () => {
  const r = runSingle({industrialQualified: false, cableListed: false}); assert.equal(r.status, 'conditional'); assert.equal(r.numericalPass, true);
  assert.equal(r.confirmationIssues.length, 3); assert.equal(r.minimumWidth, 6); assert.equal(r.eligibilityConfirmed, false); assert.ok(r.candidates.every(c => !c.pass));
  assert.match(label(r, 'Tray sizing check'), /Conditional/); assert.equal(label(r, 'Minimum numerical-screen inside width'), 6);
});
for (const value of [undefined, null, false, true, 'true', 1]) check(`legacy single industrial flag ignored: ${String(value)}`, () => assert.equal(runSingle({industrialQualified: value}).status, 'conditional'));
check('single numerical failure remains failure when confirmations missing', () => {
  const r = runSingle({industrialQualified: false, width: 6, rows: [singleRow('1/0', 1, 10)]}); assert.equal(r.status, 'fail'); assert.equal(r.numericalPass, false); assert.ok(r.confirmationIssues.length);
});
for (const rungSpacing of [0, -1, 9.00000001, NaN, Infinity, 'bad', true]) check(`invalid rung spacing ${String(rungSpacing)} prevents single pass`, () => {
  invalidSingle({rungSpacing}, /rung spacing/);
});
check('rung spacing at 9 is included; all250+ does not require small-size rung rule', () => {
  assert.equal(runSingle({rungSpacing: 9}).status, 'conditional'); assert.equal(runSingle({rows: [singleRow('250')], rungSpacing: undefined}).status, 'conditional');
});
check('bound circuit-group design assumption is noted only for grouped single arrangements', () => {
  for (const [arrangement, count] of [['triangle', 3], ['square', 4]]) {
    const r = runSingle({boundGroupsConfirmed: false, rows: [singleRow('250', 0.5, count, arrangement)]});
    assert.equal(r.status, 'conditional'); assert.ok(r.confirmationIssues.some(s => /secured circuit group/.test(s)));
    assert.ok(r.warnings.some(s => /2.15/.test(s))); assert.ok(r.warnings.some(s => /Ampacity is not calculated/.test(s)));
  }
  assert.equal(runSingle({boundGroupsConfirmed: false}).status, 'conditional');
});
for (const size of ['18', '12', '1', '800', '900', '1000', '', undefined, null]) check(`single unsupported size ${String(size)}`, () => invalidSingle({rows: [{...singleRow(), size}]}, /1\/0 AWG through 750/));
check('single unsupported service/tray and mixed-kind rows are rejected', () => {
  invalidSingle({service: 'control'}, /control-only method/); invalidSingle({trayType: 'solid'}, /Solid-bottom/);
  invalidSingle({rows: [{...singleRow(), cableKind: 'multiconductor'}]}, /mixed single-conductor/);
  invalidSingle({rows: [{...singleRow(), cableShape: 'oval'}]}, /only round/);
});
check('single depth, voltage, width, overflow and missing OD guards', () => {
  invalidSingle({depth: 2.999}, /scope limit/); invalidSingle({voltage: 2000.1}, /2,000/); invalidSingle({width: 8}, /supported actual inside/);
  invalidSingle({rows: [{size: '1/0', count: 3, area: 0.1}]}, /overall cable diameter/);
  invalidSingle({rows: [singleRow('1/0', 5, 1)]}, /exceeds/);
  invalidSingle({rows: [singleRow('1/0', 0.1, Number.MAX_SAFE_INTEGER), singleRow('1/0', 0.1, 1)]}, /combined cable quantity/);
});
check('single quantities numeric strings preserve exact size and layout result', () => {
  const r = runSingle({depth: '4', rungSpacing: '9', rows: [singleRow('1/0', '0.5', '3', 'triangle')]}); assert.equal(r.status, 'conditional'); assert.equal(r.geometry.width, 1);
});
check('size does not produce an OD fallback or override manually specified odd construction', () => {
  invalidSingle({rows: [{size: '750', count: 3}]}, /overall cable diameter/);
  const r = runSingle({rows: [singleRow('1/0', 2.15, 3, 'flat')]}); assert.equal(r.rows[0].od, 2.15); assert.equal(r.minimumWidth, 9);
});
for (const [source, reference] of Object.entries(cableTrayDiameterReferences)) for (const [size, od] of Object.entries(reference.diameters)) check(`${source} ${size} exact reference provenance`, () => {
  const r = runSingle({rows: [{...singleRow(size, od), diameterSource: source, diameterReferenceUrl: 'https://wrong.example/'}]});
  assert.equal(r.status, 'conditional'); assert.equal(r.rows[0].diameterReferenceUrl, reference.url);
  assert.ok(r.sources.some(s => s.url === reference.url)); assert.ok(r.steps.some(s => s.includes(reference.label)));
});
check('reference selection cannot silently accept different OD, unsupported size, multicore or higher rating', () => {
  invalidSingle({rows: [{...singleRow('1/0', 0.481), diameterSource: 'southwire-cu-thhn'}]}, /matching/);
  invalidSingle({rows: [{...singleRow('700', 1), diameterSource: 'southwire-cu-thhn'}]}, /matching/);
  invalidSingle({voltage: 601, rows: [{...singleRow('1/0', 0.480), diameterSource: 'southwire-cu-thhn'}]}, /through 600 V/);
  invalid({rows: [{...row(), diameterSource: 'southwire-cu-thhn'}]}, /only to standard single conductors/);
  invalidSingle({rows: [{...singleRow(), diameterSource: 'generic-thhn'}]}, /supported diameter reference/);
});
check('manual override removes stale reference attribution', () => {
  const r = runSingle({voltage: 2000, rows: [{...singleRow('1/0', 0.8), diameterSource: 'manual', diameterReference: 'stale', diameterReferenceUrl: 'https://wrong.example/'}]});
  assert.equal(r.status, 'conditional'); assert.equal(r.rows[0].diameterReference, undefined); assert.equal(r.rows[0].diameterReferenceUrl, undefined);
  assert.ok(!r.sources.some(s => /southwire/.test(s.url)));
});
check('new inputs and nested rows remain unmutated', () => {
  const input = {...base, ...singleBase, rows: [{...singleRow('1/0', 0.480), diameterSource: 'southwire-cu-thhn'}]}, before = structuredClone(input);
  Object.freeze(input.rows[0]); Object.freeze(input.rows); Object.freeze(input); const r = tray(input);
  assert.equal(r.status, 'conditional'); assert.deepEqual(input, before);
});
console.log(`${tests} cable-tray formula, boundary, layout, provenance, numeric and scope checks passed`);
