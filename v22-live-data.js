/** EFGC Youth v31 — live Supabase data and authorised Admin workflows. */
(() => {
  const esc = (v) => encodeURIComponent(String(v));
  const jsonHeaders = { 'Content-Type': 'application/json', Prefer: 'return=representation' };
  const get = (path) => window.EFGCAuth.rest(path);
  window.EFGCLive = {
    async events() {
      return get('events?select=id,title,event_date,theme,scripture,attendance_approved&order=event_date.asc');
    },
    async news() {
      return get('news_posts?select=id,content,published_at,is_published&is_published=eq.true&order=published_at.desc&limit=50');
    },
    async myAttendance(userId) {
      if (!userId) return [];
      return get(`attendance?select=status,recorded_at,event_id,events(id,title,event_date,attendance_approved)&youth_id=eq.${esc(userId)}&order=recorded_at.desc`);
    },
    async approvedLeaders() {
      return get('leader_directory?select=leader_id,full_name,phone,leader_role&order=full_name.asc');
    },
    async planner() {
      return get('year_planner?select=id,event_id,week_start,meeting_title,theme,scripture,published&order=week_start.asc');
    },
    async duties() {
      return get('duty_assignments?select=id,planner_id,duty_type,leader_id,status,replacement_note,updated_at&order=planner_id.asc');
    },
    async adminProfiles() {
      return get('profiles?select=id,full_name,phone,role,approval_status,leader_role,created_at&order=created_at.desc');
    },
    async adminYouthProfiles() {
      return get('profiles?select=id,full_name&role=eq.youth&approval_status=eq.approved&order=full_name.asc');
    },
    async adminAttendance(eventId) {
      return get(`attendance?select=event_id,youth_id,status,recorded_at&event_id=eq.${esc(eventId)}&order=youth_id.asc`);
    },
    async safeguardingDirectory() {
      return get('safeguarding_contacts?select=youth_id,parent_name,parent_phone,emergency_name,emergency_phone,updated_at&order=updated_at.desc');
    },
    async adminPromoteYouth(userId) {
      // Server RLS permits only an approved Admin to change another member's role.
      if (!/^[0-9a-f-]{36}$/i.test(String(userId || ''))) throw new Error('Choose a valid Youth account.');
      const rows = await window.EFGCAuth.rest(
        `profiles?id=eq.${esc(userId)}&role=eq.youth&approval_status=eq.approved`, {
          method: 'PATCH',
          headers: jsonHeaders,
          body: JSON.stringify({ role: 'leader', approval_status: 'approved', leader_role: 'EFGC Youth Leader' }),
        },
      );
      if (!Array.isArray(rows) || rows.length !== 1 || rows[0].role !== 'leader' || rows[0].approval_status !== 'approved') {
        throw new Error('Youth member was not promoted. Check account status and Admin access.');
      }
      return rows[0];
    },
    async adminSetLeaderApproval(userId, status) {
      if (!['approved', 'rejected'].includes(status)) throw new Error('Invalid Leader approval status.');
      const rows = await window.EFGCAuth.rest(`profiles?id=eq.${esc(userId)}&role=eq.leader`, {
        method: 'PATCH', headers: jsonHeaders, body: JSON.stringify({ approval_status: status }),
      });
      if (!rows?.length) throw new Error('Leader record was not updated. Check Admin permission and account status.');
      return rows[0];
    },
    async adminCreateEvent({ title, event_date, theme = null, scripture = null }) {
      const rows = await window.EFGCAuth.rest('events', {
        method: 'POST', headers: jsonHeaders,
        body: JSON.stringify({ title, event_date, theme: theme || null, scripture: scripture || null, attendance_approved: false }),
      });
      return rows?.[0] || null;
    },
    async adminPublishNews(content) {
      const author_id = window.EFGCAuth.userId();
      if (!author_id) throw new Error('Authentication required.');
      const rows = await window.EFGCAuth.rest('news_posts', {
        method: 'POST', headers: jsonHeaders,
        body: JSON.stringify({ author_id, content, is_published: true }),
      });
      return rows?.[0] || null;
    },
    async adminSaveAttendance(eventId, entries) {
      const recorded_by = window.EFGCAuth.userId();
      if (!recorded_by) throw new Error('Authentication required.');
      if (!Array.isArray(entries) || !entries.length) throw new Error('No Youth attendance entries to save.');
      const rows = entries.map((e) => {
        if (!['present', 'absent'].includes(e.status)) throw new Error('Every Youth must be marked Present or Absent.');
        return { event_id: Number(eventId), youth_id: e.youth_id, status: e.status, recorded_by };
      });
      return window.EFGCAuth.rest('attendance?on_conflict=event_id,youth_id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify(rows),
      });
    },
    async adminFinalizeAttendance(eventId) {
      const approved_by = window.EFGCAuth.userId();
      if (!approved_by) throw new Error('Authentication required.');
      const rows = await window.EFGCAuth.rest(`events?id=eq.${esc(eventId)}`, {
        method: 'PATCH', headers: jsonHeaders,
        body: JSON.stringify({ attendance_approved: true, approved_by, approved_at: new Date().toISOString() }),
      });
      if (!rows?.length) throw new Error('Attendance could not be finalized.');
      return rows[0];
    },
    async uploadOwnPhoto(file) {
      return window.EFGCAuth.uploadPrivatePhoto(file);
    },
  };
  window.EFGCLiveData = { enabled: true, source: 'Supabase RLS', version: 31 };
})();
