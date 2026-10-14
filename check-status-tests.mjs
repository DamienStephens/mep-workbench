import assert from 'node:assert/strict';
import * as calc from './dist/calc.js';
import {transformerProtection,transformerProtectionLimits,evaluateTransformerProtection} from './dist/transformer-protection.js';
import {createSnapshot,createRecordStore} from './dist/calculation-records.js';

let checks=0;
const test=(name,fn)=>{try{fn();checks++;}catch(error){console.error(name);throw error;}};
const valid=result=>{assert.equal(result.error,undefined,result.error);return result;};
const row=(result,label)=>{const found=result.results.find(item=>item.label===label);assert.ok(found,`Missing ${label}`);return found;};
const status=(result,label,expected)=>{
 const metric=row(result,label);
 assert.equal(metric.status,expected,`${label} status`);
 assert.ok(metric.statusText,`${label} needs a readable check meaning`);
 assert.notEqual(metric.status,'orange',`${label} has no near-limit warning band`);
};
const neutral=(result,label)=>assert.equal(Object.hasOwn(row(result,label),'status'),false,`${label} has no established check`);
const conductorBase={ocpd:100,terminal:75,ambient:30,parallelSets:1,configuration:'three-phase-3-wire',material:'copper',racewayType:'emt'};
const transformerBase={kva:30,phase:1,primary:480,secondary:240,protection:'dual',primaryOcpd:125,secondaryOcpd:15,configuration:'single-phase-2-wire',secondaryRule:'10ft',lengthFt:10,installationConfirmed:true,designLoad:10,material:'copper',terminal:75,ambient:30,parallelSets:1};

// An exact boundary passes. Even sub-display and sub-selection-tolerance excess
// fails; neither current formatting nor three-decimal numeric outputs govern it.
for(const limit of [0.122,0.384,5.901,25,69.6,100,4000])for(const delta of [-1e-10,0,1e-10])test(`raw allowance ${limit} + ${delta}`,()=>{
 const check=calc.allowanceCheckStatus(limit+delta,limit);
 assert.equal(check.status,delta<=0?'green':'red');
 assert.equal(check.statusText,delta<=0?'Within allowance':'Exceeds allowance');
});
test('zero allowance equality is established',()=>assert.equal(calc.allowanceCheckStatus(0,0).status,'green'));
for(const bad of [undefined,null,NaN,Infinity,-Infinity,-1,'25'])test(`invalid comparison ${String(bad)}`,()=>{
 for(const [demand,allowance] of [[bad,25],[25,bad]])assert.deepEqual(calc.allowanceCheckStatus(demand,allowance),{statusText:'Check not established'});
});

// Use every published 40% allowance as written, including allowances whose
// ratio to rounded total area happens to display slightly above 40%.
for(const [type,{sizes}] of Object.entries(calc.conductorRaceways))for(const raceway of sizes)test(`${type} ${raceway.size} fill raw boundary`,()=>{
 for(const [offset,expected] of [[-1e-10,'green'],[0,'green'],[1e-10,'red']])assert.equal(calc.conductorFillStatus(raceway.fill40+offset,raceway),expected);
 assert.equal(calc.minimumConductorRaceway(type,raceway.fill40).size,raceway.size);
 assert.notEqual(calc.minimumConductorRaceway(type,raceway.fill40+1e-10)?.size,raceway.size);
});
for(const raceway of calc.conduitSizes)for(const fill of ['fill53','fill31','fill40'])test(`EMT ${raceway.size} ${fill} boundary`,()=>{
 for(const [offset,expected] of [[-1e-10,'green'],[0,'green'],[1e-10,'red']])assert.equal(calc.allowanceCheckStatus(raceway[fill]+offset,raceway[fill]).status,expected);
});
test('conductor sizing and exact ampacity equality are green',()=>{
 const result=valid(calc.conductor(conductorBase));
 assert.equal(row(result,'Combined usable ampacity').value,100);
 for(const label of ['Copper conductor per set','Combined usable ampacity','Usable ampacity per set','Minimum raceway per set','Actual fill per raceway'])status(result,label,'green');
 for(const label of ['Total OCPD','CCC per raceway','Permitted fill per raceway','Conductor area per raceway incl. EGC'])neutral(result,label);
});
test('published-cell IMC remains green above 40% displayed',()=>{
 const result=valid(calc.conductor({...conductorBase,ocpd:80,material:'aluminum',racewayType:'imc'}));
 assert.equal(row(result,'Actual fill per raceway').value,40.042);
 status(result,'Actual fill per raceway','green');status(result,'Minimum raceway per set','green');
});
test('known unsupported raceway is red despite passing ampacity',()=>{
 const result=valid(calc.conductor({...conductorBase,parallelSets:2,configuration:'three-phase-4-wire',racewayType:'pvc80',voltageDropEnabled:true,length:5000,current:80,target:3,phase:3,voltage:208}));
 status(result,'Minimum raceway per set','red');status(result,'Actual fill per raceway','red');status(result,'Combined usable ampacity','green');
 assert.equal(row(result,'Minimum raceway per set').value,'Over supported 4 in. range');
});
for(const material of ['copper','aluminum'])for(const configuration of Object.keys(calc.circuitConfigurations))for(const ambient of [30,55,75])for(const parallelSets of [1,2,4])test(`conductor ampacity ${material} ${configuration} ${ambient} ${parallelSets}`,()=>{
 const input={...conductorBase,material,configuration,ambient,parallelSets};
 const result=valid(calc.conductor(input));
 const selected=row(result,material==='copper'?'Copper conductor per set':'Aluminum conductor per set').value.split(' ')[0];
 const w=calc.conductors.find(item=>item.size===selected),prefix=material==='copper'?'cu':'al';
 const ambientFactor=ambient===30?1:ambient===55?.76:.5,cccFactor=configuration==='three-phase-4-wire'?.8:1;
 const usable=Math.min(w[`${prefix}75`],w[`${prefix}90`]*ambientFactor*cccFactor);
 assert.ok(parallelSets*usable>=input.ocpd);
 status(result,'Combined usable ampacity','green');status(result,'Usable ampacity per set','green');
 assert.equal(row(result,'Combined usable ampacity').value,Number((parallelSets*usable).toFixed(3)));
});
for(const load of [99.9999999999,100,100.0000000001])test(`service raw design-load boundary ${load}`,()=>{
 const input={...conductorBase,load,ocpd:0};
 const result=valid(calc.service(input));
 assert.equal(row(result,'Total service OCPD').value,load<=100?100:110);
 for(const label of ['Copper service phase conductor per set','Combined phase ampacity','Usable phase ampacity per set'])status(result,label,'green');
 for(const label of ['Design load','Neutral design','Grounding / bonding / conduit'])neutral(result,label);
 if(load>100)assert.ok(calc.service({...input,ocpd:100}).error,'An explicit device below raw demand cannot generate passing results');
});

