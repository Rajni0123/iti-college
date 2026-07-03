(function () {
  var STORAGE_KEY = 'iti-theme';

  function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function getStoredTheme() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') return stored;
    } catch (e) {}
    return null;
  }

  function applyTheme(theme) {
    var isDark = theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';

    var publicBtn = document.getElementById('iti-theme-toggle');
    if (publicBtn) {
      publicBtn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
      publicBtn.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
      publicBtn.innerHTML = isDark
        ? '<span aria-hidden="true">☀️</span><span>Light</span>'
        : '<span aria-hidden="true">🌙</span><span>Dark</span>';
    }

    var adminBtn = document.getElementById('iti-admin-theme-toggle');
    if (adminBtn) {
      adminBtn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
      adminBtn.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
      adminBtn.innerHTML = isDark
        ? '<span aria-hidden="true">☀️</span><span>Light Mode</span>'
        : '<span aria-hidden="true">🌙</span><span>Dark Mode</span>';
    }
  }

  function setTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {}
    applyTheme(theme);
  }

  function toggleTheme() {
    var current = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    setTheme(current === 'dark' ? 'light' : 'dark');
  }

  function initTheme() {
    var stored = getStoredTheme();
    applyTheme(stored || getSystemTheme());
  }

  function ensurePublicToggle() {
    var existing = document.getElementById('iti-theme-toggle');
    if (window.location.pathname.indexOf('/admin') === 0) {
      if (existing) existing.remove();
      return;
    }
    if (existing) return;

    var btn = document.createElement('button');
    btn.id = 'iti-theme-toggle';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Toggle dark mode');
    btn.addEventListener('click', toggleTheme);
    document.body.appendChild(btn);
    applyTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  }

  function ensureAdminToggle() {
    var isAdmin = window.location.pathname.indexOf('/admin') === 0;
    var bar = document.getElementById('iti-admin-theme-bar');
    if (bar) bar.remove();

    if (!isAdmin) return;

    var logoutBtn = Array.from(document.querySelectorAll('button')).find(function (btn) {
      return (btn.textContent || '').trim() === 'Logout';
    });

    var btn = document.getElementById('iti-admin-theme-toggle');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'iti-admin-theme-toggle';
      btn.type = 'button';
      btn.className = 'w-full';
      btn.setAttribute('aria-label', 'Toggle dark mode');
      btn.addEventListener('click', toggleTheme);
    }

    if (logoutBtn && logoutBtn.parentElement) {
      if (btn.parentElement !== logoutBtn.parentElement || btn.nextElementSibling !== logoutBtn) {
        logoutBtn.parentElement.insertBefore(btn, logoutBtn);
      }
      btn.style.marginBottom = '0.5rem';
      btn.style.width = '100%';
    } else if (!btn.parentElement) {
      bar = document.createElement('div');
      bar.id = 'iti-admin-theme-bar';
      bar.className = 'visible';
      bar.appendChild(btn);
      document.body.insertBefore(bar, document.body.firstChild);
    }

    applyTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  }

  initTheme();

  window.ITITheme = {
    toggle: toggleTheme,
    set: setTheme,
    get: function () {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    },
  };

  document.addEventListener('DOMContentLoaded', function () {
    ensurePublicToggle();
    ensureAdminToggle();
  });

  window.addEventListener('load', function () {
    ensurePublicToggle();
    ensureAdminToggle();
  });

  var lastPath = window.location.pathname;
  setInterval(function () {
    if (window.location.pathname !== lastPath) {
      lastPath = window.location.pathname;
      ensurePublicToggle();
      ensureAdminToggle();
    }
  }, 500);

  if (document.body) {
    var observerTimer;
    var observer = new MutationObserver(function () {
      clearTimeout(observerTimer);
      observerTimer = setTimeout(ensureAdminToggle, 200);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      var observerTimer;
      var observer = new MutationObserver(function () {
        clearTimeout(observerTimer);
        observerTimer = setTimeout(ensureAdminToggle, 200);
      });
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  try {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
      if (!getStoredTheme()) applyTheme(getSystemTheme());
    });
  } catch (e) {}
})();
