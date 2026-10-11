import assert from 'node:assert/strict';
import * as calc from './dist/calc.js';
import {createSnapshot,buildSummary,summaryFromSnapshot,createRecordStore,projectKey,projectNames,defaultCalculationName,RECORDS_KEY,CURRENT_APP_VERSION} from './dist/calculation-records.js';
const inputs={material:'copper',ocpd:100,configuration:'three-phase-4-wire',parallelSets:1,terminal:75,ambient:30,terminal90Confirmed:false};
const module={id:'conductor',title:'Conductor sizing',fields:[{key:'ocpd',label:'OCPD Rating',type:'number',unit:'A',min:.001},{key:'material',label:'Material',type:'select',options:[['copper','Copper']]},{key:'ambient',label:'Ambient',type:'number',unit:'°C',min:-10,max:80}],limitations:['General circuits only.']};
const result=calc.conductor(inputs),snapshot=createSnapshot(module,inputs,result,{projectName:'North Wing',calculationName:'Panel A',generatedAt:'2026-10-11T00:00:00.000Z'});
assert.equal(snapshot.appVersion,CURRENT_APP_VERSION);inputs.ocpd=200;assert.equal(snapshot.inputs.ocpd,100);result.results[0].value='changed';assert.notEqual(snapshot.result.results[0].value,'changed');
assert.match(summaryFromSnapshot(snapshot),/Total OCPD/);assert.match(summaryFromSnapshot(snapshot),/Base-minimum Cu EGC per raceway/);assert.match(summaryFromSnapshot(snapshot),/Minimum EMT per set/);assert.match(summaryFromSnapshot(snapshot),/Voltage drop: not calculated/);assert.match(summaryFromSnapshot(snapshot),/SOURCE/);
assert.throws(()=>createSnapshot(module,{...inputs,ocpd:''},result));assert.throws(()=>createSnapshot(module,inputs,{error:'failed',results:[]}));assert.throws(()=>createSnapshot(module,{...inputs,ocpd:Infinity},result));
let raw=null,quota=false;const storage={getItem(){return raw},setItem(k,v){assert.equal(k,RECORDS_KEY);if(quota)throw Error('quota');raw=v}};const store=createRecordStore(storage);
assert.deepEqual(store.list(),[]);const saved=store.save(snapshot,{projectName:'Project',calculationName:'Feeder'});assert.ok(saved.id);assert.equal(store.list().length,1);const loaded=store.load(saved.id);loaded.snapshot.inputs.ocpd=500;assert.equal(store.load(saved.id).snapshot.inputs.ocpd,100);
store.rename(saved.id,{projectName:'Other project',calculationName:'Other circuit'});assert.equal(store.load(saved.id).projectName,'Other project');assert.equal(store.load(saved.id).snapshot.projectName,'Project');store.trash(saved.id);assert.equal(store.list().length,0);assert.equal(store.list({includeTrashed:true}).length,1);store.restore(saved.id);assert.equal(store.list().length,1);
const before=raw;quota=true;assert.throws(()=>store.save(snapshot),/storage.*full/);assert.equal(raw,before);assert.throws(()=>store.trash(saved.id));assert.equal(raw,before);quota=false;
raw='{malformed';assert.throws(()=>store.list(),/damaged/);assert.throws(()=>store.save(snapshot),/damaged/);assert.equal(raw,'{malformed');raw=JSON.stringify({schemaVersion:2,records:[]});assert.throws(()=>store.save(snapshot),/unsupported/);assert.equal(JSON.parse(raw).schemaVersion,2);
raw=before;assert.throws(()=>store.rename(saved.id,{projectName:'x'.repeat(101),calculationName:'ok'}));assert.equal(raw,before);assert.throws(()=>store.load('missing'),/not found/);
const s=JSON.parse(raw);s.records[0].snapshot.inputs.ocpd=null;delete s.records[0].snapshot.result;raw=JSON.stringify(s);assert.throws(()=>store.list(),/damaged/);
const serviceInputs={...inputs,load:200};const service=createSnapshot({id:'service',title:'Service conductor sizing',fields:[],limitations:[]},serviceInputs,calc.service(serviceInputs));const summary=summaryFromSnapshot(service);assert.match(summary,/Service neutral, grounding, bonding and conduit fill: not calculated/);assert.doesNotMatch(summary,/Base-minimum Cu EGC per raceway:/);
assert.equal(buildSummary(module,snapshot.inputs,snapshot.result,{projectName:'North Wing',calculationName:'Panel A',generatedAt:snapshot.generatedAt}),summaryFromSnapshot(snapshot));
console.log('Saved calculation / summary tests passed');
const integratedInputs={...snapshot.inputs,voltageDropEnabled:true,length:500,current:80,target:3,voltage:480,phase:'3',voltageMode:'standard',voltageSystem:'auto'};
const integratedResult=calc.conductor(integratedInputs);assert.equal(integratedResult.error,undefined);
const integrated=createSnapshot(module,integratedInputs,integratedResult);const integratedText=summaryFromSnapshot(integrated);assert.match(integratedText,/Estimated voltage drop/);assert.doesNotMatch(integratedText,/Voltage drop: not calculated/);assert.match(integratedText,/Modeled Cu EGC per raceway/);
raw=null;for(let i=0;i<100;i++)store.save(snapshot,{projectName:'Limit test',calculationName:`Circuit ${i}`});const capped=raw;assert.throws(()=>store.save(snapshot),/100-calculation limit/);assert.equal(raw,capped);
const first=store.list()[0];assert.ok(first.snapshot.recordId);assert.ok(first.snapshot.savedAt);assert.match(summaryFromSnapshot(first.snapshot),/Saved record:/);
store.trashMany(store.list().map(record=>record.id));assert.equal(store.list().length,0);assert.equal(store.list({includeTrashed:true}).length,100);const fullTrash=raw;assert.throws(()=>store.save(snapshot),/100-calculation limit, including trash/);assert.equal(raw,fullTrash);store.restore(first.id);assert.equal(store.list().length,1);

