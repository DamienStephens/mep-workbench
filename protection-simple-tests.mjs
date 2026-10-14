import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as calc from './dist/calc.js';
import {systemOptions,voltageOptions} from './dist/voltage.js';
import {transformerProtection,evaluateTransformerProtection,transformerProtectionLimits,migrateProtectionState,transformerBreakerOptions,transformerOcpdRatings,secondaryRuleConditions} from './dist/transformer-protection.js';
import {createSnapshot,buildSummary,summaryFromSnapshot,copySummaryFromSnapshot,createRecordStore,projectNames,projectKey} from './dist/calculation-records.js';
import {createPDF} from './dist/pdf-report.js';
const base={kva:75,phase:3,primary:480,secondary:208,protection:'dual'};
const val=(r,k)=>r.results.find(x=>x.label===k)?.value;
let r=evaluateTransformerProtection(base);assert.equal(r.error,undefined);assert.equal(val(r,'Primary full-load current'),90.211);assert.equal(val(r,'Secondary full-load current'),208.179);assert.equal(val(r,'Maximum modeled permitted primary OCPD'),225);assert.equal(val(r,'Maximum modeled permitted secondary OCPD'),300);assert.ok(!r.results.some(x=>/Selected|conductor per set/.test(x.label)));
assert.deepEqual(evaluateTransformerProtection({...base,designLoad:'',lengthFt:'',installationConfirmed:false,terminal:90,ambient:'',primaryOcpd:9999,secondaryOcpd:9999}),r,'Disabled optional fields cannot gate basic limits');
r=transformerProtectionLimits({...base,protection:'primary-only'});assert.equal(val(r,'Maximum modeled permitted primary OCPD'),125);assert.match(val(r,'Maximum modeled permitted secondary OCPD'),/No Table/);assert.match(r.warnings.join(' '),/does not mean that no secondary OCPD is needed/);
assert.equal(val(transformerProtectionLimits({...base,kva:10000}),'Maximum modeled permitted primary OCPD'),4000);
assert.match(val(transformerProtectionLimits({...base,kva:.1}),'Maximum modeled permitted primary OCPD'),/Outside modeled/);
assert.match(transformerProtectionLimits({...base,primary:1001,primaryMode:'custom',primaryConfirmed:true}).error,/1000 V/);
assert.equal(transformerProtectionLimits({...base,primary:500,primaryMode:'custom'}).error,undefined);
assert.equal(transformerProtectionLimits({...base,primary:500,primaryMode:'custom',primaryConfirmed:true}).error,undefined);
const full={...base,primaryOcpd:100,secondaryOcpd:225,designLoad:200,configuration:'three-phase-4-wire',secondaryRule:'10ft',lengthFt:10,installationConfirmed:true,material:'copper',terminal:75,ambient:30,parallelSets:1};
const enabled={...full,ocpdCheckEnabled:true,conductorCheckEnabled:true};
r=evaluateTransformerProtection(enabled);assert.equal(r.error,undefined);assert.deepEqual(r.results.slice(0,-2),transformerProtection(full).results);
for(const delta of [{lengthFt:11},{ambient:81},{parallelSets:0},{configuration:'single-phase-2-wire'},{designLoad:0},{secondaryRule:'unsupported'},{secondaryRule:'25ft',lengthFt:26}])assert.ok(evaluateTransformerProtection({...enabled,...delta}).error,JSON.stringify(delta));
r=evaluateTransformerProtection({...full,ocpdCheckEnabled:true});assert.equal(r.error,undefined);assert.equal(val(r,'Selected primary OCPD'),100);assert.equal(val(r,'Selected secondary OCPD'),225);assert.ok(!r.results.some(x=>/conductor per set/.test(x.label)));
for(const delta of [{primaryOcpd:250},{secondaryOcpd:350},{primaryOcpd:17}])assert.ok(evaluateTransformerProtection({...full,ocpdCheckEnabled:true,...delta}).error);
assert.equal(evaluateTransformerProtection({...full,protection:'primary-only',secondaryOcpd:350,ocpdCheckEnabled:true}).error,undefined);
const migrated=migrateProtectionState(full);assert.equal(migrated.conductorCheckEnabled,true);assert.equal(migrated.ocpdCheckEnabled,true);assert.deepEqual(full.primaryOcpd,migrated.primaryOcpd);assert.equal(full.conductorCheckEnabled,undefined);assert.equal(migrateProtectionState({...full,ocpdCheckEnabled:false,conductorCheckEnabled:false}).conductorCheckEnabled,false);
// Modeled DOM workflow; native browser keyboard and visual QA remain separate.
const source=fs.readFileSync(new URL('./dist/app.js',import.meta.url),'utf8').replace(/^import[^\n]+\n/gm,'').replace(/route\(\);\s*$/,'');
function harness(saved={}){
 const data=new Map([['mep-workbench-v1',JSON.stringify(saved)]]),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
 const listeners={},nodes={},pdfs=[];let buttons=[];nodes['input[name="protection"]:checked']={focus(){this.focused=true}};
 for(const key of ['#add-row','#main','#navigation','#calculator-form','#results','#sources','#reset','#print','#copy-summary','#export-pdf','#save-calculation','#action-status','#storage-status','#clear-all-calculations'])nodes[key]={innerHTML:'',textContent:'',addEventListener:(k,v)=>listeners[k]=v,querySelector:()=>null};
 const ctx=vm.createContext({projectNames,projectKey,calc,systemOptions,voltageOptions,createSnapshot,buildSummary,summaryFromSnapshot,copySummaryFromSnapshot,createRecordStore:()=>createRecordStore(storage),transformerProtection,evaluateTransformerProtection,migrateProtectionState,transformerBreakerOptions,transformerOcpdRatings,secondaryRuleConditions,downloadPDF:s=>pdfs.push(s),structuredClone,console,localStorage:storage,location:{hash:''},navigator:{clipboard:{}},attachAmbientHelper(){},window:{addEventListener(){},scrollTo(){},print(){}},document:{querySelector:k=>nodes[k],querySelectorAll:s=>{if(s!=='[data-record-action]')return [];buttons=[...nodes['#main'].innerHTML.matchAll(/data-record-action="([^"]+)" data-record-id="([^"]+)"/g)].map(m=>({dataset:{recordAction:m[1],recordId:m[2]}}));return buttons}}});
 vm.runInContext(source+';globalThis.ui={calculator,states,modules,savedLibrary,makeSnapshot};',ctx);
 return {ui:ctx.ui,nodes,store:createRecordStore(storage),pdfs,get buttons(){return buttons},change(name,value,tagName='SELECT'){listeners.change({type:'change',target:{name,value:String(value),tagName,dataset:{},matches:()=>true}})}};
}
const h=harness();h.ui.calculator('protection');let html=h.nodes['#main'].innerHTML;const core=html.split('<details class="optional-checks')[0];
assert.doesNotMatch(core,/Nominal system|Voltage entry|primaryOcpd|designLoad|configuration|lengthFt/);assert.equal((core.match(/name="phase"/g)||[]).length,1);assert.equal((core.match(/<fieldset/g)||[]).length,1);assert.equal((core.match(/type="radio" name="protection"/g)||[]).length,2);assert.match(core,/value="dual" checked/);assert.doesNotMatch(core,/<select[^>]+name="protection"/);
for(const side of ['primary','secondary']){const options=html.match(new RegExp(`<select[^>]+name="${side}Preset"[^>]*>(.*?)</select>`))[1];assert.match(options,/<option value="custom"[^>]*>Custom<\/option>$/);assert.doesNotMatch(options,/120 V/)}
assert.doesNotMatch(html,/name="designLoad"|name="lengthFt"|name="primaryOcpd"/);assert.match(h.nodes['#results'].innerHTML,/Maximum modeled permitted/);assert.equal(h.nodes['#save-calculation'].disabled,false);
h.change('primaryPreset','custom');assert.match(h.nodes['#main'].innerHTML,/name="primary"[^>]*max="1000"/);assert.doesNotMatch(h.nodes['#results'].innerHTML,/role="alert"/);assert.equal(h.nodes['#save-calculation'].disabled,false);h.change('phase',1);assert.equal(h.ui.states.protection.primaryConfirmed,undefined);assert.equal(h.ui.states.protection.secondaryConfirmed,undefined);
h.change('primaryPreset',480);h.change('secondaryPreset',240);h.change('protection','primary-only','INPUT');assert.match(h.nodes['#main'].innerHTML,/value="primary-only" checked/);assert.equal(h.nodes['input[name="protection"]:checked'].focused,true,'Radio focus is restored after rerender for native arrow-key navigation');assert.match(h.nodes['#results'].innerHTML,/No Table 450/);
h.change('ocpdCheckEnabled',true);assert.match(h.nodes['#main'].innerHTML,/name="primaryOcpd"/);assert.doesNotMatch(h.nodes['#main'].innerHTML,/name="lengthFt"/);h.change('conductorCheckEnabled',true);assert.match(h.nodes['#main'].innerHTML,/data-check-group="conductors" open/);assert.match(h.nodes['#main'].innerHTML,/name="ocpdCheckEnabled" disabled/);assert.match(h.nodes['#main'].innerHTML,/name="lengthFt"/);h.change('conductorCheckEnabled',false);h.change('ocpdCheckEnabled',false);assert.equal(h.nodes['#save-calculation'].disabled,false);
const m=h.ui.modules.find(x=>x.id==='protection'),state=h.ui.states.protection;const snap=h.ui.makeSnapshot(m,state,evaluateTransformerProtection(state));const summary=summaryFromSnapshot(snap);assert.match(summary,/Primary-only winding protection/);assert.match(summary,/Enabled checks: Transformer winding limits only/);assert.doesNotMatch(summary,/Selected secondary OCPD:|Secondary phase conductor per set:/);assert.ok(createPDF(snap).length>1000);
const old=createSnapshot({id:'protection',title:'Transformer protection',fields:[]},full,transformerProtection(full),{appVersion:'2.1.0'}),record=h.store.save(old),oldPDF=createPDF(record.snapshot);h.ui.savedLibrary();h.buttons.find(x=>x.dataset.recordAction==='load').onclick();assert.equal(h.ui.states.protection.conductorCheckEnabled,true);assert.equal(h.ui.states.protection.designLoad,200);assert.match(h.nodes['#main'].innerHTML,/Previous full transformer calculation preserved/);assert.deepEqual(createPDF(h.store.load(record.id).snapshot),oldPDF);
const oldCurrent=harness({protection:full});assert.equal(oldCurrent.ui.states.protection.conductorCheckEnabled,false);assert.equal(oldCurrent.ui.states.protection.designLoad,200);oldCurrent.ui.calculator('protection');assert.equal(oldCurrent.nodes['#save-calculation'].disabled,false);assert.doesNotMatch(oldCurrent.nodes['#main'].innerHTML,/name="designLoad"/);
console.log('Transformer simplification: basic limits, optional independent/full guards, five-input UI, native radio semantics, custom voltage, scope reports and immutable legacy migration passed.');

