import { necReference } from './code-references.js?v=2.14.0';
import {formatCurrent, currentResult} from './current-display.js?v=2.14.0';
import { conductors, circuitConfigurations, allowanceCheckStatus } from './calc.js?v=2.14.0';
import { checkVoltageInput, voltageSources } from './voltage.js?v=2.14.0';
// Bounded NEC 2023-baseline design aid, not installation approval.
export const transformerOcpdRatings = [15,20,25,30,35,40,45,50,60,70,80,90,100,110,125,150,175,200,225,250,300,350,400,450,500,600,700,800,1000,1200,1600,2000,2500,3000,4000];
export const secondaryRuleConditions = {
 '10ft':'Design assumes a secondary run of 10 ft or less, enclosed in a continuous raceway from the transformer to a single terminating breaker or set of fuses; the conductors do not extend beyond the equipment they supply, and terminate in equipment containing that OCPD. All applicable NEC 240.21(C)(2) installation conditions require project-specific verification.',
 '25ft':'Design assumes a secondary run of 25 ft or less, protected from physical damage by an approved raceway or other approved means, terminating in a single breaker or set of fuses limiting the load to conductor ampacity. All applicable NEC 240.21(C)(6) installation conditions require project-specific verification.'
};
export const transformerProtectionSources = [
 necReference('Table 450.3(B) and note 1: modeled transformer winding protection; grouped OCPD/thermal exceptions not modeled', 'transformer', true),
 necReference('240.21(C)(2)/(6): modeled 10-ft and 25-ft secondary conductor rules and ratio floors', 'ocpd', true),
 necReference('Table 310.16; Tables 310.15(B)(1)(1) and 310.15(C)(1); 310.15(E): modeled conductor ampacity', 'conductors', true),necReference('110.14(C): terminal temperature limits', 'terminations', true),necReference('310.10(G): modeled parallel installation requirements', 'conductors', true),
 necReference('240.4(D) and 240.6(A): modeled conductor protection and standard ratings', 'ocpd', true),necReference('250.30: separately derived system checks outside calculation scope', 'grounding')
];
const round=n=>Number(n.toFixed(3));
// Display the exact factor rather than a rounded decimal approximation.
const phaseFactorLabel=phase=>Number(phase)===3?'√3':'1';
const yes=v=>v===true||v==='true';
const numeric=v=>(typeof v==='number'||typeof v==='string')&&String(v).trim()!==''&&Number.isFinite(Number(v));
const fail=error=>({error,results:[],steps:[],warnings:[],sources:transformerProtectionSources});
const wireLabel=s=>`${s} ${Number(s)>=250?'kcmil':'AWG'}`;
const correction=t=>t<=10?1.15:t<=15?1.12:t<=20?1.08:t<=25?1.04:t<=30?1:t<=35?.96:t<=40?.91:t<=45?.87:t<=50?.82:t<=55?.76:t<=60?.71:t<=65?.65:t<=70?.58:t<=75?.5:.41;
// Use tolerance only for binary floating-point equality, not rounded display values.
const close=(a,b)=>Math.abs(a-b)<=Math.max(1,Math.abs(a),Math.abs(b))*1e-12;
const le=(a,b)=>a<=b||close(a,b);
function ocpdLimit(current,side,mode){
 const multiplier=side==='primary'&&mode==='dual'?2.5:current<2&&side==='primary'?3:current<9?1.67:1.25;
 const raw=current*multiplier;
 const nextAllowed=multiplier===1.25;
 const next=transformerOcpdRatings.find(a=>le(raw,a));
 // Next-standard exception belongs only to the table's 125% cells.
 const maximum=nextAllowed?(next??raw):raw;
 const standardMaximum=transformerOcpdRatings.filter(a=>le(a,maximum)).at(-1);
 return {multiplier,raw,maximum,standardMaximum,nextAllowed};
}
const ocpdCheckStatus=(rating,limit)=>limit?allowanceCheckStatus(rating,limit.maximum,'Within Table 450.3(B) ceiling','Exceeds Table 450.3(B) ceiling'):{statusText:'No Table 450.3(B) secondary ceiling'};
export function transformerProtection(p){
 if(!p||!['kva','primary','secondary','designLoad','lengthFt','terminal','ambient','parallelSets'].every(k=>numeric(p[k])))return fail('Enter a finite number in every required field, including the preadjusted secondary design load.');
 const kva=Number(p.kva),vp=Number(p.primary),vs=Number(p.secondary),load=Number(p.designLoad),length=Number(p.lengthFt),terminal=Number(p.terminal),ambient=Number(p.ambient),sets=Number(p.parallelSets);
 if(![1,3,'1','3'].includes(p.phase))return fail('Choose one common single-phase or three-phase transformer configuration; phase conversion is not modeled.');
 if(kva<=0||vp<=0||vs<=0||vp>1000||vs>1000)return fail('Use positive nameplate kVA and primary/secondary voltages at or below 1000 V. Ordinary dry-type transformers only.');
 const voltageChecks=[checkVoltageInput(p,'primary','phase',true),checkVoltageInput(p,'secondary','phase',true)];
 if(voltageChecks.some(c=>c.error))return fail(voltageChecks.find(c=>c.error).error);
 if(p.scope!==undefined&&p.scope!=='dry-type')return fail('Only ordinary dry-type transformers at or below 1000 V are modeled.');
 if(!['dual','primary-only'].includes(p.protection))return fail('Choose primary-and-secondary (dual) or primary-only transformer protection.');
 if(!Object.hasOwn(secondaryRuleConditions,p.secondaryRule))return fail('Select a supported NEC 240.21(C) secondary conductor rule: 10 ft or 25 ft. Outside, industrial and primary-protected conductor arrangements require separate review.');
 const maxLength=p.secondaryRule==='10ft'?10:25;
 if(length<=0||length>maxLength)return fail(`The selected ${maxLength}-ft secondary conductor rule requires a measured conductor run greater than zero and no more than ${maxLength} ft.`);
 if(load<=0)return fail('Enter a secondary design load greater than zero, already including applicable continuous-load allowances.');
 if(![60,75,90].includes(terminal))return fail('Select a 60°C, 75°C or 90°C termination-rating design basis.');
 if(ambient< -10||ambient>80)return fail('Supported effective ambient range is −10°C to 80°C.');
 if(!Number.isInteger(sets)||sets<1||sets>20)return fail('Use 1–20 identical parallel sets, one complete set per separate raceway.');
 if(!['copper','aluminum'].includes(p.material))return fail('Choose copper or aluminum THHN/THWN-2 conductors.');
 if(p.insulation!==undefined&&p.insulation!=='THHN/THWN-2')return fail('Only 90°C THHN/THWN-2 insulation is modeled.');
 if(p.ccc!==undefined||p.physicalCount!==undefined)return fail('Choose a circuit configuration instead of overriding current-carrying conductor counts.');
 const circuit=Object.hasOwn(circuitConfigurations,p.configuration)?circuitConfigurations[p.configuration]:null;
 if(!circuit)return fail('Select the secondary circuit configuration.');
 const single=['single-phase-2-wire','split-phase-3-wire'].includes(p.configuration);
 if(single!==(Number(p.phase)===1))return fail('Secondary circuit configuration must match the transformer phase count.');
 if(p.configuration==='split-phase-3-wire'&&vs!==240)return fail('The 120/240 V split-phase configuration requires 240 V across the full secondary winding, not 120 V. Other split-phase systems need separate review.');
 const factor=Number(p.phase)===3?Math.sqrt(3):1,ip=kva*1000/(factor*vp),is=kva*1000/(factor*vs),ratio=vp/vs;
 if(![ip,is,ratio,load].every(Number.isFinite))return fail('Inputs exceed the supported numeric range.');
 const pl=ocpdLimit(ip,'primary',p.protection),sl=p.protection==='dual'?ocpdLimit(is,'secondary','dual'):null;
 for(const key of ['primaryOcpd','secondaryOcpd'])if(p[key]!==undefined&&!numeric(p[key]))return fail('OCPD ratings must be finite standard ratings, or zero for automatic selection.');
 const bp=Number(p.primaryOcpd??0)===0?transformerOcpdRatings.find(a=>le(ip,a)):Number(p.primaryOcpd);
 const bs=Number(p.secondaryOcpd??0)===0?transformerOcpdRatings.find(a=>le(load,a)):Number(p.secondaryOcpd);
 if(!transformerOcpdRatings.includes(bp)||!transformerOcpdRatings.includes(bs))return fail('Use a modeled NEC standard OCPD rating from 15 A through 4000 A, or zero for automatic selection. Small/nonstandard devices require separate review.');
 if(!le(ip,bp))return fail(`Selected primary OCPD is below ${formatCurrent(ip)} A nameplate current. This bounded model requires primary OCPD at least nameplate current; partial-load primary protection needs separate review.`);
 if(!le(bp,pl.maximum))return fail(`Primary ${bp} A OCPD exceeds the Table 450.3(B) ${round(pl.multiplier*100)}% limit (${formatCurrent(pl.raw)} A${pl.nextAllowed?`, permitted next standard ${pl.standardMaximum??'unavailable'} A`:''}). No next-standard exception is applied to 167%, 250% or 300% limits.`);
 if(!le(load,bs))return fail(`Secondary ${bs} A OCPD is below the ${formatCurrent(load)} A preadjusted design load.`);
 if(sl&&!le(bs,sl.maximum))return fail(`Secondary ${bs} A OCPD exceeds the Table 450.3(B) ${round(sl.multiplier*100)}% limit (${formatCurrent(sl.raw)} A${sl.nextAllowed?`, permitted next standard ${sl.standardMaximum??'unavailable'} A`:''}).`);
 const ratioFloor=bp*ratio/(p.secondaryRule==='10ft'?10:3),required=Math.max(load,bs,ratioFloor),af=correction(ambient),cf=circuit.ccc<=3?1:.8;
 if(!Number.isFinite(required))return fail('Inputs exceed the supported numeric range.');
 const prefix=p.material==='aluminum'?'al':'cu',metal=p.material==='aluminum'?'Al':'Cu';
 const caps=p.material==='aluminum'?{'12':15,'10':25}:{'14':15,'12':20,'10':30};
 const candidates=conductors.filter(w=>w[`${prefix}90`]!==null&&(sets===1||w.cm>=105600));
 const wire=candidates.find(w=>le(required,sets*Math.min(w[`${prefix}${terminal}`],w[`${prefix}90`]*af*cf))&&(!caps[w.size]||le(bs,caps[w.size])));
 if(!wire)return fail(`No phase conductor through 750 kcmil ${metal} in ${sets} set(s) satisfies the ${formatCurrent(required)} A combined requirement. Increase identical parallel sets or obtain an engineered design.`);
 const base=wire[`${prefix}90`],term=wire[`${prefix}${terminal}`],adjusted=base*af*cf,usable=Math.min(term,adjusted),combined=sets*usable;
 const ampacityStatus=allowanceCheckStatus(required,combined,'Meets required phase ampacity','Below required phase ampacity');
 const warnings=[
 ...voltageChecks.flatMap(c=>c.warnings),
 `Secondary conductor installation is an unverified design assumption. ${secondaryRuleConditions[p.secondaryRule]}`,
 'NEC 450.3(B) protects the transformer; NEC 240.21(C) independently governs secondary conductors. Primary-only transformer protection does not establish secondary conductor protection. This model requires a single downstream secondary breaker or set of fuses in BOTH protection modes.',
 'Only ordinary dry-type transformers at or below 1000 V, a single secondary conductor run and a single terminating secondary OCPD are modeled. No autotransformers, buck-boost, multiple windings/secondary circuits, supervised industrial exceptions, motor-only loads or phase conversion.',
 'The design load is preadjusted for applicable continuous-load allowances and other sizing rules. Nameplate current is not itself a complete calculated load. Verify actual connected load and transformer thermal/loading suitability separately.',
 'OCPDs are table-based candidates only. Verify fuse/breaker type, transformer inrush, trip curves, selective coordination, interrupting rating, available fault current, equipment SCCR, primary conductor protection and manufacturer requirements.',
 'Phase conductors only. Neutral/harmonic loading, grounding-electrode conductor, system bonding jumper, supply-side bonding jumper, equipment grounding, disconnecting means and conduit fill require separate review under NEC 250.30 and other applicable rules. No automatic Table 250.122 grounding size or neutral size is assigned.',
 'Use the lowest verified temperature rating of connected equipment and terminations at both ends under NEC 110.14(C). A 90°C insulation rating does not establish a 75°C or 90°C equipment rating.',
 'No NEC 240.4(B) next-size-up conductor exception is used. Corrected/adjusted combined phase ampacity must meet every secondary-rule floor and the full terminating secondary OCPD.',
 `${circuit.ccc} CCC per raceway are derived from the selected configuration. Three-phase four-wire neutrals conservatively count as CCC; split-phase neutral exclusion assumes only winding imbalance current under 310.15(E). Review nonlinear/harmonic loading and actual neutral conditions.`,
 'Use line-to-line voltage for three-phase and full-winding voltage for single-phase (240 V for a 120/240 V secondary). Effective ambient must already include any applicable rooftop adder; none is added here.'
 ];
 if(sets>1)warnings.push('Parallel phase conductors are 1/0 AWG or larger, with one complete identical set per separate raceway. Verify equal lengths, material, size, insulation and termination method, grouping, equal electrical characteristics and equipment listed for parallel terminations under 310.10(G).');
 if(terminal===90)warnings.push('90°C results assume ALL connected equipment and terminations are listed and identified for 90°C ampacity under NEC 110.14(C). This equipment condition is unverified; a 90°C wire or lug marking alone is insufficient, and the lowest equipment rating governs.');
 if(p.material==='aluminum')warnings.push('Aluminum is table-based, not a stocked-product recommendation. Verify AA-8000 THHN/THWN-2 availability, AL-rated terminals and manufacturer preparation/torque requirements.');
 if(ampacityStatus.status==='red')warnings.push('The unrounded usable phase ampacity is below the required minimum. Display rounding and selection tolerance do not establish compliance; increase the conductor capacity.');
 const steps=[
 `Nameplate primary I = ${kva} × 1000 / (${phaseFactorLabel(p.phase)} × ${vp}) = ${formatCurrent(ip)} A; secondary I = ${kva} × 1000 / (${phaseFactorLabel(p.phase)} × ${vs}) = ${formatCurrent(is)} A.`,
 `Table 450.3(B), ${p.protection==='dual'?'primary-and-secondary':'primary-only'} transformer protection: primary ceiling ${round(pl.multiplier*100)}% × ${formatCurrent(ip)} = ${formatCurrent(pl.raw)} A. ${pl.nextAllowed?'Only the 125% cell permits the next standard rating.':'This percentage has no next-standard exception.'} Selected primary OCPD = ${bp} A.`,
 sl?`Secondary transformer protection ceiling = ${round(sl.multiplier*100)}% × ${formatCurrent(is)} = ${formatCurrent(sl.raw)} A. ${sl.nextAllowed?'The 125% cell permits the next standard rating.':'No next-standard exception.'} Selected secondary OCPD = ${bs} A.`:`Primary-only transformer protection uses no Table 450.3(B) secondary percentage ceiling. The ${bs} A downstream OCPD is still required here for the selected secondary conductor arrangement.`,
 `Automatic selection, when requested: smallest modeled standard primary OCPD at least nameplate current and smallest secondary OCPD at least design load; both are checked against applicable transformer ceilings. This is not an inrush/coordination selection.`,
 `NEC 240.21(C)(${p.secondaryRule==='10ft'?'2':'6'}): entered secondary conductor length ${length} ft ≤ ${maxLength} ft. Installation conditions are assumed for design; actual installation is not verified.`,
 `Secondary conductor ratio floor = primary OCPD × primary/secondary voltage ${p.secondaryRule==='10ft'?'× 1/10':'× 1/3'} = ${bp} × ${vp}/${vs} / ${p.secondaryRule==='10ft'?10:3} = ${formatCurrent(ratioFloor)} A. The 10-ft floor is conservatively applied even for conductors remaining inside the supply enclosure.`,
 `Required combined usable phase ampacity = max(design load ${formatCurrent(load)}, terminating OCPD ${bs}, ratio floor ${formatCurrent(ratioFloor)}) = ${formatCurrent(required)} A.`,
 `${wireLabel(wire.size)} ${metal} per phase per set: ${terminal}°C terminal ampacity ${formatCurrent(term)} A; corrected/adjusted 90°C ampacity = ${formatCurrent(base)} × ${af} ambient × ${cf} CCC = ${formatCurrent(adjusted)} A.`,
 `${sets} set(s) × min(${formatCurrent(term)}, ${formatCurrent(adjusted)}) = ${formatCurrent(combined)} A combined usable phase ampacity ${combined>=required?'≥':'<'} ${formatCurrent(required)} A. No conductor next-size-up exception.`
 ];
 return {results:[
 {label:'Secondary phase conductor per set',value:`${wireLabel(wire.size)} ${metal}`,...ampacityStatus},
 currentResult('Primary full-load current',ip),
 currentResult('Secondary full-load current',is),
 {label:'Selected primary OCPD',value:bp,unit:'A',...ocpdCheckStatus(bp,pl)},
 {label:'Selected secondary OCPD',value:bs,unit:'A',...ocpdCheckStatus(bs,sl)},
 {label:'Maximum modeled primary OCPD',value:pl.standardMaximum??'None',...(pl.standardMaximum?{unit:'A'}:{})},
 {label:'Maximum modeled secondary transformer OCPD',value:sl?(sl.standardMaximum??'None'):'Not limited by primary-only table row',...(sl?.standardMaximum?{unit:'A'}:{})},
 {label:'Secondary conductor rule',value:`NEC 240.21(C)(${p.secondaryRule==='10ft'?'2':'6'}) · ${maxLength} ft`},
 currentResult('Required combined phase ampacity',required),
 {...currentResult('Combined usable phase ampacity',combined),...ampacityStatus},
 {...currentResult('Usable phase ampacity per set',usable),...allowanceCheckStatus(required,combined,'Meets per-set share of required ampacity','Below per-set share of required ampacity')},
 {label:'Separate conductor sets',value:sets},
 {label:'CCC per raceway',value:circuit.ccc},
 {label:'Neutral / grounding / bonding / conduit',value:'Separate design required'}
 ],steps,warnings,sources:[...transformerProtectionSources,...voltageSources]};
}

