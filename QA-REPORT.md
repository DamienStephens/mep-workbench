# MEP Workbench: independent calculation QA

## 2026-10-16 v2.14.0 MV cable-reference presets

- Independent source fixtures cover all 84 selected rows: 16 Southwire conductor AC-R/inductive-X rows; 32 Prysmian AIRGUARD positive-sequence rows; and 36 Prysmian TRXLPE URD direct-buried positive-sequence rows. Source pages and units were visually checked, including the URD micro-ohm symbol that text extraction mangles. AIRGUARD 35-kV 750 kcmil is omitted, not silently corrected.
- Engine checks cover full catalog/size/temperature combinations, independent integer-unit conversion fixtures, 90°C AIRGUARD manufacturer's resistance estimate versus unchanged X, exact square-root-three/PF/length/current calculations, zero values, numerical range guards, and unrounded 3%/5% status boundaries. 34.5-kV studies and exact 35-kV class ceilings are tested separately from insulation percentages and nameplate temperature ratings.
- Negative cases cover unavailable sizes, 35-kV AIRGUARD 750, unsupported temperatures, wrong/cross-family arrangements, single-phase/parallel misuse, prototype/array/malformed state inputs and stale hidden manual/Table9 fields. No saved incompatible state is silently repaired or unknown geometry inferred.
- Modeled UI/report coverage includes all ten families, both supported AIRGUARD temperatures, visible neutral engineering-assumption labels, closed details, source qualifications, 133%-application basis, exact coefficient/temperature/geometry information in saved/full/compact/PDF reports, and explicit manual conversion without truncating the source basis (1,800-character field). Ordinary mode changes preserve manual inputs. Save/load/reload/reset/dashboard, invalid-input action guards and frozen historical summary/PDF bytes remain covered.
- Full `npm test`: all 46 suites passed, including 2,664 MV engine checks and 110 modeled-UI/report checks. Every distribution JavaScript file passed `node --check`; `git diff --check` passed. App, assets and new snapshots use v2.14.0; all prior 44 suites remain included.
- Real-browser visual, keyboard, clipboard, print and download QA remains unverified. The cloud browser reported connection refused for the local preview; the owned preview process was stopped. No screenshot-based or live-browser verification is claimed. Private Sites deployment and GitHub publication are checked separately.

## 2026-10-15 v2.13.0 VA/current conversions and voltage wording

- Full `npm test`: all 44 suites passed, including 480 new VA/current engine cases and 58 new modeled-UI/report cases. Every distribution JavaScript file passed `node --check`; `git diff --check` passed. App, asset cache and new snapshot versions are 2.13.0.
- Engine coverage spans all four conversion modes; numeric/string single- and three-phase inputs; standard and fractional/custom/MV voltages; exact square-root-three math; unrounded raw-value round trips; one-decimal current display without double rounding; zero; invalid mode/phase/value/voltage; and representable intermediate-overflow fallbacks versus unrepresentable underflow/overflow errors. VA calculations are invariant to missing, malformed, nonfinite or stale PF, including a getter that throws if PF is read. Existing W outputs and PF validation remain compatible.
- Modeled UI covers the four-way selector, dynamic labels/units, correct requested-output hero, hidden-PF validation and restoration, a single voltage selector with Custom last, custom/preset changes, invalid-input export guards, save/load/reset/reload, dashboard resume, favorites, navigation isolation, copy inputs/outputs, PDF generation and frozen historical W summary/PDF bytes. Shared single-phase preset text is plain volts; help retains equipment-applied voltage guidance. Three-phase and full-winding bases, Starting Voltage, one-line sidebar CSS and theme behavior remain covered.
- No code-model tables, branch-circuit sizing rules, optional manual-R/X voltage-drop logic or saved-report migrations changed. These are steady-state physics conversions, not a new code verification or installation certificate.
- Real-browser visual, keyboard, clipboard, print and download QA remains unverified. The supported cloud browser could not reach the local preview (connection refused); server sessions were stopped. No screenshot-based or live-browser verification is claimed. Publication is verified separately by the Sites deployment result; GitHub publication remains on hold.

## 2026-10-13 v2.12.0 voltage simplification and confirmation-free design inputs

