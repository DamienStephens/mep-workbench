import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as calc from './dist/calc.js';
import {formatCurrent,currentResult} from './dist/current-display.js';
import {transformerProtection,transformerProtectionLimits,transformerBreakerOptions,evaluateTransformerProtection} from './dist/transformer-protection.js';
import {createSnapshot,summaryFromSnapshot,createRecordStore} from './dist/calculation-records.js';
import {createPDF} from './dist/pdf-report.js';

const row=(result,label)=>result.results.find(r=>r.label===label);
const good=result=>{assert.equal(result.error,undefined,result.error);return result;};
const pdf=snapshot=>new TextDecoder().decode(createPDF(snapshot));
for(const [input,expected] of [[0,'0.0'],[100,'100.0'],[15.625,'15.6'],[31.25,'31.3'],[1.2499,'1.2'],[1e21,'1000000000000000000000.0']])assert.equal(formatCurrent(input),expected);
const doubleRound=currentResult('Calculated current',1.2499);
assert.equal(doubleRound.value,1.25,'Existing numeric result API remains compatible');
assert.equal(doubleRound.displayValue,'1.2','Display must round the raw calculation, not its 3-decimal API value');
assert.equal(currentResult('Operating current',1.2499,1.2499).value,1.2499,'Unrounded existing API values can be retained');

const feeder={ocpd:40,terminal:75,ambient:40,configuration:'three-phase-4-wire',parallelSets:1,material:'copper'};
const service={...feeder,load:39.99999,ocpd:60};
const transformer={kva:7.5,primary:480,secondary:240,primaryPhase:'1',secondaryPhase:'1'};
const amps={mode:'wattsToAmps',value:149.988,voltage:120,pf:1,phase:'1'};
const protection={kva:75,phase:3,primary:480,secondary:208,protection:'dual'};
const fullProtection={...protection,primaryOcpd:100,secondaryOcpd:225,designLoad:200,configuration:'three-phase-4-wire',secondaryRule:'10ft',lengthFt:10,installationConfirmed:true,material:'copper',terminal:75,ambient:30,parallelSets:1};
const cases=[
 ['conductor',feeder,calc.conductor],
 ['conductor',{...feeder,ocpd:100,parallelSets:3,voltageDropEnabled:true,length:10,current:99.99999,target:3,voltage:480,phase:3},calc.conductor],
 ['service',service,calc.service],
 ['service',{...service,load:59.99999,voltageDropEnabled:true,length:10,current:39.98765,target:3,voltage:480,phase:3},calc.service],
 ['transformer',transformer,calc.transformer],
 ['amps',amps,calc.amps],
 ['amps',{...amps,mode:'ampsToWatts',value:20},calc.amps],
 ['protection',protection,transformerProtectionLimits],
 ['protection',fullProtection,transformerProtection],
 ['protection',{...protection,ocpdCheckEnabled:true,primaryOcpd:100,secondaryOcpd:225},evaluateTransformerProtection],
 ['protection',{...fullProtection,ocpdCheckEnabled:true,conductorCheckEnabled:true},evaluateTransformerProtection]
];
let currentRows=0,standardRows=0;
for(const [moduleId,inputs,calculate] of cases){
 const output=good(calculate(inputs));
 const snapshot=createSnapshot({id:moduleId,title:moduleId,fields:[],limitations:[]},inputs,output,{generatedAt:'2026-10-11T00:00:00.000Z'});
 const summary=summaryFromSnapshot(snapshot),report=pdf(snapshot);
 for(const result of output.results){
  if(result.unit!=='A')continue;
  if(/OCPD/.test(result.label)){
   standardRows++;
   assert.equal(result.displayValue,undefined,`${result.label}: standard device ratings stay exact`);
   assert.ok(Number.isInteger(result.value));
   assert.ok(summary.includes(`${result.label}: ${result.value} A`));
   assert.ok(report.includes(`${result.label}: ${result.value} A`));
  }else{
   currentRows++;
   assert.match(result.displayValue,/^\d+\.\d$/,`${moduleId}: ${result.label}`);
   assert.ok(summary.includes(`${result.label}: ${result.displayValue} A`),`${moduleId}: summary precision`);
   assert.ok(report.includes(`${result.label}: ${result.displayValue} A`),`${moduleId}: PDF precision`);
  }
 }
 assert.deepEqual(snapshot.result,output,'Snapshot copies display metadata without changing numerical values');
}
assert.ok(currentRows>20&&standardRows>10,'Exercise calculated current and device-rating rows across all relevant engines');
assert.equal(row(calc.amps(amps),'Current').displayValue,'1.2');
assert.equal(row(calc.amps({...amps,value:0}),'Current').displayValue,'0.0');
assert.equal(row(calc.transformer(transformer),'Primary full-load current').displayValue,'15.6');
assert.equal(row(calc.transformer(transformer),'Secondary full-load current').displayValue,'31.3');
assert.equal(row(calc.conductor(feeder),'Combined usable ampacity').displayValue,'40.0');
assert.equal(row(calc.conductor(feeder),'Combined usable ampacity').value,40.04);
assert.match(calc.conductor(feeder).steps.join(' '),/55\.0 × 0\.91 × 0\.8 = 40\.0 A/);
assert.match(calc.conductor(feeder).steps.join(' '),/≥ 40 A total OCPD/);
assert.match(calc.service(service).steps.join(' '),/design load = 40\.0 A/);
const parallel=calc.conductor(cases[1][1]);
assert.match(parallel.steps.join(' '),/Per-set current = 100\.0 \/ 3 = 33\.3 A/);
assert.match(parallel.steps.join(' '),/100 A selected OCPD rating/);

