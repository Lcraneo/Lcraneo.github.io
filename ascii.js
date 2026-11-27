(() => {
  const canvas = document.getElementById("ascii-hero");
  if (!canvas) return;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const glyphs = " .,:-=+*x#%@";
  const stars = [];
  const pulses = [];
  let width = 0, height = 0, dpr = 1, raf = 0, lastFrame = 0, visible = true;
  let pointerX = 0, pointerY = 0, targetX = 0, targetY = 0;
  let dragRotation = 0, dragging = false, lastPointerX = 0;

  // Deterministic random field keeps the star map stable between frames.
  let seed = 928371;
  function random() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  function wrapAngle(value) {
    while (value > Math.PI) value -= Math.PI * 2;
    while (value < -Math.PI) value += Math.PI * 2;
    return value;
  }
  function hash(x, y) {
    const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return n - Math.floor(n);
  }
  for (let i = 0; i < 270; i++) {
    stars.push({
      x: random(), y: random(), size: random() > .94 ? 1.8 : .65 + random() * .7,
      phase: random() * Math.PI * 2, speed: .35 + random() * .9,
      bright: random() > .88
    });
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    width = rect.width;
    height = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lastFrame = 0;
    if (reducedMotion) render(0);
  }

  function drawStars(time) {
    ctx.save();
    ctx.font = '9px "DM Mono", monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i < stars.length; i++) {
      const star = stars[i];
      const twinkle = .18 + .48 * (.5 + .5 * Math.sin(time * .0007 * star.speed + star.phase));
      const x = star.x * width + pointerX * (star.x - .5) * 12;
      const y = star.y * height + pointerY * (star.y - .5) * 9;
      if (star.bright) {
        ctx.globalAlpha = twinkle * .82;
        ctx.fillStyle = "#f4f1e9";
        ctx.fillText(i % 3 === 0 ? "+" : ".", x, y);
      } else {
        ctx.globalAlpha = twinkle * .48;
        ctx.fillStyle = "#bfc0c2";
        ctx.fillRect(x, y, star.size, star.size);
      }
    }
    ctx.restore();
  }

  function drawGalaxy(time) {
    const mobile = width < 430;
    const cellW = mobile ? 5.0 : 5.35;
    const cellH = mobile ? 7.8 : 8.15;
    const cols = Math.ceil(width / cellW);
    const rows = Math.ceil(height / cellH);
    const cx = width * (.5 + pointerX * .026);
    const cy = height * (.51 + pointerY * .025);

    // The galactic disc is deliberately larger and brighter; the orbit artwork stays untouched.
    const angle = .34 + pointerX * .095 - pointerY * .035;
    const ca = Math.cos(angle), sa = Math.sin(angle);
    const rotation = (reducedMotion ? 0 : time * .000105) + dragRotation;
    const spinPulse = .5 + .5 * Math.sin(time * .0008);
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(width, height) * .56);
    glow.addColorStop(0, "rgba(247,242,230,.19)");
    glow.addColorStop(.22, "rgba(205,207,211,.10)");
    glow.addColorStop(.58, "rgba(150,155,165,.045)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.font = (mobile ? "7.5px" : "8.6px") + ' "DM Mono", monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let row = 0; row < rows; row++) {
      const sy = row * cellH + cellH * .5;
      for (let col = 0; col < cols; col++) {
        const sx = col * cellW + cellW * .5;
        const dx = (sx - cx) / (width * .49);
        const dy = (sy - cy) / (height * .49);
        const u = dx * ca + dy * sa;
        const v = (-dx * sa + dy * ca) * 1.68;
        const radius = Math.sqrt(u * u + v * v);
        if (radius > 1.13) continue;

        const theta = Math.atan2(v, u);
        const armWidth = .145 + radius * .10;
        let primaryArms = 0, secondaryArms = 0;
        for (let arm = 0; arm < 3; arm++) {
          const spiral = rotation + arm * Math.PI * 2 / 3 + Math.log(radius + .085) * 1.48 + .42;
          const delta = wrapAngle(theta - spiral);
          const density = Math.exp(-(delta * delta) / (2 * armWidth * armWidth));
          if (density > primaryArms) primaryArms = density;

          const secondaryDelta = wrapAngle(theta - (spiral + .22));
          const secondary = Math.exp(-(secondaryDelta * secondaryDelta) / (2 * (armWidth * .48) ** 2));
          if (secondary > secondaryArms) secondaryArms = secondary;
        }

        const edge = Math.max(0, Math.min(1, (1.13 - radius) / .22));
        const radialFade = Math.exp(-radius * .92) * edge;
        const core = Math.exp(-radius * radius * 24);
        const bulge = Math.exp(-radius * radius * 5.5) * .24;
        const outerHaze = Math.exp(-Math.pow(radius - .58, 2) / .20) * .18;
        const dustLane = Math.exp(-Math.pow(wrapAngle(theta - (rotation + Math.log(radius + .1) * 1.48 + .58)), 2) / .012);
        const cloudNoise = .5 + .5 * Math.sin(col * .21 + Math.sin(row * .19 + rotation) * 2.4) *
          Math.cos(row * .27 - col * .08 + rotation * .7);
        const grain = (hash(col, row) - .5) * .13;

        let brightness = (primaryArms * .88 + secondaryArms * .20 + bulge + outerHaze) * radialFade;
        brightness += core * (.34 + spinPulse * .12) + grain * radialFade;
        brightness += cloudNoise * outerHaze * .22;
        brightness *= 1 - dustLane * .28;
        brightness = Math.max(0, Math.min(1, brightness));

        // A denser sampling threshold creates a broad, readable spiral instead of a tiny dotted core.
        const chance = hash(col + 17, row + 31);
        if (brightness < .075 || chance > .34 + brightness * .64) continue;

        const level = Math.max(0, Math.min(glyphs.length - 1, Math.floor(brightness * (glyphs.length - 1))));
        const glyph = glyphs[level];
        if (glyph === " ") continue;
        const alpha = Math.min(.96, .20 + brightness * .92) * (.78 + chance * .22);
        if (brightness > .73) ctx.fillStyle = "rgba(250,247,238," + alpha + ")";
        else if (brightness > .43) ctx.fillStyle = "rgba(216,217,218," + alpha + ")";
        else ctx.fillStyle = "rgba(155,161,170," + alpha + ")";
        ctx.fillText(glyph, sx, sy);
      }
    }
    ctx.restore();

    // Fine star clusters rotate with the disc, giving the galaxy a living sense of scale.
    for (let i = 0; i < 54; i++) {
      const base = i * 2.399963;
      const radius = .16 + ((i * 29) % 79) / 100;
      const a = base + rotation * (.32 + radius * .22) + Math.log(radius + .1) * 1.2;
      const u = Math.cos(a) * radius;
      const v = Math.sin(a) * radius * .42;
      const x = cx + (u * ca - v * sa) * width * .49;
      const y = cy + (u * sa + v * ca) * height * .49;
      const flicker = .15 + .42 * (.5 + .5 * Math.sin(time * .0011 + i * 1.8));
      ctx.fillStyle = "rgba(246,244,237," + flicker + ")";
      const size = i % 9 === 0 ? 2 : 1;
      ctx.fillRect(Math.round(x), Math.round(y), size, size);
    }
  }

  function drawPulses(time) {
    for (let i = pulses.length - 1; i >= 0; i--) {
      const pulse = pulses[i];
      const age = (time - pulse.start) / 1500;
      if (age >= 1) {
        pulses.splice(i, 1);
        continue;
      }
      const radius = age * Math.min(width, height) * .68;
      const alpha = (1 - age) * .58;
      ctx.save();
      ctx.strokeStyle = "rgba(242,241,236," + alpha + ")";
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(pulse.x, pulse.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(210,214,220," + (alpha * .42) + ")";
      ctx.beginPath();
      ctx.arc(pulse.x, pulse.y, radius * .72, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawShootingStar(time) {
    const period = 10500;
    const phase = (time % period) / period;
    if (phase > .13) return;
    const p = phase / .13;
    const x = width * (.12 + p * .48);
    const y = height * (.16 + p * .19);
    const alpha = Math.sin(p * Math.PI) * .55;
    ctx.save();
    ctx.strokeStyle = "rgba(238,238,235," + alpha + ")";
    ctx.lineWidth = .8;
    ctx.beginPath();
    ctx.moveTo(x - width * .055, y - height * .025);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255," + alpha + ")";
    ctx.fillRect(x - 1, y - 1, 2, 2);
    ctx.restore();
  }

  function render(time) {
    if (!width || !height) return;
    pointerX += (targetX - pointerX) * .055;
    pointerY += (targetY - pointerY) * .055;
    ctx.clearRect(0, 0, width, height);
    drawStars(time);
    drawGalaxy(time);
    drawPulses(time);
    drawShootingStar(time);
  }

  function requestFrame() {
    if (!raf && !document.hidden && !reducedMotion && visible) raf = requestAnimationFrame(loop);
  }
  function loop(now) {
    raf = 0;
    if (now - lastFrame >= 1000 / 24) {
      render(now);
      lastFrame = now;
    }
    requestFrame();
  }

  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(canvas);
  else window.addEventListener("resize", resize, { passive: true });
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (visible) requestFrame();
      else if (raf) { cancelAnimationFrame(raf); raf = 0; }
    }, { threshold: .02 });
    observer.observe(canvas);
  }

  const parent = canvas.parentElement;
  if (parent) {
    parent.addEventListener("pointermove", event => {
      const rect = parent.getBoundingClientRect();
      targetX = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - .5) * 2));
      targetY = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - .5) * 2));
      if (dragging) {
        dragRotation += (event.clientX - lastPointerX) * .0032;
        lastPointerX = event.clientX;
      }
    }, { passive: true });
    parent.addEventListener("pointerleave", () => {
      if (!dragging) { targetX = 0; targetY = 0; }
    }, { passive: true });
    parent.addEventListener("pointerdown", event => {
      const rect = canvas.getBoundingClientRect();
      dragging = true;
      lastPointerX = event.clientX;
      if (!reducedMotion) {
        pulses.push({ x: event.clientX - rect.left, y: event.clientY - rect.top, start: performance.now() });
        if (pulses.length > 4) pulses.shift();
      }
    }, { passive: true });
    window.addEventListener("pointerup", () => { dragging = false; });
    window.addEventListener("pointercancel", () => { dragging = false; });
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && raf) { cancelAnimationFrame(raf); raf = 0; }
    else requestFrame();
  });

  resize();
  if (reducedMotion) render(0);
  else requestFrame();
})();