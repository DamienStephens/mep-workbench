import assert from 'node:assert/strict';
import * as calc from './dist/calc.js';
import {validateVoltage} from './dist/voltage.js';
import {transformerProtectionLimits} from './dist/transformer-protection.js';

let checks=0;
const good=r=>{assert.equal(r.error,undefined,r.error);assert.doesNotMatch(JSON.stringify(r),/NaN|Infinity/);checks++;return r;};
const value=(r,label)=>r.results.find(row=>row.label===label)?.value;
const round=n=>Number(n.toFixed(3));
const bad=r=>{assert.ok(r.error);assert.deepEqual(r.results,[]);checks++;};
const base={impedanceMode:'manual',resistance:.2,reactance:.05,impedanceBasis:'Manufacturer series impedance, actual operating temperature and arrangement',length:1000,current:100,voltage:13800,phase:3,pf:.8,parallelSets:1,voltageMode:'custom'};

// Any positive finite custom voltage is a numerical input, not a system endorsement.
// Explicit historical confirmation flags are ignored; they never certify equipment.
for(const voltage of [.001,120,230,690,1000,1001,2400,4160,13800,34500,69000,1e6])for(const phase of [1,3])for(const confirmed of [undefined,false,true,'true']){
 const check=validateVoltage({voltage,phase,mode:'custom',confirmed});assert.equal(check.error,undefined);checks++;
 const watts=1e6,pf=.9,factor=phase===3?Math.sqrt(3):1;
 const amps=good(calc.amps({mode:'wattsToAmps',value:watts,voltage,phase,pf,voltageMode:'custom',voltageConfirmed:confirmed}));
 assert.equal(value(amps,'Current'),round(watts/(factor*voltage*pf)));
 const power=good(calc.amps({mode:'ampsToWatts',value:20,voltage,phase,pf,voltageMode:'custom',voltageConfirmed:confirmed}));
 assert.equal(value(power,'Real input power'),round(factor*voltage*20*pf));
 const transformer=good(calc.transformer({kva:1000,primary:voltage,secondary:480,primaryPhase:phase,secondaryPhase:3,primaryMode:'custom',primaryConfirmed:confirmed}));
 assert.equal(value(transformer,'Primary full-load current'),round(1e6/(factor*voltage)));
}
for(const voltage of [0,-1,'',null,undefined,true,false,[],{},NaN,Infinity,'bad']){
 assert.ok(validateVoltage({voltage,phase:3,mode:'custom'}).error);checks++;
 bad(calc.amps({mode:'wattsToAmps',value:1000,pf:.9,phase:3,voltage,voltageMode:'custom'}));
 bad(calc.drop({...base,voltage}));
}
for(const phase of [true,false,0,2,4,[],{},null,undefined,''])assert.ok(validateVoltage({voltage:480,phase,mode:'custom'}).error);
assert.ok(validateVoltage({voltage:120,phase:3}).error,'Nominal mode keeps the line-to-line guard');
assert.ok(validateVoltage({voltage:480,phase:3,system:'wye208'}).error,'Explicit nominal system remains internally consistent');
assert.ok(validateVoltage({voltage:13800,phase:3,mode:'other'}).error);

// The manual mode is the same first-order series equation, independent of any
// low-voltage conductor table, fixed raceway, or stale hidden size selection.
for(const phase of [1,3])for(const pf of [1,.8,.5,.001])for(const parallelSets of [1,2,3,20])for(const voltage of [120,480,690,4160,13800,34500]){
 const p={...base,phase,pf,parallelSets,voltage,length:100},out=good(calc.drop(p));
 const expected=(phase===3?Math.sqrt(3):2)*(p.current/parallelSets)*p.length/1000*(p.resistance*pf+p.reactance*Math.sqrt(1-pf*pf));
 assert.equal(value(out,'Estimated voltage drop'),round(expected));
 assert.equal(value(out,'Percentage voltage drop'),round(100*expected/voltage));
 assert.equal(value(out,'Estimated voltage at end of run'),round(voltage-expected));
 assert.equal(value(out,'Current per set'),p.current/parallelSets);
 assert.equal(out.sources.some(source=>/Table 9|impedance.*checked/i.test(source.label)),false);
 assert.ok(out.sources.some(source=>source.category==='Physics'&&/manual coefficients/.test(source.label)));
 assert.match(out.steps.join(' '),/User-entered series impedance/);
 assert.match(out.steps.join(' '),/actual operating temperature/);
 assert.match(out.warnings.join(' '),/positive-sequence/);
 assert.match(out.warnings.join(' '),/shunt capacitance/);
 assert.match(out.warnings.join(' '),/ampacity/);
 assert.deepEqual(calc.drop({...p,size:'invalid',material:'invalid',raceway:'invalid'}),out);
}
const bareManual=good(calc.drop({...base,impedanceBasis:undefined}));
assert.match(bareManual.steps.join(' '),/No source \/ design basis recorded/);
assert.match(value(bareManual,'Impedance basis'),/not independently verified/);
for(const key of ['resistance','reactance'])for(const invalid of ['',null,undefined,true,false,[],{},NaN,Infinity,-1,'bad'])bad(calc.drop({...base,[key]:invalid}));
for(const patch of [{resistance:0,reactance:0},{impedanceMode:'other'},{impedanceMode:undefined},{impedanceBasis:{}},{parallelSets:0},{parallelSets:1.1},{parallelSets:21},{pf:0},{pf:1.1},{length:-1},{current:-1}])bad(calc.drop({...base,...patch}));
for(const patch of [{resistance:0},{reactance:0},{length:0},{current:0}])good(calc.drop({...base,...patch}));
assert.equal(value(good(calc.drop({...base,resistance:0,pf:1})),'Estimated voltage drop'),0,'Pure inductive series input at unity PF has zero first-order longitudinal drop');
bad(calc.drop({...base,length:1e8}));

