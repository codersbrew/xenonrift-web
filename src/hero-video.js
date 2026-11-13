// Keep responsive still usable without JS; attach media source only on playback.
export function initHeroVideo() {
  const video = document.getElementById('hero-video');
  const button = document.querySelector('.hero-video-toggle');
  if (!video || !button) return;

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  const prefersStill = () => motion.matches || connection?.saveData ||
    ['slow-2g', '2g'].includes(connection?.effectiveType);
  let requested = !prefersStill();
  let inView = !('IntersectionObserver' in window);
  let pending = false;
  let failed = false;
  let attempt = 0;

  const label = playing => {
    button.textContent = playing ? 'Pause gameplay video' : 'Play gameplay video';
  };

  async function syncPlayback() {
    const current = ++attempt;
    if (failed || !requested || !inView || document.hidden) {
      pending = false;
      video.pause();
      label(false);
      return;
    }
    pending = true;
    label(true);
    // Explicit property assignment also covers browsers that ignore muted markup.
    video.muted = true;
    if (!video.hasAttribute('src')) video.src = video.dataset.src;
    try {
      await video.play();
    } catch {
      if (current !== attempt || failed) return;
      // Autoplay can be blocked (e.g. low-power mode); allow manual retry.
      requested = false;
      video.hidden = true;
      label(false);
    } finally {
      if (current === attempt) pending = false;
    }
  }

  video.addEventListener('playing', () => {
    if (!requested || !inView || document.hidden) {
      video.pause();
      return;
    }
    video.hidden = false;
    label(true);
  });
  video.addEventListener('pause', () => label(false));
  video.addEventListener('error', () => {
    failed = true;
    requested = false;
    syncPlayback();
    video.hidden = true;
    button.hidden = true;
    document.getElementById('hero-video-status').textContent =
      'Gameplay video unavailable. Showing still image.';
  });

  button.hidden = false;
  button.addEventListener('click', () => {
    requested = video.paused && !pending;
    syncPlayback();
  });
  document.addEventListener('visibilitychange', syncPlayback);
  const preferencesChanged = () => {
    if (prefersStill()) requested = false;
    syncPlayback();
  };
  motion.addEventListener('change', preferencesChanged);
  connection?.addEventListener('change', preferencesChanged);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      syncPlayback();
    }).observe(video.closest('.hero-visual'));
  }
  syncPlayback();
}
