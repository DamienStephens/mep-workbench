# MEP Workbench

Private, buildless electrical calculation website. Ten modules use pure calculation engines in `dist/calc.js`, `dist/transformer-protection.js`, `dist/cable-tray.js` and `dist/mv-cables.js`, with the UI/module registry in `dist/app.js`. Add a module by registering fields and supplying a calculation export returning results, steps, warnings, sources and optional validation error.

## Scope

NEC 2023 reference baseline, not certification. Verify the locally adopted code, amendments, equipment listings and project-specific requirements. Conductor sizing supports copper/aluminum THHN/THWN-2 through 750 kcmil per conductor, one explicit total OCPD rating, 1–20 identical sets in separate EMT, IMC, RMC, PVC Schedule 40 or PVC Schedule 80 raceways and standard total OCPD ratings through 4,000 A. Circuit configuration determines physical and current-carrying counts. No next-size-up exceptions or specialized circuits. Conduit module supports EMT and insulated THHN/THWN-2 only. Box fill supports uniform #14 through #6 conductors. Standalone voltage drop offers the bounded NEC 2023 Table 9 model (≤600 V, 60 Hz, 75°C), manufacturer-reference MV cable presets, or a series-only steady-state calculation using designer-entered project R/X, including medium voltage. The manual mode does not size or verify medium-voltage equipment or cables. Optional integrated sizing retains its separate resistance-only model.

Bounded published-NEC-2023 sources are disclosed in the UI; audit dates remain in `VERIFICATION-STATUS.md`; equipment and installation compliance remain separate. This release requires a qualified engineering review before reliance in final designs.

Inputs persist only in the visitor's browser using localStorage. No calculation API, tracking scripts or external fonts. Site access is owner-private via hosting.

## Checks

Run `npm test`. Static site output is `dist/`; no dependencies/build step needed. Hosted identity is stored in `.openai/hosting.json`.

## Known verification limit

Automated numerical regression, modeled DOM workflows and static JavaScript checks were run. Real-browser visual and keyboard QA for v2.14.0 remains unverified in this environment; no screenshot-based verification is claimed.

## v2.14.0 — MV cable voltage-drop presets through 34.5 kV

- **MV cable preset** fills R/X from a cable family, conductor size, calculation temperature and supported arrangement. The copper library contains 84 size/class entries across ten selections: the two fully documented 2.4-kV Southwire families, plus MV-90-option and MV-105 families at 5, 15, 25 and 35 kV. A 35-kV cable-class selection supports a 34.5-kV line-to-line study within the stated cable/application basis. These are cable-reference estimates, not universal MV-90/MV-105 coefficients.
- **2.4 kV:** Southwire MV-90 singles and MV-105 factory three-conductor NL-EPR/PVC use published conductor AC resistance at 90°C and inductive reactance at 60 Hz, with nonferrous-conduit geometry. Both are nonshielded. The MV-105 name does not manufacture 105°C data for this family.
- **5–35 kV MV-105:** Prysmian AIRGUARD factory three-conductor copper, EPR, tape shields and 133% insulation. Published paired positive-sequence R1/X1 is at 105°C, with short-circuited shields and no earth return. The optional 90°C calculation uses the manufacturer's estimate `R90 = 0.96 × R105`, X unchanged. Frequency is not printed in the table, so **60 Hz assumed** is visible in the form and retained in reports.
- **5–35 kV MV-90 option:** Prysmian TRXLPE URD copper singles, one-third concentric neutral and 133% insulation, at 90°C. The optional UL MV-90 construction is required. Published direct-buried R1/X1 is used as a pair. **60 Hz and application of the source's ampacity geometry/bonding notes to impedance are explicit engineering assumptions:** three singles, flat 7.5-inch adjacent center spacing, short-circuited shields. No specific bond location is claimed as manufacturer-verified.
- Presets allow one balanced three-phase circuit only. Voltage class, insulation level, cable temperature rating and calculation temperature stay distinct. The 133% application assumes ground faults cleared within one hour, with actual voltage, grounding, insulation coordination, protection and accessories separately checked. It is not a 1.33× continuous-voltage multiplier. No aluminum, missing size, single-phase return path, alternative arrangement or parallel-circuit impedance is invented.
- **Edit these R/X values** explicitly copies exact coefficients and their complete source/temperature/arrangement/assumption basis into **Project R/X**. Ordinary switching retains prior manual inputs. Routine notes are collapsed; assumptions have a visible neutral label. Invalid inputs block calculation/export, and unrounded 3%/5% voltage-drop guidance remains unchanged.
- The estimate excludes shunt capacitance/charging current, which may matter for long or lightly loaded MV circuits, plus ampacity, starting, harmonics and complete cable-system design. Reports, compact copies, save/load, dashboard resume and manual edits preserve the selected basis. Historical report/PDF bytes remain unchanged.

The 35-kV AIRGUARD 750-kcmil row is deliberately unavailable because the published R value is inconsistent; it is neither corrected nor interpolated. Other published sizes remain available. Exact sources, source columns, table revisions, all selected rows and engineering assumptions are in `MV-CABLE-SOURCES.md`.

Run `npm test` (46 suites). Automated numerical, modeled-DOM and report checks are distinct from real-browser visual/keyboard/clipboard/print/download QA, which remains unverified: the cloud-browser local-preview attempt returned connection refused. Deployment and GitHub publication are verified separately.

## v2.13.0 — watts / VA / amps in both directions

