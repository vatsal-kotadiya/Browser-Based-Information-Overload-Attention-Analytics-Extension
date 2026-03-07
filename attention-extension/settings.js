document.addEventListener('DOMContentLoaded', () => {
  // Load Settings
  chrome.storage.local.get("settings", (result) => {
    const settings = result.settings || {
      enableTracking: true,
      countNotifications: true,
      trackTabSwitching: true,
      enableIdleDetection: true
    };
    
    document.getElementById('enableTracking').checked = settings.enableTracking;
    document.getElementById('countNotifications').checked = settings.countNotifications;
    document.getElementById('trackTabSwitching').checked = settings.trackTabSwitching;
    document.getElementById('enableIdleDetection').checked = settings.enableIdleDetection;
  });

  // Save changes
  function updateSettings() {
    const newSettings = {
      enableTracking: document.getElementById('enableTracking').checked,
      countNotifications: document.getElementById('countNotifications').checked,
      trackTabSwitching: document.getElementById('trackTabSwitching').checked,
      enableIdleDetection: document.getElementById('enableIdleDetection').checked
    };
    chrome.storage.local.set({ settings: newSettings });
  }

  document.getElementById('enableTracking').addEventListener('change', updateSettings);
  document.getElementById('countNotifications').addEventListener('change', updateSettings);
  document.getElementById('trackTabSwitching').addEventListener('change', updateSettings);
  document.getElementById('enableIdleDetection').addEventListener('change', updateSettings);

  // Reset Data
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (confirm("Are you sure you want to reset all tracking data? This cannot be undone.")) {
      const resetData = {
        events: [],
        summary: { tabsOpened: 0, tabSwitches: 0, notifications: 0, activeMinutes: 0 }
      };
      chrome.storage.local.set({ trackingData: resetData }, () => {
        alert("Data has been reset.");
      });
    }
  });

  // Export Dataset (CSV)
  document.getElementById('exportBtn').addEventListener('click', () => {
    chrome.storage.local.get("trackingData", (result) => {
      const data = result.trackingData || { events: [] };
      if (data.events.length === 0) {
        alert("No data to export.");
        return;
      }

      // Convert to CSV with new schema
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "Time,Event,From_Tab,To_Tab\n"; 
      
      data.events.forEach((row) => {
        let from = row.from_tab ? row.from_tab.replace(/,/g, "") : '';
        let to = row.to_tab ? row.to_tab.replace(/,/g, "") : '';
        let time = row.time || row.timestamp;
        csvContent += `${time},${row.event},${from},${to}\n`;
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "attention_analytics_dataset.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  });

  // Import Dataset (JSON)
  document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('importFile').click();
  });

  document.getElementById('importFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
      try {
        const importedData = JSON.parse(event.target.result);
        if (importedData.events && importedData.summary) {
           chrome.storage.local.set({ trackingData: importedData }, () => {
             alert('Dataset successfully imported!');
             window.location.reload();
           });
        } else {
           alert("Invalid dataset format. Needs 'events' and 'summary' properties.");
        }
      } catch (err) {
        alert("Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);
  });
});
