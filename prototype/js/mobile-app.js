/**
 * NEXA Mobile Prototype Interactivity Helper
 */

// Show toast message
function showToast(message, duration = 2400) {
  let toast = document.getElementById('global-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'global-toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<span>✓</span> <span>${message}</span>`;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

// Open bottom sheet
function openSheet(sheetId) {
  const sheet = document.getElementById(sheetId);
  let backdrop = document.getElementById('sheet-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'sheet-backdrop';
    backdrop.className = 'sheet-backdrop';
    backdrop.onclick = closeAllSheets;
    document.body.appendChild(backdrop);
  }
  
  if (sheet) {
    backdrop.classList.add('active');
    sheet.classList.add('active');
  }
}

// Close specific bottom sheet
function closeSheet(sheetId) {
  const sheet = document.getElementById(sheetId);
  const backdrop = document.getElementById('sheet-backdrop');
  if (sheet) sheet.classList.remove('active');
  if (backdrop) backdrop.classList.remove('active');
}

// Close all open bottom sheets
function closeAllSheets() {
  document.querySelectorAll('.bottom-sheet.active').forEach(s => s.classList.remove('active'));
  const backdrop = document.getElementById('sheet-backdrop');
  if (backdrop) backdrop.classList.remove('active');
}

// Setup pill tab interactivity
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.pill-tab-group').forEach(group => {
    const tabs = group.querySelectorAll('.pill-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        if (!tab.getAttribute('href') || tab.getAttribute('href') === '#') {
          e.preventDefault();
          tabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
        }
      });
    });
  });
});