- The existing load-conversion module now offers **Watts → Amps**, **Amps → Watts**, **VA → Amps** and **Amps → VA**. The separate Watts / VA module remains available. The route and stored module ID stay `amps`, and both original mode IDs are unchanged.
- VA conversions use `S = V × I` for single-phase and `S = √3 × VLL × I` for balanced three-phase. They do not read or validate power factor and do not invent a real-watts result. PF is hidden in these modes and retained for switching back to watts. The requested output is the main result in each direction.
- Calculations use exact `Math.sqrt(3)` and unrounded internal arithmetic. Current display remains one decimal; the existing three-decimal numeric result API is preserved. New VA result rows also retain full-precision `rawValue` fields. Overflow/underflow that cannot be represented fails explicitly; zero power/current remains valid.
- The existing phase-aware voltage selector and Custom entry are unchanged. Single-phase presets now read simply **120 V**, **208 V**, etc. Guidance uses “voltage supplied to the equipment”; three-phase remains explicitly line-to-line. Voltage-drop retains **Starting Voltage**, and transformer full-winding guidance is unchanged.
- Copy summary remains inputs and outputs only. VA copies and new saved/PDF reports omit PF inputs and real-watts outputs. Stored historical reports are never rewritten; loading old W/A calculations recalculates through their original mode. Theme, dashboard/favorites, one-line sidebar layout, reset and persistence remain intact.

Run `npm test`, including `va-amps-tests.mjs` and `va-amps-ui-tests.mjs`. Automated numerical, modeled-DOM and report checks are distinct from real-browser visual/keyboard/clipboard/print/download QA; the local preview was unreachable, so those browser checks are not claimed. No new NEC model or code-compliance claim is introduced by these physics conversions.

## v2.12.0 — single voltage selectors and engineering design assumptions

- Voltage-bearing load/current/drop tools now have one phase-aware voltage dropdown with **Custom** last. A numeric voltage appears only for Custom. The redundant Standard/Custom and Nominal system controls are gone, including both transformer-current windings and optional conductor/service voltage-drop inputs. Transformer protection uses the same presentation. Cable-tray cable voltage rating remains a separate numeric rating, not a supply-voltage preset.
- Custom voltage itself selects the input basis. No manual confirmation is required. Watts/Amps and transformer nameplate-current formulas accept any positive finite voltage, including medium voltage, subject to representable finite results. Three-phase presets remain line-to-line and exclude ordinary 120 V three-phase; custom unusual values retain descriptive scope warnings. Single-phase inputs state load or full-winding basis.
- Standalone voltage drop adds **Project R/X** with required series resistance and inductive reactance in Ω/1,000 ft, plus an optional source/design-basis note. No impedance is invented or copied from Table 9. The manual mode ignores hidden size/material/raceway inputs, uses one-set R/X and divides total current once for equal parallel sets. Balanced three-phase uses positive-sequence per-phase impedance; single-phase uses equal outgoing/return conductors. This series-only steady-state approximation excludes cable charging, sheath studies, leading PF and harmonics. Long MV cable systems may need a full network/cable model. Results and new reports label project inputs as unverified and carry no Table 9 data-verification claim.
- Table 9 mode remains limited to 600 V; integrated THHN/THWN-2 conductor/service sizing remains limited to 1,000 V, Table 450.3(B) protection to 1,000 V, and tray cable ratings to 2,000 V. Custom input never lifts these code-model boundaries.
- Equipment/installation confirmation dropdowns are removed from 90°C terminations, transformer secondary rules, tray eligibility/grouping/rung spacing and ambient assistance. Selected values are design assumptions, never fabricated verification. Numerical checks and hard scope limits remain. Single-conductor tray installation eligibility stays conditional while physical-fill results retain independent pass/fail colors. Ambient rooftop method remains an explicit choice to prevent double counting. Destructive saved-record confirmations remain unchanged.
- Legacy numeric values and nominal-system constraints remain visible and blocked if incompatible until an explicit new voltage selection replaces that system basis. Custom numbers survive repeated preset switches. Startup, recent resume and saved-record load remove obsolete live confirmation claims; old saved summaries/PDF bytes are never rewritten. New reports show one voltage row with standard/custom, phase basis and retained legacy-system context when applicable.

Run `npm test` (42 suites), distribution JavaScript syntax checks and `git diff --check`. New coverage includes 672 formula/manual-impedance checks, 53 modeled UI/persistence/report workflows and cross-engine design-assumption regressions. Real-browser visual/keyboard/print/download QA, Site deployment and GitHub publishing are separate and were not performed by this implementation task.

## v2.11.0 — tray design inputs and semantic checks

