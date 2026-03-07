document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get("trackingData", (result) => {
    const data = result.trackingData || { events: [], summary: {} };
    renderCharts(data.events);
    calculateMetrics(data.events);
  });

  setupButtons();
});

function setupButtons() {
  document.getElementById('downloadBtn').addEventListener('click', () => {
    chrome.storage.local.get("trackingData", (result) => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result.trackingData || {}, null, 2));
      const dlNode = document.createElement('a');
      dlNode.setAttribute("href", dataStr);
      dlNode.setAttribute("download", "attention_report.json");
      dlNode.click();
    });
  });

  document.getElementById('clearBtn').addEventListener('click', () => {
    if (confirm("Are you sure you want to clear all history?")) {
      chrome.storage.local.set({
        trackingData: { events: [], summary: { tabsOpened: 0, tabSwitches: 0, notifications: 0, activeMinutes: 0 } }
      }, () => window.location.reload());
    }
  });
}

function calculateMetrics(events) {
  // 1. Avg Session Duration
  let sessionLengths = [];
  let currentStart = null;
  events.forEach(e => {
    if (e.event === 'session_start') currentStart = new Date(e.timestamp).getTime();
    if (e.event === 'session_end' && currentStart) {
      const ms = new Date(e.timestamp).getTime() - currentStart;
      sessionLengths.push(ms / 60000); // mins
      currentStart = null;
    }
  });

  let avgSession = sessionLengths.length > 0
    ? (sessionLengths.reduce((a, b) => a + b, 0) / sessionLengths.length).toFixed(1) + ' m'
    : '--';

  document.getElementById('avgSession').textContent = avgSession;

  // 2. Peak Distraction Hour
  const distractionsByHour = Array(24).fill(0);
  events.forEach(e => {
    if (["tab_switch", "notification"].includes(e.event)) {
      const hour = new Date(e.timestamp).getHours();
      distractionsByHour[hour]++;
    }
  });
  let maxD = Math.max(...distractionsByHour);
  let peakHour = maxD > 0 ? distractionsByHour.indexOf(maxD) + ":00" : '--';
  document.getElementById('peakHour').textContent = peakHour;

  // 3. Most Active Time (by general events)
  const activeByHour = Array(24).fill(0);
  events.forEach(e => {
    if (e.event !== 'user_idle') {
      const hour = new Date(e.timestamp).getHours();
      activeByHour[hour]++;
    }
  });
  let maxA = Math.max(...activeByHour);
  let activeTime = maxA > 0 ? activeByHour.indexOf(maxA) + ":00" : '--';
  document.getElementById('activeTime').textContent = activeTime;
}

function renderCharts(events) {
  Chart.defaults.color = '#a1a1aa';
  Chart.defaults.font.family = "'Outfit', sans-serif";
  const commonOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };

  // 1. Tab Switching (Line)
  const switchesByHour = Array(24).fill(0);
  events.forEach(e => {
    if (e.event === 'tab_switch') {
      switchesByHour[new Date(e.timestamp).getHours()]++;
    }
  });
  new Chart(document.getElementById('chart1'), {
    type: 'line',
    data: {
      labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      datasets: [{
        data: switchesByHour,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        tension: 0.3, fill: true
      }]
    },
    options: commonOptions
  });

  // 2. Daily Overload Trend (ILS Score per day)
  let dailyData = {}; // { 'YYYY-MM-DD': {switches, opens, notifs} }
  events.forEach(e => {
    let dayStr = new Date(e.timestamp).toISOString().split('T')[0];
    if (!dailyData[dayStr]) dailyData[dayStr] = { switches: 0, opens: 0, notifs: 0 };

    if (e.event === 'tab_switch') dailyData[dayStr].switches++;
    if (e.event === 'tab_open') dailyData[dayStr].opens++;
    if (e.event === 'notification') dailyData[dayStr].notifs++;
  });

  let sortedDays = Object.keys(dailyData).sort();
  let ilsTrend = sortedDays.map(day => {
    let d = dailyData[day];
    return ((d.switches * 0.4) + (d.notifs * 0.3) + (d.opens * 0.3)).toFixed(1);
  });

  new Chart(document.getElementById('chart2'), {
    type: 'line',
    data: {
      labels: sortedDays.length > 0 ? sortedDays : ['No Data'],
      datasets: [{
        data: ilsTrend.length > 0 ? ilsTrend : [0],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        tension: 0.3,
        fill: true,
        pointRadius: 4
      }]
    },
    options: commonOptions
  });

  // 3. Hourly Activity Heatmap/Bar
  const activityByHour = Array(24).fill(0);
  events.forEach(e => activityByHour[new Date(e.timestamp).getHours()]++);

  new Chart(document.getElementById('chart3'), {
    type: 'bar',
    data: {
      labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      datasets: [{
        data: activityByHour,
        backgroundColor: '#8b5cf6',
        borderRadius: 4
      }]
    },
    options: commonOptions
  });

  // 4. Multitasking Intensity (Doughnut)
  // Types: Switched, Opened New, Notifications
  let multi = { 'Switching Tabs': 0, 'Opening Tabs': 0, 'Notifications': 0 };
  events.forEach(e => {
    if (e.event === 'tab_switch') multi['Switching Tabs']++;
    if (e.event === 'tab_open') multi['Opening Tabs']++;
    if (e.event === 'notification') multi['Notifications']++;
  });

  new Chart(document.getElementById('chart4'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(multi),
      datasets: [{
        data: Object.values(multi),
        backgroundColor: ['#3b82f6', '#10b981', '#ef4444'],
        borderWidth: 0
      }]
    },
    options: { ...commonOptions, plugins: { legend: { position: 'bottom', labels: { color: '#a1a1aa' } } } }
  });
  // 5. Session Duration Distribution (Bar)
  let buckets = { '<5m': 0, '5-15m': 0, '15-30m': 0, '30-60m': 0, '>1h': 0 };
  let currentStart = null;
  events.forEach(e => {
    if (e.event === 'session_start') currentStart = new Date(e.timestamp).getTime();
    if (e.event === 'session_end' && currentStart) {
      const mins = (new Date(e.timestamp).getTime() - currentStart) / 60000;
      if (mins < 5) buckets['<5m']++;
      else if (mins < 15) buckets['5-15m']++;
      else if (mins < 30) buckets['15-30m']++;
      else if (mins < 60) buckets['30-60m']++;
      else buckets['>1h']++;
      currentStart = null;
    }
  });

  new Chart(document.getElementById('chart5'), {
    type: 'bar',
    data: {
      labels: Object.keys(buckets),
      datasets: [{
        data: Object.values(buckets),
        backgroundColor: '#10b981',
        borderRadius: 4
      }]
    },
    options: commonOptions
  });
}
