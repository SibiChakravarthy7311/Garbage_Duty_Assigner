export function renderAdminPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Garbage Duty Admin</title>
    <style>
      :root { --bg:#f6f1e8; --paper:rgba(255,252,246,.88); --ink:#18221a; --muted:#5f6a60; --line:rgba(24,34,26,.1); --accent:#1f4d5f; --accent-soft:#d9ecef; --accent-2:#78902d; --accent-2-soft:#ebf2d7; --warn:#8d4e1f; --warn-soft:#f5e6d5; --alert:#8f3a2e; --alert-soft:#f8dfdb; --radius:24px; --shadow:0 24px 60px rgba(41,42,35,.1); }
      * { box-sizing:border-box; }
      body { margin:0; color:var(--ink); font-family:"Segoe UI","Helvetica Neue",sans-serif; background:radial-gradient(circle at 10% 20%, rgba(120,144,45,.18), transparent 24%), radial-gradient(circle at 90% 10%, rgba(31,77,95,.12), transparent 20%), linear-gradient(180deg, #f8f4eb 0%, #efe8dc 100%); }
      main { max-width:1240px; margin:0 auto; padding:28px 18px 72px; }
      .hero, .card { background:var(--paper); backdrop-filter:blur(16px); border-radius:var(--radius); border:1px solid rgba(255,255,255,.7); box-shadow:var(--shadow); }
      .hero { display:grid; grid-template-columns:1.4fr 1fr; gap:18px; padding:28px; margin-bottom:18px; }
      .hero h1, .card h2 { font-family:Georgia, "Times New Roman", serif; letter-spacing:-.03em; margin:0; }
      .hero h1 { font-size:clamp(2.2rem, 4vw, 3.7rem); line-height:.94; max-width:8ch; }
      .eyebrow { display:inline-flex; align-items:center; gap:8px; text-transform:uppercase; letter-spacing:.16em; font-size:12px; color:var(--muted); margin-bottom:14px; }
      .dot { width:10px; height:10px; border-radius:50%; background:linear-gradient(135deg, var(--accent-2), #abc64d); box-shadow:0 0 0 6px rgba(120,144,45,.12); }
      .hero-copy, .muted, .status { color:var(--muted); line-height:1.5; }
      .hero-copy { margin-top:16px; max-width:58ch; }
      .grid { display:grid; gap:18px; grid-template-columns:repeat(12, 1fr); }
      .span-4 { grid-column:span 4; } .span-5 { grid-column:span 5; } .span-7 { grid-column:span 7; } .span-8 { grid-column:span 8; } .span-12 { grid-column:span 12; }
      .card { padding:22px; }
      .section-head, .row-between, .inline-actions { display:flex; justify-content:space-between; gap:12px; align-items:flex-start; flex-wrap:wrap; }
      .section-head p { margin:6px 0 0; color:var(--muted); font-size:13px; max-width:34ch; }
      .hero-meta, .mini-grid, .metrics, .timeline, .assignments, .people, .stack, .form-grid, .summary-grid { display:grid; gap:12px; }
      .hero-meta { grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); margin-top:20px; }
      .mini-grid, .timeline, .assignments, .people, .stack { grid-template-columns:1fr; }
      .metrics { grid-template-columns:repeat(4, minmax(0,1fr)); }
      .summary-grid { grid-template-columns:repeat(2, minmax(0,1fr)); }
      .form-grid { grid-template-columns:repeat(2, minmax(0,1fr)); }
      .tile, .metric, .assignment-card, .person-card, .timeline-item, .action-box, .auth-box { padding:16px; border-radius:18px; background:rgba(255,255,255,.74); border:1px solid rgba(24,34,26,.06); }
      .auth-box { margin-bottom:12px; }
      .label { font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:var(--muted); }
      .value-big { margin-top:8px; font-size:29px; font-weight:700; letter-spacing:-.04em; }
      .badge { padding:6px 10px; border-radius:999px; background:var(--accent-soft); color:var(--accent); font-size:12px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; white-space:nowrap; }
      .badge.viewer { background:var(--warn-soft); color:var(--warn); }
      .assignment-card.preview { background:var(--accent-soft); }
      .detail-grid { display:grid; gap:12px; grid-template-columns:repeat(3, minmax(0,1fr)); margin-top:14px; }
      .detail { padding:12px; border-radius:14px; background:rgba(240,236,225,.85); }
      .detail .value { margin-top:6px; font-weight:700; }
      .streams { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
      .stream { padding:5px 10px; border-radius:999px; background:var(--accent-soft); color:var(--accent); font-size:12px; }
      .button-row { display:grid; grid-template-columns:repeat(4, minmax(0,1fr)); gap:10px; }
      button, input, select, textarea { width:100%; font:inherit; border-radius:14px; }
      button { border:0; padding:12px 14px; cursor:pointer; font-weight:700; color:#fff; background:linear-gradient(135deg, #1e5263, #173d4a); box-shadow:0 12px 26px rgba(31,77,95,.2); }
      button.secondary { background:linear-gradient(135deg, #7c9431, #677926); box-shadow:0 12px 26px rgba(120,144,45,.2); }
      button.warn { background:linear-gradient(135deg, #ad6a32, #8d4e1f); box-shadow:0 12px 26px rgba(141,78,31,.18); }
      button.danger { background:linear-gradient(135deg, #a4483a, #863226); box-shadow:0 12px 26px rgba(143,58,46,.18); }
      button.ghost { width:auto; color:var(--ink); background:rgba(255,255,255,.82); box-shadow:none; border:1px solid var(--line); }
      button:disabled { opacity:.55; cursor:not-allowed; box-shadow:none; }
      input, select, textarea { padding:12px 14px; border:1px solid var(--line); background:rgba(255,255,255,.82); color:var(--ink); }
      label.field { display:grid; gap:6px; font-size:13px; color:var(--muted); }
      .status { min-height:20px; margin-top:12px; font-size:14px; }
      .status.ok { color:#325d2d; } .status.error { color:var(--alert); }
      .person-form { margin-top:14px; padding-top:14px; border-top:1px solid rgba(24,34,26,.08); }
      .mono { font-family:Consolas, monospace; font-size:12px; color:var(--muted); }
      @media (max-width:980px) { .hero, .grid { grid-template-columns:1fr; } .span-4, .span-5, .span-7, .span-8, .span-12 { grid-column:span 1; } .metrics { grid-template-columns:repeat(2,minmax(0,1fr)); } }
      @media (max-width:720px) { main { padding:18px 14px 48px; } .button-row, .metrics, .summary-grid, .detail-grid, .form-grid { grid-template-columns:1fr; } }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <div>
          <div class="eyebrow"><span class="dot"></span> Halifax Household Rotation</div>
          <h1>Keep the duty fair, even when life is messy.</h1>
          <p class="hero-copy">Viewers can monitor the dashboard and sync Halifax. Admin access unlocks reminders, carry-over decisions, and roster changes.</p>
          <div id="heroMeta" class="hero-meta"></div>
        </div>
        <div class="mini-grid">
          <div class="auth-box">
            <div class="label">Access</div>
            <h2 id="authTitle">Dashboard Viewer</h2>
            <p id="authNote" class="muted">Sign in as admin to unlock edits and manual actions.</p>
            <div id="authPanel"></div>
            <p id="authStatus" class="status"></p>
          </div>
          <div class="tile"><div class="label">Current Week</div><div id="miniCurrentAssignee" class="value-big">-</div><div id="miniCurrentWindow" class="muted">No active assignment</div></div>
          <div class="tile"><div class="label">Next Collection</div><div id="miniNextCollection" class="value-big">-</div><div id="miniNextStreams" class="muted">Waiting for sync</div></div>
          <div class="tile"><div class="label">Next Week</div><div id="miniNextWeek" class="value-big">Auto</div><div id="miniNextWeekNote" class="muted">Normal rotation will continue</div></div>
        </div>
      </section>

      <section class="grid">
        <section class="card span-8">
          <div class="section-head">
            <div><h2>Operations</h2><p>Viewers can sync Halifax. Admins can run reminders and weekly assignment jobs.</p></div>
            <span id="opsBadge" class="badge viewer">Viewer</span>
          </div>
          <div id="operationsButtons" class="button-row">
            <button id="syncSchedule">Sync Halifax</button>
            <button id="runWeekly">Run Weekly Duty</button>
            <button id="resendWeekly" class="secondary">Resend Weekly</button>
            <button id="sendCompletionCheck" class="warn">Send 11AM Check</button>
          </div>
          <p id="opsStatus" class="status"></p>
        </section>

        <section class="card span-4">
          <div class="section-head"><div><h2>System Snapshot</h2><p>Who is queued, what has been completed, and whether intervention is pending.</p></div></div>
          <div id="summary" class="summary-grid"></div>
        </section>

        <section class="card span-12">
          <div class="section-head"><div><h2>Rotation Metrics</h2><p>Operational counts pulled from current state.</p></div></div>
          <div id="metrics" class="metrics"></div>
        </section>

        <section id="currentWeekActionsCard" class="card span-7">
          <div class="section-head"><div><h2>Current Week Actions</h2><p>Use these only when an admin needs to intervene in the active week.</p></div><span class="badge">Admin</span></div>
          <div class="stack">
            <div class="action-box"><h3>1. Assign to next person</h3><p class="muted">Use when the assigned person informs in advance. The next person covers this week, and the original person becomes next week’s duty.</p><button id="assignNext" class="warn" style="margin-top:12px;">Assign This Week To Next Person</button></div>
            <div class="action-box"><h3>Admin confirmation: completed</h3><p class="muted">Use when the duty was completed successfully. Rotation advances normally.</p><button id="markComplete" class="secondary" style="margin-top:12px;">Mark Current Week Completed</button></div>
            <div class="action-box"><h3>2. Carry over to next week</h3><p class="muted">Use when the duty was missed. The same original person remains responsible next week.</p><button id="carryOver" class="danger" style="margin-top:12px;">Carry Current Duty To Next Week</button></div>
          </div>
          <p id="actionStatus" class="status"></p>
        </section>

        <section class="card span-5">
          <div class="section-head"><div><h2>Upcoming Schedule</h2><p>Normalized Halifax events that feed the weekly duty windows.</p></div></div>
          <div id="events" class="timeline"></div>
        </section>

        <section class="card span-7">
          <div class="section-head"><div><h2>Assignments</h2><p>Recent weekly records plus the next predicted duty owner.</p></div></div>
          <div id="assignments" class="assignments"></div>
        </section>

        <section class="card span-5">
          <div class="section-head"><div><h2>Housemates</h2><p>Admins can edit phones, notes, status, skip-once state, and rotation order here.</p></div></div>
          <div id="housemates" class="people"></div>
        </section>
      </section>
    </main>

    <script>
      let state = null;
      let auth = { isAdmin: false, username: "admin" };
      let nextAssignmentPreview = null;

      async function fetchJson(url, options) {
        const requestOptions = { ...(options || {}) };
        const headers = { ...(requestOptions.headers || {}) };
        if (requestOptions.body !== undefined) {
          headers["Content-Type"] = "application/json";
        }
        if (Object.keys(headers).length > 0) {
          requestOptions.headers = headers;
        }
        const response = await fetch(url, requestOptions);
        const data = await response.json().catch(function () { return {}; });
        if (!response.ok) {
          throw new Error(data.error || JSON.stringify(data));
        }
        return data;
      }

      function escapeHtml(value) {
        return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
      }

      function housemateName(id) {
        const housemate = state.housemates.find(function (entry) { return entry.id === id; });
        return housemate ? housemate.name : id;
      }

      function eventById(id) {
        return state.collectionEvents.find(function (entry) { return entry.id === id; }) || null;
      }

      function getToday() {
        return new Date().toISOString().slice(0, 10);
      }

      function getCurrentAssignment() {
        const today = getToday();
        return state.assignments.find(function (assignment) { return assignment.weekStart <= today && assignment.weekEnd >= today; }) || null;
      }

      function getUpcomingEvents() {
        const today = getToday();
        return state.collectionEvents.slice().sort(function (left, right) { return left.date.localeCompare(right.date); }).filter(function (event) { return event.date >= today; }).slice(0, 8);
      }

      function setStatus(id, message, mode) {
        const node = document.getElementById(id);
        node.textContent = message || "";
        node.className = "status" + (mode ? " " + mode : "");
      }

      function formatActionMessage(url, result) {
        if (url.includes("/api/jobs/sync-schedule")) return result.synced ? "Halifax schedule synced successfully." : "Schedule sync completed.";
        if (url.includes("/api/jobs/run-weekly-duty")) return result.created ? "Weekly duty flow completed." : (result.reason || "No assignment was created.");
        if (url.includes("/api/jobs/resend-weekly")) return result.resent ? "Weekly reminder resent." : (result.reason || "Weekly resend finished.");
        if (url.includes("/api/jobs/send-completion-check")) return result.sent ? "Completion check message sent to admin." : (result.reason || "Completion check not sent.");
        if (url.includes("/api/assignments/current/reassign-next")) return "This week has been reassigned to the next person.";
        if (url.includes("/api/assignments/current/complete")) return "Current week marked as completed.";
        if (url.includes("/api/assignments/current/carry-over")) return "Current duty has been carried over to next week.";
        if (url.includes("/api/housemates/reorder")) return "Housemate order updated.";
        return "Action completed successfully.";
      }

      function renderAuthPanel() {
        document.getElementById("authTitle").textContent = auth.isAdmin ? "Admin Control" : "Dashboard Viewer";
        document.getElementById("authNote").textContent = auth.isAdmin ? "Signed in as " + auth.username + ". Manual actions and edits are enabled." : "Sign in as admin to unlock edits and manual actions.";
        document.getElementById("authPanel").innerHTML = auth.isAdmin
          ? '<div class="inline-actions"><span class="badge">Admin</span><button id="logoutButton" class="ghost" type="button">Log Out</button></div>'
          : '<form id="loginForm" class="stack"><label class="field"><span>Username</span><input id="adminUsername" type="text" autocomplete="username" value="' + escapeHtml(auth.username || "admin") + '" /></label><label class="field"><span>Password</span><input id="adminPassword" type="password" autocomplete="current-password" /></label><button type="submit">Admin Login</button></form>';

        if (auth.isAdmin) {
          document.getElementById("logoutButton").onclick = async function () {
            setStatus("authStatus", "Signing out...");
            try {
              await fetchJson("/api/admin/logout", { method: "POST" });
              setStatus("authStatus", "Signed out.", "ok");
              await refreshDashboard();
            } catch (error) {
              setStatus("authStatus", error.message, "error");
            }
          };
          return;
        }

        document.getElementById("loginForm").onsubmit = async function (event) {
          event.preventDefault();
          setStatus("authStatus", "Signing in...");
          try {
            await fetchJson("/api/admin/login", { method: "POST", body: JSON.stringify({ username: document.getElementById("adminUsername").value, password: document.getElementById("adminPassword").value }) });
            setStatus("authStatus", "Admin access enabled.", "ok");
            await refreshDashboard();
          } catch (error) {
            setStatus("authStatus", error.message, "error");
          }
        };
      }

      function applyPermissions() {
        document.getElementById("opsBadge").textContent = auth.isAdmin ? "Admin" : "Viewer";
        document.getElementById("opsBadge").className = auth.isAdmin ? "badge" : "badge viewer";
        document.getElementById("operationsButtons").innerHTML = auth.isAdmin
          ? '<button id="syncSchedule">Sync Halifax</button><button id="runWeekly">Run Weekly Duty</button><button id="resendWeekly" class="secondary">Resend Weekly</button><button id="sendCompletionCheck" class="warn">Send 11AM Check</button>'
          : '<button id="syncSchedule">Sync Halifax</button>';
        document.getElementById("currentWeekActionsCard").hidden = !auth.isAdmin;
      }

      function renderSummary() {
        const currentAssignment = getCurrentAssignment();
        const nextEvent = getUpcomingEvents()[0] || null;
        document.getElementById("heroMeta").innerHTML = [
          '<div class="tile"><strong>Address:</strong> ' + escapeHtml(state.config.address) + '</div>',
          '<div class="tile"><strong>Schedule:</strong> ' + escapeHtml(state.config.scheduleSource) + '</div>',
          '<div class="tile"><strong>Admin user:</strong> ' + escapeHtml(auth.username || "admin") + '</div>'
        ].join("");
        document.getElementById("miniCurrentAssignee").textContent = currentAssignment ? housemateName(currentAssignment.assigneeId) : "None";
        document.getElementById("miniCurrentWindow").textContent = currentAssignment ? currentAssignment.weekStart + " to " + currentAssignment.weekEnd : "No active assignment";
        document.getElementById("miniNextCollection").textContent = nextEvent ? nextEvent.date : "-";
        document.getElementById("miniNextStreams").textContent = nextEvent ? nextEvent.streams.join(", ") : "Waiting for sync";
        document.getElementById("miniNextWeek").textContent = nextAssignmentPreview ? housemateName(nextAssignmentPreview.assigneeId) : "Auto";
        document.getElementById("miniNextWeekNote").textContent = nextAssignmentPreview ? (nextAssignmentPreview.weekStart + " to " + nextAssignmentPreview.weekEnd) : "Normal rotation will continue.";
        document.getElementById("summary").innerHTML = [
          ["Last assigned", state.rotation.lastAssignedHousemateId ? housemateName(state.rotation.lastAssignedHousemateId) : "None"],
          ["Current status", currentAssignment ? currentAssignment.status : "None"],
          ["Completion check", currentAssignment && currentAssignment.completionStatus ? currentAssignment.completionStatus : "Not started"],
          ["Skip-once queue", (state.rotation.skipOnceHousemateIds || []).map(housemateName).join(", ") || "Empty"]
        ].map(function (item) { return '<div class="tile"><div class="label">' + item[0] + '</div><div class="detail"><div class="value">' + escapeHtml(item[1]) + '</div></div></div>'; }).join("");
        document.getElementById("metrics").innerHTML = [
          ["Assignments", state.assignments.length, "Tracked weekly records"],
          ["Reassigned Weeks", state.assignments.filter(function (entry) { return entry.reassignedToNextPerson; }).length, "Advance notices handled"],
          ["Missed Weeks", state.assignments.filter(function (entry) { return entry.status === "missed"; }).length, "Weeks carried forward"],
          ["Active Housemates", state.housemates.filter(function (entry) { return entry.isActive; }).length, "Eligible for duty"]
        ].map(function (metric) { return '<div class="metric"><div class="label">' + metric[0] + '</div><div class="value-big">' + metric[1] + '</div><div class="muted">' + metric[2] + '</div></div>'; }).join("");
      }

      function renderEvents() {
        document.getElementById("events").innerHTML = getUpcomingEvents().map(function (event) {
          return '<article class="timeline-item"><div><div><strong>' + escapeHtml(event.date) + '</strong></div><div class="muted">' + escapeHtml(event.weekStart + " to " + event.weekEnd) + '</div></div><div><div><strong>Source:</strong> ' + escapeHtml(event.source) + '</div><div class="streams">' + event.streams.map(function (stream) { return '<span class="stream">' + escapeHtml(stream) + '</span>'; }).join("") + '</div></div></article>';
        }).join("");
      }

      function renderAssignments() {
        const cards = [];
        if (nextAssignmentPreview) {
          const previewEvent = eventById(nextAssignmentPreview.collectionEventId);
          const skipped = nextAssignmentPreview.skippedHousemateIds && nextAssignmentPreview.skippedHousemateIds.length > 0 ? nextAssignmentPreview.skippedHousemateIds.map(housemateName).join(", ") : "None";
          cards.push('<article class="assignment-card preview"><div class="row-between"><div><div><strong>Next Week: ' + escapeHtml(housemateName(nextAssignmentPreview.assigneeId)) + '</strong></div><div class="muted">' + escapeHtml(nextAssignmentPreview.weekStart + " to " + nextAssignmentPreview.weekEnd) + '</div></div><span class="badge">' + escapeHtml(nextAssignmentPreview.selectionMode) + '</span></div><div class="detail-grid"><div class="detail"><div class="label">Collection</div><div class="value">' + escapeHtml(previewEvent ? previewEvent.date : nextAssignmentPreview.weekEnd) + '</div></div><div class="detail"><div class="label">Streams</div><div class="value">' + escapeHtml(previewEvent ? previewEvent.streams.join(", ") : "Unknown") + '</div></div><div class="detail"><div class="label">Skipped once</div><div class="value">' + escapeHtml(skipped) + '</div></div></div></article>');
        }
        state.assignments.slice().reverse().forEach(function (assignment) {
          const performer = assignment.actualPerformerId ? housemateName(assignment.actualPerformerId) : "Not recorded yet";
          cards.push('<article class="assignment-card"><div class="row-between"><div><div><strong>' + escapeHtml(housemateName(assignment.assigneeId)) + '</strong></div><div class="muted">' + escapeHtml(assignment.weekStart + " to " + assignment.weekEnd) + '</div><div class="mono">' + escapeHtml(assignment.id) + '</div></div><span class="badge">' + escapeHtml(assignment.status) + '</span></div><div class="detail-grid"><div class="detail"><div class="label">Actual performer</div><div class="value">' + escapeHtml(performer) + '</div></div><div class="detail"><div class="label">Completion</div><div class="value">' + escapeHtml(assignment.completionStatus || "pending") + '</div></div><div class="detail"><div class="label">Flow</div><div class="value">' + escapeHtml(assignment.reassignedToNextPerson ? "Assigned to next person" : assignment.carryOverToNextWeek ? "Carried over" : "Normal") + '</div></div></div></article>');
        });
        document.getElementById("assignments").innerHTML = cards.join("");
      }

      function renderHousemates() {
        document.getElementById("housemates").innerHTML = state.housemates.map(function (housemate, index) {
          const isSkipOnce = (state.rotation.skipOnceHousemateIds || []).includes(housemate.id);
          const adminForm = auth.isAdmin
            ? '<div class="person-form"><div class="inline-actions"><button type="button" class="ghost move-up" data-id="' + escapeHtml(housemate.id) + '"' + (index === 0 ? " disabled" : "") + '>Move Up</button><button type="button" class="ghost move-down" data-id="' + escapeHtml(housemate.id) + '"' + (index === state.housemates.length - 1 ? " disabled" : "") + '>Move Down</button></div><div class="form-grid" style="margin-top:12px;"><label class="field"><span>Name</span><input id="housemate-name-' + escapeHtml(housemate.id) + '" type="text" value="' + escapeHtml(housemate.name) + '" /></label><label class="field"><span>Room</span><input id="housemate-room-' + escapeHtml(housemate.id) + '" type="text" value="' + escapeHtml(housemate.roomNumber) + '" /></label><label class="field"><span>Phone</span><input id="housemate-phone-' + escapeHtml(housemate.id) + '" type="text" value="' + escapeHtml(housemate.whatsappNumber || "") + '" placeholder="+1782..." /></label><label class="field"><span>Status</span><select id="housemate-active-' + escapeHtml(housemate.id) + '"><option value="true"' + (housemate.isActive ? " selected" : "") + '>Active</option><option value="false"' + (!housemate.isActive ? " selected" : "") + '>Inactive</option></select></label><label class="field"><span>Skip next turn once</span><select id="housemate-skip-' + escapeHtml(housemate.id) + '"><option value="false"' + (!isSkipOnce ? " selected" : "") + '>No</option><option value="true"' + (isSkipOnce ? " selected" : "") + '>Yes</option></select></label><label class="field"><span>Notes</span><textarea id="housemate-notes-' + escapeHtml(housemate.id) + '" rows="2">' + escapeHtml(housemate.notes || "") + '</textarea></label></div><div class="inline-actions" style="margin-top:12px;"><button type="button" class="secondary save-housemate" data-id="' + escapeHtml(housemate.id) + '">Save Changes</button></div></div>'
            : "";
          return '<article class="person-card"><div class="row-between"><div><div><strong>' + escapeHtml(housemate.name) + '</strong></div><div class="muted">Room ' + escapeHtml(housemate.roomNumber) + '</div></div><span class="badge" style="background:' + (housemate.isActive ? "var(--accent-2-soft); color:#47601e;" : "var(--alert-soft); color: var(--alert);") + '">' + (housemate.isActive ? "active" : "inactive") + '</span></div><div class="detail-grid"><div class="detail"><div class="label">Phone</div><div class="value">' + escapeHtml(housemate.whatsappNumber || "Not set") + '</div></div><div class="detail"><div class="label">Notes</div><div class="value">' + escapeHtml(housemate.notes || "None") + '</div></div><div class="detail"><div class="label">Role</div><div class="value">' + (housemate.isActive ? "In rotation" : "Skipped") + '</div></div></div>' + adminForm + '</article>';
        }).join("");

        if (!auth.isAdmin) return;
        document.querySelectorAll(".save-housemate").forEach(function (button) { button.onclick = function () { saveHousemate(button.getAttribute("data-id")); }; });
        document.querySelectorAll(".move-up").forEach(function (button) { button.onclick = function () { moveHousemate(button.getAttribute("data-id"), -1); }; });
        document.querySelectorAll(".move-down").forEach(function (button) { button.onclick = function () { moveHousemate(button.getAttribute("data-id"), 1); }; });
      }

      function renderState() {
        renderAuthPanel();
        applyPermissions();
        renderSummary();
        renderEvents();
        renderAssignments();
        renderHousemates();
        bindActionButtons();
      }

      async function refreshDashboard() {
        const dashboard = await fetchJson("/api/dashboard");
        state = dashboard.state;
        auth = dashboard.auth;
        nextAssignmentPreview = dashboard.nextAssignmentPreview;
        renderState();
      }

      async function postAction(url, statusId, adminOnly) {
        if (adminOnly && !auth.isAdmin) {
          setStatus(statusId, "Admin access required.", "error");
          return;
        }
        setStatus(statusId, "Working...");
        try {
          const result = await fetchJson(url, { method: "POST" });
          setStatus(statusId, formatActionMessage(url, result), "ok");
          await refreshDashboard();
        } catch (error) {
          setStatus(statusId, error.message, "error");
        }
      }

      async function saveHousemate(id) {
        setStatus("opsStatus", "Saving housemate changes...");
        try {
          await fetchJson("/api/housemates/" + encodeURIComponent(id), { method: "PATCH", body: JSON.stringify({ name: document.getElementById("housemate-name-" + id).value, roomNumber: document.getElementById("housemate-room-" + id).value, whatsappNumber: document.getElementById("housemate-phone-" + id).value, isActive: document.getElementById("housemate-active-" + id).value === "true", skipNextTurn: document.getElementById("housemate-skip-" + id).value === "true", notes: document.getElementById("housemate-notes-" + id).value }) });
          setStatus("opsStatus", "Housemate updated.", "ok");
          await refreshDashboard();
        } catch (error) {
          setStatus("opsStatus", error.message, "error");
        }
      }

      async function moveHousemate(id, direction) {
        const orderedIds = state.housemates.map(function (entry) { return entry.id; });
        const currentIndex = orderedIds.indexOf(id);
        const nextIndex = currentIndex + direction;
        if (currentIndex === -1 || nextIndex < 0 || nextIndex >= orderedIds.length) return;
        const updatedIds = orderedIds.slice();
        const temp = updatedIds[currentIndex];
        updatedIds[currentIndex] = updatedIds[nextIndex];
        updatedIds[nextIndex] = temp;
        setStatus("opsStatus", "Updating rotation order...");
        try {
          const result = await fetchJson("/api/housemates/reorder", { method: "POST", body: JSON.stringify({ orderedIds: updatedIds }) });
          setStatus("opsStatus", formatActionMessage("/api/housemates/reorder", result), "ok");
          await refreshDashboard();
        } catch (error) {
          setStatus("opsStatus", error.message, "error");
        }
      }

      function bindActionButtons() {
        document.getElementById("syncSchedule").onclick = function () { return postAction("/api/jobs/sync-schedule", "opsStatus", false); };
        const runWeeklyButton = document.getElementById("runWeekly");
        if (runWeeklyButton) runWeeklyButton.onclick = function () { return postAction("/api/jobs/run-weekly-duty", "opsStatus", true); };
        const resendWeeklyButton = document.getElementById("resendWeekly");
        if (resendWeeklyButton) resendWeeklyButton.onclick = function () { return postAction("/api/jobs/resend-weekly", "opsStatus", true); };
        const sendCompletionCheckButton = document.getElementById("sendCompletionCheck");
        if (sendCompletionCheckButton) sendCompletionCheckButton.onclick = function () { return postAction("/api/jobs/send-completion-check", "opsStatus", true); };
        const assignNextButton = document.getElementById("assignNext");
        if (assignNextButton) assignNextButton.onclick = function () { return postAction("/api/assignments/current/reassign-next", "actionStatus", true); };
        const markCompleteButton = document.getElementById("markComplete");
        if (markCompleteButton) markCompleteButton.onclick = function () { return postAction("/api/assignments/current/complete", "actionStatus", true); };
        const carryOverButton = document.getElementById("carryOver");
        if (carryOverButton) carryOverButton.onclick = function () { return postAction("/api/assignments/current/carry-over", "actionStatus", true); };
      }

      refreshDashboard().catch(function (error) { setStatus("opsStatus", error.message, "error"); });
    </script>
  </body>
</html>`;
}
