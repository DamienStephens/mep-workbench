import assert from 'node:assert/strict';
import {transformerBreakerOptions,evaluateTransformerProtection,transformerProtection,transformerProtectionLimits,migrateProtectionState,transformerOcpdRatings} from './dist/transformer-protection.js';

const base={kva:75,phase:3,primary:480,secondary:208,protection:'dual'};
const full={...base,primaryOcpd:100,secondaryOcpd:225,designLoad:200,configuration:'three-phase-4-wire',secondaryRule:'10ft',lengthFt:10,installationConfirmed:true,material:'copper',terminal:75,ambient:30,parallelSets:1};
const val=(r,label)=>r.results.find(x=>x.label===label)?.value;
const options=(delta={})=>transformerBreakerOptions({...base,...delta});
const table=(delta={})=>evaluateTransformerProtection({...base,ocpdCheckEnabled:true,...delta});
const good=r=>{assert.equal(r.error,undefined,r.error);return r;};
const bad=(delta,re)=>assert.match(table(delta).error,re);

// Primary-first and secondary-first expose the same mathematically independent
// ceiling candidates. Every option is a real modeled standard device.
const plain=options();
assert.equal(plain.breakerSide,'primary');
assert.equal(plain.primaryOptions.at(-1),225);
assert.equal(plain.secondaryOptions.at(-1),300);
assert.equal(plain.primaryOptions[0],15);
assert.equal(plain.secondaryOptions[0],15);
assert.equal(plain.primaryCurrent,75000/(Math.sqrt(3)*480));
assert.equal(plain.secondaryCurrent,75000/(Math.sqrt(3)*208));
assert.equal(plain.primaryLimit.multiplier,2.5);
assert.equal(plain.secondaryLimit.multiplier,1.25);
assert.deepEqual(plain.selected,{primary:0,secondary:0});
assert.equal(plain.complete,false);
for(const breakerSide of ['primary','secondary']){
 for(const primaryOcpd of plain.primaryOptions){
  for(const secondaryOcpd of plain.secondaryOptions){
   const p={breakerSide,primaryOcpd,secondaryOcpd};
   const choices=options(p),r=good(table(p));
   assert.equal(choices.selectionError,undefined);
   assert.equal(choices.complete,true);
   assert.deepEqual(choices.primaryOptions,plain.primaryOptions);
   assert.deepEqual(choices.secondaryOptions,plain.secondaryOptions);
   assert.equal(val(r,'Selected primary OCPD'),primaryOcpd);
   assert.equal(val(r,'Selected secondary OCPD'),secondaryOcpd);
   assert.match(val(r,'Breaker pair status'),/Within transformer-protection limits \(Table 450\.3\(B\) only\)/);
   assert.match(val(r,'Enabled checks'),/ceilings only/);
   assert.ok(!r.results.some(x=>/conductor per set|usable phase ampacity/.test(x.label)));
  }
 }
}