// Real conductor schedules exactly at and one 0.0001-in² area unit either side
// of the published 4-inch EMT 40% allowance. All areas display as 5.901 in².
for(const [expectedArea,rows,expected] of [
 [5.9009,[{size:'14',count:599},{size:'12',count:3},{size:'6',count:1}],'green'],
 [5.901,[{size:'14',count:604},{size:'10',count:2}],'green'],
 [5.9011,[{size:'14',count:592},{size:'12',count:4},{size:'10',count:5}],'red']
])test(`EMT physical area ${expectedArea}`,()=>{
 const raw=rows.reduce((sum,r)=>sum+Math.round(calc.conductors.find(w=>w.size===r.size).area*10000)*r.count,0)/10000;
 assert.equal(raw,expectedArea);
 const result=valid(calc.conduit({trade:'4',rows}));
 assert.equal(row(result,'Conductor area').value,5.901);
 for(const label of ['Selected EMT','Actual fill','Fill check','Minimum EMT'])status(result,label,expected);
 assert.equal(row(result,'Fill check').value,expected==='green'?'Within fill limit':'Exceeds fill limit');
 neutral(result,'Permitted fill');
});
for(const [rows,expected] of [[[{size:'8',count:1}],'green'],[[{size:'4/0',count:1}],'red'],[[{size:'8',count:2}],'green'],[[{size:'6',count:2}],'red'],[[{size:'14',count:3},{size:'10',count:2},{size:'6',count:1}],'green']])test(`EMT 1/2 inch count ${JSON.stringify(rows)}`,()=>{
 const result=valid(calc.conduit({trade:'1/2',rows}));
 status(result,'Actual fill',expected);status(result,'Fill check',expected);
 status(result,'Minimum EMT','green'); // Its passing recommendation is independent of the selected raceway.
});
const boxBase={size:'12',conductors:5,grounds:4,yokes:1,studs:1,terminalBlocks:1,clamps:true};
const required=11*2.25;
for(const offset of [-1e-10,0,1e-10])test(`box volume boundary ${offset}`,()=>{
 const volume=required+offset,result=valid(calc.box({...boxBase,volume}));
 assert.equal(row(result,'Required box volume').value,required);
 assert.equal(Number(volume.toFixed(3)),required,'All three cases display the same rounded volume');
 for(const label of ['Required box volume','Available box volume','Volume check'])status(result,label,offset<0?'red':'green');
 neutral(result,'Volume allowances');neutral(result,'Volume per allowance');
});

