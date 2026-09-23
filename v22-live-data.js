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
      return get('profiles?select=id,full_name,phone,birthday,role,approval_status,leader_role,archived_at,created_at&order=created_at.desc');
    },
    async adminYouthProfiles() {
      return get('profiles?select=id,full_name&role=eq.youth&approval_status=eq.approved&archived_at=is.null&order=full_name.asc');
    },
    async adminAttendance(eventId) {
      return get(`attendance?select=event_id,youth_id,status,recorded_at&event_id=eq.${esc(eventId)}&order=youth_id.asc`);
    },
    async safeguardingDirectory() {
      return get('safeguarding_contacts?select=youth_id,parent_name,parent_phone,emergency_name,emergency_phone,updated_at&order=updated_at.desc');
    },
    async auditLog() {
      return get('role_audit_log?select=id,actor_id,target_name,previous_role,new_role,action,changed_at&order=changed_at.desc&limit=40');
    },
    async memberPreferences(id) {
      return get(`member_preferences?select=member_id,birthday_opt_in,photo_opt_in,whatsapp_opt_in&member_id=eq.${esc(id)}`);
    },
    async guardianPermission(id) {
      return get(`member_guardian_permissions?select=member_id,birthday_and_photo_authorized,whatsapp_authorized,verified_at&member_id=eq.${esc(id)}`);
    },
    async adminArchiveMember(id, archive) {
      if (!/^[0-9a-f-]{36}$/i.test(String(id||''))) throw new Error('Invalid member.');
      const rows = await window.EFGCAuth.rest(`profiles?id=eq.${esc(id)}&role=neq.admin`, {
        method:'PATCH', headers:jsonHeaders,
        body:JSON.stringify({archived_at:archive?new Date().toISOString():null}),
      });
      if (!Array.isArray(rows) || rows.length!==1) throw new Error('Account was not updated.');
      return rows[0];
    },
    async adminSaveGuardianPermission(id, birthday, whatsapp) {
      const rows = await window.EFGCAuth.rest('member_guardian_permissions?on_conflict=member_id',{
        method:'POST',
        headers:{...jsonHeaders,Prefer:'resolution=merge-duplicates,return=representation'},
        body:JSON.stringify({
          member_id:id,birthday_and_photo_authorized:!!birthday,
          whatsapp_authorized:!!whatsapp,verified_by:window.EFGCAuth.userId(),
          verified_at:new Date().toISOString(),
        }),
      });
      if(!rows?.length) throw new Error('Guardian permission was not saved.');
      return rows[0];
    },
    async adminPromoteYouth(userId) {
      // Server RLS permits only an approved Admin to change another member's role.
      if (!/^[0-9a-f-]{36}$/i.test(String(userId || ''))) throw new Error('Choose a valid Youth account.');
      const rows = await window.EFGCAuth.rest(
        `profiles?id=eq.${esc(userId)}&role=eq.youth&approval_status=eq.approved&archived_at=is.null`, {
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
    async adminDemoteLeader(userId) {
      // Revoke access through the same Admin-protected Supabase RLS policy.
      if (!/^[0-9a-f-]{36}$/i.test(String(userId || ''))) throw new Error('Choose a valid Leader account.');
      const rows = await window.EFGCAuth.rest(
        `profiles?id=eq.${esc(userId)}&role=eq.leader&approval_status=eq.approved&archived_at=is.null`, {
          method: 'PATCH',
          headers: jsonHeaders,
          body: JSON.stringify({ role: 'youth', approval_status: 'approved', leader_role: null }),
        },
      );
      if (!Array.isArray(rows) || rows.length !== 1 || rows[0].role !== 'youth') {
        throw new Error('Leader access was not removed. Check Admin permissions.');
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
      if (!Array.isArray(rows) || rows.length!==1 || !rows[0]?.id)
        throw new Error('The Youth meeting was not confirmed by the server.');
      return rows[0];
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
        if (!['present', 'absent', 'excused'].includes(e.status)) throw new Error('Every Youth must be marked Present or Absent.');
        return { event_id: Number(eventId), youth_id: e.youth_id, status: e.status, recorded_by };
      });
      const saved = await window.EFGCAuth.rest('attendance?on_conflict=event_id,youth_id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify(rows),
      });
      if (!Array.isArray(saved) || saved.length!==rows.length ||
          saved.some(r => r.event_id!==Number(eventId) ||
            !rows.some(e=>e.youth_id===r.youth_id && e.status===r.status)))
        throw new Error('Attendance save was not fully confirmed; retry before finalizing.');
      return saved;
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