- Triangle and square quantities now mean complete groups of three/four; flat and unspecified quantities mean individual conductors or complete multiconductor cables. Each row shows its physical total. NEC area and diameter-sum calculations still count every individual. Versioned input migration preserves legacy physical counts; arrangement changes preserve that total, and incomplete groups block calculation until corrected. Current browser inputs, dashboard resume and saved-record load all use the same idempotent migration. Existing saved summaries and PDFs remain unchanged.
- New single-conductor rows default to a clearly labeled **NEC Table 5 area-derived OD estimate**, calculated as `sqrt(4 × area / π)` with full internal precision for standard noncompact THHN/THWN-2, 1/0 AWG–750 kcmil (including 700 kcmil), through 600 V. It is a preliminary estimate from previously verified Table 5 areas, not a newly verified published diameter column, a manufacturer-certified dimension or an arbitrary cable-construction lookup. Estimate-based runs retain conditional status. Existing Southwire Cu SPEC 10000 and Al SPEC 10012 options remain product-specific approximate references; manual actual OD remains available. Saved manual ODs are preserved. Multiconductor jacket OD must be entered from actual product data; a single-conductor reference cannot silently become a multicable diameter.
- For 1/0–4/0 singles, 9 in. ladder rung spacing is an explicit unverified design assumption. Optional override and installation confirmation are inside a collapsed Design assumptions section. Invalid spacing greater than 9 in. is an actionable error. Larger-only singles have no artificial 9 in. requirement. Rung spacing does not mean tray support span and provides no extra fill allowance.
- Routine tray scope, provenance, ampacity and eligibility notes are retained under Calculation details. Conditional eligibility/arrangement status stays visible beside the physical-fill-only scope note at the bottom; the main result no longer leads with that disclaimer. Actual fill, layout, depth and prohibited-arrangement failures remain visible. Tray ampacity remains explicitly not calculated.
- All modeled fill and ampacity comparisons use semantic green when within their actual allowance and red when exceeded, with explanatory text in accessible light/dark colors. This includes conductor/service ampacity, conductor/conduit fill, box volume, tray fill/layout checks and bounded transformer conductor/protection comparisons. Exact unrounded values govern colors; unknown/unperformed comparisons remain neutral. Standalone nameplate currents do not acquire an ampacity claim. Existing voltage-drop orange guidance is unchanged.

Run `npm test` (39 suites), JavaScript syntax checks and `git diff --check`. New tests cover raw threshold edges, Table 5 estimate provenance, repeated arrangement changes, incomplete legacy groups, persistence/report migration, reference/manual overrides, rung assumptions, conditional placement, semantic rendering and historical PDF hashes. Browser visual, keyboard, print/download and live deployment verification remain separate and unperformed for this local release.

## v1.1.0

Voltage-bearing modules now share `dist/voltage.js`: standard North American and IEC/regional systems, phase-aware voltage choices, line-to-line versus load/full-winding basis, high-leg warnings, and an explicit custom-system acknowledgement. Incompatible saved voltages remain invalid until corrected, rather than silently changing the input. Transformer custom medium-voltage current is supported with a scope warning; other voltage modules remain within 1,000 V.

Dark mode applies early, initially follows the system setting, and saves an explicit choice locally. Printing remains light. Run `node tests.mjs`, `node ui-tests.mjs`, `node voltage-tests.mjs`, and `node theme-tests.mjs`. UI tests model DOM/input semantics; visual browser QA remains unverified.

## v1.2.0

Conductor sizing includes copper/aluminum ampacity selection and minimum EMT using the entered count of full-size insulated phase/neutral conductors plus one insulated copper EGC. The physical count is separate from CCC, must include all neutrals and must be at least CCC. Old saved entries missing physical count initialize to max(3, CCC). Standard noncompact THHN/THWN-2 areas only; verify actual product dimensions, aluminum availability/listing and terminations. No compact-conductor credit, parallel sets, mixed-size neutrals or multiple-circuit design. EGC remains copper and its Table 250.122 minimum may require separate upsizing review. Run `node conductor-fill-tests.mjs` in addition to the existing suites.

## v1.3.0

One design-load input replaces noncontinuous/continuous inputs. It is already adjusted for required continuous-load and other design allowances; no hidden multiplier. Circuit configuration replaces manual conductor/neutral counts. Three-phase 4-wire conservatively counts four CCC; split-phase 3-wire counts two only when the neutral carries imbalance. Neutrals remain full-size for fill; harmonic adequacy is not established.

Parallel sets quantity means identical complete sets, each in a separate EMT raceway. Parallel phase and neutral conductors have a general 1/0 AWG floor. Combined usable ampacity is the per-set usable ampacity times the set quantity. Every raceway includes one Cu EGC based on the TOTAL OCPD. Its displayed size is only the Table 250.122 base minimum: conductor upsizing (including the parallel-size floor), fault-path adequacy and bonding require separate review. Corresponding parallel conductors must match length, material, size, insulation and termination method, with matching raceway electrical characteristics. EGC sizes and supported fill dimensions cap total OCPD at 4,000 A.

Saved legacy inputs convert load + 1.25 × continuous to the new design load and visibly explain the change. Manual counts are discarded, parallel sets initialize to 1 and a circuit configuration must be selected before results resume. Invalid legacy load values remain blank for correction. Reset clears the migration notice and restores the defaults. Cu/Al choice and all other modules remain intact.

Run `npm test` for all numerical, conductor/fill, parallel/migration, UI, voltage and theme suites. The UI suites model DOM/input behavior; real-browser visual QA is a separate check.

## v1.3.1

Termination selector adds a conditional 90°C option requiring explicit confirmation that all connected equipment and terminations are listed and identified for 90°C ampacity under NEC 110.14(C). A 90°C wire or lug marking alone is insufficient. Confirmation resets on rating or conductor-material changes; existing 60°C/75°C selections and the 60°C default remain unchanged. Missing confirmation blocks results rather than silently substituting a rating.

Usable ampacity remains the lesser of the selected termination column and the corrected/adjusted 90°C insulation ampacity. Small-wire OCPD caps, parallel minimum size, per-raceway Cu EGC and fill rules remain unchanged. The ambient field explains surrounding air temperature and the 30°C (86°F) base. Results explicitly disclose the verified-equipment condition and include primary Schneider/Eaton references. Run `npm test`, including the new termination checks.

## v1.4.0