// The transformer selector retains its historical floating-point tolerance.
// Semantic statuses deliberately do not inherit that tolerance: a real raw
// shortfall is red even when both displayed ampacities read exactly 25.0 A.
for(const [scale,expected] of [[1+2e-13,'green'],[1,'green'],[1-2e-13,'red']])test(`transformer ampacity raw equality ${scale}`,()=>{
 const input={...transformerBase,secondary:240*scale,secondaryMode:'custom',secondaryConfirmed:true};
 const rawRequired=125*(480/input.secondary)/10;
 assert.equal(rawRequired<=25,expected==='green');
 const result=valid(transformerProtection(input));
 assert.equal(row(result,'Required combined phase ampacity').displayValue,'25.0');
 assert.equal(row(result,'Combined usable phase ampacity').displayValue,'25.0');
 for(const label of ['Secondary phase conductor per set','Combined usable phase ampacity','Usable phase ampacity per set'])status(result,label,expected);
 for(const label of ['Primary full-load current','Secondary full-load current','Required combined phase ampacity','Maximum modeled primary OCPD','Maximum modeled secondary transformer OCPD','Neutral / grounding / bonding / conduit'])neutral(result,label);
 if(expected==='red')assert.ok(result.warnings.some(w=>w.includes('unrounded usable phase ampacity is below')));
});
for(const [scale,expected] of [[1+2e-13,'green'],[1,'green'],[1-2e-13,'red']])test(`transformer OCPD raw ceiling ${scale}`,()=>{
 const input={kva:4.8*scale,phase:1,primary:480,secondary:240,protection:'dual',primaryOcpd:25,secondaryOcpd:15,ocpdCheckEnabled:true};
 const rawCeiling=input.kva*1000/480*2.5;
 assert.equal(25<=rawCeiling,expected==='green');
 const result=valid(evaluateTransformerProtection(input));
 status(result,'Selected primary OCPD',expected);status(result,'Breaker pair status',expected);
});
test('unknown and unbounded transformer checks stay neutral',()=>{
 const basic=valid(transformerProtectionLimits(transformerBase));
 assert.ok(basic.results.every(metric=>!Object.hasOwn(metric,'status')));
 const partial=valid(evaluateTransformerProtection({...transformerBase,ocpdCheckEnabled:true,secondaryOcpd:0}));
 status(partial,'Selected primary OCPD','green');neutral(partial,'Breaker pair status');
 const primaryOnly=valid(evaluateTransformerProtection({...transformerBase,protection:'primary-only',primaryOcpd:80,ocpdCheckEnabled:true}));
 status(primaryOnly,'Selected primary OCPD','green');neutral(primaryOnly,'Selected secondary OCPD');neutral(primaryOnly,'Breaker pair status');
 assert.match(row(primaryOnly,'Selected secondary OCPD').statusText,/No Table 450\.3\(B\) secondary ceiling/);
 const unknown=transformerProtection({...transformerBase,installationConfirmed:false});
 valid(unknown);assert.match(unknown.warnings.join(' '),/unverified design assumption/);assert.doesNotMatch(unknown.steps.join(' '),/conditions explicitly confirmed/);
});
test('nameplate/current/power results without a comparison remain neutral',()=>{
 for(const result of [calc.transformer({kva:30,primary:480,secondary:240,primaryPhase:1,secondaryPhase:1}),calc.amps({mode:'wattsToAmps',value:2400,voltage:240,phase:1,pf:1}),calc.power({mode:'wattsToVA',watts:2400,pf:.9})]){
  valid(result);assert.ok(result.results.every(metric=>!Object.hasOwn(metric,'status')));
 }
});
test('voltage-drop orange guidance and separate target check remain unchanged',()=>{
 for(const [percent,expected] of [[3,'green'],[3.0004,'orange'],[4.9996,'orange'],[5,'red']])assert.equal(calc.dropStatus(percent),expected);
 const input={...conductorBase,ocpd:30,configuration:'single-phase-2-wire',voltageDropEnabled:true,current:20,length:4*240*10380/(100*2*12.9*20),voltage:240,phase:1,target:10};
 const result=valid(calc.conductor(input));
 assert.equal(row(result,'Estimated drop').status,'orange');assert.equal(row(result,'Target check').status,'green');
});
test('input objects and saved numeric results remain stable with semantic metadata',()=>{
 const input=structuredClone(transformerBase),before=JSON.stringify(input),result=valid(transformerProtection(input));
 assert.equal(JSON.stringify(input),before);
 const module={id:'protection',title:'Transformer protection',fields:[],limitations:[]};
 const snapshot=createSnapshot(module,input,result),frozen=JSON.stringify(snapshot);
 const memory=new Map(),store=createRecordStore({getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value)});
 const saved=store.save(snapshot);
 assert.deepEqual(store.load(saved.id).snapshot.result,result);
 result.results[0].status='red';result.results[0].value='changed';input.kva=999;
 assert.equal(JSON.stringify(snapshot),frozen);
 assert.equal(store.load(saved.id).snapshot.result.results[0].status,'green');
});
console.log(`${checks} semantic check cases passed: exact/raw boundaries, published fill cells, ampacity and volume checks, neutral unknowns, unchanged voltage-drop guidance and immutable snapshots.`);
