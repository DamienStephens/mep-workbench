import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import * as calc from './dist/calc.js';
import {transformerProtection,transformerProtectionLimits,transformerBreakerOptions,evaluateTransformerProtection} from './dist/transformer-protection.js';
import {createSnapshot,createRecordStore,summaryFromSnapshot} from './dist/calculation-records.js';
import {createPDF,pdfText} from './dist/pdf-report.js';

const rounded=n=>Number(n.toFixed(3));
const value=(r,label)=>r.results.find(x=>x.label===label)?.value;
const good=r=>{assert.equal(r.error,undefined,r.error);return r;};
const exactMethod=(r,expected)=>{
  good(r);
  assert.match(r.steps.join('\n'),expected);
  assert.doesNotMatch(r.steps.join('\n'),/1\.732/);
  return r;
};

// Independent winding selections must each show their actual symbolic factor.
for(const primaryPhase of [1,3,'1','3'])for(const secondaryPhase of [1,3,'1','3']){
  const p={kva:45,primary:480,secondary:240,primaryPhase,secondaryPhase};
  const r=good(calc.transformer(p));
  for(const [side,phase,voltage] of [['Primary',primaryPhase,p.primary],['Secondary',secondaryPhase,p.secondary]]){
    const factor=Number(phase)===3?Math.sqrt(3):1;
    assert.equal(value(r,`${side} full-load current`),rounded(p.kva*1000/(factor*voltage)));
    assert.ok(r.steps.find(s=>s.startsWith(side)).includes(`(${Number(phase)===3?'√3':'1'} × ${voltage})`));
  }
  assert.doesNotMatch(r.steps.join('\n'),/1\.732/);
}

// Both conversion directions retain full-precision math, with √3 in the method.
for(const phase of [1,3,'1','3'])for(const mode of ['wattsToAmps','ampsToWatts']){
  const p={phase,mode,value:mode==='wattsToAmps'?10000:30,voltage:480,pf:0.85};
  const factor=Number(phase)===3?Math.sqrt(3):1;
  const r=exactMethod(calc.amps(p),Number(phase)===3?/I = P \/ \(√3 × 480 × 0\.85\)/:/I = P \/ \(1 × 480 × 0\.85\)/);
  assert.equal(value(r,'Current'),rounded(mode==='wattsToAmps'?p.value/(factor*p.voltage*p.pf):p.value));
  assert.equal(value(r,'Real input power'),rounded(mode==='ampsToWatts'?factor*p.voltage*p.value*p.pf:p.value));
}

