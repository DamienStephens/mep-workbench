// Presentation only. Pass unrounded calculated currents here, never back into
// sizing, protection, threshold comparisons or other engineering arithmetic.
// Standard OCPD device ratings do not use this formatter.
export function formatCurrent(current) {
  const fixed=current.toFixed(1);
  // toFixed switches to exponential notation at 1e21. Retain one decimal even
  // for the very large finite values accepted by the general current tools.
  return Number.isFinite(current)&&Math.abs(current)>=1e21
    ? current.toLocaleString('en-US',{useGrouping:false,minimumFractionDigits:1,maximumFractionDigits:1})
    : fixed;
}
export function currentResult(label, current, value=Number(current.toFixed(3))) {
  // Preserve the existing numeric result API. Display is derived directly from
  // the full-precision calculation, avoiding double rounding via legacy value.
  return {label,value,displayValue:formatCurrent(current),unit:'A'};
}
