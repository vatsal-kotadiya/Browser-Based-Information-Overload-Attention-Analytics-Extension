document.addEventListener('DOMContentLoaded', () => {
  loadDashboardData();
  setupEventListeners();
});

let miniChart1, miniChart2;

function loadDashboardData() {
  chrome.storage.local.get(["trackingData", "settings"], (result) => {
    const data = result.trackingData || { summary: { tabsOpened: 0, tabSwitches: 0, notifications: 0, activeMinutes: 0 }, events: [] };
    const settings = result.settings || { enableTracking: true };
    const summary = data.summary;

    chrome.tabs.query({}, (tabs) => {
      document.getElementById('currentTabs').textContent = tabs.length || 0;
    });

    document.getElementById('tabSwitches').textContent = summary.tabSwitches || 0;
    document.getElementById('activeTime').textContent = summary.activeMinutes || 0;
    document.getElementById('notifications').textContent = summary.notifications || 0;

    // Calculate Scores based on exact requested formulas
    // ILS = (tab_switches × 0.4) + (notifications × 0.3) + (tabs_opened × 0.3)
    let ils = ((summary.tabSwitches * 0.4) + (summary.notifications * 0.3) + (summary.tabsOpened * 0.3)).toFixed(1);
    if (ils > 100) ils = "100+";

    // AFI = tab_switches / active_minutes (if activeMinutes > 0)
    let afi = summary.activeMinutes > 0 ? (summary.tabSwitches / summary.activeMinutes).toFixed(1) : 0;
    if (afi > 100) afi = "100+";

    document.getElementById('ilsValue').textContent = `${ils} / 100`;
    document.getElementById('afiValue').textContent = `${afi} / 100`;

    // Update Status UI
    const statusInd = document.getElementById('statusIndicator');
    const toggleBtn = document.getElementById('toggleTrackingBtn');

    if (settings.enableTracking) {
      statusInd.innerHTML = '🟢 Tracking';
      toggleBtn.textContent = 'Stop Tracking';
      toggleBtn.className = 'btn';
    } else {
      statusInd.innerHTML = '🔴 Paused';
      toggleBtn.textContent = 'Start Tracking';
      toggleBtn.className = 'btn primary';
    }

    renderCharts(data.events);
  });
}

function setupEventListeners() {
  document.getElementById('toggleTrackingBtn').addEventListener('click', () => {
    chrome.storage.local.get(["settings"], (result) => {
      const settings = result.settings || { enableTracking: true };
      settings.enableTracking = !settings.enableTracking;
      chrome.storage.local.set({ settings: settings }, () => {
        loadDashboardData(); // Reload UI
      });
    });
  });

  document.getElementById('viewAnalyticsBtn').addEventListener('click', () => {
    window.location.href = "analytics.html";
  });

  document.getElementById('viewWeeklyBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("weekly_report.html") });
  });

  document.getElementById('websiteLink').addEventListener('click', () => {
    chrome.tabs.create({ url: "https://vatsal-kotadiya.github.io/Browser-Based-Information-Overload-Attention-Analytics-Extension/" });
  });

  document.getElementById('exportDataBtn').addEventListener('click', () => {
    chrome.storage.local.get("trackingData", (result) => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result.trackingData || {}, null, 2));
      const dlNode = document.createElement('a');
      dlNode.setAttribute("href", dataStr);
      dlNode.setAttribute("download", "attention_data.json");
      dlNode.click();
    });
  });

  document.getElementById('resetDataBtn').addEventListener('click', () => {
    if (confirm("Are you sure you want to delete all tracking history?")) {
      chrome.storage.local.set({
        trackingData: { events: [], summary: { tabsOpened: 0, tabSwitches: 0, notifications: 0, activeMinutes: 0 } }
      }, () => loadDashboardData());
    }
  });
}

function renderCharts(events) {
  Chart.defaults.color = '#a1a1aa';
  Chart.defaults.font.family = "'Outfit', sans-serif";

  // Chart 1: Today's Tab Switches
  const today = new Date().toISOString().split('T')[0];
  const todayEvents = events.filter(e => e.time && e.time.startsWith(today) && e.event === 'tab_switch');

  // Aggregate by hour for today (0-23)
  const hourlySwitches = Array(24).fill(0);
  todayEvents.forEach(e => {
    const hour = parseInt(e.time.split(' ')[1].split(':')[0]);
    hourlySwitches[hour]++;
  });

  if (miniChart1) miniChart1.destroy();
  const ctx1 = document.getElementById('miniChart1');
  if (ctx1) {
    miniChart1 = new Chart(ctx1, {
      type: 'line',
      data: {
        labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
        datasets: [{
          data: hourlySwitches,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false, min: 0 } },
        layout: { padding: 0 }
      }
    });
  }
}

