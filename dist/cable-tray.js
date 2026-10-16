import { necReference, necSectionUrls } from './code-references.js?v=2.14.0';
// Round multiconductor and bounded single-conductor cable-tray screening.
// All dimensions are actual usable
// inside inches; cable OD includes insulation/jacket, never bare conductor area.
// Source methods: NEC 392.22(A)/(B), checked against NFPA 2023-cycle development
// record and Eaton's 2014 manual; modeled provisions checked against published NEC 2023 on 2026-10-13. Project installation review remains separate.
export const cableTrayWidths = Object.freeze([6, 9, 12, 18, 24, 30, 36]);
export const cableTrayAreaTable = Object.freeze({
  ladder: Object.freeze([7, 10.5, 14, 21, 28, 35, 42]),
  solid: Object.freeze([5.5, 8, 11, 16.5, 22, 27.5, 33])
});
export const cableTraySingleAreaTable = Object.freeze([6.5, 9.5, 13, 19.5, 26, 32.5, 39]);
export const cableTrayConductorSizes = Object.freeze(['18', '16', '14', '12', '10', '8', '6', '4', '3', '2', '1', '1/0', '2/0', '3/0', '4/0', '250', '300', '350', '400', '500', '600', '700', '750', '800', '900', '1000', '1250', '1500', '1750', '2000']);
export const cableTraySingleSizes = Object.freeze(cableTrayConductorSizes.slice(cableTrayConductorSizes.indexOf('1/0'), cableTrayConductorSizes.indexOf('750') + 1));
const referenceSizes = ['1/0', '2/0', '3/0', '4/0', '250', '300', '350', '400', '500', '600', '750'];
// Verified Table 5 areas; diameters below are derived estimates, not a copied
// diameter column or a universal product/jacket dimension. Keep full precision.
export const cableTrayNECAreas = Object.freeze({'1/0':.1855,'2/0':.2223,'3/0':.2679,'4/0':.3237,'250':.3970,'300':.4608,'350':.5242,'400':.5863,'500':.7073,'600':.8676,'700':.9887,'750':1.0496});
export const cableTrayDiameterReferences = Object.freeze({
  'nec-thhn-area': Object.freeze({label:'NEC Table 5 area-derived OD estimate · standard noncompact THHN/THWN-2, 600 V (preliminary; verify actual product)',url:necSectionUrls.areas,estimated:true,diameters:Object.freeze(Object.fromEntries(Object.entries(cableTrayNECAreas).map(([size,area])=>[size,Math.sqrt(4*area/Math.PI)])))}),
  'southwire-cu-thhn': Object.freeze({label: 'Product dimensions, not code authority: Southwire Cu THHN/THWN-2, 600 V · SPEC 10000 (approximate nominal OD; verify purchased cable)', url: 'https://cabletechsupport.southwire.com/en/tile/3/spec/10000/?country=US', diameters: Object.freeze(Object.fromEntries(referenceSizes.map((size, i) => [size, [.480, .524, .574, .627, .684, .753, .803, .848, .931, 1.030, 1.132][i]])))}),
  'southwire-al-thhn': Object.freeze({label: 'Product dimensions, not code authority: Southwire Al THHN/THWN-2, 600 V · SPEC 10012 (approximate nominal OD; verify purchased cable)', url: 'https://cabletechsupport.southwire.com/en/tile/30/spec/10012/?country=US', diameters: Object.freeze(Object.fromEntries(referenceSizes.map((size, i) => [size, [.456, .496, .543, .595, .662, .712, .758, .801, .878, .969, 1.072][i]])))})
});
export const cableTraySources = Object.freeze([
  Object.freeze(necReference('392.22(A)(1)–(4), including referenced fill tables: modeled multiconductor tray fill', 'tray', true)),
  Object.freeze(necReference('392.22(B)(1) and Table 392.22(B)(1): modeled single-conductor tray fill', 'tray', true)),
  Object.freeze(necReference('392.20(C)/(D) and 392.80(A)(2)(d): grouping/layer constraints; ampacity remains a separate calculation', 'tray', true)),
  Object.freeze(necReference('392.10(B)(1): industrial supervision, tray-marked singles and rung-spacing conditions; field confirmation required', 'tray', true))
]);

const display = n => Number(n.toPrecision(8));
const isNumeric = n => (typeof n === 'number' || typeof n === 'string') && String(n).trim() !== '' && Number.isFinite(Number(n));
const fail = error => ({error, results: [], steps: [], warnings: [], sources: [...cableTraySources]});
const scopedKind = item => (!Object.hasOwn(item, 'cableKind') || item.cableKind === 'multiconductor') && (!Object.hasOwn(item, 'cableShape') || item.cableShape === 'round');

const trayGroupSize = arrangement => arrangement === 'triangle' ? 3 : arrangement === 'square' ? 4 : 1;
// v2 quantity inputs count packages for grouped layouts; calculation rows always
// normalize back to individual cables/conductors before any NEC comparison.
export function trayPhysicalCount(row, quantityVersion = 2) {
  if (row.quantityIndividuals !== undefined) return row.quantityIndividuals;
  if (!isNumeric(row.count)) return row.count;
  return Number(row.count) * (quantityVersion === 2 ? trayGroupSize(row.arrangement) : 1);
}
export function setTrayArrangement(row, arrangement, quantityVersion = 2) {
  const physical = trayPhysicalCount(row, quantityVersion), next = {...row, arrangement};
  if (isNumeric(physical)) {
    next.count = Number(physical) / trayGroupSize(arrangement);
    if (!Number.isSafeInteger(next.count)) next.quantityIndividuals = Number(physical);
    else delete next.quantityIndividuals;
  }
  return next;
}
export function migrateCableTrayState(state) {
  const next = structuredClone(state);
  if (!next || typeof next !== 'object' || Array.isArray(next)) return next;
  if (next.quantityVersion !== undefined && next.quantityVersion !== 2) return next;
  if (next.quantityVersion !== 2 && Array.isArray(next.rows)) {
    next.rows = next.rows.map(row => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) return row;
      return {...setTrayArrangement(row, row.arrangement || 'unspecified', 1), odManualOverride:row.diameterSource === undefined || row.diameterSource === 'manual'};
    });
  }
  next.quantityVersion = 2;
  // An old entered spacing is preserved, but was never an installation confirmation.
  if (next.rungSpacingConfirmed === undefined) next.rungSpacingConfirmed = false;
  return next;
}

