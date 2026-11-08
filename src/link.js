// /link/: signing in an Apple TV, which has no browser. The TV shows a code (and a QR code of /link/?tv=CODE); the pilot
// signs in here with Google, Apple or email and the page approves the code through the device-link Edge Function. The
// TV then receives its own session.
//
// This page's session is credentials it needs only for that one call: kept in memory (the PKCE verifier and the code
// wait in sessionStorage across the Google / Apple round trip), removed from the address bar at once, and revoked
// (scope=local, so the pilot's other sessions are untouched) once the TV is approved or the page is left.
import { SUPABASE_URL, SUPABASE_ANON_KEY, LINK_URL } from './auth-config.js';

const CODE_LENGTH = 8;
const STORE_CODE = 'xr.link.tv';
const STORE_VERIFIER = 'xr.link.verifier';

/** "k7qx-4mpt " -> "K7QX4MPT"; '' when it can't be a code. */
export function normalizeCode(text) {
  const code = String(text || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return code.length === CODE_LENGTH ? code : '';
}

/** "K7QX4MPT" -> "K7QX-4MPT", the way the TV shows it. */
export function formatCode(text) {
  const code = String(text || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);
  return code.length > 4 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

function base64Url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function pkcePair() {
  const verifier = base64Url(crypto.getRandomValues(new Uint8Array(32)));
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  return { verifier, challenge: base64Url(digest) };
}

function headers(token) {
  const result = { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' };
  const bearer = token || (SUPABASE_ANON_KEY.startsWith('sb_') ? '' : SUPABASE_ANON_KEY);
  if (bearer) result.Authorization = `Bearer ${bearer}`;
  return result;
}

async function problem(response) {
  try {
    const body = await response.json();
    return body.error || body.msg || body.error_description || body.message || '';
  } catch {
    return '';
  }
}

function show(id) {
  for (const panel of document.querySelectorAll('[data-state]')) panel.hidden = panel.dataset.state !== id;
  const heading = document.querySelector(`[data-state="${id}"] h1`);
  if (heading) heading.focus();
}

function setMessage(form, text) {
  const message = form.querySelector('.form-message');
  message.textContent = text;
  message.hidden = !text;
}

function setBusy(busy) {
  for (const control of document.querySelectorAll('button, input')) control.disabled = busy;
}

function linkPage() {
  const startCodeField = document.querySelector('#code-form [name=code]');
  const emailForm = document.getElementById('email-form');
  const retryForm = document.getElementById('retry-form');
  let token = '';

  const revoke = () => {
    if (!token) return;
    const spent = token;
    token = '';
    fetch(`${SUPABASE_URL}/auth/v1/logout?scope=local`, { method: 'POST', headers: headers(spent), keepalive: true }).catch(() => {});
  };
  addEventListener('pagehide', revoke);

  for (const field of document.querySelectorAll('.tv-code')) {
    field.addEventListener('input', () => { field.value = formatCode(field.value); });
  }

  // Where the page came from: the TV's QR code (?tv=), or Google / Apple coming back (?code= or ?error=).
  const params = new URLSearchParams(location.search);
  for (const [key, value] of new URLSearchParams(location.hash.replace(/^#/, ''))) if (!params.has(key)) params.set(key, value);
  history.replaceState(null, '', location.pathname);
  const fromQr = normalizeCode(params.get('tv'));
  if (fromQr) sessionStorage.setItem(STORE_CODE, fromQr);
  startCodeField.value = formatCode(fromQr || sessionStorage.getItem(STORE_CODE) || '');

  /** Approves the TV's code as the signed-in pilot: true when done; otherwise the retry form says why. */
  async function approve(code) {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/device-link`, {
      method: 'POST', headers: headers(token), body: JSON.stringify({ action: 'approve', user_code: code }),
    });
    if (response.ok) {
      const body = await response.json().catch(() => ({}));
      document.querySelector('[data-device]').textContent = body.device_label || 'TV';
      sessionStorage.removeItem(STORE_CODE);
      revoke();
      show('approved');
      return true;
    }
    const text = await problem(response);
    if (response.status === 401) {
      revoke();
      show('start');
      setMessage(emailForm, text || 'Your sign-in expired. Sign in again.');
    } else {
      show('retry');
      setMessage(retryForm, text || 'Couldn’t approve the code. Try again.');
    }
    return false;
  }

  async function signedIn(session) {
    token = session.access_token;
    document.querySelector('[data-signed-in-as]').textContent = session.user?.email || 'your account';
    const code = normalizeCode(sessionStorage.getItem(STORE_CODE) || startCodeField.value);
    if (!code) {
      show('retry');
      return;
    }
    retryForm.code.value = formatCode(code);
    await approve(code);
  }

  function requireCode() {
    const code = normalizeCode(startCodeField.value);
    if (!code) {
      setMessage(emailForm, 'Enter the 8-character code your TV shows first.');
      startCodeField.focus();
    }
    return code;
  }

  for (const button of document.querySelectorAll('[data-provider]')) {
    button.addEventListener('click', async () => {
      const code = requireCode();
      if (!code) return;
      const { verifier, challenge } = await pkcePair();
      sessionStorage.setItem(STORE_CODE, code);
      sessionStorage.setItem(STORE_VERIFIER, verifier);
      location.assign(`${SUPABASE_URL}/auth/v1/authorize?provider=${button.dataset.provider}` +
        `&redirect_to=${encodeURIComponent(LINK_URL)}&code_challenge=${encodeURIComponent(challenge)}&code_challenge_method=s256`);
    });
  }

  emailForm.addEventListener('submit', async event => {
    event.preventDefault();
    const code = requireCode();
    if (!code) return;
    sessionStorage.setItem(STORE_CODE, code);
    const email = emailForm.email.value.trim();
    if (!emailForm.email.checkValidity() || !emailForm.password.value) {
      setMessage(emailForm, 'Enter your email and password.');
      return;
    }
    setBusy(true);
    setMessage(emailForm, '');
    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST', headers: headers(), body: JSON.stringify({ email, password: emailForm.password.value }),
      });
      if (!response.ok) {
        const text = await problem(response);
        setMessage(emailForm, response.status === 400 ? 'Wrong email or password.' : response.status === 429
          ? 'Too many attempts. Wait a minute and try again.' : text || 'Couldn’t sign in. Try again.');
        return;
      }
      emailForm.password.value = '';
      await signedIn(await response.json());
    } catch {
      setMessage(emailForm, 'Couldn’t reach the account service. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  });

  retryForm.addEventListener('submit', async event => {
    event.preventDefault();
    const code = normalizeCode(retryForm.code.value);
    if (!code) {
      setMessage(retryForm, 'Enter the 8-character code your TV shows.');
      return;
    }
    setBusy(true);
    setMessage(retryForm, '');
    try {
      await approve(code);
    } catch {
      setMessage(retryForm, 'Couldn’t reach the account service. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  });

  // Back from Google / Apple: exchange the code (PKCE, so only this page can) and approve.
  const verifier = sessionStorage.getItem(STORE_VERIFIER);
  sessionStorage.removeItem(STORE_VERIFIER);
  if (params.get('error')) {
    show('start');
    setMessage(emailForm, `Sign-in didn’t finish: ${(params.get('error_description') || params.get('error')).replace(/\+/g, ' ')}.`);
  } else if (params.get('code') && verifier) {
    show('start');
    setBusy(true);
    fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=pkce`, {
      method: 'POST', headers: headers(), body: JSON.stringify({ auth_code: params.get('code'), code_verifier: verifier }),
    }).then(async response => {
      if (!response.ok) {
        setMessage(emailForm, (await problem(response)) || 'Sign-in didn’t finish. Try again.');
        return;
      }
      await signedIn(await response.json());
    }).catch(() => {
      setMessage(emailForm, 'Couldn’t reach the account service. Check your connection and try again.');
    }).finally(() => setBusy(false));
  } else {
    show('start');
  }
}

if (typeof document !== 'undefined' && document.body.dataset.page === 'link') linkPage();
