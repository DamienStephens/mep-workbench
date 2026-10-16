// Manufacturer-reference regression tests. Fixtures below are independent
// transcriptions of Southwire SPEC 46002 / 46006 (AC R and inductive X only).
import assert from 'node:assert/strict';
import * as calc from './dist/calc.js';
import {mvCableFamilies,mvCableOptions,mvSizeOptions,mvArrangementOptions,mvTemperatureOptions,mvPresetImpedance} from './dist/mv-cables.js';

let checks=0;
const test=(name,fn)=>{try{fn();checks++}catch(error){console.error(name);throw error}};
const row=(out,label)=>out.results.find(r=>r.label===label);
const value=(out,label)=>row(out,label)?.value;
const rounded=n=>Number(n.toFixed(3));
const good=out=>{assert.equal(out.error,undefined,out.error);assert.doesNotMatch(JSON.stringify(out),/NaN|Infinity/);return out};
const bad=(out,pattern)=>{assert.ok(out.error);assert.deepEqual(out.results,[]);if(pattern)assert.match(out.error,pattern);return out};
const base={impedanceMode:'mvPreset',mvFamily:'mv90-epr-2400',mvSize:'1/0',mvTemperature:90,mvArrangement:'nonferrous-touching',phase:3,parallelSets:1,voltage:2400,voltageMode:'custom',length:1000,current:100,pf:.8};
const fixtures={
 'mv90-epr-2400':{
  rating:'MV-90',reference:'Southwire SPEC 46002',revision:'1.000.026 · 2026-08-21',spec:'46002',arrangement:'Three singles · one-diameter centers · nonferrous conduit',construction:/Nonshielded.*single-conductor/,
  rows:[['2',.204,.0434],['1',.162,.0417],['1/0',.128,.0401],['2/0',.102,.0387],['3/0',.081,.0381],['4/0',.065,.0368],['250',.056,.0373],['350',.041,.0355],['500',.030,.0337],['750',.023,.0329],['1000',.019,.0317]]
 },
 'mv105-epr-2400':{
  rating:'MV-105',reference:'Southwire SPEC 46006',revision:'1.000.001 · 2024-12-31',spec:'46006',arrangement:'Factory three-conductor cable · nonferrous conduit',construction:/Nonshielded.*factory three-conductor/,
  rows:[['2',.204,.035],['1/0',.128,.032],['4/0',.065,.030],['350',.041,.028],['500',.030,.027]]
 }
};
for(const [id,fixture] of Object.entries(fixtures)){
 test(`${id}: every published source row and source identity`,()=>{
  const family=mvCableFamilies[id];assert.ok(family);assert.equal(family.rating,fixture.rating);assert.equal(family.reference,fixture.reference);assert.equal(family.revision,fixture.revision);
  assert.equal(family.url,`https://cabletechsupport.southwire.com/en/cablespec/download_spec/?country=US&spec=${fixture.spec}`);
  assert.deepEqual(family.data,Object.fromEntries(fixture.rows.map(([size,r,x])=>[size,{r,x}])));
  assert.equal(family.voltage,2400);assert.equal(family.temperature,90);assert.equal(family.frequency,60);assert.equal(family.material,'Copper');assert.match(family.construction,fixture.construction);
  assert.match(family.model,/Conductor AC resistance and inductive reactance/);assert.doesNotMatch(family.model,/positive.sequence|R1|X1/);assert.match(family.bonding,/No metallic shield/);
  assert.deepEqual(mvSizeOptions({mvFamily:id}),fixture.rows.map(([size])=>[size,Number(size)>=250?`${size} kcmil`:`${size} AWG`]));
  assert.deepEqual(mvTemperatureOptions({mvFamily:id}),[[90,'90°C calculation temperature']]);
  assert.deepEqual(mvArrangementOptions({mvFamily:id}),[['nonferrous-touching',fixture.arrangement]]);
 });
 for(const [mvSize,r,x] of fixture.rows)for(const pf of [1,.95,.8,.5,.001])for(const [length,current] of [[1000,100],[137.25,47.125],[0,100],[1000,0]]){
  test(`${id}/${mvSize}: exact formula at PF ${pf}, ${length} ft and ${current} A`,()=>{
   const p={...base,mvFamily:id,mvSize,pf,length,current},out=good(calc.drop(p));
   const expected=Math.sqrt(3)*current*length/1000*(r*pf+x*Math.sqrt(1-pf*pf));
   assert.equal(value(out,'Estimated voltage drop'),rounded(expected));assert.equal(value(out,'Percentage voltage drop'),rounded(100*expected/2400));assert.equal(value(out,'Estimated voltage at end of run'),rounded(2400-expected));
   assert.equal(value(out,'Current per set'),current);assert.equal(value(out,'Total actual load current'),current);assert.equal(value(out,'Parallel sets'),1);
   assert.equal(value(out,'Series resistance R'),r);assert.equal(row(out,'Series resistance R').displayValue,String(r));assert.equal(value(out,'Series reactance X'),x);assert.equal(row(out,'Series reactance X').displayValue,String(x));
   assert.equal(value(out,'Calculation temperature'),90);assert.equal(value(out,'Reference family'),fixture.reference);
   assert.match(out.steps.join('\n'),/√3 × I × L \/ 1000 × \(R × PF \+ X × √\(1 − PF²\)\)/);
   assert.ok(out.steps.some(s=>s.includes(`R = ${r} and X = ${x}`)));assert.ok(out.steps.some(s=>s.includes(fixture.revision)));assert.match(out.steps.join('\n'),/one balanced three-phase circuit/);
   const mvSource=out.sources.filter(s=>s.category==='Manufacturer reference');assert.equal(mvSource.length,1);assert.equal(mvSource[0].url,mvCableFamilies[id].url);assert.match(mvSource[0].label,/selected R\/X coefficients, not an NEC table/);assert.equal(mvSource[0].verificationStatus,undefined);
   assert.ok(!out.sources.some(s=>/Chapter 9 Table 9/.test(s.label)));assert.ok(!out.results.some(s=>/ampacity|OCPD|compliance|passed/i.test(s.label)));
  });
 }
}

