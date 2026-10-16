# v2.14.0 MV cable-reference update

Source checks completed 2026-10-15/16. This release provides bounded copper MV cable presets through 35-kV class, including a 34.5-kV nominal line-to-line study. Exact table rows, source revisions, units, exclusions and assumptions are in `MV-CABLE-SOURCES.md`.

- Southwire SPEC 46002 (MV-90, 2.4-kV singles) and SPEC 46006 (MV-105, 2.4-kV factory three-conductor): visually checked AC conductor resistance at 90°C and inductive reactance at 60 Hz. Coherent conductor-series model; adjacent sequence columns are not mixed into it. Nonshielded construction, nonferrous-conduit arrangement.
- Prysmian AIRGUARD AIG-0001-1121, pages 13–15: 32 visually checked 5/15/25/35-kV Cu 133%-insulation entries. Published positive-sequence R1/X1 at 105°C, shields short-circuited with no earth return. 90°C is the stated manufacturer estimate of 96% R, unchanged X. **Frequency is an explicit 60-Hz engineering assumption, not a verified table parameter.** The inconsistent 35-kV 750-kcmil entry is omitted without substitution.
- Prysmian TRXLPE URD PDN-0023-0713, pages 5/9/13/17: 36 visually checked Cu, one-third concentric-neutral, 133%-insulation direct-buried positive-sequence R1/X1 entries at 90°C. The optional UL MV-90 construction is required. **60 Hz and application of companion ampacity geometry/bonding notes to impedance are engineering assumptions:** flat three-single-cable layout, 7.5-inch adjacent centers, short-circuited shields. This is not a newly manufacturer-confirmed impedance geometry or bond-location verification.

All manufacturer micro-ohm/foot data is converted to ohm/1,000 ft by 0.001. No sequence/conductor-column mixing, blanket temperature correction, missing-size interpolation or universal MV impedance is used. Presets reject single phase, parallel sets and mismatched saved geometry/temperature. The 35-kV cable class is distinct from a 34.5-kV system voltage. The 133% insulation-level design basis includes clearing ground faults within one hour; it is not a voltage multiplier or a complete grounding/insulation-coordination determination.

This verifies bounded source data and implementation behavior, not ampacity, accessories, protection, complete cable-system design or a new published-NEC audit. The series-only calculation excludes charging/shunt capacitance; long/lightly loaded runs can require a full network model. Project R/X remains an explicit source-preserving override. Historical saved reports are immutable. Real-browser QA remains unverified; local preview was unreachable. Private Sites deployment is verified separately.

---

# v2.13.0 VA / current conversion update

Added direct VA-to-current and current-to-VA relationships for single-phase and balanced three-phase loads. Three-phase uses line-to-line voltage and exact `Math.sqrt(3)`; VA conversions are independent of power factor. The existing watts conversions and NEC sizing modules retain their calculation rules. The single-phase voltage wording is clarified without changing voltage validation, phase bases or transformer winding treatment.

These are steady-state electrical relationships, not conductor, OCPD, demand or equipment sizing. No additional published-code audit or project-installation verification is implied. Saved historical reports retain their original version, wording and results. Automated regression scope is recorded in `QA-REPORT.md`; real-browser QA remains unverified because the local preview was unreachable.

---

# v2.12.0 voltage and design-input update

The single voltage selector and removal of manual engineering confirmations do not expand the published-code audit. Selected values are design assumptions; actual equipment, cable listing, installation, supervision and ambient conditions remain unverified. No new confirmation is inferred from legacy flags. Numerical constraints and code-model limits remain in force.

Custom voltage is accepted at any positive finite value by ideal Watts/Amps and transformer current formulas, subject to representable results. The standalone manual-R/X voltage-drop option uses designer-supplied series impedance, not NEC Table 9 coefficients or a newly verified MV table. It implements the first-order series-only steady-state relation; actual cable temperature, frequency, geometry, sequence basis, equal current sharing and applicability are the designer's responsibility. Cable charging/shunt capacitance, sheath/bonding studies and full MV cable-system design are excluded. Its reports explicitly identify unverified project R/X and carry no Table 9 verification label.

