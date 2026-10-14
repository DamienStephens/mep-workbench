// New calculations use explicit unverified design assumptions, not legacy attestations.
import assert from 'node:assert/strict';
import {transformerProtection, transformerProtectionLimits, evaluateTransformerProtection, secondaryRuleConditions} from './dist/transformer-protection.js';
import {calculateCableTray} from './dist/cable-tray.js';
import {evaluateAmbient} from './dist/ambient-helper.js';
import {createSnapshot, summaryFromSnapshot} from './dist/calculation-records.js';

const protection={kva:75,phase:3,primary:480,secondary:208,protection:'dual',primaryOcpd:100,secondaryOcpd:225,designLoad:200,configuration:'three-phase-4-wire',secondaryRule:'10ft',lengthFt:10,material:'copper',terminal:90,ambient:30,parallelSets:1,ocpdCheckEnabled:true,conductorCheckEnabled:true};
const valid=r=>{assert.equal(r.error,undefined,r.error);return r;};
const resultText=r=>[...r.steps,...r.warnings,...r.results.map(x=>String(x.value))].join('\n');
const assumed=valid(transformerProtection(protection));
assert.match(resultText(assumed),/installation is an unverified design assumption/);
assert.match(resultText(assumed),/90°C results assume/);
assert.doesNotMatch(resultText(assumed),/explicitly confirmed|confirmed by user|your explicit confirmation|I verified/);
for(const flag of [undefined,null,false,true,'true','false',1,{},[]]){
 assert.deepEqual(transformerProtection({...protection,installationConfirmed:flag,terminal90Confirmed:flag}),assumed);
 valid(evaluateTransformerProtection({...protection,installationConfirmed:flag,terminal90Confirmed:flag}));
}
for(const rule of ['10ft','25ft']){
 assert.match(secondaryRuleConditions[rule],/^Design assumes/);
 assert.match(secondaryRuleConditions[rule],/project-specific verification/);
 const lengthFt=rule==='10ft'?10:25;
 valid(transformerProtection({...protection,secondaryRule:rule,lengthFt}));
 assert.match(transformerProtection({...protection,secondaryRule:rule,lengthFt:lengthFt+1e-9}).error,/no more than/);
}
for(const change of [{terminal:91},{lengthFt:0},{ambient:81},{parallelSets:0},{designLoad:0},{primaryOcpd:250},{secondaryOcpd:15},{configuration:'split-phase-3-wire'}])assert.ok(transformerProtection({...protection,...change}).error);
assert.match(evaluateTransformerProtection({...protection,primaryOcpd:0}).error,/starting primary OCPD|explicit primary and secondary OCPD pair/);
for(const side of ['primary','secondary']){
 valid(transformerProtectionLimits({...protection,[side]:1000,[`${side}Mode`]:'custom',[`${side}Confirmed`]:true}));
 assert.match(transformerProtectionLimits({...protection,[side]:1000.000001,[`${side}Mode`]:'custom',[`${side}Confirmed`]:true}).error,/at or below 1000/);
}

const tray={quantityVersion:2,cableKind:'single',trayType:'ladder',service:'power',width:'auto',depth:4,voltage:600,rungSpacing:9,rows:[{name:'Feeder',size:'1/0',od:.5,count:2,arrangement:'triangle',diameterSource:'manual'}]};
const trayResult=valid(calculateCableTray(tray));
assert.equal(trayResult.status,'conditional');assert.equal(trayResult.numericalPass,true);assert.equal(trayResult.eligibilityConfirmed,false);assert.equal(trayResult.rungSpacingAssumed,true);
assert.ok(trayResult.candidates.some(c=>c.sizingPass));assert.ok(trayResult.candidates.every(c=>!c.pass));
assert.equal(trayResult.results.find(x=>x.label==='Diameter-sum rule usage').status,'green');
assert.equal(trayResult.results.find(x=>x.label==='Tray sizing check').status,undefined);
assert.match(resultText(trayResult),/Actual eligibility is unverified/);
assert.match(resultText(trayResult),/secured circuit group/);
assert.doesNotMatch(resultText(trayResult),/confirmed by user|I verified/);
for(const flag of [undefined,null,false,true,'true',1]){
 const input={...tray,industrialQualified:flag,cableListed:flag,boundGroupsConfirmed:flag,rungSpacingConfirmed:flag};
 assert.deepEqual(calculateCableTray(input),trayResult);
}
for(const spacing of [0,-1,9.000000001,Infinity,NaN,'bad',true,[],{}])assert.match(calculateCableTray({...tray,rungSpacing:spacing}).error,/rung spacing/);
valid(calculateCableTray({...tray,voltage:2000}));
assert.match(calculateCableTray({...tray,voltage:2000.000001}).error,/2,000/);
const tooWide=valid(calculateCableTray({...tray,width:6,rows:[{...tray.rows[0],count:10}]}));
assert.equal(tooWide.status,'fail');assert.equal(tooWide.numericalPass,false);
const stacked=valid(calculateCableTray({...tray,cableKind:'multiconductor',rows:[{...tray.rows[0],size:'4/0'}]}));
assert.equal(stacked.status,'fail');assert.equal(stacked.arrangementProhibited,true);assert.equal(stacked.minimumWidth,null);
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const frozen=freeze(structuredClone({...tray,industrialQualified:true,cableListed:true,boundGroupsConfirmed:true,rungSpacingConfirmed:true})),before=JSON.stringify(frozen);
calculateCableTray(frozen);assert.equal(JSON.stringify(frozen),before);

// Recalculation must not rewrite a historical result or its inputRows.
const historical=createSnapshot({id:'tray',title:'Cable tray',fields:[]},frozen,{results:[{label:'Historical rung basis',value:'9 in. confirmed by user'}],steps:['Historical installation basis'],warnings:[],sources:[]},{appVersion:'2.11.0',generatedAt:'2026-10-13T00:00:00Z'});
freeze(historical);const historicalJSON=JSON.stringify(historical),historicalSummary=summaryFromSnapshot(historical);
calculateCableTray(historical.inputs);
assert.equal(JSON.stringify(historical),historicalJSON);assert.equal(summaryFromSnapshot(historical),historicalSummary);assert.match(historicalSummary,/confirmed by user/);

for(const confirmed of [undefined,null,false,true,'true',1]){
 const r=evaluateAmbient({value:104,unit:'F',condition:'outdoor',confirmed});
 assert.equal(r.celsius,40);assert.match(r.note,/unverified assumption/);assert.doesNotMatch(r.note,/confirmed by user/);
}
assert.match(evaluateAmbient({value:40,condition:'rooftop'}).error,/Resolve/);
assert.equal(evaluateAmbient({value:40,condition:'rooftop',rooftop:'adder'}).celsius,73);
assert.equal(evaluateAmbient({value:73,condition:'rooftop',rooftop:'effective'}).celsius,73);
assert.match(evaluateAmbient({value:48,condition:'rooftop',rooftop:'adder'}).error,/Do not cap/);
for(const value of ['',NaN,Infinity,true])assert.ok(evaluateAmbient({value}).error);
console.log('Assumption engines: legacy flags ignored, explicit design basis, unchanged hard limits, numeric/eligibility separation, rooftop methods and historical immutability passed.');
