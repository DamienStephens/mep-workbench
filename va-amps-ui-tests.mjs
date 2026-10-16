// Modeled DOM, HTML constraints and real report/store integration. Not browser QA.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as calc from './dist/calc.js';
import {systemOptions,voltageOptions} from './dist/voltage.js';
import {createSnapshot,buildSummary,summaryFromSnapshot,copySummaryFromSnapshot,createRecordStore,projectNames,projectKey,RECORDS_KEY} from './dist/calculation-records.js';
import {createDashboardStore} from './dist/dashboard.js';
import {transformerProtection,evaluateTransformerProtection,migrateProtectionState,transformerBreakerOptions,transformerOcpdRatings,secondaryRuleConditions} from './dist/transformer-protection.js';
import {createPDF} from './dist/pdf-report.js';

let passed=0;
const test=async(name,fn)=>{try{await fn();passed++;}catch(error){console.error(name);throw error;}};
const source=fs.readFileSync(new URL('./dist/app.js',import.meta.url),'utf8').replace(/^import[^\n]+\n/gm,'').replace(/route\(\);\s*$/,'');
// Keep the real form controls in validation, rather than bypassing checkValidity.
// This extends the voltage-selector suite's harness with navigation/favorites and
// actual click paths for asynchronous clipboard and generated PDF snapshots.
function harness(saved={},existing){
 const data=existing||new Map([['mep-workbench-v1',JSON.stringify(saved)]]),writes=[],storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>{writes.push(k);data.set(k,v);}},handlers={},nodes={},pdfs=[],copied=[];
 let main='',navigation='',buttons,inputs;
 const node=()=>({innerHTML:'',textContent:'',attributes:{},addEventListener:(name,fn)=>handlers[name]=fn,querySelector:()=>null,focus(){document.activeElement=this;},setAttribute(name,value){this.attributes[name]=String(value);this[name]=String(value);},getAttribute(name){return this.attributes[name]??null;}});
 for(const k of ['#main','#navigation','#calculator-form','#results','#sources','#reset','#print','#copy-summary','#export-pdf','#save-calculation','#action-status','#storage-status','#add-row','#clear-all-calculations','#saved-heading'])nodes[k]=node();
 Object.defineProperty(nodes['#main'],'innerHTML',{get:()=>main,set:value=>{main=value;buttons=inputs=undefined;}});
 Object.defineProperty(nodes['#navigation'],'innerHTML',{get:()=>navigation,set:value=>{navigation=value;buttons=undefined;}});
 const attrs=html=>Object.fromEntries([...html.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
 function formInputs(){return inputs??=(main.match(/<form\b[\s\S]*?<\/form>/)?.[0].match(/<input\b[^>]+>/g)||[]).map(html=>({...node(),...attrs(html),required:/\brequired\b/.test(html),checkValidity(){if(this.value==='')return !this.required;if(this.type==='text')return this.value.length<=Number(this.maxlength??Infinity);const n=Number(this.value);return Number.isFinite(n)&&(this.min===undefined||n>=Number(this.min))&&(this.max===undefined||n<=Number(this.max))&&(this.step==='any'||this.step===undefined||Number.isInteger(n/Number(this.step)));}}));}
 function actionButtons(){return buttons??=[...(navigation+main).matchAll(/<button\b([^>]+)>/g)].map(m=>({...node(),attributes:attrs(m[1]),dataset:Object.fromEntries(Object.entries(attrs(m[1])).filter(([k])=>k.startsWith('data-')).map(([k,v])=>[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase()),v]))}));}
 const document={activeElement:null,querySelector:k=>{const favorite=k.match(/^\[data-favorite="([^"]+)"\]$/),name=k.match(/^\[name="([^"]+)"\]$/);return favorite?actionButtons().find(b=>b.dataset.favorite===favorite[1]):name?formInputs().find(n=>n.name===name[1]):nodes[k];},querySelectorAll:k=>k==='#calculator-form input:not([data-ambient-helper])'?formInputs():k==='[data-record-action]'?actionButtons().filter(b=>b.dataset.recordAction):k==='[data-recent]'?actionButtons().filter(b=>b.dataset.recent!==undefined):k==='[data-favorite]'?actionButtons().filter(b=>b.dataset.favorite):[]};
 let hash='';const location={};Object.defineProperty(location,'hash',{get:()=>hash,set:value=>{hash=value?'#'+String(value).replace(/^#/,''):'';}});
 const context=vm.createContext({projectNames,projectKey,createDashboardStore:()=>createDashboardStore(storage),calc,systemOptions,voltageOptions,createSnapshot,buildSummary,summaryFromSnapshot,copySummaryFromSnapshot,createRecordStore:()=>createRecordStore(storage),transformerProtection,evaluateTransformerProtection,migrateProtectionState,transformerBreakerOptions,transformerOcpdRatings,secondaryRuleConditions,downloadPDF:s=>pdfs.push(structuredClone(s)),showRecordDialog:options=>options.onSave({projectName:'VA conversions',calculationName:'Saved conversion'}),confirmRecordClear(){},closeRecordDialog(){},structuredClone,console,localStorage:storage,location,navigator:{clipboard:{writeText:async text=>copied.push(text)}},attachAmbientHelper(){},window:{addEventListener(){},print(){},scrollTo(){}},document});
 vm.runInContext(source+';globalThis.ui={states,modules,dashboardStore,calculator,overview,savedLibrary,route,makeSnapshot,fieldHTML,defaults,getSnapshot:()=>currentSnapshot};',context);
 return {ui:context.ui,data,storage,nodes,pdfs,copied,writes,document,store:createRecordStore(storage),get buttons(){return actionButtons();},get inputs(){return formInputs();},navigate(id){location.hash='#'+id;context.ui.route();},change(name,value,tagName='SELECT'){const input=formInputs().find(n=>n.name===name);if(input)input.value=String(value);handlers.change({type:'change',target:{name,value:String(value),tagName:input?'INPUT':tagName,type:input?.type,dataset:{},matches:()=>true}});}};
}
const title='Watts / VA / Amps';
const modes=[['wattsToAmps','Watts → Amps','Real power','W','Current'],['ampsToWatts','Amps → Watts','Line current','A','Real input power'],['vaToAmps','VA → Amps','Apparent power','VA','Current'],['ampsToVA','Amps → VA','Line current','A','Apparent power']];
const isVA=mode=>mode==='vaToAmps'||mode==='ampsToVA';
const state=(mode,phase=3)=>({mode,value:mode.endsWith('Amps')?10000.123456789:30.123456789,phase,voltage:480,pf:.85});
const resultRow=(snapshot,label)=>snapshot.result.results.find(row=>row.label===label);
const pdfText=snapshot=>new TextDecoder().decode(createPDF(snapshot)).replace(/\\([\\()])/g,'$1');
const plain=value=>JSON.parse(JSON.stringify(value));
const assertReady=h=>{assert.ok(h.ui.getSnapshot(),h.nodes['#results'].innerHTML+' '+h.nodes['#action-status'].textContent);for(const id of ['#copy-summary','#export-pdf','#save-calculation'])assert.equal(h.nodes[id].disabled,false);};
const assertBlocked=h=>{assert.equal(h.ui.getSnapshot(),null);for(const id of ['#copy-summary','#export-pdf','#save-calculation'])assert.equal(h.nodes[id].disabled,true);assert.match(h.nodes['#results'].innerHTML,/role="alert"/);};
const loadButton=(h,id)=>h.buttons.find(b=>b.dataset.recordAction==='load'&&(!id||b.dataset.recordId===id));

await test('module title, sidebar, dashboard and four-way control share stable amps identity',()=>{
 const h=harness();h.navigate('amps');const m=h.ui.modules.find(m=>m.id==='amps');
 assert.equal(m.title,title);assert.equal(m.nav,title);assert.equal(h.ui.modules.filter(m=>m.id==='amps').length,1);
 assert.equal(h.document.title,`${title} · MEP Workbench`);assert.match(h.nodes['#main'].innerHTML,/<h1>Watts \/ VA \/ Amps<\/h1>/);
 assert.match(h.nodes['#navigation'].innerHTML,/<a[^>]+href="#amps"[^>]*>Watts \/ VA \/ Amps<\/a>/);
 const options=h.nodes['#main'].innerHTML.match(/<select[^>]+name="mode"[^>]*>(.*?)<\/select>/)[1];
 assert.equal((options.match(/<option /g)||[]).length,4);
 for(const [mode,label] of modes)assert.ok(options.includes(`value="${mode}"`));
 for(const [,label] of modes)assert.ok(options.includes(label));
 h.navigate('overview');assert.match(h.nodes['#main'].innerHTML,/<a href="#amps">Watts \/ VA \/ Amps /);
 assert.doesNotMatch(h.nodes['#main'].innerHTML,/Watts \/ Amps/);
});
await test('live single-phase voltage choices stay plain and omit across-load wording',()=>{
 const h=harness();h.navigate('amps');
 const options=h.nodes['#main'].innerHTML.match(/<select[^>]+name="voltagePreset"[^>]*>(.*?)<\/select>/)[1];
 assert.match(options,/<option value="120"[^>]*>120 V<\/option>/);
 assert.match(options,/<option value="240"[^>]*>240 V<\/option>/);
 assert.doesNotMatch(options,/across load|line-neutral|line-line/i);
 assert.match(h.nodes['#main'].innerHTML,/voltage supplied to the equipment/);
 for(const [mode] of modes){h.change('mode',mode);assertReady(h);assert.doesNotMatch(h.nodes['#main'].innerHTML+h.nodes['#results'].innerHTML,/across (?:the )?load/i);assert.doesNotMatch(summaryFromSnapshot(h.ui.getSnapshot()),/across (?:the )?load/i);}
 h.change('phase',3);h.change('voltagePreset',480);assertReady(h);assert.match(h.nodes['#main'].innerHTML,/480 V · line-to-line/);
 h.navigate('drop');assert.match(h.nodes['#main'].innerHTML,/Starting Voltage/);
 for(const filename of fs.readdirSync(new URL('./dist/',import.meta.url)).filter(name=>/\.(?:js|html)$/.test(name)))assert.doesNotMatch(fs.readFileSync(new URL(`./dist/${filename}`,import.meta.url),'utf8'),/across (?:the )?load/i,filename);
});

for(const [mode,label,valueLabel,unit,hero] of modes)for(const phase of [1,3])await test(`${mode}, phase ${phase}: visible inputs, primary result and copy/PDF outputs`,async()=>{
 const input=state(mode,phase),h=harness({amps:input});h.navigate('amps');assertReady(h);
 const html=h.nodes['#main'].innerHTML,snapshot=h.ui.getSnapshot(),current=resultRow(snapshot,'Current');
 assert.match(html,new RegExp(`<label for="field-value">${valueLabel} <span class="field-unit">\\(${unit}\\)</span></label>`));
 assert.match(html,new RegExp(`<option value="${mode}" selected>`));
 assert.equal(h.inputs.some(n=>n.name==='pf'),!isVA(mode));
 assert.equal(snapshot.inputRows.some(r=>r.label==='Power factor (PF)'),!isVA(mode));
 assert.equal(snapshot.inputRows.find(r=>r.label==='Conversion').value,label);
 assert.equal(snapshot.inputRows.find(r=>r.label===`${valueLabel} (${unit})`).value,String(input.value));
 assert.match(h.nodes['#results'].innerHTML,new RegExp(`<div class="result-kicker">${hero}</div>`));
 assert.equal(snapshot.moduleId,'amps');assert.equal(snapshot.moduleTitle,title);assert.equal(snapshot.appVersion,'2.14.0');
 assert.deepEqual(snapshot.result,calc.amps(snapshot.inputs));
 await h.nodes['#copy-summary'].onclick();assert.equal(h.copied.length,1);assert.equal(h.copied[0],copySummaryFromSnapshot(snapshot));
 assert.ok(h.copied[0].includes(`Current: ${current.displayValue} A`));
 assert.doesNotMatch(h.copied[0],/METHOD|SOURCES|ASSUMPTIONS/);
 h.nodes['#export-pdf'].onclick();assert.equal(h.pdfs.length,1);assert.deepEqual(h.pdfs[0],snapshot);
 const report=summaryFromSnapshot(snapshot),pdf=pdfText(h.pdfs[0]);
 assert.ok(report.includes(`Current: ${current.displayValue} A`));assert.ok(pdf.includes(`Current: ${current.displayValue} A`));
 assert.match(pdf,/Watts \/ VA \/ Amps/);assert.match(pdf,/Application: 2\.14\.0/);
 if(isVA(mode)){
  assert.deepEqual(snapshot.result.results.map(r=>r.label),['Current','Apparent power']);
  assert.doesNotMatch(h.copied[0],/Power factor \(PF\)|Real input power:/);
  assert.doesNotMatch(report,/Power factor \(PF\):|Real input power:/);assert.doesNotMatch(pdf,/Power factor \(PF\):|Real input power:/);
  assert.ok(Number.isFinite(current.rawValue));assert.ok(Number.isFinite(resultRow(snapshot,'Apparent power').rawValue));
  if(phase===3){assert.match(report,/√3/);assert.match(pdf,/sqrt\(3\)/);}
 }else assert.match(h.copied[0],/Power factor \(PF\): 0\.85/);
});

for(const mode of ['vaToAmps','ampsToVA'])for(const pf of ['',null,0,-1,1.5,'invalid',true,false,[],{}])await test(`${mode}: hidden PF ${JSON.stringify(pf)} cannot block validation or exports`,async()=>{
 const h=harness({amps:{...state(mode),pf}});h.navigate('amps');assertReady(h);
 assert.equal(h.inputs.some(n=>n.name==='pf'),false);
 assert.equal(h.ui.getSnapshot().inputRows.some(r=>/Power factor/.test(r.label)),false);
 const baseline=calc.amps({...state(mode)});assert.deepEqual(h.ui.getSnapshot().result,baseline);
 await h.nodes['#copy-summary'].onclick();h.nodes['#export-pdf'].onclick();h.nodes['#save-calculation'].onclick();
 assert.equal(h.copied.length,1);assert.equal(h.pdfs.length,1);assert.equal(h.store.list().length,1);
 assert.deepEqual(h.store.list()[0].snapshot.result,baseline);
});
for(const mode of ['wattsToAmps','ampsToWatts'])await test(`${mode}: invalid PF blocks, VA switch recovers, and switching back restores validation`,()=>{
 const h=harness({amps:state(mode)});h.navigate('amps');assertReady(h);h.change('pf','');assertBlocked(h);
 const va=mode==='wattsToAmps'?'vaToAmps':'ampsToVA';
 for(let i=0;i<3;i++){
  h.change('mode',va);assertReady(h);assert.equal(h.ui.states.amps.pf,'');assert.equal(h.inputs.some(n=>n.name==='pf'),false);
  h.change('mode',mode);assertBlocked(h);assert.equal(h.inputs.find(n=>n.name==='pf').value,'');
 }
 h.change('pf',.8);assertReady(h);h.change('mode',va);assertReady(h);h.change('mode',mode);assertReady(h);assert.equal(h.ui.states.amps.pf,.8);
});
await test('repeated four-way switching preserves value, phase, voltage and PF without cross-mode outputs',()=>{
 const h=harness({amps:state('wattsToAmps')});h.navigate('amps');
 for(let i=0;i<3;i++)for(const [mode,,label,unit,hero] of modes){
  h.change('mode',mode);assertReady(h);assert.equal(h.ui.states.amps.value,10000.123456789);assert.equal(h.ui.states.amps.voltage,480);assert.equal(Number(h.ui.states.amps.phase),3);assert.equal(h.ui.states.amps.pf,.85);
  assert.ok(h.ui.getSnapshot().inputRows.some(r=>r.label===`${label} (${unit})`));
  assert.match(h.nodes['#results'].innerHTML,new RegExp(`<div class="result-kicker">${hero}</div>`));
  assert.equal(h.ui.getSnapshot().result.results.length,isVA(mode)?2:3);
 }
});

for(const [mode] of modes)await test(`${mode}: save, reload, load and reset preserve full snapshots and defaults`,()=>{
 const h=harness({amps:state(mode)});h.navigate('amps');h.change('voltagePreset','custom');h.change('voltage',525.25);h.change('value',mode.endsWith('Amps')?149.988:1.2499);assertReady(h);
 const before=h.ui.getSnapshot();h.nodes['#save-calculation'].onclick();const record=h.store.list()[0],frozen=JSON.stringify(record),pdf=createPDF(record.snapshot),summary=summaryFromSnapshot(record.snapshot);
 assert.equal(record.snapshot.inputs.mode,mode);assert.equal(record.snapshot.inputs.voltageMode,'custom');assert.deepEqual(record.snapshot.result,before.result);
 h.change('mode',mode==='wattsToAmps'?'ampsToVA':'wattsToAmps');h.change('value',999);h.navigate('saved');loadButton(h,record.id).onclick();assertReady(h);
 assert.equal(h.ui.states.amps.mode,mode);assert.equal(h.ui.states.amps.value,before.inputs.value);assert.equal(h.ui.states.amps.voltage,525.25);assert.equal(h.ui.states.amps.voltageMode,'custom');assert.deepEqual(h.ui.getSnapshot().result,record.snapshot.result);
 assert.equal(JSON.stringify(h.store.load(record.id)),frozen);assert.deepEqual(createPDF(h.store.load(record.id).snapshot),pdf);assert.equal(summaryFromSnapshot(h.store.load(record.id).snapshot),summary);
 const reloaded=harness({},h.data);reloaded.navigate('amps');assertReady(reloaded);assert.equal(reloaded.ui.states.amps.mode,mode);assert.equal(reloaded.ui.states.amps.voltage,525.25);assert.deepEqual(reloaded.ui.getSnapshot().result,record.snapshot.result);
 reloaded.nodes['#reset'].onclick();assertReady(reloaded);assert.equal(reloaded.ui.states.amps.mode,'wattsToAmps');assert.equal(reloaded.ui.states.amps.value,2400);assert.equal(Number(reloaded.ui.states.amps.phase),1);assert.equal(reloaded.ui.states.amps.voltage,240);assert.equal(reloaded.ui.states.amps.pf,1);
 assert.equal(reloaded.ui.getSnapshot().inputRows.some(r=>r.label==='Power factor (PF)'),true);assert.equal(JSON.stringify(reloaded.store.load(record.id)),frozen);
 const resetReload=harness({},h.data);resetReload.navigate('amps');assert.equal(resetReload.ui.states.amps.mode,'wattsToAmps');assert.equal(resetReload.ui.states.amps.voltage,240);
});

for(const mode of ['vaToAmps','ampsToVA'])await test(`${mode}: custom/standard voltage and phase switches never silently repair invalid inputs`,()=>{
 const h=harness({amps:{...state(mode,1),voltage:120}});h.navigate('amps');assertReady(h);h.change('phase',3);assertBlocked(h);assert.equal(h.ui.states.amps.voltage,120);assert.match(h.nodes['#main'].innerHTML,/saved: 120/);
 h.change('voltagePreset',208);assertReady(h);h.change('voltagePreset','custom');h.change('voltage',13800);assertReady(h);assert.equal(h.inputs.find(n=>n.name==='voltage').max,undefined);
 for(const voltage of [.0001,525.25,13800,34500]){h.change('voltage',voltage);assertReady(h);assert.equal(h.ui.getSnapshot().inputs.voltage,voltage);assert.ok(h.inputs.find(n=>n.name==='voltage').checkValidity());}
 for(let i=0;i<3;i++){h.change('voltagePreset',480);assertReady(h);assert.equal(h.ui.states.amps.voltage,480);h.change('voltagePreset','custom');assertReady(h);assert.equal(h.ui.states.amps.voltage,34500);}
 h.change('phase',1);assertReady(h);assert.equal(h.ui.states.amps.voltage,34500);h.change('phase',3);assertReady(h);
});
for(const mode of ['vaToAmps','ampsToVA'])for(const [key,value] of [['value',-1],['value',''],['voltage',0],['voltage',-1],['voltage',''],['voltage','Infinity']])await test(`${mode}: invalid ${key}=${value} removes stale exportable results`,async()=>{
 const h=harness({amps:{...state(mode),voltageMode:'custom'}});h.navigate('amps');assertReady(h);h.change(key,value);assertBlocked(h);
 await h.nodes['#copy-summary'].onclick();h.nodes['#export-pdf'].onclick();h.nodes['#save-calculation'].onclick();assert.equal(h.copied.length,0);assert.equal(h.pdfs.length,0);assert.equal(h.store.list().length,0);
 h.change(key,key==='voltage'?525.25:0);assertReady(h);
});
for(const mode of ['vaToAmps','ampsToVA'])await test(`${mode}: legacy explicit voltage-system mismatch remains blocked until corrected`,()=>{
 const h=harness({amps:{...state(mode),voltageSystem:'wye208'}});h.navigate('amps');assertBlocked(h);assert.equal(h.ui.states.amps.voltage,480);assert.match(h.nodes['#main'].innerHTML,/saved:/);
 h.change('voltagePreset',480);assertReady(h);assert.equal(h.ui.states.amps.voltageSystem,'auto');
});

// Historical snapshot data is literal: neither title nor stored numeric values
// are rebuilt from today's module definition or calculator implementation.
const legacySnapshot={moduleId:'amps',moduleTitle:'Watts / Amps',inputs:{mode:'wattsToAmps',value:149.988,voltage:120,phase:'1',pf:1},inputRows:[{label:'Conversion',value:'Watts → Amps'},{label:'Real power (W)',value:'149.988'},{label:'Load phase',value:'Single-phase'},{label:'Voltage (V)',value:'120 · standard · across load (line-neutral or line-line)'},{label:'Power factor (PF)',value:'1'}],result:{results:[{label:'Current',value:1.25,displayValue:'1.2',unit:'A'},{label:'Real input power',value:149.988,unit:'W'},{label:'Apparent power',value:149.988,unit:'VA'}],steps:['P = V × I × PF.','I = P / (1 × 120 × 1).'],warnings:['Electrical input watts only; mechanical output requires an efficiency adjustment. Not a branch-circuit sizing result.'],sources:[]},limitations:['Three-phase calculation assumes a balanced load and line-to-line voltage.'],appVersion:'2.12.0',codeEdition:'Electrical relationships; not an NEC sizing determination',generatedAt:'2026-10-14T10:00:00.000Z',projectName:'Historical circuits',calculationName:'Original W conversion'};
await test('legacy W snapshots, summaries and PDF bytes stay immutable through load, VA edits and new saves',()=>{
 const h=harness(),record=h.store.save(legacySnapshot),frozen=JSON.stringify(record),summary=summaryFromSnapshot(record.snapshot),copy=copySummaryFromSnapshot(record.snapshot),pdf=createPDF(record.snapshot),storageBefore=h.data.get(RECORDS_KEY);
 h.navigate('saved');assert.match(h.nodes['#main'].innerHTML,/Watts \/ Amps · v2\.12\.0/);
 h.buttons.find(b=>b.dataset.recordAction==='pdf').onclick();assert.deepEqual(createPDF(h.pdfs[0]),pdf);
 loadButton(h,record.id).onclick();assertReady(h);assert.equal(h.ui.getSnapshot().moduleTitle,title);assert.equal(h.ui.getSnapshot().appVersion,'2.14.0');assert.equal(h.ui.states.amps.mode,'wattsToAmps');assert.equal(h.ui.states.amps.pf,1);
 assert.equal(h.data.get(RECORDS_KEY),storageBefore,'Loading must not rewrite the saved library');
 h.change('mode','vaToAmps');h.change('value',10000);h.nodes['#save-calculation'].onclick();assert.equal(h.store.list().length,2);
 assert.equal(JSON.stringify(h.store.load(record.id)),frozen);assert.equal(summaryFromSnapshot(h.store.load(record.id).snapshot),summary);assert.equal(copySummaryFromSnapshot(h.store.load(record.id).snapshot),copy);assert.deepEqual(createPDF(h.store.load(record.id).snapshot),pdf);
 h.navigate('saved');loadButton(h,record.id).onclick();assertReady(h);assert.equal(h.ui.states.amps.mode,'wattsToAmps');assert.equal(resultRow(h.ui.getSnapshot(),'Current').displayValue,'1.2');
 assert.deepEqual(legacySnapshot.inputs,{mode:'wattsToAmps',value:149.988,voltage:120,phase:'1',pf:1});
});
for(const [mode] of modes.filter(([mode])=>!isVA(mode)))await test(`legacy persisted ${mode} inputs preserve mode/value/PF and recalculation`,()=>{
 const saved={...state(mode),voltage:525.25,voltageMode:'custom'},h=harness({amps:saved});h.navigate('amps');assertReady(h);
 for(const key of ['mode','value','voltage','voltageMode','pf'])assert.equal(h.ui.states.amps[key],saved[key]);
 assert.deepEqual(h.ui.getSnapshot().result,calc.amps(saved));assert.equal(h.ui.getSnapshot().moduleTitle,title);
});

for(const mode of ['vaToAmps','ampsToVA'])await test(`${mode}: dashboard resume/favorites and navigation persist mode and module isolation`,()=>{
 const h=harness({power:{mode:'vaToWatts',va:3210,pf:.6}});h.navigate('amps');h.change('mode',mode);h.change('phase',3);h.change('voltagePreset','custom');h.change('voltage',525.25);h.change('value',17.123456);assertReady(h);
 const expected=plain(h.ui.states.amps),power=plain(h.ui.states.power),results=h.ui.getSnapshot().result;
 h.buttons.find(b=>b.dataset.favorite==='amps').onclick();assert.equal(h.ui.dashboardStore.isFavorite('amps'),true);
 for(const id of ['power','transformer','drop','amps'])h.navigate(id);
 assertReady(h);assert.deepEqual(plain(h.ui.states.amps),expected);assert.deepEqual(plain(h.ui.states.power),power);assert.deepEqual(h.ui.getSnapshot().result,results);
 h.navigate('overview');assert.match(h.nodes['#main'].innerHTML,/<h3>Watts \/ VA \/ Amps<\/h3>/);assert.match(h.nodes['#main'].innerHTML,/<strong>Watts \/ VA \/ Amps<\/strong>/);
 const entries=h.ui.dashboardStore.getSnapshot().recentEntries,index=entries.findIndex(r=>r.moduleId==='amps'&&r.state.mode===mode&&r.state.value===17.123456);assert.ok(index>=0);
 h.ui.states.amps.mode='wattsToAmps';h.buttons.find(b=>b.dataset.recent===String(index)).onclick();h.ui.route();assertReady(h);assert.equal(h.ui.states.amps.mode,mode);assert.equal(h.ui.states.amps.voltage,525.25);assert.equal(h.ui.states.amps.value,17.123456);assert.deepEqual(h.ui.getSnapshot().result,results);
 const reloaded=harness({},h.data);reloaded.navigate('amps');assertReady(reloaded);assert.equal(reloaded.ui.states.amps.mode,mode);assert.equal(reloaded.ui.dashboardStore.isFavorite('amps'),true);assert.deepEqual(plain(reloaded.ui.states.power),power);
});

console.log(`${passed} VA/current modeled-UI regressions passed: four-way labels/results, hidden-PF validation, copy/PDF, saved/reloaded/reset states, historical immutability and dashboard/navigation persistence.`);