Built-in Table 9 remains ≤600 V; integrated THHN/THWN-2 sizing and Table 450.3(B) protection remain ≤1,000 V; tray remains ≤2,000 V. The prior bounded published-text audit below is unchanged. All 42 automated numerical/modeled-DOM/report suites, syntax and whitespace checks passed. Real-browser QA and deployment were not performed by this implementation task.

---

# v2.11.0 tray-input and status update

This release reuses the previously checked NEC 2023 Table 5 THHN/THWN-2 **areas**. It derives a preliminary single-conductor diameter estimate with `sqrt(4A/pi)`, at full internal precision, for standard noncompact 1/0–750 kcmil conductors through 600 V. The displayed label explicitly says area-derived estimate. The published diameter column was not newly reverified and the estimate is not manufacturer-certified actual OD. Existing Southwire Cu/Al approximate references remain available; manual actual OD is required for other constructions, including multiconductor jackets. Estimate-based runs retain conditional status and product verification remains separate.

The 9 in. rung value is an unverified preliminary design assumption for ladder trays containing 1/0–4/0 singles under the previously checked 392.10(B)(1) scope. It is not tray support span, an ampacity spacing entitlement or extra fill capacity. Actual installation confirmation is explicit. Existing overrides survive migration; spacing over 9 in. produces an actionable failure. Larger-only single-conductor trays have no artificial 9 in. limit.

Triangle/square quantities now mean groups, while all NEC fill calculations still operate on their individual physical conductors/cables. Legacy physical counts and old saved report content are preserved. Unknown/conditional status is neutral; actual allowance comparisons use unrounded values for green/red checks. Passing fill is never an ampacity calculation or installation approval. No modeled NEC table values were changed.

All 39 numerical/modeled-DOM/report suites, distribution JavaScript syntax checks and whitespace checks passed. Real-browser visual/interaction/print/download QA was not performed, and this local implementation did not deploy or push. See `QA-REPORT.md` for scope and boundary evidence.

---

# v2.10.2 disclaimer update

Added the requested engineering/electrician-judgement sentence to the shared baseline footer and newly generated full reports/PDFs. Clipboard summaries remain inputs and outputs only. Pre-2.10.2 saved report exports retain their original disclaimers, source qualification and byte layout.

Removed the obsolete live basic/OCPD-only transformer sentence claiming final NEC 2023 protection text had not been independently accessed. The published-text audit below already covers the modeled Table 450.3(B) provisions. This narrow accuracy correction does not extend that audit, remove installation-specific constraints or alter calculation rules. Historical snapshot content remains untouched. Automated verification is recorded in `QA-REPORT.md`; browser visual/interaction QA remains unverified.

---

# v2.10.1 presentation update

The conductor-only presentation patch changes no numerical sizing rules or published-code tables. Fill color is binary against the same published Table 4 allowance used by minimum-raceway selection, not a percentage-rounded comparison; no orange NEC fill threshold is introduced. Integrated conductor drop color uses the existing unrounded 3% / 5% guidance thresholds, separately from the entered design target. This is a display convention, not a new compliance determination.

Optional raceway selection retains the explicit EMT default. The conservative Cu EGC calculation, input migrations and stored historical reports are unchanged. Automated details/print, threshold, persistence and reporting coverage is recorded in `QA-REPORT.md`. Real-browser visual/keyboard QA and live-site verification remain unperformed for this patch.

---

# v2.10.0 update

On 2026-10-13, the authenticated NFPA LiNK rendered NEC 2023 reader was used to verify Chapter 9 Table 4 EMT, IMC, RMC, PVC Schedule 40 and Schedule 80 total/40% areas from 1/2 through 4 inches. `raceway-table-fixture.json` records the transcription and exact official section URLs. Runtime selection uses published allowances, not rounded total area multiplied by 0.4.

250.122(A)/(B)/(F) and 310.10(G) were checked in the published reader. They do not provide an explicit parallel-floor proportional baseline. Affected cases now use a conservative full-size insulated Cu EGC: max(final individual phase CM, full-OCPD Table 250.122 Cu CM), including final voltage-drop size. This is not a calculated minimum; grounding-path, terminations, bonding and installation adequacy remain separate. Current physical fill uses that conservative EGC. The provisional workflow described in the historical entry below is superseded.

