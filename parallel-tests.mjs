import { createSnapshot, buildSummary, summaryFromSnapshot, copySummaryFromSnapshot, createRecordStore } from './dist/calculation-records.js';
import { transformerProtection, evaluateTransformerProtection, migrateProtectionState,transformerBreakerOptions, transformerOcpdRatings, secondaryRuleConditions } from './dist/transformer-protection.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as calc from './legacy-conductor-fixtures.mjs';
import {systemOptions,voltageOptions} from './dist/voltage.js';
const base={load:400,terminal:75,ambient:30,parallelSets:2,configuration:'three-phase-3-wire',material:'copper',ocpd:0};
let checks=0;
const run=overrides=>{const r=calc.conductor({...base,...overrides});assert.equal(r.error,undefined,r.error);checks++;return Object.fromEntries(r.results.map(x=>[x.label,x.value]));};
for(const [load,sets,size,egc,amp] of [[400,2,'3/0 AWG','3 AWG',400],[600,2,'350 kcmil','1 AWG',620],[800,3,'300 kcmil','1/0 AWG',855],[4000,10,'600 kcmil','500 kcmil',4200]]){
 const r=run({load,parallelSets:sets});assert.equal(r['Copper conductor per set'],size);assert.equal(r['Base-minimum Cu EGC per raceway'],egc);assert.equal(r['Combined usable ampacity'],amp);assert.equal(r['Separate raceways'],sets);assert.equal(r['Total OCPD'],load);assert.equal(r['CCC per raceway'],3);assert.equal(r['Physical conductors per raceway incl. EGC'],4);
}
for(const material of ['copper','aluminum'])for(const configuration of Object.keys(calc.circuitConfigurations))for(const sets of [2,3,10,20]){
 const r=run({load:1,material,configuration,parallelSets:sets});assert.equal(r[material==='copper'?'Copper conductor per set':'Aluminum conductor per set'],'1/0 AWG');assert.equal(r['Base-minimum Cu EGC per raceway'],'14 AWG');assert.equal(r['CCC per raceway'],calc.circuitConfigurations[configuration].ccc);assert.ok(r['Combined usable ampacity']>=r['Total OCPD']);assert.ok(r['Actual fill per raceway']<=40);
}
// EGC rating ceilings and auto OCPD rounding, always based on the TOTAL breaker.
for(const [ocpd,egc] of [[15,'14 AWG'],[20,'12 AWG'],[60,'10 AWG'],[100,'8 AWG'],[200,'6 AWG'],[300,'4 AWG'],[400,'3 AWG'],[500,'2 AWG'],[600,'1 AWG'],[700,'1/0 AWG'],[800,'1/0 AWG'],[1000,'2/0 AWG'],[1200,'3/0 AWG'],[1600,'4/0 AWG'],[2000,'250 kcmil'],[2500,'350 kcmil'],[3000,'400 kcmil'],[4000,'500 kcmil']]){
 const r=run({load:1,ocpd,parallelSets:20});assert.equal(r['Base-minimum Cu EGC per raceway'],egc);
}
assert.equal(run({load:601,parallelSets:3})['Total OCPD'],700);
assert.equal(run({load:400,configuration:'three-phase-4-wire'})['Copper conductor per set'],'4/0 AWG');
assert.equal(run({load:400,material:'aluminum'})['Aluminum conductor per set'],'250 kcmil');
assert.equal(run({load:30,parallelSets:1})['Total OCPD'],30);
for(const p of [{load:4001,parallelSets:20},{ocpd:5000,parallelSets:20},{ocpd:650},{load:600,parallelSets:1},{parallelSets:0},{parallelSets:2.5},{parallelSets:21},{parallelSets:true},{parallelSets:' '},{ocpd:null},{configuration:null},{load:1e308},{ambient:80,parallelSets:2,load:4000}]){assert.ok(calc.conductor({...base,...p}).error);checks++;}
// Derated parallel ampacity independently recomputed; physical fill is per raceway.
for(const material of ['copper','aluminum'])for(const configuration of Object.keys(calc.circuitConfigurations))for(const ambient of [30,40,60,80])for(const sets of [1,2,5]){
 const r=run({load:30,material,configuration,ambient,parallelSets:sets});
 const w=calc.conductors.find(w=>r[`${material==='copper'?'Copper':'Aluminum'} conductor per set`].startsWith(w.size+' '));
 const ground=calc.conductors.find(w=>(r['Conservative Cu EGC per raceway']??r['Base-minimum Cu EGC per raceway']).startsWith(w.size+' '));
 const c=calc.circuitConfigurations[configuration],af=({30:1,40:.91,60:.71,80:.41})[ambient],factor=c.ccc===4?.8:1,prefix=material==='copper'?'cu':'al';
 const amp=Math.min(w[prefix+'75'],w[prefix+'90']*af*factor)*sets;
 assert.ok(Math.abs(r['Combined usable ampacity']-amp)<.00051);assert.ok(amp>=r['Total OCPD']);
 const area=w.area*c.physical+ground.area,emt=calc.conduitSizes.find(x=>area<=x.area*.4);assert.equal(r['Minimum raceway per set'],`${emt.size} in.`);
}
const source=fs.readFileSync(new URL('./dist/app.js',import.meta.url),'utf8').replace(/^import[^\n]+\n/gm,'').replace(/route\(\);\s*$/,'');
function ui(saved){const context=vm.createContext({createSnapshot, buildSummary, summaryFromSnapshot, copySummaryFromSnapshot, createRecordStore, transformerProtection, evaluateTransformerProtection, migrateProtectionState,transformerBreakerOptions, transformerOcpdRatings, secondaryRuleConditions, calc,systemOptions,voltageOptions,structuredClone,console,localStorage:{getItem:()=>JSON.stringify(saved)},window:{addEventListener(){}}});vm.runInContext(source+';globalThis.ui={states,modules,defaults,fieldHTML,guidanceHTML};',context);return context.ui;}
for(const old of [{load:10,continuous:16,ccc:4,physicalCount:5,material:'aluminum'},{load:10,continuous:'16',ccc:2},{load:10,continuous:0,ccc:3}]){
 const u=ui({conductor:old}),s=u.states.conductor;assert.equal(s.ocpd,calc.standardOcpdRatings.find(v=>v>=Number(old.load)+1.25*Number(old.continuous)));assert.equal(s.configuration,'');assert.equal(s.parallelSets,1);assert.equal(s.continuous,undefined);assert.equal(s.ccc,undefined);assert.equal(s.physicalCount,undefined);assert.ok(s.migrationNotice.includes('125%'));assert.ok(calc.conductor(s).error);assert.equal(s.material,old.material??'copper');checks++;
}
for(const continuous of ['',null,-1,'invalid']){assert.equal(ui({conductor:{load:10,continuous}}).states.conductor.ocpd,'');checks++;}
const u=ui({conductor:{...base,parallelSets:3}}),m=u.modules.find(m=>m.id==='conductor');assert.equal(u.states.conductor.parallelSets,3);assert.equal(u.states.conductor.ocpd,400);assert.match(u.states.conductor.migrationNotice,/converted/);assert.equal(u.defaults(m).parallelSets,1);
const html=m.fields.map(f=>u.fieldHTML(f,u.states.conductor)).join('')+u.guidanceHTML(m,u.states.conductor);assert.ok(html.includes('name="ocpd"'));assert.ok(!html.includes('name="load"'));assert.ok(html.includes('name="parallelSets"'));assert.ok(!/name="(?:continuous|ccc|physicalCount)"/.test(html));assert.ok(html.includes('4,000 A'));checks++;
console.log(`${checks} parallel/migration regression checks passed`);