// No hidden automatic selection, load minimum or installation assumption in the
// table-only flow. Incomplete selection has a truthful pending result.
for(const breakerSide of ['primary','secondary']){
 const other=breakerSide==='primary'?'secondary':'primary';
 for(const blank of [undefined,null,'',' ',0,'0','0.0']){
  let r=good(table({breakerSide,primaryOcpd:blank,secondaryOcpd:blank}));
  assert.match(val(r,'Breaker pair status'),new RegExp(`Choose the starting ${breakerSide}`));
  assert.ok(!r.results.some(x=>x.label.startsWith('Selected ')));
  r=good(table({breakerSide,[`${breakerSide}Ocpd`]:100,[`${other}Ocpd`]:blank}));
  assert.equal(val(r,`Selected ${breakerSide} OCPD`),100);
  assert.match(val(r,'Breaker pair status'),new RegExp(`Acceptable ${other} partner range`));
  assert.equal(val(r,`Selected ${other} OCPD`),undefined);
  assert.doesNotMatch(val(r,'Breaker pair status'),/Within transformer-protection limits/);
 }
 bad({breakerSide,[`${other}Ocpd`]:100},new RegExp(`Choose the starting ${breakerSide}`));
}
for(const designLoad of [undefined,'',0,-10,Infinity,'nonsense',999999]){
 const r=good(table({primaryOcpd:15,secondaryOcpd:15,designLoad,installationConfirmed:false,terminal:90,lengthFt:999,parallelSets:0}));
 assert.match(val(r,'Capacity note'),/Partial-capacity/);
 assert.match(r.warnings.join(' '),/primary 15 A.*secondary 15 A/);
 assert.match(r.warnings.join(' '),/Actual usable load.*have not been verified/);
}
assert.deepEqual(options({primaryOcpd:15,secondaryOcpd:300}).partialCapacity,{primary:true,secondary:false});
assert.deepEqual(options({primaryOcpd:100,secondaryOcpd:15}).partialCapacity,{primary:false,secondary:true});
assert.deepEqual(options({primaryOcpd:100,secondaryOcpd:225}).partialCapacity,{primary:false,secondary:false});
assert.equal(val(good(table({primaryOcpd:100,secondaryOcpd:225})),'Capacity note'),undefined);
assert.match(plain.optionDetails.primary.find(x=>x.value===90).label,/below nameplate FLC/);
assert.equal(plain.optionDetails.primary.find(x=>x.value===100).partialCapacity,false);

// Candidate calculations retain arrays when a saved selection is invalid, so a
// UI can correct the pair instead of silently replacing the user's selection.
for(const invalid of [17,-1,5000,Infinity,NaN,'auto','15oops',true,false,[],{}]){
 const choices=options({primaryOcpd:invalid});
 assert.match(choices.selectionError,/standard primary OCPD/);
 assert.deepEqual(choices.primaryOptions,plain.primaryOptions);
 bad({primaryOcpd:invalid},/standard primary OCPD/);
 bad({primaryOcpd:100,secondaryOcpd:invalid},/standard secondary OCPD/);
}
bad({primaryOcpd:250},/primary 250 A.*250%/);
bad({primaryOcpd:100,secondaryOcpd:350},/secondary 350 A.*125%/);
bad({breakerSide:'secondary',primaryOcpd:250,secondaryOcpd:225},/primary 250 A.*250%/);
for(const breakerSide of ['both','',null,0])bad({breakerSide},/Choose Define primary OCPD or Define secondary OCPD/);
assert.equal(options({primaryOcpd:'100',secondaryOcpd:'225'}).complete,true);

// Primary-only has no secondary Table 450.3(B) ceiling. This does not grant
// conductor protection or endorse every offered secondary device for a load.
for(const breakerSide of ['primary','secondary']){
 const p={protection:'primary-only',breakerSide,primaryOcpd:15,secondaryOcpd:4000};
 const choices=options(p),r=good(table(p));
 assert.equal(choices.primaryOptions.at(-1),125);
 assert.deepEqual(choices.secondaryOptions,transformerOcpdRatings);
 assert.equal(choices.secondaryLimit,null);
 assert.ok(choices.optionDetails.secondary.every(o=>/no Table 450\.3\(B\) ceiling/.test(o.label)));
 assert.match(val(r,'Maximum modeled permitted secondary OCPD'),/No Table/);
 assert.match(r.warnings.join(' '),/does not mean that no secondary OCPD is needed/);
 bad({...p,primaryOcpd:150},/primary 150 A.*125%/);
}