// Project labels are reusable across spacing/case variants and include trash.
assert.equal(projectKey(' \t North   WING\n'),'north wing');
assert.equal(projectKey(' Ärea '),projectKey('äREA'));
assert.equal(projectKey(' \n '),'unassigned');
assert.deepEqual(projectNames([
  {projectName:'Zulu',trashedAt:null},
  {projectName:' North   Wing ',trashedAt:'2026-10-11T00:00:00.000Z'},
  {projectName:'north wing',trashedAt:null},
  {projectName:'Alpha Lab',trashedAt:null},
  {projectName:'',trashedAt:null},
  {projectName:'UNASSIGNED',trashedAt:null}
]),['Alpha Lab','North Wing','Unassigned','Zulu']);
assert.deepEqual(projectNames([]),[]);
let projectRaw=null,projectWrites=0,projectQuota=false;
const projectStorage={getItem(){return projectRaw},setItem(key,value){assert.equal(key,RECORDS_KEY);projectWrites++;if(projectQuota)throw Error('quota');projectRaw=value}};
const projects=createRecordStore(projectStorage);
const north=projects.save(snapshot,{projectName:'  North   Wing  ',calculationName:'Panel 1'});
assert.equal(north.projectName,'North Wing');assert.equal(north.snapshot.projectName,'North Wing');
const reused=projects.save(snapshot,{projectName:' north\tWING ',calculationName:'Panel 2'});
assert.equal(reused.projectName,'North Wing');
const south=projects.save(snapshot,{projectName:'South Wing',calculationName:'Panel 3'});
const southSnapshot=structuredClone(south.snapshot);
projects.rename(south.id,{projectName:' NORTH WING ',calculationName:'Renamed panel'});
assert.equal(projects.load(south.id).projectName,'North Wing');
assert.deepEqual(projects.load(south.id).snapshot,southSnapshot);
const trashProject=projects.save(snapshot,{projectName:'Archived Project',calculationName:'Old panel'});
projects.trash(trashProject.id);
const reuseTrash=projects.save(snapshot,{projectName:' archived   PROJECT ',calculationName:'New panel'});
assert.equal(reuseTrash.projectName,'Archived Project');
assert.deepEqual(projectNames(projects.list({includeTrashed:true})),['Archived Project','North Wing']);
projects.rename(reuseTrash.id,{projectName:' north wing ',calculationName:'Moved panel'});
assert.deepEqual(projectNames(projects.list({includeTrashed:true})),['Archived Project','North Wing']);
assert.deepEqual(projectNames(projects.list()),['North Wing']);

