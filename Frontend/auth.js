// ── auth.js — shared across all pages ──

function getToken() {
  return localStorage.getItem('token');
}

function getUser() {
  try { return JSON.parse(localStorage.getItem('user')); }
  catch { return null; }
}

function isAdmin() {
  return getUser()?.role === 'admin';
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/pages/login.html';
}

function requireAuth() {
  if (!getToken()) window.location.href = '/pages/login.html';
}

// Authenticated fetch wrapper
async function apiFetch(url, options = {}) {
  const token = getToken();
  const headers = {
    'Authorization': `Bearer ${token}`,
    ...(options.headers || {}),
  };

  // Don't set Content-Type for FormData (multipart)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    if (options.body && typeof options.body === 'object') {
      options.body = JSON.stringify(options.body);
    }
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401 || res.status === 403) {
    logout();
    return;
  }

  return res;
}

// Show toast notification
function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('show'), 10);
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3000);
}