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
const h=harness();h.ui.calculator('conductor');
for(const id of ['copy-summary','export-pdf','save-calculation'])assert.equal(h.nodes['#'+id].disabled,false);
assert.match(h.nodes['#main'].innerHTML,/Include voltage drop/);assert.doesNotMatch(h.nodes['#main'].innerHTML,/name="current"/);
h.change('voltageDropEnabled',true);assert.match(h.nodes['#main'].innerHTML,/Actual operating current/);assert.match(h.nodes['#results'].innerHTML,/role="alert"/);
for(const id of ['copy-summary','export-pdf','save-calculation'])assert.equal(h.nodes['#'+id].disabled,true);
h.change('current',20,'INPUT');assert.match(h.nodes['#results'].innerHTML,/result-hero/);assert.equal(h.nodes['#copy-summary'].disabled,false);
await h.nodes['#copy-summary'].onclick();assert.match(h.copied[0],/2\.6\.0/);assert.match(h.copied[0],/operating current/);assert.match(h.copied[0],/Warnings|Assumptions/i);
h.context.navigator.clipboard.writeText=async()=>{throw Error('Clipboard denied')};await h.nodes['#copy-summary'].onclick();assert.match(h.nodes['#action-status'].innerHTML,/readonly/);assert.match(h.nodes['#action-status'].innerHTML,/ASSUMPTIONS/);
h.nodes['#export-pdf'].onclick();assert.equal(h.pdfs.length,1);assert.equal(h.pdfs[0].inputs.current,20);
h.prompts.push('Project Alpha','Feeder A');h.nodes['#save-calculation'].onclick();let records=h.store.list();assert.equal(records.length,1);assert.equal(records[0].calculationName,'Feeder A');
h.ui.savedLibrary();assert.match(h.nodes['#main'].innerHTML,/Stored only in this browser/);assert.match(h.nodes['#main'].innerHTML,/Feeder A/);
h.prompts.push('Project Beta','Feeder B');h.buttons.find(b=>b.dataset.recordAction==='rename').onclick();assert.equal(h.store.list()[0].calculationName,'Feeder B');
h.buttons.find(b=>b.dataset.recordAction==='pdf').onclick();assert.equal(h.pdfs.at(-1).calculationName,'Feeder B');
h.buttons.find(b=>b.dataset.recordAction==='trash').onclick();assert.equal(h.store.list().length,0);assert.match(h.nodes['#main'].innerHTML,/Trash \(1\)/);
h.buttons.find(b=>b.dataset.recordAction==='restore').onclick();assert.equal(h.store.list().length,1);
h.ui.states.conductor.ocpd=999;h.buttons.find(b=>b.dataset.recordAction==='load').onclick();assert.equal(h.ui.states.conductor.ocpd,30);assert.match(h.nodes['#results'].innerHTML,/result-hero/);
h.change('ocpd','','SELECT');assert.equal(h.nodes['#export-pdf'].disabled,true);h.nodes['#export-pdf'].onclick();assert.equal(h.pdfs.length,2,'Invalid state cannot export stale snapshot');
h.ui.calculator('protection');assert.match(h.nodes['#results'].innerHTML,/Maximum modeled permitted/);assert.equal(h.nodes['#save-calculation'].disabled,false);h.change('conductorCheckEnabled',true);assert.match(h.nodes['#results'].innerHTML,/Choose an explicit/);h.change('primaryOcpd',100);h.change('secondaryOcpd',225);h.change('designLoad',200,'INPUT');assert.match(h.nodes['#results'].innerHTML,/Confirm the installation/);assert.equal(h.nodes['#save-calculation'].disabled,true);assert.match(h.nodes['#main'].innerHTML,/continuous raceway/);
h.change('installationConfirmed',true);assert.match(h.nodes['#results'].innerHTML,/metric-grid/);assert.equal(h.nodes['#save-calculation'].disabled,false);
h.change('lengthFt',9,'INPUT');assert.equal(h.ui.states.protection.installationConfirmed,false);assert.match(h.nodes['#results'].innerHTML,/role="alert"/);
h.change('secondaryRule','25ft');assert.match(h.nodes['#main'].innerHTML,/physical damage/);h.change('installationConfirmed',true);assert.match(h.nodes['#results'].innerHTML,/metric-grid/);
h.ui.states.protection.primaryConfirmed=true;h.ui.states.protection.secondaryConfirmed=true;h.change('phase',1);assert.equal(h.ui.states.protection.primaryConfirmed,false);assert.equal(h.ui.states.protection.secondaryConfirmed,false);
h.storage.setItem=()=>{throw Error('Quota exceeded')};h.ui.calculator('power');h.change('watts',1200,'INPUT');assert.match(h.nodes['#storage-status'].textContent,/unavailable or full/);h.prompts.push('Blocked project','Blocked save');h.nodes['#save-calculation'].onclick();assert.match(h.nodes['#action-status'].textContent,/Could not save/);
console.log('Workflow UI: valid-result actions, independent operating current, copy/PDF, save/load/rename/trash/restore, confirmations and storage-failure checks passed.');

