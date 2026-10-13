/* ==========================================================================
   XENON RIFT — MINIMALIST CLIENT SCRIPT
   Domain: xenonrift.com
   ========================================================================== */

// --- Subtle Ambient Starfield ---
class AmbientStarfield {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.stars = [];
    this.numStars = 140; // Clean, restrained star count
    this.mouseX = 0;
    this.mouseY = 0;
    this.targetMouseX = 0;
    this.targetMouseY = 0;

    this.init();
    this.bindEvents();
    this.animate();
  }

  init() {
    this.resize();
    this.stars = [];
    for (let i = 0; i < this.numStars; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 1.4 + 0.3,
        alpha: Math.random() * 0.7 + 0.2,
        speed: Math.random() * 0.25 + 0.05,
        twinkleSpeed: Math.random() * 0.015 + 0.005,
        twinkleDir: Math.random() > 0.5 ? 1 : -1
      });
    }
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.resize();
      this.init();
    });

    window.addEventListener('mousemove', (e) => {
      this.targetMouseX = (e.clientX - window.innerWidth / 2) * 0.02;
      this.targetMouseY = (e.clientY - window.innerHeight / 2) * 0.02;
    });
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    if (!this.ctx) return;

    this.mouseX += (this.targetMouseX - this.mouseX) * 0.05;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.05;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i];

      // Slow drift
      s.y -= s.speed;
      if (s.y < 0) s.y = this.canvas.height;

      // Soft twinkle
      s.alpha += s.twinkleSpeed * s.twinkleDir;
      if (s.alpha > 0.9) {
        s.alpha = 0.9;
        s.twinkleDir = -1;
      } else if (s.alpha < 0.2) {
        s.alpha = 0.2;
        s.twinkleDir = 1;
      }

      this.ctx.fillStyle = '#ffffff';
      this.ctx.globalAlpha = s.alpha;
      this.ctx.beginPath();
      this.ctx.arc(s.x + this.mouseX, s.y + this.mouseY, s.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;
  }
}

// --- Minimal UI Controller ---
document.addEventListener('DOMContentLoaded', () => {
  new AmbientStarfield('starfield');

  // Copy Server Address Trigger
  document.querySelectorAll('.copy-trigger').forEach((btn) => {
    btn.addEventListener('click', () => {
      const textToCopy = btn.getAttribute('data-copy') || 'game.xenonrift.com:7770';
      navigator.clipboard.writeText(textToCopy).then(() => {
        showToast(`Server address copied: ${textToCopy}`);
      });
    });
  });

  // Clean Lightbox
  const galleryItems = document.querySelectorAll('.gallery-item');
  const lightboxModal = document.getElementById('lightboxModal');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxClose = document.getElementById('lightboxClose');

  galleryItems.forEach((item) => {
    item.addEventListener('click', () => {
      const fullSrc = item.getAttribute('data-full');
      if (fullSrc && lightboxImg && lightboxModal) {
        lightboxImg.src = fullSrc;
        lightboxModal.classList.add('active');
      }
    });
  });

  if (lightboxClose && lightboxModal) {
    lightboxClose.addEventListener('click', () => {
      lightboxModal.classList.remove('active');
    });

    lightboxModal.addEventListener('click', (e) => {
      if (e.target === lightboxModal) {
        lightboxModal.classList.remove('active');
      }
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightboxModal) {
      lightboxModal.classList.remove('active');
    }
  });
});

// Toast notification helper
function showToast(message) {
  let toast = document.getElementById('siteToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'siteToast';
    toast.className = 'toast-notice';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('visible');

  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove('visible');
  }, 2500);
}
