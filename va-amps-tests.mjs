// Numerical API regression coverage. UI/report integration lives in va-amps-ui-tests.mjs.
import assert from 'node:assert/strict';
import * as calc from './dist/calc.js';
import {formatCurrent} from './dist/current-display.js';

let passed=0;
const test=(name,fn)=>{try{fn();passed++;}catch(error){console.error(name);throw error;}};
const good=result=>{assert.equal(result.error,undefined,result.error);assert.ok(result.results.length);return result;};
const bad=result=>{assert.equal(typeof result.error,'string');assert.ok(result.error.length);assert.deepEqual(result.results,[]);};
const row=(result,label)=>{const found=result.results.find(item=>item.label===label);assert.ok(found,`Missing ${label}`);return found;};
const rounded=n=>Number(n.toFixed(3));
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<=Math.max(Math.abs(expected)*2e-14,Number.MIN_VALUE),`${actual} differs from ${expected}`);
const vaModes=['vaToAmps','ampsToVA'];
const wattModes=['wattsToAmps','ampsToWatts'];
const allModes=[...wattModes,...vaModes];
const base={mode:'vaToAmps',value:10000,phase:3,voltage:480,voltageMode:'standard'};
const assertVAResult=(output,current,apparent)=>{
 assert.deepEqual(output.results.map(r=>r.label),['Current','Apparent power']);
 const a=row(output,'Current'),s=row(output,'Apparent power');
 assert.equal(a.value,rounded(current));near(a.rawValue,current);assert.equal(a.displayValue,formatCurrent(current));assert.equal(a.unit,'A');
 assert.equal(s.value,rounded(apparent));near(s.rawValue,apparent);assert.equal(s.unit,'VA');assert.equal(s.displayValue,undefined);
 assert.equal(output.results.some(r=>r.unit==='W'||/real.*power|power factor/i.test(r.label)),false);
 assert.doesNotMatch(output.steps.join('\n'),/\bPF\b|1\.732/);
 assert.match(output.steps.join('\n'),/S|VA/);
 for(const item of output.results)for(const key of ['value','rawValue'])if(item[key]!==undefined)assert.ok(Number.isFinite(item[key]));
};

for(const phase of [1,3,'1','3'])for(const mode of vaModes)for(const voltage of [208,240,480,600])for(const input of [0,1.2499,15.625,10000.123456789]){
 test(`${mode}, phase ${phase}, ${voltage} V, value ${input}`,()=>{
  const factor=Number(phase)===3?Math.sqrt(3):1,p={mode,phase,voltage,value:input};
  const output=good(calc.amps(p)),current=mode==='vaToAmps'?input/(factor*voltage):input,apparent=mode==='vaToAmps'?input:factor*voltage*input;
  assertVAResult(output,current,apparent);
  if(Number(phase)===3)assert.match(output.steps.join('\n'),/√3/);
  else assert.doesNotMatch(output.steps.join('\n'),/√3/);
  assert.match(output.warnings.join('\n'),/line-to-line/);
  assert.match(output.warnings.join('\n'),/balanc/i);
  assert.ok(output.sources.length,'Conversions retain supporting references');
 });
}

// Invalid, missing and stale PF must be completely inert for either VA direction.
for(const mode of vaModes)for(const phase of [1,3])for(const pf of [undefined,null,'',' ',0,-1,.001,.1,.9,1,1.01,100,NaN,Infinity,-Infinity,'NaN','bad',true,false,[],{}]){
 test(`${mode}, phase ${phase}: ignores PF ${String(pf)}`,()=>{
  const p={...base,mode,phase},expected=good(calc.amps(p));
  assert.deepEqual(calc.amps({...p,pf}),expected);
 });
}
for(const mode of vaModes)test(`${mode}: does not read a PF getter`,()=>{
 const p={...base,mode};Object.defineProperty(p,'pf',{get(){throw Error('VA conversion read PF');}});
 assert.deepEqual(calc.amps(p),good(calc.amps({...base,mode})));
});

