import { api, busy, clearSession, isSignedIn, mountPasswordToggle, setSession, showAlert } from './api.js';

if (isSignedIn()) {
  location.replace('/dashboard.html');
}

const form = document.getElementById('loginForm');
const submitBtn = document.getElementById('submitBtn');

mountPasswordToggle('password', 'passwordToggle');

/** Only allow same-site redirects from ?next=. */
function nextTarget() {
  const next = new URLSearchParams(location.search).get('next');
  return next && next.startsWith('/') && !next.startsWith('//') ? next : null;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email || !password) {
    showAlert('formError', 'Enter your email and password.');
    return;
  }

  busy(submitBtn, true, 'Logging in…');
  try {
    const session = await api('/api/auth/login', {
      method: 'POST',
      auth: false,
      body: { email, password },
    });
    setSession(session.token, session.student);

    const profileStarted = Boolean(session.student?.baseIdentity?.fullName);
    const destination = nextTarget() || (profileStarted ? '/dashboard.html' : '/profile.html');
    location.replace(destination);
  } catch (error) {
    busy(submitBtn, false);
    clearSession();
    showAlert('formError', error.message);
  }
});