- Full `npm test`: all 42 suites passed. All distribution JavaScript files passed `node --check`; `git diff --check` passed. Application, new snapshot and every asset cache version identify 2.12.0.
- New 672-check engine suite covers custom voltages from fractional values through MV/HV, both phases and load-conversion directions, transformer currents, old true/false/missing confirmation flags, invalid and nonfinite inputs, representable overflow fallbacks and numeric-range failure. Ordinary 120 V three-phase remains excluded from standard presets; custom values retain explicit scope information.
- Manual voltage-drop coverage exercises independent R/X, phase, PF, equal parallel sets, voltage scale, missing/negative/nonfinite/all-zero R/X, stale hidden Table 9 fields, excessive drop, no-source notes and project provenance. Manual results do not carry Table 9 source verification. Existing 936 Table 9 formula cases and 1,584 parallel-current cases remain passing. Built-in 600 V, integrated 1,000 V, transformer protection 1,000 V and tray 2,000 V scopes remain enforced.
- New modeled UI suite covers all eight voltage inputs across six calculators, hidden integrated controls, Custom-last dropdowns, correct line-to-line/full-winding/load labels, no duplicate mode/system/confirmation fields, repeated preset/custom/phase changes, retained custom numbers, HTML numeric constraints, MV custom entry, required R/X and optional blank source, mode changes, reset, JSON reload, saved loading, dashboard resume, readable single-field summaries and immutable saved PDFs.
- Engineering confirmations were replaced by honest design assumptions. Existing old true flags never become new installation/listing claims; single-conductor tray eligibility remains conditional. Numerical pass/fail status, rung limits, secondary length/OCPD/configuration checks, terminal ampacity restrictions and ambient rooftop method selection remain. Destructive saved-record confirmation remains intact.
- Existing historical report/PDF digest regressions still pass. Current-state migration does not rebuild or rewrite frozen historical input rows, methods, sources, disclaimers or result precision.
- No live-browser visual/keyboard/clipboard/print/download QA, preview server, alternate browser, Site publication or GitHub push was performed. Modeled DOM/static verification is not browser verification or electrical installation certification.

## 2026-10-13 v2.11.0 tray inputs and universal check status

- Full aggregate `npm test`: all 39 suites passed. Every `dist/*.js` passed `node --check`; `git diff --check` passed. Application, new snapshot and all import/entry cache versions are 2.11.0.
- Tray numerical coverage: 329 existing/formula/provenance checks plus 257 repeated group/count and boundary checks. v2 input counts multiply triangle/square groups by three/four before all NEC calculations. Legacy migration and every repeated layout switch preserve physical totals, including invalid fractional groups, which remain blocked without rounding. Overflow/unknown quantity schema and unsupported provenance are rejected.
- All 12 Table 5 source areas, including 700 kcmil, produce full-precision `sqrt(4A/pi)` estimates. Source mismatch, multicable misuse and >600 V reference misuse fail. NEC-derived estimates stay conditional; existing Cu/Al Southwire specifications and manual overrides remain. No fresh published diameter-column verification is claimed.
- Rung coverage: omitted values resolve to an explicitly assumed 9 in.; unconfirmed values remain conditional; user-confirmed positive values through 9 in. pass that bounded condition; values over 9 in. or malformed values fail. All-250–750-kcmil runs do not inherit this small-conductor rung limit. Legacy overrides are preserved and rechecked.
- New 208-case semantic engine suite checks exact, just-below and just-above raw limits, published raceway allowances, EMT schedules, box volume, conductor/service/transformer ampacity, neutral unknown/unbounded checks, unchanged VD guidance and snapshots. Modeled UI tests assert green/red metrics and hero values across real modules, keep nameplate currents neutral, and retain light/dark AA contrast/text equivalents.
- Modeled tray UI checks cover default source, 700 kcmil, both Southwire references, manual override, live physical totals, repeated group changes, incomplete-group errors, JSON startup/reload, saved-record loads, collapsed routine notices, bottom conditional scope and rung override/confirmation. Invalid cases disable export actions; current copies remain title/inputs/outputs only.
- Frozen historical tray summary, clipboard and PDF digests remain identical. Existing historical v2.4.0/v2.9.0/v2.10.1 report tests also pass; loading recalculates a new state and never rewrites original saved snapshot content.
- Real-browser visual, keyboard, clipboard, print and download QA was not run. No preview server, alternate browser route, installation, GitHub push or Site publication was performed by this implementation task. Automated DOM/static checks are not browser verification or installation certification.

