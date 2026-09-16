/** EFGC Youth v31 — Admin attendance editor. Backend RLS and DB triggers remain authoritative. */
(() => {
  const $ = (s) => document.querySelector(s);
  const esc = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let eventCache = [];
  let activeEventId = null;

  const originalRenderLiveData = window.renderLiveData;
  window.renderLiveData = async function () {
    await originalRenderLiveData();
    const adminMenu = $('#adminMenu');
    if (adminMenu && !adminMenu.classList.contains('hidden')) await renderAttendanceModule();
  };

  function message(text) { const el = $('#attendanceActionMessage'); if (el) el.textContent = text; }
  function editorMessage(text) { const el = $('#attendanceEditorMessage'); if (el) el.textContent = text; }

  async function renderAttendanceModule() {
    const panel = $('#adminPanel');
    if (!panel || $('#adminAttendanceModule')) return;
    const host = document.createElement('section');
    host.id = 'adminAttendanceModule';
    host.innerHTML = '<h2>Attendance Register</h2><article class="card"><p>Loading events…</p></article>';
    panel.appendChild(host);
    try {
      eventCache = await EFGCLive.events();
      if (!eventCache.length) {
        host.innerHTML = '<h2>Attendance Register</h2><article class="card"><h3>No events yet</h3><p>Create a Youth event first. Its attendance register will then appear here.</p></article>';
        return;
      }
      const options = eventCache.map(e => `<option value="${Number(e.id)}">${esc(e.title)} — ${esc(new Date(e.event_date).toLocaleString('en-ZA'))}${e.attendance_approved ? ' • Finalized' : ''}</option>`).join('');
      host.innerHTML = `<h2>Attendance Register</h2><article class="card"><label>Select event<select id="attendanceEventSelect">${options}</select></label><button class="primary-login" type="button" onclick="loadAdminAttendance()">Open Register</button><p id="attendanceActionMessage" class="login-message"></p></article><div id="attendanceEditor"></div>`;
    } catch (e) {
      host.innerHTML = `<h2>Attendance Register</h2><article class="card"><p>${esc(`Could not load attendance events: ${e.message}`)}</p></article>`;
    }
  }

  window.loadAdminAttendance = async () => {
    const eventId = Number($('#attendanceEventSelect')?.value);
    const editor = $('#attendanceEditor');
    if (!eventId || !editor) return;
    activeEventId = eventId;
    const event = eventCache.find(e => Number(e.id) === eventId);
    editor.innerHTML = '<article class="card"><p>Loading Youth register…</p></article>';
    try {
      const [youth, existing] = await Promise.all([EFGCLive.adminYouthProfiles(), EFGCLive.adminAttendance(eventId)]);
      const byYouth = new Map(existing.map(r => [r.youth_id, r.status]));
      if (!youth.length) {
        editor.innerHTML = '<article class="card"><h3>No registered Youth yet</h3><p>Add approved Youth accounts before completing attendance.</p></article>';
        return;
      }
      const rows = youth.map(y => {
        const status = byYouth.get(y.id) || '';
        return `<article class="card attendance-row"><h3>${esc(y.full_name)}</h3><label>Status<select class="attendance-status" data-youth-id="${esc(y.id)}" ${event?.attendance_approved ? 'disabled' : ''}><option value="" ${!status?'selected':''}>Select…</option><option value="present" ${status==='present'?'selected':''}>Present</option><option value="absent" ${status==='absent'?'selected':''}>Absent</option></select></label></article>`;
      }).join('');
      const controls = event?.attendance_approved
        ? '<article class="card"><strong>✅ This attendance register is finalized and locked.</strong></article>'
        : '<article class="card"><button class="primary-login" type="button" onclick="saveAdminAttendance()">Save Register</button><button class="ghost-login" type="button" onclick="finalizeAdminAttendance()">Save & Finalize</button><p id="attendanceEditorMessage" class="login-message"></p></article>';
      editor.innerHTML = `<h3>${esc(event?.title || 'Attendance')}</h3>${rows}${controls}`;
    } catch (e) {
      editor.innerHTML = `<article class="card"><p>${esc(`Could not open register: ${e.message}`)}</p></article>`;
    }
  };

  function collectEntries() {
    const selects = [...document.querySelectorAll('#attendanceEditor .attendance-status')];
    if (!selects.length) throw new Error('No Youth are available in this register.');
    return selects.map(s => {
      if (!['present','absent'].includes(s.value)) throw new Error('Mark every Youth Present or Absent before saving.');
      return { youth_id: s.dataset.youthId, status: s.value };
    });
  }

  window.saveAdminAttendance = async () => {
    if (!activeEventId) return;
    try {
      editorMessage('Saving attendance…');
      await EFGCLive.adminSaveAttendance(activeEventId, collectEntries());
      editorMessage('Attendance saved. The register is still open for changes.');
    } catch (e) { editorMessage(`Could not save attendance: ${e.message}`); }
  };

  window.finalizeAdminAttendance = async () => {
    if (!activeEventId) return;
    try {
      editorMessage('Saving and finalizing attendance…');
      await EFGCLive.adminSaveAttendance(activeEventId, collectEntries());
      await EFGCLive.adminFinalizeAttendance(activeEventId);
      await window.renderLiveData();
      message('Attendance finalized successfully. The register is now locked.');
    } catch (e) { editorMessage(`Could not finalize attendance: ${e.message}`); }
  };
})();
