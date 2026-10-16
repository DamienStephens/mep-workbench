# MV cable coefficient ledger — v2.14.0

Source review: 2026-10-15/16. This ledger records the selected reference constructions, exact paired data, exclusions and engineering assumptions. These are bounded voltage-drop presets, not generic impedance by MV temperature rating. All coefficient tables below are in **Ω/1,000 ft**. Independently transcribed source fixtures are in `mv-cable-tests.mjs`.

## Shared calculation scope

One balanced three-phase circuit, one-way length and lagging displacement PF: `sqrt(3) × I × L/1000 × (R × PF + X × sqrt(1 − PF²))`. Use the listed conductor-series pair or positive-sequence pair together; never mix a conductor column with a sequence or capacitive column. No missing-size interpolation, universal MV-90/MV-105 impedance, single-phase return-path extrapolation or parallel-circuit division is provided.

Cable voltage class, insulation percentage, nameplate temperature rating and calculation temperature are separate. A 35-kV class is used for a 34.5-kV nominal line-to-line study; numerical voltage ≤35,000 V does not alone establish suitability for actual voltage variation or the grounding/protection/accessory system. For the selected 133% families, the application basis is ground-fault clearing within one hour plus project insulation coordination. It is not a 1.33× continuous-voltage multiplier and is not simply a grounded-versus-ungrounded selection. The [Prysmian / General Cable Electric Utility Catalog, November 2016, printed p16 / PDF p24](https://na.prysmian.com/sites/na.prysmian.com/files/media/documents/UTY-0018-R1116_Electric%20Utility%20Catalog_CANADA.pdf#page=24) distinguishes continuous line-to-line rating and clearing-duration insulation levels.

## Source qualifications

### Southwire nonshielded references

SPEC 46002, revision 1.000.026 (2026-08-21), and SPEC 46006, revision 1.000.001 (2024-12-31), Table 2: conductor AC R at 90°C and inductive X at 60 Hz, explicitly Ω/1,000 ft. Units and all selected rows were visually checked. Nonferrous conduit/one-diameter center-spacing footnote. MV-105 uses its factory three-conductor construction; the same footnote is retained without reinterpreting it as arbitrary loose singles. Semiconducting screens are not metallic shields. No metallic shield-bonding correction applies. Both cable markings limit voltage to 2,400 V. Duplicate identical 500-kcmil (46002) and 350-kcmil (46006) impedance rows are consolidated; product dimensions and grounding-conductor adequacy are not selected. The MV-105 rating does not create 105°C coefficient data.

### Prysmian AIRGUARD factory-three-conductor reference

AIG-0001-1121, construction on p. 13, impedance on pp. 14–15. Revision is the printed document ID; November 2021 is inferred from its code, not asserted as a separately printed issue date. All 32 included rows and the µΩ/ft unit were visually checked. Multiplying published integers by 0.001 produces Ω/1,000 ft. Published R1/X1 is at 105°C with shields short-circuited and no earth return; no more specific bond location is claimed. At 90°C, the manufacturer allows the estimate R90 = 0.96 × R105 and unchanged X. This evaluates the same MV-105 cable at 90°C and does not relabel it MV-90.

**Engineering assumption:** 60 Hz, because the impedance table omits frequency. No external ferrous-enclosure correction is included. Native 3/C geometry is retained. The 115-mil 5-kV 133% / 8-kV 100% construction is used as 5 kV 133%; it is not mixed with the older 90-mil 5-kV table. Some source size-unit text incorrectly says AWG for sizes 250 and larger; those magnitudes are normalized to kcmil, consistently with the same family's equivalent rows and standard size nomenclature.

**Excluded:** 35-kV 750-kcmil QRF580A prints R1 = 10 µΩ/ft in both the older sheet and this catalog, inconsistent with adjacent 1000-kcmil and lower-voltage 750-kcmil rows. It is omitted pending clarification. No replacement 20 value, interpolation or hidden fallback is used.

### Prysmian TRXLPE URD single-conductor reference

PDN-0023-0713, issued July 2013, construction/options on p. 1, selected 133% Cu tables on pp. 5/9/13/17. Only compressed strandedCu, three-phase/one-third-concentric-neutral rows are used; solid/full-neutral/single-phase and in-duct columns are excluded. Every selected 90°C direct-buried positive/negative-sequence R/X pair and the µΩ/ft symbol were visually checked. Conversion is ×0.001. UL MV-90 is an **ordering option that must be present**, not an automatic listing on all utility cable.

**Engineering assumptions:** 60 Hz, and application of the source's companion ampacity layout/bonding notes to the neighboring impedance columns: three singles directly buried in a flat arrangement at 7.5-inch adjacent center spacing, short-circuited shields. The notes literally describe horizontal spacing and ampacity; the center-spacing interpretation and its impedance application are not claimed as independently manufacturer-confirmed. The source's ampacity context also lists 36-inch burial, 20°C ambient, thermal earth resistivity 90°C-cm/W and 100% load factor; this app neither performs that ampacity calculation nor treats thermal soil resistivity as electrical earth resistivity. No exact bond location or zero-sequence earth-return model is inferred. No temperature scaling of the total shield-loss-influenced R1 is used.

## Selected coefficients

### MV-90 · 2.4 kV · copper · single-conductor

ID: `mv90-epr-2400`. [Southwire SPEC 46002](https://cabletechsupport.southwire.com/en/cablespec/download_spec/?country=US&spec=46002), revision **1.000.026 · 2026-08-21**. Nonshielded NL-EPR/PVC, compressed bare copper, single-conductor. Conductor AC resistance and inductive reactance, table temperature **90°C**. 60 Hz published.

| Size | R | X |
| --- | ---: | ---: |
| 2 AWG | 0.204 | 0.0434 |
| 1 AWG | 0.162 | 0.0417 |
| 1/0 AWG | 0.128 | 0.0401 |
| 2/0 AWG | 0.102 | 0.0387 |
| 3/0 AWG | 0.081 | 0.0381 |
| 4/0 AWG | 0.065 | 0.0368 |
| 250 kcmil | 0.056 | 0.0373 |
| 350 kcmil | 0.041 | 0.0355 |
| 500 kcmil | 0.03 | 0.0337 |
| 750 kcmil | 0.023 | 0.0329 |
| 1000 kcmil | 0.019 | 0.0317 |

### MV-105 · 2.4 kV · copper · three-conductor

ID: `mv105-epr-2400`. [Southwire SPEC 46006](https://cabletechsupport.southwire.com/en/cablespec/download_spec/?country=US&spec=46006), revision **1.000.001 · 2024-12-31**. Nonshielded NL-EPR/PVC, compressed bare copper, factory three-conductor cable. Conductor AC resistance and inductive reactance, table temperature **90°C**. 60 Hz published.

| Size | R | X |
| --- | ---: | ---: |
| 2 AWG | 0.204 | 0.035 |
| 1/0 AWG | 0.128 | 0.032 |
| 4/0 AWG | 0.065 | 0.03 |
| 350 kcmil | 0.041 | 0.028 |
| 500 kcmil | 0.03 | 0.027 |

### MV-105 · 5 kV · copper · factory 3/C

ID: `mv105-epr-5000`. [Prysmian AIRGUARD 3/C](https://na.prysmian.com/sites/default/files/atoms/files/AIG-0001-1121_Airguard%20Catalog.pdf#page=14), revision **AIG-0001-1121 · pp. 13–15**. Compact copper, 115 mil EPR, 25%-overlap copper tape shields, factory three-conductor cable, polymeric protection/aluminum barrier/PVC. 133% insulation level. Positive-sequence R1 / X1, table temperature **105°C**. 60 Hz assumed.

| Size | R | X |
| --- | ---: | ---: |
| 2 AWG | 0.212 | 0.042 |
| 1/0 AWG | 0.134 | 0.039 |
| 2/0 AWG | 0.106 | 0.037 |
| 4/0 AWG | 0.067 | 0.035 |
| 250 kcmil | 0.057 | 0.034 |
| 350 kcmil | 0.041 | 0.032 |
| 500 kcmil | 0.029 | 0.031 |
| 750 kcmil | 0.02 | 0.03 |

### MV-105 · 15 kV · copper · factory 3/C

ID: `mv105-epr-15000`. [Prysmian AIRGUARD 3/C](https://na.prysmian.com/sites/default/files/atoms/files/AIG-0001-1121_Airguard%20Catalog.pdf#page=14), revision **AIG-0001-1121 · pp. 13–15**. Compact copper, 220 mil EPR, 25%-overlap copper tape shields, factory three-conductor cable, polymeric protection/aluminum barrier/PVC. 133% insulation level. Positive-sequence R1 / X1, table temperature **105°C**. 60 Hz assumed.

| Size | R | X |
| --- | ---: | ---: |
| 2 AWG | 0.212 | 0.049 |
| 1/0 AWG | 0.134 | 0.044 |
| 2/0 AWG | 0.107 | 0.043 |
| 4/0 AWG | 0.067 | 0.04 |
| 250 kcmil | 0.057 | 0.039 |
| 350 kcmil | 0.041 | 0.037 |
| 500 kcmil | 0.029 | 0.034 |
| 750 kcmil | 0.02 | 0.033 |
| 1000 kcmil | 0.016 | 0.032 |

### MV-105 · 25 kV · copper · factory 3/C

ID: `mv105-epr-25000`. [Prysmian AIRGUARD 3/C](https://na.prysmian.com/sites/default/files/atoms/files/AIG-0001-1121_Airguard%20Catalog.pdf#page=14), revision **AIG-0001-1121 · pp. 13–15**. Compact copper, 320 mil EPR, 25%-overlap copper tape shields, factory three-conductor cable, polymeric protection/aluminum barrier/PVC. 133% insulation level. Positive-sequence R1 / X1, table temperature **105°C**. 60 Hz assumed.

| Size | R | X |
| --- | ---: | ---: |
| 1/0 AWG | 0.134 | 0.049 |
| 2/0 AWG | 0.107 | 0.048 |
| 4/0 AWG | 0.068 | 0.044 |
| 250 kcmil | 0.057 | 0.043 |
| 350 kcmil | 0.041 | 0.04 |
| 500 kcmil | 0.029 | 0.038 |
| 750 kcmil | 0.02 | 0.036 |
| 1000 kcmil | 0.016 | 0.034 |

### MV-105 · 35 kV · copper · factory 3/C

ID: `mv105-epr-35000`. [Prysmian AIRGUARD 3/C](https://na.prysmian.com/sites/default/files/atoms/files/AIG-0001-1121_Airguard%20Catalog.pdf#page=14), revision **AIG-0001-1121 · pp. 13–15**. Compact copper, 420 mil EPR, 25%-overlap copper tape shields, factory three-conductor cable, polymeric protection/aluminum barrier/PVC. 133% insulation level. Positive-sequence R1 / X1, table temperature **105°C**. 60 Hz assumed.

| Size | R | X |
| --- | ---: | ---: |
| 1/0 AWG | 0.134 | 0.053 |
| 2/0 AWG | 0.107 | 0.051 |
| 4/0 AWG | 0.068 | 0.047 |
| 250 kcmil | 0.057 | 0.046 |
| 350 kcmil | 0.041 | 0.043 |
| 500 kcmil | 0.03 | 0.041 |
| 1000 kcmil | 0.016 | 0.037 |

### MV-90 option · 5 kV · copper · CN singles

ID: `mv90-cn-5000`. [Prysmian TRXLPE URD · UL MV-90 option](https://na.prysmian.com/sites/na.prysmian.com/files/media/documents/PDN-0023-0713_5-46kV%20TRXLPE%20URD%20(USA)_LR.pdf), revision **PDN-0023-0713 · July 2013**. Compressed stranded copper, 115 mil TRXLPE, one-third copper concentric neutral, LLDPE jacket; optional UL MV-90 construction. 133% insulation level. Positive-sequence R1 / X1 · direct-buried columns, table temperature **90°C**. 60 Hz assumed.

| Size | R | X |
| --- | ---: | ---: |
| 1/0 AWG | 0.143 | 0.094 |
| 2/0 AWG | 0.119 | 0.09 |
| 3/0 AWG | 0.101 | 0.085 |
| 4/0 AWG | 0.088 | 0.079 |
| 250 kcmil | 0.08 | 0.075 |
| 350 kcmil | 0.068 | 0.065 |
| 500 kcmil | 0.058 | 0.053 |
| 750 kcmil | 0.048 | 0.04 |
| 1000 kcmil | 0.041 | 0.031 |

### MV-90 option · 15 kV · copper · CN singles

ID: `mv90-cn-15000`. [Prysmian TRXLPE URD · UL MV-90 option](https://na.prysmian.com/sites/na.prysmian.com/files/media/documents/PDN-0023-0713_5-46kV%20TRXLPE%20URD%20(USA)_LR.pdf), revision **PDN-0023-0713 · July 2013**. Compressed stranded copper, 220 mil TRXLPE, one-third copper concentric neutral, LLDPE jacket; optional UL MV-90 construction. 133% insulation level. Positive-sequence R1 / X1 · direct-buried columns, table temperature **90°C**. 60 Hz assumed.

| Size | R | X |
| --- | ---: | ---: |
| 1/0 AWG | 0.141 | 0.094 |
| 2/0 AWG | 0.117 | 0.091 |
| 3/0 AWG | 0.099 | 0.086 |
| 4/0 AWG | 0.086 | 0.081 |
| 250 kcmil | 0.078 | 0.076 |
| 350 kcmil | 0.066 | 0.067 |
| 500 kcmil | 0.057 | 0.055 |
| 750 kcmil | 0.047 | 0.042 |
| 1000 kcmil | 0.041 | 0.035 |

### MV-90 option · 25 kV · copper · CN singles

ID: `mv90-cn-25000`. [Prysmian TRXLPE URD · UL MV-90 option](https://na.prysmian.com/sites/na.prysmian.com/files/media/documents/PDN-0023-0713_5-46kV%20TRXLPE%20URD%20(USA)_LR.pdf), revision **PDN-0023-0713 · July 2013**. Compressed stranded copper, 320 mil TRXLPE, one-third copper concentric neutral, LLDPE jacket; optional UL MV-90 construction. 133% insulation level. Positive-sequence R1 / X1 · direct-buried columns, table temperature **90°C**. 60 Hz assumed.

| Size | R | X |
| --- | ---: | ---: |
| 1/0 AWG | 0.14 | 0.095 |
| 2/0 AWG | 0.116 | 0.091 |
| 3/0 AWG | 0.098 | 0.087 |
| 4/0 AWG | 0.084 | 0.082 |
| 250 kcmil | 0.076 | 0.078 |
| 350 kcmil | 0.064 | 0.069 |
| 500 kcmil | 0.055 | 0.057 |
| 750 kcmil | 0.045 | 0.045 |
| 1000 kcmil | 0.039 | 0.037 |

### MV-90 option · 35 kV · copper · CN singles

ID: `mv90-cn-35000`. [Prysmian TRXLPE URD · UL MV-90 option](https://na.prysmian.com/sites/na.prysmian.com/files/media/documents/PDN-0023-0713_5-46kV%20TRXLPE%20URD%20(USA)_LR.pdf), revision **PDN-0023-0713 · July 2013**. Compressed stranded copper, 420 mil TRXLPE, one-third copper concentric neutral, LLDPE jacket; optional UL MV-90 construction. 133% insulation level. Positive-sequence R1 / X1 · direct-buried columns, table temperature **90°C**. 60 Hz assumed.

| Size | R | X |
| --- | ---: | ---: |
| 1/0 AWG | 0.139 | 0.095 |
| 2/0 AWG | 0.115 | 0.092 |
| 3/0 AWG | 0.096 | 0.087 |
| 4/0 AWG | 0.083 | 0.083 |
| 250 kcmil | 0.074 | 0.079 |
| 350 kcmil | 0.062 | 0.07 |
| 500 kcmil | 0.053 | 0.059 |
| 750 kcmil | 0.044 | 0.047 |
| 1000 kcmil | 0.038 | 0.039 |

## Overrides and remaining exclusions

“Edit these R/X values” explicitly copies resolved R/X and the source revision, construction, operating temperature, frequency, arrangement, bonding/application assumptions and any temperature correction into Project R/X. Ordinary switching does not overwrite manual values. Current reports and compact copies distinguish reference data from assumptions; old saved reports remain frozen.

This series-only single-segment estimate omits shunt capacitance/charging current, leading PF, unbalance, harmonics, motor starting, transients, ampacity and complete cable-system design. Long or lightly loaded runs may require a full cable/network model. Other constructions, aluminum, voltage classes, temperatures, shields, enclosures, geometry, single-phase paths and parallel sets require actual project R/X. Coefficient verification is not equipment, installation or NEC-compliance certification.
