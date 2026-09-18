(() => {
  'use strict';

  const VERSION = '77.0';
  const LOGO_SRC = 'assets/v76-efgc-logo.png?v=77.0';
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
    { id:'youth-fellowship', label:'Youth Fellowship', image:'assets/scripture-v74/bible-light.jpg?v=77.0', accent:'#8be9ff', tagline:'BUILD • BELONG • BE A LIGHT' },
    { id:'mountain-cross', label:'Mountain Cross', image:'assets/scripture-v74/open-bible.jpg?v=77.0', accent:'#ffd45e', tagline:'FAITH • HOPE • JESUS' },
    { id:'youth-community', label:'Youth Community', image:'assets/scripture-v74/bible-devotion.jpg?v=77.0', accent:'#8be9ff', tagline:'TOGETHER • IN CHRIST' },
    { id:'worship-night', label:'Worship Night', image:'assets/scripture-v74/bible-sunrise.jpg?v=77.0', accent:'#ffd45e', tagline:'WORSHIP • PRAISE • GLORY' },
    { id:'sunrise-faith', label:'Sunrise Faith', image:'assets/scripture-v74/scripture-pages.jpg?v=77.0', accent:'#ffd45e', tagline:'NEW MERCIES • NEW DAY' },
    { id:'faith-together', label:'Faith Together', image:'assets/scripture-v74/quiet-time.jpg?v=77.0', accent:'#8be9ff', tagline:'ONE BODY • ONE FAITH' },
    { id:'praise-gathering', label:'Praise Gathering', image:'assets/scripture-v74/blue-cross.jpg?v=77.0', accent:'#8be9ff', tagline:'PRAISE • PRAY • GROW' },
    { id:'cross-at-dawn', label:'Cross at Dawn', image:'assets/scripture-v74/sunrise-cross.jpg?v=77.0', accent:'#ffd45e', tagline:'FAITH OVER FEAR' },
    { id:'christian-community', label:'Christian Community', image:'assets/scripture-v74/bible-community.jpg?v=77.0', accent:'#8be9ff', tagline:'LOVE • SERVE • REACH' },
    { id:'youth-worship', label:'Youth Worship', image:'assets/scripture-v74/prayer-bible.jpg?v=77.0', accent:'#ffd45e', tagline:'JESUS • CENTRE • ALWAYS' },
    { id:'hope-mountain', label:'Hope on the Mountain', image:'assets/scripture-v74/youth-worship.jpg?v=77.0', accent:'#8be9ff', tagline:'HOPE • FAITH • JESUS' },
    { id:'united-faith', label:'United in Faith', image:'assets/scripture-v74/sunrise-faith.jpg?v=77.0', accent:'#ffd45e', tagline:'STRONGER • TOGETHER' },
    { id:'fellowship-light', label:'Fellowship & Light', image:'assets/scripture-v74/church-light.jpg?v=77.0', accent:'#8be9ff', tagline:'SHINE • TOGETHER' },
    { id:'light-cross', label:'Light of the Cross', image:'assets/scripture-v74/prayer-hands.jpg?v=77.0', accent:'#ffd45e', tagline:'JESUS • OUR LIGHT' },
    { id:'generation-faith', label:'Generation of Faith', image:'assets/scripture-v74/cross-sky.jpg?v=77.0', accent:'#8be9ff', tagline:'A GENERATION FOR HIS GLORY' }
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
        <button type="button" class="scripture-open-button" data-tab="scripture">Create Scripture Poster →</button>
      </div>
    </article>`;
  }

  function generatorMarkup() {
    const themeButtons = THEMES.map((theme, index) =>
      '<button type="button" class="scripture-theme '+(index === state.themeIndex ? 'active' : '')+'" data-scripture-theme="'+index+'" aria-pressed="'+(index === state.themeIndex)+'"><img class="scripture-theme-thumb scripture-theme-photo" src="'+theme.image.replace(/&/g,'&amp;')+'" alt="'+escapeHtmlLocal(theme.label)+' realistic Christian background" loading="lazy"><span class="scripture-theme-label">'+escapeHtmlLocal(theme.label)+'</span></button>'
    ).join('');
    const verseOptions = VERSES.map((verse, index) =>
      '<option value="'+index+'" '+(index === state.verseIndex ? 'selected' : '')+'>'+escapeHtmlLocal(verse.ref)+'</option>'
    ).join('');
    return '<div class="scripture-generator-v68"><div class="scripture-generator-heading"><span class="scripture-kicker">EFGC YOUTH • DAILY FAITH</span><h2>Daily Scripture Generator</h2><p>Choose from '+THEMES.length+' realistic Christian photography backgrounds. Every poster uses the official EFGC logo and is aligned for sharing.</p></div><div class="scripture-generator-layout"><section class="scripture-preview-panel" aria-label="Scripture poster preview"><div class="scripture-canvas-shell"><canvas id="scripturePosterCanvas" width="1080" height="1350" aria-label="Generated EFGC Youth scripture poster"></canvas><div id="scriptureRenderStatus" class="scripture-render-status" aria-live="polite">Preparing today\'s scripture…</div></div></section><section class="scripture-controls-panel"><div class="scripture-control-card"><label for="scriptureVerseSelect"><strong>Scripture</strong></label><select id="scriptureVerseSelect">'+verseOptions+'</select><div class="scripture-inline-actions"><button id="scriptureTodayButton" type="button" class="scripture-secondary">Today</button><button id="scriptureRandomVerseButton" type="button" class="scripture-secondary">New Scripture</button><button id="scriptureRandomButton" type="button" class="scripture-primary">✦ Surprise Me</button></div></div><div class="scripture-control-card"><div class="scripture-gallery-title"><strong>Choose Christian background</strong><span>'+THEMES.length+' images</span></div><div class="scripture-theme-grid">'+themeButtons+'</div></div><div class="scripture-control-card scripture-share-card"><strong>Use your scripture poster</strong><div class="scripture-action-grid"><button id="scriptureDownloadButton" type="button" class="scripture-primary">Download Image</button><button id="scriptureShareButton" type="button" class="scripture-secondary">Share</button><button id="scriptureCopyButton" type="button" class="scripture-secondary">Copy Verse</button></div><p id="scriptureActionMessage" class="scripture-action-message" aria-live="polite"></p></div><div class="scripture-safety-note">KJV • Official EFGC logo • realistic Christian images only • No service details</div></section></div></div>';
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
      if (src.startsWith('http://') || src.startsWith('https://')) img.crossOrigin = 'anonymous';
      img.referrerPolicy = 'no-referrer';
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Could not load ${src}`));
      img.src = src;
    });
    state.imageCache.set(src, promise);
    return promise;
  }

  function drawSpacedText(ctx, text, x, y, spacing) {
    const chars = String(text).split('');
    const widths = chars.map((ch) => ctx.measureText(ch).width);
    const total = widths.reduce((a,b) => a+b, 0) + spacing * Math.max(0, chars.length - 1);
    let px = x - total / 2;
    chars.forEach((ch, i) => { ctx.fillText(ch, px, y); px += widths[i] + spacing; });
  }

  async function renderPoster() {
    if (state.busy) return;
    const canvas = el('scripturePosterCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    state.busy = true;
    const status = el('scriptureRenderStatus');
    if (status) status.textContent = 'Generating HD scripture poster…';
    const verse = currentVerse();
    const theme = currentTheme();
    const W = canvas.width;
    const H = canvas.height;

    try {
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle = '#061b3a';
      ctx.fillRect(0,0,W,H);
      const bg = await loadImage(theme.image);
      drawCover(ctx,bg,W,H);

      const veil = ctx.createLinearGradient(0,0,0,H);
      veil.addColorStop(0,'rgba(2,17,44,.16)');
      veil.addColorStop(.36,'rgba(2,17,44,.10)');
      veil.addColorStop(.72,'rgba(2,17,44,.26)');
      veil.addColorStop(1,'rgba(1,12,31,.88)');
      ctx.fillStyle = veil;
      ctx.fillRect(0,0,W,H);

      const vignette = ctx.createRadialGradient(W/2,H*.46,180,W/2,H*.52,760);
      vignette.addColorStop(0,'rgba(5,30,70,0)');
      vignette.addColorStop(1,'rgba(0,8,24,.48)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0,0,W,H);

      try {
        const logo = await loadImage(LOGO_SRC);
        ctx.save();
        ctx.shadowColor = 'rgba(255,220,112,.55)';
        ctx.shadowBlur = 30;
        const size = 156;
        ctx.drawImage(logo,(W-size)/2,34,size,size);
        ctx.restore();
      } catch (_) {}

      ctx.textAlign='center';
      ctx.textBaseline='alphabetic';
      ctx.fillStyle='#fff';
      ctx.font='900 28px system-ui, sans-serif';
      drawSpacedText(ctx,'EFGC YOUTH',W/2,226,4.2);

      const titleGrad=ctx.createLinearGradient(200,0,880,0);
      titleGrad.addColorStop(0,'#61e7ff');
      titleGrad.addColorStop(.5,'#ffffff');
      titleGrad.addColorStop(1,'#218cff');
      ctx.fillStyle=titleGrad;
      ctx.strokeStyle='rgba(0,69,170,.75)';
      ctx.lineWidth=5;
      ctx.font='900 92px system-ui, sans-serif';
      ctx.strokeText('SCRIPTURE',W/2,330);
      ctx.fillText('SCRIPTURE',W/2,330);

      ctx.fillStyle=theme.accent;
      ctx.font='900 30px system-ui, sans-serif';
      drawSpacedText(ctx,verse.ref.toUpperCase(),W/2,390,2.1);

      roundedRect(ctx,68,432,944,650,38);
      ctx.fillStyle='rgba(2,18,48,.62)';
      ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,.2)';
      ctx.lineWidth=2;
      ctx.stroke();

      roundedRect(ctx,88,454,904,606,30);
      ctx.strokeStyle=theme.accent;
      ctx.globalAlpha=.22;
      ctx.lineWidth=3;
      ctx.stroke();
      ctx.globalAlpha=1;

      let fontSize=64, lines=[];
      do {
        ctx.font='700 '+fontSize+'px Georgia, serif';
        lines=wrapText(ctx,'“'+verse.text+'”',810);
        if (lines.length>7) fontSize-=3; else break;
      } while (fontSize>43);

      const lineHeight=Math.round(fontSize*1.26);
      const totalH=lines.length*lineHeight;
      let y=725-totalH/2;
      ctx.fillStyle='#fff';
      ctx.textAlign='center';
      ctx.textBaseline='top';
      ctx.shadowColor='rgba(0,0,0,.42)';
      ctx.shadowBlur=12;
      lines.forEach((line)=>{ctx.fillText(line,W/2,y);y+=lineHeight;});
      ctx.shadowBlur=0;

      ctx.fillStyle=theme.accent;
      ctx.font='800 23px system-ui, sans-serif';
      ctx.textBaseline='alphabetic';
      drawSpacedText(ctx,theme.tagline,W/2,1018,2.2);

      ctx.fillStyle='rgba(255,255,255,.96)';
      ctx.font='900 25px system-ui, sans-serif';
      drawSpacedText(ctx,'BUILD • BELONG • BE A LIGHT',W/2,1162,2.8);
      ctx.strokeStyle=theme.accent;
      ctx.lineWidth=5;
      ctx.beginPath();
      ctx.moveTo(380,1195);
      ctx.lineTo(700,1195);
      ctx.stroke();

      ctx.fillStyle='#fff';
      ctx.font='800 25px system-ui, sans-serif';
      ctx.fillText('EMMANUEL FULL GOSPEL CHURCH',W/2,1244);
      ctx.fillStyle='rgba(255,255,255,.72)';
      ctx.font='700 19px system-ui, sans-serif';
      drawSpacedText(ctx,'PASS ON THE BATON • KJV',W/2,1286,2.2);

      if (status) {
        status.textContent='HD scripture poster ready';
        setTimeout(()=>{if(status.textContent==='HD scripture poster ready')status.textContent='';},1200);
      }
    } catch (err) {
      console.error('EFGC scripture generator',err);
      if (status) status.textContent='Could not render this image. Choose another background.';
    } finally {
      state.busy=false;
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

  function randomVerse() {
    let nextVerse = secureRandom(VERSES.length);
    if (VERSES.length > 1 && nextVerse === state.verseIndex) nextVerse = (nextVerse + 1) % VERSES.length;
    setVerse(nextVerse);
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

  function nextPaint() {
    return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }

  function rawCanvasToBlob(canvas) {
    return new Promise((resolve, reject) => {
      try { canvas.toBlob((blob) => resolve(blob), 'image/png', 0.95); }
      catch (err) { reject(err); }
    });
  }

  async function canvasToBlob(canvas) {
    // Android/in-app browsers can occasionally export a partially committed
    // hardware canvas. Snapshot onto a fresh software canvas after two paints.
    await nextPaint();
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const exportCtx = exportCanvas.getContext('2d', { alpha:false, willReadFrequently:false });
    if (!exportCtx) return rawCanvasToBlob(canvas);
    exportCtx.fillStyle = '#061b3a';
    exportCtx.fillRect(0,0,exportCanvas.width,exportCanvas.height);
    exportCtx.drawImage(canvas,0,0,exportCanvas.width,exportCanvas.height);

    let blob = await rawCanvasToBlob(exportCanvas);
    if (blob && blob.size >= 50000) return blob;

    // One retry after another paint for mobile GPU flush timing.
    await nextPaint();
    exportCtx.clearRect(0,0,exportCanvas.width,exportCanvas.height);
    exportCtx.fillStyle = '#061b3a';
    exportCtx.fillRect(0,0,exportCanvas.width,exportCanvas.height);
    exportCtx.drawImage(canvas,0,0,exportCanvas.width,exportCanvas.height);
    blob = await rawCanvasToBlob(exportCanvas);
    return blob;
  }

  async function waitForPosterReady() {
    let guard = 0;
    while (state.busy && guard < 80) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      guard++;
    }
    if (!state.busy) await renderPoster();
    guard = 0;
    while (state.busy && guard < 80) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      guard++;
    }
  }

  function message(text) {
    const node = el('scriptureActionMessage');
    if (node) node.textContent = text;
  }

  async function downloadPoster() {
    const canvas = el('scripturePosterCanvas');
    if (!canvas) return;
    message('Preparing image…');
    try { await waitForPosterReady(); } catch (_) {}
    let blob = null;
    try { blob = await canvasToBlob(canvas); } catch (_) {}

    if (!blob || blob.size < 50000) return message('Could not prepare the full image. Please try again.');
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
    message('Preparing image…');
    try { await waitForPosterReady(); } catch (_) {}
    const verse = currentVerse();
    const shareText = `${verse.ref} — “${verse.text}”\n\nEFGC Youth • Daily Scripture`;
    try {
      const blob = await canvasToBlob(canvas);
      const file = blob && blob.size >= 50000 ? new File([blob], 'EFGC-Daily-Scripture.png', { type:'image/png' }) : null;
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
    el('scriptureRandomVerseButton')?.addEventListener('click', randomVerse);
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