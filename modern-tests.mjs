import { createSnapshot, buildSummary, summaryFromSnapshot, copySummaryFromSnapshot, createRecordStore } from './dist/calculation-records.js';
import { transformerProtection, evaluateTransformerProtection, migrateProtectionState,transformerBreakerOptions, transformerOcpdRatings, secondaryRuleConditions } from './dist/transformer-protection.js';
// Static presentation, contrast and modeled routing checks; not real-browser visual QA.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as calc from './dist/calc.js';
import {systemOptions,voltageOptions} from './dist/voltage.js';
const read=name=>fs.readFileSync(new URL(name,import.meta.url),'utf8');
const css=read('./dist/styles.css'),html=read('./dist/index.html');
const source=read('./dist/app.js').replace(/^import[^\n]+\n/gm,'').replace(/route\(\);\s*$/,'');
const palettes=[css.match(/:root \{([^}]+)\}/)[1],css.match(/:root\[data-theme="dark"\] \{([^}]+)\}/)[1]].map(block=>Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[\da-f]{6})/gi)].map(m=>[m[1],m[2]])));
const luminance=hex=>hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
const ratio=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
for(const [i,p] of palettes.entries()){
 for(const background of ['canvas','surface','subtle'])for(const foreground of ['ink','muted','accent'])assert.ok(ratio(p[foreground],p[background])>=4.5,`${i} ${foreground}/${background}: ${ratio(p[foreground],p[background])}`);
 for(const kind of ['warning','error'])assert.ok(ratio(p[`${kind}-ink`],p[`${kind}-bg`])>=4.5);
 assert.ok(ratio(p.accent,p.selected)>=4.5);
 assert.ok(ratio(p.control,p.surface)>=3);
}
assert.doesNotMatch(css,/gradient|--teal|--navy|--mint|--orange|box-shadow/);
assert.doesNotMatch(html,/breadcrumb|brand-symbol|unit-badge|system-status|sidebar-bottom|<footer/);
assert.ok(css.includes('height:44px;min-width:0;font-size:16px'));
assert.ok(css.includes('@media print'));
const nodes=Object.fromEntries(['#copy-summary','#export-pdf','#save-calculation','#action-status','#storage-status','#main','#navigation','#calculator-form','#results','#sources','#reset','#print','#add-row'].map(key=>[key,{innerHTML:'',addEventListener(){},querySelector(){return null}}]));
const handlers={},location={hash:''};let scrolls=0;
const context=vm.createContext({closeRecordDialog(){},createSnapshot, buildSummary, summaryFromSnapshot, copySummaryFromSnapshot, createRecordStore, transformerProtection, evaluateTransformerProtection, migrateProtectionState,transformerBreakerOptions, transformerOcpdRatings, secondaryRuleConditions, calc,systemOptions,voltageOptions,structuredClone,console,location,attachAmbientHelper(){},localStorage:{getItem:()=>null,setItem(){}},window:{addEventListener:(key,fn)=>handlers[key]=fn,scrollTo(){scrolls++}},document:{querySelector:key=>nodes[key],querySelectorAll:()=>[]}});
vm.runInContext(source+'\nglobalThis.ui={overview,calculator,modules,states,fieldHTML,guidanceHTML,inlineHint,route};',context);
const {ui}=context;
ui.overview();
assert.equal((nodes['#main'].innerHTML.match(/class="tool-link"/g)||[]).length,10);
assert.doesNotMatch(nodes['#main'].innerHTML,/class="intro"|tool-count|<h2>[^<]+<\/h2><p>/);
assert.doesNotMatch(nodes['#main'].innerHTML,/<svg(?! class="favorite-icon")|module-icon/);
assert.doesNotMatch(nodes['#navigation'].innerHTML,/<svg(?! class="favorite-icon")/);
for(const m of ui.modules){
 location.hash=`#${m.id}`;handlers.hashchange();
 assert.match(nodes['#navigation'].innerHTML,new RegExp(`href="#${m.id}" aria-current="page"`));
 assert.doesNotMatch(nodes['#main'].innerHTML,/AUTO-CALCULATES|form-bottom|class="intro"|panel-head|<h2>Inputs<\/h2>|<svg(?! class="favorite-icon")/);
 for(const f of m.fields.filter(f=>f.hint&&(!f.when||f.when(ui.states[m.id])))){
  const field=ui.fieldHTML(f,ui.states[m.id]);
  assert.ok(field.includes(`aria-describedby="hint-${f.key}"`));
  assert.equal(field.includes(`<small id="hint-${f.key}">`),ui.inlineHint(f));
  if(!ui.inlineHint(f))assert.ok(ui.guidanceHTML(m,ui.states[m.id]).includes(`id="hint-${f.key}"`));
 }
}
// Back/forward uses the same hashchange route; repeat earlier modules and overview.
for(const hash of ['#conductor','#service','#conductor','#overview','#amps','#overview']){location.hash=hash;handlers.hashchange()}
assert.equal(scrolls,ui.modules.length+6);
assert.ok(nodes['#navigation'].innerHTML.includes('href="#overview" aria-current="page"'));
ui.calculator('service');
assert.ok(nodes['#results'].innerHTML.includes('Neutral, grounding, bonding and conduit are not sized'));
ui.states.conductor.terminal=90;ui.calculator('conductor');
assert.match(nodes['#main'].innerHTML,/<small id="hint-terminal">/);
assert.doesNotMatch(nodes['#results'].innerHTML,/role="alert"/);
ui.states.amps.voltageMode='custom';ui.calculator('amps');
assert.match(nodes['#main'].innerHTML,/<small id="hint-voltage">/);
assert.doesNotMatch(nodes['#results'].innerHTML,/role="alert"/);
console.log('Modern presentation, AA text/control contrast, guidance accessibility and modeled history checks passed.');
