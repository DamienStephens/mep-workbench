import assert from 'node:assert/strict';
import {conductor,service,conductors,conduitSizes,circuitConfigurations} from './legacy-conductor-fixtures.mjs';
let checks=0;
const check=(x,msg)=>{assert.ok(x,msg);checks++;};
const eq=(a,b,msg)=>{assert.deepEqual(a,b,msg);checks++;};
const value=(r,l)=>r.results.find(x=>x.label===l)?.value;
const base={load:100,terminal:75,ambient:30,parallelSets:1,configuration:'three-phase-3-wire',material:'copper',voltageDropEnabled:true,phase:3,voltage:208,length:500,current:80,target:3};
const label=(p,isService)=>`${p.material==='aluminum'?'Aluminum':'Copper'}${isService?' service phase':''} conductor per set`;
const fromLabel=l=>conductors.find(w=>`${w.size} ${Number(w.size)>=250?'kcmil':'AWG'}`===l);
for(const fn of [conductor,service]){
 const p={...base};delete p.voltageDropEnabled;
 eq(fn(p),fn({...p,voltageDropEnabled:false,current:'bad',length:'bad',voltage:'bad',target:'bad'}),'Disabled inputs must not affect old result');
 for(const update of [{current:''},{current:undefined},{current:-1},{current:101},{current:Infinity},{length:-1},{length:''},{target:0},{target:101},{target:''},{phase:1},{phase:2},{voltage:120},{voltage:1001},{voltage:230,voltageMode:'custom'},{configuration:'split-phase-3-wire',phase:1,voltage:120}])check(fn({...base,...update}).error,`Reject ${JSON.stringify(update)}`);
 check(!fn({...base,voltage:230,voltageMode:'custom',voltageConfirmed:true}).error,'Confirmed custom voltage works');
 check(!fn({...base,configuration:'split-phase-3-wire',phase:1,voltage:240}).error,'Balanced split phase works');
 for(const zero of [{length:0},{current:0}]){
  const r=fn({...base,...zero});check(!r.error,'Zero length/current valid');eq(value(r,'Estimated drop'),0);eq(value(r,'Sizing basis'),'Ampacity / OCPD controls');
 }
 const unsupported=fn({...base,length:1e8});check(unsupported.error.includes('750 kcmil'),'Unsupported drop explicit');eq(unsupported.results,[],'No fallback result on unsupported drop');
}
const example=conductor(base);
eq(value(example,'Initial ampacity conductor per set'),'3 AWG');
eq(value(example,'Copper conductor per set'),'3/0 AWG');
eq(value(example,'Estimated voltage drop'),5.326);
eq(value(example,'Estimated drop'),2.561);
eq(value(example,'Modeled Cu EGC per raceway'),'2 AWG');
eq(value(example,'Minimum EMT per set'),'2 in.');
eq(value(example,'Actual fill per raceway'),27.399);
check(example.steps.join(' ').includes('separately entered'),'Current distinguished from sizing load');
check(example.warnings.join(' ').includes('reactance'),'Resistance-method limitation');
check(example.warnings.join(' ').includes('fault-path'),'Grounding limitation');
const oversizedGround={...base,load:4000,current:3500,parallelSets:20,voltage:480,length:1500};
const rejected=conductor(oversizedGround);
check(rejected.error?.includes('Cu EGC increase exceeds'),'No supported EGC blocked');
eq(rejected.results,[],'No positive conduit claim for unsupported EGC');
check(!service(oversizedGround).error,'Service independently succeeds without inventing an EGC');
// Independent sweep: selection, original ampacity floor, resistance formula, minimality,
// proportional grounding round-up, and physical fill with the actual EGC.
for(const material of ['copper','aluminum'])for(const configuration of Object.keys(circuitConfigurations))for(const sets of [1,2,4])for(const load of [60,100,200,400])for(const length of [0,100,500,1500])for(const fn of [conductor,service]){
 const phase=configuration.startsWith('three-phase')?3:1;
 const p={...base,material,configuration,parallelSets:sets,load,current:load*.8,length,phase,voltage:phase===3?480:240};
 const isService=fn===service,initial=fn({...p,voltageDropEnabled:false}),r=fn(p);
 if(initial.error){check(r.error,'Drop cannot repair unsupported ampacity');continue;}
 const initialWire=fromLabel(value(initial,label(p,isService))),K=material==='aluminum'?21.2:12.9,factor=phase===3?Math.sqrt(3):2;
 const rawDrop=w=>factor*K*length*(p.current/sets)/w.cm;
 const selected=conductors.find(w=>w.cm>=initialWire.cm&&100*rawDrop(w)/p.voltage<=p.target);
 if(!selected){check(r.error,'Exhausted conductor range rejects');continue;}
 const baseEGC=!isService?fromLabel(value(initial,'Base-minimum Cu EGC per raceway')):null;
 const ground=baseEGC?conductors.find(w=>w.cm>=baseEGC.cm*selected.cm/initialWire.cm):null;
 if(!isService&&!ground){check(r.error,'Exhausted EGC range rejects');continue;}
 check(!r.error,JSON.stringify(p));
 eq(fromLabel(value(r,label(p,isService))).size,selected.size,'Smallest conductor satisfying both criteria');
 eq(value(r,'Estimated voltage drop'),Number(rawDrop(selected).toFixed(3)),'Parallel current division / K');
 eq(value(r,'Initial ampacity conductor per set'),value(initial,label(p,isService)),'Original ampacity floor');
 check(value(r,isService?'Combined phase ampacity':'Combined usable ampacity')>=value(r,isService?'Total service OCPD':'Total OCPD'),'Ampacity preserved');
 if(isService){check(!r.results.some(x=>/EGC|EMT|fill/i.test(x.label)),'Service does not size grounding/conduit');continue;}
 eq(fromLabel(value(r,'Modeled Cu EGC per raceway')).size,ground.size,'EGC rounds up using final/initial CM ratio');
 const area=circuitConfigurations[configuration].physical*selected.area+ground.area;
 const emt=conduitSizes.find(c=>area<=c.area*.4);
 eq(value(r,'Minimum EMT per set'),emt?`${emt.size} in.`:'Over supported 4 in. range','Final EGC used in EMT fill');
 if(emt)eq(value(r,'Actual fill per raceway'),Number((100*area/emt.area).toFixed(3)),'Fill percent');
}
// Near-target boundary: select using raw values, never rounded display percentages.
const boundary={...base,length:100,target:3};
const initial=conductor({...boundary,voltageDropEnabled:false});
const w=fromLabel(value(initial,'Copper conductor per set'));
const exactLength=boundary.target*boundary.voltage*w.cm/(100*Math.sqrt(3)*12.9*boundary.current);
const below=conductor({...boundary,length:exactLength*(1-1e-10)});
const above=conductor({...boundary,length:exactLength*(1+1e-10)});
eq(value(below,'Copper conductor per set'),value(initial,'Copper conductor per set'),'Raw target below boundary');
check(value(above,'Copper conductor per set')!==value(initial,'Copper conductor per set'),'Raw target above boundary requires upsize');
console.log(`${checks} integrated ampacity/drop/EGC/service sizing checks passed.`);
