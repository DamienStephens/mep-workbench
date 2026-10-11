// Static grayscale and presentation contracts; not real-browser visual QA.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = name => fs.readFileSync(new URL(name, import.meta.url), 'utf8');
const css = read('./dist/styles.css');
const html = read('./dist/index.html');
const theme = read('./dist/theme.js');
const palettes = [...css.matchAll(/:root(?:\[data-theme="dark"\])? \{([^}]+)\}/g)].map(m => m[1]);
assert.equal(palettes.length, 2, 'Both theme palettes must be checked');
const gray = (hex, label) => {
 const expanded = hex.length === 4 ? '#' + [...hex.slice(1)].map(c => c + c).join('') : hex;
 const [r, g, b] = expanded.slice(1).match(/../g).map(v => parseInt(v, 16));
 assert.equal(r, g, `${label}: red and green differ`);
 assert.equal(g, b, `${label}: green and blue differ`);
};
const baseTokens = ['canvas','surface','subtle','ink','muted','line','control','accent','selected'];
for (const [i, block] of palettes.entries()) {
 const tokens = Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[\da-f]{6})/gi)].map(m => [m[1],m[2]]));
 for (const name of baseTokens) {
  assert.ok(tokens[name], `${i}: missing ${name}`);
  gray(tokens[name], `${i}: ${name}`);
 }
}
// Permit warning/error tokens and the explicitly scoped voltage-drop status rules.
const nonSemantic = css.replace(/[^{}]*\.result-hero\.drop-(?:green|orange|red)[^{}]*\{[^{}]*\}/g,'').replace(/--(?:warning|error)-(?:bg|ink|line):\s*#[\da-f]{6};/gi, '');
for (const hex of nonSemantic.match(/#[\da-f]{6}\b|#[\da-f]{3}\b/gi) || []) gray(hex, 'Non-semantic CSS');
for (const hex of (html + theme).match(/#[\da-f]{6}\b|#[\da-f]{3}\b/gi) || []) gray(hex, 'Browser chrome');
assert.doesNotMatch(nonSemantic, /\b(?:rgba?|hsla?|oklch|color-mix)\(/i);
assert.match(css, /::selection\{background:var\(--selected\);color:var\(--ink\)\}/);
assert.match(css, /accent-color:var\(--accent\)/);
assert.match(css, /\.nav-item\.active\{border-left-color:var\(--ink\)/);
assert.match(css, /\.nav-item\.active\{border-bottom-color:var\(--ink\)\}/);
for (const selector of ['.panel,.result-hero,.metric-grid', '.metric-grid', '.metric', '.module-grid']) {
 const rule = css.slice(css.indexOf(selector + '{')).split('}')[0];
 assert.ok(rule.startsWith(selector + '{'), `${selector} exists`);
 assert.doesNotMatch(rule, /border:|border-radius:|background:/, `${selector} stays flat`);
}
assert.match(css, /\.field input\[aria-invalid=true\]\{border-color:var\(--error-ink\)\}/);
assert.match(css, /\.warning\{background:var\(--warning-bg\);color:var\(--warning-ink\)/);
assert.match(css, /\.error\{background:var\(--error-bg\);color:var\(--error-ink\)/);
// The desktop rail has a theme-aware divider; the narrow top navigation swaps it horizontally.
assert.match(css, /\.sidebar\{[^}]*border-right:1px solid var\(--line\)/);
const mobile = css.slice(css.indexOf('@media(max-width:760px){'), css.indexOf('@media(max-width:520px){'));
assert.match(mobile, /\.sidebar\{[^}]*border-right:0;border-bottom:1px solid var\(--line\)/);
assert.match(css, /\*\{box-sizing:border-box\}/);
assert.match(css, /\.sidebar\{[^}]*width:184px/);
assert.match(css, /\.main-wrap\{margin-left:184px;width:calc\(100% - 184px\)/);
console.log('Both grayscale themes, semantic color isolation, flat UI and neutral interaction contracts passed.');
