// Local-only, versioned snapshots. Never discard corrupt or full storage silently.
export const CURRENT_APP_VERSION = '2.12.0';
export const RECORDS_KEY = 'mep-workbench-calculations-v1';
export const MAX_RECORDS = 100;
const clone = value => JSON.parse(JSON.stringify(value));
const object = v => v && typeof v === 'object' && !Array.isArray(v);
const name = (value, label) => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 100) throw Error(`${label} must contain 1–100 characters.`);
  return value.trim();
};
const projectLabel = value => {
  if(typeof value!=='string') throw Error('Project name must contain 1–100 characters.');
  return name(value.trim().replace(/\s+/g,' ')||'Unassigned','Project name');
};
export function projectKey(value) { return projectLabel(value).toLowerCase(); }
export function projectNames(records) {
  const names=new Map();
  // Trashed calculations still own their project name and can be restored.
  for(const record of records) {
    const label=projectLabel(record.projectName),key=projectKey(label);
    if(!names.has(key)) names.set(key,label);
  }
  return [...names.values()].sort((a,b)=>a.localeCompare(b,undefined,{sensitivity:'base'}));
}
export function defaultCalculationName(date=new Date()) {
  if(!(date instanceof Date)||!Number.isFinite(date.getTime())) throw Error('A valid date is required for a calculation name.');
  const pad=value=>String(value).padStart(2,'0');
  return `${String(date.getFullYear()).padStart(4,'0')}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
function canonicalProjectName(value,records) {
  const label=projectLabel(value),key=projectKey(label);
  const existing=records.find(record=>projectKey(record.projectName)===key);
  return existing?projectLabel(existing.projectName):label;
}
function calculationLabel(value,date) {
  if(typeof value!=='string') throw Error('Calculation name must contain 1–100 characters.');
  return name(value.trim()||defaultCalculationName(date),'Calculation name');
}
const printable = value => typeof value === 'boolean' ? (value ? 'Yes' : 'No') : typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');
function validJSON(value, depth=0) {
  if(depth>20) return false;
  if(value === null || ['string','boolean'].includes(typeof value)) return true;
  if(typeof value === 'number') return Number.isFinite(value);
  if(Array.isArray(value)) return value.every(v=>validJSON(v,depth+1));
  return object(value) && Object.keys(value).every(k=>!['__proto__','prototype','constructor'].includes(k) && validJSON(value[k],depth+1));
}
function validateSnapshot(s) {
  if(!object(s) || !/^[a-z][a-z0-9-]*$/.test(s.moduleId) || typeof s.moduleTitle!=='string' || !object(s.inputs) || !validJSON(s) || !object(s.result) || s.result.error || !Array.isArray(s.result.results) || !s.result.results.length || !['steps','warnings','sources'].every(k=>Array.isArray(s.result[k])) || !Array.isArray(s.inputRows) || !Array.isArray(s.limitations) || typeof s.appVersion!=='string' || typeof s.codeEdition!=='string' || !Number.isFinite(Date.parse(s.generatedAt))) throw Error('A valid calculated result is required. Check the inputs and calculate again.');
  if(!s.result.results.every(r=>object(r)&&typeof r.label==='string'&&['string','number'].includes(typeof r.value)&&(r.unit===undefined||typeof r.unit==='string')&&(r.displayValue===undefined||typeof r.displayValue==='string')) || !s.inputRows.every(r=>object(r)&&typeof r.label==='string'&&typeof r.value==='string') || !s.result.steps.every(x=>typeof x==='string') || !s.result.warnings.every(x=>typeof x==='string') || !s.limitations.every(x=>typeof x==='string') || !s.result.sources.every(r=>object(r)&&typeof r.label==='string'&&(r.url===undefined||typeof r.url==='string')) || typeof s.projectName!=='string' || typeof s.calculationName!=='string') throw Error('This calculation snapshot is incomplete or invalid.');
  if(JSON.stringify(s).length>150000) throw Error('This calculation is too large to save or export.');
  return s;
}
function trayQuantity(state,row) {
  const single=state.cableKind==='single',individuals=single?'individual conductors':'cables';
  // Versionless inputs count physical items. Only the new state schema counts
  // triangle/square packages; historical snapshot display text is never rebuilt.
  if(state.quantityVersion!==2) return `${row.count} ${individuals}`;
  const groupSize=row.arrangement==='triangle'?3:row.arrangement==='square'?4:1;
  if(groupSize>1) return `${row.count} group${Number(row.count)===1?'':'s'} of ${groupSize} (${Number(row.count)*groupSize} total ${individuals})`;
  return `${row.count} individual ${single?'conductors':'cables'}`;
}
export function createSnapshot(module, state, result, meta={}) {
  if(!object(module) || !object(state) || !object(result) || result.error || !result.results?.length) throw Error('A valid calculated result is required. Check the inputs and calculate again.');
  const fields=module.fields || [];
  for(const f of fields) {
    if(f.when && !f.when(state)) continue;
    const value=state[f.key];
    if(['number','voltage','protection-voltage'].includes(f.type) && (String(value??'').trim()==='' || !Number.isFinite(Number(value)) || (f.min!=null&&Number(value)<f.min) || ((f.maxFor?f.maxFor(state):f.max)!=null&&Number(value)>(f.maxFor?f.maxFor(state):f.max)) || (f.step===1&&!Number.isInteger(Number(value))))) throw Error(`Check ${f.label} before saving or exporting.`);
  }
  const inputRows=fields.filter(f=>!f.when||f.when(state)).map(f=>{
    const dynamic=f.dynamic?.(state), label=dynamic?.[0]||f.label, unit=dynamic?.[1]??f.unit;
    const options=typeof f.options==='function'?f.options(state):f.options;
    const selected=options?.find(([v])=>String(v)===String(state[f.key]));
    return {label:label+(unit?` (${unit})`:''),value:f.reportValue?String(f.reportValue(state)):selected?String(selected[1]):printable(state[f.key])};
  });
  if(module.id==='tray'&&state.rows)inputRows.push(...state.rows.map((r,i)=>({label:`Cable group ${i+1}`,value:`${r.name}: ${trayQuantity(state,r)} x ${r.od} in. overall diameter; ${r.size?`${r.size} ${Number(r.size)>=250?'kcmil':'AWG'}`:r.sizeClass==='large'?'4/0 AWG or larger (saved class)':'smaller than 4/0 AWG (saved class)'}; arrangement: ${r.arrangement||'unspecified (legacy area screening)'}; diameter source: ${r.diameterReference||'Manual actual cable OD'}${r.diameterReferenceUrl?' · '+r.diameterReferenceUrl:''}${state.service==='control'?' (size not used for control-only area rule)':''}`})));
  else if(state.rows) inputRows.push(...state.rows.map((r,i)=>({label:`Conductor group ${i+1}`,value:`${r.count} x ${r.size} ${Number(r.size)>=250?'kcmil':'AWG'}`})));
  if(module.id==='tray'&&state.quantityVersion===2&&result.effectiveRungSpacing!=null) inputRows.push({label:'Ladder rung spacing basis',value:`${result.effectiveRungSpacing} in. assumed for design; verify actual installation`});
  if(state.ambientBasis) inputRows.push({label:'Ambient design basis',value:String(state.ambientBasis)});
  if(!fields.length) inputRows.push(...Object.entries(state).map(([label,value])=>({label,value:printable(value)})));
  const s={moduleId:module.id,moduleTitle:module.title||module.id,inputs:state,inputRows,result,limitations:module.limitationsFor?.(state)||module.limitations||[],appVersion:meta.appVersion||CURRENT_APP_VERSION,codeEdition:meta.codeEdition||'NEC 2023 reference baseline; verify adopted edition and local amendments',generatedAt:meta.generatedAt||new Date().toISOString(),projectName:meta.projectName||'Untitled project',calculationName:meta.calculationName||module.title||module.id};
  validateSnapshot(s);
  return clone(s);
}
// Report-format additions apply only to their release and later. Older saved
// summaries/PDFs retain their original disclaimer and byte layout.
export function engineeringReviewNote(appVersion) {
  const version=appVersion.match(/^(\d+)\.(\d+)\.(\d+)$/)?.slice(1).map(Number);
  return version&&(version[0]>2||(version[0]===2&&(version[1]>10||(version[1]===10&&version[2]>=2))))
    ? 'Not a substitute for electrical engineer or electrician judgement.' : '';
}
// Display text is frozen in new result rows. Historical snapshots without it
// keep their original precision; never reformat a stored report on read/export.
export function summaryFromSnapshot(snapshot) {
  const s=validateSnapshot(snapshot);
  const lines=['MEP WORKBENCH',`${s.projectName} / ${s.calculationName}`,s.moduleTitle,`Generated: ${s.generatedAt}`,`Application: ${s.appVersion}`,`Code: ${s.codeEdition}`,'','INPUTS',...s.inputRows.map(r=>`${r.label}: ${r.value}`),'','RESULTS',...s.result.results.map(r=>`${r.label}: ${r.displayValue??r.value}${r.unit?' '+r.unit:''}`)];
  if(s.recordId) lines.splice(4,0,`Saved record: ${s.recordId}`,`Saved: ${s.savedAt}`);
  if(s.moduleId==='conductor'&&!s.result.results.some(r=>r.label==='Estimated voltage drop')) lines.push('Voltage drop: not calculated for this snapshot; check the actual circuit separately.');
  if(s.moduleId==='service') lines.push(`Service neutral, grounding, bonding and conduit fill: not calculated; separate design required.${s.result.results.some(r=>r.label==='Estimated voltage drop')?'':' Voltage drop is not calculated for this snapshot.'}`);
  lines.push('','METHOD',...s.result.steps.map((x,i)=>`${i+1}. ${x}`),'','ASSUMPTIONS, WARNINGS & SCOPE',...Array.from(new Set([...s.result.warnings,...s.limitations])).map(x=>`- ${x}`),'','SOURCES',...s.result.sources.map(x=>`${x.label}${x.url?'\n'+x.url:''}`),'','Design aid only. Verify adopted code, equipment listings and actual installation conditions with a qualified professional.');
  const reviewNote=engineeringReviewNote(s.appVersion);
  if(reviewNote) lines.push(reviewNote);
  return lines.join('\n');
}
// Clipboard is intentionally inputs and outputs only; full saved/PDF reports retain context.
export function copySummaryFromSnapshot(snapshot) {
  const s=validateSnapshot(snapshot);
  return [s.moduleTitle,'','INPUTS',...s.inputRows.map(r=>`${r.label}: ${r.value}`),'','OUTPUTS',...s.result.results.map(r=>`${r.label}: ${r.displayValue??r.value}${r.unit?' '+r.unit:''}`)].join('\n');
}
export function buildSummary(module,state,result,meta={}) { return summaryFromSnapshot(createSnapshot(module,state,result,meta)); }
export function createRecordStore(storage) {
  function read() {
    let raw;
    try { if(!storage) storage=globalThis.localStorage; if(!storage) throw Error(); raw=storage.getItem(RECORDS_KEY); } catch { throw Error('Saved calculations are unavailable. Browser storage may be blocked.'); }
    if(raw===null) return {schemaVersion:1,records:[]};
    try {
      const d=JSON.parse(raw);
      if(!object(d)||d.schemaVersion!==1||!Array.isArray(d.records)||d.records.length>MAX_RECORDS||!validJSON(d)) throw Error();
      const ids=new Set();
      for(const r of d.records) {
        if(!object(r)||typeof r.id!=='string'||!r.id||ids.has(r.id)||!Number.isFinite(Date.parse(r.createdAt))||!Number.isFinite(Date.parse(r.updatedAt))||(r.trashedAt!==null&&!Number.isFinite(Date.parse(r.trashedAt)))) throw Error();
        name(r.projectName,'Project name'); name(r.calculationName,'Calculation name'); validateSnapshot(r.snapshot); ids.add(r.id);
      }
      return d;
    } catch { throw Error('Saved calculation data is damaged or from an unsupported version. Existing data has been left untouched; use another browser profile or export current results.'); }
  }
  function write(d) {
    try { storage.setItem(RECORDS_KEY,JSON.stringify(d)); } catch { throw Error('Could not save: browser storage is blocked or full. Existing saved calculations have been preserved. Download a PDF or copy the summary instead.'); }
  }
  function change(id,fn) {const d=read(),r=d.records.find(r=>r.id===id);if(!r)throw Error('Saved calculation was not found.');const date=new Date();fn(r,d.records,date);r.updatedAt=date.toISOString();write(d);return clone(r);}
  function trashMany(ids) {
    if(!Array.isArray(ids)||ids.some(id=>typeof id!=='string'||!id)) throw Error('Choose valid saved calculation IDs to move to trash.');
    const d=read(),byId=new Map(d.records.map(record=>[record.id,record]));
    const records=[...new Set(ids)].map(id=>{
      const record=byId.get(id);
      if(!record) throw Error('Saved calculation was not found. Nothing was moved to trash.');
      return record;
    });
    if(!records.length) return [];
    const now=new Date().toISOString();
    for(const record of records) {record.trashedAt=now;record.updatedAt=now;}
    write(d);
    return clone(records);
  }
  return {
    list({includeTrashed=false}={}) { return clone(read().records.filter(r=>includeTrashed||!r.trashedAt).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))); },
    save(snapshot,{projectName,calculationName}={}) {
      validateSnapshot(snapshot); const d=read();
      if(d.records.length>=MAX_RECORDS) throw Error(`This browser has reached the ${MAX_RECORDS}-calculation limit, including trash. Existing calculations are preserved. Copy a summary or download a PDF instead.`);
      const date=new Date(),now=date.toISOString(),project=canonicalProjectName(projectName??snapshot.projectName,d.records),calculation=calculationLabel(calculationName??snapshot.calculationName,date);
      const id=globalThis.crypto?.randomUUID?.()||`calc-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const r={id,projectName:project,calculationName:calculation,createdAt:now,updatedAt:now,trashedAt:null,snapshot:clone({...snapshot,projectName:project,calculationName:calculation,recordId:id,savedAt:now})};
      d.records.push(r);write(d);return clone(r);
    },
    load(id) { const r=read().records.find(r=>r.id===id);if(!r)throw Error('Saved calculation was not found.');return clone(r); },
    rename(id,names) {return change(id,(r,records,date)=>{const project=canonicalProjectName(names.projectName,records),calculation=calculationLabel(names.calculationName,date);r.projectName=project;r.calculationName=calculation;});},
    trash(id) {return trashMany([id])[0];},
    trashMany,
    restore(id) {return change(id,r=>{r.trashedAt=null;});}
  };
}