/**
 * @param {{trayType:'ladder'|'solid', service:'power'|'control', width:'auto'|number,
 * depth:number, voltage:number, cableKind?:'multiconductor', cableShape?:'round',
 * rows:Array<{name?:string,od:number,count:number,sizeClass:'small'|'large'}>}} input
 * `power` includes any power/lighting cables, even when mixed with control cables.
 * `control` means exclusively multiconductor control and/or signal cables.
 * Size class concerns contained conductor size: small <4/0 AWG, large >=4/0 AWG.
 * The returned metadata retains unrounded numbers. Display rounding is never
 * used to choose a width or decide pass/fail. No general tray-fill % is assumed.
 */
function calculateMulticonductorTray(input, geometry) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return fail('Enter the tray dimensions and at least one cable row.');
  if (!['ladder', 'solid'].includes(input.trayType)) return fail('Select ladder / ventilated-trough or solid-bottom tray. Wire-basket, ventilated-channel and other tray types are outside this calculator.');
  if (!['power', 'control'].includes(input.service)) return fail('Select power / lighting (including mixed services), or exclusively control / signal cables.');
  if (!scopedKind(input)) return fail('Only round multiconductor cables are supported. Single-conductor, nonround and other cable arrangements need a separate design.');
  if (!isNumeric(input.voltage) || Number(input.voltage) <= 0 || Number(input.voltage) > 2000) return fail('Enter a cable voltage rating greater than 0 V and no more than 2,000 V. Higher-voltage cable arrangements are outside this calculator.');
  if (!isNumeric(input.depth) || Number(input.depth) <= 0) return fail('Enter a finite, positive usable inside tray depth in inches.');
  const depth = Number(input.depth);
  if (input.service === 'power' && depth < 3) return fail('Power / lighting sizing is limited here to usable tray depths of at least 3 in. Shallower trays require separate review; this is a conservative calculator scope limit, not a claimed NEC minimum depth.');
  const automatic = input.width === 'auto';
  if (!automatic && (!isNumeric(input.width) || !cableTrayWidths.includes(Number(input.width)))) return fail('Choose Auto or a supported actual inside width: 6, 9, 12, 18, 24, 30 or 36 in. Other widths are not interpolated or extrapolated.');
  if (!Array.isArray(input.rows) || input.rows.length === 0) return fail('Add at least one cable row with actual overall diameter and a positive whole-cable quantity.');

  const rows = [];
  for (let i = 0; i < input.rows.length; i++) {
    const item = input.rows[i], prefix = `Cable row ${i + 1}`;
    if (!item || typeof item !== 'object' || Array.isArray(item)) return fail(`${prefix}: enter a valid cable row.`);
    if (!scopedKind(item)) return fail(`${prefix}: only round multiconductor cables are supported; single-conductor and nonround cables require separate review.`);
    if (!isNumeric(item.od) || Number(item.od) <= 0) return fail(`${prefix}: enter a finite, positive overall cable diameter in inches, including its insulation and jacket.`);
    if (!isNumeric(item.count) || !Number.isSafeInteger(Number(item.count)) || Number(item.count) <= 0) return fail(`${prefix}: quantity must be a positive, safely represented whole number of cables.`);
    if (!['small', 'large'].includes(item.sizeClass)) return fail(`${prefix}: identify the contained conductor size as below 4/0 AWG or 4/0 AWG and larger.`);
    const od = Number(item.od), count = Number(item.count);
    if (od > depth) return fail(`${prefix}: the ${od} in. overall diameter exceeds the ${depth} in. usable tray depth. No fit is reported.`);
    const area = count * Math.PI * od * od / 4, diameterSum = count * od;
    if (!Number.isFinite(area) || area <= 0 || !Number.isFinite(diameterSum)) return fail(`${prefix}: dimensions or quantity exceed the supported numeric range.`);
    rows.push({...item, name: typeof item.name === 'string' ? item.name.trim() : '', od, count, sizeClass: item.sizeClass, area, diameterSum});
  }

  const totalCount = rows.reduce((n, r) => n + r.count, 0);
  const totalArea = rows.reduce((n, r) => n + r.area, 0);
  const smallArea = rows.filter(r => r.sizeClass === 'small').reduce((n, r) => n + r.area, 0);
  const largeDiameterSum = rows.filter(r => r.sizeClass === 'large').reduce((n, r) => n + r.diameterSum, 0);
  const maxDiameter = rows.reduce((maximum, r) => Math.max(maximum, r.od), 0);
  if (!Number.isSafeInteger(totalCount) || ![totalArea, smallArea, largeDiameterSum].every(Number.isFinite)) return fail('The combined cable quantity or dimensions exceed the supported numeric range.');

  const control = input.service === 'control', ladder = input.trayType === 'ladder';
  const hasSmall = rows.some(r => r.sizeClass === 'small'), hasLarge = rows.some(r => r.sizeClass === 'large');
  const mode = control ? 'control' : hasSmall && hasLarge ? 'mixed' : hasLarge ? 'large' : 'small';
  const creditedDepth = control ? Math.min(depth, 6) : null;
  const controlFraction = ladder ? 0.5 : 0.4;
  const largeWidthFraction = ladder ? 1 : 0.9;
  const mixedDeduction = ladder ? 1.2 : 1;
  const section = control ? (ladder ? '392.22(A)(2)' : '392.22(A)(4)') : `392.22(A)(${ladder ? '1' : '3'})(${mode === 'large' ? 'a' : mode === 'small' ? 'b' : 'c'})`;
  const rule = `${ladder ? 'Ladder / ventilated trough' : 'Solid bottom'} · ${mode === 'control' ? 'control / signal only' : mode === 'large' ? 'all 4/0 AWG and larger' : mode === 'small' ? 'all below 4/0 AWG' : 'mixed conductor sizes'}`;
  const requiredArea = mode === 'large' ? null : mode === 'control' ? totalArea : mode === 'small' ? smallArea : smallArea + mixedDeduction * largeDiameterSum;
  const requiredWidth = mode === 'large' ? Math.max(maxDiameter, largeDiameterSum / largeWidthFraction) : mode === 'control' ? Math.max(maxDiameter, totalArea / (controlFraction * creditedDepth)) : null;

  const candidates = cableTrayWidths.map((width, index) => {
    const tableBase = cableTrayAreaTable[input.trayType][index];
    const allowableArea = mode === 'large' ? null : mode === 'control' ? controlFraction * width * creditedDepth : mode === 'small' ? tableBase : tableBase - mixedDeduction * largeDiameterSum;
    const allowableWidth = mode === 'large' ? largeWidthFraction * width : null;
    const demand = mode === 'large' ? largeDiameterSum : requiredArea;
    const capacity = mode === 'large' ? allowableWidth : mode === 'control' ? allowableArea : tableBase;
    const utilization = demand / capacity * 100;
    const geometricPass = maxDiameter <= width && (mode !== 'mixed' || largeDiameterSum <= width) && geometry.knownWidth <= width && geometry.height <= depth;
    const rulePass = mode === 'large' ? largeDiameterSum <= allowableWidth : mode === 'mixed' ? allowableArea >= 0 && smallArea <= allowableArea : totalArea <= allowableArea;
    return {width, tableBase, allowableArea, allowableWidth, demand, capacity, utilization, geometricPass, rulePass, pass: geometricPass && rulePass};
  });
  if (![requiredArea, requiredWidth, ...candidates.map(c => c.utilization)].every(n => n === null || Number.isFinite(n))) return fail('The calculation exceeds the supported numeric range. Reduce the input magnitudes.');
  const minimum = candidates.find(c => c.pass) || null;
  const selected = automatic ? minimum : candidates.find(c => c.width === Number(input.width));
  const assessment = selected || candidates[candidates.length - 1];
  const status = selected && selected.pass ? 'pass' : 'fail';

  const results = [
    {label: 'Tray sizing check', value: status === 'pass' ? 'Within modeled sizing limits' : 'Does not meet modeled sizing limits'},
    {label: 'Minimum supported inside width', value: minimum ? minimum.width : 'Beyond supported 36 in. range', ...(minimum ? {unit: 'in'} : {})},
    {label: 'Selected inside width', value: selected ? selected.width : 'None within supported range', ...(selected ? {unit: 'in'} : {})},
    {label: 'Usable inside depth', value: depth, unit: 'in'},
    {label: 'Cable quantity', value: totalCount, unit: 'cables'},
    {label: 'Actual total cable area', value: display(totalArea), unit: 'in²'},
    {label: 'Governing method', value: `${section} · ${rule}`}
  ];
  if (!selected) results.push({label: 'Width assessed for over-range check', value: assessment.width, unit: 'in'});
  if (mode === 'large') results.push(
    {label: 'Required single-layer inside width', value: display(requiredWidth), unit: 'in'},
    {label: 'Sum of cable overall diameters', value: display(largeDiameterSum), unit: 'in'},
    {label: 'Allowable diameter sum', value: display(assessment.allowableWidth), unit: 'in'},
    {label: 'Single-layer width usage', value: display(assessment.utilization), unit: '%'}
  );
  else if (mode === 'mixed') results.push(
    {label: 'Below-4/0 cable area', value: display(smallArea), unit: 'in²'},
    {label: '4/0-and-larger diameter sum', value: display(largeDiameterSum), unit: 'in'},
    {label: 'Table base area', value: assessment.tableBase, unit: 'in²'},
    {label: 'Residual allowance for below-4/0 cables', value: display(assessment.allowableArea), unit: 'in²'},
    {label: 'Mixed-rule area budget required', value: display(requiredArea), unit: 'in²'},
    {label: 'Mixed-rule budget usage', value: display(assessment.utilization), unit: '%'}
  );
  else results.push(
    {label: 'Required cable area', value: display(totalArea), unit: 'in²'},
    {label: control ? 'Allowable control / signal cable area' : 'Table allowable cable area', value: display(assessment.allowableArea), unit: 'in²'},
    {label: 'Rule-specific area usage', value: display(assessment.utilization), unit: '%'}
  );
  if (control) results.push({label: 'Credited fill depth', value: creditedDepth, unit: 'in'}, {label: 'Required inside width by area / diameter', value: display(requiredWidth), unit: 'in'});

  const steps = [
    `Use actual overall cable diameter including insulation and jacket: each row area = quantity × π × OD² / 4. Total = ${display(totalArea)} in² for ${totalCount} cables; bare conductor cross sections are not used.`,
    `Apply ${section}: ${rule}. Voltage rating = ${Number(input.voltage)} V (supported through 2,000 V).`
  ];
  for (const [i, r] of rows.entries()) steps.push(`Row ${i + 1}${r.name ? ` (${r.name})` : ''}: ${r.count} × π × ${r.od}² / 4 = ${display(r.area)} in²; diameter sum = ${display(r.diameterSum)} in.`);
  if (mode === 'large') steps.push(`All cable groups are classified 4/0 AWG or larger: Σ(quantity × OD) = ${display(largeDiameterSum)} in. must not exceed ${ladder ? 'the inside width' : '0.9 × inside width'} = ${display(assessment.allowableWidth)} in. at ${assessment.width} in. width. Cables must be placed in one layer.`);
  if (mode === 'small') steps.push(`All cable groups are classified below 4/0 AWG: compare ${display(totalArea)} in² actual cable area to the table allowance of ${assessment.allowableArea} in² at ${assessment.width} in. inside width. Increasing tray depth does not increase this table allowance.`);
  if (mode === 'mixed') steps.push(`Mixed sizes: below-4/0 area ${display(smallArea)} in² ≤ table base ${assessment.tableBase} − ${mixedDeduction} × large-cable diameter sum ${display(largeDiameterSum)} = ${display(assessment.allowableArea)} in². Budget usage = (${display(smallArea)} + ${mixedDeduction} × ${display(largeDiameterSum)}) / ${assessment.tableBase} × 100. A negative residual is a failure; it is never clamped into a passing allowance.`);
  if (mode === 'control') steps.push(`Exclusively control / signal cables: allowable area = ${controlFraction} × ${assessment.width} in. inside width × min(${depth}, 6) in. usable depth = ${display(assessment.allowableArea)} in². Conductor-size classes do not change this control-only method.`);
  steps.push(`Compare unrounded values. Supported actual inside widths are ${cableTrayWidths.join(', ')} in.; ${minimum ? `${minimum.width} in. is the smallest passing supported width` : 'no supported width passes'}. Individual cable diameter must fit both usable depth and width; unspecified layouts do not solve cable packing. Explicit touching layouts receive a separate envelope check.`);

  const warnings = [
    'Use manufacturer-certified actual cable OD and usable inside tray dimensions. Passing area or width checks does not prove a feasible cable layout or code-compliant installation.',
    'Ampacity, cable eligibility under NEC 392.10, cable listing/permitted use, spacing and segregation, bend radius, mechanical loading, support span, fittings, grounding/bonding and future spare capacity require separate review.',
    'This multiconductor method excludes single conductors, nonround cables, ratings over 2,000 V and tray types other than ladder / ventilated trough or solid bottom. Use the separate bounded single-conductor mode where applicable.'
  ];
  if (mode === 'large' || mode === 'mixed') warnings.push('Install all 4/0-AWG-and-larger multiconductor cables in a single layer. For mixed-size trays, do not place smaller cables on top of these large cables. Placement must be checked separately.');
  if (!control) warnings.push('The 3 in. minimum usable power-tray depth is a conservative calculator scope condition from the supporting table explanation, not an asserted NEC minimum tray depth. No extra power-table capacity is credited for deeper side rails.');
  if (control) warnings.push('The control / signal method applies only when every cable is control and/or signal. If any power or lighting cable is present, select the power / lighting method.');
  if (control && depth > 6) warnings.push('Only 6 in. of usable depth is credited for the control / signal area calculation. Extra sidewall height adds no fill allowance in this model.');
  if (!minimum) warnings.push('No supported inside width through 36 in. passes. Split or redesign the run and obtain a separate review; the 36 in. assessment is not a selected or recommended tray.');
  else if (status === 'fail') warnings.push(`The selected ${selected.width} in. inside width fails. The smallest passing supported width is ${minimum.width} in., subject to placement and separate engineering checks.`);
  if (!assessment.geometricPass) warnings.push('The assessed inside width fails the individual-diameter or large-cable single-layer geometry check.');
  if (mode === 'mixed' && assessment.allowableArea < 0) warnings.push('Large-cable diameter deductions exceed the table area budget; the residual allowance for smaller cables is negative.');

  return {
    results, steps, warnings, sources: [...cableTraySources],
    rule, section, mode, status, selectedWidth: selected?.width ?? null,
    minimumWidth: minimum?.width ?? null, assessedWidth: assessment.width,
    utilization: assessment.utilization, totalCount, totalArea, smallArea,
    largeDiameterSum, maxDiameter, requiredArea, requiredWidth,
    allowableArea: assessment.allowableArea, allowableWidth: assessment.allowableWidth,
    tableBase: assessment.tableBase, creditedDepth, candidates
  };
}


