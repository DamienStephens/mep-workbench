import { formatCurrent, currentResult } from './current-display.js?v=2.6.0';
import { checkVoltageInput, voltageSources } from './voltage.js?v=2.6.0';
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
// Standard noncompact THHN/THWN-2: NFPA 2017 Chapter 9 Table 5; final 2023 dimensions remain unverified.
const areas=[.0097,.0133,.0211,.0366,.0507,.0824,.0973,.1158,.1562,.1855,.2223,.2679,.3237,.3970,.4608,.5242,.5863,.7073,.8676,.9887,1.0496];
const cms=[4110,6530,10380,16510,26240,41740,52620,66360,83690,105600,133100,167800,211600,250000,300000,350000,400000,500000,600000,700000,750000];
export const conductors=sizes.map((size,i)=>({size,cu60:a60[i],cu75:a75[i],cu90:a90[i],al60:al60[i],al75:al75[i],al90:al90[i],area:areas[i],cm:cms[i],volume:({14:2,12:2.25,10:2.5,8:3,6:5})[size]}));
export const conduitSizes=['1/2','3/4','1','1-1/4','1-1/2','2','2-1/2','3','3-1/2','4'].map((size,i)=>({size,area:[.304,.533,.864,1.496,2.036,3.356,5.858,8.846,11.545,14.753][i]}));
export const standardOcpdRatings=[10,15,20,25,30,35,40,45,50,60,70,80,90,100,110,125,150,175,200,225,250,300,350,400,450,500,600,700,800,1000,1200,1600,2000,2500,3000,4000];
const standard=standardOcpdRatings;
const nfpa={label:'NFPA 70 / NEC (2023): adopted edition and local amendments must be verified',url:'https://www.nfpa.org/codes-and-standards/nfpa-70-standard-development/70'};
const schneider={label:'Schneider Electric: conductor ampacity and temperature limitations',url:'https://ckm-content.se.com/ckmContent/sfc/servlet.shepherd/document/download/0691H00000EDoMRQA1'};
const refs={conductor:[nfpa,schneider,{label:'Schneider Electric: a 90°C lug rating alone does not qualify a breaker for 90°C ampacity',url:'https://www.se.com/us/en/faqs/FA115128/'},{label:'Eaton: equipment listing and termination temperature limits, handbook section 7.7.6 (2017; verify adopted edition)',url:'https://www.eaton.com/content/dam/eaton/markets/machinebuilding/protect-personnel-assets-and-machine-reliability/documents/documents-english-language/bus-ele-br-3002-spd-2017_safe.pdf'},{label:'HELUKABEL: NEC 2023 Cu/Al ampacity and correction tables (Table 310.16: copper page 1, aluminum page 3)',url:'https://www.helu.com/helu/us/publications/technical-documents/allowable-ampacity-tables.pdf#page=3'}],transformer:[nfpa],power:[{label:'Schneider Electric Electrical Installation Guide: power and current',url:'https://www.electrical-installation.org/enwiki/Power_loading_of_an_installation'}],conduit:[nfpa,{label:'NFPA 2017 original Table 5: THHN dimensions (2023 final not independently verified)',url:'https://cms7files.revize.com/johnsontn/document_center/Development%20Services/Codes/Resource%20Docs/2017-NEC-Code-2.pdf#page=688'},{label:'Wheatland: EMT dimensions, p4',url:'https://www.wheatland.com/wp-content/uploads/2018/03/EMT-and-Conduit-Brochure.pdf#page=4'},{label:'Service Wire: conduit-fill percentage method',url:'https://www.servicewire.com/ServiceWire/Resources/Customer-QA/Conduit-Fill.htm'}],drop:[nfpa,{label:'Schneider: informational 3% branch / 5% combined voltage-drop guidance',url:'https://productinfo.se.com/na-std-ref/5c0fee4b347bdf0001de4d55/Conductor%20Ampacity%20Tables/English/Data%20Bulletin%20-%20Conductor%20Ampacity%20Tables%20(bookmap)_0000264293.ditamap/$/NEC210.19ConductorsMinimumAmpacityA-F20BBAC1'}],box:[nfpa,{label:'NFPA code-development record: conductor volume allowances and existing yoke rule',url:'https://docinfofiles.nfpa.org/files/AboutTheCodes/70/70_A2025_NEC_P08_FD_PIResponses.pdf'},{label:'NFPA code-development record: grounding conductor box-fill allowance',url:'https://docinfofiles.nfpa.org/files/AboutTheCodes/70/70_A2022_NEC_P09_FD_PIReport_rev_1029.pdf'}]};
const fmt=n=>Number(n.toFixed(3));
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
 if(p.configuration==='split-phase-3-wire'&&V!==240)return {error:'The 120/240 V split-phase arrangement uses 240 V line-to-line for a balanced full-circuit drop estimate. Individual 120 V leg / neutral drop needs a separate unbalanced analysis.'};
 const factor=phase===3?Math.sqrt(3):2,K=material==='aluminum'?21.2:12.9;
 const dropAt=w=>factor*K*L*(I/sets)/w.cm;
 const selected=candidates.find(w=>w.cm>=initial.cm&&100*dropAt(w)/V<=target);
 if(!selected)return {error:'No supported conductor through 750 kcmil per set meets both the ampacity/OCPD requirements and this voltage-drop target. Revise the length, set quantity or design; no passing size or conduit is selected.'};
 const vd=dropAt(selected),pct=100*vd/V;
 return {wire:selected,enabled:true,results:[
  {label:'Initial ampacity conductor per set',value:wireLabel(initial.size)},
  currentResult('Voltage-drop current',I,I),
  {label:'Estimated voltage drop',value:fmt(vd),unit:'V'},
  {label:'Estimated drop',value:fmt(pct),unit:'%'},
  {label:'Voltage-drop target',value:target,unit:'%'},
  {label:'Target check',value:'Within target'},
  {label:'Sizing basis',value:selected.cm>initial.cm?'Voltage drop increased conductor size':'Ampacity / OCPD controls'}
 ],steps:[`Initial ampacity/OCPD selection = ${wireLabel(initial.size)} per set. The final conductor is the smallest supported size satisfying both checks with the same ${sets} set(s).`,`Drop current = ${formatCurrent(I)} A actual total operating current, separately entered from the ${ocpdBased?currentLimit:formatCurrent(currentLimit)} A ${basis}. Per-set current = ${formatCurrent(I)} / ${sets} = ${formatCurrent(I/sets)} A.`,`Resistance-method VD = ${phase===3?'√3':'2'} × ${K} × ${L} ft one-way × ${formatCurrent(I/sets)} A / ${selected.cm} CM = ${fmt(vd)} V (${fmt(pct)}% of ${V} V), checked against ${target}% without rounding.`],warnings:[...check.warnings,'Voltage-drop sizing is a resistance-only estimate using approximate 75°C K values; it ignores AC reactance, power factor, raceway effects, harmonic currents and actual conductor temperature. Balanced loading and equal sharing between parallel sets are assumed.','This checks only the entered segment. Typical 3% branch / 5% combined guidance is informational for general circuits; mandatory application-specific limits and the entire upstream/downstream path require separate review.',...(p.configuration==='split-phase-3-wire'?['Split-phase drop assumes balanced 240 V line-to-line loading; unequal 120 V loads and neutral voltage drop are not evaluated.']:[])],sources:[...refs.drop,...voltageSources]};
}
const egcUpsizeSource={label:'NFPA 2023 development record: 250.122(B) proportional circular-mil increase, page 44; verify adopted text',url:'https://www.nfpa.org/api/files?path=%2Ffiles%2FAboutTheCodes%2F70%2F70_A2022_NEC_P05_SD_SRStatements.pdf#page=44'};
export function conductor(p){
 if(!hasNumbers(p,['ocpd','terminal','ambient','parallelSets']))return fail('Enter a finite number in every required field, including the selected OCPD rating.');
 if(['continuous','ccc','physicalCount'].some(k=>p[k]!==undefined))return fail('Use an explicit OCPD rating, a circuit configuration and parallel-set quantity. Legacy continuous-load and manual conductor counts are not supported.');
 const terminal=Number(p.terminal),ambient=Number(p.ambient),sets=Number(p.parallelSets),ocpd=Number(p.ocpd);
 if(![60,75,90].includes(terminal))return fail('Select 60°C, 75°C or verified 90°C equipment terminations.');
 if(terminal===90&&p.terminal90Confirmed!==true&&p.terminal90Confirmed!=='true')return fail('90°C requires explicit verification that all connected equipment and terminations are listed and identified for 90°C ampacity under NEC 110.14(C). A 90°C wire or lug marking alone is insufficient.');
 if(!Number.isInteger(sets)||sets<1||sets>20)return fail('Enter 1–20 identical parallel sets, each in a separate EMT raceway.');
 const circuit=Object.hasOwn(circuitConfigurations,p.configuration)?circuitConfigurations[p.configuration]:null;
 if(!circuit)return fail('Choose the circuit configuration so phase, neutral and current-carrying counts can be derived.');
 const material=p.material??'copper';
 if(!['copper','aluminum'].includes(material))return fail('Choose copper or aluminum THHN/THWN-2 conductors.');
 const af=ambient90(ambient);if(af===null)return fail('Supported ambient range is −10°C to 80°C.');
 const cf=adjustment(circuit.ccc),breaker=ocpd;
 if(!breaker||!standard.includes(breaker))return fail('Choose an explicit listed standard OCPD rating from 10–4000 A; automatic selection is not supported. Maximum modeled TOTAL OCPD is 4000 A, including parallel sets.');
 const metal=material==='aluminum'?'Al':'Cu',prefix=material==='aluminum'?'al':'cu',caps=material==='aluminum'?{12:15,10:25}:{14:15,12:20,10:30};
 const candidates=conductors.filter(w=>w[`${prefix}90`]!==null&&(sets===1||w.cm>=105600)).map(w=>({...w,term:w[`${prefix}${terminal}`],base90:w[`${prefix}90`],adjusted:w[`${prefix}90`]*af*cf}));
 const initial=candidates.find(w=>sets*Math.min(w.term,w.adjusted)>=breaker&&(!caps[w.size]||breaker<=caps[w.size]));
 if(!initial)return fail(`No supported conductor through 750 kcmil ${metal} per set satisfies ${breaker} A total OCPD with ${sets} set(s). Increase the set quantity or use an engineered arrangement.`);
 const integrated=integratedDrop(p,candidates,initial,sets,material,true);if(integrated.error)return fail(integrated.error);
 const w=integrated.wire;
 const baseGround=wire(egc(breaker)),egcRatio=w.cm/initial.cm,requiredGroundCM=baseGround.cm*egcRatio;
 const ground=conductors.find(c=>c.cm>=requiredGroundCM);
 if(!ground)return fail('The proportional Cu EGC increase exceeds the supported 750 kcmil range. No passing EGC or conduit is selected; obtain an engineered grounding and raceway design.');
 const usable=Math.min(w.term,w.adjusted),count=circuit.physical+1,area=circuit.physical*w.area+ground.area,fraction=.4,emt=conduitSizes.find(c=>area<=c.area*fraction);
 const steps=[`Selected total OCPD rating = ${breaker} A. Conductor ampacity is checked against this rating; OCPD selection and load/equipment requirements must be verified separately.`,`${circuit.label}: ${circuit.physical} full-size insulated phase/neutral conductors and ${circuit.ccc} current-carrying conductors per set.`,`${sets} identical set(s), one complete set in each separate EMT raceway. Effective ambient = ${ambient}°C (any applicable rooftop adder must already be included; no additional adder is applied). 90°C ambient factor = ${af}; CCC adjustment factor = ${cf}.`,`${wireLabel(w.size)} ${metal} per phase/neutral in each set: ${terminal}°C terminal ampacity ${formatCurrent(w.term)} A; corrected 90°C ampacity ${formatCurrent(w.base90)} × ${af} × ${cf} = ${formatCurrent(w.adjusted)} A.`,`Usable ampacity per set = min(${formatCurrent(w.term)}, ${formatCurrent(w.adjusted)}) = ${formatCurrent(usable)} A; combined usable ampacity = ${sets} × ${formatCurrent(usable)} = ${formatCurrent(sets*usable)} A ≥ ${breaker} A total OCPD. No next-size-up exception.`,`Each raceway: ${circuit.physical} × ${wireLabel(w.size)} ${metal} (including any full-size neutral) + 1 × ${wireLabel(ground.size)} insulated Cu EGC. Each EGC ${egcRatio>1?'starts with':'is sized from'} the TOTAL ${breaker} A OCPD, not a divided rating${egcRatio>1?', then is increased for voltage drop':''}.`,`Per-raceway fill: ${circuit.physical} × ${w.area.toFixed(4)} + ${ground.area.toFixed(4)} = ${area.toFixed(4)} in²; ${count} physical conductors permit 40% fill.`,emt?`Each of ${sets} EMT raceway(s): ${emt.size} in.; ${emt.area} in² × 0.4 = ${(emt.area*.4).toFixed(4)} in² allowed; actual fill = ${fmt(area/emt.area*100)}%.`:'Required EMT exceeds the supported 4-inch range; no passing raceway selected.'];
 const warnings=[`NEC 2023 baseline: 210.19(A)(1), 210.20(A), 215.2(A)(1), 215.3, 110.14(C), Table 310.16, 310.15(B)(1)/(C)(1)/(E), 310.10(G), 240.4(D), 240.6(A), Table 250.122 and 250.122(F); Chapter 9 Tables 1, 4 and 5.`,`The selected OCPD must independently satisfy applicable load, continuous-load and equipment requirements. This tool checks conductors against the chosen rating and does not select protection from a load calculation. Combined terminal and corrected ampacity (per-set values × set quantity) are both checked against the total OCPD, conservatively. The total OCPD is capped at 4000 A in this version.`,`Circuit configuration determines all wire counts. Neutrals are full-size and included in fill. All three-phase 4-wire neutrals conservatively count as CCC (80% adjustment). Split-phase neutrals are excluded only when carrying imbalance current under applicable NEC conditions. A full-size neutral is an assumption, not proof of adequacy for harmonic loads. Two phase conductors plus a neutral from a 4-wire three-phase wye system are not the split-phase configuration and are not modeled.`,`One complete identical set per separate EMT, with one insulated Cu EGC in every raceway. Sets sharing a raceway, multiple circuits, reduced neutrals and unequal arrangements are not modeled.`,`EMT fill uses standard noncompact THHN/THWN-2 Table 5 areas, with no compact-conductor reduction. Verify actual product outside diameter and listing; XHHW-2 and other insulation types are not interchangeable. Dimensions verified in the 2017 publication; final 2023 dimensions not independently verified.`,`General feeders/branches with 90°C insulation only. No motors, HVAC, welders, transformer secondaries, taps, services/dwelling exceptions, bundling exceptions or 100%-rated equipment.`,`Cu EGC is the Table 250.122 base minimum only, not a final grounding design. Review 250.122(B) conductor-upsizing requirements, including any 1/0 parallel minimum effect, fault-path adequacy and bonding before use. Neutral load/harmonics and voltage drop are not designed here.`,`Minimum EMT is a physical fill result only; verify pulling feasibility, bends, installation conditions, equipment ratings and local amendments.`];
 if(terminal===90)warnings.unshift('90°C equipment rating condition: all connected equipment and terminations at both ends must be listed and identified for 90°C ampacity under NEC 110.14(C). A 90°C wire or lug marking alone is insufficient; the lowest connected rating governs.');
 if(sets>1)warnings.unshift('Parallel phase and neutral conductors are restricted to 1/0 AWG or larger. Corresponding parallel conductors must have the same length, material, circular-mil area, insulation type and termination method. Verify equal electrical characteristics, grouping, raceway arrangement and equipment listed for parallel terminations. No small-conductor parallel exceptions are applied.');
 if(!emt)warnings.unshift('No supported EMT fits this per-set schedule. Use an engineered raceway arrangement. The ampacity result does not establish a complete installation.');
 if(material==='aluminum')warnings.push('Aluminum results are NEC table-based, not a stocked-product recommendation. Verify listed AA-8000-series THHN/THWN-2, available size and AL-rated terminations; follow manufacturer preparation/torque instructions. No #14 aluminum is modeled; #12 and #10 aluminum OCPD limits are 15 A and 25 A.');
 if(integrated.enabled){
  steps.push(...integrated.steps,`Cu EGC proportional basis: Table 250.122 base ${wireLabel(baseGround.size)} (${baseGround.cm} CM) × final / initial phase CM (${w.cm} / ${initial.cm}) = ${fmt(requiredGroundCM)} CM; round up to ${wireLabel(ground.size)} Cu in EACH raceway. Parallel-set quantity remains ${sets}.`);
  warnings.splice(warnings.findIndex(x=>x.startsWith('Cu EGC is the Table')),1,'Modeled Cu EGC includes a proportional 250.122(B) increase for this voltage-drop upsizing, using the initial corrected ampacity/OCPD selection at the same set count as its baseline. This is not a complete grounding design: independently review the 1/0 parallel minimum effect and other non-thermal upsizing, fault-path impedance, bonding, termination capacity and adopted code. No increase is attributed to ambient/CCC correction alone.');
  warnings.push(...integrated.warnings);
 }
 return result([{label:material==='aluminum'?'Aluminum conductor per set':'Copper conductor per set',value:wireLabel(w.size)},{label:'Minimum EMT per set',value:emt?`${emt.size} in.`:'Over supported 4 in. range'},{label:'Separate EMT raceways',value:sets},{label:'Actual fill per raceway',value:emt?fmt(area/emt.area*100):'No supported EMT',unit:emt?'%':undefined},{label:'Total OCPD',value:breaker,unit:'A'},currentResult('Combined usable ampacity',sets*usable),currentResult('Usable ampacity per set',usable),{label:integrated.enabled?'Modeled Cu EGC per raceway':'Base-minimum Cu EGC per raceway',value:wireLabel(ground.size)},{label:'Physical conductors per raceway incl. EGC',value:count},{label:'CCC per raceway',value:circuit.ccc},{label:'Permitted fill per raceway',value:40,unit:'%'},{label:'Conductor area per raceway incl. EGC',value:fmt(area),unit:'in²'},...integrated.results,...(integrated.enabled?[{label:'Base-minimum Cu EGC per raceway',value:wireLabel(baseGround.size)},{label:'EGC proportional increase',value:fmt(egcRatio),unit:'×'},{label:'Required Cu EGC area before rounding',value:fmt(requiredGroundCM),unit:'cmil'}]:[])],steps,warnings,[...integrated.sources,...(integrated.enabled?[egcUpsizeSource]:[]),...refs.conductor,...refs.conduit.slice(1),{label:'Eaton: 2023 NEC standard OCPD ratings, page 35',url:'https://www.eaton.com/content/dam/eaton/products/electrical-circuit-protection/fuses/code-updates/bus-ele-br-11318-2023-NEC-code-changes.pdf'},{label:'Southwire: licensed Table 250.122 Cu EGC sizes (2017 reproduction; verify adopted edition)',url:'https://www.southwire.com/medias/sys_master/installation-manuals/installation-manuals/hca/hff/8887676010526/MC-Installation-Guide-Southwire.pdf'},{label:'Southwire: AA-8000 aluminum THHN/THWN-2 construction, availability and product dimensions',url:'https://www.southwire.com/wire-cable/building-wire/simpull-sup-sup-thhn-thwn-2-aluminum-with-alumaflex-sup-sup-brand-conductors/p/SPEC10012'}]);
}
export function service(p){
 if(!hasNumbers(p,['load','terminal','ambient','parallelSets'])||(p.ocpd!==undefined&&!hasNumbers(p,['ocpd'])))return fail('Enter a finite number in every required field; optional OCPD may be omitted.');
 if(['continuous','ccc','physicalCount'].some(k=>p[k]!==undefined))return fail('Use one preadjusted design load, a circuit configuration and parallel-set quantity. Legacy continuous-load and manual conductor counts are not supported.');
 const load=Number(p.load),terminal=Number(p.terminal),ambient=Number(p.ambient),sets=Number(p.parallelSets),ocpd=Number(p.ocpd??0);
 if(load<=0)return fail('Enter a design load greater than zero, including any required continuous-load allowance.');
 if(![60,75,90].includes(terminal))return fail('Select 60°C, 75°C or verified 90°C equipment terminations.');
 if(terminal===90&&p.terminal90Confirmed!==true&&p.terminal90Confirmed!=='true')return fail('90°C requires explicit verification that all connected equipment and terminations are listed and identified for 90°C ampacity under NEC 110.14(C). A 90°C wire or lug marking alone is insufficient.');
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
 const candidates=conductors.filter(w=>w[`${prefix}90`]!==null&&(sets===1||w.cm>=105600)).map(w=>({...w,term:w[`${prefix}${terminal}`],base90:w[`${prefix}90`],adjusted:w[`${prefix}90`]*af*cf}));
 const initial=candidates.find(w=>sets*Math.min(w.term,w.adjusted)>=breaker&&(!caps[w.size]||breaker<=caps[w.size]));
 if(!initial)return fail(`No supported conductor through 750 kcmil ${metal} per set satisfies ${breaker} A total OCPD with ${sets} set(s). Increase the set quantity or use an engineered arrangement.`);
 const integrated=integratedDrop(p,candidates,initial,sets,material);if(integrated.error)return fail(integrated.error);
 const w=integrated.wire;

 const usable=Math.min(w.term,w.adjusted);
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
 if(terminal===90)warnings.unshift('90°C equipment rating condition: all connected equipment and terminations at both ends must be listed and identified for 90°C ampacity under NEC 110.14(C). A 90°C wire or lug marking alone is insufficient; the lowest connected rating governs.');
 if(material==='aluminum')warnings.push('Aluminum ampacities are table-based, not a stocked-product recommendation. Verify listed AA-8000-series THHN/THWN-2, product availability, compatible AL-rated equipment and manufacturer preparation/torque instructions.');
 if(integrated.enabled){
  steps.push(...integrated.steps);
  warnings.push(...integrated.warnings);
  const scopeIndex=warnings.findIndex(x=>x.startsWith('Maximum modeled total service OCPD'));
  warnings[scopeIndex]=warnings[scopeIndex].replace('underground thermal analysis, voltage drop or specialized service arrangement','underground thermal analysis or specialized service arrangement');
 }
 return result([
  {label:material==='aluminum'?'Aluminum service phase conductor per set':'Copper service phase conductor per set',value:wireLabel(w.size)},
  {label:'Total service OCPD',value:breaker,unit:'A'},
  currentResult('Combined phase ampacity',sets*usable),
  currentResult('Usable phase ampacity per set',usable),
  {label:'Separate conductor sets',value:sets},
  currentResult('Design load',load),
  {label:'CCC per raceway',value:circuit.ccc},
  {label:'Neutral design',value:'Separate review required'},
  {label:'Grounding / bonding / conduit',value:'Not calculated'},
  ...integrated.results
 ],steps,warnings,[...integrated.sources,...refs.conductor,{label:'NFPA code-development record: 230.79 general minimum service disconnect ratings (verify adopted NEC 2023)',url:'https://docinfofiles.nfpa.org/files/AboutTheCodes/70/70_A2022_NEC_P10_FD_PIResponses.pdf'},{label:'NFPA record: 2023 service-grounding subsection renumbering under 250.24',url:'https://docinfofiles.nfpa.org/files/AboutTheCodes/70/70_A2025_NEC_P05_FD_MeetingAgenda_0124.pdf'},{label:'UL: panelboards, wire and termination temperature ratings',url:'https://www.ul.com/thecodeauthority/knowledge/panelboards-guide'}]);
}
export function transformer(p){if(!hasNumbers(p,['kva','primary','secondary']))return fail('Enter finite numeric values for kVA and both voltages.');const kva=Number(p.kva),primary=Number(p.primary),secondary=Number(p.secondary);if(!valid(kva,primary,secondary)||Math.min(kva,primary,secondary)<=0)return fail('Enter positive kVA and primary/secondary voltages.');const checks=[checkVoltageInput(p,'primary','primaryPhase',true),checkVoltageInput(p,'secondary','secondaryPhase',true)];if(checks.some(c=>c.error))return fail(checks.find(c=>c.error).error);try{const f1=phaseFactor(p.primaryPhase),f2=phaseFactor(p.secondaryPhase);return result([currentResult('Primary full-load current',kva*1000/(f1*primary)),currentResult('Secondary full-load current',kva*1000/(f2*secondary))],[`Primary I = ${kva} × 1,000 / (${phaseFactorLabel(p.primaryPhase)} × ${primary}).`,`Secondary I = ${kva} × 1,000 / (${phaseFactorLabel(p.secondaryPhase)} × ${secondary}).`],[...checks.flatMap(c=>c.warnings),...(Number(p.primaryPhase)!==Number(p.secondaryPhase)?['Primary and secondary phases differ. An ordinary transformer does not convert single-phase to three-phase; these are independent current relationships only. Verify the actual equipment arrangement.']:[]),`Use line-to-line voltage for three-phase and full-winding voltage for single-phase (240 V for a 120/240 V winding).`,`Ideal nameplate full-load current only. No efficiency/inrush correction, OCPD recommendation or transformer-secondary conductor sizing. NEC 450.3, 240.21(C), 250.30 and manufacturer instructions require separate checks.`],[...refs.transformer,...voltageSources]);}catch(e){return fail(e.message);}}
export function power(p){if(!hasNumbers(p,['pf',p?.mode==='wattsToVA'?'watts':'va']))return fail('Enter finite numeric values for power and power factor.');const pf=Number(p.pf),v=Number(p.mode==='wattsToVA'?p.watts:p.va);if(!valid(pf,v)||pf<=0||pf>1||v<0)return fail('Enter nonnegative power and a power factor greater than 0 and no more than 1.');if(!['wattsToVA','vaToWatts'].includes(p.mode))return fail('Choose a conversion.');const watts=p.mode==='wattsToVA'?v:v*pf,va=p.mode==='wattsToVA'?v/pf:v;return result([{label:'Real power',value:fmt(watts),unit:'W'},{label:'Apparent power',value:fmt(va),unit:'VA'},{label:'Power factor',value:pf}],['P (W) = S (VA) × PF.','S (VA) = P (W) / PF.'],['Use true power factor for the load. VA is not interchangeable with watts unless PF = 1.'],refs.power);}
export function amps(p){if(!hasNumbers(p,['value','voltage','pf']))return fail('Enter finite numeric values for power/current, voltage and power factor.');const v=Number(p.value),voltage=Number(p.voltage),pf=Number(p.pf);if(!valid(v,voltage,pf)||v<0||voltage<=0||pf<=0||pf>1)return fail('Enter nonnegative watts/amps, positive voltage and PF greater than 0 and no more than 1.');const voltageCheck=checkVoltageInput(p);if(voltageCheck.error)return fail(voltageCheck.error);try{const f=phaseFactor(p.phase);if(!['wattsToAmps','ampsToWatts'].includes(p.mode))return fail('Choose a conversion.');const a=p.mode==='wattsToAmps'?v/(f*voltage*pf):v,w=p.mode==='wattsToAmps'?v:f*voltage*v*pf;return result([currentResult('Current',a),{label:'Real input power',value:fmt(w),unit:'W'},{label:'Apparent power',value:fmt(f*voltage*a),unit:'VA'}],[`P = ${Number(p.phase)===3?'√3 × ':''}V × I × PF.`,`I = P / (${phaseFactorLabel(p.phase)} × ${voltage} × ${pf}).`],[...voltageCheck.warnings,'Balanced three-phase load; use line-to-line voltage for three-phase. Single-phase uses voltage across the actual load.','Electrical input watts only; mechanical output requires an efficiency adjustment. Not a branch-circuit sizing result.'],[...refs.power,...voltageSources]);}catch(e){return fail(e.message);}}
export function conduit(p){if(!p||!Array.isArray(p.rows)||!p.rows.length)return fail('Add at least one conductor row.');let count=0,area=0;for(const r of p.rows){if(!hasNumbers(r,['count']))return fail('Enter a finite whole-number count in each conductor row.');const w=wire(r.size),n=Number(r.count);if(!w||!Number.isInteger(n)||n<0||n>1000)return fail('Use supported conductor sizes and whole-number counts from 0–1,000.');count+=n;area+=w.area*n;}if(!count)return fail('At least one conductor is required.');const fraction=count===1?.53:count===2?.31:.4;const minimum=conduitSizes.find(c=>area<=c.area*fraction);const c=p.trade==='auto'?minimum:conduitSizes.find(c=>c.size===p.trade);if(!c)return fail('Required EMT size exceeds the supported 4-inch range.');const percent=area/c.area*100,pass=area<=c.area*fraction;return result([{label:'Selected EMT',value:`${c.size} in.`},{label:'Actual fill',value:fmt(percent),unit:'%'},{label:'Permitted fill',value:fraction*100,unit:'%'},{label:'Fill check',value:pass?'Within fill limit':'Exceeds fill limit'},{label:'Minimum EMT',value:minimum?`${minimum.size} in.`:'Over 4 in.'},{label:'Conductor area',value:fmt(area),unit:'in²'}],[`${count} total conductors, including EGCs: ${area.toFixed(4)} in².`,`Chapter 9 Table 1: ${count===1?'one conductor = 53%':count===2?'two conductors = 31%':'more than two conductors = 40%'}.`,`EMT internal area ${c.area} in² × ${fraction} = ${(c.area*fraction).toFixed(4)} in² permitted.`],['NEC Chapter 9 Tables 1, 4 and 5 method. Table 5 dimensions verified in the 2017 publication; final 2023 dimensional tables not independently verified. Insulated copper THHN/THWN-2 only; count neutrals and insulated grounds for physical fill.','No cables, bare grounds, compact conductors, mixed insulation types or ≤24-inch nipple exceptions. Fill compliance does not establish pulling feasibility, derating, bend radius or jam clearance.'],refs.conduit);}
// NEC 2017 Chapter 9 Table 9, 75°C / 60 Hz; Ω per 1,000 ft.
// [X PVC, X steel, R uncoated Cu PVC, R Cu steel, R Al PVC, R Al steel].
// No interpolation: #14 aluminum and 700 kcmil have no supported table row.
export const dropImpedance={
 '14':[.058,.073,3.1,3.1,null,null],'12':[.054,.068,2,2,3.2,3.2],
 '10':[.050,.063,1.2,1.2,2,2],'8':[.052,.065,.78,.78,1.3,1.3],
 '6':[.051,.064,.49,.49,.81,.81],'4':[.048,.060,.31,.31,.51,.51],
 '3':[.047,.059,.25,.25,.40,.40],'2':[.045,.057,.19,.20,.32,.32],
 '1':[.046,.057,.15,.16,.25,.25],'1/0':[.044,.055,.12,.12,.20,.20],
 '2/0':[.043,.054,.10,.10,.16,.16],'3/0':[.042,.052,.077,.079,.13,.13],
 '4/0':[.041,.051,.062,.063,.10,.10],'250':[.041,.052,.052,.054,.085,.086],
 '300':[.041,.051,.044,.045,.071,.072],'350':[.040,.050,.038,.039,.061,.063],
 '400':[.040,.049,.033,.035,.054,.055],'500':[.039,.048,.027,.029,.043,.045],
 '600':[.039,.048,.023,.025,.036,.038],'750':[.038,.048,.019,.021,.029,.031]
};
export function migrateDropState(input){const state={pf:1,raceway:'steel',...input};delete state.target;return state;}
export function dropStatus(percent){return percent<=3?'green':percent<5?'orange':'red';}
export function drop(p){
 if(p&&typeof p==='object')p={pf:1,raceway:'steel',...p};
 if(!hasNumbers(p,['length','current','voltage','pf']))return fail('Enter finite numeric values for length, current, starting voltage and power factor.');
 const L=Number(p.length),I=Number(p.current),V=Number(p.voltage),pf=Number(p.pf);
 if(!wire(p.size)||L<0||I<0||V<=0||pf<=0||pf>1)return fail('Use a supported size, nonnegative one-way length/current, positive starting voltage, and power factor greater than 0 and at most 1.');
 if(V>600)return fail('This impedance-table model supports starting voltage up to 600 V only. Use a separately verified engineering model above 600 V.');
 if(!['copper','aluminum'].includes(p.material))return fail('Choose copper or aluminum.');
 if(!['pvc','steel'].includes(p.raceway))return fail('Choose the actual PVC or steel raceway for the impedance estimate.');
 const data=dropImpedance[String(p.size)],steel=p.raceway==='steel',R=data?.[(p.material==='aluminum'?4:2)+(steel?1:0)],X=data?.[steel?1:0];
 if(R==null)return fail('No supported impedance table data for this size/material. Choose a supported conductor size; 700 kcmil and #14 aluminum require a separate engineering calculation.');
 const voltageCheck=checkVoltageInput(p);if(voltageCheck.error)return fail(voltageCheck.error);
 try{
  const f=Number(p.phase)===3?phaseFactor(p.phase):phaseFactor(p.phase)*2,sinPhi=Math.sqrt(Math.max(0,1-pf*pf)),ze=R*pf+X*sinPhi,vd=f*I*L/1000*ze,pct=100*vd/V;
  if(!Number.isFinite(vd)||!Number.isFinite(pct))return fail('The calculation exceeds the supported numeric range. Reduce the input magnitudes.');
  if(vd>V)return fail('Estimated drop exceeds starting voltage. This approximation is outside its useful range; review length, current, conductor size and the circuit model.');
  const status=dropStatus(pct),meaning=status==='green'?'At or below 3%':status==='orange'?'Above 3% and below 5%':'At or above 5%';
  return result([
   {label:'Percentage voltage drop',value:fmt(pct),unit:'%',status},
   {label:'Estimated voltage drop',value:fmt(vd),unit:'V'},
   {label:'Estimated voltage at end of run',value:fmt(V-vd),unit:'V'},
   {label:'Voltage-drop guidance',value:meaning,status}
  ],[
   `VD = ${Number(p.phase)===3?'√3':'2'} × I × L / 1000 × (R × PF + X × √(1 − PF²)).`,
   `I = ${formatCurrent(I)} A actual load current; L = ${L} ft one-way; starting voltage = ${V} V; lagging PF = ${pf}.`,
   `NEC 2017 Chapter 9 Table 9: R = ${R} and X = ${X} Ω/1000 ft; ${p.material}, ${steel?'steel (including EMT)':'PVC'} raceway; 75°C conductor, 60 Hz. Final 2023 table values have not been independently verified.`,
   `VD = ${fmt(vd)} V; percent = 100 × VD / ${V}. Status uses the unrounded percentage.`,
   'Color guide: green ≤3%; orange >3% and <5%; red ≥5%. Red at exactly 5% marks the selected caution threshold, not proof of a code violation.'
  ],[...voltageCheck.warnings,
   'AC estimate assumes sinusoidal current, lagging displacement PF, equal outgoing/return conductors for single-phase or balanced three-phase. Table 9 models three single conductors in conduit; single-phase use is an approximation. Leading PF, harmonics, parallel sets and other geometries are not modeled.',
   'NEC general-circuit 3% branch / 5% combined feeder-and-branch guidance is generally informational; some applications impose mandatory limits. Verify adopted code and local amendments.',
   '2021 IECC C405.10 limits combined customer-owned service, feeder and branch-circuit voltage drop to not more than 5% where applicable. This single segment cannot establish combined-path compliance. Verify adopted IECC edition and applicability.',
   'Voltage drop does not verify ampacity, OCPD, grounding, motor starting or equipment voltage tolerance.'
  ],[...refs.drop,{label:'NEC 2017 Chapter 9 Table 9: AC resistance, reactance and effective impedance',url:'https://cms7files.revize.com/johnsontn/document_center/Development%20Services/Codes/Resource%20Docs/2017-NEC-Code-2.pdf#page=693'},{label:'2021 IECC C405.10: combined voltage-drop limit',url:'https://codes.iccsafe.org/content/IECC2021V3.0/chapter-4-ce-commercial-energy-efficiency'},...voltageSources]);
 }catch(e){return fail(e.message);}
}
export function box(p){if(!hasNumbers(p,['conductors','grounds','yokes','studs','volume']))return fail('Enter finite numeric values for every box count and volume.');const w=wire(p.size),n=Number(p.conductors),g=Number(p.grounds),y=Number(p.yokes),s=Number(p.studs),v=Number(p.volume);if(!w?.volume)return fail('Box fill supports #14 through #6 AWG only.');if(s>2)return fail('Enter 0–2 support fitting types: luminaire stud and/or hickey.');if(!valid(n,g,y,s,v)||![n,g,y,s].every(x=>Number.isInteger(x)&&x>=0)||v<0)return fail('Enter nonnegative whole-number counts and a nonnegative box volume.');const groundUnits=g===0?0:g<=4?1:1+(g-4)*.25,clampUnits=p.clamps?1:0,supportUnits=s,units=n+groundUnits+clampUnits+2*y+supportUnits,required=units*w.volume;if(!units)return fail('Enter at least one box-fill item.');return result([{label:'Required box volume',value:fmt(required),unit:'in³'},{label:'Available box volume',value:v,unit:'in³'},{label:'Volume check',value:v>=required?'Sufficient volume':'Insufficient volume'},{label:'Volume allowances',value:fmt(units)},{label:'Volume per allowance',value:w.volume,unit:'in³'}],[`${n} insulated conductor allowances + ${fmt(groundUnits)} grounding allowances + ${clampUnits} clamp allowance + ${2*y} device-yoke allowances + ${supportUnits} support allowance = ${fmt(units)}.`,`${fmt(units)} × ${w.volume} in³ per ${w.size} AWG = ${fmt(required)} in³.`,`Grounds: first 1–4 = one allowance; each additional = ¼ allowance.`],['NEC 2023 314.16(B) and Table 314.16(B). Uniform conductor size only. Count conductors entering and terminating or passing through; pigtails wholly within the box normally do not count.','Each standard device yoke counts as two allowances. One or more internal clamps count once; each support fitting type (stud or hickey) counts once, up to two allowances. Ground allowance assumes entering EGCs/bonding jumpers of the selected size.','Mixed sizes, long unbroken loops, larger/multiple-gang devices, barriers, luminaire exceptions and conductors larger than #6 require a separate review. Use the marked usable box/extension volume; do not infer volume from outside dimensions.'],refs.box);}
