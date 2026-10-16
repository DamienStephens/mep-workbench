// Modeled DOM/HTML, state and report regression coverage. This is not browser QA.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as calc from './dist/calc.js';
import {systemOptions,voltageOptions} from './dist/voltage.js';
import {createSnapshot,buildSummary,summaryFromSnapshot,copySummaryFromSnapshot,createRecordStore,projectNames,projectKey} from './dist/calculation-records.js';
import {createDashboardStore} from './dist/dashboard.js';
import {transformerProtection,evaluateTransformerProtection,migrateProtectionState,transformerBreakerOptions,transformerOcpdRatings,secondaryRuleConditions} from './dist/transformer-protection.js';
import {createPDF,pdfText} from './dist/pdf-report.js';

let passed=0;
const test=async(name,fn)=>{try{await fn();passed++}catch(error){console.error(name);throw error}};
const plain=value=>JSON.parse(JSON.stringify(value));
const source=fs.readFileSync(new URL('./dist/app.js',import.meta.url),'utf8').replace(/^import[^\n]+\n/gm,'').replace(/route\(\);\s*$/,'');
function harness(saved={},existing){
 const data=existing||new Map([['mep-workbench-v1',JSON.stringify(saved)]]);
 const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},handlers={},nodes={},pdfs=[],copied=[],consoleErrors=[],windowHandlers={};
 let main='',buttons,inputs;
 const node=()=>({innerHTML:'',textContent:'',addEventListener:(name,fn)=>handlers[name]=fn,querySelector:()=>null,focus(){},setAttribute(name,value){this[name]=value}});
 for(const key of ['#main','#navigation','#calculator-form','#results','#sources','#reset','#print','#copy-summary','#export-pdf','#save-calculation','#action-status','#storage-status','#add-row','#clear-all-calculations','#saved-heading','#mv-edit-rx'])nodes[key]=node();
 Object.defineProperty(nodes['#main'],'innerHTML',{get:()=>main,set:value=>{main=value;buttons=inputs=undefined}});
 const attrs=html=>Object.fromEntries([...html.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
 function formInputs(){return inputs??=(main.match(/<form\b[\s\S]*?<\/form>/)?.[0].match(/<input\b[^>]+>/g)||[]).map(html=>({...node(),...attrs(html),required:/\brequired\b/.test(html),checkValidity(){if(this.value==='')return !this.required;if(this.type==='text')return this.value.length<=Number(this.maxlength??Infinity);const n=Number(this.value);return Number.isFinite(n)&&(this.min===undefined||n>=Number(this.min))&&(this.max===undefined||n<=Number(this.max))&&(this.step==='any'||this.step===undefined||Number.isInteger(n/Number(this.step)))}}))}
 function actionButtons(){return buttons??=[...main.matchAll(/<button\b([^>]+)>/g)].map(m=>({...node(),dataset:Object.fromEntries(Object.entries(attrs(m[1])).filter(([k])=>k.startsWith('data-')).map(([k,v])=>[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase()),v]))}))}
 const document={querySelector:k=>k==='#mv-edit-rx'&&!main.includes('id="mv-edit-rx"')?null:nodes[k],querySelectorAll:k=>k==='#calculator-form input:not([data-ambient-helper])'?formInputs():k==='[data-record-action]'?actionButtons().filter(b=>b.dataset.recordAction):k==='[data-recent]'?actionButtons().filter(b=>b.dataset.recent!==undefined):[]};
 const context=vm.createContext({projectNames,projectKey,createDashboardStore:()=>createDashboardStore(storage),calc,systemOptions,voltageOptions,createSnapshot,buildSummary,summaryFromSnapshot,copySummaryFromSnapshot,createRecordStore:()=>createRecordStore(storage),transformerProtection,evaluateTransformerProtection,migrateProtectionState,transformerBreakerOptions,transformerOcpdRatings,secondaryRuleConditions,downloadPDF:s=>pdfs.push(plain(s)),showRecordDialog:options=>options.onSave({projectName:'MV reference design',calculationName:'Feeder A'}),confirmRecordClear(){},closeRecordDialog(){},structuredClone,console:{...console,error:(...args)=>consoleErrors.push(args)},localStorage:storage,location:{hash:''},navigator:{clipboard:{writeText:async text=>copied.push(text)}},attachAmbientHelper(){},window:{addEventListener:(name,fn)=>windowHandlers[name]=fn,print(){},scrollTo(){}},document});
 vm.runInContext(source+';globalThis.ui={states,modules,dashboardStore,calculator,overview,savedLibrary,makeSnapshot,fieldHTML,defaults,getSnapshot:()=>currentSnapshot};',context);
 return {ui:context.ui,data,storage,nodes,pdfs,copied,consoleErrors,windowHandlers,store:createRecordStore(storage),get buttons(){return actionButtons()},get inputs(){return formInputs()},change(name,value,tagName='SELECT'){
  const input=formInputs().find(n=>n.name===name);if(input)input.value=String(value);
  handlers.change({type:'change',target:{name,value:String(value),tagName:input?'INPUT':tagName,type:input?.type,dataset:{},matches:()=>true}});
 }};
}
const base={impedanceMode:'mvPreset',mvFamily:'mv90-epr-2400',mvSize:'1/0',mvTemperature:90,mvArrangement:'nonferrous-touching',phase:3,parallelSets:1,voltage:2400,voltageMode:'custom',length:1000,current:100,pf:.8};
const open=(state=base)=>{const h=harness({drop:state});h.ui.calculator('drop');return h};
const options=(h,key)=>h.nodes['#main'].innerHTML.match(new RegExp(`<select[^>]+name="${key}"[^>]*>(.*?)</select>`))?.[1];
const value=(snapshot,label)=>snapshot.result.results.find(r=>r.label===label)?.value;
const assertReady=h=>{assert.ok(h.ui.getSnapshot(),h.nodes['#results'].innerHTML+' '+h.nodes['#action-status'].textContent);for(const key of ['#copy-summary','#export-pdf','#save-calculation'])assert.equal(h.nodes[key].disabled,false);assert.equal(h.consoleErrors.length,0)};
const assertBlocked=h=>{assert.equal(h.ui.getSnapshot(),null);for(const key of ['#copy-summary','#export-pdf','#save-calculation'])assert.equal(h.nodes[key].disabled,true);assert.match(h.nodes['#results'].innerHTML,/role="alert"/);assert.equal(h.consoleErrors.length,0)};
const savedButton=(h,action,id)=>h.buttons.find(b=>b.dataset.recordAction===action&&(!id||b.dataset.recordId===id));

