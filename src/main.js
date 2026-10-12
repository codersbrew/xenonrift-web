/* ==========================================================================
   XENON RIFT — INTERACTIVE SCI-FI CLIENT ENGINE
   Domain: xenonrift.com
   ========================================================================== */

// --- 1. Sound Synthesizer (Web Audio API) ---
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('xr_audio_muted') === 'true';
    this.initAudioContext();
  }

  initAudioContext() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('xr_audio_muted', this.muted);
    return this.muted;
  }

  playBeep(freq = 880, duration = 0.06, type = 'sine') {
    if (this.muted) return;
    try {
      this.resume();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }

  playLaser() {
    if (this.muted) return;
    try {
      this.resume();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, this.ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.07, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.12);
    } catch (e) {}
  }

  playWarp() {
    if (this.muted) return;
    try {
      this.resume();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.4);
    } catch (e) {}
  }
}

const sounds = new SoundEngine();

// --- 2. Interactive Starfield & Warp Canvas ---
class Starfield {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.stars = [];
    this.numStars = 320;
    this.warp = false;
    this.speed = 0.5;
    this.targetSpeed = 0.5;
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
        x: (Math.random() - 0.5) * this.canvas.width * 2,
        y: (Math.random() - 0.5) * this.canvas.height * 2,
        z: Math.random() * this.canvas.width,
        pz: Math.random() * this.canvas.width,
        color: Math.random() > 0.8 ? '#00f0ff' : Math.random() > 0.6 ? '#ff6600' : '#ffffff',
        size: Math.random() * 1.5 + 0.5
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
      this.targetMouseX = (e.clientX - window.innerWidth / 2) * 0.05;
      this.targetMouseY = (e.clientY - window.innerHeight / 2) * 0.05;
    });
  }

  setWarp(enabled) {
    this.warp = enabled;
    this.targetSpeed = enabled ? 18 : 0.6;
    if (enabled) {
      sounds.playWarp();
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    if (!this.ctx) return;

    // Smooth speed & mouse transitions
    this.speed += (this.targetSpeed - this.speed) * 0.05;
    this.mouseX += (this.targetMouseX - this.mouseX) * 0.05;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.05;

    // Semi-transparent fade for streak effects in warp
    this.ctx.fillStyle = this.warp ? 'rgba(6, 8, 16, 0.4)' : 'rgba(6, 8, 16, 1)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const cx = this.canvas.width / 2 + this.mouseX;
    const cy = this.canvas.height / 2 + this.mouseY;

    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i];
      s.pz = s.z;
      s.z -= this.speed;

      if (s.z <= 0) {
        s.z = this.canvas.width;
        s.pz = s.z;
        s.x = (Math.random() - 0.5) * this.canvas.width * 2;
        s.y = (Math.random() - 0.5) * this.canvas.height * 2;
      }

      const k = 128.0 / s.z;
      const px = s.x * k + cx;
      const py = s.y * k + cy;

      if (px >= 0 && px <= this.canvas.width && py >= 0 && py <= this.canvas.height) {
        const pk = 128.0 / s.pz;
        const prevX = s.x * pk + cx;
        const prevY = s.y * pk + cy;

        const size = (1 - s.z / this.canvas.width) * s.size * 2;
        const alpha = Math.min(1, Math.max(0.1, 1 - s.z / this.canvas.width));

        this.ctx.strokeStyle = s.color;
        this.ctx.fillStyle = s.color;
        this.ctx.globalAlpha = alpha;

        if (this.warp || this.speed > 2) {
          this.ctx.lineWidth = size;
          this.ctx.beginPath();
          this.ctx.moveTo(prevX, prevY);
          this.ctx.lineTo(px, py);
          this.ctx.stroke();
        } else {
          this.ctx.beginPath();
          this.ctx.arc(px, py, size / 2, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
    }
    this.ctx.globalAlpha = 1;
  }
}

// --- 3. UI Controller & Interactivity ---
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Starfield
  const starfield = new Starfield('starfield');

  // Warp Toggle
  const warpBtn = document.getElementById('warpToggleBtn');
  if (warpBtn) {
    let isWarping = false;
    warpBtn.addEventListener('click', () => {
      isWarping = !isWarping;
      starfield.setWarp(isWarping);
      warpBtn.classList.toggle('active', isWarping);
      warpBtn.setAttribute('title', isWarping ? 'Disengage Warp Speed' : 'Engage Warp Speed');
      showToast(isWarping ? 'WARP DRIVE ENGAGED: MAXIMUM VELOCITY' : 'WARP DRIVE DISENGAGED: SUBLIGHT CRUISE');
    });
  }

  // Audio Toggle
  const audioBtn = document.getElementById('audioToggleBtn');
  if (audioBtn) {
    const updateAudioIcon = () => {
      const isMuted = sounds.muted;
      audioBtn.classList.toggle('active', !isMuted);
      audioBtn.innerHTML = isMuted 
        ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`
        : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;
    };
    updateAudioIcon();

    audioBtn.addEventListener('click', () => {
      const isMuted = sounds.toggleMute();
      updateAudioIcon();
      if (!isMuted) sounds.playBeep(980, 0.08);
      showToast(isMuted ? 'AUDIO SUBSYSTEM MUTED' : 'AUDIO SUBSYSTEM ACTIVE');
    });
  }

  // Navbar Sticky Scroll
  const header = document.querySelector('.site-header');
  window.addEventListener('scroll', () => {
    if (header) {
      header.classList.toggle('scrolled', window.scrollY > 40);
    }
  });

  // Mobile Menu Toggle
  const menuToggle = document.getElementById('menuToggleBtn');
  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      document.body.classList.toggle('mobile-nav-active');
      sounds.playBeep(700, 0.04);
    });
  }

  // Key Art Style Switcher
  const styleBtns = document.querySelectorAll('.style-choice-btn');
  const heroVisualImg = document.getElementById('heroVisualImg');
  const heroStyleHeader = document.getElementById('heroStyleHeader');
  const heroTelemetrySector = document.getElementById('heroTelemetrySector');
  const heroTelemetryStatus = document.getElementById('heroTelemetryStatus');
  const heroTelemetryVessels = document.getElementById('heroTelemetryVessels');

  const setHeroStyle = (btn) => {
    if (!btn || !heroVisualImg) return;
    styleBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');

    const imgSrc = btn.getAttribute('data-img');
    const themeName = btn.getAttribute('data-name');
    const sector = btn.getAttribute('data-sector');
    const status = btn.getAttribute('data-status');
    const vessels = btn.getAttribute('data-vessels');

    heroVisualImg.style.opacity = '0.3';
    setTimeout(() => {
      heroVisualImg.src = imgSrc;
      heroVisualImg.style.opacity = '1';
    }, 150);

    if (heroStyleHeader) heroStyleHeader.textContent = themeName;
    if (heroTelemetrySector) heroTelemetrySector.textContent = sector;
    if (heroTelemetryStatus) heroTelemetryStatus.textContent = status;
    if (heroTelemetryVessels) heroTelemetryVessels.textContent = vessels;

    localStorage.setItem('xr_hero_style', btn.getAttribute('data-style'));
  };

  styleBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      setHeroStyle(btn);
      sounds.playBeep(880, 0.05);
      showToast(`APPLIED: ${btn.getAttribute('data-name')}`);
    });
  });

  const savedStyle = localStorage.getItem('xr_hero_style');
  if (savedStyle) {
    const savedBtn = document.querySelector(`.style-choice-btn[data-style="${savedStyle}"]`);
    if (savedBtn) setHeroStyle(savedBtn);
  }

  // Smooth Scroll for Nav Links & Sound Feedback
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId && targetId !== '#') {
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          e.preventDefault();
          document.body.classList.remove('mobile-nav-active');
          targetElement.scrollIntoView({ behavior: 'smooth' });
          sounds.playBeep(620, 0.04);
        }
      }
    });
  });

  // Download Platform Tabs
  const tabBtns = document.querySelectorAll('.downloads-tabs .tab-btn');
  const tabPanels = document.querySelectorAll('.downloads-container .tab-panel');

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      tabBtns.forEach((b) => b.classList.remove('active'));
      tabPanels.forEach((p) => p.classList.remove('active'));

      btn.classList.add('active');
      const activePanel = document.getElementById(`tab-${targetTab}`);
      if (activePanel) {
        activePanel.classList.add('active');
      }
      sounds.playBeep(750, 0.05);
    });
  });

  // Copy to Clipboard buttons
  document.querySelectorAll('.copy-trigger').forEach((btn) => {
    btn.addEventListener('click', () => {
      const textToCopy = btn.getAttribute('data-copy');
      if (textToCopy) {
        navigator.clipboard.writeText(textToCopy).then(() => {
          sounds.playBeep(1100, 0.06);
          showToast(`COPIED TO CLIPBOARD: ${textToCopy}`);
          const originalText = btn.innerHTML;
          btn.innerHTML = `<span style="color: var(--cyan-primary)">COPIED!</span>`;
          setTimeout(() => {
            btn.innerHTML = originalText;
          }, 1800);
        });
      }
    });
  });

  // Interactive Ship Test Fire Cannon
  const testFireBtn = document.getElementById('testFireBtn');
  const plasmaCanvas = document.getElementById('schematicBoltCanvas');
  if (testFireBtn && plasmaCanvas) {
    const pCtx = plasmaCanvas.getContext('2d');
    testFireBtn.addEventListener('click', () => {
      sounds.playLaser();
      testFireBtn.classList.add('firing');
      setTimeout(() => testFireBtn.classList.remove('firing'), 200);

      // Render twin plasma bolt animation on the canvas
      let boltY = 220;
      const animateBolt = () => {
        pCtx.clearRect(0, 0, plasmaCanvas.width, plasmaCanvas.height);
        pCtx.fillStyle = '#00f0ff';
        pCtx.shadowColor = '#00f0ff';
        pCtx.shadowBlur = 10;

        // Left bolt
        pCtx.fillRect(115, boltY, 4, 24);
        // Right bolt
        pCtx.fillRect(185, boltY, 4, 24);

        boltY -= 14;
        if (boltY > -30) {
          requestAnimationFrame(animateBolt);
        } else {
          pCtx.clearRect(0, 0, plasmaCanvas.width, plasmaCanvas.height);
        }
      };
      animateBolt();
    });
  }

  // Interactive Lightbox Gallery
  const galleryCards = document.querySelectorAll('.gallery-card');
  const lightboxModal = document.getElementById('lightboxModal');
  const lightboxImg = document.getElementById('lightboxImage');
  const lightboxTitle = document.getElementById('lightboxTitle');
  const lightboxDesc = document.getElementById('lightboxDesc');
  const lightboxClose = document.getElementById('lightboxClose');
  const lightboxPrev = document.getElementById('lightboxPrev');
  const lightboxNext = document.getElementById('lightboxNext');

  let currentGalleryIndex = 0;
  const galleryItems = Array.from(galleryCards).map((card) => ({
    src: card.getAttribute('data-full'),
    title: card.getAttribute('data-title'),
    desc: card.getAttribute('data-desc')
  }));

  const openLightbox = (index) => {
    currentGalleryIndex = index;
    const item = galleryItems[index];
    if (!item) return;

    lightboxImg.src = item.src;
    lightboxTitle.textContent = item.title;
    lightboxDesc.textContent = item.desc;
    lightboxModal.classList.add('active');
    sounds.playBeep(850, 0.05);
  };

  const closeLightbox = () => {
    lightboxModal.classList.remove('active');
    sounds.playBeep(520, 0.04);
  };

  galleryCards.forEach((card, index) => {
    card.addEventListener('click', () => openLightbox(index));
  });

  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightboxPrev) {
    lightboxPrev.addEventListener('click', (e) => {
      e.stopPropagation();
      currentGalleryIndex = (currentGalleryIndex - 1 + galleryItems.length) % galleryItems.length;
      openLightbox(currentGalleryIndex);
    });
  }
  if (lightboxNext) {
    lightboxNext.addEventListener('click', (e) => {
      e.stopPropagation();
      currentGalleryIndex = (currentGalleryIndex + 1) % galleryItems.length;
      openLightbox(currentGalleryIndex);
    });
  }
  if (lightboxModal) {
    lightboxModal.addEventListener('click', (e) => {
      if (e.target === lightboxModal) closeLightbox();
    });
  }

  window.addEventListener('keydown', (e) => {
    if (!lightboxModal || !lightboxModal.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') {
      currentGalleryIndex = (currentGalleryIndex - 1 + galleryItems.length) % galleryItems.length;
      openLightbox(currentGalleryIndex);
    }
    if (e.key === 'ArrowRight') {
      currentGalleryIndex = (currentGalleryIndex + 1) % galleryItems.length;
      openLightbox(currentGalleryIndex);
    }
  });

  // Simulated Live Server Ping Telemetry
  const pingElement = document.getElementById('liveServerPing');
  if (pingElement) {
    setInterval(() => {
      const basePing = 24;
      const jitter = Math.floor(Math.random() * 8) - 4;
      const currentPing = Math.max(16, basePing + jitter);
      pingElement.textContent = `${currentPing}ms`;
    }, 3500);
  }
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
  toast.innerHTML = `<span style="color:var(--cyan-primary)">▶</span> ${message}`;
  toast.classList.add('visible');

  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove('visible');
  }, 3200);
}
