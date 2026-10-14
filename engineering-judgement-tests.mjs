// Modeled UI/report text contracts. Real-browser visual and interaction QA is separate.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import * as calc from './dist/calc.js';
import {systemOptions,voltageOptions} from './dist/voltage.js';
import {createSnapshot,buildSummary,summaryFromSnapshot,copySummaryFromSnapshot,createRecordStore,projectKey,projectNames,engineeringReviewNote,CURRENT_APP_VERSION} from './dist/calculation-records.js';
import {createDashboardStore} from './dist/dashboard.js';
import {createPDF} from './dist/pdf-report.js';
import {transformerProtection,evaluateTransformerProtection,migrateProtectionState,transformerBreakerOptions,transformerOcpdRatings,secondaryRuleConditions} from './dist/transformer-protection.js';

const sentence='Not a substitute for electrical engineer or electrician judgement.';
const baseline='NEC 2023 baseline · Verify adopted code, equipment listings and site conditions.';
const obsolete='Final licensed NEC 2023 protection text was not independently accessed.';
const count=(text,part)=>text.split(part).length-1;
const source=fs.readFileSync(new URL('./dist/app.js',import.meta.url),'utf8').replace(/^import[^\n]+\n/gm,'').replace(/route\(\);\s*$/,'');
const data=new Map(),storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
const nodes={},copied=[],pdfs=[],handlers={};
for(const key of ['#main','#navigation','#calculator-form','#results','#sources','#reset','#print','#copy-summary','#export-pdf','#save-calculation','#action-status','#storage-status','#clear-all-calculations','#saved-heading','#all-tools','#add-row']){
 nodes[key]={innerHTML:'',textContent:'',focus(){},addEventListener:(name,fn)=>handlers[name]=fn,querySelector:()=>null};
}
const context=vm.createContext({
 calc,systemOptions,voltageOptions,createSnapshot,buildSummary,summaryFromSnapshot,copySummaryFromSnapshot,projectKey,projectNames,
 createRecordStore:()=>createRecordStore(storage),createDashboardStore:()=>createDashboardStore(storage),
 transformerProtection,evaluateTransformerProtection,migrateProtectionState,transformerBreakerOptions,transformerOcpdRatings,secondaryRuleConditions,
 showRecordDialog(){},confirmRecordClear(){},closeRecordDialog(){},downloadPDF:snapshot=>pdfs.push(snapshot),attachAmbientHelper(){},
 structuredClone,console,localStorage:storage,location:{hash:''},navigator:{clipboard:{writeText:async text=>copied.push(text)}},
 window:{addEventListener(){},scrollTo(){},print(){}},document:{querySelector:key=>nodes[key],querySelectorAll:()=>[]}
});
vm.runInContext(source+';globalThis.ui={overview,calculator,savedLibrary,calculate,modules,states,getSnapshot:()=>currentSnapshot};',context);
const {ui}=context;
const assertFooter=()=>{
 const html=nodes['#main'].innerHTML;
 assert.equal(count(html,baseline),1);
 assert.equal(count(html,sentence),1);
 assert.ok(html.endsWith(`<p class="reference-note">${baseline} ${sentence}</p>`));
};
ui.overview();assertFooter();
ui.savedLibrary();assertFooter();
const snapshots=[];
assert.equal(ui.modules.length,10);
for(const module of ui.modules){
 ui.calculator(module.id);assertFooter();
 assert.equal(count(nodes['#results'].innerHTML,sentence),0,'Do not duplicate the shared disclaimer in individual results');
 assert.equal(count(nodes['#results'].innerHTML,obsolete),0,'No contradicted source qualification in current results/details');
 const snapshot=ui.getSnapshot();assert.ok(snapshot,`${module.id} must have a valid default snapshot`);
 assert.equal(snapshot.appVersion,'2.12.0');snapshots.push(snapshot);
 const full=summaryFromSnapshot(snapshot),pdf=new TextDecoder().decode(createPDF(snapshot)),clipboard=copySummaryFromSnapshot(snapshot);
 assert.equal(count(full,sentence),1,`${module.id} full report`);
 assert.equal(count(pdf,sentence),1,`${module.id} PDF`);
 assert.equal(count(JSON.stringify(snapshot.result),sentence),0,'Calculation results themselves remain unmodified');
 assert.equal(count(full,obsolete),0);assert.equal(count(pdf,obsolete),0);
 const expected=[snapshot.moduleTitle,'','INPUTS',...snapshot.inputRows.map(r=>`${r.label}: ${r.value}`),'','OUTPUTS',...snapshot.result.results.map(r=>`${r.label}: ${r.displayValue??r.value}${r.unit?' '+r.unit:''}`)].join('\n');
 assert.equal(clipboard,expected,'Copy summary remains exactly inputs and outputs only');
 await nodes['#copy-summary'].onclick();assert.equal(copied.at(-1),expected);
 nodes['#export-pdf'].onclick();assert.deepEqual(pdfs.at(-1),snapshot);
 // Repeated calculation and navigation never accumulate extra notes.
 ui.calculate(module);assertFooter();
}
const store=createRecordStore(storage),saved=store.save(snapshots[0]);
ui.savedLibrary();assertFooter();
assert.equal(count(summaryFromSnapshot(store.load(saved.id).snapshot),sentence),1);
assert.equal(count(new TextDecoder().decode(createPDF(store.load(saved.id).snapshot)),sentence),1);
ui.overview();assertFooter();

