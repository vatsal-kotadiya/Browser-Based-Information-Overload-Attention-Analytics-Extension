// background.js

let lastActiveTabId = null;
let lastActiveTabName = "unknown";
let sessionActive = true;

chrome.runtime.onInstalled.addListener(() => {
  // Initialize default data
  chrome.storage.local.get(["trackingData", "settings"], (result) => {
    if (!result.trackingData) {
      chrome.storage.local.set({
        trackingData: {
          events: [], // Detailed logs
          summary: {
            tabsOpened: 0,
            tabSwitches: 0,
            notifications: 0,
            activeMinutes: 0
          }
        }
      });
    }

    if (!result.settings) {
      chrome.storage.local.set({
        settings: {
          enableTracking: true,
          countNotifications: true,
          trackTabSwitching: true,
          enableIdleDetection: true
        }
      });
    }
  });

  // Start polling active session time using alarms (Manifest V3 compliant)
  chrome.alarms.create("activeTimeTracker", { periodInMinutes: 1 });
  chrome.alarms.create("mockNotification", { periodInMinutes: 15 });
  chrome.alarms.create("weeklyReportCheck", { periodInMinutes: 60 }); // Check every hour

  logEvent({ event: "session_start" });
});

chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId === 'weekly_report_ready') {
    chrome.tabs.create({ url: chrome.runtime.getURL("weekly_report.html") });
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "activeTimeTracker") {
    chrome.storage.local.get(["settings", "trackingData"], (result) => {
      const settings = result.settings || { enableTracking: true, enableIdleDetection: true };
      if (!settings.enableTracking) return;

      chrome.idle.queryState(15, (state) => {
        if (state === "active" || !settings.enableIdleDetection) {
          const data = result.trackingData || { summary: { activeMinutes: 0 }, events: [] };
          // Increment roughly active time (running every minute)
          data.summary.activeMinutes += 1;
          chrome.storage.local.set({ trackingData: data });
        }
      });
    });
  } else if (alarm.name === "mockNotification") {
    logEvent({ event: "notification" });
  } else if (alarm.name === "weeklyReportCheck") {
    checkWeeklyReport();
  }
});

function checkWeeklyReport() {
  chrome.storage.local.get(["lastReportDate"], (result) => {
    const now = new Date();
    const lastReport = result.lastReportDate ? new Date(result.lastReportDate) : null;

    // Check if it's Sunday (0) and past 6 PM, or if 7+ days have passed
    const isSundayEvening = now.getDay() === 0 && now.getHours() >= 18;
    const isSevenDaysPassed = lastReport && (now.getTime() - lastReport.getTime()) > (7 * 24 * 60 * 60 * 1000);

    if (!lastReport || isSundayEvening || isSevenDaysPassed) {
      // Trigger notification
      chrome.notifications.create('weekly_report_ready', {
        type: 'basic',
        title: 'Your Weekly Attention Report is Ready! 📊',
        message: 'Click here to view your personalized 7-day focus summary and habit trends.',
        iconUrl: 'icons/icon128.png'
      });
      // Update last report generation time
      chrome.storage.local.set({ lastReportDate: now.toISOString() });
    }
  });
}

// Track idle/active explicitly for session markers
chrome.idle.onStateChanged.addListener((newState) => {
  chrome.storage.local.get(["settings"], (result) => {
    const settings = result.settings || {};
    if (!settings.enableTracking || !settings.enableIdleDetection) return;

    if (newState === "active") {
      logEvent({ event: "user_active" });
      if (!sessionActive) {
        logEvent({ event: "session_start" });
        sessionActive = true;
      }
    } else {
      // idle or locked
      logEvent({ event: "user_idle" });
      if (sessionActive) {
        logEvent({ event: "session_end" });
        sessionActive = false;
      }
    }
  });
});

