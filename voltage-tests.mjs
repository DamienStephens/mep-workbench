import { createSnapshot, buildSummary, summaryFromSnapshot, createRecordStore } from './dist/calculation-records.js';
import { transformerProtection, evaluateTransformerProtection, migrateProtectionState,transformerBreakerOptions, transformerOcpdRatings, secondaryRuleConditions } from './dist/transformer-protection.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as calc from './dist/calc.js';
import {systems,systemOptions,voltageOptions,validateVoltage,allowedVoltages} from './dist/voltage.js';
let passed=0;
function test(name,fn){try{fn();passed++}catch(e){console.error(name);throw e}}
const a={mode:'wattsToAmps',value:2400,pf:1,voltage:120,phase:1};
const d={size:'10',length:100,current:20,voltage:120,target:3,material:'copper',phase:1};
const t={kva:75,primary:480,secondary:208,primaryPhase:3,secondaryPhase:3};
for(const s of systems)for(const phase of [1,3])for(const transformer of [false,true]){
 for(const voltage of allowedVoltages(phase,s.id,transformer))test(`${s.id}, ${phase}-phase ${voltage} V transformer=${transformer}`,()=>assert.ok(!validateVoltage({voltage,phase,system:s.id,transformer}).error));
}
for(const [name,p] of [['amps',a],['drop',d]]){
 test(`${name} blocks ordinary 120 V three-phase`,()=>assert.match(calc[name]({...p,phase:3}).error,/line-to-line/));
 test(`${name} allows confirmed unusual 120 V three-phase`,()=>{const r=calc[name]({...p,phase:3,voltageMode:'custom',voltageConfirmed:true});assert.ok(!r.error);assert.ok(r.warnings.some(w=>w.includes('unusual')))});
 test(`${name} requires explicit custom confirmation`,()=>assert.ok(calc[name]({...p,phase:3,voltageMode:'custom'}).error));
 test(`${name} blocks medium voltage even custom`,()=>assert.ok(calc[name]({...p,voltage:4160,voltageMode:'custom',voltageConfirmed:true}).error));
 for(const voltage of [120,208,240,277,347,480,600])test(`${name} permits legitimate ${voltage} V single-phase`,()=>assert.ok(!calc[name]({...p,voltage}).error));
}
test('transformer invalid 120 V three-phase primary',()=>assert.ok(calc.transformer({...t,primary:120}).error));
test('transformer invalid 120 V three-phase secondary',()=>assert.ok(calc.transformer({...t,secondary:120}).error));
test('split-phase transformer must use full winding',()=>assert.ok(calc.transformer({...t,secondaryPhase:1,secondary:120,secondarySystem:'split120240'}).error));
test('split-phase transformer uses full winding 240',()=>assert.ok(!calc.transformer({...t,primaryPhase:1,secondaryPhase:1,secondary:240,secondarySystem:'split120240'}).error));
test('mismatched transformer phase warning',()=>assert.ok(calc.transformer({...t,secondaryPhase:1}).warnings.some(w=>w.includes('phases differ'))));
test('transformer custom MV needs acknowledgement',()=>assert.ok(calc.transformer({...t,primary:13800,primaryMode:'custom'}).error));
test('transformer custom MV current remains supported',()=>{const r=calc.transformer({...t,primary:13800,primaryMode:'custom',primaryConfirmed:true});assert.ok(!r.error);assert.ok(r.warnings.some(w=>w.includes('Medium-voltage')))});
test('preset and voltage must agree',()=>assert.ok(calc.amps({...a,phase:3,voltage:480,voltageSystem:'wye208'}).error));
test('high-leg preset warns',()=>assert.ok(calc.amps({...a,phase:3,voltage:240,voltageSystem:'highleg240'}).warnings.some(w=>w.includes('high leg'))));
for(const mode of ['wattsToAmps','ampsToWatts'])for(const phase of [1,3])test(`${mode} ${phase}-phase remains valid`,()=>assert.ok(!calc.amps({...a,mode,phase,voltage:phase===3?208:120}).error));
const source=fs.readFileSync(new URL('./dist/app.js',import.meta.url),'utf8').replace(/^import[^\n]+\n/gm,'').replace(/route\(\);\s*$/,'');
function harness(saved={}){
 const handlers={};const form={addEventListener:(event,fn)=>handlers[event]=fn,querySelector:()=>null};
 const nodes=Object.fromEntries(['#copy-summary','#export-pdf','#save-calculation','#action-status','#storage-status','#main','#navigation','#breadcrumb-title','#reset','#print','#results','#sources'].map(k=>[k,{innerHTML:'',textContent:''}]));nodes['#calculator-form']=form;
 const ctx=vm.createContext({createSnapshot, buildSummary, summaryFromSnapshot, createRecordStore, transformerProtection, evaluateTransformerProtection, migrateProtectionState,transformerBreakerOptions, transformerOcpdRatings, secondaryRuleConditions, calc,systemOptions,voltageOptions,structuredClone,console,localStorage:{getItem:()=>JSON.stringify(saved),setItem(){}},document:{querySelector:k=>nodes[k],querySelectorAll:()=>[]},window:{addEventListener(){},print(){}}});
 vm.runInContext(source+'\nglobalThis.ui={states,calculator,modules,fieldHTML};',ctx);
 return {ui:ctx.ui,nodes,change(name,value){handlers.change({type:'change',target:{name,value,tagName:'SELECT',dataset:{},matches:()=>true}})}};
}
test('saved invalid phase-voltage preserved and blocked',()=>{const h=harness({amps:{phase:3,voltage:120}});h.ui.calculator('amps');assert.equal(h.ui.states.amps.voltage,120);assert.match(h.nodes['#results'].innerHTML,/role="alert"/);assert.match(h.nodes['#main'].innerHTML,/saved: 120/)});
test('phase change updates voltage options without replacing voltage',()=>{const h=harness();h.ui.calculator('drop');h.change('phase','3');assert.equal(h.ui.states.drop.voltage,120);assert.match(h.nodes['#main'].innerHTML,/208 V starting voltage · line-to-line/);assert.match(h.nodes['#results'].innerHTML,/role="alert"/);h.change('voltage','208');assert.match(h.nodes['#results'].innerHTML,/result-hero/)});
test('change event updates conversion mode and label',()=>{const h=harness();h.ui.calculator('amps');h.change('mode','ampsToWatts');assert.equal(h.ui.states.amps.mode,'ampsToWatts');assert.match(h.nodes['#main'].innerHTML,/Line current/);assert.match(h.nodes['#results'].innerHTML,/Real input power/)});
test('custom mode requires confirmation and phase edits revoke it',()=>{const h=harness();h.ui.calculator('amps');h.change('voltageMode','custom');assert.match(h.nodes['#results'].innerHTML,/role="alert"/);h.change('voltageConfirmed','true');assert.match(h.nodes['#results'].innerHTML,/result-hero/);h.change('phase','3');assert.equal(h.ui.states.amps.voltageConfirmed,false);assert.match(h.nodes['#results'].innerHTML,/role="alert"/)});
test('preset change does not silently overwrite prior voltage',()=>{const h=harness();h.ui.calculator('amps');h.change('voltageSystem','wye208');assert.equal(h.ui.states.amps.voltage,240);assert.match(h.nodes['#results'].innerHTML,/role="alert"/)});
console.log(`${passed} voltage validation tests passed; 0 failed`);
