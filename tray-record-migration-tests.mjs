import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as calc from './dist/calc.js';
import {createSnapshot,summaryFromSnapshot,copySummaryFromSnapshot,createRecordStore,RECORDS_KEY} from './dist/calculation-records.js';
import {createPDF} from './dist/pdf-report.js';

const sha=value=>createHash('sha256').update(value).digest('hex');
const near=(a,b)=>assert.ok(Math.abs(a-b)<=Math.max(1,Math.abs(b))*1e-12,`${a} != ${b}`);
const meta={appVersion:'2.11.0',generatedAt:'2026-10-13T12:34:56.000Z',projectName:'Tray retrofit',calculationName:'Grouped feeders'};
const module={id:'tray',title:'Cable tray sizing',fields:[{key:'cableKind',label:'Cable construction',type:'select',options:[['single','Single conductors'],['multiconductor','Multiconductor cables']]}],limitations:['Physical fill only.']};
const groupRows=snapshot=>snapshot.inputRows.filter(row=>/^Cable group \d+$/.test(row.label));
const basis=snapshot=>snapshot.inputRows.filter(row=>row.label==='Ladder rung spacing basis');
const resultFor=total=>({results:[{label:'Physical quantity',value:total}],steps:['Method must remain in the full report only.'],warnings:['Warning must remain in the full report only.'],sources:[{label:'Source must remain in the full report only.'}]});

// Literal historical display text and digests captured with the unmodified
// v2.10.2 summary and PDF exporters. Do not regenerate this fixture at runtime.
const historical={
 moduleId:'tray',moduleTitle:'Cable tray sizing',
 inputs:{cableKind:'single',trayType:'ladder',service:'power',width:'auto',depth:4,voltage:600,rungSpacing:9,industrialQualified:true,cableListed:true,boundGroupsConfirmed:true,rows:[
  {name:'Feeder A',od:0.75,count:6,size:'1/0',arrangement:'triangle'},
  {name:'Feeder B',od:0.8,count:8,size:'2/0',arrangement:'square'}
 ]},
 inputRows:[
  {label:'Ladder rung spacing (in.)',value:'9'},
  {label:'Cable group 1',value:'Feeder A: 6 individual conductors x 0.75 in. overall diameter; 1/0 AWG; arrangement: triangle; diameter source: Manual actual cable OD'},
  {label:'Cable group 2',value:'Feeder B: 8 individual conductors x 0.8 in. overall diameter; 2/0 AWG; arrangement: square; diameter source: Manual actual cable OD'}
 ],
 result:{results:[{label:'Individual conductor quantity',value:14,unit:'conductors'},{label:'Selected inside width',value:12,unit:'in'}],steps:['Historical calculation used all 14 individual conductors for physical fill.'],warnings:['Historical grouped-circuit confirmation was required.'],sources:[{label:'Saved NEC 392.22 reference',url:'https://www.nfpa.org/codes-and-standards/nfpa-70-standard-development/70'}]},
 limitations:['Historical design scope retained exactly.'],appVersion:'2.10.2',codeEdition:'NEC 2023 reference baseline; verify adopted edition and local amendments',generatedAt:'2026-10-12T12:34:56.000Z',projectName:'Tray retrofit',calculationName:'Existing grouped feeders'
};
const historicalJSON=JSON.stringify(historical);
assert.equal(sha(summaryFromSnapshot(historical)),'df7250bad5a36b966d765a03a4fc4d68be721826827d42d618f3087faece77aa');
assert.equal(sha(createPDF(historical)),'9e0c76d4a58d594abe53d1c8ca2013ba3e44cc09595e8e8321985238903deb1b');
assert.equal(sha(copySummaryFromSnapshot(historical)),'0a4f901f6046967757d71e26bb734add3baa98d3cdcc4e374dffb51c7db04600');
assert.equal(JSON.stringify(historical),historicalJSON);

