let _currentUser = null;

async function checkAuth() {
  try {
    _currentUser = await API.currentUser();
    return !!_currentUser;
  } catch {
    _currentUser = null;
    return false;
  }
}

function updateNavbar() {
  const navLinks = document.getElementById('nav-links');
  const navUser = document.getElementById('nav-user');
  const navbar = document.querySelector('.navbar');

  if (_currentUser) {
    navbar.style.display = 'flex';
    navLinks.style.display = 'flex';
    navUser.style.display = 'flex';
    navUser.innerHTML = `
      ${_currentUser.avatarUrl
        ? `<img src="${_currentUser.avatarUrl}" alt="" class="nav-avatar" referrerpolicy="no-referrer">`
        : ''}
      <span class="nav-user-name">${escapeHtml(_currentUser.displayName)}</span>
      <button class="nav-logout" onclick="doLogout()">Logout</button>
    `;
  } else {
    navbar.style.display = 'none';
  }
}

async function doLogout() {
  await API.logout();
  _currentUser = null;
  updateNavbar();
}

async function route() {
  const hash = location.hash.slice(1) || '/';
  const app = document.getElementById('app');

  // Stop dashboard refresh when navigating away
  if (Dashboard.refreshTimer) {
    clearInterval(Dashboard.refreshTimer);
    Dashboard.refreshTimer = null;
  }

  // Login route — no auth check needed
  if (hash === '/login' || hash.startsWith('/login?')) {
    _currentUser = null;
    API.clearUser();
    updateNavbar();
    Login.render(app);
    return;
  }

  // All other routes require auth
  const isAuthed = await checkAuth();
  if (!isAuthed) {
    window.location.hash = '#/login';
    return;
  }

  updateNavbar();

  if (hash === '/') {
    Dashboard.render(app);
  } else if (hash === '/settings') {
    Settings.render(app);
  } else if (hash === '/add') {
    MonitorForm.render(app);
  } else if (hash.startsWith('/edit/')) {
    const id = hash.split('/')[2];
    MonitorForm.render(app, id);
  } else {
    const id = hash.slice(1);
    if (/^\d+$/.test(id)) {
      MonitorDetail.render(app, id);
    } else {
      Dashboard.render(app);
    }
  }
}

window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', route);