// The <2 A and <9 A table thresholds are based on exact, unrounded nameplate
// current. Only a 125% cell permits the next modeled standard rating.
for(const [current,multiplier] of [[1.999,3],[2,1.67],[8.98,1.67],[9,1.25]]){
 const p={kva:current*.48,phase:1,primary:480,secondary:240,protection:'primary-only'};
 const choices=options(p);
 assert.equal(choices.primaryLimit.multiplier,multiplier,`primary current ${current}`);
 assert.equal(choices.primaryLimit.nextAllowed,multiplier===1.25);
 assert.equal(choices.primaryOptions.length,current===9?1:0);
}
for(const [current,multiplier,last] of [[1.999,1.67,undefined],[2,1.67,undefined],[8.98,1.67,undefined],[8.99,1.67,15],[9,1.25,15]]){
 const choices=options({kva:current*.24,phase:1,primary:120,secondary:240});
 assert.equal(choices.secondaryLimit.multiplier,multiplier);
 assert.equal(choices.secondaryLimit.nextAllowed,multiplier===1.25);
 assert.equal(choices.secondaryOptions.at(-1),last);
}
assert.equal(options({kva:9*.48,phase:1,primary:480,secondary:240}).primaryOptions.at(-1),20,'250% does not round 22.5 A up to 25 A');
assert.equal(options({kva:10*.48,phase:1,primary:480,secondary:240}).primaryOptions.at(-1),25,'exact standard hard ceiling is allowed');
for(const [current,last] of [[120,150],[120.000001,175]]){
 assert.equal(options({kva:current*.48,phase:1,primary:480,secondary:240,protection:'primary-only'}).primaryOptions.at(-1),last);
 assert.equal(options({kva:current*.24,phase:1,primary:480,secondary:240}).secondaryOptions.at(-1),last);
}
const equalFLC=options({kva:20*.48,phase:1,primary:480,secondary:240,primaryOcpd:20,secondaryOcpd:40});
assert.deepEqual(equalFLC.partialCapacity,{primary:false,secondary:false},'An exact FLC match is not below FLC');

// Table ceilings are not FLC minimums. A large transformer's modeled options
// remain available, with clear partial-capacity cautions and the 4000 A cap.
const huge=options({kva:10000});
assert.deepEqual(huge.primaryOptions,transformerOcpdRatings);
assert.deepEqual(huge.secondaryOptions,transformerOcpdRatings);
const hugeResult=good(table({kva:10000,primaryOcpd:4000,secondaryOcpd:4000}));
assert.equal(val(hugeResult,'Maximum modeled permitted primary OCPD'),4000);
assert.equal(val(hugeResult,'Maximum modeled permitted secondary OCPD'),4000);
assert.match(hugeResult.warnings.join(' '),/Partial-capacity/);
assert.deepEqual(options({kva:.1}).primaryOptions,[]);
assert.match(val(transformerProtectionLimits({...base,kva:.1}),'Maximum modeled permitted primary OCPD'),/Outside modeled device range/);

// Standard scope and voltage safeguards apply before any candidates are shown.
for(const delta of [{kva:''},{kva:0},{kva:-1},{kva:Infinity},{kva:1e308},{phase:2},{primary:0},{primary:1001},{secondary:1001},{primary:123},{scope:'autotransformer'},{protection:'unknown'}]){
 const r=options(delta);
 assert.ok(r.error,JSON.stringify(delta));
 assert.deepEqual(r.primaryOptions,[]);
 assert.deepEqual(r.secondaryOptions,[]);
}
assert.equal(options({primary:123,primaryMode:'custom'}).error,undefined);
assert.equal(options({primary:123,primaryMode:'custom',primaryConfirmed:true}).error,undefined);

// Optional checks off always ignore hidden selections, loads and direction.
const basic=evaluateTransformerProtection(base);
assert.deepEqual(evaluateTransformerProtection({...base,ocpdCheckEnabled:false,conductorCheckEnabled:false,breakerSide:'bad',primaryOcpd:250,secondaryOcpd:17,designLoad:'',lengthFt:999,installationConfirmed:false}),basic);

