import { createSnapshot, buildSummary, summaryFromSnapshot, createRecordStore } from './dist/calculation-records.js';
import { transformerProtection, evaluateTransformerProtection, migrateProtectionState,transformerBreakerOptions, transformerOcpdRatings, secondaryRuleConditions } from './dist/transformer-protection.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as calc from './dist/calc.js';
import {systemOptions,voltageOptions} from './dist/voltage.js';
let checks=0;
const base={load:200,terminal:75,terminal90Confirmed:false,ambient:30,parallelSets:1,configuration:'three-phase-3-wire',material:'copper',ocpd:0};
function run(p={}){const output=calc.service({...base,...p});assert.equal(output.error,undefined,output.error);checks++;return {output,values:Object.fromEntries(output.results.map(r=>[r.label,r.value]))};}
function size(p){return run(p).output.results[0].value;}
assert.equal(size(),'3/0 AWG');
assert.equal(size({material:'aluminum'}),'250 kcmil');
assert.equal(size({configuration:'three-phase-4-wire'}),'4/0 AWG');
assert.equal(size({material:'aluminum',configuration:'three-phase-4-wire'}),'300 kcmil');
assert.equal(size({load:70,terminal:90,terminal90Confirmed:true}),'6 AWG');
assert.equal(size({load:70,terminal:90,terminal90Confirmed:true,material:'aluminum'}),'4 AWG');
assert.equal(run({load:12}).values['Total service OCPD'],60);
assert.equal(size({load:200,parallelSets:2}),'1/0 AWG');
assert.equal(run({load:200,ocpd:225}).values['Total service OCPD'],225);
assert.equal(size({load:200,terminal:60}),'250 kcmil');
for(const terminal of [60,75,90])for(const material of ['copper','aluminum'])for(const ambient of [-10,10,30,40,60,80])for(const configuration of Object.keys(calc.circuitConfigurations))for(const parallelSets of [1,2,10,20]){
 const {output,values}=run({load:60,terminal,material,ambient,configuration,parallelSets,terminal90Confirmed:true});
 const w=calc.conductors.find(w=>output.results[0].value===`${w.size} ${Number(w.size)>=250?'kcmil':'AWG'}`);
 const prefix=material==='copper'?'cu':'al',factor=ambient<=10?1.15:ambient===30?1:ambient===40?.91:ambient===60?.71:.41,ccc=calc.circuitConfigurations[configuration].ccc,adjust=ccc===4?.8:1;
 const capacity=Math.min(w[`${prefix}${terminal}`],w[`${prefix}90`]*factor*adjust);
 assert.ok(Math.abs(values['Usable phase ampacity per set']-capacity)<.00051);
 assert.ok(Math.abs(values['Combined phase ampacity']-parallelSets*capacity)<.00051);
 assert.ok(capacity*parallelSets>=values['Total service OCPD']);
 assert.equal(values['CCC per raceway'],ccc);
 assert.equal(values['Grounding / bonding / conduit'],'Not calculated');
 assert.equal(values['Neutral design'],'Separate review required');
 assert.ok(output.results.every(r=>!/(?:EGC|EMT|bonding jumper|electrode conductor|neutral size)/i.test(r.label)));
 if(parallelSets>1)assert.ok(w.cm>=105600);
}
for(const p of [{load:''},{load:0},{load:NaN},{load:Infinity},{load:4001},{ocpd:50},{ocpd:175.5},{ocpd:5000},{ocpd:150},{terminal:100},{terminal:90},{terminal:90,terminal90Confirmed:'yes'},{ambient:81},{ambient:-11},{parallelSets:0},{parallelSets:1.5},{parallelSets:21},{configuration:''},{material:'steel'},{scope:'dwelling'},{continuous:1},{ccc:3},{physicalCount:4}]){assert.ok(calc.service({...base,...p}).error,JSON.stringify(p));checks++;}
assert.ok(calc.service({...base,load:4000}).error);
assert.equal(run({load:4000,parallelSets:20}).values['Total service OCPD'],4000);
assert.ok(run().output.warnings.some(s=>s.includes('No 310.12')&&s.includes('83%')));
assert.ok(run().output.warnings.some(s=>s.includes('250.24(C)/(D)/(E)')));
assert.ok(run().output.steps.some(s=>s.includes('No next-size-up')));
assert.ok(run().output.steps.some(s=>s.includes('No extra 125%')));
// Integration exercises actual navigation, render and change handlers with a minimal DOM.
const source=fs.readFileSync(new URL('./dist/app.js',import.meta.url),'utf8').replace(/^import[^\n]+\n/gm,'').replace(/route\(\);\s*$/,'');
function harness(saved={}){
 const listeners={},nodes={};let persisted,helperCalls=0;
 for(const key of ['#copy-summary','#export-pdf','#save-calculation','#action-status','#storage-status','#main','#navigation','#breadcrumb-title','#calculator-form','#reset','#print','#results','#sources'])nodes[key]={innerHTML:'',addEventListener:(type,fn)=>listeners[type]=fn,querySelector:()=>null};
 const context=vm.createContext({createSnapshot, buildSummary, summaryFromSnapshot, createRecordStore, transformerProtection, evaluateTransformerProtection, migrateProtectionState,transformerBreakerOptions, transformerOcpdRatings, secondaryRuleConditions, attachAmbientHelper(){helperCalls++},calc,systemOptions,voltageOptions,structuredClone,console,localStorage:{getItem:()=>JSON.stringify(saved),setItem:(k,v)=>persisted=JSON.parse(v)},window:{addEventListener(){},print(){}},document:{querySelector:k=>nodes[k],querySelectorAll:()=>[]}});
 vm.runInContext(source+';globalThis.ui={states,calculator,modules,defaults,overview};',context);
 const u=context.ui;u.calculator('service');
 return {u,nodes,get helperCalls(){return helperCalls},get persisted(){return persisted},change(name,value,tagName='SELECT',detail){listeners.change({detail,type:'change',target:{name,value:String(value),tagName,dataset:{},matches:()=>true}})},reset(){nodes['#reset'].onclick()}};
}
let h=harness();assert.equal(h.u.modules.length,9);assert.equal(h.helperCalls,1);assert.equal((h.nodes['#navigation'].innerHTML.match(/class="nav-item /g)||[]).length,11);assert.match(h.nodes['#results'].innerHTML,/single main disconnect/);assert.match(h.nodes['#results'].innerHTML,/result-hero/);assert.doesNotMatch(h.nodes['#results'].innerHTML,/Base-minimum Cu EGC/);
h.change('terminal',90);assert.match(h.nodes['#results'].innerHTML,/role="alert"/);h.change('terminal90Confirmed',true);assert.match(h.nodes['#results'].innerHTML,/result-hero/);h.change('material','aluminum');assert.equal(h.u.states.service.terminal90Confirmed,false);assert.match(h.nodes['#results'].innerHTML,/role="alert"/);h.change('terminal90Confirmed',true);
h.change('parallelSets',2,'INPUT');h.change('ambient',73,'INPUT',{ambientBasis:'Rooftop: 40°C + 33°C rooftop adder; effective ambient 73°C.'});assert.match(h.nodes['#results'].innerHTML,/Ambient design basis: Rooftop/);h.change('terminal',75);assert.match(h.nodes['#main'].innerHTML,/id="ambient-basis"[^>]*>Rooftop/);h.change('ambient',40,'INPUT');assert.equal(h.u.states.service.ambientBasis,'');assert.equal(h.u.states.service.ambient,40);assert.match(h.nodes['#results'].innerHTML,/result-hero/);assert.equal(h.u.states.conductor.ambient,30);
h.change('ocpd',50);assert.match(h.nodes['#results'].innerHTML,/at least 60 A/);h.change('ocpd',0);h.change('load','','INPUT');assert.match(h.nodes['#results'].innerHTML,/role="alert"/);h.change('load',200,'INPUT');h=harness(h.persisted);assert.equal(h.u.states.service.ambient,40);assert.match(h.nodes['#results'].innerHTML,/result-hero/);
h.reset();assert.equal(h.u.states.service.ambient,30);assert.equal(h.u.states.service.terminal,60);assert.equal(h.u.states.service.terminal90Confirmed,false);assert.match(h.nodes['#results'].innerHTML,/result-hero/);
h.u.calculator('conductor');assert.match(h.nodes['#results'].innerHTML,/Base-minimum Cu EGC/);h.u.calculator('service');assert.doesNotMatch(h.nodes['#results'].innerHTML,/Base-minimum Cu EGC/);h.u.overview();assert.equal((h.nodes['#main'].innerHTML.match(/class="module-card"/g)||[]).length,9);assert.match(h.nodes['#main'].innerHTML,/href="#service"/);
console.log(`${checks} service numerical checks and all service UI flows passed`);