User-facing checked-date labels are removed; source verification metadata and this audit history remain. Historical snapshot summaries and PDFs retain their original content. Clipboard-only summaries now include inputs and outputs, while full reports remain comprehensive.

---

# Published-code verification status — v2.9.0

Audit date: 2026-10-13. Implementation baseline: v2.8.1, commit `83879b0d3937ed78f019031e6c53a04257169f80`.

## Release qualification

The named modeled provisions below were compared with the actual published NEC 2023 text in authenticated official NFPA LiNK on 2026-10-13. This replaces the earlier reader-sign-in blocker. Development proposals and manufacturer guides are no longer the verification basis for these checks. This is a bounded calculation audit, **not certification of NEC compliance or an installation**. Only explicitly named checks carry a verification date in the application. Separate-review citations carry no verified date.

Equipment listings, actual route conditions, utility rules, locally adopted editions and amendments, AHJ determinations, and unmodeled exceptions remain project-specific. The application does not calculate complete loads, neutral adequacy, fault-path performance, grounding/bonding systems, or all installation requirements. Tests establish implementation behavior; the published-text comparison establishes the narrower source checks described here.

## Verified modeled provisions

| Module / feature | Published-text check and result | Remaining bounds |
| --- | --- | --- |
| Conductor ampacity | [Table 310.16](https://link.nfpa.org/publications/70/2023/chapters/3/articles/310#ID000700001761): all 123 populated Cu/Al 60/75/90°C cells match | #14–750 Cu, #12–750 Al; supported insulation and route only |
| Correction / adjustment / parallel sets | [310.15 and 310.10(G)](https://link.nfpa.org/publications/70/2023/chapters/3/articles/310): all 15 modeled 90°C ambient bins, six >3 CCC factors, neutral/EGC counting, rooftop 33°C condition/exception, and parallel minimum/matching requirements checked | Ambient capped at 80°C; three-phase 4-wire neutral counted conservatively; field route and matching remain unverified |
| Terminations | [110.14(C)](https://link.nfpa.org/publications/70/2023/chapters/1/articles/110): termination limit and higher-insulation correction basis checked | User-selected rating does not establish equipment listing; lowest connected rating governs |
| OCPD | [240.4(D)/(C), 240.6(A)](https://link.nfpa.org/publications/70/2023/chapters/2/articles/240): five small-conductor caps and all 36 modeled standard ratings match; no-next-size-up approach retained | Model ends at 4000 A and excludes specialized protection rules |
| Feeder EGC | [Table 250.122, 250.122(B)/(F)(1)(b)](https://link.nfpa.org/publications/70/2023/chapters/2/articles/250): all 17 Cu rows, total-OCPD basis per parallel raceway, and modeled voltage-drop CM increase checked | Parallel 1/0 floor and other non-thermal upsizing require manual review; fault-path adequacy/bonding not established |
| Commercial service | [230.42(A)/(B), 230.79(D)](https://link.nfpa.org/publications/70/2023/chapters/2/articles/230): general-service 60 A minimum and conductor/disconnect relationship checked | Enter completed design current; no load calculation, utility approval, neutral, service grounding/bonding design, or specialized exceptions. 230.90 and grounding citations remain separate review |
| Transformer winding protection | [Table 450.3(B), note 1](https://link.nfpa.org/publications/70/2023/chapters/4/articles/450): primary-only 125/167/300%, dual-primary 250%, secondary 125/167%, and next-standard only for applicable 125% cells match | Grouped secondary OCPDs and coordinated-thermal exceptions excluded; table ceilings are not equipment selections |
| Transformer secondary conductors | [240.21(C)(2)/(6)](https://link.nfpa.org/publications/70/2023/chapters/2/articles/240): 10-ft and 25-ft conditions and primary-rating × voltage-ratio floors match; no 240.4(B) next-size allowance | User must confirm physical installation conditions; 250.30 separately derived-system design remains separate |
| Conduit fill | [Chapter 9 Table 1](https://link.nfpa.org/publications/70/2023/chapters/9/sections/ID000700011313), [Table 4](https://link.nfpa.org/publications/70/2023/chapters/9/sections/ID000700011315), [Table 5](https://link.nfpa.org/publications/70/2023/chapters/9/sections/ID000700011328): 53/31/40%, conductor/EGC counting, all 21 THHN/THWN-2 areas, 10 EMT total areas and 30 permitted-area cells verified | EMT 1/2–4 in.; insulated standard noncompact conductors only; no nipple exception, cables, bare grounds or pulling-feasibility assessment |
| Standalone voltage drop | [Chapter 9 Table 9 and note 2](https://link.nfpa.org/publications/70/2023/chapters/9/sections/ID000700011331): all 157 populated R/X cells and effective-impedance relation match | 60 Hz, 75°C, ≤600 V, three-conductor conduit geometry; single-phase approximation, lagging sinusoidal PF and balanced/equal parallel sharing only |
| Voltage-drop guidance / integrated estimate | [210.19 Informational Note](https://link.nfpa.org/publications/70/2023/chapters/2/articles/210) and [215.2(A)(2) Informational Note No. 2](https://link.nfpa.org/publications/70/2023/chapters/2/articles/215): general 3% segment / 5% combined guidance checked. [Table 8](https://link.nfpa.org/publications/70/2023/chapters/9/sections/ID000700011330): all 13 modeled AWG circular-mil values match | Guidance is not a universal mandatory limit. Integrated K/CM method remains a separate resistance-only engineering approximation, not Table 9 |
| Box fill | [314.16(B)(1)–(6), Table 314.16(B)(1)](https://link.nfpa.org/publications/70/2023/chapters/3/articles/314): five volumes, conductor/clamp/support/yoke/ground allowances and terminal-block assemblies checked | Uniform #14–#6; mixed sizes, unusual devices, long loops and special exceptions need separate review |
| Cable tray | [392.22(A)(1)–(4)/(B)(1), 392.10(B)(1), 392.20(C)/(D), 392.80(A)(2)(d)](https://link.nfpa.org/publications/70/2023/chapters/3/articles/392): all 21 modeled area-table cells, width/diameter and mixed deductions, control fill/depth caps, single-layer and grouping constraints checked | Bounded round-cable/tray layouts; fill does not determine ampacity, free-air eligibility, structural capacity, grounding/bonding or field installation |

Transformer current and W/VA/current conversions remain electrical relationships rather than NEC sizing determinations. Southwire SPEC 10000/10012 nominal cable diameters remain manufacturer product references, not code authority; exact purchased-cable dimensions and listing require verification. The 2021 IECC C405.10 overlay remains a separate adopted-energy-code question and was not reverified in this NEC audit.

## Evidence-backed corrections

- Box fill now includes one allowance for each terminal-block assembly under 314.16(B)(6), based on the selected uniform conductor size, which must include the largest conductor terminated. Missing legacy input defaults to zero. Corrected the table identifier to Table 314.16(B)(1).
- Both conduit paths now use the published Table 4 allowed-area cells, rather than multiplying rounded total area by a percentage. Example: 3/4-in. EMT with 0.2131 in² was formerly below 0.533 × 40% but exceeds the published 0.213 in² allowance; it now fails. Exactly 0.122 in² in 1/2-in. EMT now passes its published allowance. Table-area summation uses exact four-decimal units to avoid binary roundoff at equality.
- Voltage-drop note citations now point to 210.19 Informational Note and 215.2(A)(2) Informational Note No. 2, rather than the incorrect subdivision labels.
- When the parallel 1/0 floor raises phase conductors above their unrestricted modeled ampacity selection, EGC and EMT outputs are explicitly provisional and a prominent manual-review warning is included in the result and reports. Metadata records `groundingReviewRequired`. The warning also applies when voltage-drop sizing adds a further modeled EGC increase. No unsupported parallel-floor ratio was invented; final EGC selection and physical fill must be reviewed separately.

## Records, tests and remaining review

New sources and reports identify v2.9.0 and the 2026-10-13 bounded checks. Existing saved snapshots and their PDFs are immutable: loading recalculates with v2.9.0; exporting an existing saved snapshot retains its original results, version and source qualification. Earlier README/QA release entries below remain historical and are superseded only for the specific checks above.

Regression coverage includes all existing numerical/modeled-UI suites plus `published-nec-tests.mjs`: exact fill columns and near-boundary behavior, terminal-block counts/invalid inputs/legacy defaults, parallel-floor provisional labels and report metadata, unaffected non-floor outputs, dated scoped sources, and historical-snapshot preservation. Real-browser visual/interaction checks and publication status are separate from these automated tests.

Previously reviewed issued corrections [Errata 70_23_5](https://docinfofiles.nfpa.org/files/AboutTheCodes/70/Errata%2070_23_5.pdf) and [Errata 70_23_6](https://docinfofiles.nfpa.org/files/AboutTheCodes/70/Errata%2070_23_6.pdf) concern service grounded-conductor references and motor EGC wording, respectively. Those designs are not calculated here. This audit does not claim an exhaustive current errata/TIA register or local adoption review; confirm applicable changes for each project.

## Historical source inventory

The following are source-history records from the v2.8.0 implementation, not primary authorities offered in new calculator references. Retaining them makes the prior basis auditable; it does not endorse their correctness or currency.

### dist/calc.js

- NFPA 70 / NEC (2023): adopted edition and local amendments must be verified: https://www.nfpa.org/codes-and-standards/nfpa-70-standard-development/70
- Schneider Electric: conductor ampacity and temperature limitations: https://ckm-content.se.com/ckmContent/sfc/servlet.shepherd/document/download/0691H00000EDoMRQA1
- Schneider Electric: a 90°C lug rating alone does not qualify a breaker for 90°C ampacity: https://www.se.com/us/en/faqs/FA115128/
- Eaton: equipment listing and termination temperature limits, handbook section 7.7.6 (2017; verify adopted edition): https://www.eaton.com/content/dam/eaton/markets/machinebuilding/protect-personnel-assets-and-machine-reliability/documents/documents-english-language/bus-ele-br-3002-spd-2017_safe.pdf
- HELUKABEL: NEC 2023 Cu/Al ampacity and correction tables (Table 310.16: copper page 1, aluminum page 3): https://www.helu.com/helu/us/publications/technical-documents/allowable-ampacity-tables.pdf#page=3
- Schneider Electric Electrical Installation Guide: power and current: https://www.electrical-installation.org/enwiki/Power_loading_of_an_installation
- NFPA 2017 original Table 5: THHN dimensions (2023 final not independently verified): https://cms7files.revize.com/johnsontn/document_center/Development%20Services/Codes/Resource%20Docs/2017-NEC-Code-2.pdf#page=688
- Wheatland: EMT dimensions, p4: https://www.wheatland.com/wp-content/uploads/2018/03/EMT-and-Conduit-Brochure.pdf#page=4
- Service Wire: conduit-fill percentage method: https://www.servicewire.com/ServiceWire/Resources/Customer-QA/Conduit-Fill.htm
- Schneider: informational 3% branch / 5% combined voltage-drop guidance: https://productinfo.se.com/na-std-ref/5c0fee4b347bdf0001de4d55/Conductor%20Ampacity%20Tables/English/Data%20Bulletin%20-%20Conductor%20Ampacity%20Tables%20(bookmap)_0000264293.ditamap/$/NEC210.19ConductorsMinimumAmpacityA-F20BBAC1
- NFPA code-development record: conductor volume allowances and existing yoke rule: https://docinfofiles.nfpa.org/files/AboutTheCodes/70/70_A2025_NEC_P08_FD_PIResponses.pdf
- NFPA code-development record: grounding conductor box-fill allowance: https://docinfofiles.nfpa.org/files/AboutTheCodes/70/70_A2022_NEC_P09_FD_PIReport_rev_1029.pdf
- NFPA 2023 development record: 250.122(B) proportional circular-mil increase, page 44; verify adopted text: https://www.nfpa.org/api/files?path=%2Ffiles%2FAboutTheCodes%2F70%2F70_A2022_NEC_P05_SD_SRStatements.pdf#page=44
- Eaton: 2023 NEC standard OCPD ratings, page 35: https://www.eaton.com/content/dam/eaton/products/electrical-circuit-protection/fuses/code-updates/bus-ele-br-11318-2023-NEC-code-changes.pdf
- Southwire: licensed Table 250.122 Cu EGC sizes (2017 reproduction; verify adopted edition): https://www.southwire.com/medias/sys_master/installation-manuals/installation-manuals/hca/hff/8887676010526/MC-Installation-Guide-Southwire.pdf
- Southwire: AA-8000 aluminum THHN/THWN-2 construction, availability and product dimensions: https://www.southwire.com/wire-cable/building-wire/simpull-sup-sup-thhn-thwn-2-aluminum-with-alumaflex-sup-sup-brand-conductors/p/SPEC10012
- NFPA code-development record: 230.79 general minimum service disconnect ratings (verify adopted NEC 2023): https://docinfofiles.nfpa.org/files/AboutTheCodes/70/70_A2022_NEC_P10_FD_PIResponses.pdf
- NFPA record: 2023 service-grounding subsection renumbering under 250.24: https://docinfofiles.nfpa.org/files/AboutTheCodes/70/70_A2025_NEC_P05_FD_MeetingAgenda_0124.pdf
- UL: panelboards, wire and termination temperature ratings: https://www.ul.com/thecodeauthority/knowledge/panelboards-guide
- NEC 2017 Chapter 9 Table 9: AC resistance, reactance and effective impedance: https://cms7files.revize.com/johnsontn/document_center/Development%20Services/Codes/Resource%20Docs/2017-NEC-Code-2.pdf#page=693
- 2021 IECC C405.10: combined voltage-drop limit: https://codes.iccsafe.org/content/IECC2021V3.0/chapter-4-ce-commercial-energy-efficiency

### dist/transformer-protection.js

- NFPA 70: verify adopted NEC 2023 text and local amendments: https://www.nfpa.org/codes-and-standards/nfpa-70-standard-development/70
- Eaton transformer protection, section 7.19 (2017 manufacturer guide; verify final adopted 2023 text): https://www.eaton.com/content/dam/eaton/products/electrical-circuit-protection/fuses/technical-literature/bus-ele-br-3002-spd-2017.pdf
- NFPA code-development record: Table 450.3(B) and notes; not final licensed NEC 2023: https://docinfofiles.nfpa.org/files/AboutTheCodes/70/70_A2025_NEC_P09_FD_PrelimFR.pdf
- NFPA code-development record: 240.21(C)(2) 10-ft secondary conductors; verify adopted text: https://docinfofiles.nfpa.org/files/AboutTheCodes/70/70_A2025_NEC_P10_FD_PIResponses.pdf
- Eaton: transformer secondary conductor rules, pp. 27–28 (historical guide; verify adopted text): https://www.eaton.com/content/dam/eaton/products/electrical-circuit-protection/fuses/technical-literature/ne02-brochure.pdf
- HELUKABEL: NEC 2023 copper/aluminum ampacity and ambient tables: https://www.helu.com/helu/us/publications/technical-documents/allowable-ampacity-tables.pdf
- Schneider Electric: 90°C lug marking alone does not qualify equipment for 90°C ampacity: https://www.se.com/us/en/faqs/FA115128/

### dist/cable-tray.js

- Southwire Cu THHN/THWN-2, 600 V · SPEC 10000 (approximate nominal OD; verify purchased cable): https://cabletechsupport.southwire.com/en/tile/3/spec/10000/?country=US
- Southwire Al THHN/THWN-2, 600 V · SPEC 10012 (approximate nominal OD; verify purchased cable): https://cabletechsupport.southwire.com/en/tile/30/spec/10012/?country=US
- NFPA 2023-cycle development record: 392.10(B), 392.20(C)/(D), 392.22(A)/(B), 392.80(A), PDF pp. 116–120 and 123; not final adopted text: https://docinfofiles.nfpa.org/files/AboutTheCodes/70/70_A2022_NEC_P08_SD_MeetingAgenda_10_21.pdf#page=119
- Eaton cable tray manual (2014): multiconductor fill methods and table-depth explanation; verify adopted edition: https://www.eaton.com/content/dam/eaton/products/support-systems/cable-management/ct-manual.pdf
- NFPA 70: verify final adopted edition and local amendments: https://www.nfpa.org/codes-and-standards/nfpa-70-standard-development/70

### dist/ambient-helper.js

- NFPA rooftop development agenda: https://docinfofiles.nfpa.org/files/AboutTheCodes/70/70_A2022_NEC_P06_SD_MeetingAgenda_10_21.pdf
- MIRO manufacturer explanation: https://www.miroind.com/2026/06/03/conduit-roof-supports-nec-requirements/