/** Touching, equal-diameter packages only; never a replacement for NEC fill. */
function layoutGeometry(rows) {
  let knownWidth = 0, height = 0;
  const layouts = rows.map((row, index) => {
    const arrangement = row.arrangement;
    const groupSize = arrangement === 'triangle' ? 3 : arrangement === 'square' ? 4 : 1;
    const specified = arrangement !== 'unspecified';
    const groupCount = specified ? row.count / groupSize : null;
    const groupWidth = specified ? row.od * (groupSize > 1 ? 2 : 1) : null;
    const groupHeight = row.od * (arrangement === 'triangle' ? 1 + Math.sqrt(3) / 2 : arrangement === 'square' ? 2 : 1);
    const width = specified ? groupCount * groupWidth : null;
    const x = knownWidth;
    if (specified) knownWidth += width;
    height = Math.max(height, groupHeight);
    return {index, name: row.name, arrangement, od: row.od, count: row.count, groupSize, groupCount, groupWidth, groupHeight, width, height: groupHeight, x};
  });
  const complete = rows.every(row => row.arrangement !== 'unspecified');
  return {complete, width: complete ? knownWidth : null, knownWidth, height, clearance: 0, grouped: rows.some(row => ['triangle', 'square'].includes(row.arrangement)), rows: layouts};
}

