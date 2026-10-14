import { summaryFromSnapshot, engineeringReviewNote } from './calculation-records.js?v=2.12.0';
// A dependency-free PDF 1.4 writer. ASCII output keeps xref byte offsets exact.
// No network requests, uploaded data, mutable shared buffers or print dialog.
export function pdfText(value) {
  return String(value??'').replace(/√/g,'sqrt').replace(/×/g,' x ').replace(/÷/g,' / ').replace(/Ω/g,'ohm').replace(/°/g,' deg ').replace(/²/g,'^2').replace(/³/g,'^3').replace(/¼/g,'1/4').replace(/≥/g,'>=').replace(/≤/g,'<=').replace(/→/g,' -> ').replace(/[–—−]/g,'-').replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/·/g,' ').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7e\n]/g,'?');
}
const widths=[278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
const measure=(text,size)=>[...text].reduce((n,c)=>n+(widths[c.charCodeAt(0)-32]||600),0)*size/1000;
const escape=text=>text.replace(/([\\()])/g,'\\$1');
function wrap(text,maxWidth,size,normalize=pdfText) {
  const lines=[];
  for(const paragraph of normalize(text).split('\n')) {
    let line='';
    for(const word of paragraph.split(/\s+/).filter(Boolean)) {
      if(line && measure(line+' '+word,size)>maxWidth){lines.push(line);line='';}
      let part='';
      for(const char of word) {
        if(measure(part+char,size)>maxWidth){if(line){lines.push(line);line='';}lines.push(part);part='';}
        part+=char;
      }
      line+=(line?' ':'')+part;
    }
    lines.push(line);
  }
  return lines;
}
export function createPDF(snapshot) {
  summaryFromSnapshot(snapshot); // Shared full validation; a failed calculation cannot be exported.
  const s=snapshot,pages=[];let ops=[],y=0;
  // Historical PDFs preserve their original sqrt3 spelling and byte layout.
  const version=s.appVersion.match(/^(\d+)\.(\d+)(?:\.|$)/);
  const exactRoots=version&&(Number(version[1])>2||(Number(version[1])===2&&Number(version[2])>=5));
  const reportText=value=>pdfText(exactRoots?String(value??'').replace(/√3/g,'sqrt(3)'):value);
  const emit=(text,x,top,size=10,bold=false)=>ops.push(`BT /${bold?'F2':'F1'} ${size} Tf 1 0 0 1 ${x} ${top} Tm (${escape(reportText(text))}) Tj ET`);
  const rule=top=>ops.push(`0.78 G 48 ${top} m 564 ${top} l S 0 G`);
  function newPage(){if(ops.length)pages.push(ops);ops=[];emit('MEP WORKBENCH',48,752,11,true);emit('ELECTRICAL CALCULATION REPORT',339,752,9);rule(739);y=719;}
  function ensure(height){if(y-height<61)newPage();}
  function text(value,{size=10,bold=false,indent=0,gap=5}={}){
    const lines=wrap(value,516-indent,size,reportText),leading=size*1.4;
    for(const line of lines){ensure(leading);emit(line,48+indent,y,size,bold);y-=leading;}
    y-=gap;
  }
  function heading(title){ensure(47);y-=9;text(title.toUpperCase(),{size:10,bold:true,gap:7});}
  function rows(items,results=false){for(const r of items)text(`${r.label}: ${results?(r.displayValue??r.value):r.value}${r.unit?' '+r.unit:''}`,{gap:4});}
  newPage();
  text(s.moduleTitle,{size:20,bold:true,gap:9});
  text(`Project: ${s.projectName}`,{size:11,bold:true});
  text(`Calculation: ${s.calculationName}`,{size:11});
  text(`Generated: ${s.generatedAt} | Application: ${s.appVersion}`,{size:9});
  if(s.recordId){text(`Saved record: ${s.recordId}`,{size:9});text(`Saved: ${s.savedAt}`,{size:9});}
  text(`Code basis: ${s.codeEdition}`,{size:9,gap:8});
  const reviewNote=engineeringReviewNote(s.appVersion);
  text('Design aid. Verify the adopted code, site conditions and equipment listings before use.',{size:9});
  if(reviewNote) text(reviewNote,{size:9});
  heading('Inputs'); rows(s.inputRows);
  // Use snapshot-owned display text only; do not reinterpret legacy reports.
  heading('Results'); rows(s.result.results,true);
  if(s.moduleId==='conductor'&&!s.result.results.some(r=>r.label==='Estimated voltage drop')) text('Voltage drop is not calculated for this snapshot; check the actual circuit separately.',{size:9});
  if(s.moduleId==='service') text(`Service neutral, grounding, bonding and conduit fill are not calculated; separate design is required.${s.result.results.some(r=>r.label==='Estimated voltage drop')?'':' Voltage drop is not calculated for this snapshot.'}`,{size:9});
  heading('Calculation method');s.result.steps.forEach((v,i)=>text(`${i+1}. ${v}`,{size:9.5,gap:6}));
  heading('Assumptions, warnings & scope');[...new Set([...s.result.warnings,...s.limitations])].forEach(v=>text(`- ${v}`,{size:9.5,gap:7}));
  heading('Source references');s.result.sources.forEach((v,i)=>{ensure(Math.min(100,wrap(`${i+1}. ${v.label}`,516,9.5,reportText).length*13.3+30));text(`${i+1}. ${v.label}`,{size:9.5,gap:2});if(v.url)text(v.url,{size:8.5,gap:9});});
  pages.push(ops);
  pages.forEach((commands,i)=>{ops=commands;rule(49);emit('For qualified review; not a permit, approval or installation certification.',48,34,8);emit(`Page ${i+1} of ${pages.length}`,499,34,8);});
  const objects=[null,'<< /Type /Catalog /Pages 2 0 R >>',null,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'];
  const kids=[];
  for(const commands of pages){const pageId=objects.length,streamId=pageId+1;kids.push(`${pageId} 0 R`);objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${streamId} 0 R >>`);const stream=commands.join('\n');objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);}
  objects[2]=`<< /Type /Pages /Count ${pages.length} /Kids [${kids.join(' ')}] >>`;
  const infoId=objects.length;
  objects.push(`<< /Title (${escape(reportText(s.calculationName+' - '+s.moduleTitle))}) /Author (MEP Workbench) /Subject (${escape(reportText(s.projectName))}) /Creator (MEP Workbench ${escape(reportText(s.appVersion))}) >>`);
  let pdf='%PDF-1.4\n',offsets=[0];
  for(let i=1;i<objects.length;i++){offsets.push(pdf.length);pdf+=`${i} 0 obj\n${objects[i]}\nendobj\n`;}
  const xref=pdf.length;pdf+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for(let i=1;i<objects.length;i++)pdf+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;
  pdf+=`trailer\n<< /Size ${objects.length} /Root 1 0 R /Info ${infoId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}
export function downloadPDF(snapshot) {
  const bytes=createPDF(snapshot);
  if(!globalThis.document || !globalThis.URL?.createObjectURL)throw Error('PDF download is unavailable in this browser. Copy the summary instead.');
  const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
  const link=document.createElement('a');link.href=url;link.download=`${pdfText(snapshot.projectName+'-'+snapshot.calculationName).replace(/[^a-zA-Z0-9_-]+/g,'-').slice(0,100)||'calculation'}.pdf`;link.hidden=true;document.body.append(link);
  try {link.click();} finally {link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
  return {filename:link.download,byteLength:bytes.byteLength};
}