## 2026-10-13 v2.10.2 engineering judgement note

- The exact requested sentence is appended once to the shared NEC 2023 footer on the dashboard, all ten calculators and Saved calculations. It is not duplicated inside individual result panels.
- New full summaries and PDFs include the sentence once. Clipboard summaries remain exactly the module title, inputs and outputs. Version-gated report formatting leaves older reports unchanged without mutating snapshots.
- Removed the live basic/OCPD-only transformer warning sentence claiming final NEC 2023 protection text was not accessed, which contradicted the completed modeled-provision audit. All adjacent project-specific constraints remain, and the numerical/result data matches the pre-edit transformer fixture.
- `npm test`: all 36 suites pass. Added `engineering-judgement-tests.mjs` verifies 12 page footers, ten current summaries/PDFs and clipboard actions, repeated rendering, save/export, both transformer protection methods with basic/OCPD-only checks, version boundaries, asset cache versions, semantic PDF extraction, and byte-identical pre-edit v2.10.1 summary/PDF hashes. Existing v2.9.0 and v2.4.0 historical PDF regressions also pass.
- Every distribution JavaScript file passes `node --check`; `git diff --check` passes. Real-browser visual, keyboard, clipboard, print and download QA remain unverified. No preview server, alternate browser route, GitHub push or Site publication was performed by this implementation task.
- Application/new-report and asset cache versions are 2.10.2.

## 2026-10-13 v2.10.1 conductor presentation

- Final conductor input is optional raceway selection with an explicit EMT default; all five choices, saved inputs, navigation and reset remain intact.
- Additional results and Calculation details are separate, initially closed native disclosures. Both participate independently in print expansion/restoration; conditional warnings/errors remain outside.
- Integrated drop metadata uses raw, unrounded values with the existing green ≤3%, orange >3%/<5%, red ≥5% convention. The entered design target remains independent and an impossible target blocks results/export.
- Fill uses the published Table 4 area allowance, with no invented orange band. The valid IMC/Al/80 A case displaying 40.042% remains green; no supported raceway is red and visibly warned.
- A direct comparison with the v2.10.0 checkout tested 4,480 conductor combinations. After removing additive status metadata, complete results, methods, warnings, sources and grounding flags were identical. The same comparison checked 896 service outputs without removing any metadata; all were identical.
- A modeled-render comparison against v2.10.0 confirmed byte-identical default input, result and source HTML for all nine non-conductor calculators.
- Final `npm test`: all 35 suites pass. New `conductor-presentation-tests.mjs` covers four exact/raw voltage-drop edges (including values rounding to the same displayed 3%/5%), 150 published fill-boundary checks, the 40.042% IMC case, unsupported fill, conservative EGC/result preservation, final optional raceway placement, AA palette contrast, independent disclosures and all four print-open combinations, other-module isolation, copy/save/load/reset, immutable PDF snapshots, and impossible-target action blocking.
- All distribution JavaScript files pass `node --check`; `git diff --check` passes. No live-browser visual, keyboard, clipboard or print verification is claimed. The managed preview browser is unavailable and private live-site access requires owner login; no alternate server/browser was launched.
- Application/new-report version and asset cache references are 2.10.1. No GitHub push or Site publication was performed by this implementation task.

## 2026-10-13 v2.9.1 notice removal

- Removed only the repeated generic NEC-verification notice from newly calculated outputs, summaries and PDFs; no replacement notice or empty result-warning boxes.
- Preserved specific scope limits, validation and conditional warnings, dated source provenance, and the v2.9.0 audit below.
- All 33 `npm test` suites pass, including modeled UI absence checks and pre-edit historical summary/PDF SHA-256 regressions.
- Every distribution JavaScript file passes `node --check`; `git diff --check` passes.
- Version/cache references and new snapshots identify 2.9.1. No browser visual QA, deployment or GitHub push was performed in this patch.

## 2026-10-13 v2.9.0 audit update

