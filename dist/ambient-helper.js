// Site-specific ambient selection; no building-type temperature presets.
export const ambientConditions = {
  conditioned: ['Indoor · conditioned', 'Ask the facility or HVAC designer for the maximum design air temperature along the entire conductor route. Confirm cooling is maintained whenever the circuit operates; a room thermostat setting alone is not the design maximum.'],
  outdoor: ['Outdoor / unconditioned', 'Obtain site-specific outdoor design conditions from the project engineer or ASHRAE Handbook—Fundamentals. Assess sun, nearby equipment and every unconditioned route segment. A weather average, current forecast or one spot measurement does not establish the design maximum.'],
  attic: ['Attic / hot equipment space', 'Obtain a localized design maximum from the engineer, a thermal assessment, or measurements that represent the hottest operating conditions. Include roof heat, ventilation and equipment heat. Do not use outdoor weather temperature alone or assume a fixed attic temperature.'],
  rooftop: ['Rooftop', 'Establish the outdoor design temperature, direct-sun exposure and clearance from the roof to the bottom of the raceway or cable. Under NEC 2023 310.15(B)(2), the rooftop adder is 33°C for direct sun with clearance below 3/4 inch. XHHW-2 is excepted; the THHN/THWN-2 used here is not. Verify the locally adopted edition.'],
  custom: ['Other / engineered condition', 'Use a documented design maximum for the air surrounding the conductor along its route, including localized heat and any applicable code adders. Have the project engineer resolve unknown conditions.']
};
export const ambientReference = 'https://link.nfpa.org/publications/70/2023/chapters/3/articles/310';
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function ambientCelsius(value, unit = 'C') {
  if (!['C', 'F'].includes(unit) || typeof value === 'boolean' || value == null || String(value).trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? (unit === 'F' ? (n - 32) * 5 / 9 : n) : null;
}
export function evaluateAmbient({value, unit = 'C', condition = 'custom', rooftop = 'unverified', min = -10, max = 80}) {
  if (!Object.hasOwn(ambientConditions, condition)) return {error: 'Choose an installation condition.'};
  const c = ambientCelsius(value, unit);
  if (c === null) return {error: 'Enter a finite, site-specific design temperature.'};
  if (condition === 'rooftop' && !['adder', 'effective'].includes(rooftop)) return {error: 'Resolve the rooftop conditions before applying a temperature.'};
  const adder = condition === 'rooftop' && rooftop === 'adder' ? 33 : 0;
  // Keep the full converted value: rounding down can cross an ampacity table boundary.
  const effective = c + adder;
  if (effective < min || effective > max) return {error: `Effective ambient is outside this calculator’s ${min} to ${max}°C range. Do not cap the temperature; obtain a separate engineering calculation.`};
  return {celsius: effective, adder, note: `${ambientConditions[condition][0]}: ${value}°${unit}${adder ? ' + 33°C rooftop adder' : ' (including any applicable heat effects)'}; effective ambient ${Number(effective.toFixed(3))}°C. Entered design basis is an unverified assumption; verify actual route temperature and heat effects before installation.`};
}

export function attachAmbientHelper(form) {
  const ambient = form?.querySelector('input[name="ambient"]');
  if (!ambient || form.querySelector('[data-ambient-assistant]')) return null;
  const doc = ambient.ownerDocument;
  const helper = doc.createElement('details');
  helper.dataset.ambientAssistant = '';
  helper.className = 'ambient-helper';
  const prefix = `${form.id || 'calculator'}-ambient-helper`;
  helper.innerHTML = `<summary style="cursor:pointer;font-weight:600">Ambient help</summary><div style="display:grid;gap:12px;padding-top:12px"><small>Ambient means the air surrounding the conductor. 30°C (86°F) is the ampacity-table reference, not a universal installation temperature.</small><div class="field"><label for="${prefix}-condition">Where does the conductor run?</label><select id="${prefix}-condition" data-condition>${Object.entries(ambientConditions).map(([key,[label]])=>`<option value="${key}">${esc(label)}</option>`).join('')}</select></div><small data-guidance></small><div class="field" data-roof-section hidden><label for="${prefix}-roof">Rooftop calculation method</label><select id="${prefix}-roof" data-roof><option value="unverified">Choose rooftop calculation method</option><option value="adder">Assume direct sun, below 3/4 in., THHN/THWN-2; add 33°C</option><option value="effective">Entered effective ambient includes heat effects; no additional adder</option></select><small>Adder option uses the NEC 2023 threshold. Enter outdoor temperature before the adder. For an effective ambient that already includes heat effects, choose the second option to avoid double counting.</small><a href="${ambientReference}" target="_blank" rel="noopener noreferrer">NEC 2023 310.15(B)(2) and Table 310.15(B)(1)(1) · modeled provisions checked against published text ↗</a></div><div class="field"><label for="${prefix}-value" data-value-label>Site-specific design maximum</label><input id="${prefix}-value" type="number" step="any" data-ambient-helper data-value inputmode="decimal" placeholder="Enter documented temperature"><small>Use engineering design data or measurements representative of maximum operating conditions, not an average or a single current reading.</small></div><div class="field"><label for="${prefix}-unit">Temperature unit</label><select id="${prefix}-unit" data-unit><option value="C">Celsius (°C)</option><option value="F">Fahrenheit (°F)</option></select></div><small data-preview role="status" aria-live="polite"></small><button type="button" class="button" data-apply>Apply ambient temperature</button><small data-applied role="status" aria-live="polite"></small></div>`;
  ambient.closest('.field').append(helper);
  const get = name => helper.querySelector(`[data-${name}]`);
  const read = () => evaluateAmbient({value:get('value').value,unit:get('unit').value,condition:get('condition').value,rooftop:get('roof').value,min:ambient.min === '' ? -10 : Number(ambient.min),max:ambient.max === '' ? 80 : Number(ambient.max)});
  function refresh() {
    const isRoof = get('condition').value === 'rooftop';
    get('roof-section').hidden = !isRoof;
    get('guidance').textContent = ambientConditions[get('condition').value][1];
    get('value-label').textContent = isRoof && get('roof').value === 'adder' ? 'Outdoor design maximum (before rooftop adder)' : 'Site-specific effective design maximum';
    const result = read();
    get('preview').textContent = result.error || `Apply ${Number(result.celsius.toFixed(3))}°C (${Number((result.celsius * 9 / 5 + 32).toFixed(2))}°F)${result.adder ? ', including the 33°C rooftop adder' : ''}.`;
    get('apply').disabled = Boolean(result.error);
  }
  for (const type of ['input', 'change']) helper.addEventListener(type, event => {
    event.stopPropagation();
    get('applied').textContent = '';
    refresh();
  });
  get('apply').addEventListener('click', () => {
    const result = read();
    if (result.error) { refresh(); return; }
    ambient.value = String(result.celsius);
    ambient.dataset.ambientBasis = result.note;
    const EventClass = doc.defaultView?.CustomEvent || CustomEvent;
    ambient.dispatchEvent(new EventClass('change', {bubbles:true, detail:{ambientBasis:result.note}}));
    get('applied').textContent = `Applied. ${result.note}`;
    ambient.focus();
  });
  refresh();
  return helper;
}
