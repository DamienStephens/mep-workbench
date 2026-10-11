import assert from 'node:assert/strict';
import {writeFileSync,mkdtempSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import * as calc from './dist/calc.js';
import {createSnapshot} from './dist/calculation-records.js';
import {createPDF,pdfText} from './dist/pdf-report.js';
const inputs={material:'aluminum',load:800,configuration:'three-phase-4-wire',parallelSets:4,terminal:75,ambient:40,ocpd:0};
const snapshot=createSnapshot({id:'service',title:'Service conductor sizing',fields:[],limitations:['Separate grounding and bonding design required.']},inputs,calc.service(inputs),{projectName:'North Wing (Renovation)',calculationName:'Main / 800A',generatedAt:'2026-10-11T00:00:00.000Z'});
const bytes=createPDF(snapshot),text=new TextDecoder().decode(bytes);assert.ok(text.startsWith('%PDF-1.4'));assert.ok(text.endsWith('%%EOF\n'));assert.match(text,/\/Type \/Pages \/Count [2-9]/);assert.match(text,/Separate grounding/);assert.match(text,/Page 1 of/);assert.match(text,/\/Title/);assert.deepEqual(bytes,createPDF(snapshot));
assert.equal(pdfText('√3 × 30°C ≥ 4 in² → ¼ Ω'),'sqrt3  x  30 deg C >= 4 in^2  ->  1/4 ohm');
const dir=mkdtempSync(join(tmpdir(),'mep-report-')),file=join(dir,'service-report.pdf');writeFileSync(file,bytes);
const extract=spawnSync('pdftotext',['-layout',file,'-'],{encoding:'utf8'});
if(!extract.error){assert.equal(extract.status,0,extract.stderr);assert.match(extract.stdout,/Total service OCPD: 800 A/);assert.match(extract.stdout,/SOURCE REFERENCES/);assert.match(extract.stdout,/www.nfpa.org/);assert.match(extract.stdout,/Separate grounding and bonding design required/);}
const info=spawnSync('pdfinfo',[file],{encoding:'utf8'});if(!info.error){assert.equal(info.status,0);assert.match(info.stdout,/Page size:\s+612 x 792/);}
const long=structuredClone(snapshot);long.projectName='W'.repeat(100);long.result.warnings.push('Long source '+('https://example.com/'+ 'abcdef'.repeat(100)));const longBytes=createPDF(long);writeFileSync(join(dir,'long-report.pdf'),longBytes);const parsed=spawnSync('pdftotext',[join(dir,'long-report.pdf'),'-'],{encoding:'utf8'});if(!parsed.error)assert.equal(parsed.status,0);
const invalid=structuredClone(snapshot);invalid.result.error='Invalid calculation';assert.throws(()=>createPDF(invalid),/valid calculated/);
console.log(`PDF report tests passed. Visual QA sample: ${file}`);
