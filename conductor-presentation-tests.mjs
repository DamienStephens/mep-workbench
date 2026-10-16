// Focused conductor presentation contracts and modeled DOM workflows.
// These checks do not substitute for browser visual, keyboard, print, clipboard or download QA.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as calc from './dist/calc.js';
import {systemOptions,voltageOptions} from './dist/voltage.js';
import {createPDF} from './dist/pdf-report.js';
import {createSnapshot,buildSummary,summaryFromSnapshot,copySummaryFromSnapshot,createRecordStore,projectKey,projectNames} from './dist/calculation-records.js';
import {transformerProtection,evaluateTransformerProtection,migrateProtectionState,transformerBreakerOptions,transformerOcpdRatings,secondaryRuleConditions} from './dist/transformer-protection.js';

const source=fs.readFileSync(new URL('./dist/app.js',import.meta.url),'utf8').replace(/^import[^\n]+\n/gm,'').replace(/route\(\);\s*$/,'');
const row=(result,label)=>{const item=result.results.find(r=>r.label===label);assert.ok(item,`Missing result: ${label}`);return item;};
const valid=result=>{assert.equal(result.error,undefined,result.error);return result;};
const round=value=>Number(value.toFixed(3));
const wire=label=>calc.conductors.find(w=>w.size===label.split(' ')[0]);
const base={ocpd:30,terminal:75,ambient:30,configuration:'single-phase-2-wire',parallelSets:1,material:'copper',racewayType:'emt',voltageDropEnabled:true,length:100,current:20,target:10,phase:1,voltage:120};

function harness(){
 const data=new Map(),storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
 const nodes={},listeners={},windowHandlers={},pdfs=[],copied=[],dialogs=[];
 let buttons=[],details=[],printCount=0;
 for(const key of ['#main','#navigation','#calculator-form','#results','#sources','#reset','#print','#copy-summary','#export-pdf','#save-calculation','#action-status','#storage-status','#clear-all-calculations','#saved-heading','#add-row']){
  nodes[key]={innerHTML:'',textContent:'',focus(){},addEventListener:(name,fn)=>listeners[name]=fn,querySelector:()=>null};
 }
 const context=vm.createContext({
  calc,systemOptions,voltageOptions,createSnapshot,buildSummary,summaryFromSnapshot,copySummaryFromSnapshot,projectKey,projectNames,
  createRecordStore:()=>createRecordStore(storage),transformerProtection,evaluateTransformerProtection,migrateProtectionState,transformerBreakerOptions,transformerOcpdRatings,secondaryRuleConditions,
  showRecordDialog:options=>dialogs.push(options),confirmRecordClear:options=>dialogs.push(options),closeRecordDialog(){},
  downloadPDF:snapshot=>pdfs.push(snapshot),attachAmbientHelper(){},structuredClone,console,localStorage:storage,location:{hash:''},
  navigator:{clipboard:{writeText:async text=>copied.push(text)}},
  window:{addEventListener:(name,fn)=>windowHandlers[name]=fn,scrollTo(){},print(){printCount++;}},
  document:{querySelector:key=>nodes[key],querySelectorAll:selector=>{
   if(selector==='details[data-print-details]')return details;
   if(selector==='[data-record-action]'){
    buttons=[...nodes['#main'].innerHTML.matchAll(/data-record-action="([^"]+)" data-record-id="([^"]+)"/g)].map(m=>({dataset:{recordAction:m[1],recordId:m[2]}}));
    return buttons;
   }
   return [];
  }}
 });
 vm.runInContext(source+';globalThis.ui={calculator,states,modules,defaults,fieldHTML,guidanceHTML,metricHTML,resultDetailsHTML,savedLibrary,calculate};',context);
 return {ui:context.ui,context,nodes,windowHandlers,pdfs,copied,dialogs,storage,store:createRecordStore(storage),
  get buttons(){return buttons;},get prints(){return printCount;},
  syncDetails(){
   details=[...(`${nodes['#main'].innerHTML}${nodes['#results'].innerHTML}`).matchAll(/<details\b([^>]*)><summary>([^<]+)<\/summary>/g)].filter(m=>/data-print-details/.test(m[1])).map(m=>({summary:m[2],open:/\sopen(?:\s|$)/.test(m[1])}));
   return details;
  },
  change(name,value,tagName='SELECT'){
   listeners.change({type:'change',target:{name,value:String(value),tagName,dataset:{},matches:()=>true}});
  }
 };
}