// The warning correction changes only the contradicted historical sentence.
const historical=JSON.parse(fs.readFileSync(new URL('./legacy-judgement-fixture.json',import.meta.url),'utf8'));
const oldResult=structuredClone(historical.result);
oldResult.warnings=oldResult.warnings.map(w=>w.replace(' '+obsolete,''));
const updatedResult=evaluateTransformerProtection(historical.inputs);
updatedResult.results=updatedResult.results.map(({status,statusText,...row})=>row);
assert.deepEqual(updatedResult,oldResult);
for(const protection of ['dual','primary-only'])for(const ocpdCheckEnabled of [false,true]){
 const result=evaluateTransformerProtection({...historical.inputs,protection,ocpdCheckEnabled,breakerSide:'primary',primaryOcpd:100,secondaryOcpd:225});
 assert.equal(result.error,undefined);
 const warnings=result.warnings.join('\n');
 assert.equal(count(warnings,obsolete),0);
 assert.match(warnings,/NEC 2023 baseline, subject to adopted edition, AHJ and manufacturer instructions\./);
 assert.match(warnings,/Ordinary dry-type transformers only; verify inrush, coordination, fault current, equipment ratings, grounding and bonding separately\./);
}

// Digests captured using the unmodified v2.10.1 exporter before this patch.
const sha=value=>createHash('sha256').update(value).digest('hex'),original=JSON.stringify(historical);
assert.equal(historical.appVersion,'2.10.1');
assert.equal(sha(summaryFromSnapshot(historical)),'5663c58f8659b61aa808c8439467a43ed1151d99fa4e8da9fbbaee413cd94976');
assert.equal(sha(createPDF(historical)),'c8f6f04b6d267bafb70984e3c7961d79f89010dcf68bc32414ef61030345aef2');
assert.equal(count(summaryFromSnapshot(historical),obsolete),1);
assert.equal(count(summaryFromSnapshot(historical),sentence),0);
assert.equal(count(new TextDecoder().decode(createPDF(historical)),sentence),0);
assert.equal(JSON.stringify(historical),original);
const archived=store.save(historical),archivedBefore=JSON.stringify(archived.snapshot),archivedPDF=createPDF(archived.snapshot);
store.rename(archived.id,{projectName:'Renamed archive',calculationName:'Original transformer'});
store.trash(archived.id);store.restore(archived.id);
assert.equal(JSON.stringify(store.load(archived.id).snapshot),archivedBefore);
assert.deepEqual(createPDF(store.load(archived.id).snapshot),archivedPDF);

for(const version of ['1.9.9','2.4.0','2.9.99','2.10.0','2.10.1','unversioned'])assert.equal(engineeringReviewNote(version),'');
for(const version of ['2.10.2','2.10.12','2.12.0','3.0.0'])assert.equal(engineeringReviewNote(version),sentence);
assert.equal(CURRENT_APP_VERSION,'2.12.0');
for(const file of fs.readdirSync('dist').filter(file=>/\.(js|html)$/.test(file))){
 const text=fs.readFileSync(`dist/${file}`,'utf8');
 for(const match of text.matchAll(/\?v=([^'"\s]+)/g))assert.equal(match[1],'2.12.0',`${file} cache version`);
}

// Semantic PDF extraction is distinct from unperformed visual QA.
const dir=fs.mkdtempSync(join(tmpdir(),'mep-judgement-')),file=join(dir,'review-note.pdf');
fs.writeFileSync(file,createPDF(snapshots[0]));
const extracted=spawnSync('pdftotext',[file,'-'],{encoding:'utf8'});
if(!extracted.error){assert.equal(extracted.status,0,extracted.stderr);assert.equal(count(extracted.stdout.replace(/\s+/g,' '),sentence),1);}
console.log('Engineering judgement: all 12 page footers, ten new reports/PDFs, clipboard-only output, live transformer correction, version boundary and immutable historical report digests passed.');
