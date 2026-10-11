# MEP Workbench: independent calculation QA

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