// Exact raw thresholds, including displayed values that round across a status boundary.
const edgeCases=[
 [3,3,'green','At or below 3%'],
 [3.0004,3,'orange','Above 3% and below 5%'],
 [4.9996,5,'orange','Above 3% and below 5%'],
 [5,5,'red','At or above 5%']
];
for(const [percent,display,status,statusText] of edgeCases){
 const cm=10380,length=percent*base.voltage*cm/(100*2*12.9*base.current);
 const rawVolts=2*12.9*length*base.current/cm,rawPercent=100*rawVolts/base.voltage;
 assert.equal(rawPercent,percent,'Fixture must exercise the stated raw boundary exactly');
 assert.equal(calc.dropStatus(rawPercent),status);
 const result=valid(calc.conductor({...base,length}));
 assert.equal(result.results[0].value,'10 AWG','Loose design target preserves the ampacity-selected conductor');
 assert.deepEqual(row(result,'Estimated voltage drop'),{label:'Estimated voltage drop',value:round(rawVolts),unit:'V',status});
 assert.deepEqual(row(result,'Estimated drop'),{label:'Estimated drop',value:display,unit:'%',status,statusText});
 assert.deepEqual(row(result,'Target check'),{label:'Target check',value:'Within target',status:'green'},'Guidance color is independent of the passing design target');
 assert.equal(row(result,'Voltage-drop target').value,10);
}
assert.equal(calc.dropStatus(0),'green');
assert.equal(calc.dropStatus(2.999999),'green');
assert.equal(calc.dropStatus(5.000001),'red');

// The same optional resistance calculation remains uncolored in the service module.
for(const [percent] of edgeCases){
 const length=percent*base.voltage*10380/(100*2*12.9*base.current);
 const result=valid(calc.service({...base,load:30,ocpd:60,length}));
 for(const label of ['Estimated voltage drop','Estimated drop','Target check']){
  assert.equal(Object.hasOwn(row(result,label),'status'),false,`Service must not add ${label} status`);
  assert.equal(Object.hasOwn(row(result,label),'statusText'),false);
 }
}

// Published Table 4 allowed area, not a recomputed/rounded 40% ratio, governs fill.
let fillBoundaryChecks=0;
for(const {sizes} of Object.values(calc.conductorRaceways))for(const raceway of sizes){
 assert.equal(calc.conductorFillStatus(raceway.fill40-1e-8,raceway),'green');
 assert.equal(calc.conductorFillStatus(raceway.fill40,raceway),'green');
 assert.equal(calc.conductorFillStatus(raceway.fill40+1e-8,raceway),'red');
 fillBoundaryChecks+=3;
}
for(const unsupported of [undefined,null])assert.equal(calc.conductorFillStatus(.001,unsupported),'red');
const imcInput={ocpd:80,material:'aluminum',terminal:75,ambient:30,parallelSets:1,configuration:'three-phase-3-wire',racewayType:'imc'};
const imc=valid(calc.conductor(imcInput));
assert.deepEqual(imc.results.map(r=>[r.label,r.value]),[
 ['Aluminum conductor per set','2 AWG'],['Minimum raceway per set','1 in.'],['Raceway type','IMC'],['Separate raceways',1],
 ['Actual fill per raceway',40.042],['Total OCPD',80],['Combined usable ampacity',90],['Usable ampacity per set',90],
 ['Base-minimum Cu EGC per raceway','8 AWG'],['Physical conductors per raceway incl. EGC',4],['CCC per raceway',3],
 ['Permitted fill per raceway',40],['Conductor area per raceway incl. EGC',.384]
],'Presentation metadata must preserve all numerical and conductor result rows');
assert.equal(row(imc,'Actual fill per raceway').status,'green');
assert.equal(row(imc,'Actual fill per raceway').statusText,'Within published fill allowance');
assert.equal(row(imc,'Minimum raceway per set').status,'green','A supported minimum explicitly meets the fill allowance');
const imcRaceway=calc.conductorRaceways.imc.sizes.find(r=>r.size==='1');
const imcArea=(3*Math.round(wire('2 AWG').area*10000)+Math.round(wire('8 AWG').area*10000))/10000;
assert.ok(imcArea<=imcRaceway.fill40);
assert.ok(imcArea/imcRaceway.area*100>40,'This valid published-cell case must retain its above-40% display');

