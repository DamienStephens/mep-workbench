import { createSnapshot, buildSummary, summaryFromSnapshot, copySummaryFromSnapshot, createRecordStore } from './dist/calculation-records.js';
import { transformerProtection, evaluateTransformerProtection, migrateProtectionState,transformerBreakerOptions, transformerOcpdRatings, secondaryRuleConditions } from './dist/transformer-protection.js';
// Presentation contracts and modeled print lifecycle; not browser visual QA.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as calc from './dist/calc.js';
import {systemOptions,voltageOptions} from './dist/voltage.js';
const source=fs.readFileSync(new URL('./dist/app.js',import.meta.url),'utf8').replace(/^import[^\n]+\n/gm,'').replace(/route\(\);\s*$/,'');
const html=fs.readFileSync(new URL('./dist/index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('./dist/styles.css',import.meta.url),'utf8');
const nodes=Object.fromEntries(['#copy-summary','#export-pdf','#save-calculation','#action-status','#storage-status','#main','#navigation','#breadcrumb-title','#calculator-form','#results','#sources','#reset','#print','#add-row'].map(key=>[key,{innerHTML:'',addEventListener(){},querySelector(){return null}}]));
const details=[{open:false},{open:true},{open:false}];
const handlers={};let prints=0;
const context=vm.createContext({createSnapshot, buildSummary, summaryFromSnapshot, copySummaryFromSnapshot, createRecordStore, transformerProtection, evaluateTransformerProtection, migrateProtectionState,transformerBreakerOptions, transformerOcpdRatings, secondaryRuleConditions, calc,systemOptions,voltageOptions,structuredClone,console,attachAmbientHelper(){},localStorage:{getItem:()=>null,setItem(){}},window:{addEventListener:(name,fn)=>handlers[name]=fn,print(){prints++}},document:{querySelector:key=>nodes[key],querySelectorAll:selector=>selector==='details[data-print-details]'?details:[]}});
vm.runInContext(source+'\nglobalThis.ui={overview,calculator,modules};',context);
context.ui.overview();
assert.equal((nodes['#main'].innerHTML.match(/class="tool-link"/g)||[]).length,10);
for(const old of ['hero-art','Less busywork','growing toolkit','overview-strip'])assert.ok(!nodes['#main'].innerHTML.includes(old));
for(const m of context.ui.modules){
 context.ui.calculator(m.id);
 assert.ok(nodes['#main'].innerHTML.includes('id="calculator-form"'));
 assert.ok(nodes['#main'].innerHTML.includes('id="results"'));
 assert.ok(!/<details[^>]*\sopen(?:[\s>])/.test(nodes['#main'].innerHTML));
 assert.ok(nodes['#navigation'].innerHTML.includes(`href="#${m.id}" aria-current="page"`));
}
nodes['#print'].onclick();assert.equal(prints,1);
handlers.beforeprint();assert.ok(details.every(el=>el.open));
handlers.beforeprint();handlers.afterprint();assert.deepEqual(details.map(el=>el.open),[false,true,false]);
assert.ok(html.includes('theme.js?v=2.14.0'));
assert.ok(html.includes('styles.css?v=2.14.0'));
assert.ok(html.includes('app.js?v=2.14.0'));
for(const asset of ['calc.js','ambient-helper.js','voltage.js'])assert.ok(source.includes(asset)===false); // imports stripped above
const original=fs.readFileSync(new URL('./dist/app.js',import.meta.url),'utf8');
assert.ok(original.includes('calc.js?v=2.14.0'));
for(const asset of ['ambient-helper.js','voltage.js'])assert.ok(original.includes(`${asset}?v=2.14.0`));
assert.ok(css.includes('height:44px;min-width:0;font-size:16px'));
assert.ok(css.includes('min-height:44px'));
assert.ok(css.includes('details[data-print-details]::details-content'));
assert.ok(css.includes('prefers-reduced-motion'));
console.log('Compact presentation, 10-module navigation, asset and modeled print checks passed.');