A separate **Service conductor sizing** module covers customer-owned, general commercial / non-dwelling service-entrance conductors up to a single main disconnect. It uses a completed preadjusted design load, Cu/Al THHN/THWN-2, 60°C/75°C/explicitly verified 90°C terminations, per-raceway ambient/CCC correction and identical parallel sets with a 1/0 minimum. The conservative combined phase ampacity must meet total service OCPD; auto selection has a 60 A floor and the tool caps total OCPD at 4,000 A. No dwelling 83% reduction, next-size exception, single-/two-circuit service exception or extra 125% multiplier is applied.

Service outputs are phase-conductor ampacity and size, not a complete service installation design. Any neutral is only an assumed full-size arrangement for CCC purposes; its load/harmonics and minimum grounded-conductor requirements need separate design. Grounding electrode conductors, main/supply-side bonding jumpers, neutral size and conduit fill are not calculated. The module does not copy feeder Table 250.122 EGC results. Review NEC 2023 230.42/230.79/230.90, 250.24(C)/(D)/(E), 250.66 and 250.102(C), utility requirements and equipment listings. Utility-owned conductors and load-side feeders are outside this service module.

Both conductor modules include an inline ambient-temperature helper with Fahrenheit/Celsius entry and route-based guidance. The entered route ambient remains user-controlled; helpers do not infer verified project design conditions. The rooftop option requires explicit condition verification and can add 33°C for applicable NEC 2023 THHN/THWN-2 installations; the sizing engine uses effective ambient and never applies the adder again. The applied basis persists with the module and appears in calculation steps; direct ambient edits clear it.

`npm test` includes service numerical, scope-isolation and UI regressions plus ambient helper checks. Browser visual verification is recorded separately; numerical passing tests are not engineering certification.

## v1.5.0

Compact tool directory replaces the marketing hero and future-tool card. Calculator pages put inputs and main results first, with restrained spacing, 44 px input/button targets and 16 px input text. All eight modules, saved inputs, hash navigation, reset, ambient guidance and dark mode remain. Calculation engines and numerical rules are unchanged.

Primary conductor results retain conductor size, total OCPD, minimum EMT, raceway count, combined ampacity and base-minimum Cu EGC. Additional metrics, methods, standing assumptions and reference lists are collapsed by default. Concise scope notes, validation errors, failed checks and conditional safety warnings remain visible. Print expands the engineering detail sections and restores their prior states afterward; the ambient-helper scratch controls are omitted, while any applied design basis remains in the calculation steps.

All entry-point and imported module URLs are cache-versioned to 1.5.0. Added compact-presentation, warning visibility, result preservation and modeled print-lifecycle regressions. `npm test` runs all suites. Real-browser visual/print QA remains blocked by the execution environment's browser socket restriction and is not claimed.

## v1.6.0

Replaced the accumulated stylesheet with one coherent responsive design: neutral slate/white in light mode, charcoal in dark mode, and restrained blue for the current tool and primary result. The navigation is a thin neutral rail; the overview is a compact title-only tool directory. Removed decorative branding, badges, breadcrumbs, repeated status copy, page descriptions and footer filler. Results use quiet outlined panels rather than a heavy colored block.

All inputs remain visible. Supplementary explanations move into a collapsed, keyboard-accessible Input guidance section with field-description associations. Design-load allowances, termination qualifications, conditional 90°C equipment confirmation and custom-voltage acknowledgement remain inline. Service phase-only scope remains visible beside results. No advanced input hiding, computation changes, or saved-state migration was introduced. Input guidance joins the existing print-expansion/restoration lifecycle.

All entry-point/import URLs use 1.6.0. The full test command includes modern presentation contracts, WCAG AA text-palette contrast (4.5:1), control-boundary contrast (3:1), guidance associations and modeled repeated hash navigation. These checks complement the numerical, state, reset, print, ambient-helper and theme suites; they do not replace actual browser visual/print QA, which remains blocked by the environment’s socket restriction.


## v1.7.0

Light and dark themes now use true neutral grayscale for every base palette token, including focus rings, current navigation, text selection, primary numbers, controls and browser theme color. Restrained amber/red is reserved for meaningful warnings and errors. The navigation is narrower and text-only with a thin current-page marker; the overview keeps the familiar eight-tool directory without its outer box or decorative icons.

Calculator inputs and results now sit on one flat surface with a single divider, unboxed metrics and quieter text actions. Removed the repeated Inputs heading while preserving the named input/result regions, field labels, units and descriptions. All calculation logic, inline confirmations, visible safety warnings and scope, saved inputs, reset, routing and print-detail behavior are unchanged.

Entry-point/import URLs are cache-versioned to 1.7.0. `npm test` includes exact equal-RGB-channel checks for both themes and every non-semantic CSS color literal, browser-theme-color tests, flat presentation contracts and the existing AA text/control contrast and numerical/UI regressions. Static JavaScript syntax and repository diff checks also pass. Actual browser visual/print QA remains blocked and unverified; no screenshot-based validation is claimed.


## v1.7.1

Renamed the conductor and service conductor input labels to **Load**. The inline note still requires any applicable continuous-load allowance to be included. Calculation logic, stored input keys and results are unchanged. Only the changed app entry URL is cache-versioned to 1.7.1; unchanged assets retain their existing versions. UI regressions check both labels, inline guidance and identical calculated output.


## v1.8.0

Extended the shared conductor table through 750 kcmil, adding the standard 700 and 750 kcmil sizes for copper/aluminum conductor and service sizing, conduit selection, voltage-drop calculations and drop-only size suggestions. No 740 kcmil size or interpolation is used. Ampacities at 60°C/75°C/90°C use HELUKABEL’s NEC 2023 Table 310.16 reproduction (copper page 1; aluminum page 3). Standard noncompact THHN/THWN-2 areas are 0.9887 and 1.0496 in², respectively, from NFPA’s 2017 Chapter 9 Table 5; final 2023 dimensions remain independently unverified.

