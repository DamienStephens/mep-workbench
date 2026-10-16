import { mvPresetImpedance } from './mv-cables.js?v=2.14.0';
export { mvPresetImpedance, mvCableFamilies, mvCableOptions, mvSizeOptions, mvArrangementOptions, mvTemperatureOptions } from './mv-cables.js?v=2.14.0';
import { necReference } from './code-references.js?v=2.14.0';
export { calculateCableTray as tray, migrateCableTrayState, setTrayArrangement, trayPhysicalCount, cableTrayDiameterReferences, cableTraySingleSizes } from './cable-tray.js?v=2.14.0';
import { formatCurrent, currentResult } from './current-display.js?v=2.14.0';
import { checkVoltageInput, voltageSources } from './voltage.js?v=2.14.0';
// Calculation engines are intentionally independent of the UI/module registry.
// NEC 2023 baseline. General circuits only; see module-specific scope and references.
const sizes=['14','12','10','8','6','4','3','2','1','1/0','2/0','3/0','4/0','250','300','350','400','500','600','700','750'];
const a60=[15,20,30,40,55,70,85,95,110,125,145,165,195,215,240,260,280,320,350,385,400];
const a75=[20,25,35,50,65,85,100,115,130,150,175,200,230,255,285,310,335,380,420,460,475];
const a90=[25,30,40,55,75,95,115,130,145,170,195,225,260,290,320,350,380,430,475,520,535];
// Aluminum ampacities: NEC Table 310.16; #14 aluminum is not modeled.
const al60=[null,15,25,35,40,55,65,75,85,100,115,130,150,170,195,210,225,260,285,315,320];
const al75=[null,20,30,40,50,65,75,90,100,120,135,155,180,205,230,250,270,310,340,375,385];
const al90=[null,25,35,45,55,75,85,100,115,135,150,175,205,230,260,280,305,350,385,425,435];
// Standard noncompact THHN/THWN-2: NEC 2023 Chapter 9 Table 5; all 21 modeled areas checked in published text.
const areas=[.0097,.0133,.0211,.0366,.0507,.0824,.0973,.1158,.1562,.1855,.2223,.2679,.3237,.3970,.4608,.5242,.5863,.7073,.8676,.9887,1.0496];
const cms=[4110,6530,10380,16510,26240,41740,52620,66360,83690,105600,133100,167800,211600,250000,300000,350000,400000,500000,600000,700000,750000];
export const conductors=sizes.map((size,i)=>({size,cu60:a60[i],cu75:a75[i],cu90:a90[i],al60:al60[i],al75:al75[i],al90:al90[i],area:areas[i],cm:cms[i],volume:({14:2,12:2.25,10:2.5,8:3,6:5})[size]}));
export const conduitSizes=['1/2','3/4','1','1-1/4','1-1/2','2','2-1/2','3','3-1/2','4'].map((size,i)=>({size,area:[.304,.533,.864,1.496,2.036,3.356,5.858,8.846,11.545,14.753][i],fill40:[.122,.213,.346,.598,.814,1.342,2.343,3.538,4.618,5.901][i],fill53:[.161,.283,.458,.793,1.079,1.778,3.105,4.688,6.119,7.819][i],fill31:[.094,.165,.268,.464,.631,1.040,1.816,2.742,3.579,4.573][i]}));
// NEC 2023 Chapter 9 Table 4: published total and 40% areas, inches squared.
export const conductorRaceways={
 emt:{label:'EMT',sizes:conduitSizes},
 imc:{label:'IMC',sizes:[["1/2",0.342,0.137],["3/4",0.586,0.235],["1",0.959,0.384],["1-1/4",1.647,0.659],["1-1/2",2.225,0.89],["2",3.63,1.452],["2-1/2",5.135,2.054],["3",7.922,3.169],["3-1/2",10.584,4.234],["4",13.631,5.452]].map(([size,area,fill40])=>({size,area,fill40}))},
 rmc:{label:'RMC',sizes:[["1/2",0.314,0.125],["3/4",0.549,0.22],["1",0.887,0.355],["1-1/4",1.526,0.61],["1-1/2",2.071,0.829],["2",3.408,1.363],["2-1/2",4.866,1.946],["3",7.499,3.0],["3-1/2",10.01,4.004],["4",12.882,5.153]].map(([size,area,fill40])=>({size,area,fill40}))},
 pvc40:{label:'PVC Schedule 40',sizes:[["1/2",0.285,0.114],["3/4",0.508,0.203],["1",0.832,0.333],["1-1/4",1.453,0.581],["1-1/2",1.986,0.794],["2",3.291,1.316],["2-1/2",4.695,1.878],["3",7.268,2.907],["3-1/2",9.737,3.895],["4",12.554,5.022]].map(([size,area,fill40])=>({size,area,fill40}))},
 pvc80:{label:'PVC Schedule 80',sizes:[["1/2",0.217,0.087],["3/4",0.409,0.164],["1",0.688,0.275],["1-1/4",1.237,0.495],["1-1/2",1.711,0.684],["2",2.874,1.15],["2-1/2",4.119,1.647],["3",6.442,2.577],["3-1/2",8.688,3.475],["4",11.258,4.503]].map(([size,area,fill40])=>({size,area,fill40}))},
};
// Comparison uses the published allowance directly, including equality at its boundary.
export function minimumConductorRaceway(type, area){
 if(!Object.hasOwn(conductorRaceways,type)||!Number.isFinite(area)||area<0)return undefined;
 return conductorRaceways[type].sizes.find(c=>area<=c.fill40);
}
export const standardOcpdRatings=[10,15,20,25,30,35,40,45,50,60,70,80,90,100,110,125,150,175,200,225,250,300,350,400,450,500,600,700,800,1000,1200,1600,2000,2500,3000,4000];
const standard=standardOcpdRatings;
const refs={
 conductor:[necReference('Table 310.16: modeled Cu/Al ampacity cells', 'ampacity', true),necReference('Tables 310.15(B)(1)(1) and 310.15(C)(1); 310.15(E)/(F): modeled ambient/CCC factors and neutral treatment', 'conductors', true),necReference('310.10(G): modeled parallel conductor minimum and matching requirements', 'conductors', true),necReference('110.14(C): terminal temperature limitations; equipment listing remains project-specific', 'terminations', true),necReference('240.4(D)/(C) and 240.6(A): small-conductor caps and modeled standard ratings', 'ocpd', true),necReference('Chapter 9 Table 8: modeled circular-mil conductor areas', 'circularMils', true)],
 transformer:[{label:'Electrical relationship: I = VA / V (single phase), I = VA / (√3 × V) (balanced three phase); ideal nameplate current, not an NEC sizing rule',category:'Physics'}],
 power:[{label:'Electrical relationships: VA = W / PF; I = VA / V (single phase), I = VA / (√3 × V) (balanced three phase); not an NEC sizing rule',category:'Physics'}],
 conduit:[necReference('Chapter 9 Table 1 and notes 3/6: modeled raceway fill percentages and conductor counting', 'fill', true),necReference('Chapter 9 Table 4: modeled EMT total and permitted-fill areas', 'emt', true),necReference('Chapter 9 Table 5: modeled standard THHN/THWN-2 areas', 'areas', true)],
 drop:[necReference('210.19 Informational Note: general branch voltage-drop guidance', 'branch', true),necReference('215.2(A)(2) Informational Note No. 2: general feeder/combined voltage-drop guidance', 'feeder', true)],
 box:[necReference('314.16(B)(1)–(6) and Table 314.16(B)(1): modeled uniform-size box allowances, including terminal-block assemblies', 'box', true)]
};
const fmt=n=>Number(n.toFixed(3));
// Semantic checks compare finite raw values, never rounded/display values.
// A missing or invalid comparison is neutral rather than a passing claim.
export function allowanceCheckStatus(demand,allowance,within='Within allowance',exceeded='Exceeds allowance'){
 if(!Number.isFinite(demand)||!Number.isFinite(allowance)||demand<0||allowance<0)return {statusText:'Check not established'};
 const pass=demand<=allowance;
 return {status:pass?'green':'red',statusText:pass?within:exceeded};
}
const valid=(...ns)=>ns.every(n=>Number.isFinite(Number(n)));
const fail=error=>({error,results:[],steps:[],warnings:[],sources:[]});
const result=(results,steps,warnings=[],sources=[])=>results.some(r=>typeof r.value==='number'&&!Number.isFinite(r.value))?fail('The calculation exceeds the supported numeric range. Reduce the input magnitudes.'):({results,steps,warnings,sources});
const hasNumbers=(p,keys)=>p&&keys.every(k=>{const v=p[k];return (typeof v==='number'||typeof v==='string')&&String(v).trim()!==''&&Number.isFinite(Number(v));});
const wireLabel=size=>`${size} ${Number(size)>=250?'kcmil':'AWG'}`;
function phaseFactor(p){if(!['1','3',1,3].includes(p))throw Error('Choose single-phase or three-phase.');return Number(p)===3?Math.sqrt(3):1;}
// Keep the exact three-phase factor symbolic in the displayed method.
const phaseFactorLabel=phase=>Number(phase)===3?'√3':'1';
function wire(s){return conductors.find(w=>w.size===String(s));}
function ambient90(t){if(t< -10||t>80)return null;return t<=10?1.15:t<=15?1.12:t<=20?1.08:t<=25?1.04:t<=30?1:t<=35?.96:t<=40?.91:t<=45?.87:t<=50?.82:t<=55?.76:t<=60?.71:t<=65?.65:t<=70?.58:t<=75?.5:.41;}
function adjustment(n){return n<=3?1:n<=6?.8:n<=9?.7:n<=20?.5:n<=30?.45:n<=40?.4:.35;}
const egcTable=[[15,'14'],[20,'12'],[60,'10'],[100,'8'],[200,'6'],[300,'4'],[400,'3'],[500,'2'],[600,'1'],[800,'1/0'],[1000,'2/0'],[1200,'3/0'],[1600,'4/0'],[2000,'250'],[2500,'350'],[3000,'400'],[4000,'500']];
function egc(a){return egcTable.find(([rating])=>a<=rating)?.[1];}
export const circuitConfigurations={
 'three-phase-3-wire':{label:'Three-phase · 3-wire (no neutral)',physical:3,ccc:3},
 'three-phase-4-wire':{label:'Three-phase · 4-wire (full-size neutral)',physical:4,ccc:4},
 'single-phase-2-wire':{label:'Single-phase · 2-wire',physical:2,ccc:2},
 'split-phase-3-wire':{label:'120/240 V split-phase · 3-wire',physical:3,ccc:2}
};
// Convert pre-v2.1 conductor state without mutating saved calculation snapshots.
export function migrateConductorState(input){
 const old={...input};
 const legacyCounts=['continuous','ccc','physicalCount'].some(k=>Object.hasOwn(old,k));
 const hasLoad=Object.hasOwn(old,'load');
 if(!hasLoad&&!legacyCounts)return old;
 const numeric=v=>(typeof v==='number'||typeof v==='string')&&String(v).trim()!==''&&Number.isFinite(Number(v))&&Number(v)>=0;
 const load=numeric(old.load)&&(!legacyCounts||numeric(Object.hasOwn(old,'continuous')?old.continuous:0))?Number(old.load)+(legacyCounts?1.25*Number(Object.hasOwn(old,'continuous')?old.continuous:0):0):NaN;
 const explicit=Object.hasOwn(old,'ocpd')&&old.ocpd!==undefined&&old.ocpd!==0&&old.ocpd!=='0';
 old.ocpd=explicit?old.ocpd:(Number.isFinite(load)&&load>0?standard.find(a=>a>=load)??'':'');
 old.migrationNotice=explicit?'Saved OCPD rating preserved. Verify the selected rating and actual operating current before use.':'Previous load converted to an explicit OCPD rating. Verify the rating and actual operating current before use.';
 if(legacyCounts){old.configuration='';old.parallelSets=1;old.migrationNotice+=' Previous noncontinuous load + 125% of continuous load was used. Select the circuit configuration; manual counts were removed.';}
 for(const key of ['load','continuous','ccc','physicalCount'])delete old[key];
 return old;
}
// Optional segment-only, resistance-method voltage-drop sizing. No load-factor inference.
function integratedDrop(p,candidates,initial,sets,material,ocpdBased=false){
 const currentLimit=ocpdBased?Number(p.ocpd):Number(p.load),basis=ocpdBased?'selected OCPD rating':'preadjusted design load';
 if(p.voltageDropEnabled!==true&&p.voltageDropEnabled!=='true')return {wire:initial,results:[],steps:[],warnings:[],sources:[]};
 if(!hasNumbers(p,['length','current','target','voltage']))return {error:`Voltage-drop sizing requires a separate actual operating current, one-way length, voltage and target. Do not substitute the ${basis} for actual current.`};
 const L=Number(p.length),I=Number(p.current),V=Number(p.voltage),target=Number(p.target),phase=Number(p.phase);
 if(L<0||I<0||I>currentLimit||target<=0||target>100)return {error:`Voltage-drop sizing needs nonnegative one-way length and actual current, current no greater than the ${basis}, and a target greater than 0% and no more than 100%.`};
 const expected=p.configuration.startsWith('three-phase')?3:1;
 if(phase!==expected)return {error:'Voltage-drop phase must match the selected circuit configuration.'};
 const check=checkVoltageInput(p);if(check.error)return {error:check.error};
 if(V>1000)return {error:'Integrated conductor sizing is limited to 1,000 V within this low-voltage THHN/THWN-2 model. Use separate medium-voltage cable ampacity and installation design; standalone manual-impedance voltage drop does not size conductors.'};
 if(p.configuration==='split-phase-3-wire'&&V!==240)return {error:'The 120/240 V split-phase arrangement uses 240 V line-to-line for a balanced full-circuit drop estimate. Individual 120 V leg / neutral drop needs a separate unbalanced analysis.'};
 const factor=phase===3?Math.sqrt(3):2,K=material==='aluminum'?21.2:12.9;
 const dropAt=w=>factor*K*L*(I/sets)/w.cm;
 const selected=candidates.find(w=>w.cm>=initial.cm&&100*dropAt(w)/V<=target);
 if(!selected)return {error:'No supported conductor through 750 kcmil per set meets both the ampacity/OCPD requirements and this voltage-drop target. Revise the length, set quantity or design; no passing size or conduit is selected.'};
 const vd=dropAt(selected),pct=100*vd/V;
 // Guidance uses unrounded percentages; the user's design-target check remains separate.
 const dropPresentation=ocpdBased?{status:dropStatus(pct)}:{};
 return {wire:selected,enabled:true,results:[
  {label:'Initial ampacity conductor per set',value:wireLabel(initial.size)},
  currentResult('Voltage-drop current',I,I),
  {label:'Estimated voltage drop',value:fmt(vd),unit:'V',...dropPresentation},
  {label:'Estimated drop',value:fmt(pct),unit:'%',...dropPresentation,...(ocpdBased?{statusText:pct<=3?'At or below 3%':pct<5?'Above 3% and below 5%':'At or above 5%'}:{})},
  {label:'Voltage-drop target',value:target,unit:'%'},
  {label:'Target check',value:'Within target',...(ocpdBased?{status:pct<=target?'green':'red'}:{})},
  {label:'Sizing basis',value:selected.cm>initial.cm?'Voltage drop increased conductor size':'Ampacity / OCPD controls'}
 ],steps:[`Initial ampacity/OCPD selection = ${wireLabel(initial.size)} per set. The final conductor is the smallest supported size satisfying both checks with the same ${sets} set(s).`,`Drop current = ${formatCurrent(I)} A actual total operating current, separately entered from the ${ocpdBased?currentLimit:formatCurrent(currentLimit)} A ${basis}. Per-set current = ${formatCurrent(I)} / ${sets} = ${formatCurrent(I/sets)} A.`,`Resistance-method VD = ${phase===3?'√3':'2'} × ${K} × ${L} ft one-way × ${formatCurrent(I/sets)} A / ${selected.cm} CM = ${fmt(vd)} V (${fmt(pct)}% of ${V} V), checked against ${target}% without rounding.`],warnings:[...check.warnings,'Voltage-drop sizing is a resistance-only estimate using approximate 75°C K values; it ignores AC reactance, power factor, raceway effects, harmonic currents and actual conductor temperature. Balanced loading and equal sharing between parallel sets are assumed.','This checks only the entered segment. Typical 3% branch / 5% combined guidance is informational for general circuits; mandatory application-specific limits and the entire upstream/downstream path require separate review.',...(p.configuration==='split-phase-3-wire'?['Split-phase drop assumes balanced 240 V line-to-line loading; unequal 120 V loads and neutral voltage drop are not evaluated.']:[])],sources:[...refs.drop,...voltageSources]};
}
// Fill has a published pass/fail allowance, not a separate near-limit warning band.
export function conductorFillStatus(area,raceway){return raceway?allowanceCheckStatus(area,raceway.fill40).status:'red';}
const egcUpsizeSource=necReference('250.122(B): modeled voltage-drop CM increase; other non-thermal upsizing requires separate review', 'grounding', true);
export function conductor(p){
 if(!hasNumbers(p,['ocpd','terminal','ambient','parallelSets']))return fail('Enter a finite number in every required field, including the selected OCPD rating.');
 if(['continuous','ccc','physicalCount'].some(k=>p[k]!==undefined))return fail('Use an explicit OCPD rating, a circuit configuration and parallel-set quantity. Legacy continuous-load and manual conductor counts are not supported.');
 const terminal=Number(p.terminal),ambient=Number(p.ambient),sets=Number(p.parallelSets),ocpd=Number(p.ocpd);
 if(![60,75,90].includes(terminal))return fail('Select 60°C, 75°C or 90°C equipment terminations.');
 if(!Number.isInteger(sets)||sets<1||sets>20)return fail('Enter 1–20 identical parallel sets, each in a separate raceway.');
 const racewayType=p.racewayType===undefined?'emt':p.racewayType;
 if(!Object.hasOwn(conductorRaceways,racewayType))return fail('Choose a supported raceway type: EMT, IMC, RMC, PVC Schedule 40 or PVC Schedule 80.');
 const raceway=conductorRaceways[racewayType];
 const circuit=Object.hasOwn(circuitConfigurations,p.configuration)?circuitConfigurations[p.configuration]:null;
 if(!circuit)return fail('Choose the circuit configuration so phase, neutral and current-carrying counts can be derived.');
 const material=p.material??'copper';
 if(!['copper','aluminum'].includes(material))return fail('Choose copper or aluminum THHN/THWN-2 conductors.');
 const af=ambient90(ambient);if(af===null)return fail('Supported ambient range is −10°C to 80°C.');
 const cf=adjustment(circuit.ccc),breaker=ocpd;
 if(!breaker||!standard.includes(breaker))return fail('Choose an explicit listed standard OCPD rating from 10–4000 A; automatic selection is not supported. Maximum modeled TOTAL OCPD is 4000 A, including parallel sets.');
 const metal=material==='aluminum'?'Al':'Cu',prefix=material==='aluminum'?'al':'cu',caps=material==='aluminum'?{12:15,10:25}:{14:15,12:20,10:30};
 const allCandidates=conductors.filter(w=>w[`${prefix}90`]!==null).map(w=>({...w,term:w[`${prefix}${terminal}`],base90:w[`${prefix}90`],adjusted:w[`${prefix}90`]*af*cf}));
 const withoutFloor=allCandidates.find(w=>sets*Math.min(w.term,w.adjusted)>=breaker&&(!caps[w.size]||breaker<=caps[w.size]));
 const conservativeGrounding=sets>1&&!!withoutFloor&&withoutFloor.cm<105600;
 const candidates=allCandidates.filter(w=>sets===1||w.cm>=105600);
 const initial=candidates.find(w=>sets*Math.min(w.term,w.adjusted)>=breaker&&(!caps[w.size]||breaker<=caps[w.size]));
 if(!initial)return fail(`No supported conductor through 750 kcmil ${metal} per set satisfies ${breaker} A total OCPD with ${sets} set(s). Increase the set quantity or use an engineered arrangement.`);
 const integrated=integratedDrop(p,candidates,initial,sets,material,true);if(integrated.error)return fail(integrated.error);
 const w=integrated.wire;
 const baseGround=wire(egc(breaker)),egcRatio=w.cm/initial.cm,requiredGroundCM=conservativeGrounding?Math.max(baseGround.cm,w.cm):baseGround.cm*egcRatio;
 const ground=conductors.find(c=>c.cm>=requiredGroundCM);
 if(!ground)return fail('The proportional Cu EGC increase exceeds the supported 750 kcmil range. No passing EGC or conduit is selected; obtain an engineered grounding and raceway design.');
 const usable=Math.min(w.term,w.adjusted),count=circuit.physical+1,area=(circuit.physical*Math.round(w.area*10000)+Math.round(ground.area*10000))/10000,emt=minimumConductorRaceway(racewayType,area);
 const ampacityStatus=allowanceCheckStatus(breaker,sets*usable,'Meets selected OCPD ampacity','Below selected OCPD ampacity');
 const fillStatus=emt?allowanceCheckStatus(area,emt.fill40,'Within published fill allowance','Exceeds published fill allowance'):{status:'red',statusText:'Exceeds supported fill range'};
 const steps=[`Selected total OCPD rating = ${breaker} A. Conductor ampacity is checked against this rating; OCPD selection and load/equipment requirements must be verified separately.`,`${circuit.label}: ${circuit.physical} full-size insulated phase/neutral conductors and ${circuit.ccc} current-carrying conductors per set.`,`${sets} identical set(s), one complete set in each separate raceway. Effective ambient = ${ambient}°C (any applicable rooftop adder must already be included; no additional adder is applied). 90°C ambient factor = ${af}; CCC adjustment factor = ${cf}.`,`${wireLabel(w.size)} ${metal} per phase/neutral in each set: ${terminal}°C terminal ampacity ${formatCurrent(w.term)} A; corrected 90°C ampacity ${formatCurrent(w.base90)} × ${af} × ${cf} = ${formatCurrent(w.adjusted)} A.`,`Usable ampacity per set = min(${formatCurrent(w.term)}, ${formatCurrent(w.adjusted)}) = ${formatCurrent(usable)} A; combined usable ampacity = ${sets} × ${formatCurrent(usable)} = ${formatCurrent(sets*usable)} A ≥ ${breaker} A total OCPD. No next-size-up exception.`,`Each raceway: ${circuit.physical} × ${wireLabel(w.size)} ${metal} (including any full-size neutral) + 1 × ${wireLabel(ground.size)} insulated Cu EGC. Each EGC ${!conservativeGrounding&&egcRatio>1?'starts with':'is sized from'} the TOTAL ${breaker} A OCPD, not a divided rating${conservativeGrounding?', with a conservative full-size Cu selection':egcRatio>1?', then is increased for voltage drop':''}.`,`Per-raceway fill: ${circuit.physical} × ${w.area.toFixed(4)} + ${ground.area.toFixed(4)} = ${area.toFixed(4)} in²; ${count} physical conductors permit 40% fill.`,emt?`Each of ${sets} ${raceway.label} raceway(s): ${emt.size} in.; published Table 4 40% allowance = ${emt.fill40.toFixed(3)} in²; actual fill = ${fmt(area/emt.area*100)}%.`:`Required ${raceway.label} exceeds the supported 4-inch range; no passing raceway selected.`];
 const warnings=[`NEC 2023 baseline: 210.19(A)(1), 210.20(A), 215.2(A)(1), 215.3, 110.14(C), Table 310.16, 310.15(B)(1)/(C)(1)/(E), 310.10(G), 240.4(D), 240.6(A), Table 250.122 and 250.122(F); Chapter 9 Tables 1, 4 and 5.`,`The selected OCPD must independently satisfy applicable load, continuous-load and equipment requirements. This tool checks conductors against the chosen rating and does not select protection from a load calculation. Combined terminal and corrected ampacity (per-set values × set quantity) are both checked against the total OCPD, conservatively. The total OCPD is capped at 4000 A in this version.`,`Circuit configuration determines all wire counts. Neutrals are full-size and included in fill. All three-phase 4-wire neutrals conservatively count as CCC (80% adjustment). Split-phase neutrals are excluded only when carrying imbalance current under applicable NEC conditions. A full-size neutral is an assumption, not proof of adequacy for harmonic loads. Two phase conductors plus a neutral from a 4-wire three-phase wye system are not the split-phase configuration and are not modeled.`,`One complete identical set per separate raceway, with one insulated Cu EGC in every raceway. Sets sharing a raceway, multiple circuits, reduced neutrals and unequal arrangements are not modeled.`,`Raceway fill uses standard noncompact THHN/THWN-2 Table 5 areas, with no compact-conductor reduction. Verify actual product outside diameter and listing; XHHW-2 and other insulation types are not interchangeable. Modeled Table 5 areas and Table 4 ${raceway.label} allowances checked against published NEC 2023.`,`General feeders/branches with 90°C insulation only. No motors, HVAC, welders, transformer secondaries, taps, services/dwelling exceptions, bundling exceptions or 100%-rated equipment.`,`Cu EGC is the Table 250.122 base minimum only, not a final grounding design. Review other conductor upsizing, fault-path adequacy and bonding before use. Neutral load/harmonics and voltage drop are not designed here.`,`Minimum raceway is a physical fill result only; verify pulling feasibility, bends, installation conditions, equipment ratings and local amendments.`];
 if(terminal===90)warnings.unshift('90°C equipment rating condition: the selected rating is a design assumption, not verified equipment eligibility. All connected equipment and terminations at both ends must be listed and identified for 90°C ampacity under NEC 110.14(C). A 90°C wire or lug marking alone is insufficient; the lowest connected rating governs.');
 if(sets>1)warnings.unshift('Parallel phase and neutral conductors are restricted to 1/0 AWG or larger. Corresponding parallel conductors must have the same length, material, circular-mil area, insulation type and termination method. Verify equal electrical characteristics, grouping, raceway arrangement and equipment listed for parallel terminations. No small-conductor parallel exceptions are applied.');
 if(!emt)warnings.unshift('No supported raceway fits this per-set schedule. Use an engineered raceway arrangement. The ampacity result does not establish a complete installation.');
 if(material==='aluminum')warnings.push('Aluminum results are NEC table-based, not a stocked-product recommendation. Verify listed AA-8000-series THHN/THWN-2, available size and AL-rated terminations; follow manufacturer preparation/torque instructions. No #14 aluminum is modeled; #12 and #10 aluminum OCPD limits are 15 A and 25 A.');
 if(integrated.enabled){
  steps.push(...integrated.steps);
  if(!conservativeGrounding)steps.push(`Cu EGC proportional basis: Table 250.122 base ${wireLabel(baseGround.size)} (${baseGround.cm} CM) × final / initial phase CM (${w.cm} / ${initial.cm}) = ${fmt(requiredGroundCM)} CM; round up to ${wireLabel(ground.size)} Cu in EACH raceway. Parallel-set quantity remains ${sets}.`);
  warnings.splice(warnings.findIndex(x=>x.startsWith('Cu EGC is the Table')),1,'Modeled Cu EGC includes a proportional 250.122(B) increase for this voltage-drop upsizing, using the initial corrected ampacity/OCPD selection at the same set count as its baseline. This is not a complete grounding design: independently review other non-thermal upsizing, fault-path impedance, bonding, termination capacity and adopted code. No increase is attributed to ambient/CCC correction alone.');
  warnings.push(...integrated.warnings);
 }
 if(conservativeGrounding){
  steps.push(`Conservative parallel-floor grounding: the 1/0 AWG minimum exceeds the modeled ampacity-only selection. Instead of assigning an uncertain proportional baseline, select insulated Cu EGC at least the FINAL individual phase conductor area (${w.cm} CM, including any voltage-drop increase) and at least the full-${breaker}-A Table 250.122 Cu EGC (${baseGround.cm} CM): ${wireLabel(ground.size)} Cu in EACH raceway. For aluminum phases, Cu EGC uses at least the same circular-mil area, not aluminum ampacity equivalence. This is a conservative selection, not a calculated NEC minimum. The final insulated EGC area is included in fill.`);
  const index=warnings.findIndex(x=>x.startsWith('Cu EGC is the Table')||x.startsWith('Modeled Cu EGC includes'));
  warnings.splice(index,1,'Cu EGC is conservatively selected full-size for a parallel-floor case, at least the final individual phase CM and full-OCPD Table 250.122 Cu size. NEC 250.122(A) does not require a wire EGC larger than the circuit conductors; no disputed parallel-floor proportional baseline is assumed. Verify effective ground-fault path, bonding, termination capacity and installation requirements.');
 }
 const output=result([{label:material==='aluminum'?'Aluminum conductor per set':'Copper conductor per set',value:wireLabel(w.size),...ampacityStatus},{label:'Minimum raceway per set',value:emt?`${emt.size} in.`:'Over supported 4 in. range',...fillStatus},{label:'Raceway type',value:raceway.label},{label:'Separate raceways',value:sets},{label:'Actual fill per raceway',value:emt?fmt(area/emt.area*100):'No supported raceway',unit:emt?'%':undefined,...fillStatus},{label:'Total OCPD',value:breaker,unit:'A'},{...currentResult('Combined usable ampacity',sets*usable),...ampacityStatus},{...currentResult('Usable ampacity per set',usable),...allowanceCheckStatus(breaker,sets*usable,'Meets per-set share of OCPD','Below per-set share of OCPD')},{label:conservativeGrounding?'Conservative Cu EGC per raceway':integrated.enabled?'Modeled Cu EGC per raceway':'Base-minimum Cu EGC per raceway',value:wireLabel(ground.size)},{label:'Physical conductors per raceway incl. EGC',value:count},{label:'CCC per raceway',value:circuit.ccc},{label:'Permitted fill per raceway',value:40,unit:'%'},{label:'Conductor area per raceway incl. EGC',value:fmt(area),unit:'in²'},...integrated.results,...(conservativeGrounding?[{label:'Base-minimum Cu EGC per raceway',value:wireLabel(baseGround.size)}]:[]),...(integrated.enabled&&!conservativeGrounding?[{label:'Base-minimum Cu EGC per raceway',value:wireLabel(baseGround.size)},{label:'EGC proportional increase',value:fmt(egcRatio),unit:'×'},{label:'Required Cu EGC area before rounding',value:fmt(requiredGroundCM),unit:'cmil'}]:[])],steps,warnings,[...integrated.sources,...(integrated.enabled&&!conservativeGrounding?[egcUpsizeSource]:[]),...(conservativeGrounding?[necReference('250.122(A)/(F): conservative full-size Cu EGC selection for parallel-floor cases', 'grounding', true)]:[]),...refs.conductor,...refs.conduit.filter(x=>!x.label.includes('Table 4:')),necReference(`Chapter 9 Table 4: modeled ${raceway.label} total and 40% fill areas`, racewayType, true),necReference('240.6(A): modeled standard OCPD ratings through 4000 A', 'ocpd', true),necReference('Table 250.122 and 250.122(F)(1)(b): modeled base Cu EGC sizes and each parallel raceway', 'grounding', true),{label:'Product data, not code authority — Southwire: AA-8000 aluminum THHN/THWN-2 construction, availability and product dimensions',url:'https://www.southwire.com/wire-cable/building-wire/simpull-sup-sup-thhn-thwn-2-aluminum-with-alumaflex-sup-sup-brand-conductors/p/SPEC10012'}]);
 return {...output,groundingReviewRequired:false,conservativeGrounding};
}
export function service(p){
 if(!hasNumbers(p,['load','terminal','ambient','parallelSets'])||(p.ocpd!==undefined&&!hasNumbers(p,['ocpd'])))return fail('Enter a finite number in every required field; optional OCPD may be omitted.');
 if(['continuous','ccc','physicalCount'].some(k=>p[k]!==undefined))return fail('Use one preadjusted design load, a circuit configuration and parallel-set quantity. Legacy continuous-load and manual conductor counts are not supported.');
 const load=Number(p.load),terminal=Number(p.terminal),ambient=Number(p.ambient),sets=Number(p.parallelSets),ocpd=Number(p.ocpd??0);
 if(load<=0)return fail('Enter a design load greater than zero, including any required continuous-load allowance.');
 if(![60,75,90].includes(terminal))return fail('Select 60°C, 75°C or 90°C equipment terminations.');
 if(!Number.isInteger(sets)||sets<1||sets>20)return fail('Enter 1–20 identical parallel sets, each in a separate raceway.');
 const circuit=Object.hasOwn(circuitConfigurations,p.configuration)?circuitConfigurations[p.configuration]:null;
 if(!circuit)return fail('Choose the circuit configuration so phase, neutral and current-carrying counts can be derived.');
 if(p.scope!==undefined&&p.scope!=='commercial')return fail('This module supports general commercial / non-dwelling services only. No dwelling reduction is applied.');
 const material=p.material??'copper';
 if(!['copper','aluminum'].includes(material))return fail('Choose copper or aluminum THHN/THWN-2 conductors.');
 const af=ambient90(ambient);if(af===null)return fail('Supported ambient range is −10°C to 80°C.');
 const cf=adjustment(circuit.ccc),breaker=ocpd===0?standard.find(a=>a>=Math.max(60,load)):ocpd;
 if(!breaker||!standard.includes(breaker))return fail('Choose a listed standard OCPD rating, or reduce the load. Maximum modeled TOTAL OCPD is 4000 A, including parallel sets.');
 if(breaker<60)return fail('General commercial services require a modeled service OCPD of at least 60 A. One-/two-circuit exceptions are outside this tool.');
 if(breaker<load)return fail(`The selected ${breaker} A total OCPD is below the ${formatCurrent(load)} A design load.`);
 const metal=material==='aluminum'?'Al':'Cu',prefix=material==='aluminum'?'al':'cu',caps=material==='aluminum'?{12:15,10:25}:{14:15,12:20,10:30};
 const allCandidates=conductors.filter(w=>w[`${prefix}90`]!==null).map(w=>({...w,term:w[`${prefix}${terminal}`],base90:w[`${prefix}90`],adjusted:w[`${prefix}90`]*af*cf}));
 const candidates=allCandidates.filter(w=>sets===1||w.cm>=105600);
 const initial=candidates.find(w=>sets*Math.min(w.term,w.adjusted)>=breaker&&(!caps[w.size]||breaker<=caps[w.size]));
 if(!initial)return fail(`No supported conductor through 750 kcmil ${metal} per set satisfies ${breaker} A total OCPD with ${sets} set(s). Increase the set quantity or use an engineered arrangement.`);
 const integrated=integratedDrop(p,candidates,initial,sets,material);if(integrated.error)return fail(integrated.error);
 const w=integrated.wire;

 const usable=Math.min(w.term,w.adjusted);
 const ampacityStatus=allowanceCheckStatus(breaker,sets*usable,'Meets service OCPD ampacity','Below service OCPD ampacity');
 const steps=[
  `Commercial / non-dwelling service design load = ${formatCurrent(load)} A, already including applicable demand, continuous-load and other required allowances. No extra 125% multiplier or dwelling reduction is applied.`,
  `${circuit.label}: ${circuit.ccc} current-carrying conductors per set. Any neutral is assumed full-size; its final load and grounding/bonding adequacy are not calculated.`,
  `${sets} identical set(s), one complete set per separate raceway. Effective ambient = ${ambient}°C (any applicable rooftop adder must already be included; no additional adder is applied). Ambient correction factor = ${af}; CCC adjustment factor = ${cf}.`,
  `${wireLabel(w.size)} ${metal} per ungrounded phase conductor in each set: ${terminal}°C termination ampacity = ${formatCurrent(w.term)} A. Corrected / adjusted 90°C insulation ampacity = ${formatCurrent(w.base90)} × ${af} × ${cf} = ${formatCurrent(w.adjusted)} A.`,
  `Usable phase ampacity per set = min(${formatCurrent(w.term)}, ${formatCurrent(w.adjusted)}) = ${formatCurrent(usable)} A. Combined ampacity = ${sets} × ${formatCurrent(usable)} = ${formatCurrent(sets*usable)} A ≥ ${breaker} A total service OCPD ≥ ${formatCurrent(load)} A design load. No next-size-up exception.`,
  `Service grounded conductor, grounding electrode conductor, main / supply-side bonding jumpers and raceway fill require separate design. No feeder EGC size is assigned to service-entrance conductors.`
 ];
 const warnings=[
  'Customer-owned general commercial / non-dwelling service-entrance phase-conductor ampacity check, ending at a single main service disconnect, using the NEC 2023 reference baseline. No 310.12 dwelling-service 83% reduction is applied.',
  'Provide a completed service load calculation, including required demand and continuous-load treatment. This tool models a 60 A minimum under 230.42(B) / 230.79(D); one-/two-circuit exceptions are excluded. It does not perform Article 220 demand calculations or establish all service/disconnect ratings, number of disconnects, service equipment suitability, available fault current, interrupting ratings or utility requirements.',
  'Review NEC 230.42 and 230.90, 240.4 and 240.6(A), 110.14(C), Table 310.16, 310.15(B)(1)/(C)(1)/(E) and 310.10(G). The conservative model checks both combined termination ampacity and corrected ampacity against the total service OCPD. No next-size-up, service-specific protection exception or 100%-rated equipment treatment is applied.',
  'Service grounding and bonding are separate from feeder equipment grounding. Review 250.24(C)/(D)/(E), 250.66 and 250.102(C), as applicable. Grounded (neutral) conductor, grounding electrode conductor and main / supply-side bonding jumpers are NOT sized here. Do not substitute a Table 250.122 feeder EGC for a service bonding or grounding conductor.',
  'Any neutral is assumed full-size only for the modeled arrangement, not recommended as a final neutral size. Verify neutral load, nonlinear/harmonic current, minimum grounded-conductor requirements and parallel neutral rules separately. Three-phase 4-wire conservatively counts four CCC (80% adjustment). Split-phase excludes the neutral only when it carries imbalance under applicable NEC conditions; two phases plus neutral from a three-phase wye system are not modeled.',
  'Each complete set occupies a separate raceway; sets sharing raceways, multiple circuits, unequal parallel arrangements and reduced neutrals are not modeled. Conduit size and fill are not calculated. Insulation is 90°C THHN/THWN-2; verify wet-location listing and actual installation conditions.',
  'Parallel ungrounded and neutral conductors have a general 1/0 AWG minimum. Corresponding conductors must match length, material, circular-mil area, insulation and termination method; verify matching raceway electrical characteristics and equipment listed for parallel terminations.',
  'Maximum modeled total service OCPD is 4000 A and maximum individual phase conductor is 750 kcmil. Utility-owned conductors and load-side feeders are outside this service-entrance module. No overhead/open-air ampacity, underground thermal analysis, voltage drop or specialized service arrangement is designed. Obtain qualified review of the adopted code, local amendments and utility requirements before use.'
 ];
 if(terminal===90)warnings.unshift('90°C equipment rating condition: the selected rating is a design assumption, not verified equipment eligibility. All connected equipment and terminations at both ends must be listed and identified for 90°C ampacity under NEC 110.14(C). A 90°C wire or lug marking alone is insufficient; the lowest connected rating governs.');
 if(material==='aluminum')warnings.push('Aluminum ampacities are table-based, not a stocked-product recommendation. Verify listed AA-8000-series THHN/THWN-2, product availability, compatible AL-rated equipment and manufacturer preparation/torque instructions.');
 if(integrated.enabled){
  steps.push(...integrated.steps);
  warnings.push(...integrated.warnings);
  const scopeIndex=warnings.findIndex(x=>x.startsWith('Maximum modeled total service OCPD'));
  warnings[scopeIndex]=warnings[scopeIndex].replace('underground thermal analysis, voltage drop or specialized service arrangement','underground thermal analysis or specialized service arrangement');
 }
 return result([
  {label:material==='aluminum'?'Aluminum service phase conductor per set':'Copper service phase conductor per set',value:wireLabel(w.size),...ampacityStatus},
  {label:'Total service OCPD',value:breaker,unit:'A'},
  {...currentResult('Combined phase ampacity',sets*usable),...ampacityStatus},
  {...currentResult('Usable phase ampacity per set',usable),...allowanceCheckStatus(breaker,sets*usable,'Meets per-set share of service OCPD','Below per-set share of service OCPD')},
  {label:'Separate conductor sets',value:sets},
  currentResult('Design load',load),
  {label:'CCC per raceway',value:circuit.ccc},
  {label:'Neutral design',value:'Separate review required'},
  {label:'Grounding / bonding / conduit',value:'Not calculated'},
  ...integrated.results
 ],steps,warnings,[...integrated.sources,...refs.conductor,necReference('230.42(A)/(B) and 230.79(D): modeled general-service conductor/disconnect minimums', 'service', true),necReference('230.90: service overcurrent protection', 'service'),necReference('250.24(C)/(D)/(E), 250.66 and 250.102(C): service grounding and bonding; separate design required', 'grounding'),necReference('110.14(C): equipment termination temperature limitations', 'terminations', true)]);
}
// Keep the ordinary operation order for stable stored/displayed precision, but
// avoid accidental intermediate overflow when the final formula is representable.
const numericRangeError='The calculation exceeds the supported numeric range. Reduce the input magnitudes.';
const positiveFinite=n=>Number.isFinite(n)&&n>0;
const windingCurrent=(kva,voltage,factor)=>{
 const direct=kva*1000/(factor*voltage);
 return positiveFinite(direct)?direct:(kva/voltage)/factor*1000;
};
export function transformer(p){
 if(!hasNumbers(p,['kva','primary','secondary']))return fail('Enter finite numeric values for kVA and both voltages.');
 const kva=Number(p.kva),primary=Number(p.primary),secondary=Number(p.secondary);
 if(Math.min(kva,primary,secondary)<=0)return fail('Enter positive kVA and primary/secondary voltages.');
 const checks=[checkVoltageInput(p,'primary','primaryPhase',true),checkVoltageInput(p,'secondary','secondaryPhase',true)];
 if(checks.some(c=>c.error))return fail(checks.find(c=>c.error).error);
 try{
  const f1=phaseFactor(p.primaryPhase),f2=phaseFactor(p.secondaryPhase),ip=windingCurrent(kva,primary,f1),is=windingCurrent(kva,secondary,f2);
  if(!positiveFinite(ip)||!positiveFinite(is))return fail(numericRangeError);
  return result([currentResult('Primary full-load current',ip),currentResult('Secondary full-load current',is)],
   [`Primary I = ${kva} × 1,000 / (${phaseFactorLabel(p.primaryPhase)} × ${primary}).`,`Secondary I = ${kva} × 1,000 / (${phaseFactorLabel(p.secondaryPhase)} × ${secondary}).`],
   [...checks.flatMap(c=>c.warnings),...(Number(p.primaryPhase)!==Number(p.secondaryPhase)?['Primary and secondary phases differ. An ordinary transformer does not convert single-phase to three-phase; these are independent current relationships only. Verify the actual equipment arrangement.']:[]),
    'Use line-to-line voltage for three-phase and full-winding voltage for single-phase (240 V for a 120/240 V winding).',
    'Ideal nameplate full-load current only. No efficiency/inrush correction, OCPD recommendation or transformer-secondary conductor sizing. NEC 450.3, 240.21(C), 250.30 and manufacturer instructions require separate checks.'],[...refs.transformer,...voltageSources]);
 }catch(e){return fail(e.message);}
}
export function power(p){
 if(!hasNumbers(p,['pf',p?.mode==='wattsToVA'?'watts':'va']))return fail('Enter finite numeric values for power and power factor.');
 const pf=Number(p.pf),v=Number(p.mode==='wattsToVA'?p.watts:p.va);
 if(pf<=0||pf>1||v<0)return fail('Enter nonnegative power and a power factor greater than 0 and no more than 1.');
 if(!['wattsToVA','vaToWatts'].includes(p.mode))return fail('Choose a conversion.');
 const watts=p.mode==='wattsToVA'?v:v*pf,va=p.mode==='wattsToVA'?v/pf:v;
 if(!Number.isFinite(watts)||!Number.isFinite(va)||(v>0&&(watts===0||va===0)))return fail(numericRangeError);
 return result([{label:'Real power',value:fmt(watts),unit:'W'},{label:'Apparent power',value:fmt(va),unit:'VA'},{label:'Power factor',value:pf}],['P (W) = S (VA) × PF.','S (VA) = P (W) / PF.'],['Use true power factor for the load. VA is not interchangeable with watts unless PF = 1.'],refs.power);
}
export function amps(p){
 if(!['wattsToAmps','ampsToWatts','vaToAmps','ampsToVA'].includes(p?.mode))return fail('Choose a conversion.');
 const apparent=p.mode==='vaToAmps'||p.mode==='ampsToVA';
 if(!hasNumbers(p,apparent?['value','voltage']:['value','voltage','pf']))return fail(apparent?'Enter finite numeric values for apparent power/current and voltage.':'Enter finite numeric values for power/current, voltage and power factor.');
 const v=Number(p.value),voltage=Number(p.voltage),pf=apparent?1:Number(p.pf);
 if(v<0||voltage<=0||(!apparent&&(pf<=0||pf>1)))return fail(apparent?'Enter nonnegative VA/amps and positive voltage.':'Enter nonnegative watts/amps, positive voltage and PF greater than 0 and no more than 1.');
 const voltageCheck=checkVoltageInput(p);if(voltageCheck.error)return fail(voltageCheck.error);
 try{
  const f=phaseFactor(p.phase);
  if(apparent){
   // Apparent power uses voltage and line current directly. Hidden/stale PF
   // never changes this calculation or implies a real-power output.
   const toAmps=p.mode==='vaToAmps';
   let a=v===0?0:toAmps?v/(f*voltage):v;
   if(v>0&&!positiveFinite(a))a=(v/voltage)/f;
   let va=v===0?0:toAmps?v:f*voltage*v;
   if(v>0&&!positiveFinite(va))va=(voltage*v)*f;
   if(![a,va].every(Number.isFinite)||(v>0&&[a,va].some(n=>n<=0)))return fail(numericRangeError);
   return result([{...currentResult('Current',a),rawValue:a},{label:'Apparent power',value:fmt(va),rawValue:va,unit:'VA'}],
    [`S (VA) = ${Number(p.phase)===3?'√3 × ':''}V × I.`,`I = S / (${phaseFactorLabel(p.phase)} × ${voltage}).`],
    [...voltageCheck.warnings,'Balanced three-phase load; use line-to-line voltage for three-phase. For single-phase, use the voltage supplied to the equipment.',
     ...(voltage>1000?['Medium-voltage input uses the same ideal steady-state power relationship. This does not verify equipment voltage ratings, conductor insulation, ampacity, protection or installation.']:[]),
     'Apparent power converts directly to/from current without power factor. Real power in watts is not determined. Not a branch-circuit sizing result.'],[...refs.power,...voltageSources]);
  }
  let a=p.mode==='wattsToAmps'?v/(f*voltage*pf):v;
  if(v>0&&!positiveFinite(a))a=(v/voltage)/f/pf;
  let va=f*voltage*a;
  if(!Number.isFinite(va)||(v>0&&va===0))va=p.mode==='wattsToAmps'?v/pf:(voltage*a)*f;
  const w=p.mode==='wattsToAmps'?v:va*pf;
  if(![a,w,va].every(Number.isFinite)||(v>0&&[a,w,va].some(n=>n<=0)))return fail(numericRangeError);
  return result([currentResult('Current',a),{label:'Real input power',value:fmt(w),unit:'W'},{label:'Apparent power',value:fmt(va),unit:'VA'}],
   [`P = ${Number(p.phase)===3?'√3 × ':''}V × I × PF.`,`I = P / (${phaseFactorLabel(p.phase)} × ${voltage} × ${pf}).`],
   [...voltageCheck.warnings,'Balanced three-phase load; use line-to-line voltage for three-phase. For single-phase, use the voltage supplied to the equipment.',
    ...(voltage>1000?['Medium-voltage input uses the same ideal steady-state power relationship. This does not verify equipment voltage ratings, conductor insulation, ampacity, protection or installation.']:[]),
    'Electrical input watts only; mechanical output requires an efficiency adjustment. Not a branch-circuit sizing result.'],[...refs.power,...voltageSources]);
 }catch(e){return fail(e.message);}
}
export function conduit(p){if(!p||!Array.isArray(p.rows)||!p.rows.length)return fail('Add at least one conductor row.');let count=0,areaUnits=0;for(const r of p.rows){if(!hasNumbers(r,['count']))return fail('Enter a finite whole-number count in each conductor row.');const w=wire(r.size),n=Number(r.count);if(!w||!Number.isInteger(n)||n<0||n>1000)return fail('Use supported conductor sizes and whole-number counts from 0–1,000.');count+=n;areaUnits+=Math.round(w.area*10000)*n;}const area=areaUnits/10000;if(!count)return fail('At least one conductor is required.');const fraction=count===1?.53:count===2?.31:.4;const minimum=conduitSizes.find(c=>area<=c[`fill${Math.round(fraction*100)}`]);const c=p.trade==='auto'?minimum:conduitSizes.find(c=>c.size===p.trade);if(!c)return fail('Required EMT size exceeds the supported 4-inch range.');const percent=area/c.area*100,pass=area<=c[`fill${Math.round(fraction*100)}`],fillStatus=allowanceCheckStatus(area,c[`fill${Math.round(fraction*100)}`],'Within published fill allowance','Exceeds published fill allowance'),minimumStatus=minimum?allowanceCheckStatus(area,minimum[`fill${Math.round(fraction*100)}`],'Within published fill allowance','Exceeds published fill allowance'):{status:'red',statusText:'Exceeds supported fill range'};return result([{label:'Selected EMT',value:`${c.size} in.`,...fillStatus},{label:'Actual fill',value:fmt(percent),unit:'%',...fillStatus},{label:'Permitted fill',value:fraction*100,unit:'%'},{label:'Fill check',value:pass?'Within fill limit':'Exceeds fill limit',...fillStatus},{label:'Minimum EMT',value:minimum?`${minimum.size} in.`:'Over 4 in.',...minimumStatus},{label:'Conductor area',value:fmt(area),unit:'in²'}],[`${count} total conductors, including EGCs: ${area.toFixed(4)} in².`,`Chapter 9 Table 1: ${count===1?'one conductor = 53%':count===2?'two conductors = 31%':'more than two conductors = 40%'}.`,`Published Table 4 EMT ${fraction*100}% allowance = ${c[`fill${Math.round(fraction*100)}`].toFixed(3)} in²; total internal area = ${c.area} in². Use the published allowance rather than multiplying rounded total area.`],['NEC Chapter 9 Tables 1, 4 and 5 method. Modeled Table 5 areas and Table 4 EMT allowances checked against published NEC 2023. Insulated copper THHN/THWN-2 only; count neutrals and insulated grounds for physical fill.','No cables, bare grounds, compact conductors, mixed insulation types or ≤24-inch nipple exceptions. Fill compliance does not establish pulling feasibility, derating, bend radius or jam clearance.'],refs.conduit);}
// NEC 2023 Chapter 9 Table 9, 75°C / 60 Hz; Ω per 1,000 ft.
// [X PVC/aluminum conduit, X steel, R uncoated Cu PVC, R Cu steel,
//  R Al PVC, R Al steel, R Cu aluminum conduit, R Al aluminum conduit].
// Table 9 explicitly shares X for PVC/aluminum; their R columns are distinct.
// No interpolation: #14 aluminum and 700 kcmil have no supported table row.
export const dropImpedance={
 '14':[.058,.073,3.1,3.1,null,null,3.1,null],'12':[.054,.068,2,2,3.2,3.2,2,3.2],
 '10':[.050,.063,1.2,1.2,2,2,1.2,2],'8':[.052,.065,.78,.78,1.3,1.3,0.78,1.3],
 '6':[.051,.064,.49,.49,.81,.81,0.49,0.81],'4':[.048,.060,.31,.31,.51,.51,0.31,0.51],
 '3':[.047,.059,.25,.25,.40,.40,0.25,0.41],'2':[.045,.057,.19,.20,.32,.32,0.2,0.32],
 '1':[.046,.057,.15,.16,.25,.25,0.16,0.26],'1/0':[.044,.055,.12,.12,.20,.20,0.13,0.21],
 '2/0':[.043,.054,.10,.10,.16,.16,0.1,0.16],'3/0':[.042,.052,.077,.079,.13,.13,0.082,0.13],
 '4/0':[.041,.051,.062,.063,.10,.10,0.067,0.11],'250':[.041,.052,.052,.054,.085,.086,0.057,0.09],
 '300':[.041,.051,.044,.045,.071,.072,0.049,0.076],'350':[.040,.050,.038,.039,.061,.063,0.043,0.066],
 '400':[.040,.049,.033,.035,.054,.055,0.038,0.059],'500':[.039,.048,.027,.029,.043,.045,0.032,0.048],
 '600':[.039,.048,.023,.025,.036,.038,0.028,0.041],'750':[.038,.048,.019,.021,.029,.031,0.024,0.034]
};
export function migrateDropState(input){const state={pf:1,raceway:'steel',parallelSets:1,impedanceMode:'table9',resistance:'',reactance:'',impedanceBasis:'',...input};delete state.target;return state;}
export function dropStatus(percent){return percent<=3?'green':percent<5?'orange':'red';}
export function drop(p){
 if(p&&typeof p==='object')p={pf:1,raceway:'steel',parallelSets:1,impedanceMode:'table9',...p};
 if(!hasNumbers(p,['length','current','voltage','pf']))return fail('Enter finite numeric values for length, current, starting voltage and power factor.');
 if(!hasNumbers(p,['parallelSets'])||!Number.isInteger(Number(p.parallelSets))||Number(p.parallelSets)<1||Number(p.parallelSets)>20)return fail('Enter 1–20 identical parallel sets, with one complete circuit set in each separate matching raceway.');
 if(!['table9','mvPreset','manual'].includes(p.impedanceMode))return fail('Choose NEC Table 9, an MV cable preset, or manually entered series impedance.');
 const manual=p.impedanceMode==='manual',preset=p.impedanceMode==='mvPreset',L=Number(p.length),I=Number(p.current),V=Number(p.voltage),pf=Number(p.pf),sets=Number(p.parallelSets);
 if(L<0||I<0||V<=0||pf<=0||pf>1)return fail('Use nonnegative one-way length/current, positive starting voltage, and power factor greater than 0 and at most 1.');
 const voltageCheck=checkVoltageInput(p);if(voltageCheck.error)return fail(voltageCheck.error);
 let R,X,impedanceStep,mv;
 if(manual){
  if(!hasNumbers(p,['resistance','reactance']))return fail('Enter actual series resistance R and inductive reactance X in Ω/1,000 ft. Manual impedance has no assumed defaults.');
  R=Number(p.resistance);X=Number(p.reactance);
  if(R<0||X<0||(R===0&&X===0))return fail('Manual R and X must be finite and nonnegative, with at least one greater than zero. Enter series inductive reactance, not capacitive reactance.');
  if(p.impedanceBasis!==undefined&&typeof p.impedanceBasis!=='string')return fail('Enter the impedance source and design basis as text.');
  const basis=p.impedanceBasis?.trim();
  impedanceStep=`User-entered series impedance: R = ${R} and X = ${X} Ω/1000 ft for one circuit set. ${basis?`Source / design basis: ${basis}.`:'No source / design basis recorded.'} Values are supplied by the designer and are not verified NEC Table 9 coefficients.`;
 }else if(preset){
  mv=mvPresetImpedance(p);if(mv.error)return fail(mv.error);
  R=mv.r;X=mv.x;
  impedanceStep=`Manufacturer-reference MV preset: R = ${R} and X = ${X} Ω/1000 ft per phase for one balanced three-phase circuit. ${mv.basis} These are cable reference data, not universal MV-90/MV-105 coefficients.`;
 }else{
  const selectedWire=wire(p.size);
  if(!selectedWire)return fail('Use a supported conductor size for the NEC Table 9 model.');
  if(sets>1&&selectedWire.cm<105600)return fail('Parallel conductors must be 1/0 AWG or larger for this normal-power estimate. Smaller-conductor parallel exceptions are not supported.');
  if(V>600)return fail('This impedance-table model supports starting voltage up to 600 V only. Select manual series impedance and enter applicable R/X data above 600 V.');
  if(!['copper','aluminum'].includes(p.material))return fail('Choose copper or aluminum.');
  if(!['pvc','steel','aluminum'].includes(p.raceway))return fail('Choose the actual PVC, steel or aluminum raceway for the impedance estimate.');
  const data=dropImpedance[String(p.size)],steel=p.raceway==='steel',aluminumRaceway=p.raceway==='aluminum';
  R=data?.[aluminumRaceway?(p.material==='aluminum'?7:6):(p.material==='aluminum'?4:2)+(steel?1:0)];X=data?.[steel?1:0];
  if(R==null)return fail('No supported impedance table data for this size/material. Choose a supported conductor size; 700 kcmil and #14 aluminum require a separate engineering calculation.');
  impedanceStep=`NEC 2023 Chapter 9 Table 9: R = ${R} and X = ${X} Ω/1000 ft; ${p.material}, ${steel?'Steel':aluminumRaceway?'Aluminum':'PVC'} raceway; 75°C conductor, 60 Hz. All modeled R/X values checked against the published table.`;
 }
 try{
  // Each R/X pair describes one set. Divide total current exactly once, with
  // no second division of entered/table impedance and no PF current inflation.
  const perSetCurrent=I/sets,f=Number(p.phase)===3?phaseFactor(p.phase):phaseFactor(p.phase)*2,sinPhi=Math.sqrt(Math.max(0,1-pf*pf)),ze=R*pf+X*sinPhi,vd=f*perSetCurrent*L/1000*ze,pct=100*vd/V;
  if(![perSetCurrent,ze,vd,pct].every(Number.isFinite)||(I>0&&L>0&&ze>0&&(vd===0||pct===0)))return fail(numericRangeError);
  if(vd>V)return fail('Estimated drop exceeds starting voltage. This approximation is outside its useful range; review length, current, conductor size and the circuit model.');
  const status=dropStatus(pct),meaning=status==='green'?'At or below 3%':status==='orange'?'Above 3% and below 5%':'At or above 5%';
  return result([
   {label:'Percentage voltage drop',value:fmt(pct),unit:'%',status},
   {label:'Estimated voltage drop',value:fmt(vd),unit:'V'},
   {label:'Estimated voltage at end of run',value:fmt(V-vd),unit:'V'},
   {label:'Voltage-drop guidance',value:meaning,status},
   {label:'Parallel sets',value:sets},
   currentResult('Total actual load current',I,I),
   currentResult('Current per set',perSetCurrent,perSetCurrent),
   ...(manual?[{label:'Impedance basis',value:'User-entered series R/X; not independently verified'}]:preset?[{label:'Cable preset',value:mv.family.label},{label:'Reference family',value:mv.family.reference},{label:'Calculation temperature',value:mv.temperature,unit:'°C'},{label:'Series resistance R',value:R,displayValue:String(R),unit:'Ω/1,000 ft'},{label:'Series reactance X',value:X,displayValue:String(X),unit:'Ω/1,000 ft'},{label:'Impedance basis',value:mv.family.model},{label:'Reference qualification',value:mv.qualification},...(mv.family.assumptionNote?[{label:'Engineering assumptions',value:mv.family.assumptionNote}]:[]),...(mv.family.insulationLevel?[{label:'Cable insulation level',value:mv.family.insulationLevel}]:[]),...(mv.family.applicationNote?[{label:'Cable application basis',value:mv.family.applicationNote}]:[]),...(mv.temperature!==mv.family.temperature?[{label:'Temperature data',value:mv.temperatureBasis}]:[])]:[])
  ],[
   `VD = ${Number(p.phase)===3?'√3':'2'} × I × L / 1000 × (R × PF + X × √(1 − PF²)).`,
   `I = ${formatCurrent(perSetCurrent)} A per set = ${formatCurrent(I)} A total actual load current / ${sets} identical set(s); L = ${L} ft one-way; starting voltage = ${V} V; lagging PF = ${pf}.`,
   impedanceStep,
   `VD = ${fmt(vd)} V; percent = 100 × VD / ${V}. Status uses the unrounded percentage.`,
   'Color guide: green ≤3%; orange >3% and <5%; red ≥5%. Red at exactly 5% marks the selected caution threshold, not proof of a code violation.'
  ],[...voltageCheck.warnings,
   preset?'MV preset assumptions: balanced three-phase, one circuit, 60 Hz, the selected cable construction and manufacturer arrangement. MV-90 and MV-105 identify maximum conductor temperature ratings; the separate calculation temperature is not inferred from the rating. Other manufacturers, construction, metallic enclosures, spacing or shield bonding may need different impedance.':manual?'Manual impedance is a first-order, series-only steady-state AC estimate. For balanced three-phase, enter the applicable per-phase positive-sequence series R/X of one circuit set; for single-phase, use per-conductor R/X for equal outgoing and return paths. Values must match actual cable construction, operating temperature, frequency, conductor arrangement and shield/sheath bonding. Do not enter loop totals or capacitive reactance.':'AC estimate assumes sinusoidal current, lagging displacement PF, equal outgoing/return conductors for single-phase or balanced three-phase. Table 9 models three single conductors in conduit; single-phase use is an approximation. Leading PF, harmonics and other geometries are not modeled.',
   ...(preset?[...(mv.family.applicationNote?['MV preset scope: '+mv.family.applicationNote]:[]),'MV preset scope: series-only steady-state estimate; shunt capacitance and charging current are not modeled. Long or lightly loaded MV runs may need a full cable-system model. Cable voltage class is only a numerical ceiling here: insulation level, grounding, accessories, ampacity and installation suitability remain separate design checks.']:[]),
   ...(manual?['Manual mode does not model shunt capacitance/charging current, unequal phase loading, leading power factor, harmonics, transients or long-line effects. Use a complete system model where these matter, especially for long medium-voltage cable runs. The entered impedance is a design input, not proof of equipment or installation suitability.']:[]),
   ...(sets>1?[manual?'Parallel sets assume equal current sharing and identical per-set series impedance; enter R/X for ONE set and total current across all sets. Cable size, ampacity, conductor matching, mutual effects, spacing, terminations and parallel-installation eligibility are not checked in manual mode.':'Parallel sets assume equal current sharing, with one complete circuit set in each separate matching raceway. Corresponding conductors must have identical length, material, size, insulation and termination method, and identical resistance/reactance in each raceway. Multiple sets sharing a raceway, unequal sets and small-conductor exceptions are not modeled. Verify equipment listed for parallel terminations and the adopted NEC 310.10(G) requirements.']:[]),
   'NEC general-circuit 3% branch / 5% combined feeder-and-branch guidance is generally informational; some applications impose mandatory limits. Verify adopted code and local amendments.',
   '2021 IECC C405.10 limits combined customer-owned service, feeder and branch-circuit voltage drop to not more than 5% where applicable. This single segment cannot establish combined-path compliance. Verify adopted IECC edition and applicability.',
   'Voltage drop does not verify ampacity, OCPD, grounding, motor starting or equipment voltage tolerance.'
  ],[...refs.drop,...(preset?[mv.source,...(mv.family.applicationSource?[mv.family.applicationSource]:[])]:manual?[{label:'Engineering relationship: steady-state series R/X voltage-drop approximation; manual coefficients are supplied by the designer, not verified NEC table data',url:'https://www.electrical-installation.org/enwiki/Calculation_of_voltage_drop_in_steady_load_conditions',category:'Physics'}]:[necReference('Chapter 9 Table 9: modeled AC resistance and reactance coefficients; geometry assumptions remain explicit', 'impedance', true)]),{label:'2021 IECC C405.10: combined voltage-drop limit',url:'https://codes.iccsafe.org/content/IECC2021V3.0/chapter-4-ce-commercial-energy-efficiency'},...voltageSources]);
 }catch(e){return fail(e.message);}
}
export function box(p){if(p&&typeof p==='object')p={terminalBlocks:0,...p};if(!hasNumbers(p,['conductors','grounds','yokes','studs','terminalBlocks','volume']))return fail('Enter finite numeric values for every box count and volume.');const w=wire(p.size),n=Number(p.conductors),g=Number(p.grounds),y=Number(p.yokes),s=Number(p.studs),t=Number(p.terminalBlocks),v=Number(p.volume);if(!w?.volume)return fail('Box fill supports #14 through #6 AWG only.');if(s>2)return fail('Enter 0–2 support fitting types: luminaire stud and/or hickey.');if(!valid(n,g,y,s,t,v)||![n,g,y,s,t].every(x=>Number.isInteger(x)&&x>=0)||v<0)return fail('Enter nonnegative whole-number counts and a nonnegative box volume.');const groundUnits=g===0?0:g<=4?1:1+(g-4)*.25,clampUnits=p.clamps?1:0,supportUnits=s,units=n+groundUnits+clampUnits+2*y+supportUnits+t,required=units*w.volume;if(!units)return fail('Enter at least one box-fill item.');const volumeStatus=allowanceCheckStatus(required,v,'Within available box volume','Exceeds available box volume');return result([{label:'Required box volume',value:fmt(required),unit:'in³',...volumeStatus},{label:'Available box volume',value:v,unit:'in³',...volumeStatus},{label:'Volume check',value:v>=required?'Sufficient volume':'Insufficient volume',...volumeStatus},{label:'Volume allowances',value:fmt(units)},{label:'Volume per allowance',value:w.volume,unit:'in³'}],[`${n} insulated conductor allowances + ${fmt(groundUnits)} grounding allowances + ${clampUnits} clamp allowance + ${2*y} device-yoke allowances + ${supportUnits} support allowance + ${t} terminal-block assembly allowance(s) = ${fmt(units)}.`,`${fmt(units)} × ${w.volume} in³ per ${w.size} AWG = ${fmt(required)} in³.`,`Grounds: first 1–4 = one allowance; each additional = ¼ allowance. Each terminal-block assembly adds one allowance based on the largest conductor terminated; this uniform-size model uses the selected conductor size.`],['NEC 2023 314.16(B)(1)–(6) and Table 314.16(B)(1). Uniform conductor size only. Count conductors entering and terminating or passing through; pigtails wholly within the box normally do not count.','Each standard device yoke counts as two allowances. One or more internal clamps count once; each support fitting type (stud or hickey) counts once, up to two allowances. Ground allowance assumes entering EGCs/bonding jumpers of the selected size. Every terminal-block assembly must be counted, and the selected uniform conductor size must include its largest terminated conductor.','Mixed sizes, long unbroken loops, larger/multiple-gang devices, barriers, luminaire exceptions and conductors larger than #6 require a separate review. Use the marked usable box/extension volume; do not infer volume from outside dimensions.'],refs.box);}