const oversizedInput={ocpd:100,material:'copper',terminal:75,ambient:30,parallelSets:2,configuration:'three-phase-4-wire',racewayType:'pvc80',voltageDropEnabled:true,length:5000,current:80,target:3,phase:3,voltage:208};
const oversized=valid(calc.conductor(oversizedInput));
assert.equal(oversized.conservativeGrounding,true);
assert.equal(oversized.results[0].value,'750 kcmil');
assert.equal(row(oversized,'Conservative Cu EGC per raceway').value,'750 kcmil');
assert.equal(oversized.groundingReviewRequired,false);
assert.deepEqual(row(oversized,'Minimum raceway per set'),{label:'Minimum raceway per set',value:'Over supported 4 in. range',status:'red',statusText:'Exceeds supported fill range'});
assert.equal(row(oversized,'Actual fill per raceway').value,'No supported raceway');
assert.equal(row(oversized,'Actual fill per raceway').status,'red');
assert.equal(row(oversized,'Actual fill per raceway').statusText,'Exceeds supported fill range');
assert.ok(oversized.warnings.some(w=>/fill|raceway|conduit/i.test(w)));
for(const result of [imc,oversized]){
 for(const label of ['Minimum raceway per set','Actual fill per raceway'])assert.notEqual(row(result,label).status,'orange');
}

// Form order, explicit EMT basis, concise mode text, and adjacent optional help.
const h=harness(),module=h.ui.modules.find(m=>m.id==='conductor'),serviceModule=h.ui.modules.find(m=>m.id==='service');
const racewayField=module.fields.find(f=>f.key==='racewayType');
assert.equal(module.fields.at(-1).key,'racewayType');
assert.ok(module.fields.findIndex(f=>f.key==='racewayType')>module.fields.findIndex(f=>f.key==='target'));
assert.equal(racewayField.label,'Raceway type');
assert.equal(h.ui.defaults(module).racewayType,'emt');
assert.deepEqual(Array.from(module.fields.find(f=>f.key==='voltageDropEnabled').options,option=>Array.from(option)),[[false,'Ampacity only'],[true,'Ampacity and voltage drop']]);
assert.equal(serviceModule.fields.find(f=>f.key==='voltageDropEnabled').options[1][1],'Size for ampacity and voltage drop');
assert.match(h.ui.fieldHTML(racewayField,h.ui.states.conductor),/<small id="hint-racewayType">Optional: leave EMT selected/);
assert.doesNotMatch(h.ui.guidanceHTML(module,h.ui.states.conductor),/hint-racewayType/);
h.ui.calculator('conductor');
assert.equal(h.ui.states.conductor.racewayType,'emt');
assert.match(h.nodes['#main'].innerHTML,/<option value="emt" selected>EMT<\/option>/);
assert.doesNotMatch(h.nodes['#main'].innerHTML,/name="current"/);
h.change('voltageDropEnabled',true);
assert.ok(h.nodes['#main'].innerHTML.indexOf('name="racewayType"')>h.nodes['#main'].innerHTML.indexOf('name="target"'));
assert.match(h.nodes['#results'].innerHTML,/role="alert"/);
h.change('current',20,'INPUT');
assert.match(h.nodes['#results'].innerHTML,/result-hero/);

// Status rendering is universal by default, restricted to semantic colors, and escaped.
const samples=['green','orange','red'].map(status=>({label:status,value:3,status,statusText:`<${status}>`}));
for(const flag of [false]){
 const html=flag===undefined?h.ui.metricHTML(samples):h.ui.metricHTML(samples,flag);
 assert.doesNotMatch(html,/metric-(?:green|orange|red|status)/);
}
const colored=h.ui.metricHTML(samples,true);
for(const status of ['green','orange','red']){
 assert.match(colored,new RegExp(`class="metric metric-${status}"`));
 assert.ok(colored.includes(`&lt;${status}&gt;`));
}
assert.doesNotMatch(h.ui.metricHTML([{label:'Unknown',value:1,status:'blue'}],true),/metric-blue/);

