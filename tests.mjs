import assert from 'node:assert/strict';
import * as calc from './legacy-conductor-fixtures.mjs';
let passed=0, failed=0;
function test(name, fn) { try { fn(); passed++; } catch(e) { failed++; console.error(`FAIL ${name}: ${e.message}`); } }
function valid(r) { assert.equal(r.error,undefined,r.error); for (const key of ['results','steps','warnings','sources']) assert.ok(Array.isArray(r[key]),key); assert.ok(r.results.length); for(const x of r.results) if(typeof x.value==='number') assert.ok(Number.isFinite(x.value),`${x.label} must be finite; got ${x.value}`); assert.ok(!/\bNaN\b|\bInfinity\b/.test(JSON.stringify(r))); return r; }
function value(r,label) { valid(r); const x=r.results.find(r=>r.label===label); assert.ok(x,`Missing result ${label}`); return x.value; }
function equal(r,label,v) { assert.equal(value(r,label),v); }
function near(r,label,v,tolerance=.00051) { const actual=value(r,label); assert.ok(Math.abs(actual-v)<=tolerance,`${actual} != ${v}`); }
function invalid(r) { assert.ok(typeof r.error==='string'&&r.error.length,'Expected descriptive validation error'); assert.deepEqual(r.results,[]); }
const c={load:20,terminal:75,ambient:30,configuration:'three-phase-3-wire',parallelSets:1,ocpd:0,material:'copper'};
const t={kva:7.5,primary:480,secondary:240,primaryPhase:'1',secondaryPhase:'1'};
const p={mode:'wattsToVA',watts:1000,va:1250,pf:.8};
const a={mode:'wattsToAmps',value:1920,voltage:120,pf:.8,phase:'1'};
const d={size:'12',length:100,current:20,voltage:120,pf:1,raceway:'steel',material:'copper',phase:'1'};
const b={size:'12',conductors:4,grounds:4,yokes:1,studs:0,clamps:false,volume:20};
test('nine calculation functions exported',()=>assert.deepEqual(Object.entries(calc).filter(([,v])=>typeof v==='function'&&![calc.allowanceCheckStatus,calc.migrateCableTrayState,calc.setTrayArrangement,calc.trayPhysicalCount,calc.conductorFillStatus,calc.minimumConductorRaceway,calc.migrateConductorState,calc.migrateDropState,calc.dropStatus,calc.mvPresetImpedance,calc.mvCableOptions,calc.mvSizeOptions,calc.mvArrangementOptions,calc.mvTemperatureOptions].includes(v)).map(([k])=>k).sort(),['amps','box','conductor','conduit','drop','power','service','transformer','tray']));
test('#1 copper 90C table = 145 A',()=>assert.equal(calc.conductors.find(w=>w.size==='1').cu90,145));
for(const [load,size,breaker] of [[1,'14',10],[15,'14',15],[16,'12',20],[20,'12',20],[21,'10',25],[26,'10',30],[31,'8',35],[50,'8',50]]) test(`conductor ${load} A small-wire caps`,()=>{let r=calc.conductor({...c,load});equal(r,'Copper conductor per set',`${size} AWG`);equal(r,'Total OCPD',breaker);});
test('single design load has no hidden multiplier',()=>{const r=calc.conductor({...c,load:30});assert.ok(!r.results.some(x=>x.label==='Design load'));equal(r,'Total OCPD',30);equal(r,'Copper conductor per set','10 AWG');});
test('60C terminal ampacity respected',()=>equal(calc.conductor({...c,load:50,terminal:60}),'Copper conductor per set','6 AWG'));
test('CCC derating chooses #10',()=>equal(calc.conductor({...c,load:25,configuration:'three-phase-4-wire'}),'Copper conductor per set','10 AWG'));
test('ambient correction chooses #8',()=>equal(calc.conductor({...c,load:30,ambient:60}),'Copper conductor per set','8 AWG'));
test('combined correction 90C baseline',()=>near(calc.conductor({...c,load:40,ambient:40,configuration:'three-phase-4-wire'}),'Combined usable ampacity',40.04));
test('explicit OCPD upsizes conductor',()=>equal(calc.conductor({...c,ocpd:50}),'Copper conductor per set','8 AWG'));
test('EGC rating 100A',()=>equal(calc.conductor({...c,load:100}),'Base-minimum Cu EGC per raceway','8 AWG'));
for(const delta of [{load:-1},{continuous:-1},{load:0},{load:NaN},{load:Infinity},{load:'garbage'},{terminal:100},{ccc:0},{ccc:101},{ccc:3.5},{ambient:-11},{ambient:81},{material:'steel'},{ocpd:17},{load:601},{load:600}]) test(`invalid conductor ${JSON.stringify(delta)}`,()=>invalid(calc.conductor({...c,...delta})));
test('transformer 7.5kVA 480/240 single phase',()=>{const r=calc.transformer(t);equal(r,'Primary full-load current',15.625);equal(r,'Secondary full-load current',31.25);});
test('transformer balanced three phase',()=>{const r=calc.transformer({...t,primaryPhase:3,secondaryPhase:3});near(r,'Primary full-load current',7500/(Math.sqrt(3)*480));near(r,'Secondary full-load current',7500/(Math.sqrt(3)*240));});
test('transformer independently chosen phases',()=>{const r=calc.transformer({...t,primaryPhase:3});near(r,'Primary full-load current',7500/(Math.sqrt(3)*480));equal(r,'Secondary full-load current',31.25);});
for(const delta of [{kva:0},{kva:-1},{kva:NaN},{primary:0},{secondary:-1},{primary:Infinity},{primaryPhase:2},{secondaryPhase:'2'},{primaryPhase:null},{secondaryPhase:undefined}]) test(`invalid transformer ${JSON.stringify(delta)}`,()=>invalid(calc.transformer({...t,...delta})));
test('W to VA',()=>{equal(calc.power(p),'Apparent power',1250);equal(calc.power(p),'Real power',1000);});
test('VA to W',()=>equal(calc.power({...p,mode:'vaToWatts'}),'Real power',1000));
test('zero power accepted',()=>equal(calc.power({...p,watts:0}),'Apparent power',0));
test('unity PF',()=>equal(calc.power({...p,pf:1}),'Apparent power',1000));
for(const delta of [{pf:0},{pf:-.1},{pf:1.01},{pf:NaN},{watts:-1},{watts:Infinity},{watts:'x'},{mode:'unknown'}]) test(`invalid power ${JSON.stringify(delta)}`,()=>invalid(calc.power({...p,...delta})));
test('watts to amps',()=>{equal(calc.amps(a),'Current',20);equal(calc.amps(a),'Apparent power',2400);});
test('amps to watts',()=>equal(calc.amps({...a,mode:'ampsToWatts',value:20}),'Real input power',1920));
test('three-phase watts to amps',()=>near(calc.amps({...a,phase:3,voltage:480}),'Current',1920/(Math.sqrt(3)*480*.8)));
test('three-phase amps to watts',()=>near(calc.amps({...a,phase:3,voltage:480,mode:'ampsToWatts',value:20}),'Real input power',Math.sqrt(3)*480*20*.8));
test('zero current',()=>equal(calc.amps({...a,value:0}),'Current',0));
for(const delta of [{pf:0},{pf:1.1},{pf:NaN},{value:-1},{voltage:0},{voltage:Infinity},{phase:2},{phase:'three'},{mode:'unknown'},{value:'x'}]) test(`invalid amps ${JSON.stringify(delta)}`,()=>invalid(calc.amps({...a,...delta})));
for(const [count,limit] of [[1,53],[2,31],[3,40]]) test(`conduit ${count}-conductor fill limit`,()=>equal(calc.conduit({rows:[{size:'12',count}],trade:'auto'}),'Permitted fill',limit));
test('conduit mixed rows includes every conductor',()=>{const r=calc.conduit({rows:[{size:'12',count:3},{size:'10',count:1}],trade:'1/2'});near(r,'Actual fill',(.0133*3+.0211)/.304*100);equal(r,'Fill check','Within fill limit');});
test('conduit explicit undersized EMT fails fill check',()=>equal(calc.conduit({rows:[{size:'4/0',count:3}],trade:'1/2'}),'Fill check','Exceeds fill limit'));
test('conduit auto sizing > half inch',()=>equal(calc.conduit({rows:[{size:'4/0',count:3}],trade:'auto'}),'Selected EMT','2 in.'));
for(const args of [{rows:[],trade:'auto'},{rows:[{size:'12',count:0}],trade:'auto'},{rows:[{size:'unknown',count:1}],trade:'auto'},{rows:[{size:'12',count:-1}],trade:'auto'},{rows:[{size:'12',count:1.5}],trade:'auto'},{rows:[{size:'12',count:1001}],trade:'auto'},{rows:[{size:'12',count:NaN}],trade:'auto'},{rows:[{size:'4/0',count:1000}],trade:'auto'},{rows:[{size:'12',count:1}],trade:'5'}]) test(`invalid conduit ${JSON.stringify(args)}`,()=>invalid(calc.conduit(args)));
test('voltage drop copper single phase',()=>{const r=calc.drop(d);near(r,'Estimated voltage drop',2*2*100*20/1000);near(r,'Percentage voltage drop',100*2*2*100*20/1000/120);equal(r,'Voltage-drop guidance','At or above 5%');});
test('voltage drop three phase',()=>near(calc.drop({...d,phase:3,voltage:208}),'Estimated voltage drop',Math.sqrt(3)*2*100*20/1000));
test('voltage drop aluminum',()=>near(calc.drop({...d,material:'aluminum'}),'Estimated voltage drop',2*3.2*100*20/1000));
test('zero length drop',()=>equal(calc.drop({...d,length:0}),'Estimated voltage drop',0));
test('zero current drop',()=>equal(calc.drop({...d,current:0}),'Voltage-drop guidance','At or below 3%'));
for(const delta of [{size:'bad'},{length:-1},{current:-1},{voltage:0},{pf:0},{pf:1.01},{length:Infinity},{current:NaN},{material:'steel'},{phase:2}]) test(`invalid drop ${JSON.stringify(delta)}`,()=>invalid(calc.drop({...d,...delta})));
for(const [grounds,units] of [[0,0],[1,1],[4,1],[5,1.25],[8,2]]) test(`box ${grounds} ground allowances`,()=>{const r=calc.box({...b,conductors:1,yokes:0,grounds});equal(r,'Volume allowances',1+units);near(r,'Required box volume',(1+units)*2.25);});
test('box yokes count twice',()=>equal(calc.box({...b,conductors:0,grounds:0,yokes:2}),'Volume allowances',4));
test('box clamps count once',()=>equal(calc.box({...b,conductors:1,grounds:0,yokes:0,clamps:true}),'Volume allowances',2));
for(const [size,volume] of [['14',2],['12',2.25],['10',2.5],['8',3],['6',5]]) test(`box AWG ${size} volume`,()=>equal(calc.box({...b,size,conductors:1,grounds:0,yokes:0}),'Required box volume',volume));
test('box exact volume passes',()=>equal(calc.box({...b,volume:15.75}),'Volume check','Sufficient volume'));
test('box insufficient volume',()=>equal(calc.box({...b,volume:15}),'Volume check','Insufficient volume'));
for(const delta of [{size:'4'},{size:'bad'},{conductors:-1},{grounds:1.5},{yokes:NaN},{studs:-1},{volume:-1},{volume:Infinity},{conductors:0,grounds:0,yokes:0}]) test(`invalid box ${JSON.stringify(delta)}`,()=>invalid(calc.box({...b,...delta})));
for(const studs of [0,1,2]) test(`box support types ${studs}`,()=>equal(calc.box({...b,conductors:1,grounds:0,yokes:0,studs}),'Volume allowances',1+studs));
test('invalid box support type count',()=>invalid(calc.box({...b,studs:3})));
test('350 kcmil conductor for 300A load',()=>equal(calc.conductor({...c,load:300}),'Copper conductor per set','350 kcmil'));
test('600 kcmil conductor for 400A load',()=>equal(calc.conductor({...c,load:400}),'Copper conductor per set','600 kcmil'));
for(const [name,args] of [['transformer',{...t,kva:1e308}],['power',{...p,pf:1e-308}],['amps',{...a,mode:'ampsToWatts',value:1e308}],['drop',{...d,length:1e308}],['box',{...b,conductors:1e308}]]) test(`${name} rejects output overflow`,()=>invalid(calc[name](args)));
for(const [name,base,fields] of [['conductor',c,['load','terminal','ambient','parallelSets']],['transformer',t,['kva','primary','secondary']],['power',p,['watts','pf']],['amps',a,['value','voltage','pf']],['drop',d,['length','current','voltage','pf']],['box',b,['conductors','grounds','yokes','studs','volume']]]) {
 for(const field of fields) for(const empty of ['',null,undefined,'  ']) test(`${name} rejects empty ${field} ${JSON.stringify(empty)}`,()=>invalid(calc[name]({...base,[field]:empty})));
 test(`${name} rejects missing object`,()=>invalid(calc[name]()));
}
for(const count of ['',null,undefined]) test(`conduit rejects blank row ${count}`,()=>invalid(calc.conduit({rows:[{size:'12',count}],trade:'auto'})));
// Deterministic cross-module sweep: every successful numeric result must stay finite.
for(const configuration of Object.keys(calc.circuitConfigurations)) for(const ambient of [-10,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80]) test(`conductor boundary ${configuration} ambient${ambient}`,()=>{
 const r=calc.conductor({...c,load:10,configuration,ambient}); valid(r); assert.ok(value(r,'Combined usable ampacity')>=value(r,'Total OCPD')); assert.ok(!r.results.some(x=>x.label==='Design load'));
});
for(const phase of [1,3,'1','3']) test(`phase encoding ${JSON.stringify(phase)}`,()=>{
 valid(calc.transformer({...t,primaryPhase:phase,secondaryPhase:phase})); valid(calc.amps({...a,phase,voltage:Number(phase)===3?208:120})); valid(calc.drop({...d,phase,voltage:Number(phase)===3?208:120}));
});
for(const f of ['conductor','transformer','power','amps','conduit','drop','box']) test(`${f} rejects null parameter`,()=>invalid(calc[f](null)));
console.log(`${passed} passed; ${failed} failed`);
process.exitCode=failed?1:0;