// Display equality must never collapse a real threshold difference.
assert.equal(row(good(calc.service({...service,load:60})),'Total service OCPD').value,60);
assert.match(calc.service({...service,load:60.00001}).error,/below.*60\.0 A design load/);
assert.equal(row(good(calc.service({...service,load:60.00001,ocpd:0})),'Total service OCPD').value,70);
assert.match(calc.conductor({...cases[1][1],current:100.00001}).error,/no greater than the selected OCPD rating/);
const low=transformerBreakerOptions({kva:5.99999*.48,phase:1,primary:480,secondary:240,protection:'dual'});
const high=transformerBreakerOptions({kva:6.00001*.48,phase:1,primary:480,secondary:240,protection:'dual'});
assert.equal(row(low.basic,'Primary full-load current').displayValue,'6.0');
assert.equal(row(high.basic,'Primary full-load current').displayValue,'6.0');
assert.deepEqual(low.primaryOptions,[],'A raw ceiling just below 15 A excludes the 15 A device');
assert.deepEqual(high.primaryOptions,[15],'A raw ceiling just above 15 A permits the 15 A device');
for(const [current,multiplier] of [[8.99999,1.67],[9,1.25]]){
 const result=transformerBreakerOptions({kva:current*.48,phase:1,primary:480,secondary:240,protection:'primary-only'});
 assert.equal(row(result.basic,'Primary full-load current').displayValue,'9.0');
 assert.equal(result.primaryLimit.multiplier,multiplier,'Table-cell threshold uses unrounded nameplate current');
}
const partial=transformerBreakerOptions({kva:15.00001*.48,phase:1,primary:480,secondary:240,protection:'dual',primaryOcpd:15});
assert.equal(row(partial.basic,'Primary full-load current').displayValue,'15.0');
assert.equal(partial.partialCapacity.primary,true,'Partial-capacity check uses unrounded nameplate current');

// Other units keep the existing precision, including values in method text.
const otherCases=[
 calc.power({mode:'wattsToVA',watts:1000,pf:.83}),
 calc.amps({...amps,value:149.98765}),
 calc.conduit({rows:[{size:'12',count:4}],trade:'1/2'}),
 calc.drop({size:'12',length:100,current:20.01234,voltage:120,target:3,material:'copper',phase:1}),
 calc.box({size:'12',conductors:1,grounds:1,yokes:0,studs:0,clamps:false,volume:20})
];
for(const output of otherCases)for(const result of good(output).results)if(result.unit!=='A')assert.equal(result.displayValue,undefined,`${result.label} must not get current precision`);
assert.equal(row(otherCases[0],'Apparent power').value,1204.819);
assert.equal(row(otherCases[1],'Real input power').value,149.988);
assert.equal(row(otherCases[2],'Actual fill').value,17.5);
assert.equal(row(otherCases[4],'Required box volume').value,4.5);
assert.match(calc.transformer({...transformer,primaryPhase:3}).steps[0],/√3 × 480/,'Phase factors use the exact square-root notation');

// Frozen historical fixture: this hash was captured before the display change.
// Do not update this fixture's historical version during release version bumps.
const legacy={moduleId:'transformer',moduleTitle:'Transformer current',inputs:{kva:7.5,primary:480,secondary:240,primaryPhase:'1',secondaryPhase:'1'},inputRows:[{label:'Nameplate',value:'7.5 kVA'}],result:{results:[{label:'Primary full-load current',value:15.625,unit:'A'},{label:'Secondary full-load current',value:31.25,unit:'A'}],steps:['Primary I = 7.5 × 1,000 / (1 × 480).'],warnings:['Legacy report precision is preserved.'],sources:[]},limitations:[],appVersion:'2.3.0',codeEdition:'NEC 2023 reference baseline',generatedAt:'2026-10-11T00:00:00.000Z',projectName:'Legacy project',calculationName:'Existing transformer'};
const legacyBefore=structuredClone(legacy),legacyPDF=createPDF(legacy);
assert.equal(createHash('sha256').update(legacyPDF).digest('hex'),'cd1674969c6d512c7087c8964ada878ab52711339e7d89f96df3c8ff02d79cc0','Historical PDF output stays byte-for-byte unchanged');
assert.match(summaryFromSnapshot(legacy),/Primary full-load current: 15\.625 A/);
assert.match(summaryFromSnapshot(legacy),/Secondary full-load current: 31\.25 A/);
assert.deepEqual(legacy,legacyBefore);
let stored=null;
const store=createRecordStore({getItem:()=>stored,setItem:(_key,value)=>stored=value});
const saved=store.save(legacy),savedBefore=structuredClone(saved.snapshot);
const recalculated=createSnapshot({id:'transformer',title:'Transformer current',fields:[],limitations:[]},saved.snapshot.inputs,calc.transformer(saved.snapshot.inputs));
assert.match(summaryFromSnapshot(recalculated),/Primary full-load current: 15\.6 A/);
assert.match(summaryFromSnapshot(recalculated),/Secondary full-load current: 31\.3 A/);
assert.deepEqual(store.load(saved.id).snapshot,savedBefore,'Recalculating a loaded entry does not rewrite the original snapshot');
assert.deepEqual(createPDF(store.load(saved.id).snapshot),createPDF(savedBefore));
const invalid=structuredClone(recalculated);invalid.result.results[0].displayValue=15.6;
assert.throws(()=>summaryFromSnapshot(invalid),/incomplete or invalid/);
console.log(`Current display: ${currentRows} calculated rows and ${standardRows} exact device ratings; summary/PDF precision, full-precision boundaries, other units and immutable legacy PDF passed.`);
