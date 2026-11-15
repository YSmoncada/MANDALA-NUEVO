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
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    stars.length = 0;
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push(new Star());
    }
  }

  let lastShootingStarTime = Date.now();
  let nextShootingStarDelay = 4000;

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < stars.length; i++) {
      stars[i].update();
      stars[i].draw();
    }

    const now = Date.now();
    if (now - lastShootingStarTime > nextShootingStarDelay) {
      shootingStars.push(new ShootingStar());
      lastShootingStarTime = now;
      nextShootingStarDelay = Math.random() * 5000 + 4000;
    }

    for (let j = shootingStars.length - 1; j >= 0; j--) {
      const s = shootingStars[j];
      s.update();
      s.draw();
      if (!s.active) {
        shootingStars.splice(j, 1);
      }
    }

    requestAnimationFrame(render);
  }

  window.addEventListener('resize', resize, { passive: true });
  resize();
  requestAnimationFrame(render);


  /* --------------------------------------------------------------------------
     2. PROJECT CATALOG & VISUAL APP PREVIEWS
     -------------------------------------------------------------------------- */
  const PROJECTS = {
    noxos: {
      tag: 'Flagship v2.5',
      status: 'En producción',
      title: 'NoxOS Hospitality Core',
      pitch: 'El sistema integral concebido para bares, discotecas y gastrobars de alta demanda. Integra caja rápida con arqueo ciego, control milimétrico de comandas y roles blindados contra pérdidas.',
      capabilities: [
        { title: 'Arqueo ciego en caja', desc: 'El personal entrega el total sin conocer el esperado; el sistema audita diferencias al instante.' },
        { title: 'Trazabilidad por mesa', desc: 'Cada trago, botella y adición queda registrado con hora, mesa y mesero asignado.' },
        { title: 'Multi-medio de pago', desc: 'Soporte fluido para Efectivo, Nequi, Daviplata y Tarjetas en un solo cierre.' },
        { title: 'Seguridad blindada', desc: 'Control de turnos aislados para evitar transacciones fantasmas o descuadres.' }
      ],
      stack: ['Caja con arqueo ciego', 'Control anti-fugas', 'Multi-dispositivo táctil', 'Turnos blindados', 'Facturación inmediata'],
      screenTitle: 'Punto de Venta y Mesas (Caja)',
      screenBadge: 'En vivo, Turno activo',
      renderCanvas: function () {
        return `
          <div class="pos-stats-strip">
            <span class="pos-stat-item">Ventas Turno: <strong class="pos-stat-val" id="pos-total-val">$1.980.000</strong></span>
            <span class="pos-stat-item">Arqueo ciego: <strong style="color:var(--emerald);">0 Descuadre</strong></span>
          </div>

          <div class="pos-tables-grid">
            <div class="pos-table-card">
              <div class="pos-table-top">
                <span class="pos-table-num">Mesa 01</span>
                <span class="pos-table-badge">Ocupada</span>
              </div>
              <span class="pos-table-amount">$140.000</span>
            </div>

            <div class="pos-table-card pending" id="pos-mesa-4-card">
              <div class="pos-table-top">
                <span class="pos-table-num">Mesa 04</span>
                <span class="pos-table-badge pending" id="pos-mesa-4-badge">Pidiendo cuenta</span>
              </div>
              <span class="pos-table-amount">$85.000</span>
            </div>

            <div class="pos-table-card">
              <div class="pos-table-top">
                <span class="pos-table-num">Mesa 07</span>
                <span class="pos-table-badge">Libre</span>
              </div>
              <span class="pos-table-amount">$0</span>
            </div>

            <div class="pos-table-card">
              <div class="pos-table-top">
                <span class="pos-table-num">Mesa 12</span>
                <span class="pos-table-badge">VIP Lounge</span>
              </div>
              <span class="pos-table-amount">$320.000</span>
            </div>
          </div>
        `;
      },
      actionLabel: 'Simular cobro Mesa 04',
      actionHandler: function () {
        const card = document.getElementById('pos-mesa-4-card');
        const badge = document.getElementById('pos-mesa-4-badge');
        const totalVal = document.getElementById('pos-total-val');
        if (card && badge && totalVal) {
          card.classList.remove('pending');
          card.classList.add('paid');
          badge.classList.remove('pending');
          badge.classList.add('paid');
          badge.textContent = 'Cobrada con Nequi';
          totalVal.textContent = '$2.065.000';
          const hint = document.getElementById('interactive-hint');
          if (hint) hint.textContent = 'Mesa 04 cobrada con éxito, inventario descontado y dinero conciliado.';
        }
      }
    },

    client_qr: {
      tag: 'Experiencia digital',
      status: 'PWA Web Responsive',
      title: 'Mandala Starlight QR Patrons',
      pitch: 'Carta digital inmersiva para los comensales. Los clientes escanean el código QR en su mesa y entran a una experiencia de lujo con cielo Rolls-Royce para pedir tragos y solicitar la cuenta sin demoras.',
      capabilities: [
        { title: 'Cero descargas', desc: 'Carga instantánea en cualquier smartphone sin instalar apps desde la tienda.' },
        { title: 'Carrito táctil', desc: 'Selección de licores, cócteles de autor y cervezas con resumen en tiempo real.' },
        { title: 'Despacho directo', desc: 'El pedido se envía directamente a la pantalla del bartender sin intermediarios.' },
        { title: 'Botón pedir cuenta', desc: 'Notifica a caja y mesero de forma discreta eliminando señas y esperas.' }
      ],
      stack: ['Sin descargar apps', 'Carta QR Starlight', 'Carrito en tiempo real', 'Botón pedir cuenta', 'Soporte móvil universal'],
      screenTitle: 'Menú Digital del Cliente (Móvil)',
      screenBadge: 'Mesa 04 conectada',
      renderCanvas: function () {
        return `
          <div class="qr-menu-header">
            <span class="qr-table-indicator">Mesa 04, Carta Starlight</span>
            <span style="font-size:11px; color:var(--text-muted);">Pedidos directos</span>
          </div>

          <div class="qr-product-row">
            <img src="./assets/aguardiente-amarillo.png" alt="Aguardiente Amarillo" class="qr-prod-thumb" onerror="this.style.display='none'">
            <div class="qr-prod-details">
              <div class="qr-prod-name">Aguardiente Amarillo (750ml)</div>
              <div class="qr-prod-price">$120.000 COP</div>
            </div>
            <button class="qr-add-btn" onclick="this.textContent='Agregado ✓'">+ Agregar</button>
          </div>

          <div class="qr-product-row">
            <img src="./assets/buchanas.png" alt="Buchanans" class="qr-prod-thumb" onerror="this.style.display='none'">
            <div class="qr-prod-details">
              <div class="qr-prod-name">Buchanan's 12 Años</div>
              <div class="qr-prod-price">$190.000 COP</div>
            </div>
            <button class="qr-add-btn" onclick="this.textContent='Agregado ✓'">+ Agregar</button>
          </div>

          <div class="qr-cart-summary-bar" id="qr-cart-bar">
            <div>
              <span style="font-size:11px; color:var(--text-muted); display:block;">Consumo en mesa:</span>
              <span class="qr-cart-total">$134.000 COP</span>
            </div>
            <span style="font-size:12px; font-weight:700; color:var(--emerald);">2 productos</span>
          </div>
        `;
      },
      actionLabel: 'Pedir cuenta desde el móvil',
      actionHandler: function () {
        const bar = document.getElementById('qr-cart-bar');
        const hint = document.getElementById('interactive-hint');
        if (bar) {
          bar.style.borderColor = 'var(--emerald)';
          bar.innerHTML = `
            <span style="color:var(--emerald); font-weight:700; font-size:13px;">Cuenta solicitada a caja</span>
            <span style="font-size:11px; color:var(--text-secondary);">Mesero en camino</span>
          `;
        }
        if (hint) {
          hint.textContent = 'Notificación enviada en 20ms a la tablet de caja sin tener que esperar.';
        }
      }
    },

    kds: {
      tag: 'Operación en barra',
      status: 'Touch Radar KDS',
      title: 'Bartender Touch Radar',
      pitch: 'Pantalla táctil para barra que convierte la preparación de pedidos en una línea de montaje perfecta. Cronómetro visual, priorización de tragos y confirmación de despacho en 1 toque.',
      capabilities: [
        { title: 'Semáforo de tiempos', desc: 'Alerta visual si un trago supera los 3 minutos de espera en barra.' },
        { title: 'Despacho en 1 toque', desc: 'El bartender marca "Listo" y notifica automáticamente al mesero.' },
        { title: 'Agrupación de comandas', desc: 'Visualiza qué mesa ordenó, qué mesero atiende y solicitudes especiales.' },
        { title: 'Cero papeles', desc: 'Elimina por completo las comandas impresas que se mojan o se pierden.' }
      ],
      stack: ['Pantalla táctil de barra', 'Semáforo de espera', 'Despacho en 1 toque', 'Cero comandas de papel', 'Control por bartender'],
      screenTitle: 'Radar Táctil de Barra (KDS)',
      screenBadge: '2 comandas en cola',
      renderCanvas: function () {
        return `
          <div class="kds-tickets-container">
            <div class="kds-ticket-card" id="kds-ticket-1">
              <div class="kds-ticket-info">
                <div class="kds-ticket-head">
                  <span class="kds-ticket-mesa">Mesa 04 (Comanda #104)</span>
                  <span class="kds-ticket-timer" id="kds-timer-1">01:45</span>
                </div>
                <div class="kds-ticket-items">2x Gin Tonic artesanal, 1x Corona Extra</div>
              </div>
              <span class="badge-tag" style="background:var(--emerald-dim); color:var(--emerald);">Preparando</span>
            </div>

            <div class="kds-ticket-card urgent">
              <div class="kds-ticket-info">
                <div class="kds-ticket-head">
                  <span class="kds-ticket-mesa">Mesa 12 (VIP Lounge)</span>
                  <span class="kds-ticket-timer urgent">03:20</span>
                </div>
                <div class="kds-ticket-items">1x Buchanan's 12 Años, Hielo y sodas</div>
              </div>
              <span class="badge-tag" style="background:var(--amber-dim); color:var(--amber); border-color:var(--amber-border);">Prioritario</span>
            </div>
          </div>
        `;
      },
      actionLabel: 'Despachar comanda Mesa 04',
      actionHandler: function () {
        const ticket = document.getElementById('kds-ticket-1');
        const hint = document.getElementById('interactive-hint');
        if (ticket) {
          ticket.style.opacity = '0.4';
          ticket.style.borderColor = 'var(--emerald)';
          ticket.innerHTML = `
            <div class="kds-ticket-info">
              <span class="kds-ticket-mesa" style="color:var(--emerald);">Mesa 04, Despachada con éxito</span>
              <span style="font-size:11px; color:var(--text-muted);">Tiempo total: 1m 45s</span>
            </div>
            <span class="badge-tag" style="background:var(--emerald); color:#000; font-weight:700;">Listo</span>
          `;
        }
        if (hint) {
          hint.textContent = 'Comanda despachada al mesero en menos de 2 minutos.';
        }
      }
    },

    kardex: {
      tag: 'Seguridad e inventario',
      status: 'Sentinel Engine',
      title: 'Kardex Liquor Sentinel',
      pitch: 'Motor de control de existencias y recetas. Cada vez que se factura o despacha un trago, botella o cóctel, el Kardex descuenta los mililitros exactos de licor en tiempo real.',
      capabilities: [
        { title: 'Deducción automatizada', desc: 'Cero digitación manual: la venta resta inmediatamente del stock del bar.' },
        { title: 'Auditoría anti-fugas', desc: 'Detección automática de discrepancias entre inventario físico y ventas.' },
        { title: 'Alertas de stock crítico', desc: 'Avisos antes de que se agoten las botellas de mayor rotación.' },
        { title: 'Cálculo de rentabilidad', desc: 'Análisis del costo por trago versus precio de venta para maximizar utilidad.' }
      ],
      stack: ['Deducción automática por trago', 'Alertas de botellas críticas', 'Auditoría anti-robo', 'Cálculo de margen y utilidad'],
      screenTitle: 'Auditoría de Botellas e Inventario',
      screenBadge: 'Conciliación al 100%',
      renderCanvas: function () {
        return `
          <div class="kardex-stock-list">
            <div class="kardex-row">
              <div class="kardex-row-top">
                <span class="kardex-prod-title">Buchanan's 12 Años (750ml)</span>
                <span class="kardex-prod-qty" id="kardex-buchanans-qty">14 botellas (82%)</span>
              </div>
              <div class="kardex-track">
                <div class="kardex-fill" id="kardex-buchanans-fill" style="width: 82%;"></div>
              </div>
            </div>

            <div class="kardex-row">
              <div class="kardex-row-top">
                <span class="kardex-prod-title">Aguardiente Amarillo (750ml)</span>
                <span class="kardex-prod-qty">28 botellas (90%)</span>
              </div>
              <div class="kardex-track">
                <div class="kardex-fill" style="width: 90%;"></div>
              </div>
            </div>

            <div class="kardex-row">
              <div class="kardex-row-top">
                <span class="kardex-prod-title">Cerveza Corona Extra (355ml)</span>
                <span class="kardex-prod-qty" style="color:var(--rose);">8 unidades (18%)</span>
              </div>
              <div class="kardex-track">
                <div class="kardex-fill warning" style="width: 18%;"></div>
              </div>
            </div>
          </div>
        `;
      },
      actionLabel: 'Simular venta de 1 Buchanan',
      actionHandler: function () {
        const qty = document.getElementById('kardex-buchanans-qty');
        const fill = document.getElementById('kardex-buchanans-fill');
        const hint = document.getElementById('interactive-hint');
        if (qty && fill) {
          qty.textContent = '13 botellas (76%)';
          qty.style.color = 'var(--emerald)';
          fill.style.width = '76%';
        }
        if (hint) {
          hint.textContent = 'Venta POS registrada: -1 botella de Buchanan descontada al instante en el Kardex.';
        }
      }
    }
  };

  // DOM Elements
  const tabButtons = document.querySelectorAll('.cockpit-tab-btn');
  const badgeTag = document.getElementById('project-badge-tag');
  const badgeStatus = document.getElementById('project-badge-status');
  const projectTitle = document.getElementById('project-title');
  const projectPitch = document.getElementById('project-pitch');
  const capabilitiesList = document.getElementById('capabilities-list');
  const stackList = document.getElementById('stack-list');

  // Visual Mockup Elements
  const mockupScreenTitle = document.getElementById('mockup-screen-title');
  const mockupScreenBadge = document.getElementById('mockup-screen-badge');
  const mockupCanvas = document.getElementById('mockup-canvas');
  const mockupActionContainer = document.getElementById('mockup-action-container');
  const interactiveHint = document.getElementById('interactive-hint');

  let currentProjectKey = 'noxos';

  function renderProject(key) {
    const p = PROJECTS[key];
    if (!p) return;
    currentProjectKey = key;

    badgeTag.textContent = p.tag;
    badgeStatus.textContent = p.status;
    projectTitle.textContent = p.title;
    projectPitch.textContent = p.pitch;

    // Render capabilities
    capabilitiesList.innerHTML = p.capabilities.map(c => `
      <div class="capability-item">
        <div class="capability-title">${c.title}</div>
        <div class="capability-desc">${c.desc}</div>
      </div>
    `).join('');

    // Render stack
    stackList.innerHTML = p.stack.map(s => `
      <span class="stack-pill">${s}</span>
    `).join('');

    // Render Visual Mockup
    mockupScreenTitle.textContent = p.screenTitle;
    mockupScreenBadge.textContent = p.screenBadge;
    mockupCanvas.innerHTML = p.renderCanvas();

    if (interactiveHint) {
      interactiveHint.textContent = 'Toca la acción para ver cómo responde el sistema:';
    }

    mockupActionContainer.innerHTML = `
      <button class="interactive-action-btn" id="interactive-btn-trigger">
        ${p.actionLabel}
      </button>
    `;

    const btnTrigger = document.getElementById('interactive-btn-trigger');
    if (btnTrigger) {
      btnTrigger.addEventListener('click', function () {
        p.actionHandler();
        this.classList.add('success');
      });
    }
  }

  // Switch tabs
  tabButtons.forEach(btn => {
    btn.addEventListener('click', function () {
      tabButtons.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const targetKey = this.getAttribute('data-project');
      renderProject(targetKey);
    });
  });

  // Initial render
  renderProject('noxos');

  /* --------------------------------------------------------------------------
     3. WHATSAPP & DEMO ACTIONS
     -------------------------------------------------------------------------- */
  window.openWhatsApp = function () {
    const phone = "573213146585";
    const msg = encodeURIComponent("¡Hola! Vi la plataforma NoxOS y me gustaría agendar una demostración en vivo para mi negocio.");
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

})();