// Full-precision values, rather than display-rounded rows, close round trips.
for(const phase of [1,3])for(const voltage of [.0001,120,525.25,13800,34500])for(const input of [0,.000049,1.2499,15.625,123456.789012345]){
 test(`VA and current round trips, phase ${phase}, ${voltage} V, value ${input}`,()=>{
  const p={phase,voltage,voltageMode:'custom'};
  const forward=good(calc.amps({...p,mode:'vaToAmps',value:input}));
  const reverse=good(calc.amps({...p,mode:'ampsToVA',value:row(forward,'Current').rawValue}));
  near(row(reverse,'Apparent power').rawValue,input);
  const power=good(calc.amps({...p,mode:'ampsToVA',value:input}));
  const current=good(calc.amps({...p,mode:'vaToAmps',value:row(power,'Apparent power').rawValue}));
  near(row(current,'Current').rawValue,input);
 });
}
test('VA currents avoid double rounding and keep full numerical precision',()=>{
 const result=good(calc.amps({mode:'vaToAmps',value:149.988,voltage:120,phase:1}));
 assert.equal(row(result,'Current').value,1.25);assert.equal(row(result,'Current').rawValue,1.2499);
 assert.equal(row(result,'Current').displayValue,'1.2');
 assert.notEqual(row(result,'Current').rawValue,row(result,'Current').value);
 const small=good(calc.amps({mode:'ampsToVA',value:1e-8,voltage:.0001,phase:1,voltageMode:'custom'}));
 assert.equal(row(small,'Apparent power').value,0);
 assert.ok(row(small,'Apparent power').rawValue>0,'Display rounding is not numerical underflow');
 assert.equal(row(small,'Current').value,0);assert.equal(row(small,'Current').rawValue,1e-8);assert.equal(row(small,'Current').displayValue,'0.0');
});

// Original W conversion API, numerical outputs, methods and PF validation remain.
for(const phase of [1,3,'1','3'])for(const mode of wattModes)for(const pf of [.001,.5,.85,1]){
 test(`legacy ${mode}, phase ${phase}, PF ${pf}`,()=>{
  const factor=Number(phase)===3?Math.sqrt(3):1,p={phase,mode,pf,voltage:480,value:mode==='wattsToAmps'?10000:30.123456};
  const a=mode==='wattsToAmps'?p.value/(factor*p.voltage*pf):p.value,va=factor*p.voltage*a,w=mode==='wattsToAmps'?p.value:va*pf,output=good(calc.amps(p));
  assert.deepEqual(output.results.map(r=>r.label),['Current','Real input power','Apparent power']);
  assert.equal(row(output,'Current').value,rounded(a));assert.equal(row(output,'Current').displayValue,formatCurrent(a));
  assert.equal(row(output,'Real input power').value,rounded(w));assert.equal(row(output,'Apparent power').value,rounded(va));
  assert.match(output.steps.join('\n'),/\bPF\b/);assert.doesNotMatch(output.steps.join('\n'),/1\.732/);
 });
}
for(const mode of wattModes)for(const pf of [undefined,null,'',' ',0,-1,1.01,NaN,Infinity,'bad',true,false,[],{}])test(`${mode}: still rejects invalid PF ${String(pf)}`,()=>bad(calc.amps({...base,mode,pf})));
for(const mode of allModes)for(const phase of [1,3])test(`${mode}, phase ${phase}: accepts zero`,()=>{
 const output=good(calc.amps({...base,mode,phase,value:0,pf:.85}));
 for(const item of output.results)assert.equal(item.value,0);
 assert.equal(row(output,'Current').displayValue,'0.0');
});
for(const mode of vaModes)test(`${mode}: finite numeric strings are accepted`,()=>{
 const output=good(calc.amps({mode,value:'10000.125',voltage:'480',phase:'3'}));
 assertVAResult(output,mode==='vaToAmps'?10000.125/(Math.sqrt(3)*480):10000.125,mode==='vaToAmps'?10000.125:Math.sqrt(3)*480*10000.125);
});

