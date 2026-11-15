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
     2. WHATSAPP & DEMO ACTIONS
     -------------------------------------------------------------------------- */
  window.openWhatsApp = function (modulo) {
    const phone = "573213146585";
    let text = "¡Hola! Vi la plataforma NoxOS y me gustaría agendar una demostración en vivo para mi bar/restaurante.";
    if (modulo) {
      text = `¡Hola! Me interesó mucho el módulo de ${modulo} de NoxOS y me gustaría ver una demostración en vivo para mi negocio.`;
    }
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

})();