function logEvent(payload) {
  chrome.storage.local.get(["settings", "trackingData"], (result) => {
    const settings = result.settings || {};
    if (!settings.enableTracking) return;

    // Check specific settings
    if (payload.event === "tab_switch" && settings.trackTabSwitching === false) return;
    if (payload.event === "notification" && settings.countNotifications === false) return;

    const data = result.trackingData || { events: [], summary: {} };

    // Add to event timeline
    const d = new Date();
    // format "YYYY-MM-DD HH:MM"
    const timeStr = d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, '0') + "-" +
      String(d.getDate()).padStart(2, '0') + " " +
      String(d.getHours()).padStart(2, '0') + ":" +
      String(d.getMinutes()).padStart(2, '0');

    const eventRecord = {
      event: payload.event,
      time: timeStr,
      timestamp: d.toISOString(), // keep exact for sorting/charts
      ...payload
    };

    data.events.push(eventRecord);

    // Update summary counters
    if (!data.summary) data.summary = { tabSwitches: 0, tabsOpened: 0, notifications: 0, activeMinutes: 0 };
    if (payload.event === "tab_switch") data.summary.tabSwitches++;
    if (payload.event === "tab_open") data.summary.tabsOpened++;
    if (payload.event === "notification") data.summary.notifications++;

    chrome.storage.local.set({ trackingData: data });

    // Optional Extra: Productivity Insights & Warnings (calculated dynamically)
    const fiveMinsAgo = d.getTime() - (5 * 60 * 1000);
    const recentEvents = data.events.filter(e => new Date(e.timestamp).getTime() > fiveMinsAgo);

    let switchesCount = 0;
    let notifsCount = 0;
    recentEvents.forEach(e => {
      if (e.event === 'tab_switch') switchesCount++;
      if (e.event === 'notification') notifsCount++;
    });

    if (payload.event === 'tab_switch' && switchesCount === 15) {
      chrome.notifications.create({
        type: 'basic',
        title: 'High Information Load Score',
        message: 'You are switching tabs very frequently! Consider closing unused tabs or starting a focus session.',
        iconUrl: 'icons/icon128.png'
      }, () => {
        if (chrome.runtime.lastError) console.error("Notification Error:", chrome.runtime.lastError);
      });
    }

    if (payload.event === 'notification' && notifsCount === 5) {
      chrome.notifications.create({
        type: 'basic',
        title: 'Attention Fragmentation Warning',
        message: 'You are receiving too many interruptions. Consider enabling Do Not Disturb mode.',
        iconUrl: 'icons/icon128.png'
      }, () => {
        if (chrome.runtime.lastError) console.error("Notification Error:", chrome.runtime.lastError);
      });
    }
  });
}

function getDomainName(url) {
  if (!url) return "unknown";
  try {
    const urlObj = new URL(url);
    let domain = urlObj.hostname;
    if (domain.startsWith("www.")) domain = domain.substring(4);
    return domain;
  } catch (e) {
    if (url.startsWith("chrome://newtab")) return "newtab";
    if (url.startsWith("chrome://")) return "settings";
    return "unknown";
  }
}

// Track tab switching
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (chrome.runtime.lastError) return;

    let currentTabName = tab.title || getDomainName(tab.url);

    if (lastActiveTabId !== null && lastActiveTabId !== activeInfo.tabId) {
      logEvent({
        event: "tab_switch",
        from_tab: lastActiveTabName,
        to_tab: currentTabName,
        icon: tab.favIconUrl || ""
      });
    }

    lastActiveTabId = activeInfo.tabId;
    lastActiveTabName = currentTabName;
  });
});

// Track tab opening
chrome.tabs.onCreated.addListener((tab) => {
  const currentTabName = tab.title || getDomainName(tab.url);
  logEvent({ event: "tab_open", to_tab: currentTabName, icon: tab.favIconUrl || "" });
});

// Track tab closing
chrome.tabs.onRemoved.addListener((tabId) => {
  logEvent({ event: "tab_close" });
});

// Track updates (title load, url change) to keep lastActiveTabName accurate
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tabId === lastActiveTabId && tab.active) {
    lastActiveTabName = tab.title || getDomainName(tab.url);
  }
});
