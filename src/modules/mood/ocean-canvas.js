/** Moteur océan Canvas — Gerstner + soliton (transplanté depuis maquette M11). */

const WAVE_TABLE = [
  [320, 3.8, 0.5, 0],
  [150, 2, 1.1, 2.1],
  [72, 1, 1.8, 4]
];

const SOLITON_DEFAULTS = { x: -150, v: 0.4, amp: 18, sigma: 95, k: 0.048, q: 0.65 };
const GESTURE_MS = { rise: 220, hold: 1200, fall: 500 };

function easeOutCubic(x) {
  return 1 - (1 - x) ** 3;
}

function readCssVar(name, root = document.documentElement) {
  return getComputedStyle(root).getPropertyValue(name).trim();
}

/**
 * @param {HTMLElement} stageEl
 * @param {HTMLCanvasElement} canvasEl
 * @param {{ onSaveGestureEnd?: () => void }} [options]
 */
function createOceanCanvas(stageEl, canvasEl, options = {}) {
  const ctx = canvasEl.getContext('2d');
  const pointCount = 78;
  const points = new Float32Array(pointCount * 2);
  const soliton = { ...SOLITON_DEFAULTS, on: false, hit: false };
  const drops = [];
  const maxDrops = 70;

  let width = 0;
  let height = 0;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  let baseAmpMul = 1;

  let gestureRunning = false;
  let gestureStart = 0;
  let lastFrame = 0;
  let idleRaf = null;
  let gestureRaf = null;
  let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let destroyed = false;

  const onResize = () => resize();
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const onMotionChange = (event) => {
    reducedMotion = event.matches;
    if (reducedMotion) {
      cancelAnimationFrame(idleRaf);
      renderIdleFrame();
    } else {
      startIdle();
    }
  };

  function resize() {
    if (!stageEl || destroyed) return;
    width = stageEl.clientWidth;
    height = stageEl.clientHeight;
    canvasEl.width = width * dpr;
    canvasEl.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function computeGeometry(timeSec, lift) {
    const waterLevel = height * 0.6;
    const buffer = 70;
    const step = (width + buffer * 2) / (pointCount - 1);
    const solitonX = soliton.x;
    const solitonAmp = lift * soliton.amp;
    const sigmaWidth = 2 * soliton.sigma * soliton.sigma;

    for (let i = 0; i < pointCount; i += 1) {
      const x0 = -buffer + step * i;
      let x = x0;
      let y = waterLevel;

      for (let j = 0; j < 3; j += 1) {
        const layer = WAVE_TABLE[j];
        const k = (2 * Math.PI) / layer[0];
        const theta = k * x0 - timeSec * layer[2] + layer[3];
        const amp = layer[1] * baseAmpMul;
        x -= Math.sin(theta) * amp;
        y += Math.cos(theta) * amp;
      }

      if (lift > 0) {
        const d = x0 - solitonX;
        const gauss = Math.exp((-d * d) / sigmaWidth);
        const phase = soliton.k * d;
        y -= gauss * solitonAmp * Math.cos(phase);
        x += gauss * solitonAmp * soliton.q * Math.sin(phase);
        if (d < -15) {
          const wake = Math.exp(d / 40);
          y -= wake * 2.2 * lift * Math.sin(-d * 0.12);
        }
      }

      points[i * 2] = x;
      points[i * 2 + 1] = y;
    }
  }

  function drawGlint() {
    const waterLevel = height * 0.6;
    const centerX = width * 0.5;
    const sun = readCssVar('--sun', stageEl) || readCssVar('--sun');
    const now = performance.now() / 1000;
    const bottom = height * 0.99;
    const rows = 14;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < rows; i += 1) {
      const frac = i / (rows - 1);
      const y = waterLevel + (bottom - waterLevel) * frac;
      const spread = 8 + frac * 46;
      const flicker = 0.45 + 0.55 * Math.abs(Math.sin(now * 2.2 + i * 1.7));
      const alpha = (0.18 * (1 - frac) + 0.05) * flicker;
      const touches = 1 + (i % 3 === 0 ? 2 : 1);

      for (let tk = 0; tk < touches; tk += 1) {
        const wobble = Math.sin(now * 1.6 + i * 0.9 + tk * 2.1) * spread * 0.5;
        const tw = spread * (0.35 + Math.random() * 0.3);
        const tx = centerX + wobble - tw / 2;
        const th = 2 + frac * 2;
        ctx.globalAlpha = alpha * (0.7 + Math.random() * 0.3);
        ctx.fillStyle = sun;
        ctx.beginPath();
        ctx.ellipse(tx + tw / 2, y, tw / 2, th / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawWater() {
    const colors = [
      [16, readCssVar('--w1', stageEl) || readCssVar('--w1')],
      [8, readCssVar('--w2', stageEl) || readCssVar('--w2')],
      [0, readCssVar('--w3', stageEl) || readCssVar('--w3')]
    ];
    const foam = readCssVar('--foam', stageEl) || readCssVar('--foam');
    const crest = readCssVar('--crest', stageEl) || readCssVar('--crest');

    for (const [dy, col] of colors) {
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(points[0], points[1] + dy);
      for (let i = 1; i < pointCount; i += 1) {
        const px = points[(i - 1) * 2];
        const py = points[(i - 1) * 2 + 1];
        const x = points[i * 2];
        const y = points[i * 2 + 1];
        ctx.quadraticCurveTo(px, py + dy, (px + x) / 2, (py + y) / 2 + dy);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fillStyle = col;
      ctx.fill();
    }

    drawGlint();

    ctx.beginPath();
    ctx.moveTo(points[0], points[1]);
    for (let i = 1; i < pointCount; i += 1) {
      const px = points[(i - 1) * 2];
      const py = points[(i - 1) * 2 + 1];
      const x = points[i * 2];
      const y = points[i * 2 + 1];
      ctx.quadraticCurveTo(px, py, (px + x) / 2, (py + y) / 2);
    }
    ctx.strokeStyle = foam;
    ctx.lineWidth = 1.3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = crest;
    ctx.shadowBlur = 3;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function burst(x, y, count) {
    for (let i = 0; i < count; i += 1) {
      if (drops.length >= maxDrops) drops.shift();
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.8;
      const speed = 1.5 + Math.random() * 3.5;
      drops.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 1.1 + Math.random() * 1.6,
        life: 1
      });
    }
  }

  function stepDrops(dt) {
    const dtNorm = dt / 16.67;
    const gravity = 0.14 * dtNorm;
    const waterLevel = height * 0.6;
    const foam = readCssVar('--foam', stageEl) || readCssVar('--foam');

    for (let i = drops.length - 1; i >= 0; i -= 1) {
      const drop = drops[i];
      drop.vy += gravity;
      drop.vx *= 0.985;
      drop.x += drop.vx * dtNorm;
      drop.y += drop.vy * dtNorm;
      drop.life -= 0.012 * dtNorm;

      if (drop.y >= waterLevel - 1 && drop.vy > 0) {
        drop.y = waterLevel - 1;
        drop.vy *= -0.38;
        drop.vx *= 0.5;
        if (Math.abs(drop.vy) < 0.5) {
          drops.splice(i, 1);
          continue;
        }
      }
      if (drop.life <= 0 || drop.y > height + 20) drops.splice(i, 1);
    }

    ctx.fillStyle = foam;
    for (const drop of drops) {
      ctx.globalAlpha = Math.min(1, drop.life * 1.3);
      ctx.beginPath();
      ctx.arc(drop.x, drop.y, drop.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function paintFrame(timeMs, lift) {
    computeGeometry(timeMs / 1000, lift);
    ctx.clearRect(0, 0, width, height);
    drawWater();
    stepDrops(16.67);
  }

  function idleLoop(timeMs) {
    if (reducedMotion || destroyed) return;
    paintFrame(timeMs, 0);
    idleRaf = requestAnimationFrame(idleLoop);
  }

  function startIdle() {
    cancelAnimationFrame(idleRaf);
    if (reducedMotion || destroyed) {
      renderIdleFrame();
      return;
    }
    idleRaf = requestAnimationFrame(idleLoop);
  }

  function renderIdleFrame() {
    resize();
    paintFrame(performance.now(), 0);
  }

  function gestureLoop(timeMs) {
    if (!lastFrame) lastFrame = timeMs;
    const dt = Math.min(32, timeMs - lastFrame);
    lastFrame = timeMs;

    const elapsed = timeMs - gestureStart;
    const { rise, hold, fall } = GESTURE_MS;
    const total = rise + hold + fall;
    let lift = 0;

    if (elapsed < rise) lift = easeOutCubic(elapsed / rise);
    else if (elapsed < rise + hold) lift = 1;
    else if (elapsed < total) lift = 1 - easeOutCubic((elapsed - rise - hold) / fall);
    else {
      gestureRunning = false;
      soliton.on = false;
      options.onSaveGestureEnd?.();
    }

    if (soliton.on) {
      soliton.x += soliton.v * dt;
      if (!soliton.hit && soliton.x >= width - 5) {
        soliton.hit = true;
        soliton.on = false;
        const splashY = height * 0.6 - 2;
        burst(width - 3, splashY, 18);
        window.setTimeout(() => burst(width - 3 - Math.random() * 20, splashY, 7), 120);
        window.setTimeout(() => burst(width - 3 - Math.random() * 20, splashY, 5), 250);
      }
    }

    paintFrame(timeMs, lift);

    if (gestureRunning || drops.length) {
      gestureRaf = requestAnimationFrame(gestureLoop);
    } else {
      lastFrame = 0;
      startIdle();
    }
  }

  function setEnergyMultiplier(energyValue) {
    baseAmpMul = 0.4 + (energyValue - 1) * 0.35;
  }

  function playSaveAnimation() {
    if (reducedMotion) {
      renderIdleFrame();
      options.onSaveGestureEnd?.();
      return;
    }

    cancelAnimationFrame(idleRaf);
    Object.assign(soliton, SOLITON_DEFAULTS, { on: true, hit: false });
    drops.length = 0;
    gestureStart = performance.now();
    lastFrame = 0;
    gestureRunning = true;
    gestureRaf = requestAnimationFrame(gestureLoop);
  }

  function start() {
    window.addEventListener('resize', onResize);
    motionQuery.addEventListener('change', onMotionChange);
    resize();
    startIdle();
  }

  function destroy() {
    destroyed = true;
    cancelAnimationFrame(idleRaf);
    cancelAnimationFrame(gestureRaf);
    window.removeEventListener('resize', onResize);
    motionQuery.removeEventListener('change', onMotionChange);
    drops.length = 0;
  }

  return {
    setEnergyMultiplier,
    playSaveAnimation,
    start,
    destroy,
    renderIdleFrame
  };
}

export { createOceanCanvas, easeOutCubic, energyToAmpMultiplier };

function energyToAmpMultiplier(energyValue) {
  return 0.4 + (energyValue - 1) * 0.35;
}
