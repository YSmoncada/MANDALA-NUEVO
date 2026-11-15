/* Hallmark: luxury-rolls-royce-starlight */

(function () {
  'use strict';

  /* --------------------------------------------------------------------------
     1. ROLLS-ROYCE STARLIGHT CANVAS ENGINE
     -------------------------------------------------------------------------- */
  const canvas = document.getElementById('starlight-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let dpr = window.devicePixelRatio || 1;

  const STAR_COUNT = 240;
  const stars = [];
  const shootingStars = [];

  class Star {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.radius = (Math.random() * 1.1 + 0.35) * dpr;
      this.baseAlpha = Math.random() * 0.65 + 0.25;
      this.alpha = this.baseAlpha;
      this.twinkleSpeed = Math.random() * 0.025 + 0.008;
      this.phase = Math.random() * Math.PI * 2;
      this.isDiamond = Math.random() > 0.88;
    }

    update() {
      this.phase += this.twinkleSpeed;
      const flicker = (Math.sin(this.phase) + 1) / 2;
      this.alpha = this.baseAlpha * 0.3 + flicker * (this.baseAlpha * 0.7);
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.isDiamond
        ? `rgba(215, 235, 255, ${this.alpha})`
        : `rgba(244, 244, 246, ${this.alpha})`;
      ctx.fill();

      if (this.radius > 1.0 * dpr && this.alpha > 0.55) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(244, 244, 246, ${this.alpha * 0.12})`;
        ctx.fill();
      }
    }
  }

  class ShootingStar {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * width * 0.85;
      this.y = Math.random() * (height * 0.45);
      this.length = (Math.random() * 70 + 50) * dpr;
      this.speed = (Math.random() * 8 + 12) * dpr;
      this.angle = (Math.random() * 20 + 25) * (Math.PI / 180);
      this.opacity = 1;
      this.fade = Math.random() * 0.02 + 0.015;
      this.active = true;
    }

    update() {
      this.x += Math.cos(this.angle) * this.speed;
      this.y += Math.sin(this.angle) * this.speed;
      this.opacity -= this.fade;
      if (this.opacity <= 0) {
        this.active = false;
      }
    }

    draw() {
      if (!this.active) return;
      const tailX = this.x - Math.cos(this.angle) * this.length;
      const tailY = this.y - Math.sin(this.angle) * this.length;

      const grad = ctx.createLinearGradient(tailX, tailY, this.x, this.y);
      grad.addColorStop(0, 'rgba(244, 244, 246, 0)');
      grad.addColorStop(0.8, `rgba(244, 244, 246, ${this.opacity * 0.6})`);
      grad.addColorStop(1, `rgba(244, 244, 246, ${this.opacity})`);

      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(this.x, this.y);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.4 * dpr;
      ctx.stroke();
    }
  }

  function resize() {
    dpr = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    stars.length = 0;
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push(new Star());
    }
  }

  window.addEventListener('resize', resize, { passive: true });
  resize();

  let lastShootingStarTime = Date.now();
  const SHOOTING_INTERVAL = 4500;

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < stars.length; i++) {
      stars[i].update();
      stars[i].draw();
    }

    const now = Date.now();
    if (now - lastShootingStarTime > SHOOTING_INTERVAL) {
      if (Math.random() > 0.4) {
        shootingStars.push(new ShootingStar());
      }
      lastShootingStarTime = now;
    }

    for (let i = shootingStars.length - 1; i >= 0; i--) {
      const ss = shootingStars[i];
      ss.update();
      ss.draw();
      if (!ss.active) {
        shootingStars.splice(i, 1);
      }
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);

  /* --------------------------------------------------------------------------
     2. LUXURY SHOWCASE CAROUSEL ENGINE (SMOOTH HARDWARE-ACCELERATED TRACK)
     -------------------------------------------------------------------------- */
  const track = document.getElementById('carousel-track');
  const slides = document.querySelectorAll('.carousel-slide');
  const tabs = document.querySelectorAll('.carousel-tab-btn');
  const dots = document.querySelectorAll('.carousel-dot');
  const prevBtn = document.getElementById('carousel-prev-btn');
  const nextBtn = document.getElementById('carousel-next-btn');
  const stage = document.getElementById('carousel-stage');
  const counterCur = document.getElementById('carousel-cur');

  let currentSlide = 0;
  const totalSlides = slides.length || 5;
  let autoPlayTimer = null;
  const AUTOPLAY_DELAY = 6000;

  function goToSlide(index) {
    currentSlide = (index + totalSlides) % totalSlides;

    // Fluid CSS transform on track
    if (track) {
      track.style.transform = `translateX(-${currentSlide * 100}%)`;
    }

    // Update 01 / 05 counter
    if (counterCur) {
      counterCur.textContent = String(currentSlide + 1).padStart(2, '0');
    }

    slides.forEach((slide, i) => {
      const isActive = i === currentSlide;
      slide.classList.toggle('active', isActive);
      slide.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    });

    tabs.forEach((tab, i) => {
      const isActive = i === currentSlide;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === currentSlide);
    });

    const tabsContainer = document.querySelector('.carousel-tabs');
    if (tabsContainer && tabs[currentSlide]) {
      const activeTab = tabs[currentSlide];
      const targetScroll = activeTab.offsetLeft - (tabsContainer.clientWidth - activeTab.clientWidth) / 2;
      tabsContainer.scrollTo({ left: targetScroll, behavior: 'smooth' });
    }
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', function () {
      goToSlide(currentSlide - 1);
      resetAutoPlay();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      goToSlide(currentSlide + 1);
      resetAutoPlay();
    });
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', function () {
      const slideIndex = parseInt(this.getAttribute('data-slide'), 10);
      if (!isNaN(slideIndex)) {
        goToSlide(slideIndex);
        resetAutoPlay();
      }
    });
  });

  dots.forEach(dot => {
    dot.addEventListener('click', function () {
      const slideIndex = parseInt(this.getAttribute('data-slide'), 10);
      if (!isNaN(slideIndex)) {
        goToSlide(slideIndex);
        resetAutoPlay();
      }
    });
  });

  // Keyboard navigation
  window.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') {
      goToSlide(currentSlide + 1);
      resetAutoPlay();
    } else if (e.key === 'ArrowLeft') {
      goToSlide(currentSlide - 1);
      resetAutoPlay();
    }
  });

  // Touch & Drag Swipe for Mobile and Desktop
  let startX = 0;
  let startY = 0;
  let isSwiping = false;

  if (stage) {
    stage.addEventListener('touchstart', function (e) {
      if (e.touches && e.touches.length > 0) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isSwiping = true;
      }
    }, { passive: true });

    stage.addEventListener('touchend', function (e) {
      if (!isSwiping) return;
      isSwiping = false;
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const diffX = startX - endX;
      const diffY = startY - endY;

      if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX > 0) {
          goToSlide(currentSlide + 1);
        } else {
          goToSlide(currentSlide - 1);
        }
        resetAutoPlay();
      }
    }, { passive: true });

    stage.addEventListener('mouseenter', stopAutoPlay);
    stage.addEventListener('mouseleave', startAutoPlay);
  }

  function startAutoPlay() {
    stopAutoPlay();
    autoPlayTimer = setInterval(function () {
      goToSlide(currentSlide + 1);
    }, AUTOPLAY_DELAY);
  }

  function stopAutoPlay() {
    if (autoPlayTimer) {
      clearInterval(autoPlayTimer);
      autoPlayTimer = null;
    }
  }

  function resetAutoPlay() {
    stopAutoPlay();
    startAutoPlay();
  }

  // Initial setup
  goToSlide(0);

  // AutoPlay only when carousel is visible in viewport - never hijacks scroll
  if ('IntersectionObserver' in window && stage) {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          startAutoPlay();
        } else {
          stopAutoPlay();
        }
      });
    }, { threshold: 0.2 });
    observer.observe(stage);
  } else {
    startAutoPlay();
  }

  /* --------------------------------------------------------------------------
     3. WHATSAPP & CONTACT ACTIONS (DIRECT TO 3213146585)
     -------------------------------------------------------------------------- */
  window.openWhatsApp = function (modulo) {
    const phone = "573213146585";
    let text = "¡Hola! Vi la plataforma NoxOS y me gustaría consultar información para mi bar/restaurante.";
    if (modulo) {
      text = `¡Hola! Me interesó el módulo de ${modulo} de NoxOS y me gustaría consultar información para mi negocio.`;
    }
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  /* --------------------------------------------------------------------------
     4. LUXURY CONTACT FORM HANDLER
     -------------------------------------------------------------------------- */
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const nombreInput = document.getElementById('contact-nombre');
      const negocioInput = document.getElementById('contact-negocio');
      const ciudadInput = document.getElementById('contact-ciudad');
      const telefonoInput = document.getElementById('contact-telefono');
      const mensajeInput = document.getElementById('contact-mensaje');
      const statusEl = document.getElementById('contact-status');

      const nombre = nombreInput ? nombreInput.value.trim() : '';
      const negocio = negocioInput ? negocioInput.value.trim() : '';
      const ciudad = ciudadInput ? ciudadInput.value.trim() : '';
      const telefono = telefonoInput ? telefonoInput.value.trim() : '';
      const mensaje = mensajeInput ? mensajeInput.value.trim() : '';

      if (!nombre || !negocio || !telefono) {
        if (statusEl) {
          statusEl.textContent = 'Por favor completa tu nombre, establecimiento y teléfono.';
          statusEl.className = 'contact-status error';
        }
        return;
      }

      let waText = `¡Hola! Mi nombre es ${nombre}`;
      if (negocio) waText += ` de ${negocio}`;
      if (ciudad) waText += ` en ${ciudad}`;
      waText += `.\nMi teléfono de contacto es: ${telefono}`;
      if (mensaje) waText += `\n\nConsulta: ${mensaje}`;

      if (statusEl) {
        statusEl.textContent = '✓ Abriendo WhatsApp para enviar tu consulta...';
        statusEl.className = 'contact-status success';
      }

      const phone = "573213146585";
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(waText)}`;
      setTimeout(function () {
        window.open(url, '_blank');
      }, 350);
    });
  }

})();
