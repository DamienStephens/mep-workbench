// Modeled DOM workflow integration; real browser clipboard/download permission remains separate.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createPDF} from './dist/pdf-report.js';
import * as calc from './dist/calc.js';
import {systemOptions,voltageOptions} from './dist/voltage.js';
import {createSnapshot,buildSummary,summaryFromSnapshot,createRecordStore,projectKey,projectNames} from './dist/calculation-records.js';
import {transformerProtection,evaluateTransformerProtection,migrateProtectionState,transformerBreakerOptions,transformerOcpdRatings,secondaryRuleConditions} from './dist/transformer-protection.js';
const source=fs.readFileSync(new URL('./dist/app.js',import.meta.url),'utf8').replace(/^import[^\n]+\n/gm,'').replace(/route\(\);\s*$/,'');
function harness(){
 const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
 const listeners={},nodes={},prompts=[],pdfs=[],copied=[],dialogs=[];let buttons=[],clearButtons=[];
 for(const key of ['#main','#navigation','#calculator-form','#results','#sources','#reset','#print','#copy-summary','#export-pdf','#save-calculation','#action-status','#storage-status','#clear-all-calculations','#saved-heading'])nodes[key]={innerHTML:'',textContent:'',focus(){},addEventListener:(k,v)=>listeners[k]=v,querySelector:()=>null};
 const context=vm.createContext({projectKey,projectNames,showRecordDialog:options=>{dialogs.push(options);if(prompts.length){try{options.onSave({projectName:prompts.shift(),calculationName:prompts.shift()})}catch(error){nodes['#action-status'].textContent=error.message}}},confirmRecordClear:options=>dialogs.push(options),closeRecordDialog(){},calc,systemOptions,voltageOptions,createSnapshot,buildSummary,summaryFromSnapshot,createRecordStore:()=>createRecordStore(storage),transformerProtection,evaluateTransformerProtection,migrateProtectionState,transformerBreakerOptions,transformerOcpdRatings,secondaryRuleConditions,downloadPDF:s=>pdfs.push(s),structuredClone,console,localStorage:storage,location:{hash:''},navigator:{clipboard:{writeText:async t=>copied.push(t)}},attachAmbientHelper(){},window:{addEventListener(){},scrollTo(){},print(){},prompt:()=>prompts.shift()},document:{querySelector:k=>nodes[k],querySelectorAll:s=>{if(s==='[data-clear-project]'){clearButtons=[...nodes['#main'].innerHTML.matchAll(/data-clear-project="([^"]+)"/g)].map(m=>({dataset:{clearProject:m[1]}}));return clearButtons}if(s!=='[data-record-action]')return [];buttons=[...nodes['#main'].innerHTML.matchAll(/data-record-action="([^"]+)" data-record-id="([^"]+)"/g)].map(m=>({dataset:{recordAction:m[1],recordId:m[2]}}));return buttons}}});
 vm.runInContext(source+';globalThis.ui={calculator,states,modules,savedLibrary,calculate};',context);
 return {context,ui:context.ui,nodes,prompts,pdfs,copied,dialogs,storage,store:createRecordStore(storage),get clearButtons(){return clearButtons},get buttons(){return buttons},change(name,value,tagName='SELECT'){listeners.change({type:'change',target:{name,value:String(value),tagName,dataset:{},matches:()=>true}})}};
}
// Table coefficients independently transcribed from NEC 2017 Table 9 (Ω/1000 ft).
const table={
 '14':[.058,.073,3.1,3.1,null,null],'12':[.054,.068,2,2,3.2,3.2],
 '10':[.05,.063,1.2,1.2,2,2],'8':[.052,.065,.78,.78,1.3,1.3],
 '6':[.051,.064,.49,.49,.81,.81],'4':[.048,.06,.31,.31,.51,.51],
 '3':[.047,.059,.25,.25,.4,.4],'2':[.045,.057,.19,.2,.32,.32],
 '1':[.046,.057,.15,.16,.25,.25],'1/0':[.044,.055,.12,.12,.2,.2],
 '2/0':[.043,.054,.1,.1,.16,.16],'3/0':[.042,.052,.077,.079,.13,.13],
 '4/0':[.041,.051,.062,.063,.1,.1],'250':[.041,.052,.052,.054,.085,.086],
 '300':[.041,.051,.044,.045,.071,.072],'350':[.04,.05,.038,.039,.061,.063],
 '400':[.04,.049,.033,.035,.054,.055],'500':[.039,.048,.027,.029,.043,.045],
 '600':[.039,.048,.023,.025,.036,.038],'750':[.038,.048,.019,.021,.029,.031]
};
assert.deepEqual(calc.dropImpedance,table);
const base={size:'12',material:'copper',raceway:'pvc',pf:1,phase:1,voltage:120,current:20,length:100};
const value=(out,label)=>out.results.find(r=>r.label===label)?.value;
let cases=0;
for(const [size,t] of Object.entries(table))for(const material of ['copper','aluminum'])for(const raceway of ['pvc','steel'])for(const phase of [1,3])for(const pf of [1,.8,.5,.001]){
 const steel=raceway==='steel',R=t[(material==='aluminum'?4:2)+(steel?1:0)],X=t[steel?1:0];
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
for(const [pct,status] of [[0,'green'],[2.999999,'green'],[3,'green'],[3.000001,'orange'],[4.999999,'orange'],[5,'red'],[5.000001,'red']]){
 assert.equal(calc.dropStatus(pct),status);
 // R=2, I=20, V=120 => length=15*pct. Classification is deliberately unrounded.
 const out=calc.drop({...base,length:15*pct});assert.equal(out.results[0].status,status);
 if(pct===3.000001)assert.equal(out.results[0].value,3);
 if(pct===4.999999)assert.equal(out.results[0].value,5);
}
for(const bad of [0,-1,1.001,'',null,undefined,NaN,Infinity,'abc',true])assert.ok(calc.drop({...base,pf:bad}).error);
for(const patch of [{length:-1},{current:-1},{length:Infinity},{current:NaN},{voltage:0},{phase:2},{raceway:'aluminum'},{size:'700'},{size:'14',material:'aluminum'},{length:1e308},{length:2000}])assert.ok(calc.drop({...base,...patch}).error);
for(const patch of [{length:0},{current:0}]){const out=calc.drop({...base,...patch});assert.equal(out.results[0].status,'green');assert.equal(value(out,'Estimated voltage drop'),0);}
assert.ok(!calc.drop({...base,voltage:600}).error);
for(const voltage of [690,1000])assert.match(calc.drop({...base,phase:3,voltage,voltageMode:'custom',voltageConfirmed:true}).error,/up to 600 V only/);
assert.ok(!calc.amps({mode:'wattsToAmps',value:1000,pf:1,phase:3,voltage:690}).error);
const legacy={...base,target:0};delete legacy.pf;delete legacy.raceway;
const oldJSON=JSON.stringify(legacy),migrated=calc.migrateDropState(legacy);
assert.equal(JSON.stringify(legacy),oldJSON);assert.equal(migrated.pf,1);assert.equal(migrated.raceway,'steel');assert.ok(!('target' in migrated));assert.ok(!calc.drop(migrated).error);
const h=harness();h.ui.calculator('drop');
assert.match(h.nodes['#main'].innerHTML,/Starting Voltage/);assert.doesNotMatch(h.nodes['#main'].innerHTML,/across load|Design target|name="target"/);
assert.match(h.nodes['#main'].innerHTML,/Power factor \(lagging\)/);
assert.match(h.nodes['#main'].innerHTML,/Steel \/ EMT/);
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
h.change('pf',.8,'INPUT');h.change('raceway','pvc');
await h.nodes['#copy-summary'].onclick();const summary=h.copied.at(-1);
assert.match(summary,/Power factor \(lagging\).*0.8/);assert.match(summary,/Starting Voltage/);assert.match(summary,/C405.10/);assert.match(summary,/2017 Chapter 9 Table 9/);assert.doesNotMatch(summary,/Design target|Target check|Minimum size for drop only/);
h.nodes['#export-pdf'].onclick();const snapshot=h.pdfs.at(-1),pdf=new TextDecoder().decode(createPDF(snapshot));
assert.equal(snapshot.appVersion,'2.6.0');assert.match(pdf,/Percentage voltage drop/);assert.match(pdf,/Starting Voltage/);assert.match(pdf,/not proof of a code violation/);
// Real saved-library load migrates only the new working state. Saved PDF stays original.
const historical=createSnapshot({id:'drop',title:'Voltage drop',fields:[]},legacy,{results:[{label:'Estimated voltage drop',value:7.9,unit:'V'},{label:'Target check',value:'Above target'}],steps:['Legacy K method'],warnings:[],sources:[]},{appVersion:'2.5.0',projectName:'Legacy',calculationName:'Old drop'});
const oldPDF=createPDF(historical),record=h.store.save(historical,{projectName:'Legacy',calculationName:'Old drop'}),frozen=JSON.stringify(h.store.load(record.id).snapshot);
h.ui.savedLibrary();h.buttons.find(b=>b.dataset.recordAction==='load').onclick();
assert.equal(h.ui.states.drop.pf,1);assert.equal(h.ui.states.drop.raceway,'steel');assert.ok(!('target' in h.ui.states.drop));
assert.match(h.nodes['#results'].innerHTML,/Percentage voltage drop/);
assert.equal(JSON.stringify(h.store.load(record.id).snapshot),frozen);
assert.deepEqual(createPDF(historical),oldPDF);
h.ui.savedLibrary();h.buttons.find(b=>b.dataset.recordAction==='pdf').onclick();assert.equal(h.pdfs.at(-1).appVersion,'2.5.0');assert.ok(h.pdfs.at(-1).result.results.some(r=>r.label==='Target check'));
// WCAG AA text contrast for semantic colors on each flat result surface.
const lum=hex=>hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((a,x,i)=>a+x*[.2126,.7152,.0722][i],0);
const css=fs.readFileSync(new URL('./dist/styles.css',import.meta.url),'utf8');
for(const [bg,colors] of [['#ffffff',['#166534','#9a3412','#b91c1c']],['#161616',['#86efac','#fdba74','#fca5a5']]])for(const fg of colors){assert.ok(css.includes(fg));const a=lum(bg),b=lum(fg);assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5);}
console.log(`Voltage drop PF: ${cases} sourced coefficient/formula cases, exact unrounded 3/5 thresholds, invalid input, UI order/scope, AA colors, migration, summary/PDF and immutable historical snapshots passed.`);
