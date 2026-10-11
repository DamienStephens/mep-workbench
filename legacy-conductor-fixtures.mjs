// Older suites retain their historical load-based fixtures to regression-test
// migration and sizing together. The production engine accepts explicit OCPD only.
export * from './dist/calc.js';
import {conductor as explicitConductor,migrateConductorState} from './dist/calc.js';
export function conductor(input){return explicitConductor(migrateConductorState(input));}
