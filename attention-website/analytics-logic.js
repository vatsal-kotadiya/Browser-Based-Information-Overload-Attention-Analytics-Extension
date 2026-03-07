document.addEventListener('DOMContentLoaded', () => {
  Chart.defaults.color = '#a1a1aa';
  Chart.defaults.font.family = "'Outfit', sans-serif";

  // --- Realtime / Demo Charts Data ---
  let dummyEvents = [];
  for (let i = 0; i < 80; i++) {
    let type = 'tab_switch';
    let r = Math.random();
    if (r > 0.6) type = 'tab_open';
    if (r > 0.8) type = 'session_start';
    if (r > 0.95) type = 'notification';

    let hour = Math.floor(Math.random() * 24);
    let d = new Date();
    d.setHours(hour);
    dummyEvents.push({ event: type, timestamp: d.toISOString(), time: d.toISOString() });
  }

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get("trackingData", (result) => {
      const data = result.trackingData || { events: [] };
      renderRealtimeCharts(data.events.length ? data.events : dummyEvents);
    });
  } else {
    renderRealtimeCharts(dummyEvents);
  }

  function renderRealtimeCharts(events) {
    let c1 = document.getElementById('rtChart1');
    let c2 = document.getElementById('rtChart2');
    let c3 = document.getElementById('rtChart3');
    let c4 = document.getElementById('rtChart4');
    let c5 = document.getElementById('rtChart5');

    // 1. Tab Switching Over Time (Line)
    if (c1) {
      new Chart(c1, {
        type: 'line',
        data: { labels: ['10:00', '10:15', '10:30', '10:45', '11:00'], datasets: [{ label: 'Switches', data: [12, 19, 3, 5, 2], borderColor: '#3b82f6', tension: 0.4 }] },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }

    // 2. Daily Overload (Bar)
    if (c2) {
      new Chart(c2, {
        type: 'bar',
        data: { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], datasets: [{ label: 'Overload Score', data: [65, 59, 80, 81, 56], backgroundColor: '#10b981', borderRadius: 4 }] },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }

    // 3. Hourly Activity (PolarArea)
    if (c3) {
      new Chart(c3, {
        type: 'polarArea',
        data: { labels: ['9AM', '12PM', '3PM', '6PM'], datasets: [{ data: [11, 16, 7, 3], backgroundColor: ['#ef4444', '#3b82f6', '#10b981', '#f59e0b'] }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { r: { display: false } } }
      });
    }

    // 4. Multitasking Intensity (Doughnut)
    if (c4) {
      new Chart(c4, {
        type: 'doughnut',
        data: { labels: ['Focused', 'Context Switching'], datasets: [{ data: [60, 40], backgroundColor: ['#10b981', '#ef4444'], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '70%' }
      });
    }

    // 5. Session Duration (Bar)
    if (c5) {
      new Chart(c5, {
        type: 'bar',
        data: { labels: ['<5m', '5-15m', '15-30m', '>30m'], datasets: [{ label: 'Sessions', data: [10, 20, 15, 5], backgroundColor: '#8b5cf6', borderRadius: 4 }] },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }
  }
});
