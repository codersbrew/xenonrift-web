// TestFlight waitlist signup on /#play. Posts to the testflight-signup Supabase Edge Function
// using the public anon key, and offers a pre-filled mailto: fallback if the service is unreachable.
import { SUPABASE_ANON_KEY, TESTFLIGHT_SIGNUP_URL } from './auth-config.js';

const PLATFORM_LABELS = {
  iphone: 'iPhone',
  ipad: 'iPad',
  apple_tv: 'Apple TV',
  mac: 'Mac',
};

const VALID_PLATFORMS = Object.keys(PLATFORM_LABELS);

export function formatDevices(platforms) {
  const labels = platforms.map(id => PLATFORM_LABELS[id]).filter(Boolean);
  if (labels.length <= 1) return labels[0] || 'Apple devices';
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')}, and ${labels.at(-1)}`;
}

export function fallbackMailtoHref(email, platforms) {
  const lines = [
    'Please add me to the Xenon Rift TestFlight waitlist.',
    email ? `Apple ID email: ${email}` : '',
    platforms.length ? `Devices: ${formatDevices(platforms)}` : '',
  ].filter(Boolean);
  const params = new URLSearchParams({
    subject: 'Xenon Rift TestFlight signup',
    body: lines.join('\n'),
  });
  return `mailto:support@codersbrew.com?${params.toString().replace(/\+/g, '%20')}`;
}

function requestHeaders() {
  const headers = { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' };
  if (!SUPABASE_ANON_KEY.startsWith('sb_')) headers.Authorization = `Bearer ${SUPABASE_ANON_KEY}`;
  return headers;
}

async function readProblem(response) {
  try {
    const body = await response.json();
    return body.error || body.message || '';
  } catch {
    return '';
  }
}

export function initTestflightSignup() {
  const card = document.getElementById('testflight-signup');
  const form = document.getElementById('testflight-form');
  if (!card || !form) return;

  const message = form.querySelector('.form-message');
  const fallbackWrap = form.querySelector('.testflight-fallback');
  const fallbackLink = form.querySelector('[data-fallback-mailto]');
  const doneEmail = card.querySelector('[data-signup-email]');
  const doneDevices = card.querySelector('[data-signup-devices]');
  const editButton = card.querySelector('[data-signup-edit]');

  function showState(state) {
    for (const panel of card.querySelectorAll('[data-signup-state]')) {
      panel.hidden = panel.dataset.signupState !== state;
    }
    if (state === 'done') card.querySelector('[data-signup-state="done"] h3')?.focus();
  }

  function setError(text, { offerFallback = false, email = '', platforms = [] } = {}) {
    message.textContent = text;
    message.hidden = !text;
    if (offerFallback && fallbackWrap && fallbackLink) {
      fallbackLink.href = fallbackMailtoHref(email, platforms);
      fallbackWrap.hidden = false;
    } else if (fallbackWrap) {
      fallbackWrap.hidden = true;
    }
  }

  function setBusy(busy) {
    for (const control of form.querySelectorAll('button, input')) control.disabled = busy;
  }

  function selectedPlatforms() {
    return [...form.querySelectorAll('input[name="platform"]:checked')]
      .map(box => box.value)
      .filter(value => VALID_PLATFORMS.includes(value));
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const emailInput = form.elements.email;
    const email = emailInput.value.trim().toLowerCase();
    const platforms = selectedPlatforms();

    if (!email || !emailInput.checkValidity() || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/.test(email)) {
      setError('Enter the email address you use with Apple TestFlight.');
      emailInput.focus();
      return;
    }
    if (platforms.length === 0) {
      setError('Choose at least one Apple device.');
      form.querySelector('input[name="platform"]')?.focus();
      return;
    }

    const company = form.elements.company?.value || '';
    setBusy(true);
    setError('');

    try {
      const response = await fetch(TESTFLIGHT_SIGNUP_URL, {
        method: 'POST',
        headers: requestHeaders(),
        body: JSON.stringify({ email, platforms, company }),
      });

      if (!response.ok) {
        const text = await readProblem(response);
        if (response.status === 400) {
          setError(text || 'Check your email address and selected devices.');
        } else if (response.status === 429) {
          setError(text || 'Too many requests right now. Wait a few minutes and try again.');
        } else {
          setError(
            'Online signup isn’t available right now. You can send your TestFlight request by email below.',
            { offerFallback: true, email, platforms },
          );
        }
        return;
      }

      doneEmail.textContent = email;
      doneDevices.textContent = formatDevices(platforms);
      showState('done');
    } catch {
      setError(
        'Couldn’t reach the signup service. Check your connection or send your request by email below.',
        { offerFallback: true, email, platforms },
      );
    } finally {
      setBusy(false);
    }
  });

  editButton?.addEventListener('click', () => {
    showState('form');
    form.elements.email.focus();
  });
}
