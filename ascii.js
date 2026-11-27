(() => {
  const hero = document.getElementById("ascii-hero");
  const wave = document.getElementById("ascii-wave");
  if (!hero && !wave) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ramp = " .,:;!+*#%@";
  const states = [];
  let raf = 0;

  function setup(canvas, draw, fps) {
    if (!canvas) return null;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return null;
    const state = { canvas, ctx, draw, fps, last: 0, visible: true, width: 0, height: 0, dpr: 1 };
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      state.width = rect.width;
      state.height = rect.height;
      state.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(rect.width * state.dpr);
      canvas.height = Math.round(rect.height * state.dpr);
      ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
      state.last = 0;
      if (reduceMotion) draw(ctx, state, 0);
    };
    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(canvas);
    else window.addEventListener("resize", resize, { passive: true });
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(entries => {
        state.visible = entries[0].isIntersecting;
        if (state.visible) requestFrame();
      }, { threshold: 0.02 });
      observer.observe(canvas);
    }
    resize();
    states.push(state);
    return state;
  }

  let pointer = { x: 0, y: 0 };
  setup(hero, drawSphere, 28);
  if (hero && hero.parentElement) {
    hero.parentElement.addEventListener("pointermove", event => {
      if (event.pointerType !== "mouse") return;
      const rect = hero.parentElement.getBoundingClientRect();
      pointer.x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - .5) * 2));
      pointer.y = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - .5) * 2));
    }, { passive: true });
    hero.parentElement.addEventListener("pointerleave", () => { pointer.x = 0; pointer.y = 0; }, { passive: true });
  }
  setup(wave, drawWave, 12);

  function drawSphere(ctx, state, time) {
    const w = state.width, h = state.height;
    if (!w || !h) return;
    ctx.clearRect(0, 0, w, h);
    const mobile = w < 420;
    const cellW = mobile ? 7.1 : 8.1;
    const cellH = mobile ? 11.5 : 13.1;
    const cols = Math.ceil(w / cellW);
    const rows = Math.ceil(h / cellH);
    const cx = w * .5, cy = h * .51;
    const radius = Math.min(w * .37, h * .405);
    const spin = reduceMotion ? .35 : time * .00019;
    const ax = .2 + pointer.y * .2;
    const ay = spin + pointer.x * .25;
    const cyaw = Math.cos(ay), syaw = Math.sin(ay);
    const cp = Math.cos(ax), sp = Math.sin(ax);
    const lx = -.48 + Math.sin(time * .00023) * .2;
    const ly = -.38, lz = .79;
    const ll = Math.hypot(lx, ly, lz);
    ctx.font = (mobile ? "8.5px" : "9.5px") + ' "DM Mono", monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let row = 0; row < rows; row++) {
      const py = (row * cellH + cellH * .5 - cy) / radius;
      for (let col = 0; col < cols; col++) {
        const px = (col * cellW + cellW * .5 - cx) / radius;
        const d = px * px + py * py;
        if (d > .985) continue;
        const z = Math.sqrt(1 - d);
        const x1 = px * cyaw + z * syaw;
        const z1 = -px * syaw + z * cyaw;
        const y1 = py * cp - z1 * sp;
        const z2 = py * sp + z1 * cp;
        const diffuse = Math.max(0, (x1 * lx + y1 * ly + z2 * lz) / ll);
        const rim = Math.pow(1 - Math.max(0, z2), 2.2);
        const lat = Math.asin(Math.max(-1, Math.min(1, y1)));
        const lon = Math.atan2(x1, z2);
        const latitudeLine = Math.pow(Math.max(0, Math.cos(lat * 13)), 18);
        const longitudeLine = Math.pow(Math.max(0, Math.cos(lon * 17)), 20);
        const contour = Math.max(latitudeLine, longitudeLine) * .11;
        const grain = Math.sin(x1 * 31 + time * .0005) * Math.cos(y1 * 27 - z2 * 9) * .035;
        const shade = Math.max(0, Math.min(1, .06 + diffuse * .78 + rim * .18 + contour + grain));
        if (shade < .13) continue;
        const index = Math.min(ramp.length - 1, Math.floor(shade * (ramp.length - 1)));
        const char = ramp[index];
        if (char === " ") continue;
        const alpha = Math.min(.94, .2 + shade * .78);
        ctx.fillStyle = "rgba(238,238,238," + alpha + ")";
        ctx.fillText(char, col * cellW + cellW * .5, row * cellH + cellH * .5);
      }
    }
    ctx.font = (mobile ? "8px" : "9px") + ' "DM Mono", monospace';
    ctx.fillStyle = "rgba(235,235,235,.5)";
    const markers = [[.12,.18,"+"],[.83,.27,"."],[.78,.77,"·"],[.18,.82,":"]];
    markers.forEach((item, i) => {
      ctx.globalAlpha = .38 + .25 * Math.sin(time * .0012 + i * 1.7);
      ctx.fillText(item[2], w * item[0], h * item[1]);
    });
    ctx.globalAlpha = 1;
  }

  function drawWave(ctx, state, time) {
    const w = state.width, h = state.height;
    if (!w || !h) return;
    ctx.clearRect(0, 0, w, h);
    const cellW = 8.2, cellH = 13;
    const cols = Math.ceil(w / cellW), rows = Math.ceil(h / cellH);
    const phase = reduceMotion ? .8 : time * .001;
    ctx.font = '9px "DM Mono", monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col / Math.max(1, cols - 1);
        const y = row / Math.max(1, rows - 1);
        const a = Math.sin(x * 15 - phase * 1.2 + y * 3.2);
        const b = Math.cos(y * 8 + phase * .8 - x * 4.5);
        const c = Math.sin((x + y) * 19 - phase * .55);
        const v = (a + b + c) / 3;
        const index = Math.max(0, Math.min(ramp.length - 1, Math.floor((v + 1) * .5 * (ramp.length - 1))));
        const ch = ramp[index];
        if (ch === " " || v < -.35) continue;
        ctx.fillStyle = "rgba(220,220,220," + (.12 + (v + 1) * .1) + ")";
        ctx.fillText(ch, col * cellW + 4, row * cellH + 6);
      }
    }
  }

  function requestFrame() {
    if (!raf && !document.hidden && !reduceMotion) raf = requestAnimationFrame(loop);
  }
  function loop(now) {
    raf = 0;
    let active = false;
    for (const state of states) {
      if (!state.visible || !state.width || !state.height) continue;
      active = true;
      if (now - state.last >= 1000 / state.fps) {
        state.draw(state.ctx, state, now);
        state.last = now;
      }
    }
    if (active) requestFrame();
  }
  if (reduceMotion) states.forEach(state => state.draw(state.ctx, state, 0));
  else {
    requestFrame();
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && raf) { cancelAnimationFrame(raf); raf = 0; }
      else requestFrame();
    });
  }
})();