function calculateSingleTray(input, geometry) {
  if (input.trayType !== 'ladder') return fail('Single-conductor sizing is limited to ladder / ventilated-trough tray. Solid-bottom, wire-basket and channel methods are not modeled.');
  if (input.service !== 'power') return fail('Single-conductor sizing requires the power / lighting service mode; the multiconductor control-only method does not apply.');
  if (!isNumeric(input.voltage) || Number(input.voltage) <= 0 || Number(input.voltage) > 2000) return fail('Enter a cable voltage rating greater than 0 V and no more than 2,000 V.');
  if (!isNumeric(input.depth) || Number(input.depth) <= 0) return fail('Enter a finite, positive usable inside tray depth in inches.');
  const depth = Number(input.depth);
  if (depth < 3) return fail('Power / lighting sizing is limited here to usable tray depths of at least 3 in. This conservative calculator scope limit is not a claimed NEC minimum depth.');
  const automatic = input.width === 'auto';
  if (!automatic && (!isNumeric(input.width) || !cableTrayWidths.includes(Number(input.width)))) return fail('Choose Auto or a supported actual inside width: 6, 9, 12, 18, 24, 30 or 36 in. Other widths are not interpolated or extrapolated.');
  const rows = input.rows;
  for (const [index, row] of rows.entries()) if (row.od > depth) return fail(`Cable row ${index + 1}: the ${row.od} in. overall diameter exceeds the ${depth} in. usable tray depth. No fit is reported.`);
  const totalCount = rows.reduce((sum, row) => sum + row.count, 0);
  const totalArea = rows.reduce((sum, row) => sum + row.area, 0);
  const diameterSum = rows.reduce((sum, row) => sum + row.diameterSum, 0);
  const maxDiameter = Math.max(...rows.map(row => row.od));
  if (!Number.isSafeInteger(totalCount) || ![totalArea, diameterSum].every(Number.isFinite)) return fail('The combined cable quantity or dimensions exceed the supported numeric range.');
  const hasSmallSingle = rows.some(row => row.size.endsWith('/0'));
  const mode = hasSmallSingle ? 'single-diameter' : 'single-area';
  const section = hasSmallSingle ? '392.22(B)(1)(d)' : '392.22(B)(1)(b)';
  const rule = hasSmallSingle ? 'Single conductors · any 1/0–4/0 AWG · sum all individual diameters' : 'Single conductors · all 250–750 kcmil · Table 392.22(B)(1), column 1';
  const requiredWidth = hasSmallSingle ? diameterSum : null;
  const requiredArea = hasSmallSingle ? null : totalArea;
  const candidates = cableTrayWidths.map((width, index) => {
    const tableBase = cableTraySingleAreaTable[index];
    const allowableArea = hasSmallSingle ? null : tableBase;
    const allowableWidth = hasSmallSingle ? width : null;
    const demand = hasSmallSingle ? diameterSum : totalArea;
    const capacity = hasSmallSingle ? width : tableBase;
    const utilization = demand / capacity * 100;
    const geometricPass = maxDiameter <= width && geometry.knownWidth <= width && geometry.height <= depth;
    const rulePass = demand <= capacity;
    return {width, tableBase, allowableArea, allowableWidth, demand, capacity, utilization, geometricPass, rulePass, pass: geometricPass && rulePass};
  });
  if (!candidates.every(candidate => Number.isFinite(candidate.utilization))) return fail('The calculation exceeds the supported numeric range. Reduce the input magnitudes.');
  const minimum = candidates.find(candidate => candidate.pass) || null;
  const selected = automatic ? minimum : candidates.find(candidate => candidate.width === Number(input.width));
  const assessment = selected || candidates[candidates.length - 1];
  const status = selected?.pass ? 'pass' : 'fail';
  const results = [
    {label: 'Tray sizing check', value: status === 'pass' ? 'Within modeled sizing limits' : 'Does not meet modeled sizing limits'},
    {label: 'Minimum supported inside width', value: minimum ? minimum.width : 'Beyond supported range or layout does not fit', ...(minimum ? {unit: 'in'} : {})},
    {label: 'Selected inside width', value: selected ? selected.width : 'None within supported range', ...(selected ? {unit: 'in'} : {})},
    {label: 'Usable inside depth', value: depth, unit: 'in'},
    {label: 'Conductor quantity', value: totalCount, unit: 'conductors'},
    {label: 'Actual total insulated-conductor area', value: display(totalArea), unit: 'in²'},
    {label: 'Governing method', value: `${section} · ${rule}`}
  ];
  if (!selected) results.push({label: 'Width assessed for over-range check', value: assessment.width, unit: 'in'});
  if (hasSmallSingle) results.push(
    {label: 'Required inside width by individual diameters', value: display(diameterSum), unit: 'in'},
    {label: 'Sum of all individual overall diameters', value: display(diameterSum), unit: 'in'},
    {label: 'Allowable diameter sum', value: assessment.allowableWidth, unit: 'in'},
    {label: 'Diameter-sum rule usage', value: display(assessment.utilization), unit: '%'}
  );
  else results.push(
    {label: 'Required insulated-conductor area', value: display(totalArea), unit: 'in²'},
    {label: 'Table allowable single-conductor area', value: assessment.allowableArea, unit: 'in²'},
    {label: 'Rule-specific area usage', value: display(assessment.utilization), unit: '%'}
  );
  const steps = [
    `Use each insulated conductor's actual overall diameter including insulation and jacket: row area = quantity × π × OD² / 4. Total = ${display(totalArea)} in² for ${totalCount} individual conductors; bare conductor cross sections are not used.`,
    `Apply ${section}: ${rule}. Single-conductor model is bounded to 1/0 AWG–750 kcmil, ladder / ventilated-trough tray and cable ratings through 2,000 V.`,
    ...rows.map((row, index) => `Row ${index + 1}${row.name ? ` (${row.name})` : ''}: ${row.size}${row.size.endsWith('/0') ? ' AWG' : ' kcmil'}, ${row.count} × π × ${row.od}² / 4 = ${display(row.area)} in²; individual-diameter sum = ${display(row.diameterSum)} in.`),
    hasSmallSingle ? `At least one 1/0–4/0 AWG row is present: add the individual insulated ODs of ALL conductors, including 250–750 kcmil rows. ${display(diameterSum)} in. must not exceed ${assessment.width} in. inside width. A triangle or square envelope never replaces this sum.` : `All conductors are 250–750 kcmil: actual area ${display(totalArea)} in² must not exceed Table 392.22(B)(1), column 1 = ${assessment.tableBase} in² at ${assessment.width} in. inside width. Increasing depth does not increase this table allowance.`,
    `Compare unrounded values. Supported actual inside widths are ${cableTrayWidths.join(', ')} in.; ${minimum ? `${minimum.width} in. is the smallest passing numerical sizing screen` : 'no supported width passes the numerical sizing and layout screen'}.`
  ];
  const warnings = [
    'Single-conductor eligibility is limited to qualifying industrial establishments with maintenance and supervision by qualified persons, listed and surface-marked cable permitted for tray use, and conductors at least 1/0 AWG. This calculator stops at 750 kcmil.',
    'Ampacity is not calculated. Touching flat, triangular and square drawings do not establish any ampacity entitlement. NEC 392.80(A)(2)(d) requires uncovered tray and at least 2.15 × the largest conductor OD free air between triangular/square configurations for its special arrangement method; that spacing is not included in the touching layout.',
    'Conductors or assemblies must be evenly distributed. Circuit phase/neutral membership, parallel-conductor grouping and securing under 392.20(C), cable eligibility, bend radius, load, supports, fittings, grounding/bonding and segregation require separate design review.',
    'Use manufacturer-certified actual OD and usable inside dimensions. Selected AWG/kcmil size does not establish insulated diameter; a Table 5 area-derived estimate is preliminary, and manufacturer references are product-specific.',
    'The 3 in. minimum usable power-tray depth is a conservative calculator scope condition, not an asserted NEC minimum depth. Deeper side rails do not increase the power table allowance.'
  ];
  if (hasSmallSingle) warnings.push('Where any 1/0–4/0 AWG single conductors are present, maintain a single layer unless conductors are bound in circuit groups under 392.20(D). Ladder-tray rung spacing must be no more than 9 in. Grouping does not reduce the 392.22(B)(1)(d) individual-diameter sum.');
  if (!minimum) warnings.push('No supported width passes the numerical sizing and layout screen. Check usable depth, split or redesign the run and obtain separate review; the 36 in. assessment is not a recommended tray.');
  else if (status === 'fail') warnings.push(`The selected ${selected.width} in. inside width fails. The smallest passing numerical sizing screen is ${minimum.width} in., subject to eligibility, layout and separate engineering checks.`);
  return {results, steps, warnings, sources: [...cableTraySources], rule, section, mode, status, selectedWidth: selected?.width ?? null, minimumWidth: minimum?.width ?? null, assessedWidth: assessment.width, utilization: assessment.utilization, totalCount, totalArea, diameterSum, maxDiameter, requiredArea, requiredWidth, allowableArea: assessment.allowableArea, allowableWidth: assessment.allowableWidth, tableBase: assessment.tableBase, creditedDepth: null, candidates, hasSmallSingle};
}