// Protection presentation is a 2 x 2 grid, independent of immutable engine order.
const basicLabels=['Maximum modeled permitted primary OCPD','Maximum modeled permitted secondary OCPD','Primary full-load current','Secondary full-load current'];
const fullLabels=['Maximum modeled primary OCPD','Maximum modeled secondary transformer OCPD',...basicLabels.slice(2)];
const visiblePart=html=>html.split('<details class="panel calculation-details"')[0];
function assertProtectionGrid(h,labels){
 const html=h.nodes['#results'].innerHTML;
 assert.ok(html.startsWith('<div class="metric-grid">'),'Four results share one two-column grid');
 assert.doesNotMatch(html,/class="result-hero"/);
 assert.deepEqual([...visiblePart(html).matchAll(/class="metric-label">([^<]+)</g)].map(m=>m[1]),labels);
 assert.doesNotMatch(html,/<details[^>]*\sopen(?:[\s>])/,'Information is closed by default');
 assert.match(html,/<details class="panel calculation-details" data-print-details>/,'Printing can expand the details');
 return html;
}
const presentation=harness();presentation.ui.calculator('protection');
let presentationHTML=assertProtectionGrid(presentation,basicLabels);
assert.doesNotMatch(presentationHTML,/Named modeled NEC provisions were checked/,'Repeated notice is absent from the entire results UI');
assert.doesNotMatch(presentationHTML,/<div class="warning"[^>]*>\s*<\/div>/,'No empty warning boxes');
assert.doesNotMatch(visiblePart(presentationHTML),/Final licensed|No actual load/,'Routine cautions stay in details');
assert.match(presentationHTML.split('<details')[1],/No actual load/,'Routine information remains accessible');
assert.match(fs.readFileSync(new URL('./dist/styles.css',import.meta.url),'utf8'),/\.metric-grid\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
const baseOutput=evaluateTransformerProtection(presentation.ui.states.protection);
const presentationSnapshot=presentation.ui.makeSnapshot(presentation.ui.modules.find(m=>m.id==='protection'),presentation.ui.states.protection,baseOutput);
assert.deepEqual(presentationSnapshot.result,baseOutput,'Presentation preserves complete snapshot results, warnings, steps and sources');
for(const warning of baseOutput.warnings)assert.ok(summaryFromSnapshot(presentationSnapshot).includes(warning),'Report retains complete warning text');
assert.equal(presentationSnapshot.appVersion,'2.12.0');
assert.equal(baseOutput.results[0].label,'Primary full-load current','UI ordering does not mutate the engine results');
presentation.change('protection','primary-only','INPUT');assertProtectionGrid(presentation,basicLabels);
assert.match(visiblePart(presentation.nodes['#results'].innerHTML),/class="warning"[^>]*>Primary-only winding protection/);
presentation.change('protection','dual','INPUT');presentation.change('kva',10000,'INPUT');
assert.match(visiblePart(presentation.nodes['#results'].innerHTML),/4,000/);
presentation.change('kva',75,'INPUT');presentation.change('primaryPreset','custom');
assert.doesNotMatch(presentation.nodes['#results'].innerHTML,/class="warning error" role="alert"/);
assert.match(visiblePart(presentation.nodes['#results'].innerHTML),/class="warning"[^>]*>Primary voltage: custom/);
const selected=harness({protection:{...full,ocpdCheckEnabled:true,conductorCheckEnabled:false}});selected.ui.calculator('protection');assertProtectionGrid(selected,basicLabels);
assert.match(selected.nodes['#results'].innerHTML.split('<details')[1],/Selected secondary OCPD/);
const advanced=harness({protection:enabled});advanced.ui.calculator('protection');
presentationHTML=assertProtectionGrid(advanced,fullLabels);
assert.doesNotMatch(presentationHTML,/Named modeled NEC provisions were checked/,'Advanced results omit the repeated notice too');
assert.equal((visiblePart(presentationHTML).match(/class="warning"/g)||[]).length,0,'No warning box remains when there are no current-state warnings');
for(const label of ['Secondary phase conductor per set','Selected primary OCPD','Selected secondary OCPD','Combined usable phase ampacity'])assert.ok(presentationHTML.split('<details')[1].includes(label),'Optional results remain in details');
advanced.change('terminal',90);assert.doesNotMatch(advanced.nodes['#results'].innerHTML,/class="warning error" role="alert"/);
assert.match(visiblePart(advanced.nodes['#results'].innerHTML),/class="warning"[^>]*>90°C results assume/);
advanced.change('material','aluminum');
assert.match(visiblePart(advanced.nodes['#results'].innerHTML),/class="warning"[^>]*>Aluminum is table-based/);
advanced.change('parallelSets',2,'INPUT');assert.match(visiblePart(advanced.nodes['#results'].innerHTML),/class="warning"[^>]*>Parallel phase conductors/);
advanced.change('protection','primary-only','INPUT');advanced.change('primaryOcpd',100);advanced.change('secondaryOcpd',225);assert.match(visiblePart(advanced.nodes['#results'].innerHTML),/class="warning"[^>]*>NEC 450\.3\(B\) protects the transformer/);
console.log('Transformer 2x2 result order, collapsed routine information, conditional/error visibility and unchanged snapshot/report warnings passed.');

for (const module of presentation.ui.modules) {
 const ui=harness();ui.ui.calculator(module.id);
 assert.doesNotMatch(ui.nodes['#results'].innerHTML,/Named modeled NEC provisions were checked/);
 assert.doesNotMatch(ui.nodes['#results'].innerHTML,/<div class="warning"[^>]*>\s*<\/div>/,`${module.id}: no empty result warning boxes`);
}