// Reuse the established semantic palette in both themes with AA result-text contrast.
const css=fs.readFileSync(new URL('./dist/styles.css',import.meta.url),'utf8');
const palettes=[css.match(/:root \{([^}]+)\}/)[1],css.match(/:root\[data-theme="dark"\] \{([^}]+)\}/)[1]].map(block=>Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[\da-f]{6})/gi)].map(m=>[m[1],m[2]])));
const luminance=hex=>hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((total,v,i)=>total+v*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
for(const [status,light,dark] of [['green','#166534','#86efac'],['orange','#9a3412','#fdba74'],['red','#b91c1c','#fca5a5']]){
 for(const [theme,color] of [[0,light],[1,dark]]){
  const prefix=theme?'[data-theme="dark"] ':'';
  assert.ok(css.includes(`${prefix}.metric-${status} .metric-value,${prefix}.metric-${status} .metric-status{color:${color}}`));
  assert.ok(css.includes(`${prefix}.result-hero.drop-${status} .result-value,${prefix}.result-hero.drop-${status} .result-caption{color:${color}}`),'Conductor colors match the established voltage-drop palette');
  assert.ok(contrast(color,palettes[theme].surface)>=4.5,`${status} metric text needs AA contrast in theme ${theme}`);
 }
 assert.ok(css.includes(`[data-theme] .metric-${status} .metric-value,[data-theme] .metric-${status} .metric-status{color:${light}}`),'Print restores the light semantic palette even from dark mode');
 assert.ok(css.includes(`.metric-${status} .metric-unit`),'Metric units inherit the semantic color');
}

// Result panels are separate, closed native disclosures with independently owned content.
let resultHTML=h.nodes['#results'].innerHTML;
const panels=[...resultHTML.matchAll(/<details\b([^>]*)><summary>([^<]+)<\/summary>([\s\S]*?)<\/details>/g)];
assert.equal(panels.length,2);
assert.equal(panels[0][2],'Additional results');
assert.equal(panels[1][2],'Calculation details');
assert.match(panels[0][1],/class="panel additional-results"/);
assert.match(panels[1][1],/class="panel calculation-details"/);
for(const panel of panels){
 assert.match(panel[1],/data-print-details/);
 assert.doesNotMatch(panel[1],/\sopen(?:\s|$)|\sname=/,'Disclosures begin closed and are not an exclusive accordion');
}
assert.match(panels[0][3],/Actual fill per raceway/);
assert.doesNotMatch(panels[0][3],/class="breakdown"|Assumptions & checks/);
assert.match(panels[1][3],/class="breakdown"/);
assert.doesNotMatch(panels[1][3],/class="metric-grid"/);
const details=h.syncDetails(),additional=details.find(d=>d.summary==='Additional results'),calculation=details.find(d=>d.summary==='Calculation details');
assert.equal(additional.open,false);assert.equal(calculation.open,false);
additional.open=true;assert.equal(calculation.open,false);
calculation.open=true;additional.open=false;assert.equal(calculation.open,true);
h.nodes['#print'].onclick();assert.equal(h.prints,1);
for(const [additionalOpen,calculationOpen] of [[false,false],[false,true],[true,false],[true,true]]){
 details.forEach((detail,index)=>{detail.open=Boolean(index%2);});
 additional.open=additionalOpen;calculation.open=calculationOpen;
 const prior=details.map(d=>d.open);
 h.windowHandlers.beforeprint();assert.ok(details.every(d=>d.open));
 h.windowHandlers.beforeprint();h.windowHandlers.afterprint();
 assert.deepEqual(details.map(d=>d.open),prior,`Print restores independent ${additionalOpen}/${calculationOpen} disclosure states and the other panels`);
 h.windowHandlers.afterprint();assert.deepEqual(details.map(d=>d.open),prior);
}

// Render both voltage-drop metrics with raw guidance, preserving a separate green target.
for(const [percent,,status,statusText] of edgeCases){
 Object.assign(h.ui.states.conductor,base,{length:percent*base.voltage*10380/(100*2*12.9*base.current)});
 h.ui.calculator('conductor');
 for(const label of ['Estimated voltage drop','Estimated drop'])assert.match(h.nodes['#results'].innerHTML,new RegExp(`class="metric metric-${status}"><div class="metric-label">${label}<`));
 assert.ok(h.nodes['#results'].innerHTML.includes(statusText.replaceAll('>','&gt;')));
 assert.match(h.nodes['#results'].innerHTML,/class="metric metric-green"><div class="metric-label">Target check<\/div><div class="metric-value">Within target/);
}
Object.assign(h.ui.states.conductor,imcInput,{voltageDropEnabled:false});h.ui.calculator('conductor');
assert.match(h.nodes['#results'].innerHTML,/class="metric metric-green"><div class="metric-label">Actual fill per raceway<\/div><div class="metric-value">40\.042/);
Object.assign(h.ui.states.conductor,oversizedInput);h.ui.calculator('conductor');
const visible=h.nodes['#results'].innerHTML.split('<details')[0];
assert.match(visible,/Conservative Cu EGC per raceway/);
assert.match(visible,/750 kcmil/);
assert.match(visible,/class="metric metric-red"><div class="metric-label">Minimum raceway per set/);
assert.match(h.nodes['#results'].innerHTML,/class="metric metric-red"><div class="metric-label">Actual fill per raceway/);

// Every other calculator retains its combined disclosure and renders semantic check metadata.
for(const other of h.ui.modules.filter(m=>m.id!=='conductor')){
 h.ui.calculator(other.id);
 assert.doesNotMatch(h.nodes['#results'].innerHTML,/class="panel additional-results"/,`${other.id} retains its combined disclosure`);
 const synthetic=h.ui.resultDetailsHTML(other,[{label:'Other result',value:2,status:'red'}],{steps:['Example method']},[]);
 assert.match(synthetic,/<summary>Calculation details & additional results<\/summary>/);
 assert.equal((synthetic.match(/<details\b/g)||[]).length,1);
 if(other.id==='drop')assert.doesNotMatch(synthetic,/metric-red/);else assert.match(synthetic,/metric-red/);
}
h.ui.calculator('service');h.change('voltageDropEnabled',true);h.change('current',100,'INPUT');
assert.match(h.nodes['#results'].innerHTML,/<summary>Calculation details & additional results<\/summary>/);
assert.match(h.nodes['#results'].innerHTML,/metric-green/);
for(const [length,status] of [[50,'green'],[100,'orange'],[150,'red']]){
 const inputs={size:'10',material:'copper',length,current:20,phase:1,voltage:120,pf:1,raceway:'steel',parallelSets:1};
 const standalone=valid(calc.drop(inputs));
 assert.equal(row(standalone,'Percentage voltage drop').status,status);
 assert.equal(Object.hasOwn(row(standalone,'Estimated voltage drop'),'status'),false);
 Object.assign(h.ui.states.drop,inputs);h.ui.calculator('drop');
 assert.match(h.nodes['#results'].innerHTML,new RegExp(`class="result-hero drop-${status}"`));
 assert.doesNotMatch(h.nodes['#results'].innerHTML,/metric-(?:green|orange|red|status)/);
}

// Copy stays inputs/outputs-only; save/load/reset and exports preserve independent snapshots.
Object.assign(h.ui.states.conductor,imcInput,{voltageDropEnabled:false});h.ui.calculator('conductor');
await h.nodes['#copy-summary'].onclick();
const copied=h.copied.at(-1);
assert.match(copied,/INPUTS/);assert.match(copied,/OUTPUTS/);assert.match(copied,/Raceway type: IMC/);assert.match(copied,/Actual fill per raceway: 40\.042 %/);
assert.doesNotMatch(copied,/METHOD|ASSUMPTIONS|SOURCES|Design aid|Optional:|Within published fill allowance/);
h.nodes['#export-pdf'].onclick();
const snapshot=h.pdfs.at(-1),frozen=JSON.stringify(snapshot),pdfBefore=createPDF(snapshot);
assert.equal(snapshot.appVersion,'2.14.0');
assert.equal(snapshot.inputs.racewayType,'imc');
assert.equal(snapshot.inputRows.at(-1).label,'Raceway type');
assert.equal(row(snapshot.result,'Actual fill per raceway').status,'green');
assert.match(summaryFromSnapshot(snapshot),/METHOD/);
h.nodes['#save-calculation'].onclick();
h.dialogs.at(-1).onSave({projectName:'Conductor presentation',calculationName:'IMC 40.042 percent'});
const record=h.store.list()[0],saved=JSON.stringify(record.snapshot),savedPDF=createPDF(record.snapshot);
h.change('racewayType','pvc80');h.ui.calculator('box');h.ui.calculator('conductor');assert.equal(h.ui.states.conductor.racewayType,'pvc80');
assert.equal(JSON.stringify(snapshot),frozen);assert.deepEqual(createPDF(snapshot),pdfBefore);
h.ui.savedLibrary();h.buttons.find(b=>b.dataset.recordAction==='pdf').onclick();
assert.equal(JSON.stringify(h.pdfs.at(-1)),saved);
h.buttons.find(b=>b.dataset.recordAction==='load').onclick();
assert.equal(h.ui.states.conductor.racewayType,'imc');assert.match(h.nodes['#results'].innerHTML,/40\.042/);
h.nodes['#reset'].onclick();
assert.equal(h.ui.states.conductor.racewayType,'emt');assert.equal(h.ui.states.conductor.voltageDropEnabled,false);assert.equal(h.ui.states.conductor.current,'');
assert.equal(JSON.stringify(h.store.load(record.id).snapshot),saved);assert.deepEqual(createPDF(h.store.load(record.id).snapshot),savedPDF);
assert.equal(JSON.stringify(snapshot),frozen);

// Impossible targets remain visible errors; stale successful reports cannot be exported.
Object.assign(h.ui.states.conductor,base);h.ui.calculator('conductor');
assert.equal(h.nodes['#export-pdf'].disabled,false);
h.change('length',1e8,'INPUT');
assert.match(h.nodes['#results'].innerHTML,/<div class="warning error" role="alert">/);
assert.match(h.nodes['#results'].innerHTML,/No supported conductor through 750 kcmil/);
assert.doesNotMatch(h.nodes['#results'].innerHTML,/result-hero|Within target|additional-results/);
for(const id of ['copy-summary','export-pdf','save-calculation'])assert.equal(h.nodes['#'+id].disabled,true);
const counts=[h.copied.length,h.pdfs.length,h.dialogs.length];
await h.nodes['#copy-summary'].onclick();h.nodes['#export-pdf'].onclick();h.nodes['#save-calculation'].onclick();
assert.deepEqual([h.copied.length,h.pdfs.length,h.dialogs.length],counts);
h.nodes['#reset'].onclick();for(const id of ['copy-summary','export-pdf','save-calculation'])assert.equal(h.nodes['#'+id].disabled,false);

console.log(`Conductor presentation: four raw voltage-drop edges, ${fillBoundaryChecks} published fill-boundary checks, 40.042% IMC, unsupported fill, preserved numerical/EGC rows, final optional raceway, scoped AA colors, separate disclosures/four print states, other-module isolation, copy/save/load/reset, immutable PDF snapshots and impossible-target action guards passed.`);
// Universal fill/ampacity status renderer: real module results, never label heuristics.
const renderCheck=(id,input={})=>{const module=h.ui.modules.find(m=>m.id===id);h.ui.states[id]={...h.ui.defaults(module),...input};h.ui.calculator(id);return h.nodes['#results'].innerHTML};
const hasMetric=(html,label,status)=>assert.ok(html.includes(`class="metric metric-${status}"><div class="metric-label">${label}</div>`),`${label} renders ${status}`);
for(const [count,status] of [[9,'green'],[10,'red']]){
 const html=renderCheck('conduit',{trade:'1/2',rows:[{size:'12',count}]});
 hasMetric(html,'Actual fill',status);hasMetric(html,'Fill check',status);assert.match(html,new RegExp(`result-hero check-${status}`));
 assert.doesNotMatch(html,/metric-(green|red)"><div class="metric-label">Permitted fill/);
}
for(const [volume,status] of [[22.5+1e-9,'green'],[22.5,'green'],[22.5-1e-9,'red']]){
 const html=renderCheck('box',{size:'12',conductors:6,grounds:3,clamps:true,yokes:1,studs:0,terminalBlocks:0,volume});
 hasMetric(html,'Volume check',status);assert.match(html,new RegExp(`result-hero check-${status}`));
}
const serviceHTML=renderCheck('service');hasMetric(serviceHTML,'Combined phase ampacity','green');hasMetric(serviceHTML,'Usable phase ampacity per set','green');
const protectionHTML=renderCheck('protection',{kva:30,phase:1,primary:480,secondary:240,protection:'dual',primaryOcpd:125,secondaryOcpd:15,ocpdCheckEnabled:true,conductorCheckEnabled:true,configuration:'single-phase-2-wire',secondaryRule:'10ft',lengthFt:10,installationConfirmed:true,designLoad:10,material:'copper',terminal:75,ambient:30,parallelSets:1});
hasMetric(protectionHTML,'Combined usable phase ampacity','green');hasMetric(protectionHTML,'Usable phase ampacity per set','green');
assert.doesNotMatch(protectionHTML,/metric-(green|red)"><div class="metric-label">(?:Primary|Secondary) full-load current/);
for(const id of ['amps','power','transformer'])assert.doesNotMatch(renderCheck(id),/metric-(green|red)|result-hero check-(green|red)/,`${id} does not invent an ampacity check`);
const unknownProtection=renderCheck('protection',{ocpdCheckEnabled:false,conductorCheckEnabled:false});
assert.doesNotMatch(unknownProtection,/metric-green|check-green/,'Unperformed checks remain neutral');
console.log('Universal status UI: raw box edges, passing/failing conduit, service/protection ampacity, neutral nameplate currents and unknown checks passed.');