/**
 * Round cables with manufacturer OD, never bare-conductor area. Legacy inputs
 * may omit cableKind, size and arrangement: their original fill rules remain.
 * quantityVersion 2 uses group counts for triangle/square; legacy count means individuals.
 * Explicit layouts are touching packages placed side-by-side in one run.
 * Single-conductor eligibility remains an unverified design assumption.
 * Legacy confirmation flags never establish eligibility in a new calculation.
 */
export function calculateCableTray(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return fail('Enter the tray dimensions and at least one cable row.');
  if (input.quantityVersion !== undefined && input.quantityVersion !== 2) return fail('This tray quantity format is not supported. Review the original saved inputs before changing quantities.');
  const cableKind = input.cableKind === undefined ? 'multiconductor' : input.cableKind;
  if (!['multiconductor', 'single'].includes(cableKind)) return fail('Select round multiconductor cables or the bounded single-conductor mode. Mixed cable constructions and other kinds require separate review.');
  if (Object.hasOwn(input, 'cableShape') && input.cableShape !== 'round') return fail('Only round multiconductor cables or round insulated single conductors are supported; nonround cables require separate review.');
  if (!Array.isArray(input.rows) || input.rows.length === 0) return fail('Add at least one cable row with actual overall diameter and a positive whole-cable quantity.');
  const rows = [];
  for (const [index, item] of input.rows.entries()) {
    const prefix = `Cable row ${index + 1}`;
    if (!item || typeof item !== 'object' || Array.isArray(item)) return fail(`${prefix}: enter a valid cable row.`);
    if (Object.hasOwn(item, 'cableKind') && item.cableKind !== cableKind) return fail(`${prefix}: mixed single-conductor and multiconductor construction is not modeled in one tray; all rows must match the selected cable construction.`);
    if (Object.hasOwn(item, 'cableShape') && item.cableShape !== 'round') return fail(`${prefix}: only round multiconductor cables or round insulated single conductors are supported.`);
    if (!isNumeric(item.od) || Number(item.od) <= 0) return fail(`${prefix}: enter a finite, positive overall cable diameter in inches, including its insulation and jacket.`);
    const arrangement = item.arrangement === undefined || item.arrangement === null || item.arrangement === '' ? 'unspecified' : item.arrangement;
    if (!['unspecified', 'flat', 'triangle', 'square'].includes(arrangement)) return fail(`${prefix}: select area screening (layout unspecified), flat, triangle or square.`);
    const divisor = trayGroupSize(arrangement), groupedInput = input.quantityVersion === 2 && divisor > 1;
    if (!isNumeric(item.count) || !Number.isSafeInteger(Number(item.count)) || Number(item.count) <= 0) return fail(`${prefix}: ${groupedInput ? `enter a positive whole number of complete groups of ${divisor}. The current physical quantity has not been rounded or changed` : 'quantity must be a positive, safely represented whole number of cables or conductors'}.`);
    const od = Number(item.od), count = Number(item.count) * (groupedInput ? divisor : 1);
    if (!Number.isSafeInteger(count)) return fail(`${prefix}: total individual quantity exceeds the supported numeric range.`);
    const area = count * Math.PI * od * od / 4, diameterSum = count * od;
    if (!Number.isFinite(area) || area <= 0 || !Number.isFinite(diameterSum)) return fail(`${prefix}: dimensions or quantity exceed the supported numeric range.`);
    const size = item.size === undefined || item.size === null || item.size === '' ? null : String(item.size).trim();
    if (size !== null && !cableTrayConductorSizes.includes(size)) return fail(`${prefix}: choose a supported AWG / kcmil conductor size. Size does not determine cable OD.`);
    if (cableKind === 'single' && !cableTraySingleSizes.includes(size)) return fail(`${prefix}: single-conductor scope is 1/0 AWG through 750 kcmil; select an explicit supported conductor size.`);
    const sizeClass = size === null ? item.sizeClass : cableTrayConductorSizes.indexOf(size) >= cableTrayConductorSizes.indexOf('4/0') ? 'large' : 'small';
    if (!['small', 'large'].includes(sizeClass)) return fail(`${prefix}: select a conductor size or identify the legacy size class as below 4/0 AWG or 4/0 AWG and larger.`);
    if (count % divisor !== 0) return fail(`${prefix}: ${arrangement} arrangements require complete groups of ${divisor}; quantity is the number of individual cables or conductors and must be divisible by ${divisor}.`);
    const diameterSource = item.diameterSource ?? 'manual';
    if (diameterSource !== 'manual' && !Object.hasOwn(cableTrayDiameterReferences, diameterSource)) return fail(`${prefix}: select manual overall diameter or a supported diameter reference.`);
    if (diameterSource !== 'manual' && (cableKind !== 'single' || Number(input.voltage) > 600)) return fail(`${prefix}: the selected THHN/THWN-2 diameter reference applies only to standard single conductors rated through 600 V. Use the actual cable's manual manufacturer OD for other constructions or voltage ratings.`);
    const reference = cableTrayDiameterReferences[diameterSource];
    if (reference && reference.diameters[size] !== od) return fail(`${prefix}: the chosen diameter reference has no matching ${size} size / OD entry. Reselect the reference or choose manual diameter; a changed diameter cannot retain reference provenance.`);
    const normalizedRow = {...item, name: typeof item.name === 'string' ? item.name.trim() : '', cableKind, size, sizeClass, od, count, inputQuantity:Number(item.count), quantityUnit:groupedInput?'groups':'individuals', area, diameterSum, arrangement, diameterSource};
    if (reference) {normalizedRow.diameterReference = reference.label; normalizedRow.diameterReferenceUrl = reference.url;}
    else {delete normalizedRow.diameterReference; delete normalizedRow.diameterReferenceUrl;}
    rows.push(normalizedRow);
  }
  const geometry = layoutGeometry(rows);
  if (![geometry.knownWidth, geometry.height].every(Number.isFinite)) return fail('The combined layout dimensions exceed the supported numeric range.');
  const normalized = {...input, cableKind, rows};
  const result = cableKind === 'single' ? calculateSingleTray(normalized, geometry) : calculateMulticonductorTray(normalized, geometry);
  if (result.error) return result;
  const usedReferences = [...new Set(rows.map(row => row.diameterSource))].map(key => cableTrayDiameterReferences[key]).filter(Boolean);
  result.sources.push(...usedReferences.map(({label, url}) => ({label, url})));
  for (const [index, row] of rows.entries()) result.steps.push(`Diameter source row ${index + 1}: ${row.diameterReference || 'manual actual insulated / jacketed OD'}; ${row.od} in. Selected size ${row.size || 'legacy class only'} is used for rule classification, never a universal diameter lookup.`);
  const confirmationIssues = [];
  const effectiveRungSpacing = input.rungSpacing === undefined || input.rungSpacing === null || input.rungSpacing === '' ? 9 : Number(input.rungSpacing);
  const rungSpacingAssumed = true;
  if (usedReferences.some(ref=>ref.estimated)) confirmationIssues.push('The NEC Table 5 area-derived OD is a preliminary estimate for standard noncompact THHN/THWN-2, not a verified actual product diameter. Verify the cable product before installation.');
  if (cableKind === 'single') {
    confirmationIssues.push('Design assumes a qualifying industrial establishment where maintenance and supervision ensure that only qualified persons service the installation. Actual eligibility is unverified.');
    confirmationIssues.push('Design assumes each single-conductor cable is listed and surface-marked for cable-tray use and is otherwise permitted for this installation. Actual cable eligibility is unverified.');
    if (result.hasSmallSingle) {
      if (!Number.isFinite(effectiveRungSpacing) || (input.rungSpacing !== undefined && input.rungSpacing !== null && input.rungSpacing !== '' && !isNumeric(input.rungSpacing)) || effectiveRungSpacing <= 0 || effectiveRungSpacing > 9) return fail('For ladder tray with any 1/0–4/0 AWG conductors, rung spacing must be greater than zero and no more than 9 in. Correct the design assumption or revise the tray construction.');
      confirmationIssues.push(`Rung spacing is an unverified ${effectiveRungSpacing} in. design assumption for 1/0–4/0 AWG single conductors. Actual ladder rungs must be no more than 9 in. apart; rung spacing is not tray support span.`);
      result.steps.push(`Ladder rung spacing basis: ${effectiveRungSpacing} in. assumed for preliminary design; actual installation not verified. NEC 392.10(B)(1)(a) limits rungs to 9 in. for 1/0–4/0 AWG. This assumption provides no extra fill allowance.`);
      result.results.push({label:'Rung spacing basis',value:`${effectiveRungSpacing} in. design assumption; unverified`});
    }
    if (geometry.grouped) confirmationIssues.push('Design assumes each triangle or square is a secured circuit group with the correct phase and neutral membership, including the bound-circuit-group exception where 392.20(D) applies. Actual grouping and securing are unverified.');
  } else if (input.service === 'power' && rows.some(row => row.sizeClass === 'large' && ['triangle', 'square'].includes(row.arrangement))) {
    confirmationIssues.push('Triangle or square stacking of 4/0-AWG-and-larger multiconductor cables is not a supported compliant arrangement: those cables must remain in a single layer. Choose flat or redesign the layout; the calculated touching envelope does not override 392.22(A).');
  }
  const arrangementProhibited = cableKind === 'multiconductor' && input.service === 'power' && rows.some(row => row.sizeClass === 'large' && ['triangle', 'square'].includes(row.arrangement));
  const numericalPass = result.status === 'pass';
  if (confirmationIssues.length) {
    if (numericalPass) result.status = 'conditional';
    result.results[0].value = numericalPass ? 'Conditional: eligibility or arrangement review required' : 'Does not meet modeled sizing limits; eligibility review also required';
    const minimum = result.results.find(row => row.label === 'Minimum supported inside width');
    if (minimum) minimum.label = 'Minimum numerical-screen inside width';
    result.warnings.unshift(...confirmationIssues);
    result.candidates = result.candidates.map(candidate => ({...candidate, sizingPass: candidate.pass, pass: false}));
  } else result.candidates = result.candidates.map(candidate => ({...candidate, sizingPass: candidate.pass}));
  if (arrangementProhibited) {
    result.status = 'fail';
    result.results[0].value = 'Does not meet modeled installation limits: prohibited stacked arrangement';
    result.minimumWidth = null;
    result.selectedWidth = null;
    for (const row of result.results) {
      if (row.label.startsWith('Minimum') && row.label.includes('inside width')) {row.label = 'Minimum supported inside width'; row.value = 'None: change prohibited stacked arrangement'; delete row.unit;}
      if (row.label === 'Selected inside width') {row.value = 'No supported selection for this arrangement'; delete row.unit;}
    }
  }
  result.results.push(
    {label: 'Layout model', value: geometry.complete ? 'Touching groups side-by-side; no spacing allowance' : 'Area screening / partially unspecified layout'},
    {label: geometry.complete ? 'Touching layout width' : 'Specified-row width only', value: display(geometry.knownWidth), unit: 'in'},
    {label: 'Layout envelope height', value: display(geometry.height), unit: 'in'}
  );
  result.steps.push('Keep NEC fill demand separate from physical packaging. Flat: width = count × OD, height = OD. Triangle: 3 equal-OD cables per group, width = 2 × OD, height = (1 + √3 / 2) × OD. Square: 4 per group, width = 2 × OD, height = 2 × OD. Complete groups are placed touching, side-by-side; no intergroup spacing or bend radius is included.');
  for (const layout of geometry.rows) result.steps.push(`Layout row ${layout.index + 1}: ${layout.arrangement === 'unspecified' ? 'unspecified; only individual-diameter fit is checked' : `${layout.groupCount} ${layout.arrangement} package${layout.groupCount === 1 ? '' : 's'} × ${display(layout.groupWidth)} in. = ${display(layout.width)} in. wide; envelope height ${display(layout.height)} in.`}.`);
  result.steps.push(`Specified-row total width = ${display(geometry.knownWidth)} in.; maximum envelope height = ${display(geometry.height)} in. Check these against ${result.assessedWidth} in. inside width and ${Number(input.depth)} in. usable depth. ${geometry.complete ? 'All entered rows have a specified layout.' : 'Unspecified rows have no modeled packing; the known envelope is only a partial lower bound.'}`);
  if (geometry.height > Number(input.depth)) {
    result.warnings.unshift('The touching layout envelope exceeds usable tray depth. Increasing width alone cannot make this layout fit.');
    const minimum = result.results.find(row => row.label.includes('inside width') && row.label.startsWith('Minimum'));
    if (minimum) minimum.value = 'None: layout exceeds usable depth';
  }
  if (geometry.knownWidth > result.assessedWidth) result.warnings.unshift('The specified touching layout is wider than the assessed inside tray width. The area or diameter rule alone does not establish physical fit.');
  if (geometry.grouped) result.warnings.push('Triangle and square models require equal-OD cables within each row and complete groups. Touching package geometry provides no ampacity, circuit grouping, securing, spacing or installation approval.');
  if (cableKind === 'multiconductor' && rows.some(row => row.size === null)) result.warnings.push('Legacy rows retain their supplied below-4/0 or 4/0-and-larger classification. No exact AWG / kcmil size or insulated OD has been inferred.');
  // Color only the scope that was actually checked, using unrounded assessment.
  const assessment = result.candidates.find(c=>c.width===result.assessedWidth);
  const physicalStatus = numericalPass && !arrangementProhibited ? 'green' : 'red';
  result.physicalStatus = physicalStatus;
  if(result.status !== 'conditional') result.results[0].status = result.status === 'fail' ? 'red' : 'green';
  result.results[0].statusText = result.status === 'conditional' ? 'Conditional; installation checks remain' : result.status === 'fail' ? 'Exceeds a modeled limit' : 'Within modeled limits';
  for (const metric of result.results) {
    if (/^(Single-layer width usage|Diameter-sum rule usage|Mixed-rule budget usage|Rule-specific area usage)$/.test(metric.label)) {
      metric.status = assessment.rulePass ? 'green' : 'red';
      metric.statusText = assessment.rulePass ? 'Within physical-fill allowance' : 'Exceeds physical-fill allowance';
    }
    if (metric.label === 'Touching layout width' || metric.label === 'Specified-row width only') {
      if(geometry.knownWidth > result.assessedWidth || geometry.complete) metric.status = geometry.knownWidth > result.assessedWidth ? 'red' : 'green';
      metric.statusText = geometry.knownWidth > result.assessedWidth ? 'Exceeds inside width' : geometry.complete ? 'Within inside width; touching layout only' : 'Partial layout; complete fit not established';
    }
    if (metric.label === 'Layout envelope height') {
      if(geometry.height > Number(input.depth) || geometry.complete) metric.status = geometry.height > Number(input.depth) ? 'red' : 'green';
      metric.statusText = geometry.height > Number(input.depth) ? 'Exceeds usable depth' : geometry.complete ? 'Within usable depth; touching layout only' : 'Partial layout; complete fit not established';
    }
  }
  result.results.push({label:'Tray ampacity check', value:'Not calculated; separate design required'});
  // These are standing/eligibility notes rather than failed numerical checks.
  result.detailWarnings = result.warnings.filter(w=>confirmationIssues.includes(w) && !arrangementProhibited || /^(Use manufacturer-certified|Ampacity|This multiconductor|Single-conductor eligibility|Conductors or assemblies|The 3 in\. minimum|Where any 1\/0|Install all|The control \/ signal|Only 6 in\.|Triangle and square|Legacy rows)/.test(w));
  return {...result, cableKind, rows, geometry, numericalPass, arrangementProhibited, eligibilityConfirmed: confirmationIssues.length === 0, confirmationIssues, ...(cableKind==='single'&&result.hasSmallSingle?{effectiveRungSpacing,rungSpacingAssumed}:{})};
}

export const tray = calculateCableTray;
