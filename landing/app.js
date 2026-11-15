/* ==========================================================================
   ROLLS-ROYCE STARLIGHT ENGINE & SHOWCASE CONTROLLER
   Hallmark anti-slop interactive cockpit
   ========================================================================== */

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

  // Star catalog
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
      // 90% Pure fiber-optic white, 10% Rolls-Royce diamond-blue tint
      this.isDiamond = Math.random() > 0.88;
    }

    update() {
      this.phase += this.twinkleSpeed;
      // Sinusoidal flicker like real optical fibers
      const flicker = (Math.sin(this.phase) + 1) / 2;
      this.alpha = this.baseAlpha * 0.3 + flicker * (this.baseAlpha * 0.7);
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.isDiamond
        ? `rgba(215, 235, 255, ${this.alpha})`
        : `rgba(255, 255, 255, ${this.alpha})`;
      ctx.fill();

      // Subtle glow halo for larger fiber optics
      if (this.radius > 1.0 * dpr && this.alpha > 0.55) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha * 0.12})`;
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
      this.angle = (Math.random() * 20 + 25) * (Math.PI / 180); // Diagonal descent
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
      grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      grad.addColorStop(0.8, `rgba(255, 255, 255, ${this.opacity * 0.6})`);
      grad.addColorStop(1, `rgba(255, 255, 255, ${this.opacity})`);

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

    // Update & draw fiber optic stars
    for (let i = 0; i < stars.length; i++) {
      stars[i].update();
      stars[i].draw();
    }

    // Handle occasional shooting star (every 4-9 seconds)
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
     2. PROJECT CATALOG & COCKPIT CONTROLLER
     -------------------------------------------------------------------------- */
  const PROJECTS = {
    noxos: {
      tag: 'FLAGSHIP • V2.5',
      status: 'En Producción',
      title: 'NoxOS Hospitality Core',
      pitch: 'El sistema integral concebido para bares, discotecas y gastrobars de alta demanda. Integra caja rápida con arqueo ciego, control milimétrico de comandas y roles blindados contra pérdidas.',
      capabilities: [
        { title: 'Arqueo Ciego en Caja', desc: 'El personal entrega el total sin conocer el esperado; el sistema audita diferencias al instante.' },
        { title: 'Trazabilidad por Mesa', desc: 'Cada trago, botella y adición queda registrado con hora, mesa y mesero asignado.' },
        { title: 'Multi-Medio de Pago', desc: 'Soporte fluido para Efectivo, Nequi, Daviplata y Tarjetas en un solo cierre.' },
        { title: 'Seguridad JWT Blindada', desc: 'Tokens seguros y control de turnos aislados para evitar transacciones fantasmas.' }
      ],
      stack: ['Caja con arqueo ciego', 'Control anti-fugas', 'Multi-dispositivo táctil', 'Turnos blindados', 'Facturación inmediata'],
      simModuleName: 'NOXOS / CENTRO DE CONTROL',
      simInitialLog: [
        '[TURNO ACTIVO] Iniciado a las 19:00 hrs por admin',
        '[MESAS ABIERTAS] 12 mesas en consumo simultáneo',
        '[ESTADO DE CAJA] Arqueo ciego configurado — $0 descuadre',
        'Listo para procesar comanda de alta velocidad...'
      ],
      simActions: [
        { label: 'Simular Comanda Mesa 4', action: 'comanda' },
        { label: 'Cierre y Facturación', action: 'cierre' }
      ]
    },

    client_qr: {
      tag: 'EXPERIENCIA DIGITAL',
      status: 'PWA Web Responsive',
      title: 'Mandala Starlight QR Patrons',
      pitch: 'Carta digital inmersiva para los comensales. Los clientes escanean el código QR en su mesa y entran a una experiencia de lujo con cielo Rolls-Royce para pedir tragos y solicitar la cuenta sin demoras.',
      capabilities: [
        { title: 'Cero Fricción (Sin Descargas)', desc: 'Carga instantánea en cualquier smartphone sin instalar apps desde la tienda.' },
        { title: 'Carrito Táctil Inteligente', desc: 'Selección de licores, cócteles de autor y cervezas con resumen en tiempo real.' },
        { title: 'Despacho Directo a Barra', desc: 'El pedido se envía directamente al KDS del bartender sin intermediarios.' },
        { title: 'Botón Pedir Cuenta', desc: 'Notifica a caja y mesero de forma discreta eliminando señas y esperas.' }
      ],
      stack: ['Sin descargar apps', 'Carta QR Starlight', 'Carrito en tiempo real', 'Botón pedir cuenta', 'Soporte móvil universal'],
      simModuleName: 'CLIENTE QR / MESA 04',
      simInitialLog: [
        '[CÓDIGO QR ESCANEADO] Mesa 04 conectada a Mandala Web',
        '[CATÁLOGO CARGADO] 24 productos en cócteles y licores',
        '[CARRITO VACÍO] Esperando selección del cliente...',
        'Toca el botón abajo para agregar un trago premium.'
      ],
      simActions: [
        { label: '+ Agregar 2x Gin Tonic', action: 'add_drink' },
        { label: 'Pedir Cuenta en Mesa', action: 'pedir_cuenta' }
      ]
    },

    kds: {
      tag: 'OPERACIÓN EN BARRA',
      status: 'Touch Radar KDS',
      title: 'Bartender Touch Radar',
      pitch: 'Pantalla táctil para barra que convierte la preparación de pedidos en una línea de montaje perfecta. Cronómetro visual, priorización de tragos y confirmación de despacho en 1 toque.',
      capabilities: [
        { title: 'Semáforo de Tiempos', desc: 'Alerta visual si un trago supera los 3 minutos de espera en barra.' },
        { title: 'Despacho en 1 Toque', desc: 'El bartender marca "Listo" y notifica automáticamente al mesero.' },
        { title: 'Agrupación de Comandas', desc: 'Visualiza qué mesa ordenó, qué mesero atiende y solicitudes especiales.' },
        { title: 'Historial Inmutable', desc: 'Registro exacto de qué bartender despachó cada cóctel y a qué hora.' }
      ],
      stack: ['Pantalla táctil de barra', 'Semáforo de espera', 'Despacho en 1 toque', 'Cero comandas de papel', 'Control por bartender'],
      simModuleName: 'BARRA PRINCIPAL / RADAR KDS',
      simInitialLog: [
        '[ESTACIÓN ACTIVA] Bartender principal autenticado',
        '[COLA DE COMANDAS] 3 pedidos en preparación activa',
        '[TIEMPO PROMEDIO] 2.1 minutos por despacho en barra',
        'Selecciona una acción para simular despacho...'
      ],
      simActions: [
        { label: 'Despachar Cóctel Listo', action: 'dispatch_kds' },
        { label: 'Nueva Orden Entrante', action: 'order_kds' }
      ]
    },

    kardex: {
      tag: 'SEGURIDAD & INVENTARIO',
      status: 'Sentinel Engine',
      title: 'Kardex Liquor Sentinel',
      pitch: 'Motor de control de existencias y recetas. Cada vez que se factura o despacha un trago, botella o cóctel, el Kardex descuenta los mililitros exactos de licor en tiempo real.',
      capabilities: [
        { title: 'Deducción Automatizada', desc: 'Cero digitación manual: la venta resta inmediatamente del stock del bar.' },
        { title: 'Auditoría Anti-Fugas', desc: 'Detección automática de discrepancias entre inventario físico y ventas.' },
        { title: 'Alertas de Stock Crítico', desc: 'Avisos antes de que se agoten las botellas de mayor rotación.' },
        { title: 'Cálculo de Margen Neto', desc: 'Análisis del costo por trago vs precio de venta para maximizar utilidad.' }
      ],
      stack: ['Deducción automática por trago', 'Alertas de botellas críticas', 'Auditoría anti-robo', 'Cálculo de margen y utilidad'],
      simModuleName: 'KARDEX / SENTINEL AUDIT',
      simInitialLog: [
        '[INVENTARIO SINCRONIZADO] 84 referencias auditadas en bodega',
        '[BOTES DE BARRIL] Corona: 48 uds | Buchanans: 12 bots',
        '[ÚLTIMO MOVIMIENTO] Venta POS #1042 (-1 Buchanan 750ml)',
        'Ejecuta una prueba para verificar la deducción en vivo.'
      ],
      simActions: [
        { label: 'Simular Venta y Deducción', action: 'kardex_deduct' },
        { label: 'Revisar Margen de Trago', action: 'kardex_margin' }
      ]
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

  // Simulator Elements
  const simModuleName = document.getElementById('sim-module-name');
  const simLogArea = document.getElementById('sim-log-area');
  const simActionsRow = document.getElementById('sim-actions-row');

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

    // Render Simulator initial state
    simModuleName.textContent = p.simModuleName;
    renderLogs(p.simInitialLog);

    // Render Simulator Buttons
    simActionsRow.innerHTML = p.simActions.map((act, idx) => `
      <button class="sim-btn ${idx === 0 ? 'primary' : ''}" data-action="${act.action}">
        ${act.label}
      </button>
    `).join('');

    attachSimListeners();
  }

  function renderLogs(lines) {
    simLogArea.innerHTML = lines.map(line => {
      const isOk = line.includes('OK') || line.includes('LISTO') || line.includes('DESPACHADO');
      return `<div style="margin-bottom: 5px; ${isOk ? 'color: var(--emerald); font-weight: 700;' : ''}">${line}</div>`;
    }).join('');
  }

  function attachSimListeners() {
    const simBtns = simActionsRow.querySelectorAll('.sim-btn');
    simBtns.forEach(btn => {
      btn.addEventListener('click', function () {
        const action = this.getAttribute('data-action');
        handleSimAction(action);
      });
    });
  }

  function handleSimAction(action) {
    const timeStr = new Date().toLocaleTimeString();

    if (action === 'comanda') {
      renderLogs([
        `[${timeStr}] 🟢 NUEVA COMANDA REGISTRADA EN MESA 04`,
        '• 2x Gin Tonic Artesanal ($56.000)',
        '• 1x Cerveza Corona ($14.000)',
        '• Total Comanda: $70.000',
        '⚡ Notificación enviada a Bartender en 18ms.'
      ]);
    } else if (action === 'cierre') {
      renderLogs([
        `[${timeStr}] 💳 CIERRE DE MESA 04`,
        '• Pago recibido vía Nequi / Daviplata',
        '• Factura electrónica #F-1049 emitida',
        '• Inventario conciliado automáticamente',
        '✨ Mesa 04 liberada para nuevos clientes.'
      ]);
    } else if (action === 'add_drink') {
      renderLogs([
        `[${timeStr}] 🛒 CARRITO ACTUALIZADO (CLIENTE QR)`,
        '• + 2x Gin Tonic agregado al pedido de la mesa',
        '• Subtotal: $56.000 COP',
        '• Tiempo estimado de preparación: 3 min',
        '👉 Pulsa "Pedir Cuenta" para simular solicitud.'
      ]);
    } else if (action === 'pedir_cuenta') {
      renderLogs([
        `[${timeStr}] 🔔 CUENTA SOLICITADA DESDE LA MESA`,
        '• Notificación discreta enviada a la tablet de caja',
        '• Estado de la mesa cambiado a: "Pidiendo Cuenta"',
        '• Sin necesidad de llamar o esperar al mesero.',
        '✅ Solicitud confirmada al comensal.'
      ]);
    } else if (action === 'dispatch_kds') {
      renderLogs([
        `[${timeStr}] 🍸 TRAGO DESPACHADO EN BARRA`,
        '• Mesa 04: Gin Tonic (Preparado en 1m 45s)',
        '• Bartender: Carlos M. (Barra Principal)',
        '• Kardex: -120ml Gin Bombay deducido',
        '⚡ Pedido marcado como ENTREGADO.'
      ]);
    } else if (action === 'order_kds') {
      renderLogs([
        `[${timeStr}] ⚡ NUEVA ORDEN RECIBIDA EN RADAR`,
        '• Mesa 12: 1x Botella Buchanan 12 Años',
        '• Prioridad: ALTA (VIP Lounge)',
        '• Cronómetro iniciado: 00:00',
        '🔔 Timbre sonoro ejecutado en barra.'
      ]);
    } else if (action === 'kardex_deduct') {
      renderLogs([
        `[${timeStr}] 📊 AUDITORÍA DE MOVIMIENTO KARDEX`,
        '• Movimiento: VENTA_POS_DIRECTA',
        '• Referencia: Botella Buchanan 750ml',
        '• Stock anterior: 14 uds | Stock actual: 13 uds',
        '✅ Registro inmutable almacenado en base de datos.'
      ]);
    } else if (action === 'kardex_margin') {
      renderLogs([
        `[${timeStr}] 📈 INTELIGENCIA DE RENTABILIDAD`,
        '• Producto: Gin Tonic Signature',
        '• Costo de ingredientes (receta): $7.200 COP',
        '• Precio de venta en carta: $28.000 COP',
        '• Margen bruto: 74.2% de rentabilidad.'
      ]);
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

