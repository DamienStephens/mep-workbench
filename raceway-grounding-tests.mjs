import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as calc from './dist/calc.js';
import {createSnapshot,copySummaryFromSnapshot,summaryFromSnapshot} from './dist/calculation-records.js';
import {createPDF} from './dist/pdf-report.js';
const fixture=JSON.parse(fs.readFileSync('raceway-table-fixture.json','utf8'));
const val=(r,l)=>r.results.find(x=>x.label===l)?.value;
const wire=label=>calc.conductors.find(w=>w.size===label.split(' ')[0]);
const base={ocpd:100,terminal:75,ambient:30,configuration:'three-phase-3-wire',parallelSets:1,material:'copper'};
let checks=0;
for(const [type,data] of Object.entries(fixture.raceways)){
 const key=type.toLowerCase(),raceway=calc.conductorRaceways[key];
 assert.deepEqual(raceway.sizes.map(x=>[x.size,x.area,x.fill40]),data.rows);
 for(const [i,[size,,limit]] of data.rows.entries()){
  assert.equal(calc.minimumConductorRaceway(key,limit).size,size);
  assert.equal(calc.minimumConductorRaceway(key,limit-1e-8).size,size);
  assert.equal(calc.minimumConductorRaceway(key,limit+1e-8)?.size,data.rows[i+1]?.[0]);checks+=3;
 }
 for(const material of ['copper','aluminum'])for(const configuration of Object.keys(calc.circuitConfigurations))for(const parallelSets of [1,2,4])for(const ocpd of [20,100,200,400,1000])for(const voltageDropEnabled of [false,true]){
  const input={...base,racewayType:key,material,configuration,parallelSets,ocpd,voltageDropEnabled,length:700,current:ocpd*.8,target:3,phase:configuration.startsWith('three-phase')?3:1,voltage:configuration.startsWith('three-phase')?480:240};
  const r=calc.conductor(input);if(r.error)continue;
  const phase=wire(r.results[0].value),ground=wire(val(r,r.conservativeGrounding?'Conservative Cu EGC per raceway':voltageDropEnabled?'Modeled Cu EGC per raceway':'Base-minimum Cu EGC per raceway'));
  const area=(calc.circuitConfigurations[configuration].physical*Math.round(phase.area*10000)+Math.round(ground.area*10000))/10000;
  const expected=data.rows.find(row=>area<=row[2]);
  assert.equal(val(r,'Minimum raceway per set'),expected?`${expected[0]} in.`:'Over supported 4 in. range');
  assert.equal(val(r,'Raceway type'),raceway.label);
  assert.ok(r.sources.some(s=>s.url===data.url&&s.label.includes(raceway.label)));
  assert.equal(val(r,'Conductor area per raceway incl. EGC'),Number(area.toFixed(3)));
  assert.equal(r.groundingReviewRequired,false);
  assert.doesNotMatch(JSON.stringify([r.results,r.steps,r.warnings]),/provisional|MANUAL EGC REVIEW/);
  if(r.conservativeGrounding){
   const baseGround=wire(val(r,'Base-minimum Cu EGC per raceway'));
   assert.equal(ground.cm,Math.max(phase.cm,baseGround.cm));
   assert.ok(r.steps.some(s=>s.includes('not a calculated NEC minimum')));
   assert.equal(val(r,'EGC proportional increase'),undefined);
  }
  assert.equal(val(r,'Actual fill per raceway'),expected?Number((100*area/expected[1]).toFixed(3)):'No supported raceway');checks++;
 }
}
assert.deepEqual(calc.conductor(base),calc.conductor({...base,racewayType:'emt'}),'Old inputs preserve EMT default');
for(const racewayType of ['',null,'steel','__proto__','constructor'])assert.ok(calc.conductor({...base,racewayType}).error);
// Known non-floor values unchanged; floor selection uses final full-size EGC.
const normal=calc.conductor(base);assert.equal(val(normal,'Copper conductor per set'),'3 AWG');assert.equal(val(normal,'Base-minimum Cu EGC per raceway'),'8 AWG');
for(const material of ['copper','aluminum'])for(const enabled of [false,true]){
 const r=calc.conductor({...base,parallelSets:2,material,voltageDropEnabled:enabled,length:1000,current:80,target:3,phase:3,voltage:208});
 assert.equal(r.conservativeGrounding,true);assert.equal(val(r,'Conservative Cu EGC per raceway'),r.results[0].value);
}
const result=calc.conductor({...base,racewayType:'pvc80',parallelSets:2});
const snapshot=createSnapshot({id:'conductor',title:'Conductor sizing',fields:[],limitations:['Unique scope note']},{...base,racewayType:'pvc80'},result,{generatedAt:'2030-01-01T00:00:00Z'});
const before=JSON.stringify(snapshot),copy=copySummaryFromSnapshot(snapshot),full=summaryFromSnapshot(snapshot),pdf=new TextDecoder().decode(createPDF(snapshot));
assert.match(copy,/INPUTS/);assert.match(copy,/OUTPUTS/);assert.match(copy,/Conservative Cu EGC/);assert.match(copy,/Raceway type: PVC Schedule 80/);
assert.doesNotMatch(copy,/METHOD|ASSUMPTIONS|SOURCES|Unique scope note|Design aid|Conservative parallel-floor grounding/);
assert.match(full,/METHOD/);assert.match(full,/Unique scope note/);assert.match(pdf,/Unique scope note/);
assert.doesNotMatch(full,/checked[^\n]*2026-10-13/);assert.doesNotMatch(pdf,/checked[^\n]*2026-10-13/);assert.equal(JSON.stringify(snapshot),before);
console.log(`${checks} raceway boundaries, selections, Cu/Al parallel-floor EGC, report and concise clipboard checks passed.`);