The named modeled provisions have now been checked against the actual published NEC 2023 text. See `VERIFICATION-STATUS.md` for exact sources, corrections and bounds. `npm test` includes all prior suites and new published-code regressions for terminal blocks, exact EMT permitted areas and boundaries, provisional parallel-floor EGC/EMT results, source dates and historical-report preservation. This update does not certify an installation; real-browser QA and deployment are separately reported. The prior dated QA report below is preserved as historical evidence.

Checked: 2026-10-11 UTC. This report covers the local upgrade; it does not certify an electrical installation or establish the deployed version.

## Result

`node worked-examples-tests.mjs` passes **73 independent worked-example cases, 0 failures**. The fixtures cover all eight original calculators, integrated conductor/service voltage-drop sizing, and the new transformer-protection/secondary-conductor engine. Expected values use explicit source constants and hand calculations, not the implementation's exported wire or conduit tables.

The calculation engine is a bounded design aid. The sources below corroborate the modeled methods, but **the complete final licensed 2023 NEC text, adopted local amendments, actual equipment listings, and a project installation were not independently reviewed**. Manufacturer references and NFPA development records are identified as such. Conduit dimensions remain verified against the 2017 publication rather than independently verified final 2023 tables.

## Coverage and worked results

### Feeder and commercial service conductors

- 100 A, 75°C, three CCC, 30°C: #3 Cu or #1 Al. Ordinary 200 A service: 3/0 Cu or 250 kcmil Al.
- At 40°C and four CCC, correction is 0.91 × 0.80. For 100 A: Cu #2 gives 94.64 A and fails; #1 gives 105.56 A and passes. Al 1/0 gives 98.28 A and fails; 2/0 gives 109.2 A and passes.
- At 60°C terminations, a 50 A Cu circuit requires #6. A 90°C wire/lug marking alone does not qualify equipment; the unconfirmed 90°C selection is blocked.
- Small-conductor caps are retained even with verified 90°C equipment: 25 A Cu requires #10; 20 A Al requires #10; 30 A Al requires #8. The conservative no-next-size-up model sizes an 85 A load at a 90 A OCPD using #3 Cu.
- Service checks apply no additional 125% multiplier to a preadjusted load and keep the model's general 60 A minimum. Service results do not invent a feeder EGC, neutral size, bonding size or conduit recommendation.