// Every quantity-bearing input row states whether the number means groups or
// individuals. Flat and unspecified layouts never multiply physical quantity.
for(const cableKind of ['single','multiconductor']) {
 for(const arrangement of ['triangle','square','flat','unspecified',undefined]) {
  for(const count of [1,2,7]) {
   const groupSize=arrangement==='triangle'?3:arrangement==='square'?4:1;
   const state={quantityVersion:2,cableKind,service:'power',rows:[{name:'Feeder',count,od:0.75,size:'1/0',...(arrangement?{arrangement}:{})}]};
   const original=JSON.stringify(state),result=resultFor(count*groupSize),originalResult=JSON.stringify(result);
   const snapshot=createSnapshot(module,state,result,meta),text=groupRows(snapshot)[0].value;
   const individuals=cableKind==='single'?'individual conductors':'cables';
   const expected=groupSize>1?`${count} group${count===1?'':'s'} of ${groupSize} (${count*groupSize} total ${individuals})`:`${count} individual ${cableKind==='single'?'conductors':'cables'}`;
   assert.ok(text.startsWith(`Feeder: ${expected} x 0.75 in. overall diameter;`),text);
   assert.match(text,/1\/0 AWG; arrangement:/);
   assert.match(summaryFromSnapshot(snapshot),new RegExp(`Physical quantity: ${count*groupSize}`));
   const copy=copySummaryFromSnapshot(snapshot);
   assert.equal(copy,[snapshot.moduleTitle,'','INPUTS',...snapshot.inputRows.map(row=>`${row.label}: ${row.value}`),'','OUTPUTS',...snapshot.result.results.map(row=>`${row.label}: ${row.displayValue??row.value}${row.unit?' '+row.unit:''}`)].join('\n'));
   assert.doesNotMatch(copy,/METHOD|ASSUMPTIONS|WARNINGS|SOURCES|Method must|Warning must|Source must|Physical fill only|Not a substitute/);
   assert.match(summaryFromSnapshot(snapshot),/Method must remain in the full report only/);
   assert.match(summaryFromSnapshot(snapshot),/Warning must remain in the full report only/);
   assert.equal(JSON.stringify(state),original);assert.equal(JSON.stringify(result),originalResult);
   snapshot.inputs.rows[0].count=99;assert.equal(JSON.stringify(state),original,'Snapshots own a detached copy of their inputs');
  }
 }
}

// Versionless input counts still represent individual items, even when a new
// report is requested without opening/migrating that state in the application.
const legacyRecalculated=createSnapshot(module,historical.inputs,historical.result,meta);
assert.deepEqual(groupRows(legacyRecalculated),historical.inputRows.slice(1));
assert.equal(basis(legacyRecalculated).length,0);
for(const cableKind of ['single','multiconductor']) {
 const oldState={cableKind,service:'control',rows:[{name:'Saved class',count:12,od:0.75,sizeClass:'small',arrangement:'triangle',diameterReference:'Certified product sheet',diameterReferenceUrl:'https://example.com/cable-sheet'}]};
 const snapshot=createSnapshot(module,oldState,resultFor(12),meta),row=groupRows(snapshot)[0].value;
 assert.match(row,new RegExp(`Saved class: 12 ${cableKind==='single'?'individual conductors':'cables'} x`));
 assert.match(row,/smaller than 4\/0 AWG \(saved class\)/);
 assert.match(row,/diameter source: Certified product sheet · https:\/\/example.com\/cable-sheet/);
 assert.match(row,/\(size not used for control-only area rule\)/);
}

// The effective rung spacing is an input design basis. It remains explicit in
// inputs-only copies, while calculation methods and warnings remain excluded.
for(const [spacing,assumed,description] of [[9,true,'assumed for design; verify actual installation'],[8,true,'assumed for design; verify actual installation'],[9,false,'assumed for design; verify actual installation'],[6,false,'assumed for design; verify actual installation']]) {
 const state={quantityVersion:2,cableKind:'single',rungSpacing:spacing,rungSpacingConfirmed:!assumed,rows:[{name:'Feeder',count:2,od:0.75,size:'1/0',arrangement:'triangle'}]};
 const result={...resultFor(6),effectiveRungSpacing:spacing,rungSpacingAssumed:assumed};
 const snapshot=createSnapshot(module,state,result,meta);
 assert.deepEqual(basis(snapshot),[{label:'Ladder rung spacing basis',value:`${spacing} in. ${description}`}]);
 assert.match(copySummaryFromSnapshot(snapshot),new RegExp(`Ladder rung spacing basis: ${spacing} in\\.`));
 assert.doesNotMatch(copySummaryFromSnapshot(snapshot),/Method must|Warning must|Source must/);
}
for(const effectiveRungSpacing of [undefined,null]) {
 const snapshot=createSnapshot(module,{quantityVersion:2,cableKind:'single',rows:[{name:'Large feeder',count:4,od:1,size:'500',arrangement:'flat'}]},{...resultFor(4),...(effectiveRungSpacing===undefined?{}:{effectiveRungSpacing})},meta);
 assert.deepEqual(basis(snapshot),[],'Inapplicable rung spacing does not acquire a design-basis row');
}