// Manual values never leak into the Table 9 branch. Its exact coefficient and
// voltage restrictions stay unchanged; original tests sweep every source cell.
const table={size:'10',material:'copper',raceway:'steel',length:100,current:20,voltage:480,phase:3,pf:.8,parallelSets:1};
const tableOut=good(calc.drop(table));
assert.deepEqual(calc.drop({...table,resistance:1e10,reactance:'invalid',impedanceBasis:{}}),tableOut);
assert.ok(tableOut.sources.some(source=>/Chapter 9 Table 9/.test(source.label)&&source.verificationStatus==='verified-modeled-provisions'));
good(calc.drop({...table,voltage:600}));
for(const voltage of [600.01,690,1000,13800])assert.match(calc.drop({...table,voltage,voltageMode:'custom'}).error,/up to 600 V only/);
for(const patch of [{size:'700'},{size:'14',material:'aluminum'},{size:'10',parallelSets:2}])bad(calc.drop({...table,...patch}));

// Removing the shared voltage cap must not silently expand code-scoped sizing.
const sizing={ocpd:100,load:100,terminal:75,ambient:30,parallelSets:1,configuration:'three-phase-3-wire',material:'copper',voltageDropEnabled:true,phase:3,voltage:1000,voltageMode:'custom',length:100,current:80,target:3};
for(const fn of [calc.conductor,calc.service]){
 good(fn(sizing));
 for(const voltage of [1000.01,4160,13800])assert.match(fn({...sizing,voltage}).error,/limited to 1,000 V/);
 const noGate=good(fn({...sizing,voltageDropEnabled:false,terminal:90}));
 assert.match(noGate.warnings.join(' '),/design assumption, not verified equipment/);
 assert.deepEqual(fn({...sizing,voltageDropEnabled:false,terminal:90,terminal90Confirmed:true}),noGate);
 assert.deepEqual(fn({...sizing,voltageDropEnabled:false,terminal:90,terminal90Confirmed:false}),noGate);
}
assert.match(transformerProtectionLimits({kva:1000,phase:3,primary:13800,secondary:480,primaryMode:'custom',protection:'dual'}).error,/1000 V/);

// No infinite/NaN/underflow-to-false-zero engineering result can be presented.
bad(calc.amps({mode:'wattsToAmps',value:Number.MAX_VALUE,voltage:.001,pf:.001,phase:3,voltageMode:'custom'}));
bad(calc.amps({mode:'ampsToWatts',value:Number.MAX_VALUE,voltage:13800,pf:1,phase:3,voltageMode:'custom'}));
bad(calc.transformer({kva:Number.MAX_VALUE,primary:.001,secondary:480,primaryPhase:3,secondaryPhase:3,primaryMode:'custom'}));
bad(calc.power({mode:'wattsToVA',watts:Number.MAX_VALUE,pf:.001}));
bad(calc.power({mode:'vaToWatts',va:Number.MIN_VALUE,pf:.001}));
bad(calc.drop({...base,length:Number.MAX_VALUE,resistance:Number.MAX_VALUE}));
bad(calc.drop({...base,length:Number.MIN_VALUE,current:Number.MIN_VALUE}));
const hugeVoltage=good(calc.transformer({kva:1e308,primary:1e308,secondary:1e308,primaryPhase:3,secondaryPhase:1,primaryMode:'custom',secondaryMode:'custom'}));
assert.equal(value(hugeVoltage,'Primary full-load current'),round(1000/Math.sqrt(3)));
assert.equal(value(hugeVoltage,'Secondary full-load current'),1000);
good(calc.amps({mode:'wattsToAmps',value:1e308,voltage:1e308,pf:1,phase:3,voltageMode:'custom'}));
good(calc.amps({mode:'ampsToWatts',value:.1,voltage:1.7e308,pf:.9,phase:3,voltageMode:'custom'}));
good(calc.amps({mode:'wattsToAmps',value:0,voltage:1.7e308,pf:1,phase:3,voltageMode:'custom'}));

// Historical inputs are copied, never changed or populated with invented R/X.
const historical={...table,target:3,voltageConfirmed:true};
const frozen=JSON.stringify(historical),migrated=calc.migrateDropState(historical);
assert.equal(JSON.stringify(historical),frozen);assert.equal(migrated.impedanceMode,'table9');assert.equal(migrated.resistance,'');assert.equal(migrated.reactance,'');assert.equal(migrated.impedanceBasis,'');assert.ok(!('target' in migrated));
assert.deepEqual(calc.migrateDropState(base),{raceway:'steel',...base});
assert.deepEqual(calc.drop(migrated),tableOut);
console.log(`${checks} custom-voltage/manual-impedance engine checks passed: MV formula math, per-set R/X, provenance, physical scope, no confirmation gates, overflow guards and nonmutating migration.`);