The 4,000 A total OCPD cap, copper EGC table, #14–#6 box-fill filter, Load labels, monochrome themes and saved inputs are unchanged. Only the changed app entry and calculation import are cache-versioned to 1.8.0. Regression coverage includes every new ampacity column, derating, parallel selection, exact conductor areas, voltage-drop suggestions, over-range handling and modeled UI selection/persistence. Run `npm test`. This does not replace qualified engineering review or actual browser visual QA.


## v2.0.0

- Conductor and service sizing optionally select for both ampacity/OCPD and voltage drop. Actual total operating current is explicitly entered independently of preadjusted Load. The displayed drop is calculated on the selected conductor and chosen set count. The feeder model proportionally increases the copper EGC and recomputes EMT fill; service grounding/bonding remain separate.
- The ninth calculator checks ordinary dry-type transformer winding protection and secondary conductors at or below 1,000 V. It supports bounded 10-ft/25-ft rules only with an explicit installation-condition acknowledgement. Both dual and primary-only winding protection retain a downstream secondary OCPD. It does not design inrush coordination, fault-current ratings, grounding/bonding, conduit fill or secondary voltage drop.
- Every valid current result has Copy summary, PDF report and Save calculation actions. Clipboard refusal produces a selectable complete text fallback. Invalid inputs clear the export snapshot and disable actions, avoiding stale-result exports.
- Saved calculations are named by project/calculation and stored locally in this browser. Load recalculates with the current engine; Saved PDF preserves the original snapshot and version. Rename, recoverable trash and restore are available. Storage errors are visible; clearing site data removes the library. Export separate PDFs for backup.
- PDF/text reports include visible inputs and confirmations, raw inputs in saved data, method, results, warnings, scope, references, app/code version and timestamps. Reports explicitly disclose verification limits; no certification or independent engineering approval is claimed.
- All prior regression suites remain in `npm test`, plus combined sizing, transformer protection, saved records, PDF structure/text, source-backed worked examples and modeled workflow integration tests. Real browser visual/clipboard/download QA remains unavailable in this execution environment; modeled DOM and valid generated-PDF checks do not substitute for it.

Assets are cache-versioned consistently at 2.0.0. No external runtime dependency, account synchronization, analytics or automatic publishing was added.

## v2.1.0

Conductor sizing uses a single explicit OCPD Rating selector (10–4,000 A, default 30 A). It checks conductor ampacity against the selected rating; users must establish that protection satisfies applicable load, continuous-load and equipment requirements separately. Actual current for optional voltage-drop sizing remains separate and cannot exceed the selected OCPD. Service sizing and transformer protection retain their existing inputs.

Legacy browser inputs and loaded saved conductor calculations share a migration: preserve a positive explicit OCPD, otherwise convert the previous adjusted load to the previously selected standard rating. Invalid/out-of-range conversions stay invalid. A notice requests verification; legacy manual counts still require a circuit selection. New inputs contain no load field. Saved PDFs retain their immutable original snapshots and version.

## v2.1.1

Added a subtle, theme-aware vertical divider between the desktop navigation and tools. Narrow layouts retain the horizontal navigation divider without a vertical border. Sidebar width, calculator behavior and calculation engines are unchanged. Only the changed stylesheet URL is cache-versioned to 2.1.1; JavaScript asset URLs retain 2.1.0. Static regressions check the desktop/mobile separator rules in both grayscale palettes.

## v2.2.0

Transformer protection now defaults to five core decisions: kVA, common phase, primary voltage, secondary voltage and protection method. Only this module replaces the nominal-system/entry selectors with phase-aware numeric voltage lists and Custom last. Custom voltages are limited to 1,000 V and require reconfirmation after voltage or phase changes. The protection method uses native keyboard-operable radio segments with focus restoration.

Basic results show winding full-load currents and maximum modeled permitted standard OCPDs under Table 450.3(B), not recommended breakers. Raw percentage ceilings and the 15–4,000 A modeled-device range are disclosed; a current with no supported device reports out-of-range. Primary-only protection sets no secondary table ceiling and does not establish that secondary protection is unnecessary. No actual load is inferred from nameplate current.

Optional selected-OCPD checks require an entered preadjusted secondary design load. Optional secondary-conductor checks retain the original 10/25-ft installation confirmations, OCPD bounds, ratio floors, material, terminations, ambient/CCC adjustment and parallel-set guards. The original `transformerProtection` full-check API remains available. `transformerProtectionLimits` and `evaluateTransformerProtection` provide the basic and explicit optional scopes. Disabled fields cannot block basic calculations or exports.

Previous current-browser inputs open in basic mode with their advanced values retained and a migration notice. Loading a saved legacy full calculation enables both advanced checks and preserves its inputs; the original saved snapshot/PDF is unchanged. Summaries, PDF reports and saves record protection method and enabled-check scope without assigning a secondary conductor size in basic mode.

All 20 previous suites plus `protection-simple-tests.mjs` pass. The new suite covers basic and full fixtures, optional guards, custom voltage and phase reset, segmented-radio semantics/focus restoration, current-input versus saved-record migration, scope exports and immutable old PDFs. These are modeled DOM and numerical checks; real-browser visual/keyboard QA remains pending the private-site login handoff. No deployment is included in this change.

## v2.2.1