const protection={kva:15,phase:3,primary:480,secondary:208,protection:'dual',primaryOcpd:0,secondaryOcpd:0,configuration:'three-phase-4-wire',secondaryRule:'10ft',lengthFt:8,installationConfirmed:true,designLoad:15000/(Math.sqrt(3)*208),material:'copper',terminal:75,ambient:30,parallelSets:1};
for(const phase of [1,3,'1','3']){
  const p={...protection,phase,configuration:Number(phase)===3?'three-phase-4-wire':'single-phase-2-wire'};
  const pattern=Number(phase)===3?/\/ \(√3 × /:/\/ \(1 × /;
  const factor=Number(phase)===3?Math.sqrt(3):1;
  const pair=transformerBreakerOptions(p);
  assert.equal(pair.primaryCurrent,p.kva*1000/(factor*p.primary));
  assert.equal(pair.secondaryCurrent,p.kva*1000/(factor*p.secondary));
  for(const fn of [transformerProtection,transformerProtectionLimits,evaluateTransformerProtection]){
    const r=exactMethod(fn(p),pattern);
    assert.equal(value(r,'Primary full-load current'),rounded(pair.primaryCurrent));
    assert.equal(value(r,'Secondary full-load current'),rounded(pair.secondaryCurrent));
  }
  exactMethod(evaluateTransformerProtection({...p,ocpdCheckEnabled:true,primaryOcpd:40,secondaryOcpd:50}),pattern);
}

// A target between the true √3 result and a 1.732 approximation must fail.
// This proves selection/checks use unrounded factors, beyond displayed precision.
const drop={phase:3,voltage:208,target:3,material:'copper',size:'3',current:80};
const wire=calc.conductors.find(w=>w.size===drop.size);
const boundaryLength=drop.target*drop.voltage*wire.cm/(100*Math.sqrt(3)*12.9*drop.current);
const standalone=exactMethod(calc.drop({...drop,length:3*208*1000/(100*Math.sqrt(3)*.25*80)*(1+1e-6)}),/VD = √3 × I/);
assert.equal(value(standalone,'Voltage-drop guidance'),'Above 3% and below 5%');
assert.equal(standalone.results[0].status,'orange');
exactMethod(calc.drop({...drop,phase:1,voltage:240,length:100}),/VD = 2 × I/);

const sizing={ocpd:100,load:100,terminal:75,ambient:30,parallelSets:1,configuration:'three-phase-3-wire',material:'copper',voltageDropEnabled:true,phase:3,voltage:208,current:80,target:3,length:boundaryLength*(1+1e-6)};
for(const [fn,label] of [[calc.conductor,'Copper conductor per set'],[calc.service,'Copper service phase conductor per set']]){
  const r=exactMethod(fn(sizing),/Resistance-method VD = √3 × /);
  assert.equal(value(r,'Initial ampacity conductor per set'),'3 AWG');
  assert.equal(value(r,label),'2 AWG');
  exactMethod(fn({...sizing,configuration:'single-phase-2-wire',phase:1,voltage:240,length:100}),/Resistance-method VD = 2 × /);
}

// New snapshots retain √3 in text, and unambiguous ASCII sqrt(3) in PDF files.
const module={id:'transformer',title:'Transformer current',fields:[],limitations:[]};
const inputs={kva:45,primary:480,secondary:208,primaryPhase:3,secondaryPhase:3};
const snapshot=createSnapshot(module,inputs,calc.transformer(inputs),{projectName:'Root three precision',calculationName:'45 kVA',generatedAt:'2026-10-11T00:00:00.000Z'});
assert.match(summaryFromSnapshot(snapshot),/\/ \(√3 × 480\)/);
assert.doesNotMatch(summaryFromSnapshot(snapshot),/1\.732/);
assert.equal(pdfText('√3 × 208'),'sqrt3  x  208');
assert.equal(pdfText('Stored factor 1.732'),'Stored factor 1.732');
const bytes=createPDF(snapshot),pdf=new TextDecoder().decode(bytes);
assert.ok(pdf.includes('sqrt\\(3\\)'));
assert.doesNotMatch(pdf,/1\.732/);
const dir=mkdtempSync(join(tmpdir(),'mep-root-three-')),file=join(dir,'root-three.pdf');
writeFileSync(file,bytes);
const extracted=spawnSync('pdftotext',[file,'-'],{encoding:'utf8'});
if(!extracted.error){assert.equal(extracted.status,0,extracted.stderr);assert.match(extracted.stdout,/sqrt\(3\)/);assert.doesNotMatch(extracted.stdout,/1\.732/);}

// Old method strings are immutable records: reading, copying and exporting do
// not rewrite their numeric factor. Recalculation creates a separate new result.
const legacy=structuredClone(snapshot);
legacy.appVersion='2.4.0';
legacy.result.steps=legacy.result.steps.map(s=>s.replaceAll('√3','1.732'));
const storage={data:null,getItem(){return this.data;},setItem(key,text){this.data=text;}};
const store=createRecordStore(storage),record=store.save(legacy);
const storedBefore=storage.data,loaded=store.load(record.id).snapshot,loadedBefore=JSON.stringify(loaded);
assert.match(summaryFromSnapshot(loaded),/1\.732 × 480/);
assert.match(new TextDecoder().decode(createPDF(loaded)),/1\.732 x 480/);
assert.equal(JSON.stringify(loaded),loadedBefore);
assert.equal(storage.data,storedBefore);
exactMethod(calc.transformer(loaded.inputs),/\/ \(√3 × 480\)/);
assert.equal(storage.data,storedBefore);

// This digest was generated by the original v2.4.0 PDF exporter. Even legacy
// symbolic roots must retain their previous ASCII spelling and pagination.
const historicalRootSnapshot=createSnapshot({id:'drop',title:'Voltage drop',fields:[],limitations:[]},{phase:3},{results:[{label:'Voltage drop',value:1.732,unit:'V'}],steps:['VD = √3 × K × L × I / CM.','Historical factor = 1.732.'],warnings:[],sources:[]},{projectName:'Legacy √3',calculationName:'Original √3 method',appVersion:'2.4.0',generatedAt:'2026-10-10T00:00:00.000Z'});
assert.equal(createHash('sha256').update(createPDF(historicalRootSnapshot)).digest('hex'),'9d78b6a176669124860eef81277c8151756e4203b7ec783bbcfcac11c284e203');
for(const appVersion of ['2.0.0','2.4.0','unversioned']){
  const historical=structuredClone(historicalRootSnapshot);historical.appVersion=appVersion;
  const text=new TextDecoder().decode(createPDF(historical));
  assert.match(text,/sqrt3/);
  assert.ok(!text.includes('sqrt\\(3\\)'));
}
for(const appVersion of ['2.5.0','2.10.0','3.0.0']){
  const current=structuredClone(snapshot);current.appVersion=appVersion;
  assert.ok(new TextDecoder().decode(createPDF(current)).includes('sqrt\\(3\\)'));
}

// Prevent a future source-level substitution of a rounded three-phase factor.
for(const path of ['./dist/calc.js','./dist/transformer-protection.js']){
  const source=readFileSync(new URL(path,import.meta.url),'utf8');
  assert.doesNotMatch(source,/1\.732|\$\{(?:fmt\(f[12]?\)|round\(factor\))\}/);
  assert.match(source,/Math\.sqrt\(3\)/);
}
console.log('Square-root-three tests passed: exact math, symbolic methods, phase isolation, sizing boundaries, PDF output and historical snapshots.');
