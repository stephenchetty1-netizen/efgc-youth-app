/** EFGC Youth V85 — password usability and admin-only Birthday Studio. */
(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const LOGO = 'assets/v76-efgc-logo.png?v=76.0';
  const DEFAULT_BLESSING = 'May the Lord bless you and keep you. May He strengthen your faith, guide your steps and fill this new year of your life with His peace, joy and purpose.';
  const esc = (value = '') => String(value).replace(/[&<>"']/g, (char) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  let members = [];
  let latestPreview = null;
  let loadVersion = 0;

  function isAdmin() {
    try { return Boolean(session && session.uid && session.role === 'admin'); }
    catch (_) { return false; }
  }

  function dismissKeyboard() {
    const el = document.activeElement;
    if (el && typeof el.blur === 'function') el.blur();
    try { navigator.virtualKeyboard?.hide?.(); } catch (_) {}
  }

  const toggle = $('#efgcTogglePassword');
  const input = $('#loginPassword');
  if (toggle && input) {
    toggle.addEventListener('click', () => {
      const revealing = input.type === 'password';
      input.type = revealing ? 'text' : 'password';
      toggle.textContent = revealing ? 'Hide' : 'Show';
      toggle.setAttribute('aria-label', revealing ? 'Hide password' : 'Show password');
      toggle.setAttribute('aria-pressed', String(revealing));
    });
  }

  const remember = $('#rememberDevice');
  if (remember && window.EFGCAuth?.remembersDevice) {
    remember.checked = EFGCAuth.remembersDevice();
  }
  // The login page uses a button rather than a form; Enter must be a working submit key.
  $('#login')?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.isComposing || event.target?.tagName === 'TEXTAREA') return;
    if (event.target?.id === 'loginPassword' || event.target?.id === 'loginPhone') {
      event.preventDefault();
      dismissKeyboard();
      if (!$('#continueButton')?.disabled) window.loginUser?.();
    }
  });

  function birthdayParts(value) {
    const match = String(value || '').match(/^\d{4}-(\d{2})-(\d{2})(?:$|T)/);
    if (!match) return null;
    const month = Number(match[1]), day = Number(match[2]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const sample = new Date(2024, month - 1, day);
    if (sample.getMonth() !== month - 1 || sample.getDate() !== day) return null;
    return { month, day };
  }

  function nextBirthday(dateString) {
    const parts = birthdayParts(dateString);
    if (!parts) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let result = new Date(today.getFullYear(), parts.month - 1, parts.day);
    if (result < today) result = new Date(today.getFullYear() + 1, parts.month - 1, parts.day);
    return {
      date: result,
      days: Math.round((Date.UTC(result.getFullYear(), result.getMonth(), result.getDate())
        - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000),
    };
  }

  function dayLabel(date) {
    return date ? date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long' }) : '';
  }

  function showMessage(value, error = false) {
    const el = $('#birthdayStudioMessage');
    if (!el) return;
    el.textContent = value;
    el.style.color = error ? '#a52231' : '#164b83';
  }

  function makeMenu() {
    const nav = $('#mainMenu');
    if (!nav) return;
    let button = $('#birthdayStudioMenu');
    if (!button) {
      button = document.createElement('button');
      button.id = 'birthdayStudioMenu';
      button.type = 'button';
      button.className = 'menu-item staff-menu';
      button.innerHTML = '<span class="nav-glyph" aria-hidden="true">✦</span>Birthday Studio';
      button.addEventListener('click', () => {
        if (!isAdmin()) return;
        if (typeof window.showTab === 'function') window.showTab('admin');
        const open = () => {
          renderStudio();
          $('#birthdayStudio')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };
        setTimeout(open, 80);
      });
      nav.appendChild(button);
    }
    button.classList.toggle('hidden', !isAdmin());
  }

  function markup() {
    return '<div class="efgc-birthday-kicker">ADMIN ONLY • EFGC YOUTH</div>'
      + '<h2>🎉 Birthday Studio</h2>'
      + '<p>Create a personalised EFGC Youth birthday greeting and download a full-colour 1080 × 1350 poster. Nothing is posted automatically.</p>'
      + '<div id="birthdayUpcoming" class="efgc-birthday-upcoming">Loading birthday dates…</div>'
      + '<div class="efgc-birthday-control">'
      + '<label for="birthdayMember">Choose a registered member<select id="birthdayMember"><option value="">Custom greeting</option></select></label>'
      + '<label for="birthdayName">Name on poster<input id="birthdayName" maxlength="70" placeholder="Enter the name to celebrate" autocomplete="off"></label>'
      + '<label for="birthdayDate">Birthday date<input id="birthdayDate" type="date"></label>'
      + '<label for="birthdayBlessing">Birthday message<textarea id="birthdayBlessing" maxlength="420" rows="4"></textarea></label>'
      + '</div>'
      + '<div class="efgc-birthday-actions">'
      + '<button id="birthdayPreview" type="button">Generate Preview</button>'
      + '<button id="birthdayDownload" class="efgc-outline" type="button" disabled>Download PNG</button>'
      + '</div>'
      + '<div id="birthdayPreviewHost" aria-live="polite"></div>'
      + '<label class="efgc-birthday-consent" for="birthdayApproved"><input id="birthdayApproved" type="checkbox">'
      + '<span>I confirm this birthday greeting and the member’s name are approved for sharing in the EFGC Youth News Feed.</span></label>'
      + '<div class="efgc-birthday-actions"><button id="birthdayPublish" type="button" disabled>Publish greeting text to News</button></div>'
      + '<p id="birthdayStudioMessage" role="status" aria-live="polite"></p>';
  }

  function renderStudio() {
    makeMenu();
    const panel = $('#adminPanel');
    if (!isAdmin() || !panel) {
      $('#birthdayStudio')?.remove();
      return;
    }
    if ($('#birthdayStudio')) return;
    const section = document.createElement('section');
    section.id = 'birthdayStudio';
    section.setAttribute('aria-label', 'EFGC Youth Birthday Studio');
    section.innerHTML = markup();
    const heading = panel.querySelector('h2');
    if (heading) heading.insertAdjacentElement('afterend', section);
    else panel.prepend(section);
    $('#birthdayBlessing').value = DEFAULT_BLESSING;
    $('#birthdayMember').addEventListener('change', selectMember);
    $('#birthdayPreview').addEventListener('click', preview);
    $('#birthdayDownload').addEventListener('click', download);
    $('#birthdayPublish').addEventListener('click', publish);
    $('#birthdayApproved').addEventListener('change', updatePublish);
    ['birthdayName', 'birthdayBlessing', 'birthdayDate'].forEach((id) => {
      $('#' + id).addEventListener('input', invalidatePreview);
    });
    loadMembers();
  }

  async function loadMembers() {
    const version = ++loadVersion;
    try {
      // Only approved EFGC Admin profiles may access the date-of-birth directory.
      const rows = await EFGCAuth.rest('profiles?select=id,full_name,birthday,role,approval_status&order=full_name.asc');
      if (version !== loadVersion || !isAdmin() || !$('#birthdayStudio')) return;
      members = (Array.isArray(rows) ? rows : [])
        .filter((row) => ['youth', 'leader', 'admin'].includes(row.role)
          && row.approval_status === 'approved' && birthdayParts(row.birthday))
        .map((row) => ({ ...row, next: nextBirthday(row.birthday) }))
        .sort((a, b) => a.next.days - b.next.days || a.full_name.localeCompare(b.full_name));
      const select = $('#birthdayMember');
      select.innerHTML = '<option value="">Custom greeting</option>'
        + members.map((row) => '<option value="' + esc(row.id) + '">'
          + esc(row.full_name) + ' — ' + esc(dayLabel(row.next.date)) + '</option>').join('');
      const soon = members.filter((row) => row.next.days <= 30);
      $('#birthdayUpcoming').textContent = soon.length
        ? 'Upcoming (30 days): ' + soon.slice(0, 6).map((row) =>
          row.full_name + ' (' + (row.next.days === 0 ? 'Today' : dayLabel(row.next.date)) + ')').join(' • ')
        : 'No registered birthdays in the next 30 days. You can still choose any member or make a custom greeting.';
      if (!members.length) showMessage('No approved profiles with birthdays were found. Custom birthday greetings remain available.');
    } catch (error) {
      if (version !== loadVersion || !$('#birthdayStudio')) return;
      members = [];
      $('#birthdayUpcoming').textContent = 'Birthday directory unavailable; you can still create a custom greeting.';
      showMessage('Could not load members: ' + (error.message || 'Please check Admin permissions.'), true);
    }
  }

  function selectMember() {
    const id = $('#birthdayMember')?.value;
    const member = members.find((row) => String(row.id) === String(id));
    if (member) {
      $('#birthdayName').value = member.full_name;
      const d = member.next.date;
      $('#birthdayDate').value = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
        + '-' + String(d.getDate()).padStart(2, '0');
    } else {
      $('#birthdayName').value = '';
      $('#birthdayDate').value = '';
    }
    invalidatePreview();
  }

  function invalidatePreview() {
    latestPreview = null;
    if ($('#birthdayDownload')) $('#birthdayDownload').disabled = true;
    if ($('#birthdayApproved')) $('#birthdayApproved').checked = false;
    $('#birthdayPreviewHost')?.replaceChildren();
    updatePublish();
  }

  function updatePublish() {
    const button = $('#birthdayPublish');
    if (button) button.disabled = !(latestPreview && $('#birthdayApproved')?.checked && isAdmin());
  }

  function preview() {
    if (!isAdmin()) return;
    const name = $('#birthdayName')?.value.trim() || '';
    const blessing = $('#birthdayBlessing')?.value.trim() || DEFAULT_BLESSING;
    const dateRaw = $('#birthdayDate')?.value || '';
    if (!name) return showMessage('Enter a member name for the birthday greeting.', true);
    if (name.length > 70 || blessing.length > 420) return showMessage('Please shorten the name or greeting.', true);
    const parts = birthdayParts(dateRaw);
    const date = parts ? new Date(2024, parts.month - 1, parts.day) : null;
    latestPreview = { name, blessing, dateLabel: dayLabel(date) };
    const box = $('#birthdayPreviewHost');
    box.innerHTML = '<div class="efgc-birthday-poster">'
      + '<img src="' + LOGO + '" alt="Official Emmanuel Full Gospel Church logo">'
      + '<small>EFGC YOUTH CELEBRATES YOU</small>'
      + '<h3>HAPPY BIRTHDAY</h3>'
      + '<strong>' + esc(name) + '</strong>'
      + (latestPreview.dateLabel ? '<small>' + esc(latestPreview.dateLabel) + '</small>' : '')
      + '<p>' + esc(blessing) + '</p>'
      + '<div class="efgc-birthday-verse">“The LORD bless thee, and keep thee.”<br>Numbers 6:24 (KJV)</div>'
      + '<p>With love from EFGC Youth • Pass on the Baton</p></div>';
    $('#birthdayDownload').disabled = false;
    $('#birthdayApproved').checked = false;
    updatePublish();
    showMessage('Preview generated. Review the name and blessing before downloading or publishing.');
    dismissKeyboard();
  }

  function wrapLines(ctx, text, maxWidth) {
    const lines = [];
    const paragraphs = String(text).split(/\n/);
    for (const paragraph of paragraphs) {
      let line = '';
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        const next = line ? line + ' ' + word : word;
        if (line && ctx.measureText(next).width > maxWidth) {
          lines.push(line);
          line = word;
        } else line = next;
      }
      if (line) lines.push(line);
    }
    return lines;
  }

  async function loadLogo() {
    const img = new Image();
    img.decoding = 'async';
    img.src = LOGO;
    await new Promise((resolve, reject) => {
      if (img.complete && img.naturalWidth) return resolve();
      img.onload = resolve;
      img.onerror = () => reject(new Error('The official EFGC logo could not load. Check the app image asset before exporting.'));
    });
    if (!img.naturalWidth) throw new Error('The official EFGC logo is unavailable.');
    return img;
  }

  async function download() {
    if (!latestPreview || !isAdmin()) return;
    const button = $('#birthdayDownload');
    button.disabled = true;
    showMessage('Preparing your birthday poster…');
    try {
      const logo = await loadLogo();
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1350;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('This device cannot create the birthday image.');
      const bg = ctx.createLinearGradient(0, 0, 0, 1350);
      bg.addColorStop(0, '#145eae');
      bg.addColorStop(.48, '#073965');
      bg.addColorStop(1, '#02132e');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 1080, 1350);
      ctx.strokeStyle = '#e8bf58'; ctx.lineWidth = 8;
      ctx.strokeRect(25, 25, 1030, 1300);
      ctx.strokeStyle = 'rgba(255,255,255,.23)'; ctx.lineWidth = 2;
      ctx.strokeRect(41, 41, 998, 1268);
      const shine = ctx.createRadialGradient(540, 290, 80, 540, 290, 660);
      shine.addColorStop(0, 'rgba(118,203,255,.40)');
      shine.addColorStop(1, 'rgba(118,203,255,0)');
      ctx.fillStyle = shine; ctx.fillRect(0, 0, 1080, 1100);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(540, 227, 124, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#e7bc4f'; ctx.lineWidth = 7; ctx.stroke();
      ctx.drawImage(logo, 432, 119, 216, 216);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffdf80'; ctx.font = 'bold 26px sans-serif';
      ctx.fillText('EFGC YOUTH CELEBRATES YOU', 540, 418);
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 86px sans-serif';
      ctx.fillText('HAPPY', 540, 533); ctx.fillText('BIRTHDAY', 540, 629);
      const n = latestPreview.name;
      const nameSize = n.length > 28 ? 47 : n.length > 18 ? 61 : 73;
      ctx.font = 'bold ' + nameSize + 'px sans-serif'; ctx.fillStyle = '#ffe29a';
      const nameLines = wrapLines(ctx, n, 925).slice(0, 3);
      let y = 718;
      for (const line of nameLines) { ctx.fillText(line, 540, y); y += nameSize + 9; }
      if (latestPreview.dateLabel) {
        ctx.font = 'bold 30px sans-serif'; ctx.fillStyle = '#f1dfaa';
        ctx.fillText(latestPreview.dateLabel, 540, y + 10); y += 56;
      }
      let fontSize = 31;
      let blessingLines = [];
      do {
        ctx.font = fontSize + 'px sans-serif';
        blessingLines = wrapLines(ctx, latestPreview.blessing, 895);
        if (blessingLines.length <= 6) break;
        fontSize -= 2;
      } while (fontSize > 22);
      ctx.fillStyle = '#f2f8ff';
      y = Math.max(y + 54, 850);
      const available = 1120 - y;
      const lineHeight = Math.min(43, available / Math.max(blessingLines.length, 1));
      blessingLines.slice(0, 10).forEach((line) => {
        ctx.fillText(line, 540, y); y += lineHeight;
      });
      ctx.fillStyle = '#ffe29a'; ctx.font = 'italic 32px Georgia, serif';
      ctx.fillText('“The LORD bless thee, and keep thee.”', 540, 1195);
      ctx.font = '26px Georgia, serif'; ctx.fillText('Numbers 6:24 (KJV)', 540, 1234);
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 22px sans-serif';
      ctx.fillText('WITH LOVE FROM EFGC YOUTH  •  PASS ON THE BATON', 540, 1284);
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = 'EFGC-Birthday-' + n.replace(/[^a-z0-9-]+/gi, '-').slice(0, 36) + '.png';
      document.body.appendChild(a); a.click(); a.remove();
      showMessage('Birthday poster downloaded. Nothing has been published.');
    } catch (error) {
      showMessage('Could not export poster: ' + (error.message || 'Please try again.'), true);
    } finally {
      if ($('#birthdayDownload')) $('#birthdayDownload').disabled = !latestPreview;
    }
  }

  async function publish() {
    if (!isAdmin() || !latestPreview || !$('#birthdayApproved')?.checked) return;
    const button = $('#birthdayPublish');
    button.disabled = true;
    try {
      const uid = EFGCAuth.userId();
      if (!uid) throw new Error('Admin session required.');
      const { name, blessing } = latestPreview;
      const content = 'Happy Birthday, ' + name + '! ' + blessing + ' With love from EFGC Youth.';
      const result = await EFGCAuth.rest('news_posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify({
          author_id: uid, content, post_type: 'birthday', member_name: name, is_published: true,
        }),
      });
      if (!Array.isArray(result) || !result.length) throw new Error('No published birthday post was returned.');
      await window.renderLiveData?.();
      showMessage('Birthday greeting published to the EFGC Youth News Feed. The PNG remains a separate download.');
    } catch (error) {
      showMessage('Birthday greeting was not published: ' + (error.message || 'Please check Admin publishing access.'), true);
      updatePublish();
    }
  }

  const originalShell = window.renderShell;
  if (typeof originalShell === 'function') window.renderShell = function(...args) {
    const result = originalShell.apply(this, args);
    makeMenu();
    return result;
  };
  const originalLive = window.renderLiveData;
  if (typeof originalLive === 'function') window.renderLiveData = async function(...args) {
    const result = await originalLive.apply(this, args);
    renderStudio();
    return result;
  };
  document.addEventListener('click', (event) => {
    if (event.target.closest?.('[data-tab="admin"], #adminMenu')) {
      setTimeout(renderStudio, 80);
    }
  });
  const boot = () => { makeMenu(); renderStudio(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
  window.addEventListener('pageshow', boot);
})();
