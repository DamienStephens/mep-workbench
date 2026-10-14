// Pure calculation contracts; no real-browser or engineering certification claim.
import assert from 'node:assert/strict';
import {tray,migrateCableTrayState,setTrayArrangement,trayPhysicalCount,cableTrayDiameterReferences,cableTrayNECAreas} from './dist/cable-tray.js';
const base={cableKind:'single',trayType:'ladder',service:'power',width:'auto',depth:4,voltage:600,industrialQualified:true,cableListed:true,boundGroupsConfirmed:true,rungSpacing:9,rungSpacingConfirmed:true};
const row=(arrangement='flat',count=12,od=.5,size='1/0')=>({name:'Feeder',arrangement,count,od,size,diameterSource:'manual'});
const run=(state)=>{const r=tray({...base,...state});assert.equal(r.error,undefined,r.error);return r};
const metric=(r,label)=>r.results.find(x=>x.label===label);
let checks=0;
for(const arrangement of ['flat','triangle','square','unspecified']){
 const size=arrangement==='triangle'?3:arrangement==='square'?4:1;
 const legacy={...base,rows:[row(arrangement)]},copy=structuredClone(legacy),next=migrateCableTrayState(legacy);
 assert.deepEqual(legacy,copy);assert.equal(next.quantityVersion,2);assert.equal(next.rows[0].count,12/size);
 assert.equal(run(next).totalCount,12);assert.equal(run(next).diameterSum,run(legacy).diameterSum);
 assert.deepEqual(migrateCableTrayState(next),next);
 let current=next.rows[0];
 for(let i=0;i<8;i++)for(const mode of ['triangle','square','flat','unspecified']){
  current=setTrayArrangement(current,mode);assert.equal(trayPhysicalCount(current),12);assert.equal(run({...next,rows:[current]}).totalCount,12);checks++;
 }
}
for(const n of [1,2,5,7,10,13]){
 const old={...base,rows:[row('triangle',n)]},next=migrateCableTrayState(old);
 assert.equal(trayPhysicalCount(next.rows[0]),n);assert.match(tray(next).error,/complete groups/);
 let current=next.rows[0];
 for(let i=0;i<6;i++)for(const mode of ['square','triangle','flat']){
  current=setTrayArrangement(JSON.parse(JSON.stringify(current)),mode);
  assert.equal(trayPhysicalCount(current),n);
  if(mode==='flat')assert.equal(run({...next,rows:[current]}).totalCount,n);
  else assert.match(tray({...next,rows:[current]}).error,/complete groups/);
  checks++;
 }
}
for(const [arrangement,count,total] of [['triangle',10,30],['square',10,40],['flat',10,10]]){
 const r=run({quantityVersion:2,rows:[row(arrangement,count)]});assert.equal(r.totalCount,total);assert.equal(r.diameterSum,total*.5);checks++;
}
assert.ok(tray({...base,quantityVersion:3,rows:[row()]}).error);
assert.ok(tray({...base,quantityVersion:2,rows:[row('triangle',Number.MAX_SAFE_INTEGER)]}).error);
for(const [size,area] of Object.entries(cableTrayNECAreas)){
 const ref=cableTrayDiameterReferences['nec-thhn-area'],od=ref.diameters[size];
 assert.equal(od,Math.sqrt(4*area/Math.PI));
 const r=run({quantityVersion:2,rows:[{...row('flat',1,od,size),diameterSource:'nec-thhn-area'}]});
 assert.equal(r.status,'conditional');assert.equal(metric(r,'Tray sizing check').status,undefined);
 assert.match(r.confirmationIssues.join(' '),/preliminary estimate/);assert.match(r.steps.join(' '),/area-derived/);
 assert.equal(r.rows[0].od,od);assert.ok(r.sources.some(s=>s.url===ref.url));
 assert.ok(tray({...base,rows:[{...row('flat',1,od+1e-8,size),diameterSource:'nec-thhn-area'}]}).error);
 checks++;
}
for(const cableKind of ['multiconductor','single']){
 const r=tray({...base,cableKind,voltage:cableKind==='single'?601:600,rows:[{...row('flat',1,cableTrayDiameterReferences['nec-thhn-area'].diameters['1/0']),diameterSource:'nec-thhn-area'}]});
 assert.match(r.error,/only to standard single conductors/);
}
const omitted=run({rungSpacing:undefined,rows:[row()]});assert.equal(omitted.effectiveRungSpacing,9);assert.equal(omitted.rungSpacingAssumed,true);assert.equal(omitted.status,'conditional');
const assumed=run({rungSpacingConfirmed:false,rows:[row()]});assert.equal(assumed.status,'conditional');assert.equal(metric(assumed,'Tray ampacity check').status,undefined);assert.ok(assumed.detailWarnings.some(w=>/Rung spacing/.test(w)));
for(const spacing of [1,8.999999999,9]){const r=run({rungSpacing:spacing,rows:[row()]});assert.equal(r.status,'conditional');assert.equal(r.numericalPass,true);}
for(const spacing of [0,-1,9.000000001,NaN,Infinity,true,'bad',[],[9],{}])assert.match(tray({...base,rungSpacing:spacing,rows:[row()]}).error,/rung spacing/);
const larger=run({rungSpacing:99,rungSpacingConfirmed:false,rows:[row('flat',3,.75,'250')]});assert.equal(larger.status,'conditional');assert.equal(larger.numericalPass,true);assert.equal(larger.effectiveRungSpacing,undefined);
for(const od of [.999999999,1,1.000000001]){
 const r=run({width:6,rows:[row('flat',6,od)]}),status=od<=1?'green':'red';
 assert.equal(metric(r,'Diameter-sum rule usage').status,status);
 assert.equal(metric(r,'Touching layout width').status,status);
 assert.equal(metric(r,'Tray sizing check').status,od<=1?undefined:'red');
 assert.equal(metric(r,'Tray ampacity check').status,undefined);checks++;
}
for(const od of [1.499999999,1.5,1.500000001]){
 const r=run({quantityVersion:2,depth:3,rows:[row('square',1,od,'250')]});
 assert.equal(metric(r,'Layout envelope height').status,od<=1.5?'green':'red');checks++;
}
const partial=run({rows:[row('unspecified',1)]});assert.equal(metric(partial,'Specified-row width only').status,undefined);assert.equal(metric(partial,'Layout envelope height').status,undefined);
const prohibited=tray({...base,cableKind:'multiconductor',quantityVersion:2,rows:[row('triangle',1,.5,'4/0')]});assert.equal(prohibited.status,'fail');assert.equal(metric(prohibited,'Tray sizing check').status,'red');assert.ok(prohibited.warnings.some(w=>!prohibited.detailWarnings.includes(w)&&/not a supported compliant arrangement/.test(w)));
const multi=tray({...base,cableKind:'multiconductor',rows:[{...row('flat',1,.5,'12')}]});assert.equal(multi.warnings.filter(w=>!multi.detailWarnings.includes(w)).length,0);
console.log(`Tray design assumptions: ${checks} repeated group/count and boundary checks, precise NEC-derived estimates, explicit rung assumptions, conditional provenance, hard failures and neutral uncalculated ampacity passed.`);