// All additional released families must also execute for every offered row,
// temperature and arrangement; fixed fixtures above detect 2.4-kV data drift.
for(const [id,family] of Object.entries(mvCableFamilies))for(const mvSize of Object.keys(family.data))for(const [mvTemperature] of mvTemperatureOptions({mvFamily:id}))for(const [mvArrangement] of mvArrangementOptions({mvFamily:id})){
 test(`${id}/${mvSize}/${mvTemperature}/${mvArrangement}: public catalog works end to end`,()=>{
  const p={...base,mvFamily:id,mvSize,mvTemperature,mvArrangement,voltage:family.voltage};
  const selected=mvPresetImpedance(p),out=good(calc.drop(p));assert.equal(selected.error,undefined);assert.equal(value(out,'Series resistance R'),selected.r);assert.equal(value(out,'Series reactance X'),selected.x);
  const expected=Math.sqrt(3)*p.current*p.length/1000*(selected.r*p.pf+selected.x*Math.sqrt(1-p.pf*p.pf));
  assert.equal(value(out,'Estimated voltage drop'),rounded(expected));assert.ok(selected.r>=0&&selected.x>=0&&selected.r+selected.x>0);
  for(const term of [family.reference,family.revision,family.rating,family.construction,family.model,`${mvTemperature}°C`,`${family.frequency} Hz`])assert.ok(selected.basis.includes(term),term);
  assert.ok(mvCableOptions().some(([key,label])=>key===id&&label===family.label));
  bad(calc.drop({...p,voltage:family.voltage+.001}),/exceeds.*cable class/);
 });
}
for(const mvFamily of Object.keys(fixtures)){
 test(`${mvFamily}: temperature rating cannot replace calculation temperature`,()=>{
  const p={...base,mvFamily};assert.equal(value(good(calc.drop(p)),'Calculation temperature'),90);good(calc.drop({...p,mvTemperature:'90'}));
  for(const mvTemperature of [60,75,89.99,90.01,105,110,0,-1,'',null,undefined,true,false,[],[90],{},NaN,Infinity,'MV-105','bad']){
   assert.ok(mvPresetImpedance({...p,mvTemperature}).error);bad(calc.drop({...p,mvTemperature}),/calculation temperature/);
  }
  const warnings=calc.drop(p).warnings.join('\n');assert.match(warnings,/MV-90 and MV-105 identify maximum conductor temperature ratings/);assert.match(warnings,/calculation temperature is not inferred from the rating/);
 });
 test(`${mvFamily}: voltage class is a ceiling, never a suitability certificate`,()=>{
  for(const voltage of [.001,120,480,600,601,1000,2399.999,2400])good(calc.drop({...base,mvFamily,voltage,length:0}));
  for(const voltage of [2400.001,4160,13800,1e6])bad(calc.drop({...base,mvFamily,voltage}),/2.4 kV.*MV-90\/MV-105 is a temperature rating/);
  const warnings=calc.drop({...base,mvFamily}).warnings.join('\n');for(const re of [/shunt capacitance/,/charging current/,/Long or lightly loaded/,/insulation level/,/grounding/,/accessories/,/ampacity/,/installation suitability/])assert.match(warnings,re);
 });
}
for(const phase of [1,'1',0,2,4,'',null,undefined,true,false,[],[3],{},NaN,Infinity,'bad'])test(`reject unsupported phase ${JSON.stringify(phase)}`,()=>{
 assert.ok(mvPresetImpedance({...base,phase}).error);bad(calc.drop({...base,phase}));
});
for(const parallelSets of [0,-1,1.5,2,3,20,21,'',null,undefined,true,false,[],[1],{},NaN,Infinity,'bad'])test(`reject unsupported circuit count ${JSON.stringify(parallelSets)}`,()=>{
 assert.ok(mvPresetImpedance({...base,parallelSets}).error);bad(calc.drop({...base,parallelSets}));
});
test('explicit numeric strings retain the supported single balanced circuit',()=>good(calc.drop({...base,phase:'3',parallelSets:'1',mvTemperature:'90',length:'1000',current:'100',pf:'.8',voltage:'2400'})));
for(const [key,invalids] of [
 ['mvFamily',['',null,undefined,true,false,[],['mv90-epr-2400'],{},'__proto__','constructor','toString','hasOwnProperty','prototype','mv90','mv105-epr-9999']],
 ['mvSize',['',null,undefined,true,false,[],['1/0'],{},'__proto__','constructor','toString','prototype','700','300','1.5/0','1/00','01/0','2000']],
 ['mvArrangement',['',null,undefined,true,false,[],{},'__proto__','constructor','toString','steel','trefoil','flat','nonferrous']]
])for(const invalid of invalids)test(`${key} rejects ${JSON.stringify(invalid)} without exception or fallback`,()=>{
 const p={...base,[key]:invalid};assert.ok(mvPresetImpedance(p).error);bad(calc.drop(p));
 if(key==='mvFamily')for(const options of [mvSizeOptions,mvArrangementOptions,mvTemperatureOptions])assert.deepEqual(options(p),[]);
});
test('missing API objects fail safely',()=>{for(const p of [undefined,null,{},false,[],0,'mvPreset']){assert.ok(mvPresetImpedance(p).error);bad(calc.drop(p));}});
test('sizes are family-specific and never interpolated',()=>{
 good(calc.drop({...base,mvSize:'1'}));bad(calc.drop({...base,mvFamily:'mv105-epr-2400',mvSize:'1'}),/No interpolation/);
 good(calc.drop({...base,mvSize:1000}));bad(calc.drop({...base,mvFamily:'mv105-epr-2400',mvSize:'1000'}),/No interpolation/);
});
for(const key of ['length','current','voltage','pf'])for(const invalid of ['',null,undefined,true,false,[],{},NaN,Infinity,'bad'])test(`${key}: nonnumeric input cannot create a result`,()=>bad(calc.drop({...base,[key]:invalid})));
for(const patch of [{length:-1},{current:-1},{voltage:0},{voltage:-1},{pf:0},{pf:-.8},{pf:1.001},{impedanceMode:'unknown'},{impedanceMode:undefined}])test(`reject out-of-scope numerical input ${JSON.stringify(patch)}`,()=>bad(calc.drop({...base,...patch})));
for(const patch of [{length:Number.MAX_VALUE},{current:Number.MAX_VALUE},{length:Number.MIN_VALUE,current:Number.MIN_VALUE},{length:1e9},{voltage:Number.MIN_VALUE}])test(`numeric range/out-of-approximation guard ${JSON.stringify(patch)}`,()=>bad(calc.drop({...base,...patch}),/numeric range|exceeds starting voltage/));

