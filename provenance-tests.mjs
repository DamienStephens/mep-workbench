import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createSnapshot,summaryFromSnapshot,createRecordStore} from './dist/calculation-records.js';
import {createPDF} from './dist/pdf-report.js';
import * as calc from './dist/calc.js';
import {evaluateTransformerProtection, transformerProtectionSources} from './dist/transformer-protection.js';
import {cableTraySources,cableTrayDiameterReferences} from './dist/cable-tray.js';
import {nec2023Url,necVerificationDate,necSectionUrls} from './dist/code-references.js';
import {ambientReference} from './dist/ambient-helper.js';
const common={terminal:75,ambient:30,parallelSets:1,configuration:'three-phase-3-wire',material:'copper'};
const examples=[calc.conductor({...common,ocpd:20}),calc.service({...common,load:100,ocpd:0}),calc.conduit({trade:'auto',rows:[{size:'12',count:3}]}),calc.box({size:'12',conductors:4,grounds:2,yokes:1,studs:0,volume:30,clamps:false}),evaluateTransformerProtection({kva:75,phase:3,primary:480,secondary:208,protection:'dual'}),calc.tray({trayType:'ladder',service:'power',width:'auto',depth:3,voltage:600,rows:[{size:'12',count:3,od:1,arrangement:'flat'}]})];
for(const r of examples){assert.equal(r.error,undefined);assert.ok(r.warnings.every(w=>w.trim()&&!w.startsWith('Named modeled NEC provisions were checked')));const refs=r.sources.filter(s=>s.category==='NEC');assert.ok(refs.length);for(const s of refs){assert.match(s.url,/^https:\/\/link\.nfpa\.org\/publications\/70\/2023\//);assert.ok(['verified-modeled-provisions','separate-review-required'].includes(s.verificationStatus));if(s.verificationStatus==='verified-modeled-provisions'){assert.equal(s.verificationDate,necVerificationDate);assert.match(s.label,/modeled provisions checked against published text$/);}else{assert.equal(s.verificationDate,undefined);assert.match(s.label,/separate project review required/);}}assert.doesNotMatch(JSON.stringify(r.sources),/helu\.com|eaton\.com|docinfofiles|revize\.com/);}
for(const s of [...transformerProtectionSources,...cableTraySources])assert.match(s.url,/^https:\/\/link\.nfpa\.org\/publications\/70\/2023\//);
assert.equal(ambientReference,necSectionUrls.conductors);
for(const ref of Object.values(cableTrayDiameterReferences)){if(ref.estimated){assert.match(ref.label,/NEC Table 5 area-derived OD estimate/);assert.equal(ref.url,necSectionUrls.areas)}else{assert.match(ref.label,/Product dimensions, not code authority/);assert.match(ref.url,/southwire/);}}
const physics=calc.power({mode:'wattsToVA',watts:100,pf:1});assert.ok(physics.sources.every(s=>s.category==='Physics'));assert.ok(!physics.warnings.some(w=>w.startsWith('Named modeled NEC provisions were checked')));
for(const name of ['calc','transformer-protection','cable-tray','ambient-helper']){const source=fs.readFileSync(`dist/${name}.js`,'utf8');assert.doesNotMatch(source,/https:\/\/[^'"\s]*(?:helu\.com|eaton\.com|docinfofiles\.nfpa\.org)/);}
// Known prohibited arrangement: geometric fit must never yield a supported width.
for(const trayType of ['ladder','solid'])for(const arrangement of ['triangle','square'])for(const width of ['auto',6,36]){
 const r=calc.tray({trayType,service:'power',width,depth:3,voltage:600,rows:[{size:'4/0',count:arrangement==='triangle'?3:4,od:1,arrangement}]});
 assert.equal(r.status,'fail');assert.equal(r.arrangementProhibited,true);assert.equal(r.minimumWidth,null);assert.equal(r.selectedWidth,null);assert.ok(r.candidates.every(c=>!c.pass));assert.doesNotMatch(r.results[0].value,/Conditional/);
}
console.log('Provenance: bounded published-text checks, official destinations, physics/product separation and forbidden-stack selection regression passed.');

// New reports omit the removed notice without blank replacement warnings.
const removedNotice = /Named modeled NEC provisions were checked/;
for (const result of examples) {
 const snapshot=createSnapshot({id:'test',title:'Notice regression',fields:[],limitations:[]},{},result,{generatedAt:'2026-10-13T12:00:00.000Z'});
 assert.ok(snapshot.result.warnings.every(w=>w.trim()));
 assert.doesNotMatch(summaryFromSnapshot(snapshot),removedNotice);
 assert.doesNotMatch(new TextDecoder().decode(createPDF(snapshot)),removedNotice);
}
// Captured from v2.9.0 before this edit: archived reports retain their original content.
const historical=JSON.parse(fs.readFileSync(new URL('./legacy-notice-fixture.json',import.meta.url),'utf8'));
const original=JSON.stringify(historical), sha=value=>createHash('sha256').update(value).digest('hex');
assert.equal(historical.appVersion,'2.9.0');
assert.match(summaryFromSnapshot(historical),removedNotice);
assert.equal(sha(summaryFromSnapshot(historical)),'7abc6b2fa3c15fe4688d24d59801516eae07e293ecedaee1fad8632019c8ada5');
assert.equal(sha(createPDF(historical)),'2756242eaa6489480b41c05b6785e757a1bc3f578bd18667fe5ecbcf913ccf0e');
assert.equal(JSON.stringify(historical),original);
const data=new Map(),store=createRecordStore({getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)});
const saved=store.save(historical),savedBefore=JSON.stringify(saved.snapshot),savedPDF=createPDF(saved.snapshot);
store.rename(saved.id,{projectName:'Archived project',calculationName:'Archived box fill'});
assert.equal(JSON.stringify(store.load(saved.id).snapshot),savedBefore);
assert.deepEqual(createPDF(store.load(saved.id).snapshot),savedPDF);
console.log('Removed-notice regression: clean new summaries/PDFs and byte-identical historical reports passed.');
