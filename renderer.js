/* renderer.js — Set Hunter Three.js pack-opening animation
   Single pack: full 3-D card-flip sequence.
   Multi-pack:  DOM-based quick reveal (no Three.js needed). */

'use strict';

const PackRenderer = (() => {
  /* ── internal state ─────────────────────────────────────── */
  let _renderer = null;
  let _scene    = null;
  let _camera   = null;
  let _rafId    = null;
  let _overlay  = null;
  let _canvas   = null;
  let _multiDiv = null;
  let _collectBtn = null;
  let _skipBtn    = null;
  let _skipRequested = false;
  let _animOnDone = null;

  const RARITY_HEX = {
    common:    0x888899,
    uncommon:  0x2dd86e,
    rare:      0x4499ff,
    legendary: 0xffaa22,
  };

  /* ── easing ──────────────────────────────────────────────── */
  const easeOutCubic    = t => 1 - Math.pow(1 - t, 3);
  const easeInOutQuad   = t => t < .5 ? 2*t*t : -1+(4-2*t)*t;
  const lerp            = (a, b, t) => a + (b - a) * t;

  /* ── canvas texture helpers ──────────────────────────────── */
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  // Always use AI-generated artwork — card mode toggle removed.
  const CARD_IMG_MODE = () => 'artwork';

  // Load a card's art PNG — resolves with Image on success, null on failure
  // Ace cards use assets/aces/, regular cards use assets/cards/
  function _loadCardImg(card) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload  = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = card.rarity === 'ace'
        ? `assets/aces/${card.id}.png`
        : `assets/cards/${card.id}.png`;
    });
  }

  // artImg — optional preloaded Image; if supplied draws it as a circle
  // replacing the emoji, keeping all other card chrome intact.
  function makeCardFrontTex(card, artImg = null) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 360;
    c.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;pointer-events:none;';
    document.body.appendChild(c);
    const cx = c.getContext('2d');

    const BG = { common: '#1d1d27', uncommon: '#0c1e13', rare: '#0c1432', legendary: '#291500', ace: '#1a0800' };
    const BD = { common: '#888899', uncommon: '#2dd86e', rare: '#4499ff', legendary: '#ffaa22',  ace: '#ff8c00' };

    // Background gradient
    const grad = cx.createLinearGradient(0, 0, 256, 360);
    grad.addColorStop(0, BG[card.rarity]);
    grad.addColorStop(1, '#090910');
    cx.fillStyle = grad;
    cx.fillRect(0, 0, 256, 360);

    // Outer border
    cx.strokeStyle = BD[card.rarity];
    cx.lineWidth = 8;
    roundRect(cx, 4, 4, 248, 352, 10);
    cx.stroke();

    // Inner border
    cx.strokeStyle = BD[card.rarity] + '55';
    cx.lineWidth = 2;
    roundRect(cx, 16, 16, 224, 328, 7);
    cx.stroke();

    // Subtle bottom vignette only (no top shine when art image is shown)
    if (!artImg) {
      const shine = cx.createLinearGradient(0, 0, 256, 360);
      shine.addColorStop(0, 'rgba(255,255,255,.09)');
      shine.addColorStop(.55, 'rgba(255,255,255,0)');
      shine.addColorStop(1, 'rgba(0,0,0,.18)');
      cx.fillStyle = shine;
      roundRect(cx, 4, 4, 248, 352, 10);
      cx.fill();
    }

    // ── Name above the image ─────────────────────────────────────
    cx.textAlign    = 'center';
    cx.textBaseline = 'alphabetic';
    cx.font         = 'bold 22px Arial';
    cx.fillStyle    = '#ffffff';
    cx.fillText(card.name, 128, 40);

    // ── Art image as circle OR emoji ─────────────────────────────
    const CX = 128, CY = 155, R = 86;
    if (artImg) {
      // Dark rarity circle base so image whites blend instead of glowing
      cx.save();
      cx.beginPath(); cx.arc(CX, CY, R, 0, Math.PI * 2);
      cx.fillStyle = BG[card.rarity];
      cx.fill();
      cx.restore();
      // Clip + draw at 82% opacity
      cx.save();
      cx.beginPath(); cx.arc(CX, CY, R, 0, Math.PI * 2); cx.clip();
      cx.globalAlpha = 0.82;
      cx.drawImage(artImg, CX - R, CY - R, R * 2, R * 2);
      cx.globalAlpha = 1.0;
      cx.restore();
      // Thin rarity ring
      cx.strokeStyle = BD[card.rarity];
      cx.lineWidth   = 2;
      cx.beginPath(); cx.arc(CX, CY, R + 1, 0, Math.PI * 2); cx.stroke();
    } else {
      cx.fillStyle    = 'white';
      cx.font         = '88px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", serif';
      cx.textAlign    = 'center';
      cx.textBaseline = 'middle';
      cx.fillText(card.emoji, CX, CY);
    }

    // ── Rarity label ─────────────────────────────────────────────
    cx.textAlign    = 'center';
    cx.textBaseline = 'alphabetic';
    cx.font         = 'bold 18px Arial';
    cx.fillStyle    = BD[card.rarity];
    cx.fillText(card.rarity.toUpperCase(), 128, 270);

    // ── Flavor text ───────────────────────────────────────────────
    if (card.flavor) {
      cx.textAlign    = 'center';
      cx.textBaseline = 'alphabetic';
      cx.font         = 'italic 13px Arial';
      cx.fillStyle    = 'rgba(255,255,255,.42)';
      const words = card.flavor.split(' ');
      let line = '', y = 299;
      for (const w of words) {
        const test = line + w + ' ';
        if (cx.measureText(test).width > 210 && line) {
          cx.fillText(line.trim(), 128, y);
          y += 18; line = w + ' ';
        } else { line = test; }
      }
      cx.fillText(line.trim(), 128, y);
    }

    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    document.body.removeChild(c);
    return tex;
  }

  // Per-set card back colours
  const SET_BACK_COLORS = {
    home:    { bg: '#1a0d00', grid: '#2a1800', border: '#c4803a', glow: 'rgba(196,128,58,0.6)'  },
    aquatic: { bg: '#00101e', grid: '#001830', border: '#2288bb', glow: 'rgba(34,136,187,0.6)'  },
    desert:  { bg: '#1a0800', grid: '#2a1000', border: '#cc6622', glow: 'rgba(204,102,34,0.6)'  },
    savanna: { bg: '#001400', grid: '#001c00', border: '#449922', glow: 'rgba(68,153,34,0.6)'   },
  };
  let _setId  = 'home';
  let _setImg = null;    // preloaded HTMLImageElement for the current set

  // Call this before playAnimation to prepare set-specific card back
  function setCurrentSet(setIdStr, callback) {
    _setId  = setIdStr || 'home';
    _setImg = null;
    const img = new Image();
    img.onload  = () => { _setImg = img; callback && callback(); };
    img.onerror = () => {              callback && callback(); };
    img.src = `assets/sets/${_setId}.png`;
  }

  function makeCardBackTex() {
    const col = SET_BACK_COLORS[_setId] || SET_BACK_COLORS.home;
    const c   = document.createElement('canvas');
    c.width = 256; c.height = 360;
    c.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;pointer-events:none;';
    document.body.appendChild(c);
    const cx = c.getContext('2d');

    // Background
    cx.fillStyle = col.bg;
    cx.fillRect(0, 0, 256, 360);

    // Grid lines
    cx.strokeStyle = col.grid;
    cx.lineWidth = 1;
    for (let i = 0; i <= 256; i += 20) {
      cx.beginPath(); cx.moveTo(i, 0); cx.lineTo(i, 360); cx.stroke();
    }
    for (let j = 0; j <= 360; j += 20) {
      cx.beginPath(); cx.moveTo(0, j); cx.lineTo(256, j); cx.stroke();
    }

    // Glowing border
    cx.shadowBlur   = 20;
    cx.shadowColor  = col.glow;
    cx.strokeStyle  = col.border;
    cx.lineWidth    = 7;
    roundRect(cx, 4, 4, 248, 352, 10);
    cx.stroke();
    cx.shadowBlur = 0;

    // Set image (circular) — pulled higher so text has room below
    const imgCY = 128; // centre-Y for the image circle
    if (_setImg) {
      cx.save();
      cx.beginPath();
      cx.arc(128, imgCY, 54, 0, Math.PI * 2);
      cx.closePath();
      cx.clip();
      cx.drawImage(_setImg, 74, imgCY - 54, 108, 108);
      cx.restore();
      cx.strokeStyle = col.border;
      cx.lineWidth   = 2;
      cx.beginPath();
      cx.arc(128, imgCY, 55, 0, Math.PI * 2);
      cx.stroke();
    } else {
      cx.fillStyle    = 'rgba(255,255,255,0.07)';
      cx.beginPath(); cx.arc(128, imgCY, 54, 0, Math.PI * 2); cx.fill();
      cx.fillStyle    = col.border;
      cx.font         = 'bold 18px Arial';
      cx.textAlign    = 'center';
      cx.textBaseline = 'middle';
      cx.fillText('SET HUNTER', 128, imgCY);
    }

    // Title text — well below the image
    cx.font         = 'bold 17px Arial';
    cx.fillStyle    = col.border;
    cx.textAlign    = 'center';
    cx.textBaseline = 'alphabetic';
    cx.fillText('SET HUNTER', 128, 252);

    cx.font      = '10px Arial';
    cx.fillStyle = col.border + '88';
    cx.fillText('TCG COLLECTOR', 128, 270);

    const tex = new THREE.CanvasTexture(c);
    document.body.removeChild(c);
    return tex;
  }

  // Build the sealed-pack mesh texture using the current set's colours and image
  function makePackTex(setName) {
    const col = SET_BACK_COLORS[_setId] || SET_BACK_COLORS.home;
    const c   = document.createElement('canvas');
    c.width = 256; c.height = 360;
    c.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;pointer-events:none;';
    document.body.appendChild(c);
    const cx  = c.getContext('2d');

    // Background gradient using set colours
    const g = cx.createLinearGradient(0, 0, 0, 360);
    g.addColorStop(0,  col.bg);
    g.addColorStop(.5, col.grid);
    g.addColorStop(1,  col.bg);
    cx.fillStyle = g; cx.fillRect(0, 0, 256, 360);

    // Subtle diagonal shine
    const sh = cx.createLinearGradient(0, 0, 256, 0);
    sh.addColorStop(0, 'rgba(255,255,255,.12)');
    sh.addColorStop(.5, 'rgba(255,255,255,0)');
    cx.fillStyle = sh; cx.fillRect(0, 0, 256, 360);

    // Border with glow
    cx.strokeStyle = col.border; cx.lineWidth = 5;
    roundRect(cx, 4, 4, 248, 352, 10); cx.stroke();
    cx.strokeStyle = col.glow;   cx.lineWidth = 2;
    roundRect(cx, 10, 10, 236, 340, 8); cx.stroke();

    // Set image (circular) — same position as card back
    const imgCY = 128;
    if (_setImg) {
      cx.save();
      cx.beginPath();
      cx.arc(128, imgCY, 60, 0, Math.PI * 2);
      cx.closePath();
      cx.clip();
      cx.drawImage(_setImg, 68, imgCY - 60, 120, 120);
      cx.restore();
      cx.strokeStyle = col.border; cx.lineWidth = 2.5;
      cx.beginPath(); cx.arc(128, imgCY, 61, 0, Math.PI * 2); cx.stroke();
    } else {
      cx.fillStyle = 'rgba(255,255,255,.06)';
      cx.beginPath(); cx.arc(128, imgCY, 60, 0, Math.PI * 2); cx.fill();
    }

    // Title and set label below image
    cx.font         = 'bold 20px Arial';
    cx.fillStyle    = col.border;
    cx.textAlign    = 'center';
    cx.textBaseline = 'alphabetic';
    cx.fillText('SET HUNTER', 128, 255);

    cx.font      = '12px Arial';
    cx.fillStyle = col.border + '99';
    const label  = setName.length > 16 ? setName.slice(0, 14) + '…' : setName;
    cx.fillText(label.toUpperCase(), 128, 275);

    cx.font      = 'bold 11px Arial';
    cx.fillStyle = col.border + '66';
    cx.fillText('5 CARDS', 128, 295);

    const tex = new THREE.CanvasTexture(c);
    document.body.removeChild(c);
    return tex;
  }

  /* ── Three.js card mesh ──────────────────────────────────── */
  function makeCardMesh(card, frontTex) {
    if (!frontTex) frontTex = makeCardFrontTex(card);
    const backTex  = makeCardBackTex();
    // MeshBasicMaterial: texture only, no lighting highlights
    const sideMat  = new THREE.MeshBasicMaterial({ color: 0x111122 });

    const mats = [
      sideMat, sideMat, sideMat, sideMat,
      new THREE.MeshBasicMaterial({ map: frontTex }),
      new THREE.MeshBasicMaterial({ map: backTex }),
    ];

    const geo  = new THREE.BoxGeometry(1.8, 2.52, 0.022);
    const mesh = new THREE.Mesh(geo, mats);

    // Glow light for rare / legendary
    if (card.rarity === 'rare' || card.rarity === 'legendary') {
      const light = new THREE.PointLight(RARITY_HEX[card.rarity], 3, 6);
      light.position.set(0, 0, 1);
      mesh.add(light);
    }
    return mesh;
  }

  function makePackMesh(setName) {
    const tex  = makePackTex(setName);
    const mats = [
      new THREE.MeshPhongMaterial({ color: 0x1a0a3e }),
      new THREE.MeshPhongMaterial({ color: 0x1a0a3e }),
      new THREE.MeshPhongMaterial({ color: 0x1a0a3e }),
      new THREE.MeshPhongMaterial({ color: 0x1a0a3e }),
      new THREE.MeshPhongMaterial({ map: tex }),
      new THREE.MeshPhongMaterial({ map: tex }),
    ];
    return new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.52, 0.12), mats);
  }

  /* ── scene helpers ───────────────────────────────────────── */
  function resetScene() {
    while (_scene.children.length) _scene.remove(_scene.children[0]);
    _scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(3, 5, 6); _scene.add(key);
    const fill = new THREE.DirectionalLight(0x8844ff, 0.4);
    fill.position.set(-3, -2, 3); _scene.add(fill);
  }

  /* ── Three.js availability check ───────────────────────────── */
  function hasThree() {
    return typeof THREE !== 'undefined';
  }

  /* ── init Three.js ───────────────────────────────────────── */
  function init() {
    _canvas     = document.getElementById('pack-canvas');
    _overlay    = document.getElementById('pack-overlay');
    _multiDiv   = document.getElementById('multi-reveal');
    _collectBtn = document.getElementById('btn-collect-cards');
    _skipBtn    = document.getElementById('btn-skip-anim');

    if (!hasThree() || _renderer) return;

    const W = Math.min(window.innerWidth * 0.92, 820);
    const H = Math.min(window.innerHeight * 0.68, 640);

    try {
      _renderer = new THREE.WebGLRenderer({ canvas: _canvas, antialias: true, alpha: true });
      _renderer.setSize(W, H);
      _renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      _renderer.setClearColor(0x000000, 0);
      _scene  = new THREE.Scene();
      _camera = new THREE.PerspectiveCamera(54, W / H, 0.1, 100);
      _camera.position.set(0, 0, 9.5);
      resetScene();
    } catch (e) {
      console.warn('[PackRenderer] Three.js init failed, falling back to DOM reveal.', e);
      _renderer = null;
    }
  }

  function stopRaf() {
    if (_rafId !== null) { cancelAnimationFrame(_rafId); _rafId = null; }
  }

  /* ── Legendary particle ring ────────────────────────────── */
  let _particles = [];
  const _fitBox    = new THREE.Box3();
  const _fitCenter = new THREE.Vector3();
  const _fitSize   = new THREE.Vector3();
  const _fitEye    = new THREE.Vector3();
  const _fitPtA    = new THREE.Vector3();
  const _fitPtB    = new THREE.Vector3();

  function clearParticleMeshes() {
    if (!_scene) return;
    for (let i = 0; i < _particles.length; i++) _scene.remove(_particles[i]);
    _particles = [];
  }

  /** Stable framing while the pack moves/scales — avoids zoom bumps from Box3 on a jittery AABB. */
  function applyStaticPackCamera(shakeX) {
    if (!_camera) return;
    _fitCenter.set(0, -0.12, 0);
    _fitEye.set(shakeX, 0.4, 7.5);
    _camera.position.copy(_fitEye);
    _camera.lookAt(_fitCenter);
  }

  /**
   * Fit camera from card *positions* + fixed card extents (matches BoxGeometry 1.8×2.52).
   * Ignores rotation so Y-flip animation does not change the box — no zoom bumps.
   */
  function computeCardCameraFit(cardMeshes, shakeX) {
    if (!_camera || !cardMeshes.length) return false;
    const halfW = 0.9, halfH = 1.26, halfD = 0.06;
    _fitBox.makeEmpty();
    for (let i = 0; i < cardMeshes.length; i++) {
      const m = cardMeshes[i];
      const x = m.position.x, y = m.position.y, z = m.position.z;
      _fitPtA.set(x - halfW, y - halfH, z - halfD);
      _fitPtB.set(x + halfW, y + halfH, z + halfD);
      _fitBox.expandByPoint(_fitPtA);
      _fitBox.expandByPoint(_fitPtB);
    }
    _fitBox.expandByScalar(0.55);
    _fitBox.getCenter(_fitCenter);
    _fitBox.getSize(_fitSize);
    const fov = (_camera.fov * Math.PI) / 180;
    const tanHalf = Math.tan(fov / 2);
    const distV = (_fitSize.y / 2) / tanHalf;
    const distH = (_fitSize.x / 2) / (tanHalf * Math.max(_camera.aspect, 0.01));
    const dist  = Math.max(distV, distH, 2.5) + 0.45;
    _fitEye.set(_fitCenter.x + shakeX, _fitCenter.y, _fitCenter.z + dist);
    return true;
  }

  function applyPackCameraFit(elapsed, cardMeshes, shakeX, camEyeSm, camAtSm, camSmoothReady) {
    if (!_camera) return;
    if (elapsed < 950) {
      applyStaticPackCamera(shakeX);
      return;
    }
    if (!computeCardCameraFit(cardMeshes, shakeX)) {
      applyStaticPackCamera(shakeX);
      return;
    }
    const idealEye = _fitEye;
    const idealAt  = _fitCenter;
    if (!camSmoothReady.value) {
      camEyeSm.copy(_camera.position);
      camAtSm.set(0, -0.12, 0);
      camSmoothReady.value = true;
    }
    camEyeSm.lerp(idealEye, 0.22);
    camAtSm.lerp(idealAt, 0.22);
    _camera.position.copy(camEyeSm);
    _camera.lookAt(camAtSm);
  }

  function spawnLegendaryParticles() {
    if (!_scene) return;
    const geo  = new THREE.PlaneGeometry(0.18, 0.18);
    const mat  = new THREE.MeshBasicMaterial({ color: 0xffaa22, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
    for (let i = 0; i < 12; i++) {
      const p = new THREE.Mesh(geo, mat.clone());
      const angle = (i / 12) * Math.PI * 2;
      p.position.set(Math.cos(angle) * 0.4, Math.sin(angle) * 0.6, 0.1);
      p.userData.angle  = angle;
      p.userData.speed  = 0.025 + Math.random() * 0.015;
      p.userData.born   = performance.now();
      p.userData.aceBurst = false;
      _scene.add(p);
      _particles.push(p);
    }
  }

  /** Bigger burst: gold / amber / white — for Ace reveal only */
  function spawnAceParticles() {
    if (!_scene) return;
    const geo = new THREE.PlaneGeometry(0.22, 0.22);
    const cols = [0xffd700, 0xffaa22, 0xffee88, 0xff6a00, 0xffffff];
    const n = 16;
    for (let i = 0; i < n; i++) {
      const c = cols[i % cols.length];
      const mat = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.95, side: THREE.DoubleSide });
      const p = new THREE.Mesh(geo, mat);
      const angle = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      const r0 = 0.35 + Math.random() * 0.2;
      p.position.set(Math.cos(angle) * r0, Math.sin(angle) * r0 * 1.1 + 0.35, 0.15 + Math.random() * 0.1);
      p.userData.angle = angle;
      p.userData.born  = performance.now();
      p.userData.aceBurst = true;
      _scene.add(p);
      _particles.push(p);
    }
  }

  function tickParticles(elapsed) {
    _particles = _particles.filter(p => {
      const age = (performance.now() - p.userData.born) / 1000;
      const maxAge = p.userData.aceBurst ? 1.35 : 0.9;
      if (age > maxAge) { _scene.remove(p); return false; }
      const spread = p.userData.aceBurst ? 5.2 : 3.5;
      const r = (p.userData.aceBurst ? 0.35 : 0.4) + age * spread;
      p.position.x = Math.cos(p.userData.angle) * r;
      p.position.y = Math.sin(p.userData.angle) * r * (p.userData.aceBurst ? 1.55 : 1.4) + (p.userData.aceBurst ? age * 0.6 : 0);
      p.material.opacity = Math.max(0, (p.userData.aceBurst ? 0.95 : 0.9) - age * 0.72);
      p.scale.setScalar(1 - age * (p.userData.aceBurst ? 0.55 : 0.8));
      return true;
    });
  }

  /* ── 3-D pack animation (single pack) ──────────────────── */
  function playAnimation(cards, setName, onDone) {
    init();
    if (!_renderer) { playQuickReveal(cards, 1, onDone); return; }

    // Warm up the emoji glyph cache on a full-sized canvas so the browser
    // actually renders the glyphs (1×1 warmup canvases draw outside bounds).
    const warmUp = document.createElement('canvas');
    warmUp.width = 256; warmUp.height = 360;
    const wctx = warmUp.getContext('2d');
    wctx.font = '88px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", serif';
    wctx.textAlign = 'center';
    wctx.textBaseline = 'middle';
    cards.forEach(c => wctx.fillText(c.emoji, 128, 180));

    // Wait for fonts + a small buffer, then pre-build ALL card front textures
    // immediately while the glyph cache is hot.  We pass the textures into
    // _startAnimation so makeCardFrontTex is never called during the tick loop.
    Promise.all([
      document.fonts.ready,
      document.fonts.load('88px "Apple Color Emoji"').catch(() => {}),
      document.fonts.load('88px "Segoe UI Emoji"').catch(() => {}),
      document.fonts.load('88px "Noto Color Emoji"').catch(() => {}),
    ])
    .then(() => new Promise(r => setTimeout(r, 120)))
    .then(() => {
      // Ensure the set-back image is loaded before building any card mesh
      const ensureSetImg = () => {
        if (_setImg) return Promise.resolve();
        return new Promise(resolve => {
          const img = new Image();
          img.onload  = () => { _setImg = img; resolve(); };
          img.onerror = () => resolve();
          img.src = `assets/sets/${_setId}.png`;
        });
      };

      const buildAndStart = (frontTextures) =>
        ensureSetImg().then(() => _startAnimation(cards, setName, onDone, frontTextures));

      if (CARD_IMG_MODE() === 'artwork') {
        Promise.all(cards.map(c => _loadCardImg(c).then(img => makeCardFrontTex(c, img))))
          .then(textures => buildAndStart(textures));
      } else {
        const frontTextures = cards.map(c => makeCardFrontTex(c));
        buildAndStart(frontTextures);
      }
    });
  }

  function _startAnimation(cards, setName, onDone, frontTextures) {
    resetScene();
    stopRaf();
    _particles = [];
    if (_camera) _camera.rotation.set(0, 0, 0);

    _skipRequested = false;
    _animOnDone   = onDone;

    _canvas.classList.remove('hidden');
    _multiDiv.classList.add('hidden');
    _collectBtn.classList.add('hidden');
    _skipBtn.classList.remove('hidden');
    _overlay.classList.remove('hidden');

    const cardMeshes = [];
    const packMesh   = makePackMesh(setName);
    _scene.add(packMesh);

    let doneFired = false;
    let shakeActive = false;
    let shakeStart = 0;
    let shakeIsAce = false;
    let packShakeSoundPlayed = false;
    let packOpenSoundPlayed = false;
    const camEyeSm = new THREE.Vector3();
    const camAtSm = new THREE.Vector3();
    const camSmoothReady = { value: false };
    const t0 = performance.now();

    const tick = () => {
      const elapsed = performance.now() - t0;

      if (_skipRequested && !doneFired) {
        doneFired = true;
        stopRaf();
        clearParticleMeshes();
        _skipBtn.classList.add('hidden');
        _overlay.classList.add('hidden');
        onDone && onDone();
        return;
      }

      /* ── Simulation (all phases) — run before camera / render ───────── */
      if (elapsed < 650) {
        const p = elapsed / 650;
        if (!packShakeSoundPlayed && p >= 0.3) {
          packShakeSoundPlayed = true;
          Sounds.play('packShake');
        }
        packMesh.position.y = lerp(-3.5, 0, easeOutCubic(Math.min(p * 1.6, 1)));
        packMesh.rotation.z = p > 0.3
          ? Math.sin(elapsed * 0.045) * 0.06 * (1 - (p - 0.3) / 0.7)
          : 0;
      } else if (elapsed < 950) {
        const p = (elapsed - 650) / 300;
        const mats = Array.isArray(packMesh.material) ? packMesh.material : [packMesh.material];
        mats.forEach(m => { m.transparent = true; m.opacity = lerp(1, 0, p); });
        packMesh.scale.setScalar(lerp(1, 1.35, p));
      } else {
        if (cardMeshes.length === 0) {
          if (!packOpenSoundPlayed) {
            packOpenSoundPlayed = true;
            Sounds.play('packOpen');
          }
          _scene.remove(packMesh);
          const n = cards.length;
          const aceCount = cards.filter(c => c.rarity === 'ace').length;
          const regCount = n - aceCount;
          const span = 7.2;
          const regXs = regCount <= 0 ? []
            : regCount === 1 ? [0]
            : Array.from({ length: regCount }, (_, j) => -span / 2 + (j / (regCount - 1)) * span);
          let r = 0;
          let flipSlot = 0;
          const lastFlip = n - 1;
          cards.forEach((card, i) => {
            const mesh = makeCardMesh(card, frontTextures && frontTextures[i]);
            mesh.position.set(0, 0, 0);
            mesh.rotation.y = Math.PI;
            const isAce = card.rarity === 'ace';
            if (isAce) {
              mesh.userData.targetX = 0;
              mesh.userData.targetY = 2.65;
              mesh.userData.targetZ = 0.38;
              mesh.userData.spreadTilt = 0;
              mesh.userData.flipOrder = lastFlip;
            } else {
              mesh.userData.targetX = regXs[r++] ?? 0;
              mesh.userData.targetY = 0;
              mesh.userData.targetZ = 0;
              const mid = (regCount - 1) / 2;
              mesh.userData.spreadTilt = regCount ? (r - 1 - mid) * 0.04 : 0;
              mesh.userData.flipOrder = flipSlot++;
            }
            mesh.userData.card            = card;
            mesh.userData.flipEffectsDone = false;
            _scene.add(mesh);
            cardMeshes.push(mesh);
          });
        }

        if (elapsed < 1600) {
          const p = (elapsed - 950) / 650;
          cardMeshes.forEach((mesh) => {
            mesh.position.x = lerp(0, mesh.userData.targetX, easeOutCubic(p));
            mesh.position.y = lerp(0, mesh.userData.targetY || 0, easeOutCubic(p));
            mesh.position.z = lerp(0, mesh.userData.targetZ || 0, easeOutCubic(p));
            mesh.rotation.z = lerp(0, mesh.userData.spreadTilt || 0, p);
          });
        } else {
          cardMeshes.forEach((mesh) => {
            const ord = mesh.userData.flipOrder;
            const flipStart = 1600 + ord * 420;
            const flipEnd   = flipStart + 580;
            const flipMid   = flipStart + (flipEnd - flipStart) * 0.5;

            if (elapsed >= flipStart) {
              if (elapsed >= flipEnd) {
                mesh.rotation.y = 0;
              } else {
                const fp = (elapsed - flipStart) / (flipEnd - flipStart);
                mesh.rotation.y = lerp(Math.PI, 0, easeInOutQuad(fp));
              }

              if (elapsed >= flipMid && !mesh.userData.flipEffectsDone) {
                mesh.userData.flipEffectsDone = true;
                const rarity = mesh.userData.card.rarity;
                const isLeg  = rarity === 'legendary';
                const isAce  = rarity === 'ace';
                if (isAce) {
                  Sounds.play('ace');
                  spawnAceParticles();
                  shakeIsAce = true;
                } else if (isLeg) {
                  Sounds.play('legendary');
                  spawnLegendaryParticles();
                } else {
                  Sounds.play('cardFlip');
                }
                if (isLeg || isAce) {
                  shakeActive = true;
                  shakeStart  = elapsed;
                  Sounds.setAmbientState('hype');
                }
              }
            }
          });
        }
      }

      let shakeX = 0;
      if (shakeActive) {
        const shakeAge = (elapsed - shakeStart) / 1000;
        const dur = shakeIsAce ? 0.88 : 0.5;
        const amp = shakeIsAce ? 0.13 : 0.08;
        const freq = shakeIsAce ? 48 : 40;
        if (shakeAge < dur) {
          const damp = 1 - shakeAge / dur;
          shakeX = Math.sin(shakeAge * freq) * amp * damp;
        } else {
          shakeActive = false;
          shakeIsAce = false;
        }
      }

      const allDoneAt = 1600 + (cards.length - 1) * 420 + 580 + 350;

      if (elapsed >= allDoneAt && !doneFired) {
        doneFired = true;
        stopRaf();
        clearParticleMeshes();
        tickParticles(elapsed);
        _renderer.render(_scene, _camera);
        _skipBtn.classList.add('hidden');
        _collectBtn.classList.remove('hidden');
        _collectBtn.onclick = () => {
          _overlay.classList.add('hidden');
          _collectBtn.classList.add('hidden');
          onDone && onDone();
        };
        return;
      }

      applyPackCameraFit(elapsed, cardMeshes, shakeX, camEyeSm, camAtSm, camSmoothReady);
      tickParticles(elapsed);
      _renderer.render(_scene, _camera);
      _rafId = requestAnimationFrame(tick);
    };

    _rafId = requestAnimationFrame(tick);
    _skipBtn.onclick = () => { _skipRequested = true; };
  }

  // stub so old call sites still work (the real work is in _startAnimation)
  // (playAnimation is already updated above)

  /* ── DOM quick-reveal (multi-pack) ──────────────────────── */
  function playQuickReveal(allCards, packCount, onDone) {
    init();
    stopRaf();

    _canvas.classList.add('hidden');
    _multiDiv.classList.remove('hidden');
    _collectBtn.classList.add('hidden');
    _skipBtn.classList.add('hidden');
    _overlay.classList.remove('hidden');

    document.getElementById('multi-reveal-title').textContent =
      `${packCount} Pack${packCount > 1 ? 's' : ''} — ${allCards.length} Cards`;

    const grid = document.getElementById('multi-reveal-grid');
    grid.innerHTML = '';

    const artMode = CARD_IMG_MODE() === 'artwork';

    // Split allCards back into per-pack groups (packs may have 5 or 6 cards due to aces)
    const packGroups = [];
    let idx = 0;
    for (let p = 0; p < packCount; p++) {
      // Take up to 6 cards per pack (ace may appear as slot 6)
      const group = [];
      while (idx < allCards.length && group.length < 6) {
        group.push(allCards[idx++]);
        // Stop at 5 unless the next card is an ace
        if (group.length === 5 && allCards[idx]?.rarity !== 'ace') break;
      }
      packGroups.push(group);
    }

    let slotIdx = 0;
    for (let p = 0; p < packGroups.length; p++) {
      const group = packGroups[p];
      const row = document.createElement('div');
      row.className = 'reveal-row';
      for (let c = 0; c < group.length; c++) {
        const card  = group[c];
        const delay = (slotIdx++) * 40;
        const el    = document.createElement('div');
        el.className = `card-item reveal-card rarity-${card.rarity}`;
        el.style.animationDelay = `${delay}ms`;
        const isAce = card.rarity === 'ace';
        const imgSrc = isAce
          ? `assets/aces/${card.id}.png`
          : `assets/cards/${card.id}.png`;
        const emojiSlot = artMode
          ? `<img src="${imgSrc}" class="card-art-img" alt="${card.name}" onerror="this.style.display='none';this.nextSibling.style.display='block'">`
              + `<span style="display:none;font-size:28px">${card.emoji}</span>`
          : card.emoji;
        el.innerHTML = `
          <div class="card-bg"></div>
          <div class="card-border"></div>
          <div class="card-content">
            ${isAce ? '<div class="ace-badge">ACE</div>' : ''}
            <div class="card-emoji">${emojiSlot}</div>
            <div class="card-name">${card.name}</div>
            <div class="card-dot"></div>
          </div>`;
        row.appendChild(el);
      }
      grid.appendChild(row);
    }

    // Sounds for the best card in each pack
    allCards.forEach((card, i) => {
      const delay = i * 40;
      setTimeout(() => {
        if (card.rarity === 'ace')       Sounds.play('ace');
        else if (card.rarity === 'legendary') Sounds.play('legendary');
        else if (card.rarity === 'rare') Sounds.play('cardFlip');
      }, delay);
    });

    const totalDelay = packCount * 5 * 40 + 400;
    setTimeout(() => {
      _collectBtn.classList.remove('hidden');
      _collectBtn.onclick = () => {
        _overlay.classList.add('hidden');
        _collectBtn.classList.add('hidden');
        onDone && onDone();
      };
    }, totalDelay);
  }

  /* ── public API ──────────────────────────────────────────── */
  return { init, playAnimation, playQuickReveal, setCurrentSet };
})();