for(const [percent,status] of [[2.999999,'green'],[3.000001,'orange'],[4.999999,'orange'],[5.000001,'red']])test(`raw ${percent}% threshold uses unrounded percentage`,()=>{
 const r=.128,x=.0401,impedance=r*base.pf+x*Math.sqrt(1-base.pf*base.pf);
 const current=percent*base.voltage/100/(Math.sqrt(3)*base.length/1000*impedance),out=good(calc.drop({...base,current}));
 assert.equal(row(out,'Percentage voltage drop').status,status);assert.equal(value(out,'Percentage voltage drop'),Math.round(percent));
 assert.equal(row(out,'Voltage-drop guidance').status,status);assert.match(out.steps.join(' '),/Status uses the unrounded percentage/);
});
test('equivalent explicit manual coefficients reproduce MV numerical outputs',()=>{
 const preset=good(calc.drop(base)),manual=good(calc.drop({...base,impedanceMode:'manual',resistance:.128,reactance:.0401}));
 for(const label of ['Estimated voltage drop','Percentage voltage drop','Estimated voltage at end of run','Current per set','Total actual load current'])assert.equal(value(preset,label),value(manual,label));
});

test('hidden Table 9 and manual fields cannot affect an MV preset',()=>{
 const expected=good(calc.drop(base));
 for(const stale of [{size:'14',material:'aluminum',raceway:'steel'},{size:'700',material:'invalid',raceway:'invalid'},{resistance:-1,reactance:'bad',impedanceBasis:{}},{resistance:1e30,reactance:1e30,impedanceBasis:'unrelated old project'}])assert.deepEqual(calc.drop({...base,...stale}),expected);
 const input={...base,target:3,metadata:{label:'untouched'}};const before=structuredClone(input);good(calc.drop(input));assert.deepEqual(input,before);
});
test('Table 9 coefficients and restrictions are unchanged by stale MV data',()=>{
 const p={impedanceMode:'table9',size:'10',material:'copper',raceway:'steel',length:100,current:20,voltage:480,phase:3,pf:.8,parallelSets:1};const out=good(calc.drop(p));
 assert.equal(value(out,'Estimated voltage drop'),rounded(Math.sqrt(3)*20*.1*(1.2*.8+.063*.6)));
 assert.deepEqual(calc.drop({...p,mvFamily:'__proto__',mvSize:'700',mvTemperature:105,mvArrangement:'invalid',resistance:'invalid',reactance:Infinity}),out);
 bad(calc.drop({...p,voltage:600.01,voltageMode:'custom'}),/600 V only/);bad(calc.drop({...p,parallelSets:2}),/1\/0 AWG or larger/);bad(calc.drop({...p,size:'700'}));
 assert.ok(out.sources.some(s=>/Chapter 9 Table 9/.test(s.label)&&s.verificationStatus==='verified-modeled-provisions'));
});
test('Project R/X retains its arbitrary voltage, single-phase and parallel-set behavior',()=>{
 const p={...base,impedanceMode:'manual',resistance:.128,reactance:.0401,impedanceBasis:'Actual project impedance',phase:1,parallelSets:3,voltage:13800},out=good(calc.drop(p));
 assert.equal(value(out,'Estimated voltage drop'),rounded(2*100/3*(.128*.8+.0401*.6)));
 assert.deepEqual(calc.drop({...p,mvFamily:'__proto__',mvSize:'bad',mvTemperature:105,mvArrangement:'bad',size:'bad',material:'bad',raceway:'bad'}),out);
 assert.ok(!out.sources.some(s=>s.category==='Manufacturer reference'));assert.match(out.steps.join('\n'),/Actual project impedance/);
});
test('migration copies current MV selections and preserves historical Table 9 behavior',()=>{
 const input={...base,target:3,resistance:.3,reactance:.2},original=structuredClone(input),migrated=calc.migrateDropState(input);
 assert.deepEqual(input,original);assert.notEqual(migrated,input);assert.equal(migrated.impedanceMode,'mvPreset');for(const key of ['mvFamily','mvSize','mvTemperature','mvArrangement'])assert.equal(migrated[key],input[key]);assert.ok(!Object.hasOwn(migrated,'target'));assert.deepEqual(calc.drop(migrated),calc.drop(input));
 const legacy={size:'10',material:'copper',length:100,current:20,voltage:120,phase:1},old=structuredClone(legacy),next=calc.migrateDropState(legacy);assert.deepEqual(legacy,old);assert.equal(next.impedanceMode,'table9');assert.equal(next.resistance,'');assert.equal(next.reactance,'');assert.ok(!Object.hasOwn(next,'mvFamily'));assert.deepEqual(calc.drop(next),calc.drop(legacy));
});

