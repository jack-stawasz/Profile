// NOvA-style event display for the home banner: generated neutrino events, cosmics and noise hits on black
// The beam runs left to right; lengths are px, times ms, charges in MIPs (a minimum-ionizing muon's charge per cell)

function createNovaDisplay(width, height) {
  // ==================================================
  // Settings
  // ==================================================
  const CELL         = 8;      // cell height and plane pitch
  const EVENT_GAP    = 2000;   // between neutrino events, so about two are on screen
  const EVENT_CLEAR  = 2;      // cells kept between one neutrino event's hits and another's
  const EVENT_TRIES  = 6;      // events generated to find one that fits before waiting
  const EVENT_RETRY  = 250;    // wait when none fit
  const READOUT      = 400;    // an event's hits light up in time order over this
  const HOLD         = 1500;   // a hit stays at full brightness this long after lighting
  const FADE_TAU     = 330;    // then fades as exp(-t / τ), dark after ~1 s
  const COSMIC_GAP   = [2000, 4000];
  const COSMIC_READ  = 200;
  const NOISE_COUNT  = 40;     // noise hits on screen at once
  const NOISE_LIFE   = 1500;
  const NOISE_ALPHA  = 0.8;
  const SIZE         = [0.45, 1.5];  // hit size in cells, lowest to highest charge
  const Q_RANGE      = [0.1, 3];     // charge at the color scale's two ends; a muon's 1 MIP lands in the yellow-green
  const Q_THRESHOLD  = 0.15;   // smaller deposits aren't read out, as in the detector
  // NOvA's event display scale (charge on a log axis): dark blue, blue, cyan, green, yellow-green, yellow, orange, red
  const PALETTE = [
    [0.00, [10, 26, 140]],
    [0.18, [31, 95, 214]],
    [0.35, [24, 195, 230]],
    [0.50, [56, 224, 138]],
    [0.65, [182, 240, 60]],
    [0.78, [242, 230, 38]],
    [0.90, [245, 150, 30]],
    [1.00, [232, 50, 30]],
  ];

  let events = [];
  let noise = [];
  let nextEvent = 0;
  let nextCosmic = 0;
  let nextNoise = null;
  let avoided = null;   // { x0, y0, x1, y1 }: where no neutrino vertex lands (the signature)

  // ==================================================
  // Detector geometry
  // ==================================================
  function __deposit(hits, x, y, charge, t) {
    if (x < 0 || y < 0 || x >= width || y >= height || charge <= 0) return;
    const plane = Math.floor(x / CELL);
    const row = Math.floor(y / CELL);
    const key = plane * 10000 + row;
    let hit = hits.get(key);
    if (!hit) hits.set(key, hit = { x: plane * CELL, y: row * CELL, q: 0, t });
    hit.q += charge;
    hit.t = Math.min(hit.t, t);
  }

  // Color and size from charge, set once per hit
  function __style(h) {
    const t = Math.min(1, Math.max(0, Math.log(h.q / Q_RANGE[0]) / Math.log(Q_RANGE[1] / Q_RANGE[0])));
    let i = 1;
    while (PALETTE[i][0] < t) i++;
    const [t0, c0] = PALETTE[i - 1];
    const [t1, c1] = PALETTE[i];
    const f = (t - t0) / (t1 - t0);
    h.color = `rgb(${c0.map((c, k) => Math.round(c + (c1[k] - c) * f)).join(', ')})`;
    h.size = (SIZE[0] + (SIZE[1] - SIZE[0]) * t) * (CELL - 1);
    h.cx = h.x + (CELL - 1) / 2;
    h.cy = h.y + (CELL - 1) / 2;
    return h;
  }

  // ==================================================
  // Particles
  // ==================================================
  const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
  const between = (lo, hi) => lo + (hi - lo) * Math.random();

  // A charged track: steady charge per cell, multiple scattering, and a Bragg rise if it stops
  function __track(hits, x, y, angle, length, { dqdx = 1, scatter = 0.02, stops = false, t0 = 0, dur = READOUT }) {
    const step = CELL / 2;
    for (let s = 0; s < length; s += step) {
      const bragg = stops && length - s < 3 * CELL ? 1 + 2 * (1 - (length - s) / (3 * CELL)) : 1;
      __deposit(hits, x, y, dqdx * bragg * (step / CELL) * (1 + 0.25 * gauss()), t0 + (s / length) * dur);
      angle += scatter * gauss();
      x += step * Math.cos(angle);
      y += step * Math.sin(angle);
    }
    return { x, y, angle };
  }

  // An electromagnetic shower: a dense core that widens, most of its charge early
  function __shower(hits, x, y, angle, energy, t0, dur) {
    const length = (16 + 14 * energy) * CELL;
    __track(hits, x, y, angle, length * 0.25, { dqdx: 1.5, scatter: 0.04, t0, dur: dur * 0.25 });
    for (let k = 0; k < 60 * energy; k++) {
      const d = length * Math.pow((Math.random() + Math.random() + Math.random()) / 3, 1.15);
      const lateral = gauss() * (0.4 * CELL + 0.12 * d);
      const charge = energy * (1.2 - 0.8 * d / length) * between(0.3, 1);
      __deposit(hits, x + Math.cos(angle) * d - Math.sin(angle) * lateral,
        y + Math.sin(angle) * d + Math.cos(angle) * lateral, charge, t0 + (d / length) * dur);
    }
  }

  // Hadrons at the vertex: a few short, heavily ionizing stubs and stray hits
  function __hadronBlob(hits, x, y, size, t0) {
    for (let k = 0; k < 2 + Math.round(3 * size); k++) {
      __track(hits, x, y, between(-Math.PI, Math.PI), between(1, 6) * CELL * size,
        { dqdx: between(1.2, 2), scatter: 0.15, stops: true, t0, dur: READOUT * 0.3 });
    }
    for (let k = 0; k < 6 * size; k++) {
      __deposit(hits, x + gauss() * 4 * CELL * size, y + gauss() * 3 * CELL * size, between(0.3, 1.2),
        t0 + READOUT * 0.3);
    }
  }

  // ==================================================
  // Events
  // ==================================================
  function __finish(hits, start) {
    const kept = [...hits.values()].filter(h => h.q >= Q_THRESHOLD).sort((a, b) => a.q - b.q).map(__style);
    const last = kept.reduce((m, h) => Math.max(m, h.t), 0);
    return { start, hits: kept, end: start + last + HOLD + 6 * FADE_TAU };
  }

  const cellKey = h => Math.round(h.x / CELL) * 10000 + Math.round(h.y / CELL);

  // The cells a neutrino event occupies, widened by EVENT_CLEAR on every side
  function __footprint(e) {
    const cells = new Set();
    for (const h of e.hits) {
      const plane = Math.round(h.x / CELL);
      const row = Math.round(h.y / CELL);
      for (let dp = -EVENT_CLEAR; dp <= EVENT_CLEAR; dp++) {
        for (let dr = -EVENT_CLEAR; dr <= EVENT_CLEAR; dr++) cells.add((plane + dp) * 10000 + row + dr);
      }
    }
    return cells;
  }

  // A neutrino event clear of every live one, or null when none of a few tries fits; cosmics may cross anything
  function __placedEvent(now) {
    const taken = events.filter(e => e.footprint).map(e => e.footprint);
    for (let tries = 0; tries < EVENT_TRIES; tries++) {
      const e = __neutrinoEvent(now);
      if (taken.every(cells => e.hits.every(h => !cells.has(cellKey(h))))) {
        e.footprint = __footprint(e);
        return e;
      }
    }
    return null;
  }

  // A vertex outside the avoided area; where it can't be (a narrow screen), anywhere
  function __vertex() {
    for (let tries = 0; tries < 30; tries++) {
      const x = width * between(0.1, 0.9);
      const y = height * between(0.2, 0.8);
      if (!avoided || x < avoided.x0 || x > avoided.x1 || y < avoided.y0 || y > avoided.y1) return [x, y];
    }
    return [width * between(0.1, 0.9), height * between(0.2, 0.8)];
  }

  function __neutrinoEvent(start) {
    const hits = new Map();
    const [vx, vy] = __vertex();
    const angle = 0.2 * gauss();
    const kind = Math.random();

    if (kind < 0.4) {
      // νμ CC: a long muon track and a small hadronic blob
      __hadronBlob(hits, vx, vy, between(0.5, 1), 0);
      __track(hits, vx, vy, angle, width * between(0.3, 0.6), { scatter: 0.015, dur: READOUT * 0.9 });
    } else if (kind < 0.7) {
      // νe CC: an electron shower and a small hadronic blob
      __hadronBlob(hits, vx, vy, between(0.3, 0.7), 0);
      __shower(hits, vx, vy, 0.6 * angle, between(1.5, 2.5), 0, READOUT);
    } else {
      // NC: a larger hadronic blob, and half the time a π⁰'s two photons converting a gap away
      __hadronBlob(hits, vx, vy, between(1, 1.6), 0);
      if (Math.random() < 0.5) {
        const opening = between(0.3, 0.6);
        for (const side of [-1, 1]) {
          const a = angle + side * opening;
          const gap = between(3, 8) * CELL;
          __shower(hits, vx + gap * Math.cos(a), vy + gap * Math.sin(a), a, between(0.8, 1.4),
            READOUT * 0.2, READOUT * 0.8);
        }
      }
    }
    return __finish(hits, start);
  }

  // A cosmic muon from the top; about a third stop inside and decay to a Michel electron
  function __cosmic(start) {
    const hits = new Map();
    const angle = Math.PI / 2 + 0.3 * gauss();
    const stops = Math.random() < 0.35;
    const length = stops ? height * between(0.4, 0.95) / Math.max(0.3, Math.sin(angle)) : height * 2;
    const end = __track(hits, width * Math.random(), -CELL, angle, length,
      { scatter: 0.008, stops, dur: COSMIC_READ * (stops ? 1 : height / length * 1.2) });
    if (stops) {
      __track(hits, end.x, end.y, between(-Math.PI, Math.PI), between(3, 6) * CELL,
        { dqdx: 1.2, scatter: 0.1, t0: COSMIC_READ + 100, dur: 80 });
    }
    return __finish(hits, start);
  }

  // A lone low-charge hit anywhere: electronics noise, mostly dark blue to cyan on the scale
  function __noiseHit(born) {
    const h = { x: Math.floor(Math.random() * width / CELL) * CELL, y: Math.floor(Math.random() * height / CELL) * CELL,
      q: Q_RANGE[0] * Math.pow(4, Math.random()), born };
    return __style(h);
  }

  // ==================================================
  // Drawing
  // ==================================================
  function __drawNoise(ctx, now) {
    // The first frame starts with a full screen of noise at spread-out ages
    if (nextNoise === null) {
      noise = Array.from({ length: NOISE_COUNT }, () => __noiseHit(now - NOISE_LIFE * Math.random()));
      nextNoise = now;
    }
    while (nextNoise <= now) {
      noise.push(__noiseHit(nextNoise));
      nextNoise += (NOISE_LIFE / NOISE_COUNT) * between(0.5, 1.5);
    }
    noise = noise.filter(h => now - h.born < NOISE_LIFE);
    for (const h of noise) {
      const age = now - h.born;
      const fade = age < 0.6 * NOISE_LIFE ? Math.min(1, age / 60) : (NOISE_LIFE - age) / (0.4 * NOISE_LIFE);
      ctx.globalAlpha = NOISE_ALPHA * fade;
      ctx.fillStyle = h.color;
      ctx.fillRect(h.cx - h.size / 2, h.cy - h.size / 2, h.size, h.size);
    }
  }

  function draw(ctx, now) {
    events = events.filter(e => now < e.end);
    if (now >= nextEvent) {
      const e = __placedEvent(now);
      if (e) events.push(e);
      nextEvent = now + (e ? EVENT_GAP : EVENT_RETRY);
    }
    if (now >= nextCosmic) {
      events.push(__cosmic(now));
      nextCosmic = now + between(...COSMIC_GAP);
    }

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    __drawNoise(ctx, now);
    for (const e of events) {
      for (const h of e.hits) {
        const age = now - e.start - h.t;
        if (age < 0) continue;
        const brightness = age < HOLD ? Math.min(1, age / 60) : Math.exp(-(age - HOLD) / FADE_TAU);
        if (brightness < 0.02) continue;
        ctx.globalAlpha = brightness;
        ctx.fillStyle = h.color;
        ctx.fillRect(h.cx - h.size / 2, h.cy - h.size / 2, h.size, h.size);
      }
    }
    ctx.globalAlpha = 1;
  }

  function resize(w, h) {
    width = w;
    height = h;
    events = [];
    nextEvent = 0;
    nextNoise = null;
  }

  return { draw, resize, avoid: rect => { avoided = rect; } };
}
