// Landing pages for Supabase Auth email links: /auth/confirmed/ (sign-up confirmation, the project's Site URL) and
// /auth/reset/ (password recovery). Supabase verifies the link first, then redirects here with the outcome in the URL
// fragment: #access_token=…&type=signup|recovery on success, #error=…&error_code=otp_expired on failure.
//
// The access token is credentials: it is read once, removed from the address bar immediately, kept only in memory,
// and the one-off session it belongs to is revoked when the page is done with it (scope=local, so the pilot's game
// sessions are untouched).
import { SUPABASE_URL, SUPABASE_ANON_KEY, RESET_URL } from './auth-config.js';

const MIN_PASSWORD_LENGTH = 8;

/** Reads the link's outcome from the fragment (implicit flow) and the query (errors may arrive there too). */
export function readAuthRedirect(location) {
  const params = new URLSearchParams(location.hash.replace(/^#/, ''));
  for (const [key, value] of new URLSearchParams(location.search)) {
    if (!params.has(key)) params.set(key, value);
  }
  return {
    accessToken: params.get('access_token') || '',
    type: params.get('type') || '',
    error: params.get('error') || '',
    errorCode: params.get('error_code') || '',
    errorDescription: (params.get('error_description') || '').replace(/\+/g, ' '),
    hasAny: [...params.keys()].length > 0,
  };
}

/** What went wrong with a link, in the pilot's terms. */
export function linkErrorMessage(redirect) {
  if (redirect.errorCode === 'otp_expired') return 'This link has expired or was already used. Links work once and only for a limited time.';
  if (redirect.errorDescription) return `This link didn’t work: ${redirect.errorDescription}.`;
  return 'This link didn’t work. It may be incomplete — try opening it again from the email.';
}

function stripUrl() {
  history.replaceState(null, '', location.pathname);
}

function show(id) {
  for (const panel of document.querySelectorAll('[data-state]')) panel.hidden = panel.dataset.state !== id;
  const heading = document.querySelector(`[data-state="${id}"] h1`);
  if (heading) heading.focus();
}

function headers(token) {
  return { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' };
}

async function authError(response) {
  try {
    const body = await response.json();
    return { code: body.error_code || body.code || '', message: body.msg || body.message || body.error_description || '' };
  } catch {
    return { code: '', message: '' };
  }
}

/** Revokes the one-off session the email link created. Best effort: it expires on its own anyway. */
function revoke(token) {
  if (!token) return Promise.resolve();
  return fetch(`${SUPABASE_URL}/auth/v1/logout?scope=local`, { method: 'POST', headers: headers(token) }).catch(() => {});
}

function setBusy(form, busy) {
  for (const control of form.querySelectorAll('button, input')) control.disabled = busy;
  form.setAttribute('aria-busy', String(busy));
}

function setMessage(form, text) {
  const message = form.querySelector('.form-message');
  message.textContent = text;
  message.hidden = !text;
}

// ---------------------------------------------------------------- /auth/confirmed/

function confirmedPage() {
  const redirect = readAuthRedirect(location);
  if (redirect.type === 'recovery') {
    // A recovery link that fell back to the Site URL (e.g. sent from the dashboard): the reset page handles it.
    location.replace(`../reset/${location.hash}`);
    return;
  }
  stripUrl();
  if (redirect.error) {
    document.querySelector('[data-error-text]').textContent = linkErrorMessage(redirect);
    show('error');
  } else if (redirect.accessToken) {
    revoke(redirect.accessToken);
    show('confirmed');
  } else {
    show('idle');
  }
}

// ---------------------------------------------------------------- /auth/reset/

function resetPage() {
  const redirect = readAuthRedirect(location);
  stripUrl();
  let token = redirect.type === 'recovery' || (redirect.accessToken && !redirect.type) ? redirect.accessToken : '';

  const requestForm = document.getElementById('request-form');
  requestForm.addEventListener('submit', async event => {
    event.preventDefault();
    const email = requestForm.email.value.trim();
    if (!requestForm.email.checkValidity()) {
      setMessage(requestForm, 'Enter the email address you signed up with.');
      return;
    }
    setBusy(requestForm, true);
    setMessage(requestForm, '');
    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/recover?redirect_to=${encodeURIComponent(RESET_URL)}`, {
        method: 'POST', headers: headers(), body: JSON.stringify({ email }),
      });
      if (response.status === 429) {
        setMessage(requestForm, 'Too many requests. Wait a minute, then try again.');
        return;
      }
      if (!response.ok && response.status >= 500) {
        setMessage(requestForm, 'The account service didn’t answer. Try again in a moment.');
        return;
      }
      // Answer the same whether or not the account exists, so this form can't be used to discover accounts.
      document.querySelector('[data-sent-to]').textContent = email;
      show('sent');
    } catch {
      setMessage(requestForm, 'Couldn’t reach the account service. Check your connection and try again.');
    } finally {
      setBusy(requestForm, false);
    }
  });

  const passwordForm = document.getElementById('password-form');
  passwordForm.addEventListener('submit', async event => {
    event.preventDefault();
    const password = passwordForm.password.value;
    if (password.length < MIN_PASSWORD_LENGTH) {
      setMessage(passwordForm, `Passwords are at least ${MIN_PASSWORD_LENGTH} characters.`);
      passwordForm.password.focus();
      return;
    }
    if (password !== passwordForm.confirm.value) {
      setMessage(passwordForm, 'The two passwords don’t match.');
      passwordForm.confirm.focus();
      return;
    }
    setBusy(passwordForm, true);
    setMessage(passwordForm, '');
    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        method: 'PUT', headers: headers(token), body: JSON.stringify({ password }),
      });
      if (response.ok) {
        passwordForm.reset();
        await revoke(token);
        token = '';
        show('changed');
        return;
      }
      const problem = await authError(response);
      if (response.status === 401 || response.status === 403) {
        token = '';
        document.querySelector('[data-error-text]').textContent = 'This reset link has expired. Ask for a new one below.';
        show('error');
      } else if (problem.code === 'same_password') {
        setMessage(passwordForm, 'That’s your current password. Choose a different one.');
      } else if (problem.code === 'weak_password') {
        setMessage(passwordForm, problem.message || 'Choose a stronger password.');
      } else {
        setMessage(passwordForm, problem.message ? `Couldn’t change your password: ${problem.message}` : 'Couldn’t change your password. Try again.');
      }
    } catch {
      setMessage(passwordForm, 'Couldn’t reach the account service. Check your connection and try again.');
    } finally {
      setBusy(passwordForm, false);
    }
  });

  for (const button of document.querySelectorAll('[data-show]')) {
    button.addEventListener('click', () => show(button.dataset.show));
  }

  if (redirect.error) {
    document.querySelector('[data-error-text]').textContent = linkErrorMessage(redirect);
    show('error');
  } else if (token) {
    show('choose');
  } else {
    show('request');
  }
}

if (typeof document !== 'undefined') {
  const page = document.body.dataset.page;
  if (page === 'confirmed') confirmedPage();
  else if (page === 'reset') resetPage();
}
