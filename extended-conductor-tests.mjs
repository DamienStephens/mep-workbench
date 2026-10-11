import assert from 'node:assert/strict';
import * as calc from './legacy-conductor-fixtures.mjs';
let checks=0;
const expected=[
 {size:'600',cu:[350,420,475],al:[285,340,385],area:.8676,cm:600000},
 {size:'700',cu:[385,460,520],al:[315,375,425],area:.9887,cm:700000},
 {size:'750',cu:[400,475,535],al:[320,385,435],area:1.0496,cm:750000}
];
const value=(out,label)=>out.results.find(r=>r.label===label)?.value;
const rounded=n=>Number(n.toFixed(3));
assert.deepEqual(calc.conductors.slice(-3).map(w=>w.size),['600','700','750']);
assert.equal(calc.conductors.length,21);
assert.ok(!calc.conductors.some(w=>w.size==='740'));
for(const e of expected){
 const w=calc.conductors.find(w=>w.size===e.size);
 for(const [i,t] of [60,75,90].entries())for(const m of ['cu','al'])assert.equal(w[`${m}${t}`],e[m][i]);
 assert.equal(w.area,e.area);assert.equal(w.cm,e.cm);assert.equal(w.volume,undefined);checks++;
}
// Independent boundary oracle: when 600 is insufficient, select the first of
// 700/750 meeting BOTH terminal and corrected-insulation ampacity, or fail.
const coverage=new Set();
for(const module of ['conductor','service'])for(const material of ['copper','aluminum'])for(const [ti,terminal] of [60,75,90].entries())for(const [ambient,af] of [[30,1],[40,.91],[50,.82],[80,.41]])for(const [configuration,cf] of [['three-phase-3-wire',1],['three-phase-4-wire',.8]])for(const parallelSets of [1,2,3,5,6,7,8,9,10,13,20])for(const ocpd of [350,400,450,500,600,700,800,1000,1200,1600,2000,2500,3000,4000]){
 const metal=material==='copper'?'cu':'al';
 const capacity=e=>parallelSets*Math.min(e[metal][ti],e[metal][2]*af*cf);
 if(capacity(expected[0])>=ocpd)continue;
 const desired=expected.slice(1).find(e=>capacity(e)>=ocpd);
 const output=calc[module]({material,terminal,terminal90Confirmed:true,ambient,configuration,parallelSets,ocpd,load:ocpd});
 if(!desired){assert.match(output.error,/through 750 kcmil/);checks++;continue;}
 assert.equal(output.error,undefined);assert.equal(output.results[0].value,`${desired.size} kcmil`);
 assert.equal(value(output,module==='conductor'?'Combined usable ampacity':'Combined phase ampacity'),rounded(capacity(desired)));
 if(module==='conductor'){
  const egc=value(output,'Base-minimum Cu EGC per raceway').split(' ')[0];
  const ground=calc.conductors.find(w=>w.size===egc);
  const area=(cf===1?3:4)*desired.area+ground.area;
  assert.equal(value(output,'Conductor area per raceway incl. EGC'),rounded(area));
  const emt=calc.conduitSizes.find(c=>area<=.4*c.area);
  assert.equal(value(output,'Minimum EMT per set'),`${emt.size} in.`);
 }else assert.ok(output.results.every(r=>!/(EGC|EMT)/.test(r.label)));
 coverage.add(`${module}/${material}/${terminal}/${desired.size}`);checks++;
}
for(const module of ['conductor','service'])for(const material of ['copper','aluminum'])for(const terminal of [60,75,90])for(const size of ['700','750'])assert.ok(coverage.has(`${module}/${material}/${terminal}/${size}`));
for(const module of ['conductor','service']){
 const base={load:4000,terminal:90,terminal90Confirmed:true,ambient:30,configuration:'three-phase-3-wire',parallelSets:20};
 assert.equal(calc[module](base).error,undefined);
 assert.match(calc[module]({...base,load:4001}).error,/4000 A|OCPD rating/);
 assert.match(calc[module]({...base,ocpd:5000}).error,/4000 A|OCPD rating/);
 assert.match(calc[module]({...base,terminal90Confirmed:false}).error,/explicit verification/);
}
for(const e of expected.slice(1))for(const count of [1,2,3,4,5,6]){
 const fraction=count===1?.53:count===2?.31:.4;
 const area=e.area*count,emt=calc.conduitSizes.find(c=>area<=c.area*fraction);
 const out=calc.conduit({trade:'auto',rows:[{size:e.size,count}]});
 if(!emt)assert.match(out.error,/4-inch/);
 else {assert.equal(value(out,'Selected EMT'),`${emt.size} in.`);assert.equal(value(out,'Conductor area'),rounded(area));assert.equal(value(out,'Permitted fill'),fraction*100);assert.ok(out.steps[0].includes(area.toFixed(4)));}
 const small=calc.conduit({trade:'1/2',rows:[{size:e.size,count}]});assert.equal(value(small,'Fill check'),'Exceeds fill limit');checks++;
}
for(const material of ['copper','aluminum'])for(const phase of ['1','3']){
 const R=material==='copper'?.021:.031,f=phase==='1'?2:Math.sqrt(3);
 const out=calc.drop({size:'750',material,phase,voltage:480,length:500,current:300,pf:1,raceway:'steel'});
 assert.equal(out.error,undefined);assert.equal(value(out,'Estimated voltage drop'),rounded(f*R*500*300/1000));checks++;
 assert.match(calc.drop({size:'700',material,phase,voltage:480,length:500,current:300}).error,/No supported impedance/);checks++;
}
for(const size of ['740','800']){
 assert.ok(calc.conduit({trade:'auto',rows:[{size,count:1}]}).error);
 assert.ok(calc.drop({size,material:'copper',phase:'1',voltage:120,length:100,current:10,target:3}).error);
}
for(const size of ['700','750'])assert.match(calc.box({size,conductors:1,grounds:0,yokes:0,studs:0,volume:100,clamps:false}).error,/#14 through #6/);
console.log(`${checks} extended-conductor numerical/boundary checks passed; all Cu/Al temperature/size selections covered`);
