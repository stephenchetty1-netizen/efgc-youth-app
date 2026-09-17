(() => {
  'use strict';

  const VERSION = '69.0';
  const LOGO_SRC = 'assets/efgc-logo.svg?v=69.0';
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

  function svgData(svg) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace(/\s{2,}/g, ' ').trim());
  }

  function subjectSvg(kind, accent) {
    const gold = accent || '#ffd257';
    const cross = (x, y, h, w) => '<g filter="url(#glow)"><rect x="'+(x-w/2)+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+(w/3)+'" fill="#fff"/><rect x="'+(x-h*.32)+'" y="'+(y+h*.27)+'" width="'+(h*.64)+'" height="'+w+'" rx="'+(w/3)+'" fill="#fff"/></g>';
    if (kind === 'cross-right') return cross(820,235,330,48);
    if (kind === 'cross-center') return cross(540,250,350,48);
    if (kind === 'bible') return '<g transform="translate(0 20)"><path d="M150 960 Q340 870 520 965 L520 1190 Q330 1100 150 1170 Z" fill="#fff" fill-opacity=".94" stroke="'+gold+'" stroke-width="10"/><path d="M930 960 Q740 870 560 965 L560 1190 Q750 1100 930 1170 Z" fill="#fff" fill-opacity=".94" stroke="'+gold+'" stroke-width="10"/><path d="M540 960 L540 1205" stroke="#102a55" stroke-width="9"/><path d="M230 1000 Q355 955 470 1008 M230 1045 Q355 1000 470 1054 M610 1008 Q730 955 850 1000 M610 1054 Q730 1000 850 1045" stroke="#55708f" stroke-width="7" fill="none" opacity=".65"/></g>'+cross(540,265,250,40);
    if (kind === 'prayer') return '<g fill="#071a37" opacity=".94"><path d="M245 1070 C180 1020 190 930 225 865 C247 824 275 780 302 745 C324 716 356 728 357 760 C358 788 338 827 327 852 C356 812 380 777 405 748 C429 721 462 740 455 771 C449 798 425 835 410 859 C438 826 462 799 485 780 C510 760 539 785 524 813 C505 848 482 872 458 899 C505 867 544 855 565 884 C583 910 557 934 522 958 C474 992 440 1021 410 1060 C370 1113 298 1110 245 1070 Z"/><path d="M835 1070 C900 1020 890 930 855 865 C833 824 805 780 778 745 C756 716 724 728 723 760 C722 788 742 827 753 852 C724 812 700 777 675 748 C651 721 618 740 625 771 C631 798 655 835 670 859 C642 826 618 799 595 780 C570 760 541 785 556 813 C575 848 598 872 622 899 C575 867 536 855 515 884 C497 910 523 934 558 958 C606 992 640 1021 670 1060 C710 1113 782 1110 835 1070 Z"/></g>'+cross(540,270,245,42);
    if (kind === 'dove') return '<g filter="url(#glow)" fill="#fff" transform="translate(610 230) scale(.95)"><path d="M116 168 C53 128 17 79 13 22 C74 43 126 74 160 119 C181 77 223 44 289 27 C274 93 236 139 184 170 C217 187 244 215 260 251 C213 243 172 223 145 194 C113 218 72 231 27 226 C52 198 83 179 116 168 Z"/><circle cx="166" cy="142" r="8" fill="#173b72"/></g>'+cross(183,340,210,36);
    if (kind === 'worship') return '<g fill="#061936"><path d="M80 1225 L120 965 Q128 915 157 902 Q187 889 202 927 L228 1015 L237 845 Q240 806 267 800 Q297 794 306 833 L326 1002 L357 885 Q366 848 395 849 Q425 851 426 890 L427 1090 Q430 1160 470 1225 Z"/><path d="M610 1225 L645 1035 L671 906 Q678 868 707 865 Q737 862 746 899 L767 1001 L785 822 Q788 786 816 783 Q845 780 853 818 L874 1003 L900 890 Q909 852 938 853 Q968 855 968 894 L965 1110 Q962 1170 1002 1225 Z"/></g>'+cross(541,270,250,42);
    if (kind === 'sanctuary') return '<g opacity=".9"><path d="M160 1110 V470 Q160 260 360 260 Q560 260 560 470 V1110" fill="#0b2d64" stroke="#d9edff" stroke-width="18"/><path d="M520 1110 V470 Q520 260 720 260 Q920 260 920 470 V1110" fill="#092654" stroke="#d9edff" stroke-width="18"/><path d="M540 370 V650 M450 485 H630" stroke="#fff" stroke-width="34" filter="url(#glow)"/></g>';
    if (kind === 'ocean') return '<g opacity=".9"><path d="M0 890 Q120 820 240 890 T480 890 T720 890 T960 890 T1200 890 V1350 H0 Z" fill="#0b61a8"/><path d="M0 960 Q120 890 240 960 T480 960 T720 960 T960 960 T1200 960" fill="none" stroke="#9be9ff" stroke-width="18" opacity=".8"/><path d="M0 1040 Q120 970 240 1040 T480 1040 T720 1040 T960 1040 T1200 1040" fill="none" stroke="#fff" stroke-width="10" opacity=".55"/></g>'+cross(541,310,270,42);
    if (kind === 'city') return '<g fill="#071933" opacity=".94"><rect x="0" y="850" width="115" height="500"/><rect x="120" y="760" width="120" height="590"/><rect x="245" y="900" width="95" height="450"/><rect x="345" y="690" width="145" height="660"/><rect x="495" y="820" width="90" height="530"/><rect x="590" y="620" width="170" height="730"/><rect x="765" y="790" width="105" height="560"/><rect x="875" y="710" width="205" height="640"/></g><g fill="'+gold+'" opacity=".82"><circle cx="175" cy="820" r="7"/><circle cx="410" cy="760" r="7"/><circle cx="655" cy="700" r="7"/><circle cx="950" cy="790" r="7"/></g>'+cross(540,285,245,42);
    if (kind === 'crown') return '<g filter="url(#glow)"><path d="M300 520 L360 360 L485 465 L540 300 L595 465 L720 360 L780 520 Z" fill="'+gold+'" stroke="#fff" stroke-width="10"/><rect x="320" y="520" width="440" height="70" rx="26" fill="'+gold+'" stroke="#fff" stroke-width="10"/></g>'+cross(541,650,250,42);
    if (kind === 'lamp') return '<g transform="translate(220 690)"><path d="M120 360 H480 L430 230 H170 Z" fill="#fff" fill-opacity=".92" stroke="'+gold+'" stroke-width="10"/><path d="M300 225 V105" stroke="#fff" stroke-width="28"/><path d="M240 95 Q300 10 360 95 Q330 165 300 175 Q270 165 240 95 Z" fill="'+gold+'" filter="url(#glow)"/><path d="M175 390 H425" stroke="#153866" stroke-width="8" opacity=".55"/></g>'+cross(553,220,205,36);
    return cross(542,260,290,44);
  }

  function sceneSvg(kind, c1, c2, accent, label) {
    const mountain = '<path d="M0 1020 L140 890 L250 965 L400 750 L520 870 L660 690 L820 865 L945 770 L1080 910 L1080 1350 L0 1350 Z" fill="#071a37" opacity=".72"/><path d="M0 1110 L170 1000 L300 1060 L460 900 L610 1010 L760 850 L925 1005 L1080 920 L1080 1350 L0 1350 Z" fill="#0b2e5e" opacity=".72"/>';
    const stars = '<g fill="#fff" opacity=".72"><circle cx="110" cy="150" r="3"/><circle cx="235" cy="250" r="4"/><circle cx="890" cy="175" r="3"/><circle cx="760" cy="300" r="4"/><circle cx="960" cy="420" r="3"/><circle cx="430" cy="180" r="3"/></g>';
    return '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350"><defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+c1+'"/><stop offset=".56" stop-color="'+c2+'"/><stop offset="1" stop-color="#061a38"/></linearGradient><radialGradient id="sun"><stop offset="0" stop-color="#fff"/><stop offset=".25" stop-color="'+accent+'" stop-opacity=".95"/><stop offset="1" stop-color="'+accent+'" stop-opacity="0"/></radialGradient><filter id="glow"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><linearGradient id="sheen" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".48" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><rect width="1080" height="1350" fill="url(#sky)"/>'+stars+'<circle cx="540" cy="600" r="390" fill="url(#sun)" opacity=".92"/><path d="M0 640 Q140 580 280 630 T560 620 T840 640 T1120 610" fill="none" stroke="#fff" stroke-opacity=".13" stroke-width="86"/>'+mountain+subjectSvg(kind, accent)+'<rect width="1080" height="1350" fill="url(#sheen)" opacity=".55"/><text x="540" y="1295" text-anchor="middle" fill="#fff" opacity=".12" font-family="Arial,sans-serif" font-size="26" font-weight="700" letter-spacing="6">'+label+'</text></svg>';
  }

  const THEME_SPECS = [
    ['glory-cross','Glory Cross','cross-right','#061f51','#0a63b5','#ffd257','CHRIST OUR HOPE'],
    ['blue-cross','Blue Cross','cross-center','#021a43','#047bd5','#7fe7ff','JESUS • LIGHT OF THE WORLD'],
    ['open-bible','Open Bible','bible','#071b42','#397fd1','#ffd257','HIS WORD • OUR LIGHT'],
    ['prayer','Prayer','prayer','#07142e','#315fa8','#ffd257','PRAY • TRUST • BELIEVE'],
    ['holy-spirit','Holy Spirit','dove','#07356c','#53a8e8','#f6dc7d','SPIRIT • TRUTH • POWER'],
    ['worship','Worship','worship','#071637','#174b8e','#6ce8ff','WORSHIP • PRAISE • GLORY'],
    ['sanctuary','Sanctuary','sanctuary','#071736','#1c5e9e','#ffe28a','GATHER • GROW • GO'],
    ['ocean-faith','Ocean Faith','ocean','#05295c','#0d86c7','#ffd257','FAITH OVER FEAR'],
    ['mountain-cross','Mountain Cross','cross-center','#071a39','#5a4a83','#ffcf63','STAND FIRM IN CHRIST'],
    ['city-light','City Light','city','#050f2c','#0d5ea9','#5ff0ff','BE A LIGHT'],
    ['crown-cross','Crown & Cross','crown','#08173a','#593c86','#ffd257','KING OF KINGS'],
    ['word-lamp','Word & Lamp','lamp','#071a3a','#1b65a4','#ffd257','WORD • LIGHT • TRUTH']
  ];

  const THEMES = THEME_SPECS.map((t) => ({
    id:t[0], label:t[1], scene:t[2], accent:t[5], tagline:t[6],
    image:svgData(sceneSvg(t[2], t[3], t[4], t[5], t[1].toUpperCase()))
  }));

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
      '<button type="button" class="scripture-theme '+(index === state.themeIndex ? 'active' : '')+'" data-scripture-theme="'+index+'" aria-pressed="'+(index === state.themeIndex)+'"><span class="scripture-theme-thumb" style="background-image:url(&quot;'+theme.image+'&quot;)"></span><span class="scripture-theme-label">'+escapeHtmlLocal(theme.label)+'</span></button>'
    ).join('');
    const verseOptions = VERSES.map((verse, index) =>
      '<option value="'+index+'" '+(index === state.verseIndex ? 'selected' : '')+'>'+escapeHtmlLocal(verse.ref)+'</option>'
    ).join('');
    return '<div class="scripture-generator-v68"><div class="scripture-generator-heading"><span class="scripture-kicker">EFGC YOUTH • DAILY FAITH</span><h2>Daily Scripture Generator</h2><p>Choose from '+THEMES.length+' high-quality Christian backgrounds. Every poster uses the official EFGC logo and is aligned for sharing.</p></div><div class="scripture-generator-layout"><section class="scripture-preview-panel" aria-label="Scripture poster preview"><div class="scripture-canvas-shell"><canvas id="scripturePosterCanvas" width="1080" height="1350" aria-label="Generated EFGC Youth scripture poster"></canvas><div id="scriptureRenderStatus" class="scripture-render-status" aria-live="polite">Preparing today\'s scripture…</div></div></section><section class="scripture-controls-panel"><div class="scripture-control-card"><label for="scriptureVerseSelect"><strong>Scripture</strong></label><select id="scriptureVerseSelect">'+verseOptions+'</select><div class="scripture-inline-actions"><button id="scriptureTodayButton" type="button" class="scripture-secondary">Today</button><button id="scriptureRandomVerseButton" type="button" class="scripture-secondary">New Scripture</button><button id="scriptureRandomButton" type="button" class="scripture-primary">✦ Surprise Me</button></div></div><div class="scripture-control-card"><div class="scripture-gallery-title"><strong>Choose Christian background</strong><span>'+THEMES.length+' images</span></div><div class="scripture-theme-grid">'+themeButtons+'</div></div><div class="scripture-control-card scripture-share-card"><strong>Use your scripture poster</strong><div class="scripture-action-grid"><button id="scriptureDownloadButton" type="button" class="scripture-primary">Download Image</button><button id="scriptureShareButton" type="button" class="scripture-secondary">Share</button><button id="scriptureCopyButton" type="button" class="scripture-secondary">Copy Verse</button></div><p id="scriptureActionMessage" class="scripture-action-message" aria-live="polite"></p></div><div class="scripture-safety-note">KJV • Official EFGC logo • Christian images only • No service details</div></section></div></div>';
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
      veil.addColorStop(0,'rgba(2,17,44,.38)');
      veil.addColorStop(.36,'rgba(2,17,44,.18)');
      veil.addColorStop(.72,'rgba(2,17,44,.34)');
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