// Defaults use local date fields, seconds and the operation's one captured time.
const localDate=new Date(2031,0,2,3,4,5);
assert.equal(defaultCalculationName(localDate),'2031-01-02 03:04:05');
assert.throws(()=>defaultCalculationName(new Date('invalid')),/valid date/);
function withFixedNow(date,run) {
  const NativeDate=globalThis.Date,fixed=date.getTime();
  globalThis.Date=class extends NativeDate {
    constructor(...args){super(...(args.length?args:[fixed]));}
    static now(){return fixed;}
  };
  try {return run();} finally {globalThis.Date=NativeDate;}
}
const defaulted=withFixedNow(localDate,()=>{
  assert.equal(defaultCalculationName(),'2031-01-02 03:04:05');
  return projects.save(snapshot,{projectName:' \n ',calculationName:' \t '});
});
assert.equal(defaulted.projectName,'Unassigned');assert.equal(defaulted.calculationName,'2031-01-02 03:04:05');
assert.equal(defaulted.createdAt,localDate.toISOString());assert.equal(defaulted.snapshot.calculationName,defaulted.calculationName);
const renameDate=new Date(2031,0,2,3,4,6),defaultSnapshot=structuredClone(defaulted.snapshot);
const renameDefault=withFixedNow(renameDate,()=>projects.rename(defaulted.id,{projectName:'',calculationName:''}));
assert.equal(renameDefault.projectName,'Unassigned');assert.equal(renameDefault.calculationName,'2031-01-02 03:04:06');assert.equal(renameDefault.updatedAt,renameDate.toISOString());assert.deepEqual(renameDefault.snapshot,defaultSnapshot);
const blankSnapshot=structuredClone(snapshot);blankSnapshot.projectName='';blankSnapshot.calculationName='';
const blankSaved=withFixedNow(localDate,()=>projects.save(blankSnapshot));assert.equal(blankSaved.projectName,'Unassigned');assert.equal(blankSaved.calculationName,'2031-01-02 03:04:05');
for(const invalidNames of [{projectName:12,calculationName:'Circuit'},{projectName:'Project',calculationName:12},{projectName:'Project',calculationName:'x'.repeat(101)}]) {
  const unchanged=projectRaw;
  assert.throws(()=>projects.save(snapshot,invalidNames),/must contain/);
  assert.throws(()=>projects.rename(north.id,invalidNames),/must contain/);
  assert.equal(projectRaw,unchanged);
}

// Bulk clearing is one recoverable write and does not change historical reports.
const selected=[north.id,reused.id,south.id];
const originals=selected.map(id=>projects.load(id));
const untouched=projects.load(trashProject.id),writesBefore=projectWrites;
const bulkDate=new Date(2031,0,2,3,5,0);
const trashed=withFixedNow(bulkDate,()=>projects.trashMany([...selected,north.id]));
assert.equal(projectWrites,writesBefore+1);assert.equal(trashed.length,3);
assert.deepEqual(trashed.map(record=>record.id),selected);
for(let index=0;index<trashed.length;index++) {
  const record=trashed[index];
  assert.equal(record.trashedAt,bulkDate.toISOString());assert.equal(record.updatedAt,record.trashedAt);
  assert.equal(record.createdAt,originals[index].createdAt);assert.deepEqual(record.snapshot,originals[index].snapshot);
  assert.equal(projects.list().some(active=>active.id===record.id),false);
}
assert.deepEqual(projects.load(trashProject.id),untouched);
trashed[0].snapshot.inputs.ocpd=999;assert.deepEqual(projects.load(north.id).snapshot,originals[0].snapshot);
const restoreDate=new Date(2031,0,2,3,6,0);
withFixedNow(restoreDate,()=>{
  for(const original of originals) {
    const restored=projects.restore(original.id);
    assert.equal(restored.trashedAt,null);assert.equal(restored.updatedAt,restoreDate.toISOString());
    assert.equal(restored.projectName,original.projectName);assert.equal(restored.calculationName,original.calculationName);assert.equal(restored.createdAt,original.createdAt);
    assert.deepEqual(restored.snapshot,original.snapshot);
  }
});
const atomicBefore=projectRaw,atomicWrites=projectWrites;
for(const invalidIds of [[north.id,'missing'],['missing',north.id],[north.id,null],[north.id,''],[north.id,17],north.id,null,undefined]) {
  assert.throws(()=>projects.trashMany(invalidIds),/not found|valid saved calculation IDs/);
  assert.equal(projectRaw,atomicBefore);assert.equal(projectWrites,atomicWrites);
}
assert.deepEqual(projects.trashMany([]),[]);assert.equal(projectWrites,atomicWrites);
projectQuota=true;assert.throws(()=>projects.trashMany(selected),/storage.*full/);assert.equal(projectRaw,atomicBefore);projectQuota=false;
assert.deepEqual(projects.load(north.id).snapshot,originals[0].snapshot);assert.equal(projects.load(north.id).trashedAt,null);
projectRaw='{malformed';assert.throws(()=>projects.trashMany(selected),/damaged/);assert.equal(projectRaw,'{malformed');projectRaw=atomicBefore;
assert.equal('delete' in projects,false);assert.equal('clear' in projects,false);
console.log('Saved project reuse, timestamp defaults, atomic bulk trash and restore tests passed');