await test('MV entry explicitly selects balanced three-phase and one set',()=>{
 const h=harness({drop:{size:'1/0',phase:1,parallelSets:3,voltage:480}});h.ui.calculator('drop');h.change('impedanceMode','mvPreset');
 assert.equal(Number(h.ui.states.drop.phase),3);assert.equal(h.ui.states.drop.parallelSets,1);assert.equal(h.ui.states.drop.mvFamily,'mv90-epr-2400');assert.equal(h.ui.states.drop.mvSize,'1/0');assertReady(h);
 assert.equal((options(h,'phase').match(/<option /g)||[]).length,1);assert.match(options(h,'phase'),/value="3".*Balanced three-phase/);
 assert.doesNotMatch(h.nodes['#main'].innerHTML,/name="(?:size|material|raceway|parallelSets|resistance|reactance|impedanceBasis)"/);
 for(const key of ['mvFamily','mvSize','mvTemperature','mvArrangement'])assert.equal((h.nodes['#main'].innerHTML.match(new RegExp(`name="${key}"`,'g'))||[]).length,1);
});
await test('MV entry never silently changes an incompatible saved standard voltage',()=>{
 const h=harness();h.ui.calculator('drop');h.change('impedanceMode','mvPreset');assert.equal(h.ui.states.drop.voltage,120);assertBlocked(h);assert.match(options(h,'voltagePreset'),/saved: 120/);
 h.change('voltagePreset','custom');h.change('voltage',2400);assertReady(h);assert.equal(h.ui.getSnapshot().inputs.voltage,2400);
});
await test('cable assumptions, exact R/X, source revision and ordinary notes are collapsed',()=>{
 const h=open();assertReady(h);const html=h.nodes['#main'].innerHTML,results=h.nodes['#results'].innerHTML;
 const assumptions=html.match(/<details\b([^>]*data-mv-assumptions[^>]*)>([\s\S]*?)<\/details>/);assert.ok(assumptions);assert.doesNotMatch(assumptions[1],/\bopen\b/);
 for(const term of ['Cable assumptions & R/X','Southwire SPEC 46002','1.000.026','2026-08-21','Nonshielded','90°C calculation temperature','R = 0.128; X = 0.0401','Per phase, one circuit.','Edit these R/X values'])assert.ok(assumptions[2].includes(term),term);
 assert.match(html,/One balanced three-phase circuit · 60 Hz · 2.4 kV cable class/);
 const details=results.match(/<details\b([^>]*calculation-details[^>]*)>([\s\S]*?)<\/details>/);assert.ok(details);assert.doesNotMatch(details[1],/\bopen\b/);
 for(const term of ['MV preset assumptions:','MV preset scope:','Voltage: custom','NEC general-circuit','2021 IECC','Voltage drop does not'])assert.ok(details[2].includes(term),term);
 assert.doesNotMatch(results,/<div class="warning/,'Routine scope must not fill the primary result area');
 assert.match(results,/0\.0401/);assert.match(h.nodes['#sources'].innerHTML,/country=US&amp;spec=46002/);
});
for(const id of ['mv90-epr-2400','mv105-epr-2400'])await test(`${id}: rating and published calculation temperature stay separate`,()=>{
 const h=open({...base,mvFamily:id});assertReady(h);assert.equal((options(h,'mvTemperature').match(/<option /g)||[]).length,1);assert.match(options(h,'mvTemperature'),/value="90".*90°C calculation temperature/);assert.doesNotMatch(options(h,'mvTemperature'),/value="105"/);
 assert.equal(value(h.ui.getSnapshot(),'Calculation temperature'),90);assert.match(h.nodes['#main'].innerHTML,/not the voltage class or measured operating temperature/);
 h.change('mvTemperature',105);assertBlocked(h);h.change('mvTemperature',90);assertReady(h);
});
await test('changing family preserves supported selection and resets unsupported dependent fields',()=>{
 const h=open();h.change('mvFamily','mv105-epr-2400');assertReady(h);assert.equal(h.ui.states.drop.mvSize,'1/0');assert.equal(value(h.ui.getSnapshot(),'Series reactance X'),.032);
 h.change('mvFamily','mv90-epr-2400');h.change('mvSize','1');assertReady(h);
 h.ui.states.drop.mvTemperature=105;h.ui.states.drop.mvArrangement='steel';h.change('mvFamily','mv105-epr-2400');assertReady(h);
 assert.equal(h.ui.states.drop.mvSize,calc.mvSizeOptions(h.ui.states.drop)[0][0]);assert.equal(Number(h.ui.states.drop.mvTemperature),90);assert.equal(h.ui.states.drop.mvArrangement,'nonferrous-touching');assert.doesNotMatch(options(h,'mvSize'),/<option value="1"/);
});
await test('repeated family and mode switches preserve valid explicit selections',()=>{
 const h=open();h.change('mvSize','350');h.change('impedanceMode','manual');h.change('resistance',.7);h.change('reactance',.2);h.change('impedanceBasis','Independent manual source');assertReady(h);
 for(let i=0;i<3;i++){
  h.change('impedanceMode','mvPreset');h.change('mvFamily','mv105-epr-2400');assertReady(h);assert.equal(h.ui.states.drop.mvSize,'350');assert.equal(value(h.ui.getSnapshot(),'Series resistance R'),.041);
  h.change('mvFamily','mv90-epr-2400');assertReady(h);assert.equal(h.ui.states.drop.mvSize,'350');
  h.change('impedanceMode','table9');assertBlocked(h);h.change('impedanceMode','manual');assertReady(h);assert.equal(h.ui.states.drop.resistance,.7);assert.equal(h.ui.states.drop.reactance,.2);assert.equal(h.ui.states.drop.impedanceBasis,'Independent manual source');
 }
});
for(const [id,family] of Object.entries(calc.mvCableFamilies))await test(`${id}: every released family renders a valid report and voltage ceiling`,()=>{
 const state={...base,mvFamily:id,mvSize:calc.mvSizeOptions({mvFamily:id})[0][0],mvArrangement:calc.mvArrangementOptions({mvFamily:id})[0][0],mvTemperature:calc.mvTemperatureOptions({mvFamily:id})[0][0],voltage:family.voltage};
 const h=open(state);assertReady(h);assert.equal(Number(h.inputs.find(n=>n.name==='voltage').max),family.voltage);
 const snapshot=h.ui.getSnapshot();assert.equal(snapshot.inputs.mvFamily,id);assert.match(snapshot.codeEdition,/manufacturer-reference MV cable data; not an NEC sizing determination/);
 assert.ok(summaryFromSnapshot(snapshot).includes(family.reference));assert.ok(snapshot.result.sources.some(s=>s.url===family.url));assert.ok(snapshot.inputRows.some(r=>r.label==='MV cable preset'&&r.value===family.label));
 h.change('voltage',family.voltage+.001);assertBlocked(h);assert.equal(h.inputs.find(n=>n.name==='voltage')['aria-invalid'],'true');h.change('voltage',family.voltage);assertReady(h);
});
for(const [id,family] of Object.entries(calc.mvCableFamilies))await test(`${id}: explicit conversion stays valid for every published size`,()=>{
 for(const [mvSize] of calc.mvSizeOptions({mvFamily:id}))for(const [mvTemperature] of calc.mvTemperatureOptions({mvFamily:id})){
  const state={...base,mvFamily:id,mvSize,mvArrangement:calc.mvArrangementOptions({mvFamily:id})[0][0],mvTemperature,voltage:family.voltage};
  const h=open(state);assertReady(h);const original=plain(h.ui.getSnapshot()),selected=calc.mvPresetImpedance(state);h.nodes['#mv-edit-rx'].onclick();assertReady(h);
  assert.equal(h.ui.states.drop.impedanceBasis,selected.basis);assert.equal(h.ui.states.drop.resistance,selected.r);assert.equal(h.ui.states.drop.reactance,selected.x);
  for(const label of ['Estimated voltage drop','Percentage voltage drop','Estimated voltage at end of run'])assert.equal(value(h.ui.getSnapshot(),label),value(original,label));
  const basis=h.inputs.find(n=>n.name==='impedanceBasis');assert.ok(basis.checkValidity(),'Copied full source basis must fit the manual input without truncation');
 }
});
await test('malformed persisted family types never produce valid selection options',()=>{
 for(const mvFamily of [null,false,[],['mv90-epr-2400'],{}]){
  const h=open({...base,mvFamily});assertBlocked(h);assert.doesNotMatch(h.nodes['#main'].innerHTML,/data-mv-assumptions/);assert.equal((options(h,'mvSize').match(/<option /g)||[]).length,1);assert.match(options(h,'mvSize'),/Choose a matching value \(saved: 1\/0\)/);
 }
});
await test('snapshot/copy/PDF retain exact coefficients, clear basis and only applicable inputs',async()=>{
 const h=open();assertReady(h);const s=h.ui.getSnapshot(),summary=summaryFromSnapshot(s),copy=copySummaryFromSnapshot(s);
 for(const text of [summary,copy]){
  assert.match(text,/MV cable preset: MV-90/);assert.match(text,/MV conductor size: 1\/0 AWG/);assert.match(text,/Calculation temperature: 90°C calculation temperature/);assert.match(text,/Series resistance R: 0.128 Ω\/1,000 ft/);assert.match(text,/Series reactance X: 0.0401 Ω\/1,000 ft/);assert.match(text,/2400 · custom · line-to-line/);
  assert.doesNotMatch(text,/^Conductor size:|^Material:|^Raceway:|^Impedance source \/ design basis:|^Series resistance R \(/m);
 }
 assert.match(summary,/revision 1\.000\.026 · 2026-08-21/);assert.match(summary,/not universal MV-90\/MV-105 coefficients/);assert.match(summary,/shunt capacitance/);assert.doesNotMatch(s.limitations.join('\n'),/No 700/);assert.doesNotMatch(s.result.sources.map(v=>v.label).join('\n'),/Chapter 9 Table 9/);
 await h.nodes['#copy-summary'].onclick();assert.equal(h.copied.at(-1),copy);h.nodes['#export-pdf'].onclick();assert.deepEqual(h.pdfs.at(-1),plain(s));
 const bytes=createPDF(s),pdf=new TextDecoder().decode(bytes);assert.match(pdf,/%PDF-1\.4/);assert.match(pdf,/Series reactance X: 0\.0401 ohm\/1,000 ft/);assert.match(pdf,/SPEC 46002/);assert.match(pdf,/1\.000\.026/);assert.match(pdf,/90 deg C/);assert.match(pdf,/shunt capacitance/);
});
await test('explicit Edit these R/X copies the selected exact coefficients and complete basis',()=>{
 const h=open({...base,mvFamily:'mv105-epr-2400',mvSize:'350'}),selected=calc.mvPresetImpedance(h.ui.states.drop);assertReady(h);
 h.nodes['#mv-edit-rx'].onclick();assertReady(h);const s=h.ui.getSnapshot();assert.equal(s.inputs.impedanceMode,'manual');assert.equal(s.inputs.resistance,selected.r);assert.equal(s.inputs.reactance,selected.x);assert.equal(s.inputs.impedanceBasis,selected.basis);
 assert.doesNotMatch(h.nodes['#main'].innerHTML,/name="mv(?:Family|Size|Temperature|Arrangement)"|data-mv-assumptions/);assert.equal(h.inputs.find(n=>n.name==='voltage').max,undefined);assert.ok(!s.result.sources.some(v=>v.category==='Manufacturer reference'));
 assert.match(summaryFromSnapshot(s),/User-entered series impedance/);assert.match(summaryFromSnapshot(s),/SPEC 46006/);assert.match(summaryFromSnapshot(s),/90°C conductor calculation temperature/);assert.match(summaryFromSnapshot(s),/MV-105/);assert.match(s.codeEdition,/project R\/X; not an NEC sizing determination/);
 h.change('reactance',.1234);assertReady(h);assert.equal(h.ui.states.drop.impedanceMode,'manual');h.change('voltage',13800);assertReady(h);
 const again=harness({},h.data);again.ui.calculator('drop');assertReady(again);assert.equal(again.ui.states.drop.impedanceBasis,selected.basis);assert.equal(again.ui.states.drop.reactance,.1234);
});
await test('ordinary manual mode does not silently borrow preset coefficients',()=>{
 const h=open();h.change('impedanceMode','manual');assert.equal(h.ui.states.drop.resistance,'');assert.equal(h.ui.states.drop.reactance,'');assert.equal(h.ui.states.drop.impedanceBasis,'');assertBlocked(h);
});
await test('invalid preset cannot offer the explicit coefficient-edit action',()=>{
 const h=open({...base,mvSize:'700'});assertBlocked(h);assert.doesNotMatch(h.nodes['#main'].innerHTML,/id="mv-edit-rx"/);
});
for(const [key,bad] of [['mvFamily','__proto__'],['mvFamily','constructor'],['mvFamily','bad'],['mvSize','700'],['mvSize','constructor'],['mvTemperature',105],['mvTemperature',''],['mvArrangement','steel'],['phase',1],['parallelSets',2],['voltage',2401],['length',-1],['current',''],['pf',0]])await test(`invalid persisted ${key}=${JSON.stringify(bad)} remains blocked through reload`,async()=>{
 const state={...base,[key]:bad},h=open(state);assertBlocked(h);assert.deepEqual(plain(h.ui.states.drop[key]),plain(bad));
 await h.nodes['#copy-summary'].onclick();h.nodes['#export-pdf'].onclick();h.nodes['#save-calculation'].onclick();assert.equal(h.copied.length,0);assert.equal(h.pdfs.length,0);assert.equal(h.store.list().length,0);
 const again=harness({},h.data);again.ui.calculator('drop');assertBlocked(again);assert.deepEqual(plain(again.ui.states.drop[key]),plain(bad));
});
await test('hidden malformed manual/table values do not block or contaminate MV snapshots',()=>{
 const h=open({...base,size:'bad',material:'bad',raceway:'bad',resistance:-1,reactance:'bad',impedanceBasis:{stale:true}});assertReady(h);
 assert.deepEqual(h.ui.getSnapshot().result,calc.drop(base));const text=copySummaryFromSnapshot(h.ui.getSnapshot());assert.doesNotMatch(text,/stale|bad/);
});
await test('save, edit, saved PDF, load, reload and reset preserve frozen MV results',()=>{
 const h=open();h.nodes['#save-calculation'].onclick();const record=h.store.list()[0];assert.ok(record);const frozen=JSON.stringify(record.snapshot),pdf=createPDF(record.snapshot),summary=summaryFromSnapshot(record.snapshot);
 h.change('mvFamily','mv105-epr-2400');h.change('mvSize','500');h.change('voltage',2080);assertReady(h);assert.equal(value(h.ui.getSnapshot(),'Series reactance X'),.027);
 h.ui.savedLibrary();savedButton(h,'pdf',record.id).onclick();assert.deepEqual(createPDF(h.pdfs.at(-1)),pdf);savedButton(h,'load',record.id).onclick();assertReady(h);
 assert.equal(h.ui.states.drop.mvFamily,'mv90-epr-2400');assert.equal(h.ui.states.drop.mvSize,'1/0');assert.equal(h.ui.states.drop.voltage,2400);assert.equal(value(h.ui.getSnapshot(),'Series reactance X'),.0401);
 assert.equal(JSON.stringify(h.store.load(record.id).snapshot),frozen);assert.deepEqual(createPDF(h.store.load(record.id).snapshot),pdf);assert.equal(summaryFromSnapshot(h.store.load(record.id).snapshot),summary);
 const again=harness({},h.data);again.ui.calculator('drop');assertReady(again);for(const key of ['impedanceMode','mvFamily','mvSize','mvTemperature','mvArrangement','voltage'])assert.equal(again.ui.states.drop[key],record.snapshot.inputs[key]);
 again.nodes['#reset'].onclick();assertReady(again);assert.equal(again.ui.states.drop.impedanceMode,'table9');assert.equal(again.ui.states.drop.resistance,'');assert.equal(again.ui.states.drop.reactance,'');assert.equal(again.ui.states.drop.voltage,120);assert.equal(JSON.stringify(again.store.load(record.id).snapshot),frozen);
});
await test('dashboard resume retains exact MV selectors and recalculates source-specific R/X',()=>{
 const h=open();h.change('mvFamily','mv105-epr-2400');h.change('mvSize','4/0');h.change('current',125);assertReady(h);const recent=h.ui.dashboardStore.getSnapshot().recentEntries.find(r=>r.moduleId==='drop');assert.ok(recent);assert.equal(recent.state.mvFamily,'mv105-epr-2400');assert.equal(recent.state.mvSize,'4/0');
 const reloaded=harness({},h.data);reloaded.ui.overview();reloaded.buttons.find(b=>b.dataset.recent!==undefined).onclick();reloaded.ui.calculator('drop');assertReady(reloaded);assert.equal(reloaded.ui.states.drop.current,125);assert.equal(reloaded.ui.states.drop.mvFamily,'mv105-epr-2400');assert.equal(value(reloaded.ui.getSnapshot(),'Series reactance X'),.03);
});
await test('invalid dashboard inputs are not silently fixed or turned into fabricated reports',()=>{
 const h=harness();h.ui.dashboardStore.recordCalculation({moduleId:'drop',state:{...base,mvSize:'700'},summary:'Unsupported saved cable size'});h.ui.overview();h.buttons.find(b=>b.dataset.recent!==undefined).onclick();h.ui.calculator('drop');assertBlocked(h);assert.equal(h.ui.states.drop.mvSize,'700');h.change('mvSize','1/0');assertReady(h);
});
await test('historical pre-MV Table 9 record loads with unchanged frozen summary and PDF',()=>{
 const state={size:'10',material:'copper',raceway:'steel',length:100,current:20,voltage:480,phase:3,pf:.8,parallelSets:1,target:3,voltageConfirmed:true};
 const old=createSnapshot({id:'drop',title:'Voltage drop',fields:[]},state,calc.drop(state),{appVersion:'2.11.0',generatedAt:'2025-01-02T03:04:05.000Z',codeEdition:'Historical Table 9 report'}),h=harness(),record=h.store.save(old),frozen=JSON.stringify(record.snapshot),pdf=createPDF(record.snapshot),summary=summaryFromSnapshot(record.snapshot);
 h.ui.savedLibrary();savedButton(h,'load',record.id).onclick();assertReady(h);assert.equal(h.ui.states.drop.impedanceMode,'table9');assert.equal(h.ui.states.drop.voltageConfirmed,undefined);assert.equal(h.ui.states.drop.target,undefined);assert.equal(h.ui.states.drop.resistance,'');assert.equal(h.ui.states.drop.reactance,'');assert.doesNotMatch(copySummaryFromSnapshot(h.ui.getSnapshot()),/MV cable preset:|MV conductor size:/);
 h.change('impedanceMode','mvPreset');h.change('voltagePreset','custom');h.change('voltage',2400);assertReady(h);assert.equal(JSON.stringify(h.store.load(record.id).snapshot),frozen);assert.equal(summaryFromSnapshot(h.store.load(record.id).snapshot),summary);assert.deepEqual(createPDF(h.store.load(record.id).snapshot),pdf);
});
await test('historical MV snapshots retain recorded coefficients even when current engine recalculates',()=>{
 const h=open(),old=plain(h.ui.getSnapshot());old.generatedAt='2025-01-02T03:04:05.000Z';old.result.results.find(r=>r.label==='Series reactance X').value=.9876;old.result.results.find(r=>r.label==='Series reactance X').displayValue='0.9876';old.result.steps.push('Historical saved coefficient basis retained verbatim.');old.inputRows.push({label:'Historical review note',value:'Frozen report only'});
 const record=h.store.save(old),frozen=JSON.stringify(record.snapshot),pdf=createPDF(record.snapshot),summary=summaryFromSnapshot(record.snapshot);
 h.ui.savedLibrary();savedButton(h,'pdf',record.id).onclick();assert.deepEqual(createPDF(h.pdfs.at(-1)),pdf);savedButton(h,'load',record.id).onclick();assertReady(h);assert.equal(value(h.ui.getSnapshot(),'Series reactance X'),.0401);assert.doesNotMatch(summaryFromSnapshot(h.ui.getSnapshot()),/Historical saved coefficient|Historical review note/);
 assert.equal(JSON.stringify(h.store.load(record.id).snapshot),frozen);assert.equal(summaryFromSnapshot(h.store.load(record.id).snapshot),summary);assert.deepEqual(createPDF(h.store.load(record.id).snapshot),pdf);
});
// Extended catalog workflows retain assumptions as visible input guidance and
// snapshot-owned output rows, including the compact inputs/outputs clipboard.
const extendedFamilies=Object.entries(calc.mvCableFamilies).filter(([,family])=>family.voltage>2400);
const stateFor=(id,family,mvTemperature=family.temperature)=>({...base,mvFamily:id,mvSize:calc.mvSizeOptions({mvFamily:id})[0][0],mvArrangement:calc.mvArrangementOptions({mvFamily:id})[0][0],mvTemperature,voltage:family.voltage});
const pdfContent=snapshot=>[...new TextDecoder().decode(createPDF(snapshot)).matchAll(/\(((?:\\.|[^\\)])*)\) Tj ET/g)].map(m=>m[1].replace(/\\([\\()])/g,'$1')).join(' ').replace(/\s+/g,' ');
for(const [id,family] of extendedFamilies)for(const [temperature] of calc.mvTemperatureOptions({mvFamily:id}))await test(`${id}/${temperature}: assumptions survive copy, PDF, save, load and reload`,async()=>{
 const state=stateFor(id,family,temperature),h=open(state);assertReady(h);const selected=calc.mvPresetImpedance(state),snapshot=plain(h.ui.getSnapshot());
 const html=h.nodes['#main'].innerHTML,assumptions=html.match(/<details\b([^>]*data-mv-assumptions[^>]*)>([\s\S]*?)<\/details>/);assert.ok(assumptions);assert.doesNotMatch(assumptions[1],/\bopen\b/);assert.match(html,/engineering assumptions/i);
 assert.ok(family.assumptionNote,'Extended catalog assumptions must be explicit');assert.equal(value(snapshot,'Engineering assumptions'),family.assumptionNote);assert.match(value(snapshot,'Reference qualification'),/engineering assumptions/);
 assert.match(snapshot.result.steps.join('\n'),/Engineering assumptions:/);assert.equal(value(snapshot,'Cable insulation level'),family.insulationLevel);
 for(const text of [summaryFromSnapshot(snapshot),copySummaryFromSnapshot(snapshot)]){
  assert.ok(text.includes(family.assumptionNote));assert.ok(text.includes(family.applicationNote),'Compact and full reports retain the 133% application condition');assert.ok(text.includes(family.model));assert.ok(text.includes(family.insulationLevel));assert.ok(text.includes(family.reference));assert.ok(text.includes(String(selected.r)));assert.ok(text.includes(String(selected.x)));
  if(family.frequencyAssumed)assert.match(text,/60 Hz.*assum|assum.*60 Hz/i);
  if(Number(temperature)!==family.temperature)assert.match(text,/R90 = 0\.96 × R105; X unchanged/);
 }
 assert.ok(snapshot.result.sources.some(s=>s.url===family.url&&/engineering assumptions/.test(s.label)));
 if(family.applicationNote){assert.equal(value(snapshot,'Cable application basis'),family.applicationNote);assert.ok(snapshot.result.warnings.some(w=>w.includes(family.applicationNote)));assert.ok(html.includes(family.applicationNote));}
 const readablePDF=pdfContent(snapshot);assert.ok(readablePDF.includes(pdfText(family.assumptionNote).replace(/\s+/g,' ')),'PDF retains complete engineering-assumption wording');assert.ok(readablePDF.includes(pdfText(family.applicationNote).replace(/\s+/g,' ')),'PDF retains complete application condition');
 if(Number(temperature)!==family.temperature)assert.match(readablePDF,/R90 = 0\.96 x R105; X unchanged/);
 await h.nodes['#copy-summary'].onclick();assert.equal(h.copied.at(-1),copySummaryFromSnapshot(snapshot));h.nodes['#export-pdf'].onclick();assert.deepEqual(h.pdfs.at(-1),snapshot);
 h.nodes['#save-calculation'].onclick();const record=h.store.list()[0],frozen=JSON.stringify(record.snapshot),bytes=createPDF(record.snapshot);
 h.change('mvFamily','mv90-epr-2400');assertBlocked(h);h.ui.savedLibrary();savedButton(h,'load',record.id).onclick();assertReady(h);assert.equal(value(h.ui.getSnapshot(),'Engineering assumptions'),family.assumptionNote);assert.equal(value(h.ui.getSnapshot(),'Series resistance R'),selected.r);
 const again=harness({},h.data);again.ui.calculator('drop');assertReady(again);assert.equal(Number(again.ui.states.drop.mvTemperature),Number(temperature));assert.equal(again.ui.states.drop.mvFamily,id);assert.equal(JSON.stringify(again.store.load(record.id).snapshot),frozen);assert.deepEqual(createPDF(again.store.load(record.id).snapshot),bytes);
});
for(const [id,family] of extendedFamilies)await test(`${id}: family transition reconciles dependent choices without changing voltage`,()=>{
 const h=open();h.change('mvFamily',id);assertReady(h);assert.equal(h.ui.states.drop.voltage,2400);assert.equal(h.ui.states.drop.mvArrangement,calc.mvArrangementOptions({mvFamily:id})[0][0]);
 const supportedTemps=calc.mvTemperatureOptions({mvFamily:id}).map(([v])=>Number(v));assert.ok(supportedTemps.includes(Number(h.ui.states.drop.mvTemperature)));
 if(supportedTemps.includes(105)){h.change('mvTemperature',105);assertReady(h);h.change('mvFamily','mv90-epr-2400');assert.equal(Number(h.ui.states.drop.mvTemperature),90);assertReady(h);}
 h.change('mvFamily',id);h.change('voltage',family.voltage);assertReady(h);h.change('mvFamily','mv90-epr-2400');assert.equal(h.ui.states.drop.voltage,family.voltage);assertBlocked(h);
});
for(const [id,family] of extendedFamilies)for(const patch of [{mvArrangement:'nonferrous-touching'},{mvTemperature:75},{phase:1},{parallelSets:2}])await test(`${id}: incompatible saved ${JSON.stringify(patch)} stays blocked`,()=>{
 const h=open({...stateFor(id,family),...patch});assertBlocked(h);assert.doesNotMatch(h.nodes['#main'].innerHTML,/id="mv-edit-rx"/);
 const again=harness({},h.data);again.ui.calculator('drop');assertBlocked(again);
});
for(const [id,family] of extendedFamilies.filter(([,family])=>family.voltage===35000))await test(`${id}: 34.5 kV entry retains 35 kV class, exact ceiling and manual escape hatch`,()=>{
 const h=open({...stateFor(id,family),voltage:34500});assertReady(h);assert.equal(h.ui.getSnapshot().inputs.voltage,34500);assert.equal(Number(h.inputs.find(n=>n.name==='voltage').max),35000);assert.match(h.nodes['#main'].innerHTML,/35 kV cable class/);
 h.change('voltage',35000);assertReady(h);h.change('voltage',35000.001);assertBlocked(h);h.change('voltage',34500);assertReady(h);h.nodes['#mv-edit-rx'].onclick();assertReady(h);assert.equal(h.inputs.find(n=>n.name==='impedanceBasis').maxlength,'1800');h.change('voltage',35000.001);assertReady(h);
});
for(const kv of [5,15,25,35])await test(`${kv} kV: switching 105°C factory-3C to MV-90 resets temperature and geometry`,()=>{
 const eprId=`mv105-epr-${kv*1000}`,cnId=`mv90-cn-${kv*1000}`,h=open(stateFor(eprId,calc.mvCableFamilies[eprId],105));assertReady(h);h.change('mvFamily',cnId);assertReady(h);
 assert.equal(Number(h.ui.states.drop.mvTemperature),90);assert.equal(h.ui.states.drop.mvArrangement,'direct-buried-flat-7.5');assert.equal(h.ui.states.drop.voltage,kv*1000);assert.match(options(h,'mvTemperature'),/value="90"/);assert.doesNotMatch(options(h,'mvTemperature'),/value="105"/);assert.match(h.nodes['#main'].innerHTML,/UL MV-90 ordering option required/);
 const details=h.nodes['#results'].innerHTML.match(/<details\b([^>]*calculation-details[^>]*)>([\s\S]*?)<\/details>/);assert.ok(details);assert.doesNotMatch(details[1],/\bopen\b/);assert.match(details[2],/ampacity.*impedance is assumed/);assert.doesNotMatch(h.nodes['#results'].innerHTML,/<div class="warning/);
 h.change('mvFamily',eprId);assertReady(h);assert.equal(Number(h.ui.states.drop.mvTemperature),90);assert.equal(h.ui.states.drop.mvArrangement,'factory-3c-shorted');assert.match(h.nodes['#results'].innerHTML,/Manufacturer estimate/);assert.doesNotMatch(h.nodes['#results'].innerHTML,/<div class="warning/);
});
console.log(`${passed} MV preset modeled-UI cases passed: family/temperature/mode controls, collapsed notes, exact R/X override, validation, copy/PDF/save/load/reload/reset/dashboard and immutable historical reports.`);