// The basic calculator is independent of actual load and conductor assumptions.
export function transformerProtectionLimits(p){
 if(!p||!['kva','primary','secondary'].every(k=>numeric(p[k])))return fail('Enter finite transformer rating and winding voltages.');
 const kva=Number(p.kva),vp=Number(p.primary),vs=Number(p.secondary);
 if(![1,3,'1','3'].includes(p.phase))return fail('Choose single-phase or three-phase.');
 if(kva<=0||vp<=0||vs<=0||vp>1000||vs>1000)return fail('Use positive nameplate kVA and primary/secondary voltages at or below 1000 V.');
 if(p.scope!==undefined&&p.scope!=='dry-type')return fail('Only ordinary dry-type transformers are modeled.');
 if(!['dual','primary-only'].includes(p.protection))return fail('Choose primary-and-secondary or primary-only transformer protection.');
 const checks=['primary','secondary'].map(k=>checkVoltageInput(p,k,'phase',true));
 if(checks.some(c=>c.error))return fail(checks.find(c=>c.error).error);
 const factor=Number(p.phase)===3?Math.sqrt(3):1,ip=kva*1000/(factor*vp),is=kva*1000/(factor*vs);
 if(![ip,is].every(Number.isFinite))return fail('Inputs exceed the supported numeric range.');
 const pl=ocpdLimit(ip,'primary',p.protection),sl=p.protection==='dual'?ocpdLimit(is,'secondary',p.protection):null;
 // Table 450.3(B) supplies upper limits, not an FLC minimum. Smaller devices
 // remain table candidates even when the transformer exceeds the modeled range.
 const cap=l=>l?.standardMaximum??'Outside modeled device range';
 const results=[currentResult('Primary full-load current',ip),currentResult('Secondary full-load current',is),
 {label:'Maximum modeled permitted primary OCPD',value:cap(pl,ip),...(typeof cap(pl,ip)==='number'?{unit:'A'}:{})},
 {label:'Maximum modeled permitted secondary OCPD',value:sl?cap(sl,is):'No Table 450.3(B) secondary ceiling',...(sl&&typeof cap(sl,is)==='number'?{unit:'A'}:{})},
 {label:'Protection method',value:p.protection==='dual'?'Primary and secondary protection':'Primary-only winding protection'},
 {label:'Enabled checks',value:'Transformer winding limits only'}];
 const steps=[`Nameplate current = kVA × 1000 / (${phaseFactorLabel(p.phase)} × winding voltage). Primary ${formatCurrent(ip)} A; secondary ${formatCurrent(is)} A.`,
 ...[[pl,'Primary'],[sl,'Secondary']].filter(([l])=>l).map(([l,side])=>`${side} Table 450.3(B) ceiling: ${round(l.multiplier*100)}% = ${formatCurrent(l.raw)} A. ${l.nextAllowed?'Only the 125% cell permits the next standard size.':'No next-standard exception.'} Modeled standard-device range is 15–4000 A; a reported modeled maximum is not the full table ceiling when that ceiling exceeds the device range.`)];
 const warnings=[...checks.flatMap(c=>c.warnings),'Maximum modeled permitted OCPDs are table limits, not recommended or selected breakers. No actual load, conductor size or installation suitability is inferred from nameplate current.',
 ...(p.protection==='primary-only'?['Primary-only winding protection establishes no Table 450.3(B) secondary ceiling. This does not mean that no secondary OCPD is needed; secondary conductors require independent protection review.']:[]),
 'NEC 2023 baseline, subject to adopted edition, AHJ and manufacturer instructions. Ordinary dry-type transformers only; verify inrush, coordination, fault current, equipment ratings, grounding and bonding separately.'];
 return {results,steps,warnings,sources:[...transformerProtectionSources,...voltageSources]};
}
// The two table ceilings are independent. Choosing either side first changes the
// workflow, not the physics: all counterpart candidates must satisfy their own
// applicable table ceiling. Actual load, inrush and conductor checks are separate.
export function transformerBreakerOptions(p){
 const basic=transformerProtectionLimits(p);
 if(basic.error)return {...basic,basic,primaryOptions:[],secondaryOptions:[]};
 const factor=Number(p.phase)===3?Math.sqrt(3):1;
 const primaryCurrent=Number(p.kva)*1000/(factor*Number(p.primary));
 const secondaryCurrent=Number(p.kva)*1000/(factor*Number(p.secondary));
 const primaryLimit=ocpdLimit(primaryCurrent,'primary',p.protection);
 const secondaryLimit=p.protection==='dual'?ocpdLimit(secondaryCurrent,'secondary',p.protection):null;
 const primaryOptions=transformerOcpdRatings.filter(a=>le(a,primaryLimit.maximum));
 const secondaryOptions=transformerOcpdRatings.filter(a=>!secondaryLimit||le(a,secondaryLimit.maximum));
 const breakerSide=p.breakerSide===undefined?'primary':p.breakerSide,selected={primary:0,secondary:0};
 let selectionError;
 if(!['primary','secondary'].includes(breakerSide))selectionError='Choose Define primary OCPD or Define secondary OCPD.';
 for(const side of ['primary','secondary']){
  const raw=p[`${side}Ocpd`];
  // Empty is deliberately unselected here; it never asks for automatic sizing.
  if(raw===undefined||raw===null||(typeof raw==='string'&&raw.trim()==='')||(numeric(raw)&&Number(raw)===0))continue;
  if(!numeric(raw)||!transformerOcpdRatings.includes(Number(raw))){
   selectionError??=`Choose a modeled standard ${side} OCPD rating from 15 A through 4000 A, or leave it unselected.`;continue;
  }
  selected[side]=Number(raw);
  const limit=side==='primary'?primaryLimit:secondaryLimit;
  if(limit&&!le(selected[side],limit.maximum))selectionError??=`Selected ${side} ${selected[side]} A OCPD exceeds the Table 450.3(B) ${round(limit.multiplier*100)}% limit (${formatCurrent(limit.raw)} A${limit.nextAllowed?`, permitted next standard ${limit.standardMaximum??'unavailable'} A`:''}). No next-standard exception is applied to 167%, 250% or 300% limits.`;
 }
 const otherSide=breakerSide==='primary'?'secondary':'primary';
 if(!selectionError&&!selected[breakerSide]&&selected[otherSide])selectionError=`Choose the starting ${breakerSide} OCPD before selecting the ${otherSide} OCPD.`;
 const partialCapacity={primary:selected.primary>0&&!le(primaryCurrent,selected.primary),secondary:selected.secondary>0&&!le(secondaryCurrent,selected.secondary)};
 const optionDetails={};
 for(const [side,options,current] of [['primary',primaryOptions,primaryCurrent],['secondary',secondaryOptions,secondaryCurrent]])optionDetails[side]=options.map(value=>({value,partialCapacity:!le(current,value),label:`${value} A${!le(current,value)?' · partial capacity (below nameplate FLC)':''}${side==='secondary'&&!secondaryLimit?' · no Table 450.3(B) ceiling':''}`}));
 return {basic,primaryOptions,secondaryOptions,primaryCurrent,secondaryCurrent,primaryLimit,secondaryLimit,breakerSide,selected,selectionError,complete:!selectionError&&selected.primary>0&&selected.secondary>0,partialCapacity,optionDetails};
}
export function evaluateTransformerProtection(p){
 const basic=transformerProtectionLimits(p);if(basic.error)return basic;
 // Hidden optional inputs cannot affect the basic winding-limits calculation.
 if(!yes(p.conductorCheckEnabled)&&!yes(p.ocpdCheckEnabled))return basic;
 const pair=transformerBreakerOptions(p);
 if(pair.selectionError)return fail(pair.selectionError);
 if(yes(p.conductorCheckEnabled)){
  if(!pair.complete)return fail('Choose an explicit primary and secondary OCPD pair before checking secondary conductors. Blank or zero is unselected, not automatic selection.');
  const full=transformerProtection(p);if(full.error)return full;
  full.results.push({label:'Protection method',value:p.protection==='dual'?'Primary and secondary protection':'Primary-only winding protection'},{label:'Enabled checks',value:'Selected OCPDs and secondary conductors'});return full;
 }
 basic.results.push({label:'Defined OCPD side',value:pair.breakerSide==='primary'?'Define primary OCPD':'Define secondary OCPD'});
 for(const side of ['primary','secondary'])if(pair.selected[side])basic.results.push({label:`Selected ${side} OCPD`,value:pair.selected[side],unit:'A',...ocpdCheckStatus(pair.selected[side],pair[`${side}Limit`])});
 const otherSide=pair.breakerSide==='primary'?'secondary':'primary';
 const options=pair[`${otherSide}Options`];
 const range=options.length?`${options[0]}–${options.at(-1)} A, modeled standard ratings only`:'No acceptable partner in the modeled 15–4000 A device range';
 const unbounded=otherSide==='secondary'&&!pair.secondaryLimit;
 const status=pair.complete?'Within transformer-protection limits (Table 450.3(B) only)':pair.selected[pair.breakerSide]?`Acceptable ${otherSide} partner range: ${range}${unbounded?'; no Table 450.3(B) secondary ceiling (4000 A is only the model limit)':''}`:`Choose the starting ${pair.breakerSide} OCPD`;
 if(pair.selected[pair.breakerSide]&&!pair.selected[otherSide]){
  basic.results.push({label:`Acceptable ${otherSide} partner OCPD range`,value:range+(unbounded?'; no Table 450.3(B) secondary ceiling; 4000 A is only the model limit':'')},
   {label:`Acceptable ${otherSide} standard OCPD choices`,value:options.length?options.map(a=>`${a} A`).join(', '):'None'});
  basic.steps.push('Partner ranges include only modeled standard devices from 15–4000 A that satisfy the selected Table 450.3(B) protection mode. Ratings below nameplate full-load current may limit usable capacity; actual load, continuous-load allowances, inrush and secondary conductor protection have not been checked.');
 }

 const pairExceeded=(pair.selected.primary>0&&pair.selected.primary>pair.primaryLimit.maximum)||(pair.secondaryLimit&&pair.selected.secondary>0&&pair.selected.secondary>pair.secondaryLimit.maximum);
 const pairStatus=pairExceeded?{status:'red',statusText:'Exceeds a Table 450.3(B) ceiling'}:pair.complete&&pair.secondaryLimit?{status:'green',statusText:'Within both Table 450.3(B) ceilings'}:{statusText:pair.complete?'No Table 450.3(B) secondary ceiling':'Breaker pair check not established'};
 basic.results.push({label:'Breaker pair status',value:pairExceeded?'Exceeds transformer-protection limits (Table 450.3(B) only)':status,...pairStatus});
 const partialSides=['primary','secondary'].filter(side=>pair.partialCapacity[side]);
 if(partialSides.length){
  basic.results.push({label:'Capacity note',value:'Partial-capacity selection: selected OCPD below nameplate FLC'});
  basic.warnings.push(`Partial-capacity selection: ${partialSides.map(side=>`${side} ${pair.selected[side]} A OCPD is below ${formatCurrent(pair[`${side}Current`])} A nameplate FLC`).join('; ')}. This is allowed by the modeled transformer table ceiling, but may limit usable transformer capacity. Actual usable load, continuous-load allowances, inrush and conductor protection have not been verified.`);
 }
 basic.results.find(r=>r.label==='Enabled checks').value='Selected OCPDs: Table 450.3(B) ceilings only; secondary conductors not checked';
 basic.steps.push(`You define the ${pair.breakerSide} OCPD; the other OCPD is optional for the table-only check. Each side is independently checked against its applicable Table 450.3(B) ceiling; there is no required breaker ratio. Blank or zero means unselected; no breaker is selected automatically.`,
 'Table-only choices may be below nameplate full-load current. No actual design load, conductor size, installation suitability or full-capacity operation is established by this check.');
 return basic;
}
export function migrateProtectionState(input,{preserveFull=true}={}){
 const p=structuredClone(input||{});
 if(p.ocpdCheckEnabled===undefined&&p.conductorCheckEnabled===undefined&&Object.hasOwn(p,'designLoad')){
  p.ocpdCheckEnabled=preserveFull;p.conductorCheckEnabled=preserveFull;
  p.migrationNotice=preserveFull?'Previous full transformer calculation preserved. Selected OCPD and secondary conductor checks remain enabled; verify the saved inputs and installation design assumptions.':'Now showing basic winding-protection limits. Your previous advanced inputs are retained in the optional checks, which are off.';
 }
 if(p.breakerSide===undefined){
  p.breakerSide='primary';
  // Preserve legacy auto-selected values only for reopened full calculations.
  // New table-only states use explicit choices and keep zero as unselected.
  if(preserveFull&&yes(p.conductorCheckEnabled)){
   const factor=Number(p.phase)===3?Math.sqrt(3):1;
   const restored=[];
   for(const [key,current] of [['primaryOcpd',Number(p.kva)*1000/(factor*Number(p.primary))],['secondaryOcpd',Number(p.designLoad)]]){
    if((p[key]===undefined||p[key]===0||p[key]==='0')&&Number.isFinite(current)&&current>0){
     p[key]=transformerOcpdRatings.find(a=>le(current,a))??0;
     if(p[key])restored.push(`${key==='primaryOcpd'?'primary':'secondary'} ${p[key]} A`);
    }
   }
   if(restored.length)p.migrationNotice=`${p.migrationNotice?p.migrationNotice+' ':''}Previous automatic breaker selections restored as explicit values: ${restored.join(', ')}. Verify the restored pair before reusing this calculation.`;
  }
 }
 return p;
}
