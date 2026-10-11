import { createSnapshot, buildSummary, summaryFromSnapshot, createRecordStore } from './dist/calculation-records.js';
import { transformerProtection, evaluateTransformerProtection, migrateProtectionState,transformerBreakerOptions, transformerOcpdRatings, secondaryRuleConditions } from './dist/transformer-protection.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as calc from './legacy-conductor-fixtures.mjs';
import {systemOptions,voltageOptions} from './dist/voltage.js';
import {conductor,conductors,conduitSizes} from './legacy-conductor-fixtures.mjs';
let count=0;
const base={load:30,terminal:75,ambient:30,configuration:'three-phase-3-wire',parallelSets:1,ocpd:0,material:'copper'};
const run=p=>{const r=conductor({...base,...p});assert.equal(r.error,undefined,r.error);count++;return r;};
const value=(r,label)=>{const v=r.results.find(r=>r.label===label);assert.ok(v,`Missing ${label}`);return v.value;};
const invalid=p=>{assert.ok(conductor({...base,...p}).error);count++;};
// Full aluminum Table 310.16 range, including unsupported #14.
const expected=[['14',null,null,null],['12',15,20,25],['10',25,30,35],['8',35,40,45],['6',40,50,55],['4',55,65,75],['3',65,75,85],['2',75,90,100],['1',85,100,115],['1/0',100,120,135],['2/0',115,135,150],['3/0',130,155,175],['4/0',150,180,205],['250',170,205,230],['300',195,230,260],['350',210,250,280],['400',225,270,305],['500',260,310,350],['600',285,340,385],['700',315,375,425],['750',320,385,435]];
for(const [size,a,b,c] of expected){const w=conductors.find(w=>w.size===size);assert.deepEqual([w.al60,w.al75,w.al90],[a,b,c]);count++;}
for(const [load,terminal,size] of [[1,75,'12'],[15,75,'12'],[16,75,'10'],[25,75,'10'],[26,75,'8'],[30,60,'8'],[40,60,'6'],[50,75,'6'],[100,75,'1'],[300,75,'500']])assert.equal(value(run({load,terminal,material:'aluminum'}),'Aluminum conductor per set'),`${size} AWG`.replace('500 AWG','500 kcmil'));
assert.equal(value(run({load:30}),'Copper conductor per set'),'10 AWG');
assert.equal(value(run({load:30,material:'aluminum'}),'Aluminum conductor per set'),'8 AWG');
assert.equal(value(run({load:40,material:'aluminum',configuration:'three-phase-4-wire'}),'Aluminum conductor per set'),'6 AWG');
assert.equal(value(run({load:30,material:'aluminum',ambient:60}),'Aluminum conductor per set'),'8 AWG');
assert.equal(value(run({load:30,material:'aluminum'}),'Total OCPD'),30);
// A full-size neutral occupies space; 4-wire three-phase conservatively counts four CCC.
const cu3=run({load:40}),cu4=run({load:40,configuration:'three-phase-4-wire'});
assert.equal(value(cu3,'Copper conductor per set'),value(cu4,'Copper conductor per set'));
assert.equal(value(cu3,'Minimum EMT per set'),'3/4 in.');
assert.equal(value(cu4,'Physical conductors per raceway incl. EGC'),5);
assert.equal(value(cu4,'Conductor area per raceway incl. EGC'),Number((4*.0366+.0211).toFixed(3)));
const al=run({load:100,material:'aluminum',configuration:'three-phase-4-wire'});
assert.equal(value(al,'Base-minimum Cu EGC per raceway'),'8 AWG');
assert.equal(value(al,'Conductor area per raceway incl. EGC'),Number((4*.1855+.0366).toFixed(3)));
assert.ok(al.steps.some(s=>s.includes('4 × 1/0 AWG Al')&&s.includes('1 × 8 AWG insulated Cu EGC')));
assert.ok(al.warnings.some(s=>s.includes('AA-8000')));
// The conductor module always models a complete circuit plus EGC, hence 40% fill.
assert.equal(value(run({configuration:'single-phase-2-wire'}),'Permitted fill per raceway'),40);
for(const delta of [{parallelSets:0},{parallelSets:-1},{parallelSets:1.5},{parallelSets:21},{parallelSets:''},{parallelSets:null},{parallelSets:NaN},{parallelSets:Infinity},{configuration:'unknown'},{configuration:'__proto__'},{configuration:''},{material:'steel'},{material:''},{load:400,material:'aluminum'},{ccc:3},{continuous:0},{physicalCount:4}])invalid(delta);
// Sweep checks minimum EMT against unrounded physical area, with a separately selected Cu ground.
for(const material of ['copper','aluminum'])for(const load of [10,15,20,25,30,40,60,100,200,300])for(const configuration of Object.keys(calc.circuitConfigurations)){
 const r=run({material,load,configuration,parallelSets:load>=200?2:1});
 const size=value(r,material==='copper'?'Copper conductor per set':'Aluminum conductor per set').split(' ')[0];
 const egc=value(r,'Base-minimum Cu EGC per raceway').split(' ')[0];
 const n=calc.circuitConfigurations[configuration].physical;
 const area=conductors.find(w=>w.size===size).area*n+conductors.find(w=>w.size===egc).area;
 const min=conduitSizes.find(c=>area<=c.area*.4);
 assert.equal(value(r,'Minimum EMT per set'),min?`${min.size} in.`:'Over supported 4 in. range');
 assert.ok(!/NaN|Infinity/.test(JSON.stringify(r)));
 if(min)assert.ok(value(r,'Actual fill per raceway')<=40);
}
// Saved settings migration and selector/reset contract, using the actual UI module.
const source=fs.readFileSync(new URL('./dist/app.js',import.meta.url),'utf8').replace(/^import[^\n]+\n/gm,'').replace(/route\(\);\s*$/,'');
for(const saved of [{},{conductor:{ccc:8}},{conductor:{ccc:2}},{conductor:{ccc:2,physicalCount:5,material:'aluminum'}}]){
 const context=vm.createContext({createSnapshot, buildSummary, summaryFromSnapshot, createRecordStore, transformerProtection, evaluateTransformerProtection, migrateProtectionState,transformerBreakerOptions, transformerOcpdRatings, secondaryRuleConditions, calc,systemOptions,voltageOptions,structuredClone,console,localStorage:{getItem:()=>JSON.stringify(saved)},window:{addEventListener(){}}});
 vm.runInContext(source+';globalThis.ui={states,modules,defaults,fieldHTML};',context);
 const {states,modules,defaults,fieldHTML}=context.ui;
 assert.equal(states.conductor.ccc,undefined);assert.equal(states.conductor.physicalCount,undefined);
 assert.equal(states.conductor.configuration,saved.conductor?'':'three-phase-3-wire');
 if(saved.conductor)assert.ok(states.conductor.migrationNotice);
 const m=modules.find(m=>m.id==='conductor');
 assert.equal(defaults(m).material,'copper');assert.equal(defaults(m).parallelSets,1);
 const html=fieldHTML(m.fields.find(f=>f.key==='material'),states.conductor);
 assert.ok(html.includes('value="copper"'));assert.ok(html.includes('value="aluminum"'));
 count++;
}
console.log(`${count} conductor/material/fill checks passed`);