// Full installation/conductor evaluation still enforces bounded primary FLC,
// load and all existing installation guards; its direct API still supports auto.
const enabled={...full,ocpdCheckEnabled:true,conductorCheckEnabled:true};
assert.deepEqual(good(evaluateTransformerProtection(enabled)).results.slice(0,-2),good(transformerProtection(full)).results);
assert.deepEqual(good(evaluateTransformerProtection({...enabled,breakerSide:'secondary'})).results.slice(0,-2),good(transformerProtection(full)).results);
for(const delta of [{primaryOcpd:0},{secondaryOcpd:0},{primaryOcpd:''},{secondaryOcpd:undefined}])assert.ok(evaluateTransformerProtection({...enabled,...delta}).error,'Full checks require both explicit selections');
for(const delta of [{primaryOcpd:80},{secondaryOcpd:175},{designLoad:''},{designLoad:0},{lengthFt:11},{ambient:81},{parallelSets:0},{configuration:'single-phase-2-wire'},{secondaryRule:'unsupported'},{secondaryRule:'25ft',lengthFt:26}])assert.ok(evaluateTransformerProtection({...enabled,...delta}).error,JSON.stringify(delta));
for(const delta of [{installationConfirmed:false},{terminal:90}]){const r=good(evaluateTransformerProtection({...enabled,...delta}));assert.match(r.warnings.join(' '),/unverified design assumption/);assert.doesNotMatch(r.steps.join(' '),/explicitly confirmed/);}
assert.match(evaluateTransformerProtection({...enabled,primaryOcpd:80}).error,/below.*nameplate/);
assert.match(evaluateTransformerProtection({...enabled,secondaryOcpd:175}).error,/below.*design load/);
const auto=good(transformerProtection({...full,primaryOcpd:0,secondaryOcpd:0}));
assert.equal(val(auto,'Selected primary OCPD'),100);
assert.equal(val(auto,'Selected secondary OCPD'),200);

// State migration is immutable. Only legacy full calculations recover prior
// automatic choices; table-only and already-current states keep blank choices.
const legacy={...full,primaryOcpd:0,secondaryOcpd:0},before=structuredClone(legacy);
const migrated=migrateProtectionState(legacy);
assert.deepEqual(legacy,before);
assert.equal(migrated.breakerSide,'primary');
assert.equal(migrated.primaryOcpd,100);
assert.equal(migrated.secondaryOcpd,200);
assert.equal(migrated.conductorCheckEnabled,true);
assert.match(migrated.migrationNotice,/automatic breaker selections restored as explicit values/);
assert.deepEqual(good(evaluateTransformerProtection(migrated)).results.slice(0,-2),auto.results);
const disabled=migrateProtectionState(legacy,{preserveFull:false});
assert.equal(disabled.primaryOcpd,0);
assert.equal(disabled.secondaryOcpd,0);
assert.equal(disabled.conductorCheckEnabled,false);
assert.equal(migrateProtectionState({...legacy,ocpdCheckEnabled:true,conductorCheckEnabled:false}).primaryOcpd,0);
assert.equal(migrateProtectionState({...legacy,breakerSide:'primary',conductorCheckEnabled:true}).primaryOcpd,0);
assert.deepEqual(migrateProtectionState(migrated),migrated,'Migration is idempotent');
const frozen=Object.freeze({...base,primaryOcpd:80,secondaryOcpd:175,ocpdCheckEnabled:true});
assert.doesNotThrow(()=>transformerBreakerOptions(frozen));
assert.doesNotThrow(()=>evaluateTransformerProtection(frozen));
console.log('Bidirectional breaker pairs: 798 table-only pairs, explicit selection, partial capacity, table thresholds, independent primary-only limits, full-check guards and immutable legacy migration passed.');

for(const breakerSide of ['primary','secondary']){
 const other=breakerSide==='primary'?'secondary':'primary';
 const r=good(table({breakerSide,[`${breakerSide}Ocpd`]:100}));
 assert.match(val(r,`Acceptable ${other} partner OCPD range`),breakerSide==='primary'?/15–300 A/:/15–225 A/);
 assert.match(val(r,`Acceptable ${other} standard OCPD choices`),/15 A, 20 A/);
 assert.match(r.steps.join(' '),/Ratings below nameplate full-load current may limit usable capacity/);
 assert.match(val(r,'Defined OCPD side'),new RegExp(`Define ${breakerSide} OCPD`));
}
const noCeilingRange=good(table({protection:'primary-only',primaryOcpd:100}));
assert.match(val(noCeilingRange,'Breaker pair status'),/no Table 450.3\(B\) secondary ceiling \(4000 A is only the model limit\)/);
assert.match(val(noCeilingRange,'Acceptable secondary partner OCPD range'),/15–4000 A/);
assert.match(val(noCeilingRange,'Acceptable secondary partner OCPD range'),/no Table 450.3\(B\) secondary ceiling; 4000 A is only the model limit/);
