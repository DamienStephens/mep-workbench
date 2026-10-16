// Modeled DOM workflow integration; real browser clipboard/download permission remains separate.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createPDF} from './dist/pdf-report.js';
import * as calc from './dist/calc.js';
import {systemOptions,voltageOptions} from './dist/voltage.js';
import {createSnapshot,buildSummary,summaryFromSnapshot,copySummaryFromSnapshot,createRecordStore,projectKey,projectNames} from './dist/calculation-records.js';
import {transformerProtection,evaluateTransformerProtection,migrateProtectionState,transformerBreakerOptions,transformerOcpdRatings,secondaryRuleConditions} from './dist/transformer-protection.js';
const source=fs.readFileSync(new URL('./dist/app.js',import.meta.url),'utf8').replace(/^import[^\n]+\n/gm,'').replace(/route\(\);\s*$/,'');
function harness(){
 const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
 const listeners={},nodes={},prompts=[],pdfs=[],copied=[],dialogs=[];let buttons=[],clearButtons=[];
 for(const key of ['#main','#navigation','#calculator-form','#results','#sources','#reset','#print','#copy-summary','#export-pdf','#save-calculation','#action-status','#storage-status','#clear-all-calculations','#saved-heading'])nodes[key]={innerHTML:'',textContent:'',focus(){},addEventListener:(k,v)=>listeners[k]=v,querySelector:()=>null};
 const context=vm.createContext({projectKey,projectNames,showRecordDialog:options=>{dialogs.push(options);if(prompts.length){try{options.onSave({projectName:prompts.shift(),calculationName:prompts.shift()})}catch(error){nodes['#action-status'].textContent=error.message}}},confirmRecordClear:options=>dialogs.push(options),closeRecordDialog(){},calc,systemOptions,voltageOptions,createSnapshot,buildSummary,summaryFromSnapshot,copySummaryFromSnapshot,createRecordStore:()=>createRecordStore(storage),transformerProtection,evaluateTransformerProtection,migrateProtectionState,transformerBreakerOptions,transformerOcpdRatings,secondaryRuleConditions,downloadPDF:s=>pdfs.push(s),structuredClone,console,localStorage:storage,location:{hash:''},navigator:{clipboard:{writeText:async t=>copied.push(t)}},attachAmbientHelper(){},window:{addEventListener(){},scrollTo(){},print(){},prompt:()=>prompts.shift()},document:{querySelector:k=>nodes[k],querySelectorAll:s=>{if(s==='[data-clear-project]'){clearButtons=[...nodes['#main'].innerHTML.matchAll(/data-clear-project="([^"]+)"/g)].map(m=>({dataset:{clearProject:m[1]}}));return clearButtons}if(s!=='[data-record-action]')return [];buttons=[...nodes['#main'].innerHTML.matchAll(/data-record-action="([^"]+)" data-record-id="([^"]+)"/g)].map(m=>({dataset:{recordAction:m[1],recordId:m[2]}}));return buttons}}});
 vm.runInContext(source+';globalThis.ui={calculator,states,modules,savedLibrary,calculate};',context);
 return {context,ui:context.ui,nodes,prompts,pdfs,copied,dialogs,storage,store:createRecordStore(storage),get clearButtons(){return clearButtons},get buttons(){return buttons},change(name,value,tagName='SELECT'){listeners.change({type:'change',target:{name,value:String(value),tagName,dataset:{},matches:()=>true}})}};
}
// Table coefficients independently transcribed from NEC 2017 Table 9 (Ω/1000 ft).
const table={
 '14':[.058,.073,3.1,3.1,null,null,3.1,null],'12':[.054,.068,2,2,3.2,3.2,2,3.2],
 '10':[.05,.063,1.2,1.2,2,2,1.2,2],'8':[.052,.065,.78,.78,1.3,1.3,0.78,1.3],
 '6':[.051,.064,.49,.49,.81,.81,0.49,0.81],'4':[.048,.06,.31,.31,.51,.51,0.31,0.51],
 '3':[.047,.059,.25,.25,.4,.4,0.25,0.41],'2':[.045,.057,.19,.2,.32,.32,0.2,0.32],
 '1':[.046,.057,.15,.16,.25,.25,0.16,0.26],'1/0':[.044,.055,.12,.12,.2,.2,0.13,0.21],
 '2/0':[.043,.054,.1,.1,.16,.16,0.1,0.16],'3/0':[.042,.052,.077,.079,.13,.13,0.082,0.13],
 '4/0':[.041,.051,.062,.063,.1,.1,0.067,0.11],'250':[.041,.052,.052,.054,.085,.086,0.057,0.09],
 '300':[.041,.051,.044,.045,.071,.072,0.049,0.076],'350':[.04,.05,.038,.039,.061,.063,0.043,0.066],
 '400':[.04,.049,.033,.035,.054,.055,0.038,0.059],'500':[.039,.048,.027,.029,.043,.045,0.032,0.048],
 '600':[.039,.048,.023,.025,.036,.038,0.028,0.041],'750':[.038,.048,.019,.021,.029,.031,0.024,0.034]
};
assert.deepEqual(calc.dropImpedance,table);
const base={size:'12',material:'copper',raceway:'pvc',pf:1,phase:1,voltage:120,current:20,length:100};
const value=(out,label)=>out.results.find(r=>r.label===label)?.value;
let cases=0;
for(const [size,t] of Object.entries(table))for(const material of ['copper','aluminum'])for(const raceway of ['pvc','steel','aluminum'])for(const phase of [1,3])for(const pf of [1,.8,.5,.001]){
 const steel=raceway==='steel',R=t[raceway==='aluminum'?(material==='aluminum'?7:6):(material==='aluminum'?4:2)+(steel?1:0)],X=t[steel?1:0];
 const p={...base,size,material,raceway,phase,pf,voltage:480},out=calc.drop(p);
 if(R===null){assert.match(out.error,/No supported impedance/);continue}
 assert.equal(out.error,undefined);const exact=(phase===3?Math.sqrt(3):2)*20*.1*(R*pf+X*Math.sqrt(1-pf*pf));
 assert.equal(value(out,'Estimated voltage drop'),Number(exact.toFixed(3)));
 assert.ok(Math.abs(value(out,'Percentage voltage drop')-exact/480*100)<=.000501);
 assert.equal(value(out,'Estimated voltage at end of run'),Number((480-exact).toFixed(3)));
 assert.doesNotMatch(JSON.stringify(out),/NaN|Infinity/);cases++;
}
assert.equal(value(calc.drop(base),'Estimated voltage drop'),8);
assert.equal(value(calc.drop({...base,pf:.8}),'Estimated voltage drop'),6.53); // 6.5296 V, not divided by PF
assert.deepEqual(calc.drop(base),calc.drop({...base,parallelSets:1}));
// The same complete circuit in each separate matching raceway retains its R/X.
// Parallel sets divide TOTAL actual current once, never PF or impedance again.
let parallelCases=0;
for(const [size,t] of Object.entries(table).filter(([size])=>calc.conductors.find(w=>w.size===size).cm>=105600))for(const material of ['copper','aluminum'])for(const raceway of ['pvc','steel','aluminum'])for(const phase of [1,3])for(const pf of [1,.8,.5,.001]){
 const steel=raceway==='steel',R=t[raceway==='aluminum'?(material==='aluminum'?7:6):(material==='aluminum'?4:2)+(steel?1:0)],X=t[steel?1:0];
 const p={...base,size,material,raceway,phase,pf,voltage:480,current:301,length:137};
 const singleExact=(phase===3?Math.sqrt(3):2)*p.current*p.length/1000*(R*pf+X*Math.sqrt(1-pf*pf));
 for(const parallelSets of [1,2,3]){
  const out=calc.drop({...p,parallelSets}),exact=singleExact/parallelSets;
  assert.equal(out.error,undefined);
  assert.equal(value(out,'Estimated voltage drop'),Number(exact.toFixed(3)));
  assert.equal(value(out,'Percentage voltage drop'),Number((100*exact/p.voltage).toFixed(3)));
  assert.equal(value(out,'Estimated voltage at end of run'),Number((p.voltage-exact).toFixed(3)));
  assert.equal(value(out,'Parallel sets'),parallelSets);
  assert.equal(value(out,'Total actual load current'),p.current);
  assert.equal(value(out,'Current per set'),p.current/parallelSets);
  assert.equal(out.results.find(r=>r.label==='Total actual load current').displayValue,'301.0');
  assert.equal(out.results.find(r=>r.label==='Current per set').displayValue,(p.current/parallelSets).toFixed(1));
  assert.ok(!out.results.some(r=>/ampacity|OCPD|pass/i.test(r.label)));
  assert.match(out.warnings.join(' '),/Voltage drop does not verify ampacity/);
  if(parallelSets>1){assert.match(out.warnings.join(' '),/one complete circuit set in each separate matching raceway/);assert.match(out.warnings.join(' '),/identical resistance\/reactance/);}
  parallelCases++;
 }
}
for(const parallelSets of [0,-1,1.5,20.1,21,'',null,undefined,NaN,Infinity,'abc',true,[],{}]){
 const out=calc.drop({...base,size:'1/0',parallelSets});assert.match(out.error,/1–20 identical parallel sets/);assert.deepEqual(out.results,[]);
}
assert.ok(!calc.drop({...base,size:'1/0',parallelSets:20}).error);
assert.ok(!calc.drop({...base,size:'1/0',parallelSets:'3'}).error);
for(const size of ['14','12','10','8','6','4','3','2','1'])for(const parallelSets of [2,3,20])assert.match(calc.drop({...base,size,parallelSets}).error,/1\/0 AWG or larger.*exceptions are not supported/);
for(const patch of [{size:'700'},{size:'740'}])assert.ok(calc.drop({...base,...patch,parallelSets:2}).error);
for(const patch of [{length:0},{current:0}])assert.equal(value(calc.drop({...base,size:'1/0',parallelSets:3,...patch}),'Estimated voltage drop'),0);
// Integrated sizing remains an independent K-method path with just one divide.
for(const id of ['conductor','service'])for(const parallelSets of [1,2,3]){
 const p={ocpd:400,load:400,material:'copper',terminal:75,ambient:30,configuration:'three-phase-3-wire',parallelSets,voltageDropEnabled:true,current:301,length:137,voltage:480,phase:3,target:3};
 const out=calc[id](p);assert.equal(out.error,undefined);
 const label=id==='service'?'Copper service phase conductor per set':'Copper conductor per set';
 const size=String(value(out,label)).split(' ')[0],cm=calc.conductors.find(w=>w.size===size).cm;
 assert.equal(value(out,'Estimated voltage drop'),Number((Math.sqrt(3)*12.9*p.length*(p.current/parallelSets)/cm).toFixed(3)));
}
for(const [pct,status] of [[0,'green'],[2.999999,'green'],[3,'green'],[3.000001,'orange'],[4.999999,'orange'],[5,'red'],[5.000001,'red']]){
 assert.equal(calc.dropStatus(pct),status);
 // R=2, I=20, V=120 => length=15*pct. Classification is deliberately unrounded.
 const out=calc.drop({...base,length:15*pct});assert.equal(out.results[0].status,status);
 if(pct===3.000001)assert.equal(out.results[0].value,3);
 if(pct===4.999999)assert.equal(out.results[0].value,5);
}
for(const bad of [0,-1,1.001,'',null,undefined,NaN,Infinity,'abc',true])assert.ok(calc.drop({...base,pf:bad}).error);
for(const patch of [{length:-1},{current:-1},{length:Infinity},{current:NaN},{voltage:0},{phase:2},{raceway:'unknown'},{size:'700'},{size:'14',material:'aluminum'},{length:1e308},{length:2000}])assert.ok(calc.drop({...base,...patch}).error);
for(const patch of [{length:0},{current:0}]){const out=calc.drop({...base,...patch});assert.equal(out.results[0].status,'green');assert.equal(value(out,'Estimated voltage drop'),0);}
assert.ok(!calc.drop({...base,voltage:600}).error);
for(const voltage of [690,1000])assert.match(calc.drop({...base,phase:3,voltage,voltageMode:'custom',voltageConfirmed:true}).error,/up to 600 V only/);
assert.ok(!calc.amps({mode:'wattsToAmps',value:1000,pf:1,phase:3,voltage:690}).error);
const legacy={...base,target:0};delete legacy.pf;delete legacy.raceway;
const oldJSON=JSON.stringify(legacy),migrated=calc.migrateDropState(legacy);
assert.equal(JSON.stringify(legacy),oldJSON);assert.equal(migrated.pf,1);assert.equal(migrated.raceway,'steel');assert.equal(migrated.parallelSets,1);assert.ok(!('target' in migrated));assert.ok(!calc.drop(migrated).error);
assert.equal(calc.migrateDropState({...base,parallelSets:3}).parallelSets,3);
for(const parallelSets of [0,1.5,21,'',null])assert.equal(calc.migrateDropState({...base,parallelSets}).parallelSets,parallelSets);
const h=harness();h.ui.calculator('drop');
assert.match(h.nodes['#main'].innerHTML,/Starting Voltage/);assert.doesNotMatch(h.nodes['#main'].innerHTML,/Design target|name="target"/);
assert.equal(h.ui.modules.find(m=>m.id==='drop').fields.find(f=>f.key==='pf').label,'Power factor');
assert.match(h.nodes['#main'].innerHTML,/Input guidance/);
assert.match(h.nodes['#main'].innerHTML,/Lagging displacement power factor, greater than 0 and at most 1/);
assert.match(h.nodes['#main'].innerHTML,/leading PF and harmonic distortion are outside this estimate/);
assert.match(h.nodes['#main'].innerHTML,/Power factor (?:is not used to|does not) inflate this current/);
const parallelField=h.ui.modules.find(m=>m.id==='drop').fields.find(f=>f.key==='parallelSets');
assert.ok(parallelField);assert.equal(parallelField.min,1);assert.equal(parallelField.max,20);assert.equal(parallelField.step,1);
assert.equal(h.ui.states.drop.parallelSets,1);assert.match(h.nodes['#main'].innerHTML,/Total load current/);
assert.doesNotMatch(h.nodes['#main'].innerHTML,/Power factor \(lagging\)|Steel \/ EMT/);
assert.match(h.nodes['#main'].innerHTML,/<option value="steel"[^>]*>Steel<\/option>/);
assert.match(h.nodes['#main'].innerHTML,/<option value="aluminum"[^>]*>Aluminum<\/option>/);
assert.ok(!h.ui.modules.find(m=>m.id==='drop').fields.some(f=>f.key==='target'));
for(const id of ['conductor','service'])assert.ok(h.ui.modules.find(m=>m.id===id).fields.some(f=>f.key==='target'));
for(const [length,color,text] of [[50,'green','At or below 3%'],[100,'orange','Above 3% and below 5%'],[150,'red','At or above 5%']]){
 h.change('length',length,'INPUT');const out=h.nodes['#results'].innerHTML,visible=out.split('<details')[0];
 assert.match(out,new RegExp(`result-hero drop-${color}`));assert.ok(visible.includes(text));
 assert.ok(visible.indexOf('Percentage voltage drop')<visible.indexOf('Estimated voltage drop'));
 assert.ok(visible.indexOf('Estimated voltage drop')<visible.indexOf('Estimated voltage at end of run'));
 assert.match(visible,/One segment only/);assert.match(visible,/C405.10/);assert.doesNotMatch(visible,/code compliant|passes code/i);
 assert.doesNotMatch(visible,/AC estimate assumes|NEC general-circuit|Table 9 models/);
}
// Aluminum raceway must select its distinct resistance for each conductor material.
h.change('pf',.8,'INPUT');h.change('size','1/0');h.change('raceway','aluminum');
assert.equal(h.ui.states.drop.raceway,'aluminum');
assert.match(h.nodes['#results'].innerHTML,/R = 0.13 and X = 0.044/);
assert.match(h.nodes['#results'].innerHTML,/Aluminum raceway/);
assert.match(h.nodes['#results'].innerHTML,/lagging PF = 0.8/);
h.change('material','aluminum');
assert.match(h.nodes['#results'].innerHTML,/R = 0.21 and X = 0.044/);
h.change('raceway','steel');
assert.match(h.nodes['#results'].innerHTML,/R = 0.2 and X = 0.055/);
assert.match(h.nodes['#results'].innerHTML,/Steel raceway/);
assert.doesNotMatch(h.nodes['#results'].innerHTML,/including EMT|Steel \/ EMT/);
h.change('raceway','aluminum');
await h.nodes['#copy-summary'].onclick();const summary=h.copied.at(-1);
assert.match(summary,/Power factor.*0.8/);assert.match(summary,/Raceway: Aluminum/);assert.doesNotMatch(summary,/Power factor \(lagging\)|Steel \/ EMT/);assert.match(summary,/Starting Voltage/);assert.doesNotMatch(summary,/C405.10|2023 Chapter 9 Table 9|METHOD|SOURCES|WARNINGS/);assert.doesNotMatch(summary,/Design target|Target check|Minimum size for drop only/);
h.nodes['#export-pdf'].onclick();const snapshot=h.pdfs.at(-1),pdf=new TextDecoder().decode(createPDF(snapshot));
assert.equal(snapshot.appVersion,'2.14.0');assert.equal(snapshot.inputs.raceway,'aluminum');assert.match(pdf,/Aluminum/);assert.match(pdf,/Percentage voltage drop/);assert.match(pdf,/Starting Voltage/);assert.match(pdf,/not proof of a code violation/);
// New multi-set copy/PDF/save/load retains the total-current contract and precision.
h.change('current',301,'INPUT');h.change('parallelSets',3,'INPUT');
assert.equal(h.ui.states.drop.current,301);assert.equal(h.ui.states.drop.parallelSets,3);
assert.match(h.nodes['#results'].innerHTML,/Total actual load current/);assert.match(h.nodes['#results'].innerHTML,/Current per set/);
await h.nodes['#copy-summary'].onclick();const parallelSummary=h.copied.at(-1);
assert.match(parallelSummary,/Parallel sets: 3/);assert.match(parallelSummary,/Total actual load current: 301\.0 A/);assert.match(parallelSummary,/Current per set: 100\.3 A/);
h.nodes['#export-pdf'].onclick();const parallelSnapshot=h.pdfs.at(-1),parallelPDF=new TextDecoder().decode(createPDF(parallelSnapshot));
assert.equal(parallelSnapshot.inputs.parallelSets,3);assert.equal(parallelSnapshot.inputs.current,301);
assert.match(parallelPDF,/Current per set/);assert.match(parallelPDF,/100\.3 A/);assert.match(parallelPDF,/301\.0 A/);
const parallelRecord=h.store.save(parallelSnapshot,{projectName:'Parallel',calculationName:'Three complete sets'});
const frozenParallel=JSON.stringify(h.store.load(parallelRecord.id).snapshot);
h.change('parallelSets',1,'INPUT');h.ui.savedLibrary();h.buttons.find(b=>b.dataset.recordAction==='load'&&b.dataset.recordId===parallelRecord.id).onclick();
assert.equal(h.ui.states.drop.parallelSets,3);assert.equal(h.ui.states.drop.current,301);
assert.equal(JSON.stringify(h.store.load(parallelRecord.id).snapshot),frozenParallel);
assert.deepEqual(calc.drop(h.ui.states.drop),parallelSnapshot.result);
// Real saved-library load migrates only the new working state. Saved PDF stays original.
const historical=createSnapshot({id:'drop',title:'Voltage drop',fields:[]},legacy,{results:[{label:'Estimated voltage drop',value:7.9,unit:'V'},{label:'Target check',value:'Above target'}],steps:['Legacy K method'],warnings:[],sources:[]},{appVersion:'2.5.0',projectName:'Legacy',calculationName:'Old drop'});
const oldPDF=createPDF(historical),record=h.store.save(historical,{projectName:'Legacy',calculationName:'Old drop'}),frozen=JSON.stringify(h.store.load(record.id).snapshot);
h.ui.savedLibrary();h.buttons.find(b=>b.dataset.recordAction==='load'&&b.dataset.recordId===record.id).onclick();
assert.equal(h.ui.states.drop.pf,1);assert.equal(h.ui.states.drop.raceway,'steel');assert.equal(h.ui.states.drop.parallelSets,1);assert.ok(!('target' in h.ui.states.drop));
assert.match(h.nodes['#results'].innerHTML,/Percentage voltage drop/);
assert.equal(JSON.stringify(h.store.load(record.id).snapshot),frozen);
assert.deepEqual(createPDF(historical),oldPDF);
h.ui.savedLibrary();h.buttons.find(b=>b.dataset.recordAction==='pdf'&&b.dataset.recordId===record.id).onclick();assert.equal(h.pdfs.at(-1).appVersion,'2.5.0');assert.ok(h.pdfs.at(-1).result.results.some(r=>r.label==='Target check'));
// WCAG AA text contrast for semantic colors on each flat result surface.
const lum=hex=>hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((a,x,i)=>a+x*[.2126,.7152,.0722][i],0);
const css=fs.readFileSync(new URL('./dist/styles.css',import.meta.url),'utf8');
for(const [bg,colors] of [['#ffffff',['#166534','#9a3412','#b91c1c']],['#161616',['#86efac','#fdba74','#fca5a5']]])for(const fg of colors){assert.ok(css.includes(fg));const a=lum(bg),b=lum(fg);assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5);}
console.log(`Voltage drop PF: ${cases} sourced coefficient/formula cases, ${parallelCases} parallel current-sharing cases, exact unrounded 3/5 thresholds, invalid input and parallel-size guards, integrated-drop isolation, UI order/scope, AA colors, migration, summary/PDF and immutable historical snapshots passed.`);