Transformer protection uses a two-column result grid: maximum primary and secondary OCPDs on the first row, primary and secondary full-load currents on the second. This order applies to basic and optional checks. Additional results and routine informational notices are available in the neutral, closed-by-default calculation details. Conditional warnings and blocking errors remain visible. Calculations, saved snapshot content, report warnings and print expansion are unchanged.

Regression checks cover result order, default disclosure, conditional warnings, errors, report/snapshot preservation and optional-check results. Real-browser visual/keyboard QA remains pending the existing private-site login handoff.


## v2.3.0

The optional selected-breaker section works in both directions. Choose Primary first or Secondary first, choose a standard driver rating, then select an opposite-side rating from the options within the same transformer-protection table row. The selected protection method never changes implicitly. Primary-only winding protection has no Table 450.3(B) secondary ceiling; secondary devices still require independent load and conductor protection review.

Table-only selection needs no actual load and imposes no nameplate-current minimum: below-FLC devices are explicitly partial-capacity choices. Complete pairs report “Within transformer-protection limits”; this does not establish usable load, inrush performance or whole-installation compliance. Only the 125% table cells receive the next-standard exception; 167%, 250% and 300% ceilings remain hard limits. The modeled device list is 15–4000 A.

Actual preadjusted load is blank until entered and is used only in the optional load/conductor check, along with existing installation confirmations and conductor guards. The bounded full-check API retains its primary-at-least-FLC restriction, explicitly distinguished from table-only selection. Changing the starting side, nameplate basis or protection method clears both selections; changing the driver clears its counterpart. Invalid saved values remain visible and block a successful pair check. Old full calculations restore legacy automatic choices explicitly where possible on load; stored report snapshots remain unchanged.

The four primary results retain their v2.2.1 order and routine information stays collapsed. Added engine and modeled-DOM regressions cover both directions, table thresholds, partial capacity, primary-only, missing load, stale selection, migrations and legacy reports. Browser visual/keyboard QA remains unrun because the owner-private login handoff is still pending.


## v2.4.0

Calculated currents display one decimal place, including method text, copied summaries and new PDF snapshots. Standard device ratings retain exact rating labels. Internal threshold comparisons still use full precision. The persisted numeric result API remains compatible; frozen display strings preserve the current presentation in new snapshots, while historical snapshots retain their original values and text.

The optional breaker workflow now says **Define primary OCPD** / **Define secondary OCPD**. With one valid defined breaker and a blank partner, it reports the acceptable modeled standard-device range and individual ratings for the fixed Table 450.3(B) protection mode. With both entered, it checks both independent table ceilings. Partner entry includes failing standard ratings so users can inspect a failing pair; changing the driver preserves the entered partner. Below-nameplate choices may limit usable capacity. No voltage-ratio matching, actual-load/inrush approval or full-installation compliance is inferred. Primary-only protection has no secondary table ceiling: 4000 A is a model bound, never a statutory ceiling. Conductor checks still need an explicit pair, a preadjusted load and installation confirmations.

## v2.5.0

Saved calculations now use theme-aware native modal dialogs. Select an existing project or enter a new one; the last selected project is reused across calculators during the current page session. Equivalent project names are matched ignoring surrounding/repeated whitespace and letter case. Blank project names use Unassigned. Calculation names are optional and default to a browser-local YYYY-MM-DD HH:mm:ss timestamp when saved.

The library groups active calculations under collapsible project names with counts. Clear project and Clear all show a count and confirmation, then move only the selected active calculations to recoverable Trash in one storage write. Individual restore remains available. Clearing does not permanently delete data or free capacity: the existing 100-record cap includes Trash. Historical calculation snapshots and their stored engine results stay unchanged during rename, clear and restore.

Three-phase calculation methods show √3 instead of the rounded 1.732 factor. Engines continue using full-precision Math.sqrt(3). New PDF reports use an explicit sqrt(3) spelling; historical report content is preserved. Automated coverage models dialog selection, cancellation, focus cleanup, grouping, atomic storage errors and report compatibility. Real-browser rendering, keyboard/focus containment and private-site QA remain unverified; no login or blocked browser retry was attempted.

## v2.6.0

Standalone voltage drop now accepts lagging displacement power factor and an explicit Steel / EMT or PVC raceway. The calculation uses `VD = (2 or √3) × I × L / 1000 × (R × PF + X × √(1 − PF²))`, with actual entered current, one-way feet and NEC 2017 Chapter 9 Table 9 R/X in Ω/1000 ft. Table conditions are circuits up to 600 V, 60 Hz, 75°C and three single conductors in conduit; single-phase use is a stated geometry approximation. Starting voltages above 600 V, leading PF, harmonics, parallel sets and other geometries are outside scope. #14 aluminum and 700 kcmil have no supported table row and are blocked rather than interpolated. Other calculators retain their 700-kcmil support. Table values have not been independently verified against final NEC 2023.

Starting Voltage replaces across-load wording only in this calculator. Percentage voltage drop is the hero; estimated volts lost and end-of-run voltage sit together below it. Unrounded percentages choose accessible semantic colors and textual meaning: green ≤3%, orange >3% and <5%, red ≥5%. The old standalone design-target input, target check and target-dependent minimum-size recommendation are removed. Integrated conductor/service voltage-drop targets and their K/CM method are unchanged.

NEC general 3% branch / 5% combined feeder-and-branch guidance is generally informational. The applicable 2021 IECC C405.10 combined customer-owned service/feeder/branch limit is not more than 5%; exactly 5% is red as a caution threshold, not a claim of a legal violation. One segment cannot establish whole-path compliance. Routine assumptions stay collapsed; the single-segment scope stays visible.

