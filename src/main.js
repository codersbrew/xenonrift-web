// Ambient only: no gameplay or fake live-server indicators.
class AmbientStarfield {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas?.getContext('2d');
    if (!this.ctx) return;
    this.motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.frame = null;
    this.lastTime = null;
    this.resize();
    window.addEventListener('resize', () => {
      this.resize();
      this.updateMotion();
    });
    document.addEventListener('visibilitychange', () => this.updateMotion());
    this.motion.addEventListener('change', () => this.updateMotion());
    this.updateMotion();
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = this.width * scale;
    this.canvas.height = this.height * scale;
    this.ctx.setTransform(scale, 0, 0, scale, 0, 0);
    const count = Math.min(100, Math.round(this.width * this.height / 16000));
    this.stars = Array.from({ length: count }, () => ({
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      size: Math.random() * 1.1 + .3,
      alpha: Math.random() * .5 + .2,
      speed: Math.random() * 5 + 2,
    }));
    this.draw(0);
  }

  updateMotion() {
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.lastTime = null;
    if (!this.motion.matches && !document.hidden) {
      this.frame = requestAnimationFrame(time => this.animate(time));
    }
  }

  draw(delta) {
    this.ctx.clearRect(0, 0, this.width, this.height);
    for (const star of this.stars) {
      star.y -= star.speed * delta;
      if (star.y < 0) star.y = this.height;
      this.ctx.fillStyle = `rgba(205, 230, 255, ${star.alpha})`;
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  animate(time) {
    const delta = this.lastTime === null ? 0 : Math.min((time - this.lastTime) / 1000, .1);
    this.lastTime = time;
    this.draw(delta);
    this.frame = requestAnimationFrame(next => this.animate(next));
  }
}

new AmbientStarfield(document.getElementById('starfield'));

const dialog = document.getElementById('lightbox');
const dialogImage = document.getElementById('lightbox-image');
const dialogCaption = document.getElementById('lightbox-caption');
let opener = null;

document.querySelectorAll('[data-full]').forEach(button => {
  button.addEventListener('click', () => {
    opener = button;
    dialogImage.src = button.dataset.full;
    dialogImage.alt = button.querySelector('img').alt;
    dialogCaption.textContent = button.dataset.caption;
    dialog.showModal();
    document.body.classList.add('modal-open');
  });
});

dialog.querySelector('.lightbox-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  const controls = [...dialog.querySelectorAll('button, a[href], [tabindex="0"]')];
  const first = controls[0];
  const last = controls.at(-1);
  if ((!event.shiftKey && document.activeElement === last) ||
      (event.shiftKey && document.activeElement === first)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  }
});
dialog.addEventListener('click', event => {
  // Native dialogs receive backdrop clicks too; don't close on image or toolbar.
  if (event.target !== dialog) return;
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right ||
      event.clientY < bounds.top || event.clientY > bounds.bottom) {
    dialog.close();
  }
});
dialog.addEventListener('close', () => {
  document.body.classList.remove('modal-open');
  dialogImage.removeAttribute('src');
  opener?.focus({ preventScroll: true });
});

const toast = document.getElementById('toast');
let toastTimer;
function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('visible');
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 6500);
}

document.querySelectorAll('[data-copy]').forEach(button => {
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      showToast('Server address copied. Paste it into Multiplayer → Join Server.');
    } catch {
      // Select visible address so copying remains possible with denied permissions.
      const address = document.getElementById('server-address');
      const range = document.createRange();
      range.selectNodeContents(address);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      showToast(`Clipboard unavailable. Copy this address manually: ${button.dataset.copy}`);
    }
  });
});

document.getElementById('copyright-year').textContent = new Date().getFullYear();
