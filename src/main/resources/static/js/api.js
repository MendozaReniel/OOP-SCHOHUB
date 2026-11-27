/**
 * Shared API client and small helpers.
 * Same-origin: the pages are served by the Spring Boot app, so API calls use
 * relative paths and no CORS configuration is involved.
 */

const TOKEN_KEY = 'schohub.token';
const STUDENT_KEY = 'schohub.student';

export class ApiError extends Error {
  constructor(message, status, errors) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors || null;
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getCachedStudent() {
  const raw = localStorage.getItem(STUDENT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setSession(token, student) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (student) localStorage.setItem(STUDENT_KEY, JSON.stringify(student));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(STUDENT_KEY);
}

export function isSignedIn() {
  return Boolean(getToken());
}

/** Redirects to the login page when there is no token. */
export function requireAuth() {
  if (!isSignedIn()) {
    location.replace('/login.html');
    return false;
  }
  return true;
}

export async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const token = getToken();
  if (auth && token) headers['Authorization'] = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Cannot reach the SchoHub server. Is the backend running?', 0);
  }

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401 && auth) {
      clearSession();
      location.replace('/login.html');
    }
    throw new ApiError(
      (data && data.message) || `Request failed (${response.status}).`,
      response.status,
      data && data.errors,
    );
  }
  return data;
}

export async function logout() {
  try {
    await api('/api/auth/logout', { method: 'POST' });
  } catch {
    /* the local session is cleared regardless */
  }
  clearSession();
  location.replace('/index.html');
}

/* ------------------------------------------------------------------ */
/* Small presentation helpers                                          */
/* ------------------------------------------------------------------ */

export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function initials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'S';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function percentText(value) {
  if (value === null || value === undefined) return '—';
  return `${Number(value).toFixed(Number(value) % 1 === 0 ? 0 : 2)}%`;
}

export function providerLabel(type) {
  return {
    LOCAL_GOVERNMENT: 'Local government',
    PROVINCIAL_GOVERNMENT: 'Provincial government',
    UNIVERSITY: 'University / institutional',
    PRIVATE_ORGANIZATION: 'Private organization',
  }[type] || 'Scholarship';
}

export function levelLabel(level) {
  return {
    JUNIOR_HIGH: 'Junior High',
    SENIOR_HIGH: 'Senior High',
    COLLEGE: 'College',
  }[level] || level;
}

/** Fills the header user chip and wires the log-out button on app pages. */
export function mountAppHeader(student) {
  const chip = document.querySelector('[data-user-name]');
  if (chip && student) chip.textContent = student.baseIdentity?.fullName || student.username || 'Student';

  const avatar = document.querySelector('[data-user-initials]');
  if (avatar && student) avatar.textContent = initials(student.baseIdentity?.fullName || student.username);

  const logoutBtn = document.querySelector('[data-logout]');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }
}

/** Shows or hides an inline alert element. */
export function showAlert(id, message, kind = 'error') {
  const node = document.getElementById(id);
  if (!node) return;
  node.className = `alert alert-${kind}`;
  node.textContent = message;
  node.hidden = false;
}

export function hideAlert(id) {
  const node = document.getElementById(id);
  if (node) node.hidden = true;
}

/** Wires a Show / Hide button that reveals the password in a field. */
export function mountPasswordToggle(inputId, buttonId) {
  const input = document.getElementById(inputId);
  const button = document.getElementById(buttonId);
  if (!input || !button) return;

  button.addEventListener('click', () => {
    const reveal = input.type === 'password';
    input.type = reveal ? 'text' : 'password';
    button.textContent = reveal ? 'Hide' : 'Show';
    button.setAttribute('aria-pressed', String(reveal));
    button.setAttribute('aria-label', reveal ? 'Hide password' : 'Show password');
    input.focus();
  });
}

/** Disables a button and swaps in a spinner while a request runs. */
export function busy(button, isBusy, label) {
  if (!button) return;
  if (isBusy) {
    button.dataset.label = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `<span class="spinner"></span> ${label || 'Please wait…'}`;
  } else {
    button.disabled = false;
    if (button.dataset.label) button.innerHTML = button.dataset.label;
  }
}
