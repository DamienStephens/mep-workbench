import { createSnapshot, buildSummary, summaryFromSnapshot, createRecordStore } from './dist/calculation-records.js';
import { transformerProtection, evaluateTransformerProtection, migrateProtectionState,transformerBreakerOptions, transformerOcpdRatings, secondaryRuleConditions } from './dist/transformer-protection.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as calc from './legacy-conductor-fixtures.mjs';
import {systemOptions,voltageOptions} from './dist/voltage.js';
let checks=0;
const base={load:70,terminal:90,terminal90Confirmed:true,ambient:30,parallelSets:1,configuration:'three-phase-3-wire',material:'copper',ocpd:0};
const run=p=>{const r=calc.conductor({...base,...p});assert.equal(r.error,undefined,r.error);checks++;return Object.fromEntries(r.results.map(x=>[x.label,x.value]));};
for(const value of [undefined,null,false,'false','yes',1,{},'']){assert.match(calc.conductor({...base,terminal90Confirmed:value}).error,/explicit verification/);checks++;}
for(const terminal90Confirmed of [true,'true'])assert.equal(run({terminal90Confirmed})['Copper conductor per set'],'6 AWG');
assert.equal(run({terminal:75,terminal90Confirmed:false})['Copper conductor per set'],'4 AWG');
assert.equal(run({terminal:60,terminal90Confirmed:false})['Copper conductor per set'],'4 AWG');
for(const [material,load,size] of [['copper',20,'12 AWG'],['copper',25,'10 AWG'],['copper',35,'8 AWG'],['aluminum',20,'10 AWG'],['aluminum',30,'8 AWG']])assert.equal(run({material,load})[`${material==='copper'?'Copper':'Aluminum'} conductor per set`],size);
for(const material of ['copper','aluminum'])for(const terminal of [60,75,90])for(const configuration of Object.keys(calc.circuitConfigurations))for(const ambient of [10,30,40,60,80])for(const parallelSets of [1,2,5]){
 const r=run({material,terminal,configuration,ambient,parallelSets});
 const w=calc.conductors.find(w=>r[`${material==='copper'?'Copper':'Aluminum'} conductor per set`].startsWith(w.size+' '));
 const g=calc.conductors.find(w=>r['Base-minimum Cu EGC per raceway'].startsWith(w.size+' '));
 const prefix=material==='copper'?'cu':'al',c=calc.circuitConfigurations[configuration],af=({10:1.15,30:1,40:.91,60:.71,80:.41})[ambient],cf=c.ccc===4?.8:1;
 const expected=Math.min(w[prefix+terminal],w[prefix+'90']*af*cf)*parallelSets;
 assert.ok(Math.abs(r['Combined usable ampacity']-expected)<.00051);assert.ok(expected>=r['Total OCPD']);
 assert.equal(r['Base-minimum Cu EGC per raceway'],'8 AWG');
 assert.equal(r['Separate EMT raceways'],parallelSets);if(parallelSets>1)assert.ok(w.cm>=105600);
 const emt=calc.conduitSizes.find(x=>w.area*c.physical+g.area<=x.area*.4);assert.equal(r['Minimum EMT per set'],`${emt.size} in.`);
}
assert.ok(calc.conductor(base).warnings.some(w=>w.includes('90°C equipment rating condition')&&w.includes('lug marking alone')));
assert.ok(calc.conductor({...base,terminal:75}).warnings.every(w=>!w.includes('90°C equipment rating condition')));
for(const p of [{terminal:100},{ocpd:5000},{load:4001},{parallelSets:21},{configuration:''}])assert.ok(calc.conductor({...base,...p}).error);
// Exercise the actual event handlers, including switching away/back and saved-state behavior.
const source=fs.readFileSync(new URL('./dist/app.js',import.meta.url),'utf8').replace(/^import[^\n]+\n/gm,'').replace(/route\(\);\s*$/,'');
function harness(saved={}){
 const listeners={},nodes={};let persisted;
 for(const key of ['#copy-summary','#export-pdf','#save-calculation','#action-status','#storage-status','#main','#navigation','#breadcrumb-title','#calculator-form','#reset','#print','#results','#sources'])nodes[key]={innerHTML:'',addEventListener:(type,fn)=>listeners[type]=fn,querySelector:()=>null};
 const context=vm.createContext({createSnapshot, buildSummary, summaryFromSnapshot, createRecordStore, transformerProtection, evaluateTransformerProtection, migrateProtectionState,transformerBreakerOptions, transformerOcpdRatings, secondaryRuleConditions, attachAmbientHelper(){},calc,systemOptions,voltageOptions,structuredClone,console,localStorage:{getItem:()=>JSON.stringify(saved),setItem:(k,v)=>persisted=JSON.parse(v)},window:{addEventListener(){},print(){}},document:{querySelector:k=>nodes[k],querySelectorAll:()=>[]}});
 vm.runInContext(source+';globalThis.ui={states,calculator,modules,defaults};',context);
 const u=context.ui;u.calculator('conductor');
 return {u,nodes,get persisted(){return persisted},change(name,value){listeners.change({type:'change',target:{name,value:String(value),tagName:'SELECT',dataset:{},matches:()=>true}})},reset(){nodes['#reset'].onclick()}};
}
let h=harness();assert.equal(h.u.states.conductor.terminal,60);assert.ok(!h.nodes['#main'].innerHTML.includes('name="terminal90Confirmed"'));assert.ok(h.nodes['#main'].innerHTML.includes('30°C (86°F)'));assert.ok(h.nodes['#main'].innerHTML.includes('value="90"'));
h.change('terminal',90);assert.ok(h.nodes['#main'].innerHTML.includes('name="terminal90Confirmed"'));assert.ok(h.nodes['#results'].innerHTML.includes('role="alert"'));assert.ok(!h.nodes['#results'].innerHTML.includes('result-hero'));
h.change('terminal90Confirmed',true);assert.ok(h.nodes['#results'].innerHTML.includes('result-hero'));assert.ok(h.nodes['#results'].innerHTML.includes('90°C equipment rating condition'));
h.change('terminal',75);assert.equal(h.u.states.conductor.terminal90Confirmed,false);assert.ok(!h.nodes['#main'].innerHTML.includes('name="terminal90Confirmed"'));assert.ok(h.nodes['#results'].innerHTML.includes('result-hero'));
h.change('terminal',90);assert.ok(h.nodes['#results'].innerHTML.includes('role="alert"'));h.change('terminal90Confirmed',true);h.change('material','aluminum');assert.equal(h.u.states.conductor.terminal90Confirmed,false);assert.ok(h.nodes['#results'].innerHTML.includes('role="alert"'));
h.change('terminal90Confirmed',true);h=harness(h.persisted);assert.ok(h.nodes['#results'].innerHTML.includes('result-hero'));assert.equal(Number(h.u.states.conductor.terminal),90);
h.reset();assert.equal(h.u.states.conductor.terminal,60);assert.equal(h.u.states.conductor.terminal90Confirmed,false);assert.ok(!h.nodes['#main'].innerHTML.includes('name="terminal90Confirmed"'));
for(const terminal of [60,75]){const saved=harness({conductor:{terminal}});assert.equal(saved.u.states.conductor.terminal,terminal);assert.equal(saved.u.states.conductor.terminal90Confirmed,false);assert.ok(saved.nodes['#results'].innerHTML.includes('result-hero'));}
h=harness({conductor:{terminal:90}});assert.ok(h.nodes['#results'].innerHTML.includes('role="alert"'));assert.equal(h.u.states.conductor.terminal90Confirmed,false);
console.log(`${checks} termination numerical checks and all confirmation UI flows passed`);
