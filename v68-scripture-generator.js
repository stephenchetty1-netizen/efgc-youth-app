(() => {
  'use strict';

  const VERSION = '68.0';
  const VERSES = [
    { ref:'Matthew 5:16', text:'Let your light so shine before men, that they may see your good works, and glorify your Father which is in heaven.' },
    { ref:'Philippians 4:13', text:'I can do all things through Christ which strengtheneth me.' },
    { ref:'Psalm 119:105', text:'Thy word is a lamp unto my feet, and a light unto my path.' },
    { ref:'Isaiah 40:31', text:'But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.' },
    { ref:'Joshua 1:9', text:'Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.' },
    { ref:'Psalm 46:10', text:'Be still, and know that I am God: I will be exalted among the heathen, I will be exalted in the earth.' },
    { ref:'Romans 8:28', text:'And we know that all things work together for good to them that love God, to them who are the called according to his purpose.' },
    { ref:'Jeremiah 29:11', text:'For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.' },
    { ref:'Isaiah 41:10', text:'Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness.' },
    { ref:'Proverbs 3:5–6', text:'Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.' },
    { ref:'Psalm 23:1', text:'The LORD is my shepherd; I shall not want.' },
    { ref:'Psalm 34:8', text:'O taste and see that the LORD is good: blessed is the man that trusteth in him.' },
    { ref:'1 Peter 5:7', text:'Casting all your care upon him; for he careth for you.' },
    { ref:'John 14:6', text:'Jesus saith unto him, I am the way, the truth, and the life: no man cometh unto the Father, but by me.' },
    { ref:'2 Timothy 1:7', text:'For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind.' },
    { ref:'Hebrews 11:1', text:'Now faith is the substance of things hoped for, the evidence of things not seen.' },
    { ref:'Psalm 56:3', text:'What time I am afraid, I will trust in thee.' },
    { ref:'Psalm 118:24', text:'This is the day which the LORD hath made; we will rejoice and be glad in it.' },
    { ref:'Jeremiah 33:3', text:'Call unto me, and I will answer thee, and shew thee great and mighty things, which thou knowest not.' },
    { ref:'Psalm 27:1', text:'The LORD is my light and my salvation; whom shall I fear? the LORD is the strength of my life; of whom shall I be afraid?' },
    { ref:'Romans 10:9', text:'That if thou shalt confess with thy mouth the Lord Jesus, and shalt believe in thine heart that God hath raised him from the dead, thou shalt be saved.' },
    { ref:'John 3:16', text:'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.' },
    { ref:'Psalm 37:5', text:'Commit thy way unto the LORD; trust also in him; and he shall bring it to pass.' },
    { ref:'Romans 15:13', text:'Now the God of hope fill you with all joy and peace in believing, that ye may abound in hope, through the power of the Holy Ghost.' }
  ];

  const THEMES = [
    { id:'cross', label:'Cross', image:'assets/v49-sunrise.webp', accent:'#ffd266', symbol:'cross', tagline:'CHRIST OUR HOPE' },
    { id:'bible', label:'Bible', image:'assets/efgc-home-hero.webp', accent:'#f4d06f', symbol:'bible', tagline:'HIS WORD • OUR LIGHT' },
    { id:'prayer', label:'Prayer', image:'assets/v49-sunrise.webp', accent:'#e7f3ff', symbol:'prayer', tagline:'PRAY • TRUST • BELIEVE' },
    { id:'worship', label:'Worship', image:'assets/v49-youth-fellowship.webp', accent:'#ffd86a', symbol:'worship', tagline:'WORSHIP IN SPIRIT & TRUTH' },
    { id:'church', label:'Church', image:'assets/efgc-logo-reference.webp', accent:'#d9ecff', symbol:'church', tagline:'BUILD • BELONG • BE A LIGHT' }
  ];

  const state = { verseIndex: 0, themeIndex: 0, busy: false, imageCache: new Map() };

  const el = (id) => document.getElementById(id);
  const escapeHtmlLocal = (value='') => String(value).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function dateSeed() {
    const now = new Date();
    return Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);
  }

  function todaySelection() {
    const seed = dateSeed();
    state.verseIndex = ((seed % VERSES.length) + VERSES.length) % VERSES.length;
    state.themeIndex = (((seed * 7) + 3) % THEMES.length + THEMES.length) % THEMES.length;
  }

  function secureRandom(max) {
    if (window.crypto?.getRandomValues) {
      const n = new Uint32Array(1);
      window.crypto.getRandomValues(n);
      return n[0] % max;
    }
    return Math.floor(Math.random() * max);
  }

  function currentVerse() { return VERSES[state.verseIndex]; }
  function currentTheme() { return THEMES[state.themeIndex]; }

  function homeMarkup() {
    const verse = currentVerse();
    const theme = currentTheme();
    return `<article class="card scripture-card scripture-home-v68" style="--scripture-bg:url('${theme.image}')">
      <div class="scripture-home-overlay">
        <small>DAILY SCRIPTURE • KJV</small>
        <h3>${escapeHtmlLocal(verse.ref)}</h3>
        <p>${escapeHtmlLocal(verse.text)}</p>
        <button type="button" class="scripture-open-button" data-tab="scripture">Create Scripture Image →</button>
      </div>
    </article>`;
  }

  function generatorMarkup() {
    const themeButtons = THEMES.map((theme, index) =>
      `<button type="button" class="scripture-theme ${index === state.themeIndex ? 'active' : ''}" data-scripture-theme="${index}" aria-pressed="${index === state.themeIndex}">
        <span class="scripture-theme-thumb" style="background-image:linear-gradient(#06214a55,#06214a88),url('${theme.image}')"></span>
        <span>${escapeHtmlLocal(theme.label)}</span>
      </button>`
    ).join('');

    const verseOptions = VERSES.map((verse, index) =>
      `<option value="${index}" ${index === state.verseIndex ? 'selected' : ''}>${escapeHtmlLocal(verse.ref)}</option>`
    ).join('');

    return `<div class="scripture-generator-v68">
      <div class="scripture-generator-heading">
        <span class="scripture-kicker">EFGC YOUTH • DAILY FAITH</span>
        <h2>Daily Scripture Generator</h2>
        <p>Create a beautiful Christian scripture image for today. All visual themes are faith-based and use approved EFGC app artwork.</p>
      </div>

      <div class="scripture-generator-layout">
        <section class="scripture-preview-panel" aria-label="Scripture image preview">
          <div class="scripture-canvas-shell">
            <canvas id="scripturePosterCanvas" width="1080" height="1350" aria-label="Generated daily scripture poster"></canvas>
            <div id="scriptureRenderStatus" class="scripture-render-status" aria-live="polite">Preparing today’s scripture…</div>
          </div>
        </section>

        <section class="scripture-controls-panel">
          <div class="scripture-control-card">
            <label for="scriptureVerseSelect"><strong>Scripture</strong></label>
            <select id="scriptureVerseSelect">${verseOptions}</select>
            <div class="scripture-inline-actions">
              <button id="scriptureTodayButton" type="button" class="scripture-secondary">Today</button>
              <button id="scriptureRandomButton" type="button" class="scripture-primary">✦ Generate New</button>
            </div>
          </div>

          <div class="scripture-control-card">
            <strong>Christian image style</strong>
            <div class="scripture-theme-grid">${themeButtons}</div>
          </div>

          <div class="scripture-control-card scripture-share-card">
            <strong>Use your scripture image</strong>
            <div class="scripture-action-grid">
              <button id="scriptureDownloadButton" type="button" class="scripture-primary">Download Image</button>
              <button id="scriptureShareButton" type="button" class="scripture-secondary">Share</button>
              <button id="scriptureCopyButton" type="button" class="scripture-secondary">Copy Verse</button>
            </div>
            <p id="scriptureActionMessage" class="scripture-action-message" aria-live="polite"></p>
          </div>

          <div class="scripture-safety-note">KJV • EFGC Youth • Christian visual themes only</div>
        </section>
      </div>
    </div>`;
  }

  function drawCover(ctx, img, width, height) {
    const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
  }

  function roundedRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function drawThemeSymbol(ctx, theme, x, y) {
    ctx.save();
    ctx.strokeStyle = theme.accent;
    ctx.fillStyle = theme.accent;
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (theme.symbol === 'cross') {
      ctx.fillRect(x + 54, y, 22, 150);
      ctx.fillRect(x, y + 44, 130, 22);
    } else if (theme.symbol === 'bible') {
      ctx.beginPath();
      ctx.moveTo(x, y + 20); ctx.quadraticCurveTo(x + 54, y, x + 62, y + 30);
      ctx.lineTo(x + 62, y + 126); ctx.quadraticCurveTo(x + 34, y + 98, x, y + 112); ctx.closePath(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 62, y + 30); ctx.quadraticCurveTo(x + 106, y, x + 132, y + 20);
      ctx.lineTo(x + 132, y + 112); ctx.quadraticCurveTo(x + 98, y + 98, x + 62, y + 126); ctx.stroke();
    } else if (theme.symbol === 'prayer') {
      ctx.font = '800 48px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PRAY', x + 64, y + 82);
      ctx.beginPath(); ctx.moveTo(x + 10, y + 105); ctx.lineTo(x + 118, y + 105); ctx.stroke();
    } else if (theme.symbol === 'worship') {
      ctx.font = '700 96px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('♪', x + 66, y + 100);
      [0,1,2].forEach((i) => {
        const a = (-0.65 + i * 0.65);
        ctx.beginPath();
        ctx.moveTo(x + 66, y + 18);
        ctx.lineTo(x + 66 + Math.cos(a) * 70, y + 18 + Math.sin(a) * 70);
        ctx.stroke();
      });
    } else {
      ctx.beginPath();
      ctx.arc(x + 66, y + 64, 50, Math.PI, 0);
      ctx.moveTo(x + 16, y + 64); ctx.lineTo(x + 16, y + 126);
      ctx.moveTo(x + 116, y + 64); ctx.lineTo(x + 116, y + 126);
      ctx.moveTo(x + 6, y + 126); ctx.lineTo(x + 126, y + 126);
      ctx.stroke();
      ctx.fillRect(x + 58, y + 18, 16, 78);
      ctx.fillRect(x + 36, y + 41, 60, 16);
    }
    ctx.restore();
  }

  function wrapText(ctx, text, maxWidth) {
    const words = text.split(/\s+/);
    const lines = [];
    let line = '';
    words.forEach((word) => {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    });
    if (line) lines.push(line);
    return lines;
  }

  function loadImage(src) {
    if (state.imageCache.has(src)) return state.imageCache.get(src);
    const promise = new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Could not load ${src}`));
      img.src = src;
    });
    state.imageCache.set(src, promise);
    return promise;
  }

  async function renderPoster() {
    if (state.busy) return;
    const canvas = el('scripturePosterCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    state.busy = true;
    const status = el('scriptureRenderStatus');
    if (status) status.textContent = 'Generating scripture image…';

    const verse = currentVerse();
    const theme = currentTheme();
    const W = canvas.width;
    const H = canvas.height;

    try {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#052650';
      ctx.fillRect(0, 0, W, H);

      try {
        const bg = await loadImage(theme.image);
        drawCover(ctx, bg, W, H);
      } catch (_) {
        const fallback = ctx.createLinearGradient(0, 0, W, H);
        fallback.addColorStop(0, '#063b80');
        fallback.addColorStop(1, '#031328');
        ctx.fillStyle = fallback;
        ctx.fillRect(0, 0, W, H);
      }

      const overlay = ctx.createLinearGradient(0, 0, 0, H);
      overlay.addColorStop(0, 'rgba(1,18,43,.18)');
      overlay.addColorStop(.45, 'rgba(1,18,43,.52)');
      overlay.addColorStop(1, 'rgba(1,15,36,.94)');
      ctx.fillStyle = overlay;
      ctx.fillRect(0, 0, W, H);

      const sideGlow = ctx.createLinearGradient(0, 0, W, 0);
      sideGlow.addColorStop(0, 'rgba(3,31,70,.80)');
      sideGlow.addColorStop(.72, 'rgba(3,31,70,.05)');
      ctx.fillStyle = sideGlow;
      ctx.fillRect(0, 0, W, H);

      roundedRect(ctx, 64, 62, 362, 64, 32);
      ctx.fillStyle = 'rgba(2,26,59,.70)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.22)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '800 27px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('EFGC YOUTH', 92, 104);
      ctx.fillStyle = theme.accent;
      ctx.fillText('• DAILY SCRIPTURE', 252, 104);

      drawThemeSymbol(ctx, theme, W - 220, 76);

      ctx.fillStyle = theme.accent;
      ctx.font = '800 30px system-ui, sans-serif';
      ctx.letterSpacing = '3px';
      ctx.fillText(verse.ref.toUpperCase(), 72, 420);

      ctx.fillStyle = 'rgba(255,255,255,.92)';
      ctx.fillRect(72, 446, 104, 8);

      let fontSize = verse.text.length > 155 ? 54 : verse.text.length > 110 ? 61 : 70;
      let lines = [];
      do {
        ctx.font = `700 ${fontSize}px Georgia, serif`;
        lines = wrapText(ctx, `“${verse.text}”`, 900);
        if (lines.length > 8) fontSize -= 3;
        else break;
      } while (fontSize > 44);

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const lineHeight = Math.round(fontSize * 1.22);
      let y = 500;
      lines.forEach((line) => {
        ctx.fillText(line, 72, y);
        y += lineHeight;
      });

      ctx.fillStyle = 'rgba(255,255,255,.72)';
      ctx.font = '700 25px system-ui, sans-serif';
      ctx.fillText(theme.tagline, 72, H - 178);

      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(72, H - 130);
      ctx.lineTo(176, H - 130);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '800 27px system-ui, sans-serif';
      ctx.fillText('EMMANUEL FULL GOSPEL CHURCH', 72, H - 92);

      ctx.fillStyle = 'rgba(255,255,255,.72)';
      ctx.font = '500 21px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('KJV • PASS ON THE BATON', W - 72, H - 91);

      if (status) {
        status.textContent = 'Scripture image ready';
        setTimeout(() => { if (status.textContent === 'Scripture image ready') status.textContent = ''; }, 1400);
      }
    } catch (err) {
      console.error('EFGC scripture generator', err);
      if (status) status.textContent = 'Could not render the image. Please try again.';
    } finally {
      state.busy = false;
    }
  }

  function setTheme(index) {
    state.themeIndex = Number(index);
    document.querySelectorAll('[data-scripture-theme]').forEach((button) => {
      const active = Number(button.dataset.scriptureTheme) === state.themeIndex;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    renderPoster();
  }

  function setVerse(index) {
    state.verseIndex = Number(index);
    const select = el('scriptureVerseSelect');
    if (select) select.value = String(state.verseIndex);
    renderPoster();
  }

  function randomize() {
    let nextVerse = secureRandom(VERSES.length);
    let nextTheme = secureRandom(THEMES.length);
    if (VERSES.length > 1 && nextVerse === state.verseIndex) nextVerse = (nextVerse + 1) % VERSES.length;
    if (THEMES.length > 1 && nextTheme === state.themeIndex) nextTheme = (nextTheme + 1) % THEMES.length;
    state.verseIndex = nextVerse;
    state.themeIndex = nextTheme;
    const select = el('scriptureVerseSelect');
    if (select) select.value = String(nextVerse);
    document.querySelectorAll('[data-scripture-theme]').forEach((button) => {
      const active = Number(button.dataset.scriptureTheme) === nextTheme;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    renderPoster();
  }

  function today() {
    todaySelection();
    const select = el('scriptureVerseSelect');
    if (select) select.value = String(state.verseIndex);
    document.querySelectorAll('[data-scripture-theme]').forEach((button) => {
      const active = Number(button.dataset.scriptureTheme) === state.themeIndex;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    renderPoster();
  }

  function canvasToBlob(canvas) {
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 0.95));
  }

  function message(text) {
    const node = el('scriptureActionMessage');
    if (node) node.textContent = text;
  }

  async function downloadPoster() {
    const canvas = el('scripturePosterCanvas');
    if (!canvas) return;
    const blob = await canvasToBlob(canvas);
    if (!blob) return message('Could not prepare the image.');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EFGC-Daily-Scripture-${currentVerse().ref.replace(/[^a-z0-9]+/gi,'-')}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
    message('Scripture image downloaded.');
  }

  async function sharePoster() {
    const canvas = el('scripturePosterCanvas');
    if (!canvas) return;
    const verse = currentVerse();
    const shareText = `${verse.ref} — “${verse.text}”\n\nEFGC Youth • Daily Scripture`;
    try {
      const blob = await canvasToBlob(canvas);
      const file = blob ? new File([blob], 'EFGC-Daily-Scripture.png', { type:'image/png' }) : null;
      if (file && navigator.canShare?.({ files:[file] })) {
        await navigator.share({ title:'EFGC Youth Daily Scripture', text:shareText, files:[file] });
        message('Scripture shared.');
      } else if (navigator.share) {
        await navigator.share({ title:'EFGC Youth Daily Scripture', text:shareText });
        message('Scripture shared.');
      } else {
        await copyVerse();
        message('Sharing is not available here, so the verse was copied.');
      }
    } catch (err) {
      if (err?.name !== 'AbortError') message('Sharing was not completed.');
    }
  }

  async function copyVerse() {
    const verse = currentVerse();
    const text = `${verse.ref} — “${verse.text}” (KJV)\nEFGC Youth • Build • Belong • Be a Light`;
    try {
      await navigator.clipboard.writeText(text);
      message('Verse copied.');
    } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      message('Verse copied.');
    }
  }

  function bindGeneratorEvents() {
    el('scriptureVerseSelect')?.addEventListener('change', (e) => setVerse(e.target.value));
    el('scriptureTodayButton')?.addEventListener('click', today);
    el('scriptureRandomButton')?.addEventListener('click', randomize);
    el('scriptureDownloadButton')?.addEventListener('click', downloadPoster);
    el('scriptureShareButton')?.addEventListener('click', sharePoster);
    el('scriptureCopyButton')?.addEventListener('click', copyVerse);
    document.querySelectorAll('[data-scripture-theme]').forEach((button) => {
      button.addEventListener('click', () => setTheme(button.dataset.scriptureTheme));
    });
  }

  function renderDailyScriptureV68() {
    todaySelection();
    const homeHost = el('scriptureCardHome');
    const fullHost = el('scriptureCard');
    if (homeHost) homeHost.innerHTML = homeMarkup();
    if (fullHost) {
      fullHost.innerHTML = generatorMarkup();
      bindGeneratorEvents();
      renderPoster();
    }
  }

  function install() {
    if (!el('scriptureCard') || typeof window.renderDailyScripture !== 'function') return false;
    window.renderDailyScripture = renderDailyScriptureV68;
    try { renderDailyScripture = renderDailyScriptureV68; } catch (_) {}
    renderDailyScriptureV68();
    document.documentElement.dataset.scriptureGenerator = VERSION;
    return true;
  }

  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (install() || attempts > 40) window.clearInterval(timer);
  }, 150);
})();