Existing standalone working inputs and loaded records initialize missing PF to 1 and the visible raceway to Steel / EMT, discard the obsolete target, and recalculate with the AC model. Users must verify those inputs; unity-PF results can differ from the old K/CM model. Unsupported old sizes remain visible with a correction message. Historical saved snapshots/PDFs are unchanged. New summaries/PDFs include PF, raceway, Starting Voltage, the status text, method and code scope.

`npm test` includes 624 source-coefficient/formula cases and focused PF, unrounded threshold, invalid input, visible ordering, color-contrast, summary/PDF and historical migration regressions in `voltage-drop-pf-tests.mjs`. Real-browser visual QA remains unverified; the existing owner-login blocker was not retried.

## v2.6.1

Standalone voltage drop adds Aluminum raceway with the NEC 2017 Table 9 aluminum-conduit resistance columns for both conductor materials. The table explicitly shares reactance for PVC/aluminum conduit; resistance is selected independently. Raceway labels are Steel, Aluminum and PVC; the input is labeled Power factor. The lagging-PF assumption remains in guidance and calculation details. The 600 V / 75°C / 60 Hz scope, unsupported sizes, percentage color thresholds and integrated sizing model are unchanged. New snapshots and cache versions use 2.6.1; historical snapshots remain immutable.

## v2.7.0 — cable tray screening and personal dashboard

- Cable tray sizing screens round multiconductor cables rated up to 2,000 V in ladder / ventilated trough and solid-bottom trays, using actual manufacturer cable OD, quantity, usable inside dimensions and the 4/0 AWG size threshold. Separate all-small, all-large, mixed and control/signal-only methods use NEC 392.22 source formulas; no universal fill percentage or bare-conductor area substitution. Auto selection is limited to listed widths 6–36 in.; power depth >=3 in. is a conservative tool scope, not a claimed NEC minimum.
- Source qualification is explicit: table/method values checked against NFPA 2023-cycle development material and Eaton's 2014 cable-tray guide. Final adopted-edition verification remains required. Physical-fill results do not validate ampacity, cable packing, structural capacity, grounding, bonding or installation compliance.
- Cable groups, rule details and source caveats flow into Copy summary, saved snapshots and PDF reports. Unsupported single-conductor/nonround cases and malformed inputs do not enable saving/export. Existing records and their saved PDF snapshots remain unchanged.
- Overview is now a local dashboard with keyboard-accessible favorites, actual recently edited calculations, recently saved report links and compact all-calculator access. Stars work from the dashboard and calculator header. Recent inputs recalculate on resume; opening a default calculator does not invent activity.
- Dashboard preferences use an independent local-storage key. Corrupt data is preserved; blocked/full storage falls back to in-tab preferences with a visible warning. Named saved calculations remain separate.
- Automated verification covers source-rule boundaries, invalid/scope cases, all tray UI/report workflows and dashboard persistence/navigation/failure paths. The existing private-site login handoff still blocks real-browser visual/keyboard QA; it was not retried and no alternate browser route was launched.

## v2.8.0 — conductor groups, inline favorites and parallel voltage drop

- Favorite stars sit beside calculator titles, tool-list titles and one-line sidebar links. Selected stars are filled; clicking them does not navigate. Favorites remain browser-local.
- Tray rows select an actual conductor size, insulated overall diameter, quantity and flat/triangle/square arrangement. A multiconductor cable's largest power-conductor size governs its 4/0 class; exact sizes never imply a universal cable diameter. Existing class-only records preserve their earlier area-screening method until edited.
- Single-conductor scope is bounded to ladder-tray power installations, 1/0 AWG–750 kcmil, through 2,000 V, with industrial/qualified-supervision and tray-listing confirmations. 1/0–4/0 requires rung spacing no greater than 9 in. Grouped conductors need a bound-circuit-group acknowledgment; missing conditions cannot produce a passing check.
- NEC fill and geometric envelopes are separate checks. Triangles contain three individual conductors, squares four. Grouping never reduces the sum of individual ODs required by 392.22(B). The depicted touching group geometry does not establish the separated, uncovered ampacity arrangement of 392.80(A)(2)(d). Larger multiconductor cables remain subject to single-layer restrictions.
- Optional single-conductor diameter references are approximate Southwire 600 V Cu THHN/THWN-2 SPEC 10000 and Al THHN/THWN-2 SPEC 10012 values for specified sizes. They are not used for other insulation, higher voltage or unspecified multiconductor constructions. Manual OD stays available; editing it removes reference provenance.
- Standalone AC voltage drop supports 1–20 identical parallel sets in separate matching raceways, with total actual load current divided equally. Multiple sets require at least 1/0 AWG within this tool's normal-power scope. The calculation does not establish ampacity or compliance with parallel-installation requirements.

Saved reports include all new inputs and diameter provenance. Earlier saved reports remain immutable. Browser visual/keyboard verification remains pending; automated modeled-DOM and numerical checks are reported separately.

## v2.8.1 — reference qualification and tray arrangement guard

New NEC references now use article/table labels and the official NFPA 70 (2023) reader. Published-2023 verification remains pending because the final reader requires sign-in; citation replacement does not validate the retained numbers. NEC-based results and new reports visibly disclose this gap. See `VERIFICATION-STATUS.md` for the module matrix and retained historical source inventory. Earlier release notes describe the evidence available at the time and are intentionally preserved.

