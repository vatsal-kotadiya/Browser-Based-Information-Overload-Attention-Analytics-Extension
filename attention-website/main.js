// main.js

// main.js

document.addEventListener('DOMContentLoaded', () => {
  // Check if we previously "installed" it based on local storage
  if (localStorage.getItem('extensionInstalled') === 'true') {
    markAsInstalled();
  }

  // Animate Mockup Hero Scores to look "Live"
  startMockScoreAnimation();

  // Request notification permission on first interest
  if ('Notification' in window && Notification.permission === 'default') {
    document.addEventListener('click', () => {
      Notification.requestPermission();
    }, { once: true });
  }
});

function triggerInstall() {
  // Only show popup if not installed
  if (localStorage.getItem('extensionInstalled') !== 'true') {
    const modal = document.getElementById('installModal');
    modal.classList.add('active');
  }
}

function closeModal() {
  const modal = document.getElementById('installModal');
  modal.classList.remove('active');
}

function confirmInstall() {
  const btn = document.querySelector('.modal-actions .btn-primary');
  btn.textContent = 'Installing...';
  btn.style.opacity = '0.7';

  // Simulate network delay for installation
  setTimeout(() => {
    btn.textContent = 'Added to Chrome';
    btn.style.backgroundColor = '#10b981';
    btn.style.borderColor = '#10b981';
    btn.style.opacity = '1';

    setTimeout(() => {
      closeModal();

      // Save installed state
      localStorage.setItem('extensionInstalled', 'true');

      // Update UI 
      markAsInstalled();

      // Reset modal button for future use (if localstorage is cleared)
      setTimeout(() => {
        btn.textContent = 'Add Extension';
        btn.style.backgroundColor = '';
        btn.style.borderColor = '';
      }, 500);

      // Fire real notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Attention Analytics', {
          body: '✓ Extension successfully added to Chrome! Start tracking your focus today.',
          icon: 'assets/attention-logo.png'
        });
      }

    }, 1000);
  }, 1500);
}

function markAsInstalled() {
  const heroBtns = document.querySelectorAll('.hero-cta .btn-primary');
  heroBtns.forEach(b => {
    b.innerHTML = '✓ Extension Installed';
    b.style.backgroundColor = 'rgba(163, 64, 84, 0.2)';
    b.style.color = '#A34054';
    b.style.borderColor = 'rgba(163, 64, 84, 0.4)';
    b.onclick = null; // Disable further clicks
  });

  const navBtn = document.querySelector('.navbar .btn-outline');
  if (navBtn) {
    navBtn.innerHTML = '✓ Installed';
    navBtn.style.color = '#A34054';
    navBtn.style.borderColor = 'rgba(163, 64, 84, 0.4)';
    navBtn.onclick = null;
  }
}

// Close modal on outside click
document.getElementById('installModal')?.addEventListener('click', function (e) {
  if (e.target === this) {
    closeModal();
  }
});

function startMockScoreAnimation() {
  const ilsEl = document.getElementById('hero-ils');
  const afiEl = document.getElementById('hero-afi');

  if (!ilsEl || !afiEl) return;

  let currentIls = 68;
  let currentAfi = 42;

  setInterval(() => {
    // Fluctuate ILS by -2 to +2
    const ilsChange = Math.floor(Math.random() * 5) - 2;
    currentIls = Math.max(0, Math.min(100, currentIls + ilsChange));

    // Fluctuate AFI by -1 to +2 (tends to climb slightly)
    const afiChange = Math.floor(Math.random() * 4) - 1;
    currentAfi = Math.max(0, Math.min(100, currentAfi + afiChange));

    if (currentAfi > 60) currentAfi -= 5; // keep it bounded

    ilsEl.innerHTML = `${currentIls}<span style="font-size:0.5em;color:var(--text-muted)">/100</span>`;
    afiEl.innerHTML = `${currentAfi}<span style="font-size:0.5em;color:var(--text-muted)">/100</span>`;
  }, 3500); // Update every 3.5 seconds
}