// Load an actual pre-2.1 snapshot through the saved-calculation UI. Only active
// state migrates; Saved PDF continues to use the old immutable report.
const legacyHarness=harness();legacyHarness.ui.calculator('conductor');
const module=legacyHarness.ui.modules.find(m=>m.id==='conductor');
const oldInputs={...legacyHarness.ui.states.conductor,load:21,ocpd:0};
const oldResult=calc.conductor({...oldInputs,ocpd:25});oldResult.results.push({label:'Design load',value:21,unit:'A'});
const oldSnapshot=createSnapshot({...module,fields:[{key:'load',label:'Design load',type:'number',unit:'A'}]},oldInputs,oldResult,{appVersion:'2.0.0'});
const oldRecord=legacyHarness.store.save(oldSnapshot,{projectName:'Legacy',calculationName:'Old feeder'});
const originalPDF=createPDF(oldRecord.snapshot);legacyHarness.ui.savedLibrary();
legacyHarness.buttons.find(b=>b.dataset.recordAction==='load').onclick();
assert.equal(legacyHarness.ui.states.conductor.ocpd,25);assert.equal(legacyHarness.ui.states.conductor.load,undefined);
assert.match(legacyHarness.nodes['#main'].innerHTML,/Previous load converted/);
assert.match(legacyHarness.nodes['#results'].innerHTML,/result-hero/);
assert.doesNotMatch(legacyHarness.nodes['#results'].innerHTML,/Design load/);
assert.deepEqual(createPDF(legacyHarness.store.load(oldRecord.id).snapshot),originalPDF);
legacyHarness.ui.savedLibrary();legacyHarness.buttons.find(b=>b.dataset.recordAction==='pdf').onclick();
assert.equal(legacyHarness.pdfs[0].appVersion,'2.0.0');assert.equal(legacyHarness.pdfs[0].inputs.load,21);
legacyHarness.buttons.find(b=>b.dataset.recordAction==='load').onclick();
legacyHarness.change('voltageDropEnabled',true);legacyHarness.change('current',26,'INPUT');
assert.match(legacyHarness.nodes['#results'].innerHTML,/selected OCPD rating/);assert.equal(legacyHarness.nodes['#export-pdf'].disabled,true);
console.log('Legacy saved-load migration, immutable old PDF and migrated current-guard workflows passed.');

// Project reuse across calculators, grouped counts, recoverable clear and atomic failure.
const grouped=harness();grouped.ui.calculator('power');
grouped.prompts.push('Shared project','');grouped.nodes['#save-calculation'].onclick();
assert.match(grouped.store.list()[0].calculationName,/\d{2}:\d{2}:\d{2}/);
grouped.ui.calculator('amps');grouped.nodes['#save-calculation'].onclick();
assert.equal(grouped.dialogs.at(-1).projectName,'Shared project');
grouped.dialogs.at(-1).onSave({projectName:'  SHARED   project  ',calculationName:'Second'});
grouped.ui.calculator('power');grouped.prompts.push('Other','Third');grouped.nodes['#save-calculation'].onclick();
grouped.ui.savedLibrary();assert.match(grouped.nodes['#main'].innerHTML,/Shared project \(2\)/);assert.match(grouped.nodes['#main'].innerHTML,/Other \(1\)/);
const originals=grouped.store.list().map(r=>[r.id,JSON.stringify(r.snapshot)]);
grouped.clearButtons[1].onclick();assert.equal(grouped.dialogs.at(-1).count,2);
assert.equal(grouped.store.list().length,3,'Opening clear confirmation is non-mutating');
grouped.dialogs.at(-1).onConfirm();assert.equal(grouped.store.list().length,1);
assert.match(grouped.nodes['#main'].innerHTML,/Trash \(2\)/);
grouped.buttons.find(b=>b.dataset.recordAction==='restore').onclick();assert.equal(grouped.store.list().length,2);
grouped.nodes['#clear-all-calculations'].onclick();assert.equal(grouped.dialogs.at(-1).count,2);
const persisted=grouped.storage.getItem('mep-workbench-calculations-v1'),setItem=grouped.storage.setItem;
grouped.storage.setItem=()=>{throw Error('quota')};assert.throws(()=>grouped.dialogs.at(-1).onConfirm(),/preserved/);
assert.equal(grouped.storage.getItem('mep-workbench-calculations-v1'),persisted);
grouped.storage.setItem=setItem;grouped.dialogs.at(-1).onConfirm();assert.equal(grouped.store.list().length,0);
for(const [id,snapshot] of originals)assert.equal(JSON.stringify(grouped.store.load(id).snapshot),snapshot);
assert.equal(grouped.nodes['#clear-all-calculations'].onclick() ,undefined);
console.log('Project reuse, optional timestamp name, collapsible groups, counts, confirmed bulk trash, restore and atomic error workflows passed.');