// Read, copy, rename, trash and restore never migrate archived inputs or rebuild
// their frozen report rows. Opening a returned clone cannot edit the record.
let raw=null,writes=0;
const store=createRecordStore({getItem:key=>{assert.equal(key,RECORDS_KEY);return raw},setItem:(key,value)=>{assert.equal(key,RECORDS_KEY);raw=value;writes++}});
const saved=store.save(historical),savedJSON=JSON.stringify(saved.snapshot),savedSummary=summaryFromSnapshot(saved.snapshot),savedPDF=createPDF(saved.snapshot),savedCopy=copySummaryFromSnapshot(saved.snapshot);
const beforeRead=raw,writesBeforeRead=writes;
const read=store.load(saved.id);store.list();read.snapshot.inputs.rows[0].count=999;
assert.equal(raw,beforeRead);assert.equal(writes,writesBeforeRead);
store.rename(saved.id,{projectName:'Renamed archive',calculationName:'Renamed feeder'});store.trash(saved.id);store.restore(saved.id);
const restored=store.load(saved.id).snapshot;
assert.equal(JSON.stringify(restored),savedJSON);
assert.equal(summaryFromSnapshot(restored),savedSummary);assert.deepEqual(createPDF(restored),savedPDF);assert.equal(copySummaryFromSnapshot(restored),savedCopy);
assert.equal(JSON.stringify(historical),historicalJSON);

// Live edit-state migration is separate from archived report reading. Legacy
// physical totals survive migration, recalculation, resaving and repeated loads.
assert.equal(typeof calc.migrateCableTrayState,'function');
const migrated=calc.migrateCableTrayState(historical.inputs);
assert.equal(migrated.quantityVersion,2);
assert.deepEqual(migrated.rows.map(row=>row.count),[2,2]);
assert.equal(migrated.rungSpacing,9);assert.equal(migrated.rungSpacingConfirmed,false);
assert.deepEqual(calc.migrateCableTrayState(migrated),migrated,'Migration is idempotent');
assert.equal(JSON.stringify(historical),historicalJSON,'Migration must not mutate the archived snapshot');
assert.equal(JSON.stringify(store.load(saved.id).snapshot),savedJSON);
const recalculated=calc.tray(migrated);
assert.equal(recalculated.error,undefined,recalculated.error);assert.equal(recalculated.totalCount,14);
near(recalculated.totalArea,6*Math.PI*0.75**2/4+8*Math.PI*0.8**2/4);
const legacyCalculated=calc.tray(historical.inputs);
assert.equal(legacyCalculated.error,undefined,legacyCalculated.error);assert.equal(legacyCalculated.totalCount,recalculated.totalCount);
near(legacyCalculated.totalArea,recalculated.totalArea);near(legacyCalculated.geometry.knownWidth,recalculated.geometry.knownWidth);
const current=createSnapshot(module,migrated,recalculated,meta);
assert.match(groupRows(current)[0].value,/2 groups of 3 \(6 total individual conductors\)/);
assert.match(groupRows(current)[1].value,/2 groups of 4 \(8 total individual conductors\)/);
assert.deepEqual(basis(current),[{label:'Ladder rung spacing basis',value:'9 in. assumed for design; verify actual installation'}]);
const savedCurrent=store.save(current),currentClone=store.load(savedCurrent.id).snapshot;
assert.deepEqual(currentClone.inputRows,current.inputRows);assert.deepEqual(currentClone.inputs,migrated);
const currentPDF=createPDF(currentClone),currentPDFText=new TextDecoder().decode(currentPDF);
assert.match(currentPDFText,/2 groups of 3/);assert.match(currentPDFText,/6 total individual conductors/);
assert.match(currentPDFText,/2 groups of 4/);assert.match(currentPDFText,/8 total individual conductors/);
assert.deepEqual(createPDF(store.load(savedCurrent.id).snapshot),currentPDF);
assert.equal(JSON.stringify(store.load(saved.id).snapshot),savedJSON,'Saving a recalculation does not replace the old saved report');
assert.match(copySummaryFromSnapshot(currentClone),/2 groups of 3 \(6 total individual conductors\)/);
assert.doesNotMatch(copySummaryFromSnapshot(currentClone),/\nMETHOD\n|\nSOURCES\n|\nASSUMPTIONS, WARNINGS & SCOPE\n/);

