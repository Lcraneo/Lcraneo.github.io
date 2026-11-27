(() => {
  const canvas = document.getElementById("ascii-hero");
  if (!canvas) return;

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const glyphs = " .,:-~=+*x#%@";
  const stars = [];
  let width = 0, height = 0, dpr = 1, raf = 0, lastFrame = 0, visible = true;
  let pointerX = 0, pointerY = 0;

  // Stable pseudo-random field: no external assets, libraries or per-frame allocations.
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
  for (let i = 0; i < 230; i++) {
    stars.push({
      x: random(), y: random(), size: random() > .94 ? 1.7 : .7 + random() * .65,
      phase: random() * Math.PI * 2, speed: .35 + random() * .9,
      bright: random() > .91
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
      const x = star.x * width + pointerX * (star.x - .5) * 7;
      const y = star.y * height + pointerY * (star.y - .5) * 5;
      if (star.bright) {
        ctx.globalAlpha = twinkle * .75;
        ctx.fillStyle = "#f4f1e9";
        ctx.fillText(i % 3 === 0 ? "+" : ".", x, y);
      } else {
        ctx.globalAlpha = twinkle * .42;
        ctx.fillStyle = "#bfc0c2";
        ctx.fillRect(x, y, star.size, star.size);
      }
    }
    ctx.restore();
  }

  function drawOrbit(time, cx, cy) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(.34 + pointerX * .025);
    ctx.strokeStyle = "rgba(205,210,216,.13)";
    ctx.lineWidth = .7;
    ctx.setLineDash([2, 7]);
    ctx.beginPath();
    ctx.ellipse(0, 0, width * .455, height * .19, 0, .12, Math.PI * 1.96);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(225,228,232,.09)";
    ctx.beginPath();
    ctx.ellipse(0, 0, width * .39, height * .32, -.16, Math.PI * .08, Math.PI * 1.72);
    ctx.stroke();
    ctx.restore();

    const pulse = .45 + .35 * Math.sin(time * .0011);
    ctx.fillStyle = "rgba(244,241,233," + pulse + ")";
    ctx.fillRect(cx + width * .405, cy - height * .17, 2, 2);
    ctx.fillRect(cx - width * .415, cy + height * .11, 1.5, 1.5);
  }

  function drawGalaxy(time) {
    const mobile = width < 430;
    const cellW = mobile ? 5.8 : 6.15;
    const cellH = mobile ? 8.6 : 9.15;
    const cols = Math.ceil(width / cellW);
    const rows = Math.ceil(height / cellH);
    const cx = width * (.5 + pointerX * .018);
    const cy = height * (.51 + pointerY * .014);
    const angle = .37 + Math.sin(time * .00008) * .018 + pointerX * .035;
    const ca = Math.cos(angle), sa = Math.sin(angle);
    const rotation = time * .000035;
    const coreGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(width, height) * .43);
    coreGlow.addColorStop(0, "rgba(239,235,225,.11)");
    coreGlow.addColorStop(.18, "rgba(194,196,199,.055)");
    coreGlow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = coreGlow;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.font = (mobile ? "7.5px" : "8.5px") + ' "DM Mono", monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let row = 0; row < rows; row++) {
      const sy = row * cellH + cellH * .5;
      for (let col = 0; col < cols; col++) {
        const sx = col * cellW + cellW * .5;
        const dx = (sx - cx) / (width * .455);
        const dy = (sy - cy) / (height * .455);
        // Tilt the galactic plane diagonally and compress its vertical axis.
        const u = dx * ca + dy * sa;
        const v = (-dx * sa + dy * ca) * 2.22;
        const radius = Math.sqrt(u * u + v * v);
        if (radius > 1.12) continue;

        const theta = Math.atan2(v, u);
        const armWidth = .105 + radius * .085;
        let armDensity = 0;
        for (let arm = 0; arm < 3; arm++) {
          const armAngle = rotation + arm * Math.PI * 2 / 3 + Math.log(radius + .105) * 1.72 + .45;
          const delta = wrapAngle(theta - armAngle);
          const density = Math.exp(-(delta * delta) / (2 * armWidth * armWidth));
          if (density > armDensity) armDensity = density;
        }

        const edge = Math.max(0, Math.min(1, (1.12 - radius) / .25));
        const radialFade = Math.exp(-radius * 1.08) * edge;
        const core = Math.exp(-radius * radius * 34);
        const haze = Math.exp(-Math.pow(radius - .43, 2) / .095) * .12;
        const dustLane = Math.exp(-Math.pow(wrapAngle(theta - (rotation + Math.log(radius + .12) * 1.72 + .58)), 2) / .009);
        const grain = (Math.sin(col * 12.989 + row * 78.233 + rotation * 3) *
          Math.cos(col * 3.17 - row * 5.73 + rotation)) * .045;
        let brightness = (armDensity * .78 + core * .9 + haze) * radialFade + core * .18 + grain * radialFade;
        brightness *= 1 - dustLane * .23;
        brightness = Math.max(0, Math.min(1, brightness));

        const chance = hash(col, row);
        if (brightness < .105 || chance > .12 + brightness * .91) continue;

        const level = Math.max(0, Math.min(glyphs.length - 1, Math.floor(brightness * (glyphs.length - 1))));
        const glyph = glyphs[level];
        if (glyph === " ") continue;
        const alpha = Math.min(.9, .12 + brightness * .92) * (.72 + chance * .28);
        if (brightness > .72) ctx.fillStyle = "rgba(248,246,239," + alpha + ")";
        else if (brightness > .43) ctx.fillStyle = "rgba(207,209,211," + alpha + ")";
        else ctx.fillStyle = "rgba(137,143,151," + alpha + ")";
        ctx.fillText(glyph, sx, sy);
      }
    }
    ctx.restore();

    // Pixel-like bright clusters: restrained accents inspired by code-drawn VFX.
    for (let i = 0; i < 18; i++) {
      const a = rotation * .16 + i * 2.399;
      const r = .13 + ((i * 37) % 71) / 100;
      const u = Math.cos(a + r * 2.8) * r;
      const v = Math.sin(a + r * 2.8) * r * .45;
      const x = cx + (u * ca - v * sa) * width * .455;
      const y = cy + (u * sa + v * ca) * height * .455;
      const flicker = .12 + .28 * (.5 + .5 * Math.sin(time * .001 + i * 2.1));
      ctx.fillStyle = "rgba(242,240,232," + flicker + ")";
      ctx.fillRect(Math.round(x), Math.round(y), i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1);
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
    ctx.clearRect(0, 0, width, height);
    drawStars(time);
    drawOrbit(time, width * .5, height * .51);
    drawGalaxy(time);
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
      if (event.pointerType !== "mouse") return;
      const rect = parent.getBoundingClientRect();
      pointerX = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width - .5)) * 2;
      pointerY = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height - .5)) * 2;
    }, { passive: true });
    parent.addEventListener("pointerleave", () => { pointerX = 0; pointerY = 0; }, { passive: true });
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && raf) { cancelAnimationFrame(raf); raf = 0; }
    else requestFrame();
  });

  resize();
  if (reducedMotion) render(0);
  else requestFrame();
})();