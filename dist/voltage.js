// Nominal systems, not measured voltage tolerances or a global building configuration.
export const voltageSources=[
 {label:'Electrical-system background, not code authority — Schneider Electric: North American wye, delta and split-phase voltage systems',url:'https://www.se.com/us/en/faqs/FAQ000234976/'},
 {label:'Electrical-system background, not code authority — Schneider Electrical Installation Guide: IEC nominal voltage ranges',url:'https://www.electrical-installation.org/enwiki/Definition_of_voltage_ranges'},
 {label:'Electrical-system background, not code authority — Schneider Electric: 240/120 V high-leg delta precautions',url:'https://www.se.com/us/en/faqs/FA123686/'}
];
export const systems=[
 {id:'split120240',label:'120/240 V split-phase',phase:1,ll:240,ln:120,split:true},
 {id:'wye208',label:'208Y/120 V wye',phase:3,ll:208,ln:120},
 {id:'delta240',label:'240 V delta',phase:3,ll:240},
 {id:'highleg240',label:'240/120 V high-leg delta',phase:3,ll:240,ln:120,highleg:true},
 {id:'wye480',label:'480Y/277 V wye',phase:3,ll:480,ln:277},
 {id:'delta480',label:'480 V delta',phase:3,ll:480},
 {id:'wye600',label:'600Y/347 V wye',phase:3,ll:600,ln:347},
 {id:'delta600',label:'600 V delta',phase:3,ll:600},
 {id:'wye400',label:'400Y/230 V wye (IEC)',phase:3,ll:400,ln:230},
 {id:'wye415',label:'415Y/240 V wye (regional / legacy)',phase:3,ll:415,ln:240},
 {id:'wye380',label:'380Y/220 V wye (regional / legacy)',phase:3,ll:380,ln:220},
 {id:'wye220',label:'220Y/127 V wye',phase:3,ll:220,ln:127},
 {id:'wye690',label:'690Y/400 V wye (IEC)',phase:3,ll:690,ln:400},
 {id:'single100200',label:'100/200 V single-phase (regional)',phase:1,ll:200,ln:100,split:true},
 {id:'delta200',label:'200 V three-phase (regional)',phase:3,ll:200}
];
export const systemOptions=phase=>[['auto','Common nominal voltages (no system specified)'],...systems.filter(s=>Number(phase)===1||s.phase===3).map(s=>[s.id,s.label])];
export function allowedVoltages(phase,system='auto',transformer=false){
 if(![1,3].includes(Number(phase)))return [];
 const chosen=system==='auto'?systems:systems.filter(s=>s.id===system);
 return [...new Set(chosen.flatMap(s=>Number(phase)===3?(s.phase===3?[s.ll]:[]):transformer&&s.split?[s.ll]:[s.ll,...(s.ln?[s.ln]:[])]))].sort((a,b)=>a-b);
}
export function voltageOptions(phase,system='auto',transformer=false){return allowedVoltages(phase,system,transformer).map(v=>[v,`${v} V ${Number(phase)===3?'line-to-line':transformer?'across full winding':'across load'}`]);}
export function validateVoltage({voltage,phase,system='auto',mode='standard',transformer=false,label='Voltage'}){
 const v=Number(voltage),ph=Number(phase),warnings=[];
 if(![1,3,'1','3'].includes(phase))return {error:'Choose single-phase or three-phase.'};
 if(!['number','string'].includes(typeof voltage)||String(voltage).trim()===''||!Number.isFinite(v)||v<=0)return {error:`${label}: enter a positive finite voltage.`};
 if(!['standard','custom'].includes(mode))return {error:`${label}: choose standard or custom voltage mode.`};
 if(mode==='custom'){
  warnings.push(`${label}: custom ${v} V, ${ph}-phase calculation using ${ph===3?'line-to-line':transformer?'full-winding':'voltage across the load'} voltage. Equipment, insulation and installation suitability remain project-specific design checks.`);
  if(ph===3&&v===120)warnings.push('120 V three-phase is unusual and is not an ordinary 208Y/120 V system input. A balanced 208Y/120 V three-phase load uses 208 V line-to-line; a 120 V line-neutral load is single-phase.');
 }else{
  if(!allowedVoltages(ph,system,transformer).includes(v))return {error:`${label}: ${v} V is not a supported nominal ${ph}-phase voltage for the selected system. ${ph===3?'Use line-to-line voltage: a 208Y/120 V system uses 208 V, not 120 V.':'Use voltage across the load, or the full winding for transformer kVA.'} Choose a matching preset or enter a custom voltage.`};
 }
 if(transformer&&v>1000)warnings.push('Medium-voltage transformer current is an ideal nameplate calculation only. Transformer protection, conductor ampacity, insulation, clearances and installation rules need separate engineering review.');
 const s=systems.find(s=>s.id===system);
 if(mode==='standard'&&s?.highleg)warnings.push('High-leg delta: 240 V line-to-line; only the two center-tapped legs provide 120 V to neutral. The high leg is about 208 V to neutral and must not supply a 120 V load. Verify phase identification and equipment ratings.');
 if(mode==='standard'&&system==='auto'&&ph===3&&v===240)warnings.push('240 V three-phase assumes a delta system. If high-leg delta is present, verify phase identification, neutral connections and equipment ratings; its high leg must not supply a 120 V load.');
 return {warnings};
}
export function checkVoltageInput(p,key='voltage',phaseKey='phase',transformer=false){return validateVoltage({voltage:p[key],phase:p[phaseKey],system:p[`${key}System`]??'auto',mode:p[`${key}Mode`]??'standard',transformer,label:key==='voltage'?'Voltage':`${key[0].toUpperCase()+key.slice(1)} voltage`});}