// Mixed row layouts preserve the same physical inventory for both cable kinds.
for(const cableKind of ['single','multiconductor']) {
 const legacy={...historical.inputs,cableKind,rows:[
  {name:'Triangle',count:9,od:0.5,size:cableKind==='single'?'1/0':'12',arrangement:'triangle'},
  {name:'Square',count:8,od:0.5,size:cableKind==='single'?'1/0':'12',arrangement:'square'},
  {name:'Flat',count:5,od:0.5,size:cableKind==='single'?'1/0':'12',arrangement:'flat'},
  {name:'Unspecified',count:7,od:0.5,size:cableKind==='single'?'1/0':'12',arrangement:'unspecified'},
  {name:'Old layout',count:3,od:0.5,size:cableKind==='single'?'1/0':'12'}
 ]};
 const original=JSON.stringify(legacy),state=calc.migrateCableTrayState(legacy),result=calc.tray(state);
 assert.equal(JSON.stringify(legacy),original);assert.deepEqual(state.rows.map(row=>row.count),[3,2,5,7,3]);
 assert.equal(result.error,undefined,result.error);assert.equal(result.totalCount,32);near(result.totalArea,32*Math.PI*0.5**2/4);
 const snapshot=createSnapshot(module,state,result,meta),text=groupRows(snapshot).map(row=>row.value).join('\n');
 assert.match(text,new RegExp(`3 groups of 3 \\(9 total ${cableKind==='single'?'individual conductors':'cables'}\\)`));
 assert.match(text,new RegExp(`2 groups of 4 \\(8 total ${cableKind==='single'?'individual conductors':'cables'}\\)`));
 assert.match(text,new RegExp(`Flat: 5 individual ${cableKind==='single'?'conductors':'cables'}`));
 assert.match(text,new RegExp(`Unspecified: 7 individual ${cableKind==='single'?'conductors':'cables'}`));
 assert.match(text,new RegExp(`Old layout: 3 individual ${cableKind==='single'?'conductors':'cables'}`));
}

// A saved incomplete physical package is never rounded into a different count
// or silently admitted as a complete package in the new schema.
for(const [arrangement,groupSize] of [['triangle',3],['square',4]]) {
 const input={...historical.inputs,rows:[{name:'Incomplete',count:5,od:0.5,size:'1/0',arrangement}]};
 const original=JSON.stringify(input),state=calc.migrateCableTrayState(input);
 assert.equal(state.rows[0].count,5/groupSize);
 near(state.rows[0].count*groupSize,5);
 assert.ok(calc.tray(state).error,'Incomplete legacy groups remain invalid until the layout or quantity is corrected');
 assert.throws(()=>createSnapshot(module,state,calc.tray(state),meta),/valid calculated result/);
 assert.deepEqual(calc.migrateCableTrayState(state),state);assert.equal(JSON.stringify(input),original);
}
const overSpaced=calc.migrateCableTrayState({...historical.inputs,rungSpacing:12});
assert.equal(overSpaced.rungSpacing,12,'Migration never substitutes a passing assumption for an entered spacing');
assert.equal(overSpaced.rungSpacingConfirmed,false);assert.match(calc.tray(overSpaced).error,/rung spacing/i);

console.log('Tray record migration: group/individual reports, rung design basis, inputs-only copies, physical-total preservation, idempotent migration, and immutable historical summary/PDF digests passed.');
