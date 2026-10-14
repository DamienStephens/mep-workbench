import assert from 'node:assert/strict';
import * as calc from './legacy-conductor-fixtures.mjs';
import {transformerProtection} from './dist/transformer-protection.js';
// Independent fixtures: constants below are transcribed from the primary-source
// references in QA-REPORT.md, not looked up in calc.conductors/conduitSizes.
let passed=0,failed=0;
const test=(name,fn)=>{try{fn();passed++;}catch(e){failed++;console.error(`FAIL ${name}: ${e.message}`);}};
function val(r,label){assert.equal(r.error,undefined,r.error);const x=r.results.find(x=>x.label===label);assert.ok(x,`Missing ${label}`);return x.value;}
const eq=(r,l,v)=>assert.equal(val(r,l),v);
const near=(r,l,v)=>assert.ok(Math.abs(val(r,l)-v)<=0.000501,`${l}: ${val(r,l)} versus ${v}`);
const invalid=r=>{assert.ok(r.error);assert.deepEqual(r.results,[]);};
const feeder={load:100,terminal:75,ambient:30,parallelSets:1,configuration:'three-phase-3-wire',material:'copper',ocpd:0};
const service={...feeder,load:200};
// HELU NEC 2023 Table 310.16: 3 AWG Cu=100 A, 1 AWG Al=100 A at75C.
test('100 A copper feeder uses 3 AWG and an 8 AWG Cu EGC',()=>{const r=calc.conductor(feeder);eq(r,'Copper conductor per set','3 AWG');eq(r,'Combined usable ampacity',100);eq(r,'Base-minimum Cu EGC per raceway','8 AWG');});
test('100 A aluminum feeder uses 1 AWG',()=>{const r=calc.conductor({...feeder,material:'aluminum'});eq(r,'Aluminum conductor per set','1 AWG');eq(r,'Combined usable ampacity',100);});
// Four CCC x0.8 and 40C ambient x0.91. Cu #2=130x.728=94.64 fails;
// Cu #1=145x.728=105.56 passes. Al1/0=135x.728=98.28 fails;
// Al2/0=150x.728=109.2 passes.
for(const [material,size,amp] of [['copper','1 AWG',105.56],['aluminum','2/0 AWG',109.2]])test(`${material} combined ambient and CCC correction`,()=>{const r=calc.conductor({...feeder,material,ambient:40,configuration:'three-phase-4-wire'});eq(r,`${material==='copper'?'Copper':'Aluminum'} conductor per set`,size);near(r,'Combined usable ampacity',amp);eq(r,'CCC per raceway',4);});
test('60 C termination caps 90 C insulation: 50 A needs 6 AWG Cu',()=>{const r=calc.conductor({...feeder,load:50,terminal:60});eq(r,'Copper conductor per set','6 AWG');eq(r,'Usable ampacity per set',55);});
test('90 C terminal is an unverified equipment-rating design assumption',()=>{const r=calc.conductor({...feeder,terminal:90});assert.equal(r.error,undefined);assert.match(r.warnings.join(' '),/90°C.*design assumption/);});
test('90 C design assumption does not bypass 240.4(D) #12 Cu 20 A cap',()=>eq(calc.conductor({...feeder,load:25,terminal:90,terminal90Confirmed:true}),'Copper conductor per set','10 AWG'));
test('Al #12 15 A small-wire cap forces #10 at20 A',()=>eq(calc.conductor({...feeder,load:20,material:'aluminum'}),'Aluminum conductor per set','10 AWG'));
test('Al #10 25 A cap forces #8 at30 A',()=>eq(calc.conductor({...feeder,load:30,material:'aluminum'}),'Aluminum conductor per set','8 AWG'));
test('No next-size-up: 85 A #4 Cu cannot serve90 A OCPD',()=>{const r=calc.conductor({...feeder,load:85});eq(r,'Total OCPD',90);eq(r,'Copper conductor per set','3 AWG');});
test('400 A two-raceway feeder uses 3/0 per set and full3 AWG EGC each',()=>{const r=calc.conductor({...feeder,load:400,parallelSets:2});eq(r,'Copper conductor per set','3/0 AWG');eq(r,'Combined usable ampacity',400);eq(r,'Base-minimum Cu EGC per raceway','3 AWG');eq(r,'Separate raceways',2);near(r,'Actual fill per raceway',100*(3*.2679+.0973)/3.356);eq(r,'Minimum raceway per set','2 in.');});
test('Parallel conductors retain1/0 general minimum',()=>eq(calc.conductor({...feeder,load:100,parallelSets:2}),'Copper conductor per set','1/0 AWG'));
test('Total modeled OCPD above4000 A rejected even with20 sets',()=>invalid(calc.conductor({...feeder,load:4001,parallelSets:20})));
for(const [material,size,capacity] of [['copper','3/0 AWG',200],['aluminum','250 kcmil',205]])test(`200 A commercial service ${material}`,()=>{const r=calc.service({...service,material});eq(r,`${material==='copper'?'Copper':'Aluminum'} service phase conductor per set`,size);eq(r,'Combined phase ampacity',capacity);eq(r,'Grounding / bonding / conduit','Not calculated');assert.ok(!r.results.some(x=>/EGC|EMT/.test(x.label)));});
test('Service four CCC correction selects4/0 Cu,208 A',()=>{const r=calc.service({...service,configuration:'three-phase-4-wire'});eq(r,'Copper service phase conductor per set','4/0 AWG');eq(r,'Combined phase ampacity',208);});
test('Service preadjusted load has no extra125% multiplier',()=>eq(calc.service(service),'Total service OCPD',200));
test('General service model60 A minimum',()=>eq(calc.service({...service,load:40}),'Total service OCPD',60));
test('45 kVA480/208 V3phase nameplate currents',()=>{const r=calc.transformer({kva:45,primary:480,secondary:208,primaryPhase:3,secondaryPhase:3});near(r,'Primary full-load current',45000/(Math.sqrt(3)*480));near(r,'Secondary full-load current',45000/(Math.sqrt(3)*208));});
test('25 kVA480/240 V1phase uses full winding voltage',()=>{const r=calc.transformer({kva:25,primary:480,secondary:240,primaryPhase:1,secondaryPhase:1});near(r,'Primary full-load current',25000/480);near(r,'Secondary full-load current',25000/240);});
test('Power8000 W at0.8 PF equals10000 VA',()=>eq(calc.power({mode:'wattsToVA',watts:8000,pf:.8}),'Apparent power',10000));
test('Power12500 VA at0.72 PF equals9000 W',()=>eq(calc.power({mode:'vaToWatts',va:12500,pf:.72}),'Real power',9000));
test('Single phase240 V20 A0.9 PF equals4320 W',()=>eq(calc.amps({mode:'ampsToWatts',value:20,voltage:240,phase:1,pf:.9}),'Real input power',4320));
test('Balanced three phase480 V30 A0.85 PF',()=>{const r=calc.amps({mode:'ampsToWatts',value:30,voltage:480,phase:3,pf:.85});near(r,'Real input power',Math.sqrt(3)*480*30*.85);near(r,'Apparent power',Math.sqrt(3)*480*30);});
test('10 kW208 V three phase0.8 PF current',()=>near(calc.amps({mode:'wattsToAmps',value:10000,voltage:208,phase:3,pf:.8}),'Current',10000/(Math.sqrt(3)*208*.8)));
// NEC2017 original Ch9: standard noncompact THHN areas. Final2023 table not independently accessed.
for(const [count,fill] of [[1,53],[2,31],[3,40]])test(`Conduit${count} conductors allowable${fill}%`,()=>eq(calc.conduit({rows:[{size:'12',count}],trade:'1/2'}),'Permitted fill',fill));
test('Nine#12 THHN in half-inch EMT pass: .1197 < .1216',()=>{const r=calc.conduit({rows:[{size:'12',count:9}],trade:'1/2'});eq(r,'Fill check','Within fill limit');near(r,'Actual fill',.1197/.304*100);});
test('Ten#12 THHN in half-inch EMT fail: .133 > .1216',()=>eq(calc.conduit({rows:[{size:'12',count:10}],trade:'1/2'}),'Fill check','Exceeds fill limit'));
test('Two#4 THHN use31%: .1648/.533 passes3/4 EMT',()=>{const r=calc.conduit({rows:[{size:'4',count:2}],trade:'auto'});eq(r,'Selected EMT','3/4 in.');near(r,'Actual fill',.1648/.533*100);});
test('Three#4 THHN use40%: .2472 requires1 inch EMT',()=>eq(calc.conduit({rows:[{size:'4',count:3}],trade:'auto'}),'Selected EMT','1 in.'));
// Standalone AC model now uses NEC 2017 Table 9 impedance rather than K/CM.
const vd={size:'8',length:320,current:32,voltage:240,target:3,phase:1,material:'copper'};
test('Table 9 steel copper #8 at unity PF gives15.9744 V',()=>{const r=calc.drop(vd);near(r,'Estimated voltage drop',2*.78*320*32/1000);near(r,'Percentage voltage drop',100*2*.78*320*32/1000/240);});
test('Same geometry aluminum Table 9 resistance',()=>near(calc.drop({...vd,material:'aluminum'}),'Estimated voltage drop',2*1.3*320*32/1000));
test('Three phase drop uses sqrt3, not2',()=>near(calc.drop({...vd,phase:3,voltage:480}),'Estimated voltage drop',Math.sqrt(3)*.78*320*32/1000));
const box={size:'12',conductors:6,grounds:5,yokes:1,studs:0,clamps:true,volume:24};
test('Box6 insulated+5EGC+clamp+yoke =10.25 allowances23.0625in3',()=>{const r=calc.box(box);eq(r,'Volume allowances',10.25);near(r,'Required box volume',23.0625);eq(r,'Volume check','Sufficient volume');});
test('Box exact physical boundary23.0624 is insufficient',()=>eq(calc.box({...box,volume:23.0624}),'Volume check','Insufficient volume'));
test('Box two support types add two allowances',()=>near(calc.box({...box,studs:2}),'Required box volume',27.5625));
// Combined ampacity/VD fixtures. A20 A design with actual16 A is intentionally separate.
const integrated={...feeder,load:20,configuration:'single-phase-2-wire',voltageDropEnabled:true,current:16,length:150,voltage:120,target:3,phase:1};
test('Integrated20 A feeder150ft selects6AWG, upsize ground and recalc EMT',()=>{const r=calc.conductor(integrated);eq(r,'Initial ampacity conductor per set','12 AWG');eq(r,'Copper conductor per set','6 AWG');eq(r,'Modeled Cu EGC per raceway','6 AWG');near(r,'Estimated voltage drop',61920/26240);eq(r,'Required Cu EGC area before rounding',26240);eq(r,'Minimum raceway per set','3/4 in.');near(r,'Actual fill per raceway',3*.0507/.533*100);assert.ok(61920/16510>3.6,'Previous8AWG fails target');});
test('Integrated actual current not design load drives drop',()=>near(calc.conductor(integrated),'Voltage-drop current',16));
test('Integrated Al100 A500ft chooses250kcmil and3AWG Cu EGC',()=>{const r=calc.conductor({...feeder,material:'aluminum',voltageDropEnabled:true,current:80,length:500,voltage:208,target:3,phase:3});eq(r,'Initial ampacity conductor per set','1 AWG');eq(r,'Aluminum conductor per set','250 kcmil');eq(r,'Modeled Cu EGC per raceway','3 AWG');near(r,'Required Cu EGC area before rounding',16510*250000/83690);near(r,'Estimated voltage drop',Math.sqrt(3)*21.2*500*80/250000);near(r,'Actual fill per raceway',(3*.397+.0973)/3.356*100);assert.ok(Math.sqrt(3)*21.2*500*80/211600>208*.03,'Previous4/0 fails');});
test('Parallel VD divides operating current, preserves full-total EGC',()=>{const r=calc.conductor({...feeder,load:400,parallelSets:2,voltageDropEnabled:true,current:320,length:600,voltage:480,target:3,phase:3});eq(r,'Copper conductor per set','3/0 AWG');near(r,'Estimated voltage drop',Math.sqrt(3)*12.9*600*160/167800);eq(r,'Modeled Cu EGC per raceway','3 AWG');eq(r,'EGC proportional increase',1);});
test('Service integrated VD stays separate from grounding/raceway design',()=>{const r=calc.service({...service,voltageDropEnabled:true,current:160,length:600,voltage:208,target:3,phase:3});eq(r,'Copper service phase conductor per set','350 kcmil');near(r,'Estimated voltage drop',Math.sqrt(3)*12.9*600*160/350000);eq(r,'Grounding / bonding / conduit','Not calculated');assert.ok(!r.results.some(x=>/EGC|EMT/.test(x.label)));});
for(const [name,delta] of [['missing operating current',{current:undefined}],['current exceeds design',{current:21}],['phase mismatch',{phase:3}],['impossible target',{target:.00001}],['unbalanced split120V',{configuration:'split-phase-3-wire'}]])test(`Integrated guard:${name}`,()=>invalid(calc.conductor({...integrated,...delta})));
// Eaton450.3(B) fixtures. The125% cells alone permit next standard OCPD.
const tp={kva:45,phase:3,primary:480,secondary:208,protection:'dual',primaryOcpd:0,secondaryOcpd:0,configuration:'three-phase-3-wire',secondaryRule:'10ft',lengthFt:8,installationConfirmed:true,designLoad:125,material:'copper',terminal:75,ambient:30,parallelSets:1};
test('45kVA dual ceiling125 A primary and175 A secondary',()=>{const r=transformerProtection(tp);eq(r,'Maximum modeled primary OCPD',125);eq(r,'Maximum modeled secondary transformer OCPD',175);eq(r,'Selected primary OCPD',60);eq(r,'Selected secondary OCPD',125);eq(r,'Secondary phase conductor per set','1 AWG Cu');});
test('45kVA primary-only125% rounds up to70 A',()=>{const r=transformerProtection({...tp,protection:'primary-only',primaryOcpd:70});eq(r,'Maximum modeled primary OCPD',70);});
test('45kVA dual250% hard ceiling rejects150 A',()=>invalid(transformerProtection({...tp,primaryOcpd:150})));
test('45kVA secondary125% allows175 A',()=>{const r=transformerProtection({...tp,primaryOcpd:125,secondaryOcpd:175});eq(r,'Secondary phase conductor per set','2/0 AWG Cu');eq(r,'Required combined phase ampacity',175);});
test('45kVA secondary200 A exceeds175 A permitted maximum',()=>invalid(transformerProtection({...tp,secondaryOcpd:200})));
test('75kVA dual ceilings225 A and300 A',()=>{const r=transformerProtection({...tp,kva:75,designLoad:250,primaryOcpd:225,secondaryOcpd:300});eq(r,'Maximum modeled primary OCPD',225);eq(r,'Maximum modeled secondary transformer OCPD',300);eq(r,'Secondary phase conductor per set','350 kcmil Cu');});
test('75kVA10ft floor51.923 A does not exceed150 A secondary OCPD',()=>{const r=transformerProtection({...tp,kva:75,designLoad:100,primaryOcpd:225,secondaryOcpd:150});eq(r,'Required combined phase ampacity',150);eq(r,'Secondary phase conductor per set','1/0 AWG Cu');});
test('75kVA25ft ratio floor173.077 A controls over150 A secondary breaker',()=>{const r=transformerProtection({...tp,kva:75,designLoad:100,primaryOcpd:225,secondaryOcpd:150,secondaryRule:'25ft',lengthFt:25});near(r,'Required combined phase ampacity',225*480/208/3);eq(r,'Secondary phase conductor per set','2/0 AWG Cu');});
test('Transformer Al corrected4CCC40C checks minimum3/0 at125 A',()=>{const r=transformerProtection({...tp,material:'aluminum',configuration:'three-phase-4-wire',ambient:40});eq(r,'Secondary phase conductor per set','3/0 AWG Al');near(r,'Combined usable phase ampacity',175*.91*.8);});
test('Transformer60C terminal forces1/0Cu for125 A',()=>eq(transformerProtection({...tp,terminal:60}),'Secondary phase conductor per set','1/0 AWG Cu'));
test('Transformer parallel600 A output requires2sets350Cu',()=>{const r=transformerProtection({...tp,kva:150,designLoad:500,secondaryOcpd:600,parallelSets:2});eq(r,'Secondary phase conductor per set','350 kcmil Cu');eq(r,'Combined usable phase ampacity',620);});
const small={...tp,phase:1,primary:480,secondary:240,configuration:'single-phase-2-wire',protection:'primary-only',designLoad:1};
test('Primary exact9 A uses125% next standard15 A',()=>{const r=transformerProtection({...small,kva:4.32});eq(r,'Maximum modeled primary OCPD',15);assert.ok(r.steps.some(s=>s.includes('125%')));});
test('Primary just below9 A uses167% hard ceiling',()=>{const r=transformerProtection({...small,kva:4.31952});eq(r,'Maximum modeled primary OCPD',15);assert.ok(r.steps.some(s=>s.includes('167%')));});
test('Primary exact2 A uses167% and no supported15 A device',()=>{const r=transformerProtection({...small,kva:.96});invalid(r);assert.match(r.error,/167%/);});
test('Primary below2 A uses300% and no supported15 A device',()=>{const r=transformerProtection({...small,kva:.95952});invalid(r);assert.match(r.error,/300%/);});
test('Secondary below9 A167% is hard cap:8 A cannot round to15 A',()=>{const r=transformerProtection({...small,protection:'dual',kva:1.92,primary:120});invalid(r);assert.match(r.error,/Secondary.*167%/);});
for(const [name,delta] of [['length exceeds10ft',{lengthFt:10.001}],['length exceeds25ft',{secondaryRule:'25ft',lengthFt:25.001}],['outside rule',{secondaryRule:'outside'}],['MV scope',{primary:4160}],['unsupported insulation',{insulation:'XHHW'}]])test(`Transformer guard:${name}`,()=>invalid(transformerProtection({...tp,...delta})));
for(const delta of [{installationConfirmed:false},{terminal:90}])test('Transformer uses explicit unverified design basis',()=>{const r=transformerProtection({...tp,...delta});assert.equal(r.error,undefined);assert.match(r.warnings.join(' '),/unverified design assumption/);assert.doesNotMatch(r.steps.join(' '),/explicitly confirmed/);});
test('Transformer ordinary120 V three-phase input rejected',()=>invalid(transformerProtection({...tp,primary:120})));
test('Transformer split120/240 secondary requires full240 V',()=>invalid(transformerProtection({...small,configuration:'split-phase-3-wire',secondary:120,kva:10})));
console.log(`${passed} independent source-backed worked examples passed; ${failed} failed`);
if(failed)process.exitCode=1;
