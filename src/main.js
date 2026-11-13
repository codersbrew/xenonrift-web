// Progressive gameplay video, screenshot enlargement and TestFlight signup.
import { initTestflightSignup } from './testflight.js';
import { initHeroVideo } from './hero-video.js';
const dialog = document.getElementById('lightbox');
const image = document.getElementById('lightbox-image');
const caption = document.getElementById('lightbox-caption');
let opener;

document.querySelectorAll('[data-full]').forEach(link => {
  link.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
        typeof dialog.showModal !== 'function') return;
    event.preventDefault();
    opener = link;
    image.src = link.dataset.full;
    image.alt = link.querySelector('img').alt;
    caption.textContent = link.dataset.caption;
    dialog.showModal();
    document.body.classList.add('modal-open');
  });
});

dialog.querySelector('.lightbox-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  const controls = [...dialog.querySelectorAll('button, a[href], [tabindex="0"]')];
  const first = controls[0], last = controls.at(-1);
  if ((!event.shiftKey && document.activeElement === last) ||
      (event.shiftKey && document.activeElement === first)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  }
});
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right ||
      event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
});
dialog.addEventListener('close', () => {
  document.body.classList.remove('modal-open');
  image.removeAttribute('src');
  opener?.focus({ preventScroll: true });
});

document.getElementById('copyright-year').textContent = new Date().getFullYear();
initTestflightSignup();
initHeroVideo();
