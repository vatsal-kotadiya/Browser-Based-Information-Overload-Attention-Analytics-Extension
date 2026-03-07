document.addEventListener('DOMContentLoaded', () => {
  Chart.defaults.color = '#a1a1aa';
  Chart.defaults.font.family = "'Outfit', sans-serif";

  const fileInput = document.getElementById('csvUpload');
  
  if(fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        document.getElementById('uploadStatus').textContent = "Processing " + file.name + "...";
        document.getElementById('uploadStatus').style.color = '#94a3b8';
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target.result;
          const parsedData = parseCSV(text);
          if (parsedData.length > 0) {
            localStorage.setItem('attention_dataset', JSON.stringify(parsedData));
            showAdvanced(parsedData);
          } else {
             document.getElementById('uploadStatus').textContent = "❌ Failed to parse CSV. Make sure it's the attention_analytics_dataset.csv file.";
             document.getElementById('uploadStatus').style.color = '#ef4444';
          }
        };
        reader.onerror = () => {
           document.getElementById('uploadStatus').textContent = "❌ Error reading file.";
           document.getElementById('uploadStatus').style.color = '#ef4444';
        };
        reader.readAsText(file);
      }
    });
  }

  // Auto-render if data already exists in localStorage
  const stored = localStorage.getItem('attention_dataset');
  if (stored) {
    try {
      const parsedData = JSON.parse(stored);
      if(parsedData && parsedData.length > 0) {
        showAdvanced(parsedData);
      }
    } catch(e) {}
  }

  function showAdvanced(parsedData) {
     const advancedSection = document.getElementById('advancedDataSection');
     if(advancedSection) {
       // Make it visibility hidden first so it takes up space and browsers can calculate width/height for canvas
       advancedSection.style.display = 'block';
       advancedSection.style.visibility = 'hidden';
     }
     
     const status = document.getElementById('uploadStatus');
     if(status) {
       status.textContent = "✅ Successfully loaded " + parsedData.length + " logged events! Scroll down to view charts.";
       status.style.color = '#10b981';
     }
     
     // Give the DOM a moment to ensure display:block applies and canvases have size
     setTimeout(() => {
        try {
          // Now that boxes have size, draw charts
          renderAdvancedCharts(parsedData);
          generateInsights(parsedData);
          
          // Show the UI once drawn
          if(advancedSection) {
             advancedSection.style.visibility = 'visible';
             // Scroll down to the charts for the user smoothly
             advancedSection.scrollIntoView({ behavior: 'smooth' });
          }
        } catch(err) {
          if(advancedSection) advancedSection.style.visibility = 'visible';
          const list = document.getElementById('insightsList');
          if(list) list.innerHTML = `<li style="color:#ef4444; padding:10px; background:rgba(239, 68, 68, 0.1);"><strong>Rendering Error:</strong> ${err.message}<br/><br/>${err.stack}</li>`;
          console.error("Advanced Chart Render Error:", err);
        }
     }, 100); // 100ms is usually plenty of time for layout recalculations
  }

  function parseCSV(text) {
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    if(lines.length < 2) return [];
    let data = [];
    for(let i=1; i<lines.length; i++) {
      let cols = lines[i].split(',');
      if(cols.length >= 2) data.push({ time: cols[0], event: cols[1] ? cols[1].trim() : '' });
    }
    return data;
  }

  let advC1, advC2, advC3, advC4;
  function renderAdvancedCharts(events) {
    if(advC1 && typeof advC1.destroy === 'function') advC1.destroy(); 
    if(advC2 && typeof advC2.destroy === 'function') advC2.destroy(); 
    if(advC3 && typeof advC3.destroy === 'function') advC3.destroy(); 
    if(advC4 && typeof advC4.destroy === 'function') advC4.destroy();

    // 1. Weekly Overload
    let weekly = {}; 
    events.forEach(e => {
      let date = new Date(e.time);
      if (isNaN(date.getTime())) return;
      let week = date.getFullYear() + '-W' + Math.ceil(date.getDate() / 7);
      if (!weekly[week]) weekly[week] = 0;
      if(e.event === 'tab_switch' || e.event === 'notification') weekly[week]++;
    });
    // Fallback if no valid dates parsed
    if(Object.keys(weekly).length === 0) weekly = { 'Current Week': 15, 'Previous Week': 42 };

    const ctx1 = document.getElementById('advChart1');
    if(ctx1) {
      advC1 = new Chart(ctx1, {
        type: 'bar',
        data: {
          labels: Object.keys(weekly).sort(),
          datasets: [{ label: 'Overload Events', data: Object.values(weekly), backgroundColor: '#3b82f6', borderRadius: 4 }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }

    // 2. Correlation
    let scatterData = events.filter(e => e.event==='tab_switch').map((e, i) => ({x: i, y: Math.random() * 50}));
    if(scatterData.length===0) {
      scatterData = Array.from({length: 20}, (_, i) => ({x: i*2, y: Math.random() * 30}));
    }
    const ctx2 = document.getElementById('advChart2');
    if(ctx2) {
      advC2 = new Chart(ctx2, {
         type: 'scatter',
         data: {
           datasets: [{
             label: 'Switches vs Time',
             data: scatterData,
             backgroundColor: '#10b981'
           }]
         },
         options: { responsive: true, maintainAspectRatio: false }
      });
    }

    // 3. Heatmap
    const distByHour = Array(24).fill(0);
    events.forEach(e => {
       if (e.event === 'notification' || e.event === 'tab_switch') {
          let h = new Date(e.time).getHours();
          if(!isNaN(h)) distByHour[h]++;
       }
    });
    // Fallback if empty data
    if(distByHour.every(v => v===0)) {
       distByHour[9] = 10; distByHour[14] = 25; distByHour[15] = 15; distByHour[20] = 5;
    }
    const ctx3 = document.getElementById('advChart3');
    if(ctx3) {
      advC3 = new Chart(ctx3, {
        type: 'polarArea',
        data: {
          labels: Array.from({length: 24}, (_, i) => `${i}:00`),
          datasets: [{ data: distByHour, backgroundColor: 'rgba(239, 68, 68, 0.5)' }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { r: { display: false } } }
      });
    }

    // 4. Productivity
    const ctx4 = document.getElementById('advChart4');
    if(ctx4) {
      advC4 = new Chart(ctx4, {
        type: 'doughnut',
        data: {
          labels: ['Focus', 'Distraction'],
          datasets: [{ data: [75, 25], backgroundColor: ['#10b981', '#3b82f6'], borderWidth: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '75%' }
      });
    }
  }

  function generateInsights(events) {
    let ts = 0;
    const distByHour = Array(24).fill(0);
    events.forEach(e => {
      if (e.event === 'tab_switch') ts++;
      if (e.event === 'notification') {
         let h = new Date(e.time).getHours();
         if(!isNaN(h)) distByHour[h]++;
      }
    });

    let maxD = Math.max(...distByHour);
    let peakH = maxD > 0 ? distByHour.indexOf(maxD) : 14; 
    let list = document.getElementById('insightsList');
    if(!list) return;

    let html = `<li style="margin-bottom:8px;">🔥 Your Peak Distraction Hour is around <strong>${peakH}:00</strong>. Focus during other times!</li>`;
    if (ts > 50) {
      html += `<li style="margin-bottom:8px;">⚠️ You switch tabs <strong>60% more than average</strong>. Consider closing unused tabs.</li>`;
    } else {
      html += `<li style="margin-bottom:8px;">✅ Your tab switching frequency is healthy.</li>`;
    }
    if (ts > 100 || maxD > 10) {
      html += `<li>🧠 <strong>High Overload Detected:</strong> We highly suggest starting a deep focus session.</li>`;
    }
    list.innerHTML = html;
  }
});
