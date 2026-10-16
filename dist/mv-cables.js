// Versioned manufacturer data for preliminary series-only voltage-drop estimates.
// Each row is [size, R, X], in ohms per 1,000 feet, at the family table temperature.
// Each family identifies its coherent conductor-series or positive-sequence model.
// Never substitute a capacitive-reactance or zero-sequence column.
const rowMap=rows=>Object.fromEntries(rows.map(([size,r,x])=>[size,{r,x}]));
const arrangement={id:'nonferrous-touching',label:'Three singles · one-diameter centers · nonferrous conduit'};
const threeCoreArrangement={id:'nonferrous-touching',label:'Factory three-conductor cable · nonferrous conduit'};
export const mvCableFamilies={
 'mv90-epr-2400':{
  label:'MV-90 · 2.4 kV · copper · single-conductor',rating:'MV-90',voltage:2400,material:'Copper',construction:'Nonshielded NL-EPR/PVC, compressed bare copper, single-conductor',
  reference:'Southwire SPEC 46002',revision:'1.000.026 · 2026-08-21',url:'https://cabletechsupport.southwire.com/en/cablespec/download_spec/?country=US&spec=46002',
  temperature:90,frequency:60,arrangements:[arrangement],model:'Conductor AC resistance and inductive reactance',bonding:'No metallic shield; shield-bonding impedance is not applicable.',
  data:rowMap([['2',.204,.0434],['1',.162,.0417],['1/0',.128,.0401],['2/0',.102,.0387],['3/0',.081,.0381],['4/0',.065,.0368],['250',.056,.0373],['350',.041,.0355],['500',.030,.0337],['750',.023,.0329],['1000',.019,.0317]])
 },
 'mv105-epr-2400':{
  label:'MV-105 · 2.4 kV · copper · three-conductor',rating:'MV-105',voltage:2400,material:'Copper',construction:'Nonshielded NL-EPR/PVC, compressed bare copper, factory three-conductor cable',
  reference:'Southwire SPEC 46006',revision:'1.000.001 · 2024-12-31',url:'https://cabletechsupport.southwire.com/en/cablespec/download_spec/?country=US&spec=46006',
  temperature:90,frequency:60,arrangements:[threeCoreArrangement],arrangementNote:'Source inductive-reactance footnote specifies one-diameter center spacing; use the factory three-core construction.',model:'Conductor AC resistance and inductive reactance',bonding:'No metallic shield; shield-bonding impedance is not applicable.',
  data:rowMap([['2',.204,.035],['1/0',.128,.032],['4/0',.065,.030],['350',.041,.028],['500',.030,.027]])
 }
};
// Shielded reference families retain a paired positive-sequence R1/X1 model.
// Frequency/application assumptions are shown in the UI and copied into reports.
const insulationSource={label:'Prysmian / General Cable: cable line-to-line voltage rating and insulation-level selection by ground-fault clearing time',url:'https://na.prysmian.com/sites/na.prysmian.com/files/media/documents/UTY-0018-R1116_Electric%20Utility%20Catalog_CANADA.pdf#page=24',category:'Cable application reference'};
const insulationApplication='133% insulation-level application assumes ground faults are cleared within one hour. Verify actual voltage, system grounding, insulation coordination, protection and accessories. 133% is not a continuous-voltage multiplier.';
const airguardCommon={
 rating:'MV-105',material:'Copper',reference:'Prysmian AIRGUARD 3/C',revision:'AIG-0001-1121 · pp. 13–15',
 url:'https://na.prysmian.com/sites/default/files/atoms/files/AIG-0001-1121_Airguard%20Catalog.pdf#page=14',
 temperature:105,temperatures:[90,105],rAt90Factor:.96,frequency:60,frequencyAssumed:true,insulationLevel:'133%',
 arrangements:[{id:'factory-3c-shorted',label:'Factory 3/C · short-circuited shields'}],
 model:'Positive-sequence R1 / X1',bonding:'Published basis: shields short-circuited; no return in earth.',
 assumptionNote:'60 Hz assumed; source impedance table does not state frequency. No external ferrous-enclosure correction is included.',
 applicationNote:insulationApplication,applicationSource:insulationSource
};
mvCableFamilies['mv105-epr-5000']={...airguardCommon,label:'MV-105 · 5 kV · copper · factory 3/C',voltage:5000,construction:'Compact copper, 115 mil EPR, 25%-overlap copper tape shields, factory three-conductor cable, polymeric protection/aluminum barrier/PVC',data:rowMap([["2",0.212,0.042],["1/0",0.134,0.039],["2/0",0.106,0.037],["4/0",0.067,0.035],["250",0.057,0.034],["350",0.041,0.032],["500",0.029,0.031],["750",0.02,0.03]])};
mvCableFamilies['mv105-epr-15000']={...airguardCommon,label:'MV-105 · 15 kV · copper · factory 3/C',voltage:15000,construction:'Compact copper, 220 mil EPR, 25%-overlap copper tape shields, factory three-conductor cable, polymeric protection/aluminum barrier/PVC',data:rowMap([["2",0.212,0.049],["1/0",0.134,0.044],["2/0",0.107,0.043],["4/0",0.067,0.04],["250",0.057,0.039],["350",0.041,0.037],["500",0.029,0.034],["750",0.02,0.033],["1000",0.016,0.032]])};
mvCableFamilies['mv105-epr-25000']={...airguardCommon,label:'MV-105 · 25 kV · copper · factory 3/C',voltage:25000,construction:'Compact copper, 320 mil EPR, 25%-overlap copper tape shields, factory three-conductor cable, polymeric protection/aluminum barrier/PVC',data:rowMap([["1/0",0.134,0.049],["2/0",0.107,0.048],["4/0",0.068,0.044],["250",0.057,0.043],["350",0.041,0.04],["500",0.029,0.038],["750",0.02,0.036],["1000",0.016,0.034]])};
mvCableFamilies['mv105-epr-35000']={...airguardCommon,label:'MV-105 · 35 kV · copper · factory 3/C',voltage:35000,construction:'Compact copper, 420 mil EPR, 25%-overlap copper tape shields, factory three-conductor cable, polymeric protection/aluminum barrier/PVC',data:rowMap([["1/0",0.134,0.053],["2/0",0.107,0.051],["4/0",0.068,0.047],["250",0.057,0.046],["350",0.041,0.043],["500",0.03,0.041],["1000",0.016,0.037]])};
const urdCommon={
 rating:'MV-90',material:'Copper',reference:'Prysmian TRXLPE URD · UL MV-90 option',revision:'PDN-0023-0713 · July 2013',
 url:'https://na.prysmian.com/sites/na.prysmian.com/files/media/documents/PDN-0023-0713_5-46kV%20TRXLPE%20URD%20(USA)_LR.pdf',
 temperature:90,frequency:60,frequencyAssumed:true,insulationLevel:'133%',
 arrangements:[{id:'direct-buried-flat-7.5',label:'Three singles · direct buried · flat 7.5 in. centers assumed'}],
 model:'Positive-sequence R1 / X1 · direct-buried columns',bonding:'Short-circuited concentric-neutral shields assumed; application of the source ampacity-note bonding basis to impedance is an engineering assumption.',
 assumptionNote:'60 Hz assumed. The source geometry/bonding notes describe ampacity; applying them to impedance is assumed: three singles direct buried, flat 7.5 in. adjacent center spacing, short-circuited shields. UL MV-90 ordering option required.',
 applicationNote:insulationApplication,applicationSource:insulationSource
};
mvCableFamilies['mv90-cn-5000']={...urdCommon,label:'MV-90 option · 5 kV · copper · CN singles',voltage:5000,construction:'Compressed stranded copper, 115 mil TRXLPE, one-third copper concentric neutral, LLDPE jacket; optional UL MV-90 construction',data:rowMap([["1/0",0.143,0.094],["2/0",0.119,0.09],["3/0",0.101,0.085],["4/0",0.088,0.079],["250",0.08,0.075],["350",0.068,0.065],["500",0.058,0.053],["750",0.048,0.04],["1000",0.041,0.031]])};
mvCableFamilies['mv90-cn-15000']={...urdCommon,label:'MV-90 option · 15 kV · copper · CN singles',voltage:15000,construction:'Compressed stranded copper, 220 mil TRXLPE, one-third copper concentric neutral, LLDPE jacket; optional UL MV-90 construction',data:rowMap([["1/0",0.141,0.094],["2/0",0.117,0.091],["3/0",0.099,0.086],["4/0",0.086,0.081],["250",0.078,0.076],["350",0.066,0.067],["500",0.057,0.055],["750",0.047,0.042],["1000",0.041,0.035]])};
mvCableFamilies['mv90-cn-25000']={...urdCommon,label:'MV-90 option · 25 kV · copper · CN singles',voltage:25000,construction:'Compressed stranded copper, 320 mil TRXLPE, one-third copper concentric neutral, LLDPE jacket; optional UL MV-90 construction',data:rowMap([["1/0",0.14,0.095],["2/0",0.116,0.091],["3/0",0.098,0.087],["4/0",0.084,0.082],["250",0.076,0.078],["350",0.064,0.069],["500",0.055,0.057],["750",0.045,0.045],["1000",0.039,0.037]])};
mvCableFamilies['mv90-cn-35000']={...urdCommon,label:'MV-90 option · 35 kV · copper · CN singles',voltage:35000,construction:'Compressed stranded copper, 420 mil TRXLPE, one-third copper concentric neutral, LLDPE jacket; optional UL MV-90 construction',data:rowMap([["1/0",0.139,0.095],["2/0",0.115,0.092],["3/0",0.096,0.087],["4/0",0.083,0.083],["250",0.074,0.079],["350",0.062,0.07],["500",0.053,0.059],["750",0.044,0.047],["1000",0.038,0.039]])};
const familyFor=state=>typeof state?.mvFamily==='string'&&Object.hasOwn(mvCableFamilies,state.mvFamily)?mvCableFamilies[state.mvFamily]:undefined;
export const mvCableSizeLabel=size=>Number(size)>=250?`${size} kcmil`:`${size} AWG`;
export const mvCableOptions=()=>Object.entries(mvCableFamilies).map(([id,f])=>[id,f.label]);
export const mvSizeOptions=state=>Object.keys(familyFor(state)?.data||{}).sort((a,b)=>{
 const rank=s=>s.includes('/0')?Number(s.split('/')[0])+20:Number(s)>=250?Number(s):20-Number(s);
 return rank(a)-rank(b);
}).map(size=>[size,mvCableSizeLabel(size)]);
export const mvArrangementOptions=state=>(familyFor(state)?.arrangements||[]).map(a=>[a.id,a.label]);
export const mvTemperatureOptions=state=>(familyFor(state)?.temperatures||[familyFor(state)?.temperature]).filter(v=>v!==undefined).map(t=>[t,`${t}°C calculation temperature`]);
export function mvPresetImpedance(p){
 const family=familyFor(p);
 if(!family)return {error:'Choose a supported MV cable preset.'};
 const row=['number','string'].includes(typeof p.mvSize)&&Object.hasOwn(family.data,p.mvSize)?family.data[p.mvSize]:null;
 if(!row)return {error:'Choose a conductor size available for this MV cable preset. No interpolation is used.'};
 if(![3,'3'].includes(p.phase))return {error:'MV cable presets support balanced three-phase circuits only. Use Project R/X for a single-phase return-path model.'};
 if(![1,'1'].includes(p.parallelSets))return {error:'MV cable presets support one circuit set only. Use Project R/X for parallel circuits with verified mutual effects and current sharing.'};
 const selectedArrangement=family.arrangements.find(a=>a.id===p.mvArrangement);
 if(!selectedArrangement)return {error:'Choose the supported MV cable arrangement, or use Project R/X for the actual installation.'};
 const temperature=Number(p.mvTemperature);
 if(!['number','string'].includes(typeof p.mvTemperature)||String(p.mvTemperature).trim()===''||!(family.temperatures||[family.temperature]).includes(temperature))return {error:'Choose a supported calculation temperature for this MV cable preset.'};
 if(Number(p.voltage)>family.voltage)return {error:`Starting voltage exceeds this preset’s ${family.voltage/1000} kV cable class. Choose a suitable cable preset or Project R/X; MV-90/MV-105 is a temperature rating, not a voltage rating.`};
 const corrected=temperature!==family.temperature;
 const r=corrected?row.r*family.rAt90Factor:row.r,x=row.x;
 if(!Number.isFinite(r)||r<=0||!Number.isFinite(x)||x<0)return {error:'This cable temperature has no supported impedance correction.'};
 const temperatureBasis=corrected?'Manufacturer estimate: R90 = 0.96 × R105; X unchanged.':`Published ${temperature}°C impedance.`;
 const qualification=family.assumptionNote?'Manufacturer data + engineering assumptions':'Published temperature / frequency basis';
 const basis=`${family.reference}, revision ${family.revision}; ${family.rating}; ${family.voltage/1000} kV; ${mvCableSizeLabel(p.mvSize)}; ${family.construction}; ${temperature}°C conductor calculation temperature; ${family.frequency} Hz${family.frequencyAssumed?' assumed':''}; ${selectedArrangement.label}; ${family.model}. ${family.bonding}${family.arrangementNote?' '+family.arrangementNote:''}${family.insulationLevel?' '+family.insulationLevel+' insulation level.':''}${family.assumptionNote?' Engineering assumptions: '+family.assumptionNote:''}${corrected?' '+temperatureBasis:''}${family.applicationNote?' '+family.applicationNote:''}`;
 return {family,arrangement:selectedArrangement,r,x,temperature,temperatureBasis,qualification,basis,source:{label:`Manufacturer cable reference: ${family.reference}, revision ${family.revision}; selected R/X coefficients, not an NEC table${family.assumptionNote?'; includes disclosed engineering assumptions':''}`,url:family.url,category:'Manufacturer reference'}};
}
