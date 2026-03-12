document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('reportDate').textContent = 'Generated on: ' + new Date().toLocaleDateString();

  const storedData = localStorage.getItem('attention_dataset');
  if (!storedData) {
    document.getElementById('noDataWarning').style.display = 'block';
    document.getElementById('reportData').style.display = 'none';
    return;
  }

  const events = JSON.parse(storedData);
  let totalSwitches = 0;
  let totalNotifs = 0;

  const distByHour = Array(24).fill(0);
  let earliest = Infinity;
  let latest = 0;

  events.forEach(e => {
    let t = new Date(e.time).getTime();
    if (t < earliest) earliest = t;
    if (t > latest) latest = t;

    if (e.event === 'tab_switch') {
      totalSwitches++;
      distByHour[new Date(e.time).getHours()]++;
    }
    if (e.event === 'notification') {
      totalNotifs++;
      distByHour[new Date(e.time).getHours()]++;
    }
  });

  document.getElementById('valEvents').textContent = events.length.toLocaleString();
  document.getElementById('valSwitches').textContent = totalSwitches.toLocaleString();
  document.getElementById('valNotifs').textContent = totalNotifs.toLocaleString();

  let maxD = Math.max(...distByHour);
  let peakHour = maxD > 0 ? distByHour.indexOf(maxD) + ":00" : '--';
  document.getElementById('valPeak').textContent = peakHour;

  // Estimate AFI (Total Switches / Active Minutes approximation over span)
  let activeMinutesApprox = 0;
  if (earliest !== Infinity && latest !== 0 && latest > earliest) {
    let days = (latest - earliest) / (1000 * 60 * 60 * 24);
    // Assume 4 hours (240 mins) of active browser time per day on average over the span
    activeMinutesApprox = Math.max(days * 240, Math.max(1, events.length));
  } else {
    activeMinutesApprox = Math.max(1, events.length * 2);
  }

  // Calculate exact algorithms used in extension
  // AFI = tab_switches / active_minutes
  let afiVal = activeMinutesApprox > 0 ? (totalSwitches / activeMinutesApprox).toFixed(1) : 0;
  let afiDisplay = parseFloat(afiVal) > 100 ? "100+" : afiVal;
  document.getElementById('userAFI').textContent = afiDisplay;

  // ILS (Estimating tabs opened as same as total switches for report purposes)
  let estimatedTabs = totalSwitches; 
  let ilsVal = ((totalSwitches * 0.4) + (totalNotifs * 0.3) + (estimatedTabs * 0.3)).toFixed(1);
  let ilsDisplay = parseFloat(ilsVal) > 100 ? "100+" : ilsVal;
  const ilsEl = document.getElementById('userILS');
  if (ilsEl) ilsEl.textContent = ilsDisplay;

  let subText = "";
  let numericAfi = parseFloat(afiVal) || 0;
  if (numericAfi > 5.0) {
    subText = "Extremely High Fragmentation. Well above healthy focus levels.";
    document.getElementById('userAFI').style.color = '#ef4444';
  } else if (numericAfi > 2.0) {
    subText = "High Fragmentation. Above the focus baseline.";
    document.getElementById('userAFI').style.color = '#f59e0b';
  } else {
    subText = "Healthy Focus. Below the baseline.";
    document.getElementById('userAFI').style.color = '#10b981';
  }
  document.getElementById('afiSub').textContent = subText;
});
