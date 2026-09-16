/** EFGC Youth v30 — live Supabase data reads and authorised Admin actions. */
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
    async safeguardingDirectory() {
      return get('safeguarding_contacts?select=youth_id,parent_name,parent_phone,emergency_name,emergency_phone,updated_at&order=updated_at.desc');
    },
    async adminSetLeaderApproval(userId, status) {
      if (!['approved', 'rejected'].includes(status)) throw new Error('Invalid Leader approval status.');
      const rows = await window.EFGCAuth.rest(`profiles?id=eq.${esc(userId)}&role=eq.leader`, {
        method: 'PATCH',
        headers: jsonHeaders,
        body: JSON.stringify({ approval_status: status }),
      });
      if (!rows?.length) throw new Error('Leader record was not updated. Check Admin permission and account status.');
      return rows[0];
    },
    async adminCreateEvent({ title, event_date, theme = null, scripture = null }) {
      const rows = await window.EFGCAuth.rest('events', {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ title, event_date, theme: theme || null, scripture: scripture || null, attendance_approved: false }),
      });
      return rows?.[0] || null;
    },
    async adminPublishNews(content) {
      const author_id = window.EFGCAuth.userId();
      if (!author_id) throw new Error('Authentication required.');
      const rows = await window.EFGCAuth.rest('news_posts', {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ author_id, content, is_published: true }),
      });
      return rows?.[0] || null;
    },
    async uploadOwnPhoto(file) {
      return window.EFGCAuth.uploadPrivatePhoto(file);
    },
  };
  window.EFGCLiveData = { enabled: true, source: 'Supabase RLS', version: 30 };
})();
