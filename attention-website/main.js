// main.js

// main.js

document.addEventListener('DOMContentLoaded', () => {
  // Check if we previously "installed" it based on local storage
  if (localStorage.getItem('extensionInstalled') === 'true') {
    markAsInstalled();
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
document.getElementById('installModal').addEventListener('click', function (e) {
  if (e.target === this) {
    closeModal();
  }
});
