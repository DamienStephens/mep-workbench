import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as calc from './dist/calc.js';
import {createSnapshot,summaryFromSnapshot,CURRENT_APP_VERSION} from './dist/calculation-records.js';
import {necReference,necVerificationDate,necSectionUrls} from './dist/code-references.js';
const val=(r,l)=>r.results.find(x=>x.label===l)?.value;
// Independently transcribed published Table 4 allowed areas, not total-area products.
assert.deepEqual(calc.conduitSizes.map(x=>x.fill40),[.122,.213,.346,.598,.814,1.342,2.343,3.538,4.618,5.901]);
assert.deepEqual(calc.conduitSizes.map(x=>x.fill53),[.161,.283,.458,.793,1.079,1.778,3.105,4.688,6.119,7.819]);
assert.deepEqual(calc.conduitSizes.map(x=>x.fill31),[.094,.165,.268,.464,.631,1.040,1.816,2.742,3.579,4.573]);
// Rounded-total arithmetic previously falsely rejected equality and falsely passed overflow.
let r=calc.conduit({trade:'1/2',rows:[{size:'12',count:6},{size:'10',count:2}]});
assert.equal(val(r,'Fill check'),'Within fill limit');assert.equal(val(r,'Minimum EMT'),'1/2 in.');
r=calc.conduit({trade:'3/4',rows:[{size:'14',count:4},{size:'12',count:2},{size:'10',count:7}]});
assert.equal(val(r,'Fill check'),'Exceeds fill limit');assert.equal(val(r,'Minimum EMT'),'1 in.');
assert.ok(r.steps.some(x=>/published allowance rather than multiplying rounded total area/.test(x)));
const box={size:'12',conductors:4,grounds:4,yokes:1,studs:0,volume:20,clamps:false};
assert.deepEqual(calc.box(box),calc.box({...box,terminalBlocks:0}),'Old inputs default to no terminal blocks');
for(const [size,unit] of [['14',2],['12',2.25],['10',2.5],['8',3],['6',5]])for(const blocks of [1,2,5]){
 const out=calc.box({...box,size,terminalBlocks:blocks});
 assert.equal(val(out,'Required box volume'),(7+blocks)*unit);
 assert.ok(out.steps.some(x=>x.includes(`${blocks} terminal-block assembly allowance`)));
}
for(const terminalBlocks of [-1,1.5,'',null,true,NaN,Infinity])assert.ok(calc.box({...box,terminalBlocks}).error);
assert.equal(val(calc.box({...box,conductors:0,grounds:0,yokes:0,terminalBlocks:1}),'Required box volume'),2.25);
assert.equal(val(calc.box({...box,terminalBlocks:2}),'Volume check'),'Insufficient volume');
const input={ocpd:100,terminal:75,ambient:30,configuration:'three-phase-3-wire',parallelSets:2,material:'copper'};
for(const enabled of [false,true]){
 const out=calc.conductor({...input,voltageDropEnabled:enabled,phase:3,voltage:208,length:1000,current:80,target:3});
 assert.equal(out.error,undefined);assert.equal(out.groundingReviewRequired,false);
 assert.ok(out.results.some(x=>x.label==='Minimum raceway per set'));
 assert.ok(out.results.some(x=>x.label==='Conservative Cu EGC per raceway'));
 assert.equal(out.conservativeGrounding,true);
 assert.ok(out.steps.some(x=>x.startsWith('Conservative parallel-floor grounding:')));
 const snapshot=createSnapshot({id:'conductor',title:'Conductors',fields:[],limitations:[]},input,out);
 assert.equal(snapshot.result.groundingReviewRequired,false);
 assert.match(summaryFromSnapshot(snapshot),/Minimum raceway per set/);
 assert.match(summaryFromSnapshot(snapshot),/Conservative parallel-floor grounding/);
}
for(const delta of [{parallelSets:1},{ocpd:400}]){
 const out=calc.conductor({...input,...delta});assert.equal(out.groundingReviewRequired,false);
 assert.ok(out.results.some(x=>x.label==='Minimum raceway per set'));
 assert.ok(!out.warnings.some(x=>x.startsWith('MANUAL EGC REVIEW REQUIRED:')));
}
const module={id:'box',title:'Box fill',fields:[{key:'terminalBlocks',label:'Terminal-block assemblies',type:'number'}],limitations:[]};
const snapshot=createSnapshot(module,{...box,terminalBlocks:2},calc.box({...box,terminalBlocks:2}));
assert.match(summaryFromSnapshot(snapshot),/Terminal-block assemblies: 2/);
assert.match(summaryFromSnapshot(snapshot),/314\.16\(B\)\(1\)/);
const historical=structuredClone(snapshot);historical.appVersion='2.8.1';historical.codeEdition='NEC 2023 reference target; verification pending against published 2023';historical.result.sources=[{label:'Historical source, unverified',url:'https://link.nfpa.org/free-access/publications/70/2023'}];
const before=JSON.stringify(historical);summaryFromSnapshot(historical);assert.equal(JSON.stringify(historical),before);
assert.match(summaryFromSnapshot(historical),/2\.8\.1/);assert.match(summaryFromSnapshot(historical),/Historical source, unverified/);
assert.equal(CURRENT_APP_VERSION,'2.14.0');assert.equal(necVerificationDate,'2026-10-13');
assert.equal(necReference('Separate grounding review','grounding').verificationDate,undefined);
assert.equal(necReference('Table 9','impedance',true).url,necSectionUrls.impedance);
for(const name of ['app','calc','code-references','ambient-helper','transformer-protection','cable-tray']){
 const text=fs.readFileSync(`dist/${name}.js`,'utf8');
 assert.doesNotMatch(text,/verification pending against published|final 2023[^.]*not independently verified|NEC 2017/i);
}
const app=fs.readFileSync('dist/app.js','utf8');assert.match(app,/number\('terminalBlocks','Terminal-block assemblies',0/);
console.log('Published NEC regressions: exact EMT allowances/boundaries, terminal blocks, conservative parallel-floor EGC/raceways, date-free source labels and immutable historical reports passed.');
