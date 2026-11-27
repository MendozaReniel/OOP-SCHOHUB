import { api, busy, isSignedIn, mountPasswordToggle, setSession, showAlert } from './api.js';

if (isSignedIn()) {
  location.replace('/dashboard.html');
}

const form = document.getElementById('signupForm');
const submitBtn = document.getElementById('submitBtn');

mountPasswordToggle('password', 'passwordToggle');

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = document.getElementById('email').value.trim();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  if (!email || !username || !password) {
    showAlert('formError', 'Fill in your email, username and password.');
    return;
  }
  if (username.length < 3) {
    showAlert('formError', 'Username must be at least 3 characters.');
    return;
  }
  if (password.length < 8) {
    showAlert('formError', 'Password must be at least 8 characters.');
    return;
  }

  busy(submitBtn, true, 'Creating account…');
  try {
    const session = await api('/api/auth/signup', {
      method: 'POST',
      auth: false,
      body: { email, username, password },
    });
    setSession(session.token, session.student);
    location.replace('/profile.html');
  } catch (error) {
    busy(submitBtn, false);
    const fieldErrors = error.errors ? Object.values(error.errors)[0] : null;
    showAlert('formError', fieldErrors || error.message);
  }
});
