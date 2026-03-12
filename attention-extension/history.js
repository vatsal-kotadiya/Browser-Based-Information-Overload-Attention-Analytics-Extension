document.addEventListener('DOMContentLoaded', () => {
  let allEvents = [];

  chrome.storage.local.get("trackingData", (result) => {
    allEvents = result.trackingData ? result.trackingData.events : [];
    renderHistoryTable('daily', allEvents);
  });

  // Filters
  document.getElementById('btnDaily').addEventListener('click', (e) => {
    setActiveBtn(e.target);
    renderHistoryTable('daily', allEvents);
  });
  document.getElementById('btnWeekly').addEventListener('click', (e) => {
    setActiveBtn(e.target);
    renderHistoryTable('weekly', allEvents);
  });
  document.getElementById('btnMonthly').addEventListener('click', (e) => {
    setActiveBtn(e.target);
    renderHistoryTable('monthly', allEvents);
  });
});

function setActiveBtn(btn) {
  document.querySelectorAll('.filters .btn').forEach(b => b.classList.remove('primary'));
  btn.classList.add('primary');
}

function renderHistoryTable(viewMode, events) {
  const tbody = document.querySelector('#historyTable tbody');
  tbody.innerHTML = '';

  if (events.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 5;
    td.textContent = "No history available.";
    td.style.textAlign = 'center';
    td.style.padding = '15px';
    td.style.color = 'var(--text-muted)';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  // Aggregate stats by Date/Week/Month map
  let groups = {};

  events.forEach(e => {
    let d = new Date(e.timestamp);
    let key;

    if (viewMode === 'daily') {
      key = d.toISOString().split('T')[0]; // YYYY-MM-DD
    } else if (viewMode === 'weekly') {
      // Get week number
      let startDate = new Date(d.getFullYear(), 0, 1);
      let days = Math.floor((d - startDate) / (24 * 60 * 60 * 1000));
      let weekNumber = Math.ceil((d.getDay() + 1 + days) / 7);
      key = d.getFullYear() + "-W" + weekNumber;
    } else if (viewMode === 'monthly') {
      key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0');
    }

    if (!groups[key]) {
      groups[key] = {
        switches: 0,
        opens: 0,
        notifications: 0,
        activeMs: 0,
        sessionStart: null
      };
    }

    let g = groups[key];
    if (e.event === 'tab_switch') g.switches++;
    if (e.event === 'tab_open') g.opens++;
    if (e.event === 'notification') g.notifications++;

    // session time
    if (e.event === 'session_start') g.sessionStart = d.getTime();
    if (e.event === 'session_end' && g.sessionStart) {
      g.activeMs += d.getTime() - g.sessionStart;
      g.sessionStart = null;
    }
  });

  let sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a)); // Descending dates

  sortedKeys.forEach(k => {
    let g = groups[k];
    let activeMins = g.activeMs / 60000;

    // Math exactly per roadmap
    // ILS = (tab_switches × 0.4) + (notifications × 0.3) + (tabs_opened × 0.3)
    let ilsVal = (g.switches * 0.4) + (g.notifications * 0.3) + (g.opens * 0.3);
    let ilsDisplay = ilsVal > 100 ? "100+" : ilsVal.toFixed(1);

    // AFI = tab_switches / active_minutes
    let afiVal = activeMins > 0 ? (g.switches / activeMins) : 0;
    let afiDisplay = afiVal > 100 ? "100+" : afiVal.toFixed(1);

    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';

    const tdDate = document.createElement('td');
    tdDate.textContent = k;
    tdDate.style.padding = '12px 8px';

    const tdILS = document.createElement('td');
    tdILS.textContent = ilsDisplay;
    tdILS.style.padding = '12px 8px';
    tdILS.style.fontWeight = 'bold';

    const tdAFI = document.createElement('td');
    tdAFI.textContent = afiDisplay;
    tdAFI.style.padding = '12px 8px';
    if (afiVal > 2) tdAFI.style.color = 'var(--warning)'; // highlight high distraction

    const tdSwitches = document.createElement('td');
    tdSwitches.textContent = g.switches;
    tdSwitches.style.padding = '12px 8px';

    const tdNotifs = document.createElement('td');
    tdNotifs.textContent = g.notifications;
    tdNotifs.style.padding = '12px 8px';

    tr.appendChild(tdDate);
    tr.appendChild(tdILS);
    tr.appendChild(tdAFI);
    tr.appendChild(tdSwitches);
    tr.appendChild(tdNotifs);

    tbody.appendChild(tr);
  });
}