Manufacturer product dimensions remain separate from code authority; Southwire tray OD references still identify their exact specifications and require purchased-cable verification. Physics relationships and the official IECC link remain distinct. Existing saved snapshots and their PDFs remain immutable.

The existing prohibition on triangle/square stacking of 4/0-and-larger multiconductor power cables now produces a failed installation check with no supported tray selection/minimum. Physical numerical-fit diagnostics do not override that failure. No underlying ampacity, fill, impedance or protection constants were changed.


## v2.9.0 — published NEC 2023 modeled-provision audit (2026-10-13)

The authenticated official final NEC 2023 text was inspected. The current verification matrix supersedes earlier sign-in-blocked and 2017-only source qualifications only for the named modeled checks. Added box terminal-block assembly allowances, corrected box/voltage-drop references, replaced EMT percentage-of-rounded-area arithmetic with published allowed-area cells, and made parallel-floor EGC/EMT outputs explicitly provisional pending manual upsizing review. New reports carry the bounded verification date; existing snapshots/PDFs retain their original evidence and version. Run `npm test` for the full suite, including `published-nec-tests.mjs`. No blanket code-compliance or installation certification is claimed.

## v2.9.1 — remove repeated verification notice (2026-10-13)

Removed the repeated “Named modeled NEC provisions were checked…” notice from current calculation results, new saved snapshots, copied summaries and new PDF reports. No substitute warning or empty result-warning box is added. Specific scope limits, input validation, current-state warnings (including provisional EGC/EMT), official NEC source links, verification dates and the published-code audit record remain intact. Existing saved snapshots and their exported reports retain their original content and version.

All entry-point/import cache versions and new-report versions are 2.9.1. `npm test` includes absence checks across modeled calculator UIs and new reports, plus SHA-256 checks against a pre-edit v2.9.0 snapshot’s summary and PDF. Browser visual QA was not run for this text-only change.

## v2.10.0

Conductor sizing supports five selectable raceways with independently read NEC 2023 Table 4 total and published 40% areas through 4 inches. Existing inputs default to EMT; the standalone conduit-fill tool remains explicitly EMT-only. Generic result labels identify the chosen raceway separately. Parallel-floor cases now select conservative insulated Cu EGC in every raceway at least the final individual phase CM (including voltage-drop sizing) and full-OCPD Table 250.122 Cu size. Physical fill uses this final EGC. This deliberate full-size choice is not presented as the minimum NEC EGC. Non-floor proportional voltage-drop sizing is unchanged.

Current UI/source/report labels omit the checked date; internal audit dates and historical snapshots stay intact. Copy summary now contains only inputs and outputs, preserving actual status/result qualifiers. Full PDFs and saved report exports retain methods, sources and scope.


## v2.10.1 — conductor presentation

- Raceway type is the final conductor input, after the optional voltage-drop inputs. Its inline guidance identifies the choice as optional and keeps EMT as the explicit default used for conduit sizing. All five saved raceway choices and reset behavior are preserved.
- Conductor results have separate, initially closed **Additional results** and **Calculation details** disclosures. They expand independently for reading and both participate in print expansion/restoration. Conditional warnings, validation errors and unsupported-raceway results remain visible outside the disclosures.
- Conductor fill uses green/red status from the exact published Table 4 allowed-area comparison. The standalone fill tool defines no orange warning band, so no new near-limit threshold is invented. A displayed fill slightly above nominal 40% can still pass a published allowance because the total-area and allowed-area cells are independently rounded.
- Integrated conductor voltage-drop metrics reuse the existing palette and unrounded thresholds: green ≤3%, orange >3% and <5%, red ≥5%. Text equivalents accompany the percentage. The entered design target is a separate check; an unattainable target still blocks passing results and exports. These guidance colors do not establish code compliance. The enabled option now reads **Ampacity and voltage drop**.

Sizing formulas, conservative parallel-floor Cu EGC selection, published fill tables, result rows and numerical values are unchanged. Service sizing and the standalone tools retain their existing presentation. Copy summary remains inputs and outputs only; new snapshots add status metadata, while stored historical snapshots/PDFs remain immutable. New reports and asset cache references use 2.10.1.

Run `npm test`, including `conductor-presentation-tests.mjs`, plus `node --check` on distribution scripts. Modeled DOM, print-lifecycle and numerical regression checks do not substitute for real-browser visual/keyboard QA, which remains unverified because the managed preview browser is unavailable and private live-site access requires owner login. No alternate preview server or browser route was launched.


## v2.10.2 — engineering judgement note

The shared NEC 2023 baseline footer now adds the exact sentence “Not a substitute for electrical engineer or electrician judgement.” on the dashboard, all ten calculators and Saved calculations. New full reports and PDFs include it once beside the existing general disclaimer. Copy summary remains inputs and outputs only. Reports from versions before 2.10.2 preserve their original text and PDF bytes; no stored snapshots are migrated or rewritten.

Removed only the obsolete live transformer statement that final licensed NEC 2023 protection text had not been accessed. The bounded published-text audit already verified the modeled Table 450.3(B) provisions. Adopted-edition, AHJ, manufacturer, inrush, coordination, fault-current, equipment-rating, grounding and bonding constraints remain. Historical reports retain their original source qualification.

Version and asset cache references are 2.10.2. `npm test` includes `engineering-judgement-tests.mjs` for all shared footers, report/PDF text, unchanged clipboard output, current transformer warnings and pre-edit v2.10.1 summary/PDF SHA-256 preservation. Distribution syntax and repository diff checks pass. Real-browser visual/keyboard, clipboard, print and download QA remain unverified; no alternative preview server or browser route was launched.