for(const mode of vaModes)for(const key of ['value','voltage'])for(const value of ['', ' ',null,undefined,true,false,[],{},NaN,Infinity,-Infinity,'bad',-1])test(`${mode}: rejects ${key}=${String(value)}`,()=>bad(calc.amps({...base,mode,[key]:value,voltageMode:'custom'})));
for(const mode of vaModes)test(`${mode}: zero voltage rejected`,()=>bad(calc.amps({...base,mode,voltage:0,voltageMode:'custom'})));
for(const mode of allModes)for(const phase of [0,2,4,'',null,undefined,true,false,[],{}])test(`${mode}: rejects phase ${String(phase)}`,()=>bad(calc.amps({...base,mode,pf:1,phase})));
for(const mode of ['',undefined,null,'vaToWatts','wattsToVA','amperes','VAtoAmps',0,{},[]])test(`rejects unsupported conversion ${String(mode)}`,()=>bad(calc.amps({...base,mode,pf:1})));
for(const mode of vaModes)for(const patch of [{voltage:120},{voltage:525},{voltage:13800},{voltage:480,voltageSystem:'wye208'},{voltage:480,voltageMode:'invalid'}])test(`${mode}: standard/custom selection constraints ${JSON.stringify(patch)}`,()=>bad(calc.amps({...base,mode,...patch})));
for(const mode of vaModes)for(const phase of [1,3])for(const voltage of [.0001,525.25,13800,34500,1e6])test(`${mode}: custom ${voltage} V, phase ${phase}`,()=>{
 const output=good(calc.amps({...base,mode,phase,voltage,voltageMode:'custom'}));
 assert.match(output.warnings.join('\n'),/custom/);
 if(voltage>1000)assert.match(output.warnings.join('\n'),/medium-voltage|equipment.*voltage|insulation/i);
 assert.deepEqual(calc.amps({...base,mode,phase,voltage,voltageMode:'custom',voltageConfirmed:true}),output);
});
test('VA modes retain high-leg and unusual custom-voltage safety context',()=>{
 for(const mode of vaModes){
  assert.match(good(calc.amps({...base,mode,voltage:240,voltageSystem:'highleg240'})).warnings.join('\n'),/high.leg/i);
  assert.match(good(calc.amps({...base,mode,voltage:120,voltageMode:'custom'})).warnings.join('\n'),/208.*line-to-line/);
 }
});

for(const p of [
 {mode:'vaToAmps',value:Number.MAX_VALUE,voltage:.0001},
 {mode:'vaToAmps',value:Number.MIN_VALUE,voltage:1e308},
 {mode:'ampsToVA',value:Number.MAX_VALUE,voltage:13800},
 {mode:'ampsToVA',value:Number.MIN_VALUE,voltage:Number.MIN_VALUE}
])test(`unrepresentable ${p.mode} result rejected`,()=>bad(calc.amps({...base,...p,voltageMode:'custom'})));
for(const mode of vaModes)for(const phase of [1,3])test(`${mode}: zero stays valid at extreme custom voltage, phase ${phase}`,()=>{
 assertVAResult(good(calc.amps({...base,mode,phase,value:0,voltage:1.7e308,voltageMode:'custom'})),0,0);
});
test('representable VA results survive overflowing intermediate voltage products',()=>{
 const current=good(calc.amps({...base,value:1e308,voltage:1e308,voltageMode:'custom'}));
 near(row(current,'Current').rawValue,1/Math.sqrt(3));near(row(current,'Apparent power').rawValue,1e308);
 const power=good(calc.amps({...base,mode:'ampsToVA',value:.1,voltage:1.7e308,voltageMode:'custom'}));
 near(row(power,'Apparent power').rawValue,(1.7e308*.1)*Math.sqrt(3));
});
test('calculations never mutate caller-owned state',()=>{
 for(const mode of allModes){const p=Object.freeze({...base,mode,pf:.85,voltageConfirmed:true}),before=JSON.stringify(p);good(calc.amps(p));assert.equal(JSON.stringify(p),before);}
});

console.log(`${passed} VA/current engine regressions passed: four modes, phase/voltage math, PF independence, raw precision, round trips, legacy W compatibility and numerical guards.`);