// MV-105 factory-three-core expansion uses coherent positive-sequence values.
// The exact independent AIRGUARD source-cell fixtures follow separately below.
const mv105ExtendedIds=['mv105-epr-5000','mv105-epr-15000','mv105-epr-25000','mv105-epr-35000'];
for(const id of mv105ExtendedIds)test(`${id}: approved voltage class is available with explicit qualified basis`,()=>{
 const family=mvCableFamilies[id];assert.ok(family,`${id} must be present`);assert.equal(family.rating,'MV-105');assert.equal(family.temperature,105);assert.equal(family.rAt90Factor,.96);assert.equal(family.frequency,60);assert.equal(family.frequencyAssumed,true);assert.equal(family.insulationLevel,'133%');assert.equal(family.material,'Copper');
 assert.match(family.construction,/three.conductor|factory 3\/C/i);assert.match(family.model,/positive.sequence/i);assert.match(family.model,/R1.*X1/);assert.ok(family.assumptionNote);assert.match(family.assumptionNote,/60 Hz/);assert.match(family.bonding,/short|bond/i);
 assert.deepEqual(mvTemperatureOptions({mvFamily:id}).map(([v])=>v),[90,105]);assert.deepEqual(mvArrangementOptions({mvFamily:id}).map(([v])=>v),['factory-3c-shorted']);assert.equal(family.voltage,Number(id.split('-').at(-1)));
});
for(const [id,family] of Object.entries(mvCableFamilies).filter(([,f])=>f.voltage>2400)){
 const p={...base,mvFamily:id,mvSize:mvSizeOptions({mvFamily:id})[0][0],mvArrangement:mvArrangementOptions({mvFamily:id})[0][0],mvTemperature:family.temperature,voltage:family.voltage};
 test(`${id}: unsupported temperature, geometry, phase and parallel inputs never fall back`,()=>{
  for(const mvTemperature of [75,89.99,90.01,104.99,105.01,110,0,-1,'',null,undefined,true,false,[],[90],{},NaN,Infinity,'MV-105','bad'])if(!(family.temperatures||[family.temperature]).includes(mvTemperature))bad(calc.drop({...p,mvTemperature}),/calculation temperature/);
  for(const mvArrangement of ['nonferrous-touching','steel','flat','trefoil','',null,undefined,[],{},'__proto__','constructor'])bad(calc.drop({...p,mvArrangement}),/arrangement/);
  for(const phase of [1,'1',2,4,true,false,[3]])bad(calc.drop({...p,phase}));
  for(const parallelSets of [2,3,20,0,1.5,true,false,[1]])bad(calc.drop({...p,parallelSets}));
  for(const mvSize of ['__proto__','constructor','toString','not-a-size','2000',null,[],{}])bad(calc.drop({...p,mvSize}),/conductor size/);
 });
 test(`${id}: assumptions and qualifications accompany every result without NEC certification`,()=>{
  const out=good(calc.drop(p)),mv=mvPresetImpedance(p);assert.equal(value(out,'Engineering assumptions'),family.assumptionNote);assert.match(value(out,'Reference qualification'),/engineering assumptions/);assert.equal(value(out,'Cable insulation level'),family.insulationLevel);assert.ok(mv.basis.includes(family.assumptionNote));assert.ok(mv.basis.includes(family.bonding));
  if(family.frequencyAssumed)assert.match(mv.basis,/60 Hz assumed/);
  assert.ok(out.sources.some(s=>s.url===family.url&&/engineering assumptions/.test(s.label)));assert.ok(!out.sources.some(s=>s.category==='Manufacturer reference'&&s.verificationStatus));assert.ok(!out.sources.some(s=>/Table 9/.test(s.label)));
  for(const re of [/shunt capacitance/,/charging current/,/ampacity/,/grounding/,/installation suitability/])assert.match(out.warnings.join(' '),re);
  if(family.applicationNote){assert.ok(out.warnings.some(w=>w.includes(family.applicationNote)));assert.equal(value(out,'Cable application basis'),family.applicationNote);assert.match(family.applicationNote,/within one hour/);assert.match(family.applicationNote,/not a continuous-voltage multiplier/);}
 });
 test(`${id}: exact class ceiling, unchanged hidden fields and physical-range guard`,()=>{
  good(calc.drop({...p,voltage:family.voltage-.001}));good(calc.drop(p));bad(calc.drop({...p,voltage:family.voltage+.001}),/exceeds.*cable class/);bad(calc.drop({...p,voltage:family.voltage*1.33}),/exceeds.*cable class/);
  assert.deepEqual(calc.drop({...p,size:'bad',material:'aluminum',raceway:'steel',resistance:-1,reactance:Infinity,impedanceBasis:{stale:true}}),calc.drop(p));
  for(const patch of [{current:Number.MAX_VALUE},{length:Number.MAX_VALUE},{current:Number.MIN_VALUE,length:Number.MIN_VALUE}])bad(calc.drop({...p,...patch}),/numeric range/);
 });
 if(family.temperature===105)for(const mvSize of Object.keys(family.data))test(`${id}/${mvSize}: 90°C correction scales only R once and never implies 105°C operation`,()=>{
  const published=mvPresetImpedance({...p,mvSize,mvTemperature:105}),estimated=mvPresetImpedance({...p,mvSize,mvTemperature:90}),out105=good(calc.drop({...p,mvSize,mvTemperature:105})),out90=good(calc.drop({...p,mvSize,mvTemperature:90}));
  assert.equal(published.r,family.data[mvSize].r);assert.equal(estimated.r,published.r*.96);assert.equal(estimated.x,published.x);assert.equal(published.x,family.data[mvSize].x);assert.equal(estimated.temperature,90);assert.equal(published.temperature,105);
  assert.match(estimated.temperatureBasis,/Manufacturer estimate: R90 = 0\.96 × R105; X unchanged/);assert.match(published.temperatureBasis,/Published 105°C impedance/);assert.match(value(out90,'Temperature data'),/Manufacturer estimate/);assert.equal(value(out105,'Temperature data'),undefined);
  assert.equal(value(out90,'Series resistance R'),estimated.r);assert.equal(row(out90,'Series resistance R').displayValue,String(estimated.r));assert.equal(value(out90,'Series reactance X'),published.x);
  for(const [temperature,coeff] of [[90,estimated],[105,published]]){
   const out=calc.drop({...p,mvSize,mvTemperature:temperature}),manual=good(calc.drop({...p,impedanceMode:'manual',resistance:coeff.r,reactance:coeff.x}));
   for(const label of ['Estimated voltage drop','Percentage voltage drop','Estimated voltage at end of run'])assert.equal(value(out,label),value(manual,label));
  }
 });
 if(family.voltage===35000)test(`${id}: a 35-kV class accepts 34.5 kV without renaming the class`,()=>{
  const out=good(calc.drop({...p,voltage:34500}));assert.match(value(out,'Cable preset'),/35 kV/);assert.match(out.steps.join(' '),/starting voltage = 34500 V/);assert.match(out.steps.join(' '),/35 kV/);
  bad(calc.drop({...p,voltage:35000.001}),/35 kV cable class/);
 });
}
// Independent source transcriptions: AIG-0001-1121 printed pp. 14–15.
// Each tuple is [size, R1 micro-ohm/ft at 105°C, X1 micro-ohm/ft, product number].
// Keep integer source units so a 1,000x unit error cannot validate itself.
const airguardSourceRows={"5":[["2",212,42,"20261774"],["1/0",134,39,"20127601"],["2/0",106,37,"20127489"],["4/0",67,35,"20127495"],["250",57,34,"20131914"],["350",41,32,"20131375"],["500",29,31,"20127490"],["750",20,30,"20152787"]],"15":[["2",212,49,"20131374"],["1/0",134,44,"20127538"],["2/0",107,43,"20149514"],["4/0",67,40,"20127496"],["250",57,39,"20127943"],["350",41,37,"20127482"],["500",29,34,"20127483"],["750",20,33,"20127488"],["1000",16,32,"20138192"]],"25":[["1/0",134,49,"QQ8580A"],["2/0",107,48,"QQ9580A"],["4/0",68,44,"QQB580A"],["250",57,43,"QQC580A"],["350",41,40,"QQD580A"],["500",29,38,"QQE580A"],["750",20,36,"QQF580A"],["1000",16,34,"QQG580A"]],"35":[["1/0",134,53,"QR8580A"],["2/0",107,51,"QR9580A"],["4/0",68,47,"QRB580A"],["250",57,46,"QRC580A"],["350",41,43,"QRD580A"],["500",30,41,"QRE580A"],["1000",16,37,"QRG580A"]]};
for(const [kv,rows] of Object.entries(airguardSourceRows)){
 const id=`mv105-epr-${Number(kv)*1000}`,family=mvCableFamilies[id];
 test(`${id}: all independently transcribed positive-sequence source cells and units`,()=>{
  assert.deepEqual(family.data,Object.fromEntries(rows.map(([size,r,x])=>[size,{r:r/1000,x:x/1000}])));
  assert.match(family.revision,/AIG-0001-1121/);assert.equal(family.url,'https://na.prysmian.com/sites/default/files/atoms/files/AIG-0001-1121_Airguard%20Catalog.pdf#page=14');
  assert.match(family.construction,new RegExp(`${({5:115,15:220,25:320,35:420})[kv]} mil EPR`));assert.match(family.bonding,/shields short-circuited; no return in earth/);
 });
 for(const [mvSize,rMicro,xMicro,product] of rows)for(const mvTemperature of [90,105])for(const pf of [1,.95,.8,.5,.001])for(const [length,current] of [[1000,100],[137.25,47.125],[0,100],[1000,0]])test(`${id}/${product}/${mvSize}/${mvTemperature}°C: independent source-cell formula at PF ${pf}`,()=>{
  const p={...base,mvFamily:id,mvSize,mvTemperature,mvArrangement:'factory-3c-shorted',voltage:Number(kv)*1000,pf,length,current};
  const r=rMicro/1000*(mvTemperature===90?.96:1),x=xMicro/1000,expected=Math.sqrt(3)*current*length/1000*(r*pf+x*Math.sqrt(1-pf*pf)),out=good(calc.drop(p));
  assert.equal(value(out,'Estimated voltage drop'),rounded(expected));assert.equal(value(out,'Percentage voltage drop'),rounded(100*expected/p.voltage));assert.equal(value(out,'Estimated voltage at end of run'),rounded(p.voltage-expected));
  assert.equal(value(out,'Series resistance R'),r);assert.equal(value(out,'Series reactance X'),x);assert.equal(row(out,'Series resistance R').displayValue,String(r));assert.equal(row(out,'Series reactance X').displayValue,String(x));assert.equal(value(out,'Calculation temperature'),mvTemperature);assert.match(value(out,'Impedance basis'),/Positive-sequence R1 \/ X1/);
 });
}
test('AIRGUARD source anomalies are excluded rather than silently repaired or interpolated',()=>{
 const p={...base,mvFamily:'mv105-epr-35000',mvTemperature:105,mvArrangement:'factory-3c-shorted',voltage:34500};
 assert.ok(!Object.hasOwn(mvCableFamilies[p.mvFamily].data,'750'));bad(calc.drop({...p,mvSize:'750'}),/No interpolation/);assert.ok(!mvSizeOptions(p).some(([size])=>size==='750'));
 good(calc.drop({...p,mvSize:'1000'}));bad(calc.drop({...p,mvFamily:'mv105-epr-5000',voltage:4160,mvSize:'1000'}),/No interpolation/);
 assert.equal(mvCableFamilies['mv105-epr-5000'].data['1/0'].x,.039,'Use newer 115-mil source geometry, never old 90-mil reactance');
});
// Independent PDN-0023-0713 pp. 5/9/13/17 source cells: the three-phase,
// one-third-neutral, 90°C direct-buried positive-sequence R1/X1 columns.
// Source units are micro-ohms per foot, not ohms per kft or 75°C duct data.
const urdSourceRows={"5":[["1/0",143,94],["2/0",119,90],["3/0",101,85],["4/0",88,79],["250",80,75],["350",68,65],["500",58,53],["750",48,40],["1000",41,31]],"15":[["1/0",141,94],["2/0",117,91],["3/0",99,86],["4/0",86,81],["250",78,76],["350",66,67],["500",57,55],["750",47,42],["1000",41,35]],"25":[["1/0",140,95],["2/0",116,91],["3/0",98,87],["4/0",84,82],["250",76,78],["350",64,69],["500",55,57],["750",45,45],["1000",39,37]],"35":[["1/0",139,95],["2/0",115,92],["3/0",96,87],["4/0",83,83],["250",74,79],["350",62,70],["500",53,59],["750",44,47],["1000",38,39]]};
for(const [kv,rows] of Object.entries(urdSourceRows)){
 const id=`mv90-cn-${Number(kv)*1000}`,family=mvCableFamilies[id];
 test(`${id}: exact source identity, construction, ordering option and source units`,()=>{
  assert.ok(family);assert.deepEqual(family.data,Object.fromEntries(rows.map(([size,r,x])=>[size,{r:r/1000,x:x/1000}])));
  assert.equal(family.rating,'MV-90');assert.equal(family.temperature,90);assert.deepEqual(mvTemperatureOptions({mvFamily:id}).map(([v])=>v),[90]);assert.equal(family.rAt90Factor,undefined);assert.equal(family.frequency,60);assert.equal(family.frequencyAssumed,true);assert.equal(family.insulationLevel,'133%');
  assert.equal(family.revision,'PDN-0023-0713 · July 2013');assert.equal(family.url,'https://na.prysmian.com/sites/na.prysmian.com/files/media/documents/PDN-0023-0713_5-46kV%20TRXLPE%20URD%20(USA)_LR.pdf');
  assert.match(family.construction,/Compressed stranded copper/);assert.match(family.construction,/TRXLPE, one-third copper concentric neutral/);assert.match(family.construction,/optional UL MV-90 construction/);assert.match(family.label,/MV-90 option/);assert.match(family.model,/Positive-sequence R1 \/ X1.*direct-buried/);
  assert.deepEqual(mvArrangementOptions({mvFamily:id}).map(([v])=>v),['direct-buried-flat-7.5']);assert.match(family.assumptionNote,/ampacity.*impedance is assumed/);assert.match(family.assumptionNote,/flat 7\.5 in\. adjacent center spacing/);assert.match(family.assumptionNote,/short-circuited shields/);assert.match(family.assumptionNote,/UL MV-90 ordering option required/);assert.doesNotMatch(family.bonding,/at both ends|single.point|cross.bonded/i);
 });
 for(const [mvSize,rMicro,xMicro] of rows)for(const pf of [1,.95,.8,.5,.001])for(const [length,current] of [[1000,100],[137.25,47.125],[0,100],[1000,0]])test(`${id}/${mvSize}: independently transcribed 90°C direct-buried formula at PF ${pf}`,()=>{
  const p={...base,mvFamily:id,mvSize,mvTemperature:90,mvArrangement:'direct-buried-flat-7.5',voltage:Number(kv)*1000,pf,length,current},r=rMicro/1000,x=xMicro/1000,expected=Math.sqrt(3)*current*length/1000*(r*pf+x*Math.sqrt(1-pf*pf)),out=good(calc.drop(p));
  assert.equal(value(out,'Estimated voltage drop'),rounded(expected));assert.equal(value(out,'Percentage voltage drop'),rounded(100*expected/p.voltage));assert.equal(value(out,'Estimated voltage at end of run'),rounded(p.voltage-expected));assert.equal(value(out,'Series resistance R'),r);assert.equal(value(out,'Series reactance X'),x);assert.equal(row(out,'Series resistance R').displayValue,String(r));assert.equal(row(out,'Series reactance X').displayValue,String(x));assert.equal(value(out,'Calculation temperature'),90);assert.equal(value(out,'Temperature data'),undefined);
  bad(calc.drop({...p,mvTemperature:105}),/calculation temperature/);bad(calc.drop({...p,mvArrangement:'factory-3c-shorted'}),/arrangement/);assert.match(out.steps.join(' '),/60 Hz assumed/);assert.match(value(out,'Engineering assumptions'),/UL MV-90 ordering option required/);
 });
}
for(const kv of [5,15,25,35])test(`${kv} kV: incompatible factory-3C and buried-CN geometry never silently interchange`,()=>{
 const common={...base,mvSize:'1/0',voltage:kv*1000,mvTemperature:90};
 bad(calc.drop({...common,mvFamily:`mv105-epr-${kv*1000}`,mvArrangement:'direct-buried-flat-7.5'}),/arrangement/);
 bad(calc.drop({...common,mvFamily:`mv90-cn-${kv*1000}`,mvArrangement:'factory-3c-shorted'}),/arrangement/);
 const epr=good(calc.drop({...common,mvFamily:`mv105-epr-${kv*1000}`,mvArrangement:'factory-3c-shorted'})),cn=good(calc.drop({...common,mvFamily:`mv90-cn-${kv*1000}`,mvArrangement:'direct-buried-flat-7.5'}));
 assert.notEqual(value(epr,'Series resistance R'),value(cn,'Series resistance R'));assert.notEqual(value(epr,'Series reactance X'),value(cn,'Series reactance X'));
});
console.log(`${checks} MV cable engine cases passed: exact source rows, all catalog combinations, formula/precision, temperature versus voltage rating, scope guards, hidden-field isolation and legacy behavior.`);