Sources: [HELU's NEC 2023 Table 310.16 and correction tables](https://www.helu.com/helu/us/publications/technical-documents/allowable-ampacity-tables.pdf), [Schneider termination guidance](https://www.se.com/us/en/faqs/FA115128/).

### Parallel feeders, EGCs and conduit

- A 400 A feeder with two raceways selects 3/0 Cu in each, 200 A per set. Each raceway gets a full #3 Cu base EGC referenced to the total 400 A device, rather than a divided 200 A rating.
- Per-raceway area is 3 × 0.2679 + 0.0973 = 0.9010 in². A 2-inch EMT area of 3.356 in² gives 26.847% fill; the preceding 1½-inch size cannot accommodate the area at 40%.
- General parallel phase-conductor minimum 1/0 is enforced. Total OCPD above the modeled 4000 A cap is rejected regardless of set count.
- Conduit checks distinguish 53%, 31% and 40% for one, two and more conductors. Nine #12 THHN in ½-inch EMT fit at 0.1197 in²; ten exceed the 0.1216 in² allowance. Two #4 fit ¾-inch EMT under 31%; three require 1-inch EMT under 40%.

Sources: [Southwire licensed 2017 Table 250.122 reproduction](https://www.southwire.com/medias/sys_master/installation-manuals/installation-manuals/hca/hff/8887676010526/MC-Installation-Guide-Southwire.pdf), [Steel Tube Institute parallel-feeder example](https://steeltubeinstitute.org/resources/grounding-parallel-feeders/), [NFPA 2017 original publication, Chapter 9](https://cms7files.revize.com/johnsontn/document_center/Development%20Services/Codes/Resource%20Docs/2017-NEC-Code-2.pdf), [Wheatland EMT dimensions](https://www.wheatland.com/wp-content/uploads/2018/03/EMT-and-Conduit-Brochure.pdf), [Service Wire fill method](https://www.servicewire.com/ServiceWire/Resources/Customer-QA/Conduit-Fill.htm).

### Transformer current, power and amperage

- 45 kVA, 480→208 V, balanced three phase: primary 54.127 A and secondary 124.908 A, using kVA × 1000 / (√3 × line-to-line voltage).
- 25 kVA, 480→240 V, single phase: 52.083 A primary and 104.167 A secondary, using full winding voltage.
- 8000 W at 0.8 PF = 10000 VA; 12500 VA at 0.72 PF = 9000 W.
- 240 V, 20 A, 0.9 PF = 4320 W; balanced 480 V, 30 A, 0.85 PF is checked with √3. Inverse three-phase W-to-A is independently checked.

Source: [Schneider Electrical Installation Guide: power loading](https://www.electrical-installation.org/enwiki/Power_loading_of_an_installation). These are electrical input/nameplate relationships; motor efficiency and transformer inrush are separate matters.

### Voltage drop and integrated sizing

- The resistance approximation uses one-way feet and a return factor of 2 for single phase or √3 for balanced three phase. Aluminum uses 21.2 and copper 12.9 Ω·cmil/ft; these are approximate 75°C constants, not full AC impedance calculations.
- A source discrepancy was deliberately caught: the [Connecticut DCP worked example](https://portal.ct.gov/cid/-/media/dcp/continuing-education/ece-curriculum.pdf?hash=8CBC76E89AD4E64615FE146886010782&rev=747d788e81ae4afd850485c2caf5788b) substitutes 32 A, 320 ft, #8 Cu but writes a numerator of 263,424. Independent multiplication yields 264,192; dividing by 16,510 cmil gives **16.002 V**, the app's correct result. Its approximate multiple-choice answer remains 16 V.
- Integrated 20 A design, 16 A operating load, 150 ft, 120 V, 3% target: #8 gives more than 3.6 V and fails. #6 gives 2.360 V and passes. The #12 ampacity baseline is retained in the explanation; proportional EGC increase reaches #6 and physical fill is recomputed with three #6 conductors in ¾-inch EMT.
- 100 A Al, 80 A operating current, 500 ft, 208 V three phase: 250 kcmil passes where 4/0 fails; the proportional Cu EGC rounds up to #3. Two parallel sets divide operating current equally while retaining each total-OCPD EGC basis.
- Service integrated drop can increase phase size without assigning service grounding/bonding or raceway design. Missing actual current, current exceeding preadjusted load, phase mismatch, impossible target and 120 V split-phase full-circuit entry are rejected.

Additional basis: [NFPA proportional EGC development record](https://www.nfpa.org/api/files?path=%2Ffiles%2FAboutTheCodes%2F70%2F70_A2022_NEC_P05_SD_SRStatements.pdf). This is supporting development evidence, not an independently reviewed final adopted requirement. Ground-fault impedance and non-thermal upsizing beyond the modeled VD change still need design review.

### Box fill

For uniform #12 conductors: six insulated conductors, five entering grounding conductors, one internal-clamp allowance and one device yoke give 6 + 1.25 + 1 + 2 = 10.25 allowances, or 23.0625 in³. A box marked 23.0624 in³ fails even though the displayed required volume rounds. Adding both support fitting types adds two allowances.

Source: [NFPA box-fill development record](https://docinfofiles.nfpa.org/files/AboutTheCodes/70/70_A2022_NEC_P08_FD_PIReport_rev_1008.pdf), 314.16(B). Tests cover the bounded uniform-size model, not mixed conductors or special device/loop/terminal-block arrangements.

### Transformer protection and secondary conductor rules

- 45 kVA three-phase 480→208 V: dual primary maximum 125 A, secondary maximum 175 A; primary-only maximum 70 A. A 150 A dual primary is rejected rather than rounded above the 250% ceiling.
- 75 kVA: dual maxima 225 A and 300 A. Under the 25-foot rule, 225 × 480 / 208 / 3 = 173.077 A can govern over a 150 A secondary OCPD, requiring 2/0 Cu at 75°C. Under the 10-foot rule, its 51.923 A ratio floor does not exceed that OCPD, so 1/0 Cu suffices in the modeled three-CCC arrangement.
- Exact 9 A primary uses 125%; immediately below 9 A uses 167%. Exact 2 A uses 167%; immediately below 2 A uses 300%. When no modeled device fits a small-current hard cap, the engine rejects it.
- Only 125% table cells receive the next-standard allowance. Secondary conductor ampacity receives no next-size-up exception. Tests include aluminum/ambient/CCC correction, 60°C termination, parallel conductors, length boundaries, missing installation confirmation, unsupported outside rules, insulation and medium-voltage scope.

Sources: [Eaton transformer-protection tables](https://www.eaton.com/content/dam/eaton/products/electrical-circuit-protection/fuses/solution-center/bus-ele-tech-lib-transformer-protection.pdf), [Eaton secondary-conductor application guide](https://www.eaton.com/content/dam/eaton/products/electrical-circuit-protection/fuses/technical-literature/ne02-brochure.pdf), [NFPA 240.21(C) development record](https://docinfofiles.nfpa.org/files/AboutTheCodes/70/70_A2025_NEC_P10_FD_PIResponses.pdf). Final licensed 2023 protection text remains unverified.

## Defects and source issues found

1. New transformer protection initially lacked the existing phase/voltage safeguards. The engine owner corrected this during QA. Independent regressions now reject ordinary 120 V three-phase input and using 120 V as the full secondary winding voltage in the 120/240 V split-phase configuration. Explicitly confirmed unusual voltages use the shared validation path.
2. The DCP source arithmetic discrepancy above is documented rather than changing correct engine math to match it.
3. During active UI integration, the old VM harness stopped at a missing `makeSnapshot` dependency. This was reported and the integration owner updated the harness. The aggregate `npm test` run at 02:13 UTC then passed, including 75 UI regressions and 5,169 extended-conductor checks. These are modeled-state checks, not real-browser verification. Re-run the aggregate after any subsequent edits.

## Actual browser/device QA: blocked, not passed

The cloud workspace is usable for editing and Node calculations. It is not the user's offline computer. Browser capability discovery on this run found no supported own-cloud browser controller or `open_in_codex` route; the available CUA tool explicitly operates the user's computer. The portable Sites preview reference was reviewed (`SITES_MANAGED_LINUX_CONTAINER` is unset). The prior Chromium launch had failed because OS socket operations were denied; that same blocked launch was not retried and no denial was bypassed. No user computer was operated or provisioned.

Consequently, actual desktop/mobile rendering, touch interaction, screenshot inspection, browser localStorage/download behavior, focus/keyboard behavior, print dialog/PDF pagination, and full phone/desktop flows **were not verified in a real browser**. Existing VM/DOM-model tests can check state and emitted HTML but are not substitutes for browser rendering or device QA. No screenshots or real-device pass are claimed.

## Reproduction

Run `node worked-examples-tests.mjs` for this report's numerical fixtures. Run `npm test` for the separately maintained aggregate regression suite. Re-run both after any later calculation or integration edits. Real-browser QA remains a separate release-verification limit until a supported browser is available.


## v2.4.0 workflow and precision regression

The optional partner workflow covers both definition directions, missing/valid/failing partners, preservation of entered invalid pairs, primary-only no-ceiling semantics, standard-device limits, below-FLC cautions, immutable migration and explicit-pair requirements for conductor checks. Current display is one decimal; device ratings and unrounded internal thresholds are unchanged. Snapshot/PDF regression distinguishes new frozen display values from historical results. Final local verification: all 24 npm test suites pass, including 798 breaker-pair combinations, 30 calculated-current display rows, 18 exact device-rating rows, summary/PDF precision, unrounded threshold boundaries and byte-identical historical PDF output. Every dist/*.js file passes node --check; git diff --check is clean. Real-browser QA remains blocked by the existing private-site login handoff; no browser retry or screenshot verification was performed for this release.

## v2.5.0 saved projects and exact phase-factor notation

Local automated coverage includes existing/new project selection, normalized project reuse across calculator saves, deterministic browser-local timestamp defaults, themed and labeled native dialogs, Cancel/Escape/navigation cleanup, modeled focus restoration, grouped counts, recoverable project/all clear, individual restore, atomic failed writes, record-cap preservation, and historical snapshot/PDF compatibility. The dialog suite checks 24 modeled DOM/source contracts; native focus trapping and visual layout remain real-browser checks, not claimed passes.

Three-phase method strings now show √3; actual calculation math remains full-precision Math.sqrt(3). New reports spell this sqrt(3) in the PDF-compatible font, while old snapshots retain their prior PDF rendering. Boundary fixtures distinguish exact √3 from a rounded 1.732 factor. Existing current precision and bidirectional breaker checks remain in the aggregate suite.

Verification: all 26 npm test suites pass. All dist/*.js files pass node --check, and git diff --check is clean. Storage tests additionally pass with America/New_York and Asia/Kolkata time zones. Live private-site visual and keyboard QA remains blocked by the existing owner-login handoff; no login retry, denied browser workaround, screenshots, deployment or browser pass is claimed by this implementation task.

## v2.6.0 — standalone voltage drop with PF

- Full `npm test` passed after the AC-model update, including the new 624-case source-table/PF suite.
- JavaScript syntax and `git diff --check` passed.
- Regression coverage: Table 9 Cu/Al PVC/steel R/X values, PF 1/0.8/0.5/0.001, single/three phase, unrounded 3% and 5% boundaries, zero inputs, malformed/overflow values, unsupported #14 Al/700 kcmil, 600 V acceptance / above-600 V rejection, and drop beyond starting voltage.
- Modeled UI: Starting Voltage scoped to standalone drop; PF and raceway input; no standalone target; percent hero before adjacent volt-drop/end-voltage metrics; text meaning with all three semantic colors. Both light/dark colors exceed 4.5:1 text contrast on their result surfaces.
- Modeled copy/PDF/save/load: current 2.6.0 summaries include method/scope; old targets are dropped on load; original snapshots and old PDF outputs remain unchanged. Optional integrated conductor/service targets and 700-kcmil calculations still pass their existing suites.
- NEC 2017 Table 9 is an explicit older source, not represented as independently verified final 2023 data. 2021 IECC C405.10 limits combined-path drop where applicable; the standalone status does not certify compliance.
- Real-browser visual/keyboard/download QA was not run. The known owner-login handoff remains pending; it was not retried. No screenshots or deployed-site QA claimed.

## v2.6.1 — aluminum raceway and concise input labels

- All 27 `npm test` suites passed, including 936 sourced Table 9 coefficient/formula cases across PVC, Steel and Aluminum raceways, both conductor materials, both phases and four PF values.
- Added Table 9 aluminum-conduit resistance data for every supported size through 750 kcmil. PVC and aluminum share the explicitly combined reactance column, but aluminum resistance is independently selected. Source: NEC 2017 Table 9, printed page 70–690 / PDF page 693, linked from the calculator.
- Modeled UI verifies Steel / Aluminum / PVC options, the Power factor label, retained lagging displacement explanation in Input guidance, leading-PF limitation and actual-current guidance. Raceway switching checks distinct resistance/reactance values for both conductor materials. Current copy/PDF snapshots retain Aluminum selection and method/scope.
- Existing tests still cover the 600 V scope, unsupported #14 aluminum and 700 kcmil, threshold colors, integrated model isolation and immutable historical reports.
- All `dist/*.js` files pass `node --check`; `git diff --check` is clean. App/cache/snapshot version is 2.6.1.
- Real-browser visual/keyboard QA was not run; the existing owner-login handoff was not retried. No deployment or GitHub changes were made by this implementation task.

## v2.7.0 — cable tray screening and favorites dashboard

- All 31 aggregate `npm test` suites passed against the final code. All `dist/*.js` files pass `node --check`; `git diff --check` is clean. App/cache/snapshot version is 2.7.0.
- New cable-tray engine: 167 formula, exact-boundary, geometry, invalid-number and scope checks cover both tray constructions; below-4/0, 4/0-and-larger and mixed power methods; control/signal-only depth cap; exact 9-in. solid table value; negative residual budgets; width auto-selection, selected failures and over-range behavior. Status comparisons retain unrounded values and use no fill-expanding tolerance.
- Tray modeled UI/report integration verifies actual-OD row inputs, name escaping, numeric edits, conditional size-class controls, single-conductor rejection, highest cable-rating limit, conservative power-depth scope, row additions, reset, source edition, complete copy/PDF input rows, named saved-load workflow and immutable saved snapshots/PDF.
- Source qualification is explicitly visible in results and exported reports: NFPA 2023-cycle development record and Eaton 2014 guide. No claim of independent verification against final adopted NEC. Physical-fill screening is separate from ampacity, tray structural loading, bonding, cable packing and installation approval.
- Dashboard persistence and modeled UI tests cover genuine user calculation activity, no generated activity from default visits/reset, keyboard-semantic star buttons, repeated toggling without hash navigation, focus restoration, storage reload, recent-state resume/current-engine recalculation, separate saved reports, local-storage isolation, blocked/full storage warnings, corruption preservation, JSON sanitization and HTML escaping.
- Existing conductor/service/transformer/protection/drop/box/conduit regression suites and historical report migration checks remain green. Existing records are not rewritten by dashboard state.
- Real-browser visual, keyboard and download QA was not run. The private-site owner-login handoff remains pending; it was not retried. Chromium presence was checked, but no browser/server was launched and no alternate preview route or permission escalation was attempted. No deployed-site QA or screenshots are claimed.
- Implementation task made no deployment, Git commit or GitHub push.

## v2.8.0 — inline favorites, tray layouts and parallel voltage drop

- All 31 aggregate `npm test` suites pass. Every `dist/*.js` passes `node --check`; `git diff --check` is clean. App, cache and current-snapshot versions are 2.8.0.
- Favorite modeled-DOM tests cover SVG fill states, sidebar/title/tool-list peers, repeated toggling, persistence, no hash navigation, focus and storage failures. Static CSS checks cover the 276px sidebar, one-line labels and accessible full title text. Real-browser visual and keyboard testing is not claimed.
- 318 tray engine checks (151 new) cover the preserved multiconductor rules, exact-size classification, legacy records, bounded single-conductor methods, 1/0–4/0 mixed-size diameter sums, 250–750 area allowances, triangle/square envelopes, quantity divisibility, single-layer restrictions, eligibility/rung-spacing conditions, and product-specific OD provenance/voltage guards. UI workflows cover size changes, Cu/Al reference selection, manual overrides, grouping, report inputs, PDF and immutable saved snapshots.
- Standalone VD tests include 936 baseline impedance/PF cases and 1,584 parallel-current-sharing cases; integer 1–20 set limits, minimum 1/0 size, one-decimal total/per-set currents, legacy one-set migration, saved/copy/PDF output and integrated-sizing isolation all pass.
- NEC tray methods remain source-bounded screening using NFPA 2023-cycle development material and Eaton's 2014 guide, not independently verified final adopted-code certification. Layouts do not confer ampacity or installation approval. Southwire reference ODs are approximate and require verification against purchased cable.
- No new deployment or remote push was performed for this local verification. Browser QA remains pending the existing access/environment limitation; numerical, modeled-DOM and static checks are the completed evidence.

## v2.8.1 — provenance qualification / known tray arrangement regression

- Official NEC 2023 reader is the new reference destination; base-text verification remains pending behind reader sign-in. Tests cannot establish code compliance. See `VERIFICATION-STATUS.md`.
- NEC-based calculations and new summaries/PDFs retain an explicit pending-verification warning. Historical record exports remain unchanged.
- Replaced citation-specific tests with exact official-reader/pending-status assertions. Existing numerical/boundary/legacy suites remain in the aggregate test command.
- Added `provenance-tests.mjs`: pending labels and warnings, official reference URLs, manufacturer product versus code/physics distinction, and prohibited large-cable triangle/square cases for ladder/solid trays at auto/6/36-in widths.
- Existing tray stacking regression now requires failed status and null supported selection/minimum. Separate numerical-fit diagnostics are preserved.
- Full `npm test`, JavaScript syntax checks and `git diff --check` are required for this revision. This entry records automated/modelled coverage; it does not claim a live browser visual inspection or published-code verification.

## v2.10.0 — raceways, conservative parallel-floor grounding and concise copy

- Full aggregate `npm test` passed, every `dist/*.js` passed `node --check`, and `git diff --check` is clean.
- 1,130 new checks cover all five raceway tables, exact/under/over published fill boundaries, Cu/Al configurations, final physical EGC fill, parallel-floor sizing with/without VD, unchanged non-floor examples, concise copy and comprehensive reports.
- UI regression covers raceway selection, navigation, report inputs, save/load/reset, date-free displayed labels, clipboard success and fallback. Existing historical summary/PDF hashes remain unchanged.
- Real-browser visual/keyboard QA and live deployment are not part of this implementation task; no screenshot or deployment claim.
