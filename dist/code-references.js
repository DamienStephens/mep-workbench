// Published-text checks apply only to the named modeled provisions, not installations.
export const nec2023Url = 'https://link.nfpa.org/free-access/publications/70/2023';
export const necVerificationDate = '2026-10-13';
const publication = 'https://link.nfpa.org/publications/70/2023';
export const necSectionUrls = Object.freeze({
 ampacity: `${publication}/chapters/3/articles/310#ID000700001761`,
 conductors: `${publication}/chapters/3/articles/310`,
 terminations: `${publication}/chapters/1/articles/110`,
 ocpd: `${publication}/chapters/2/articles/240`,
 grounding: `${publication}/chapters/2/articles/250`,
 service: `${publication}/chapters/2/articles/230`,
 branch: `${publication}/chapters/2/articles/210`,
 feeder: `${publication}/chapters/2/articles/215`,
 box: `${publication}/chapters/3/articles/314`,
 tray: `${publication}/chapters/3/articles/392`,
 transformer: `${publication}/chapters/4/articles/450`,
 fill: `${publication}/chapters/9/sections/ID000700011313`,
 emt: `${publication}/chapters/9/sections/ID000700011315`,
 imc: 'https://link.nfpa.org/publications/70/2023/chapters/9/sections/ID000700011318',
 rmc: 'https://link.nfpa.org/publications/70/2023/chapters/9/sections/ID000700011323',
 pvc40: 'https://link.nfpa.org/publications/70/2023/chapters/9/sections/ID000700011325',
 pvc80: 'https://link.nfpa.org/publications/70/2023/chapters/9/sections/ID000700011324',
 areas: `${publication}/chapters/9/sections/ID000700011328`,
 circularMils: `${publication}/chapters/9/sections/ID000700011330`,
 impedance: `${publication}/chapters/9/sections/ID000700011331`
});
export const necReference = (clauses, section, verified = false) => ({
 label: `NEC 2023 ${clauses} — ${verified ? 'modeled provisions checked against published text' : 'separate project review required; not validated by this calculation'}`,
 url: necSectionUrls[section] || nec2023Url,
 category: 'NEC',
 verificationStatus: verified ? 'verified-modeled-provisions' : 'separate-review-required',
 ...(verified ? {verificationDate: necVerificationDate} : {})
});
