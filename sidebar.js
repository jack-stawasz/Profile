/* ═══════════════════════════════════════════════════════════
═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }
  function randInt(min, max) {
    return Math.floor(rand(min, max + 1));
  }
  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function getDate() {
    return (window.SiteSettings && window.SiteSettings.getDate) ? window.SiteSettings.getDate() : new Date();
  }

  function getSeason() {
    const m = getDate().getMonth() + 1; // 1–12
    if (m <= 2)  return 'snow';   // Jan/Feb
    if (m <= 4)  return 'rain';   // Mar/Apr
    if (m <= 6)  return 'sun';    // May/Jun
    if (m <= 8)  return 'wave';   // Jul/Aug
    if (m <= 10) return 'books';  // Sep/Oct
    return 'xmas';                // Nov/Dec
  }

  function createSidebars() {
    // Remove any existing sidebars
    document.querySelectorAll('.seasonal-sidebar').forEach(el => el.remove());

    const season = getSeason();
    const noAnim = window.SiteSettings && !window.SiteSettings.animationsEnabled;

    ['left', 'right'].forEach(side => {
      const bar = document.createElement('div');
      bar.className = `seasonal-sidebar sidebar-${side} season-${season}`;
      bar.setAttribute('aria-hidden', 'true');
      if (!noAnim) populate[season](bar, side);
      document.body.appendChild(bar);
    });
  }

  // Expose refresh so settings panel can trigger a redraw
  window._refreshSidebar = createSidebars;

  const populate = {

    snow(bar) {
      const count = 18;
      // Inject a shared <style> block for all unique flake keyframes
      const styleEl = document.createElement('style');
      let keyframesCSS = '';

      for (let i = 0; i < count; i++) {
        const size     = rand(3, 8);
        const delay    = rand(0, 12);
        const duration = rand(6, 14);
        const left     = rand(5, 90);
        const drift    = rand(-15, 15);
        const name     = `snowFlake${Date.now()}_${i}`;

        keyframesCSS += `
          @keyframes ${name} {
            0%   { transform: translateY(0px) translateX(0px) rotate(0deg); opacity: 0; }
            5%   { opacity: 1; }
            90%  { opacity: 0.7; }
            100% { transform: translateY(110vh) translateX(${drift}px) rotate(360deg); opacity: 0; }
          }
        `;

        const flake = document.createElement('div');
        flake.className = 'snowflake';
        Object.assign(flake.style, {
          width:            `${size}px`,
          height:           `${size}px`,
          left:             `${left}%`,
          animation:        `${name} ${duration}s linear -${delay}s infinite`,
          opacity:          '0',
        });
        bar.appendChild(flake);
      }

      styleEl.textContent = keyframesCSS;
      document.head.appendChild(styleEl);
    },

    rain(bar) {
      const styleEl = document.createElement('style');
      let keyframesCSS = '';
      const dropCount = 22;

      for (let i = 0; i < dropCount; i++) {
        const height = rand(12, 30);
        const delay  = rand(0, 5);
        const dur    = rand(0.55, 1.1);
        const left   = rand(3, 95);
        const name   = `rainDrop${Date.now()}_${i}`;

        keyframesCSS += `
          @keyframes ${name} {
            0%   { transform: translateY(0px) skewX(-8deg); opacity: 0; }
            8%   { opacity: 1; }
            92%  { opacity: 0.6; }
            100% { transform: translateY(110vh) skewX(-8deg); opacity: 0; }
          }
        `;

        const drop = document.createElement('div');
        drop.className = 'raindrop';
        Object.assign(drop.style, {
          height:    `${height}px`,
          left:      `${left}%`,
          animation: `${name} ${dur}s linear -${delay}s infinite`,
          opacity:   '0',
        });
        bar.appendChild(drop);
      }

      // Splashes
      for (let i = 0; i < 5; i++) {
        const splash = document.createElement('div');
        splash.className = 'splash';
        Object.assign(splash.style, {
          left:             `${rand(10, 80)}%`,
          animationDuration:`${rand(0.6, 1.2)}s`,
          animationDelay:   `-${rand(0, 2)}s`,
        });
        bar.appendChild(splash);
      }

      styleEl.textContent = keyframesCSS;
      document.head.appendChild(styleEl);
    },

    sun(bar, side) {
      // One large glow blob in the top corner
      const glow = document.createElement('div');
      glow.className = 'sun-glow';
      const glowSize = 120;
      Object.assign(glow.style, {
        width:            `${glowSize}px`,
        height:           `${glowSize}px`,
        top:              '-20px',
        [side === 'left' ? 'left' : 'right']: '-30px',
        animationDuration:'3.5s',
      });
      bar.appendChild(glow);

      // Radiating beams
      const beamCount = 7;
      for (let i = 0; i < beamCount; i++) {
        const beam = document.createElement('div');
        beam.className = 'sunbeam';
        const angle   = side === 'left'
          ? rand(-10, 60)
          : rand(120, 190);
        const length  = rand(60, 180);
        const delay   = rand(0, 3);
        const dur     = rand(2.5, 4.5);

        Object.assign(beam.style, {
          height:           `${length}px`,
          top:              `${rand(0, 30)}px`,
          left:             `${side === 'left' ? rand(0, 40) : rand(40, 90)}%`,
          animationDuration:`${dur}s`,
          animationDelay:   `-${delay}s`,
          transform:        `rotate(${angle}deg)`,
          animation:        `sunBeamFade ${dur}s ease-in-out -${delay}s infinite alternate`,
          opacity:          rand(0.2, 0.5),
        });
        bar.appendChild(beam);
      }

      // Scattered sparkles
      for (let i = 0; i < 10; i++) {
        const sp = document.createElement('div');
        sp.className = 'sparkle';
        Object.assign(sp.style, {
          top:              `${rand(0, 60)}%`,
          left:             `${rand(5, 90)}%`,
          animationDuration:`${rand(1.5, 3.5)}s`,
          animationDelay:   `-${rand(0, 3)}s`,
        });
        bar.appendChild(sp);
      }
    },

    wave(bar) {
      const wavePositions = [
        { pct: 30, dur: 3.2, delay: 0.0, height: 14 },
        { pct: 45, dur: 2.8, delay: 0.7, height: 10 },
        { pct: 58, dur: 3.6, delay: 0.3, height: 16 },
        { pct: 70, dur: 2.5, delay: 1.1, height: 12 },
        { pct: 82, dur: 3.0, delay: 0.5, height: 10 },
      ];

      wavePositions.forEach(w => {
        const wave = document.createElement('div');
        wave.className = 'wave-band';
        Object.assign(wave.style, {
          top:              `${w.pct}%`,
          height:           `${w.height}px`,
          animationDuration:`${w.dur}s`,
          animationDelay:   `-${w.delay}s`,
          opacity:          rand(0.5, 0.9),
        });
        bar.appendChild(wave);
      });

      // Foam dots
      for (let i = 0; i < 12; i++) {
        const dot = document.createElement('div');
        dot.className = 'foam-dot';
        const size = rand(3, 8);
        Object.assign(dot.style, {
          width:            `${size}px`,
          height:           `${size}px`,
          top:              `${rand(20, 90)}%`,
          left:             `${rand(5, 85)}%`,
          animationDuration:`${rand(1.5, 3.0)}s`,
          animationDelay:   `-${rand(0, 3)}s`,
        });
        bar.appendChild(dot);
      }
    },

    books(bar) {
      const bookColors = [
        'rgba(180,60,40,0.6)',   // red
        'rgba(50,100,170,0.6)',  // blue
        'rgba(60,130,70,0.6)',   // green
        'rgba(170,120,30,0.6)',  // amber
        'rgba(130,50,130,0.6)',  // purple
        'rgba(200,90,30,0.6)',   // orange
        'rgba(80,80,80,0.55)',   // grey
      ];

      // Three shelves spaced vertically
      const shelfYs = [28, 54, 80]; // % from top
      shelfYs.forEach(yPct => {
        const shelf = document.createElement('div');
        shelf.className = 'shelf-row';
        shelf.style.top = `${yPct}%`;
        bar.appendChild(shelf);

        // Books sitting on each shelf
        const bookCount = randInt(4, 7);
        let leftPos = 5;
        for (let b = 0; b < bookCount; b++) {
          const book = document.createElement('div');
          book.className = 'book';
          const w = randInt(7, 14);
          const h = randInt(22, 38);
          const lean = rand(-3, 3);
          const bob  = rand(-1, 1);

          Object.assign(book.style, {
            width:            `${w}px`,
            height:           `${h}px`,
            left:             `${leftPos}%`,
            // position relative to shelf
            bottom:           '0',
            background:       pick(bookColors),
            border:           '1px solid rgba(0,0,0,0.2)',
            animationDuration:`${rand(3, 6)}s`,
            animationDelay:   `-${rand(0, 4)}s`,
            '--lean':         `${lean}deg`,
            '--bob':          `${bob}px`,
          });
          // Reposition shelf-relative
          book.style.position = 'absolute';
          book.style.bottom = '2px';
          // Convert % left to work within shelf context — use px offset
          book.style.left = `${leftPos}%`;

          shelf.appendChild(book);
          leftPos += (w / 80) * 100 + rand(0.5, 2);
          if (leftPos > 88) break;
        }
      });

      // A few drifting pages
      for (let i = 0; i < 5; i++) {
        const page = document.createElement('div');
        page.className = 'page';
        Object.assign(page.style, {
          top:              `${rand(25, 75)}%`,
          left:             `${rand(10, 75)}%`,
          animationDuration:`${rand(4, 8)}s`,
          animationDelay:   `-${rand(0, 6)}s`,
        });
        bar.appendChild(page);
      }
    },

    xmas(bar, side) {
      const lightColors = [
        'rgba(255,80,80,0.9)',
        'rgba(80,255,80,0.9)',
        'rgba(100,180,255,0.9)',
        'rgba(255,230,50,0.9)',
        'rgba(255,140,0,0.9)',
      ];

      // Two trees per sidebar, staggered vertically
      const treeDefs = [
        { topPct: 12, baseW: 52, layers: 4, sway: 2.8 },
        { topPct: 55, baseW: 44, layers: 3, sway: 3.4 },
      ];

      treeDefs.forEach(td => {
        const treeWrap = document.createElement('div');
        treeWrap.className = 'tree';
        treeWrap.style.position = 'absolute';
        treeWrap.style.top  = `${td.topPct}%`;
        treeWrap.style.left = '50%';
        treeWrap.style.transform = 'translateX(-50%)';
        treeWrap.style.animationDuration = `${td.sway}s`;

        // Calculate total tree height for positioning
        const layerH = 14;
        const totalH = td.layers * layerH + 8;
        treeWrap.style.width  = `${td.baseW}px`;
        treeWrap.style.height = `${totalH}px`;

        // Tree layers (triangles via CSS borders)
        for (let l = 0; l < td.layers; l++) {
          const layer = document.createElement('div');
          layer.className = 'tree-layer';
          const w = Math.round(td.baseW * (0.35 + 0.65 * (l + 1) / td.layers));
          const topFromTree = l * (layerH - 3);
          const green = `rgba(${30 + l * 8}, ${110 + l * 10}, ${30 + l * 5}, 0.75)`;

          Object.assign(layer.style, {
            borderLeftWidth:  `${w / 2}px`,
            borderRightWidth: `${w / 2}px`,
            borderBottomWidth:`${layerH + 4}px`,
            borderBottomColor: green,
            top:              `${topFromTree}px`,
          });
          treeWrap.appendChild(layer);
        }

        // Trunk
        const trunk = document.createElement('div');
        trunk.className = 'tree-trunk';
        Object.assign(trunk.style, {
          width:  '8px',
          height: '8px',
          bottom: '0',
          position: 'absolute',
        });
        treeWrap.appendChild(trunk);

        // Star on top
        const star = document.createElement('div');
        star.className = 'star';
        star.textContent = '★';
        star.style.top = '-10px';
        star.style.animationDuration = `${rand(1.2, 2.0)}s`;
        treeWrap.appendChild(star);

        // Twinkling lights scattered over tree area
        const lightCount = td.layers * 3 + 2;
        for (let li = 0; li < lightCount; li++) {
          const light = document.createElement('div');
          light.className = 'light';
          const color = pick(lightColors);
          Object.assign(light.style, {
            top:              `${rand(10, 85)}%`,
            left:             `${rand(10, 85)}%`,
            background:       color,
            '--light-color':  color,
            animationDuration:`${rand(0.8, 2.5)}s`,
            animationDelay:   `-${rand(0, 2)}s`,
          });
          treeWrap.appendChild(light);
        }

        bar.appendChild(treeWrap);
      });

      // Light snow over trees
      const xmasStyleEl = document.createElement('style');
      let xmasKeyframes = '';
      for (let i = 0; i < 12; i++) {
        const size  = rand(2, 5);
        const drift = rand(-12, 12);
        const dur   = rand(8, 16);
        const delay = rand(0, 14);
        const left  = rand(5, 90);
        const name  = `xmasSnow${Date.now()}_${i}`;

        xmasKeyframes += `
          @keyframes ${name} {
            0%   { transform: translateY(0px) translateX(0px); opacity: 0; }
            5%   { opacity: 0.75; }
            90%  { opacity: 0.4; }
            100% { transform: translateY(110vh) translateX(${drift}px); opacity: 0; }
          }
        `;

        const flake = document.createElement('div');
        flake.className = 'xmas-snow';
        Object.assign(flake.style, {
          width:     `${size}px`,
          height:    `${size}px`,
          left:      `${left}%`,
          animation: `${name} ${dur}s linear -${delay}s infinite`,
          opacity:   '0',
        });
        bar.appendChild(flake);
      }
      xmasStyleEl.textContent = xmasKeyframes;
      document.head.appendChild(xmasStyleEl);
    },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createSidebars);
  } else {
    createSidebars();
  }

})();