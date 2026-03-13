export function renderAdminPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Garbage Duty Admin</title>
    <style>
      :root {
        --bg: #f6f1e8;
        --paper: rgba(255, 252, 246, 0.84);
        --ink: #18221a;
        --muted: #5f6a60;
        --line: rgba(24, 34, 26, 0.1);
        --accent: #1f4d5f;
        --accent-soft: #d9ecef;
        --accent-2: #78902d;
        --accent-2-soft: #ebf2d7;
        --warn: #8d4e1f;
        --warn-soft: #f5e6d5;
        --alert: #8f3a2e;
        --alert-soft: #f8dfdb;
        --radius: 24px;
        --shadow: 0 24px 60px rgba(41, 42, 35, 0.1);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        color: var(--ink);
        font-family: "Segoe UI", "Helvetica Neue", sans-serif;
        background:
          radial-gradient(circle at 10% 20%, rgba(120,144,45,0.18), transparent 24%),
          radial-gradient(circle at 90% 10%, rgba(31,77,95,0.12), transparent 20%),
          linear-gradient(180deg, #f8f4eb 0%, #efe8dc 100%);
      }
      main {
        max-width: 1240px;
        margin: 0 auto;
        padding: 28px 18px 72px;
      }
      .hero, .card {
        background: var(--paper);
        backdrop-filter: blur(16px);
        border-radius: var(--radius);
        border: 1px solid rgba(255,255,255,0.7);
        box-shadow: var(--shadow);
      }
      .hero {
        display: grid;
        grid-template-columns: 1.4fr 1fr;
        gap: 18px;
        padding: 28px;
        margin-bottom: 18px;
      }
      .hero h1 {
        font-family: Georgia, "Times New Roman", serif;
        font-size: clamp(2.2rem, 4vw, 3.7rem);
        line-height: 0.94;
        letter-spacing: -0.04em;
        margin: 0;
        max-width: 8ch;
      }
      .eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        font-size: 12px;
        color: var(--muted);
        margin-bottom: 14px;
      }
      .dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: linear-gradient(135deg, var(--accent-2), #abc64d);
        box-shadow: 0 0 0 6px rgba(120,144,45,0.12);
      }
      .hero-copy {
        margin-top: 16px;
        max-width: 58ch;
        color: var(--muted);
        line-height: 1.6;
      }
      .token-row, .mini-grid, .dashboard-grid, .stack, .metrics, .timeline, .assignments-list, .people-list {
        display: grid;
        gap: 12px;
      }
      .token-row {
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        margin-top: 20px;
      }
      .token {
        padding: 12px 14px;
        border-radius: 16px;
        background: rgba(255,255,255,0.72);
        border: 1px solid rgba(24,34,26,0.08);
        font-size: 13px;
      }
      .mini-grid {
        grid-template-columns: 1fr;
      }
      .mini-stat {
        padding: 16px;
        border-radius: 18px;
        background: rgba(255,255,255,0.74);
        border: 1px solid rgba(24,34,26,0.08);
      }
      .mini-stat .label, .metric .label, .snapshot .label, .detail .label {
        font-size: 11px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--muted);
      }
      .mini-stat .value, .metric .value {
        margin-top: 8px;
        font-size: 29px;
        font-weight: 700;
        letter-spacing: -0.04em;
      }
      .mini-stat .note, .metric .sub, .muted {
        margin-top: 6px;
        color: var(--muted);
        font-size: 13px;
        line-height: 1.45;
      }
      .dashboard-grid {
        grid-template-columns: repeat(12, 1fr);
        gap: 18px;
      }
      .span-4 { grid-column: span 4; }
      .span-5 { grid-column: span 5; }
      .span-6 { grid-column: span 6; }
      .span-7 { grid-column: span 7; }
      .span-8 { grid-column: span 8; }
      .span-12 { grid-column: span 12; }
      .card {
        padding: 22px;
      }
      .card-header {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: flex-start;
        margin-bottom: 16px;
      }
      .card-header h2 {
        margin: 0;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 1.55rem;
        letter-spacing: -0.03em;
      }
      .card-header p {
        margin: 6px 0 0;
        color: var(--muted);
        font-size: 13px;
        max-width: 34ch;
        line-height: 1.45;
      }
      .badge {
        padding: 6px 10px;
        border-radius: 999px;
        background: var(--accent-soft);
        color: var(--accent);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        white-space: nowrap;
      }
      .button-row {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
      }
      button {
        width: 100%;
        border: 0;
        border-radius: 14px;
        padding: 12px 14px;
        cursor: pointer;
        font: inherit;
        font-weight: 700;
        color: white;
        background: linear-gradient(135deg, #1e5263, #173d4a);
        box-shadow: 0 12px 26px rgba(31,77,95,0.2);
      }
      button.secondary {
        background: linear-gradient(135deg, #7c9431, #677926);
        box-shadow: 0 12px 26px rgba(120,144,45,0.2);
      }
      button.warn {
        background: linear-gradient(135deg, #ad6a32, #8d4e1f);
        box-shadow: 0 12px 26px rgba(141,78,31,0.18);
      }
      button.danger {
        background: linear-gradient(135deg, #a4483a, #863226);
        box-shadow: 0 12px 26px rgba(143,58,46,0.18);
      }
      select, textarea {
        width: 100%;
        padding: 12px 14px;
        border-radius: 14px;
        border: 1px solid var(--line);
        background: rgba(255,255,255,0.82);
        font: inherit;
        color: var(--ink);
      }
      .status {
        min-height: 20px;
        margin-top: 12px;
        font-size: 14px;
        color: var(--muted);
      }
      .status.ok { color: #325d2d; }
      .status.error { color: var(--alert); }
      .metrics {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }
      .metric, .snapshot, .timeline-item, .assignment-card, .person-card, .action-box {
        padding: 16px;
        border-radius: 18px;
        background: rgba(255,255,255,0.74);
        border: 1px solid rgba(24,34,26,0.06);
      }
      .snapshot-grid, .detail-grid {
        display: grid;
        gap: 12px;
      }
      .snapshot-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .snapshot .value {
        margin-top: 6px;
        font-size: 18px;
        font-weight: 700;
        line-height: 1.3;
      }
      .timeline-item {
        display: grid;
        grid-template-columns: 130px 1fr;
        gap: 12px;
      }
      .timeline-date {
        font-weight: 700;
      }
      .streams {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
      }
      .stream {
        padding: 5px 10px;
        border-radius: 999px;
        background: var(--accent-soft);
        color: var(--accent);
        font-size: 12px;
      }
      .assignment-top, .person-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
      }
      .assignment-title, .person-name {
        font-size: 18px;
        font-weight: 700;
        letter-spacing: -0.03em;
      }
      .detail-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
        margin-top: 14px;
      }
      .detail {
        padding: 12px;
        border-radius: 14px;
        background: rgba(240,236,225,0.85);
      }
      .detail .value {
        margin-top: 6px;
        font-weight: 700;
      }
      .mono {
        font-family: Consolas, monospace;
        font-size: 12px;
        color: var(--muted);
      }
      .action-box.reassign { background: var(--warn-soft); }
      .action-box.carry { background: var(--alert-soft); }
      .action-box.complete { background: var(--accent-2-soft); }
      @media (max-width: 980px) {
        .hero { grid-template-columns: 1fr; }
        .dashboard-grid { grid-template-columns: 1fr; }
        .span-4, .span-5, .span-6, .span-7, .span-8, .span-12 { grid-column: span 1; }
        .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      }
      @media (max-width: 720px) {
        main { padding: 18px 14px 48px; }
        .button-row, .metrics, .snapshot-grid, .detail-grid { grid-template-columns: 1fr; }
        .timeline-item { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <div>
          <div class="eyebrow"><span class="dot"></span> Halifax Household Rotation</div>
          <h1>Keep the duty fair, even when life is messy.</h1>
          <p class="hero-copy">This dashboard is now centered around a simpler real-world control model: either reassign this week to the next person, or carry the missed duty into next week. Everything else follows from that.</p>
          <div id="heroMeta" class="token-row"></div>
        </div>
        <div class="mini-grid">
          <div class="mini-stat">
            <div class="label">Current Week</div>
            <div id="miniCurrentAssignee" class="value">-</div>
            <div id="miniCurrentWindow" class="note">No active assignment</div>
          </div>
          <div class="mini-stat">
            <div class="label">Next Collection</div>
            <div id="miniNextCollection" class="value">-</div>
            <div id="miniNextStreams" class="note">Waiting for sync</div>
          </div>
          <div class="mini-stat">
            <div class="label">Next Week</div>
            <div id="miniNextWeek" class="value">Auto</div>
            <div id="miniNextWeekNote" class="note">Normal rotation will continue</div>
          </div>
        </div>
      </section>

      <section class="dashboard-grid">
        <section class="card span-8">
          <div class="card-header">
            <div>
              <h2>Operations</h2>
              <p>Live schedule and reminder controls.</p>
            </div>
            <span class="badge">Control Room</span>
          </div>
          <div class="button-row">
            <button id="syncSchedule">Sync Halifax</button>
            <button id="runWeekly">Run Weekly Duty</button>
            <button id="resendWeekly" class="secondary">Resend Weekly</button>
            <button id="sendCompletionCheck" class="warn">Send 11AM Check</button>
          </div>
          <p id="opsStatus" class="status"></p>
        </section>

        <section class="card span-4">
          <div class="card-header">
            <div>
              <h2>System Snapshot</h2>
              <p>Who is queued, what has been completed, and whether intervention is pending.</p>
            </div>
          </div>
          <div id="summary" class="snapshot-grid"></div>
        </section>

        <section class="card span-12">
          <div class="card-header">
            <div>
              <h2>Rotation Metrics</h2>
              <p>Operational counts pulled from current state.</p>
            </div>
          </div>
          <div id="metrics" class="metrics"></div>
        </section>

        <section class="card span-7">
          <div class="card-header">
            <div>
              <h2>Current Week Actions</h2>
              <p>Use only these two intervention patterns. If a reassigned replacement also misses, use carry-over and the system will revert to the original person for next week.</p>
            </div>
            <span class="badge">Two-Action Model</span>
          </div>
          <div class="stack">
            <div class="action-box reassign">
              <h3>1. Assign to next person</h3>
              <p class="muted">Use when the assigned person informs in advance. The next person covers this week, and the original person becomes next week’s duty.</p>
              <button id="assignNext" class="warn" style="margin-top:12px;">Assign This Week To Next Person</button>
            </div>
            <div class="action-box complete">
              <h3>Admin confirmation: completed</h3>
              <p class="muted">Use when the duty was completed successfully. Rotation advances normally.</p>
              <button id="markComplete" class="secondary" style="margin-top:12px;">Mark Current Week Completed</button>
            </div>
            <div class="action-box carry">
              <h3>2. Carry over to next week</h3>
              <p class="muted">Use when the duty was missed. The same original person remains responsible next week. If a reassigned replacement also failed, this action reverts the sequence back to the original order.</p>
              <button id="carryOver" class="danger" style="margin-top:12px;">Carry Current Duty To Next Week</button>
            </div>
          </div>
          <p id="actionStatus" class="status"></p>
        </section>

        <section class="card span-5">
          <div class="card-header">
            <div>
              <h2>Upcoming Schedule</h2>
              <p>Normalized Halifax events that feed the weekly duty windows.</p>
            </div>
          </div>
          <div id="events" class="timeline"></div>
        </section>

        <section class="card span-7">
          <div class="card-header">
            <div>
              <h2>Assignments</h2>
              <p>Recent weekly records, including reassignment and carry-over outcomes.</p>
            </div>
          </div>
          <div id="assignments" class="assignments-list"></div>
        </section>

        <section class="card span-5">
          <div class="card-header">
            <div>
              <h2>Housemates</h2>
              <p>Current roster and active eligibility.</p>
            </div>
          </div>
          <div id="housemates" class="people-list"></div>
        </section>
      </section>
    </main>

    <script>
      let state = null;

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
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || JSON.stringify(data));
        }
        return data;
      }

      function escapeHtml(value) {
        return String(value ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");
      }

      function housemateName(id) {
        const housemate = state.housemates.find((entry) => entry.id === id);
        return housemate ? housemate.name : id;
      }

      function getToday() {
        return new Date().toISOString().slice(0, 10);
      }

      function getCurrentAssignment() {
        const today = getToday();
        return state.assignments.find((assignment) => assignment.weekStart <= today && assignment.weekEnd >= today) || null;
      }

      function getUpcomingEvents() {
        const today = getToday();
        return state.collectionEvents
          .slice()
          .sort((a, b) => a.date.localeCompare(b.date))
          .filter((event) => event.date >= today)
          .slice(0, 8);
      }

      function formatActionMessage(url, result) {
        if (url.includes("/api/jobs/sync-schedule")) {
          return result.synced ? "Halifax schedule synced successfully." : "Schedule sync completed.";
        }
        if (url.includes("/api/jobs/run-weekly-duty")) {
          if (result.created) return "Weekly duty flow completed.";
          return result.reason || "No assignment was created.";
        }
        if (url.includes("/api/jobs/resend-weekly")) {
          return result.resent ? "Weekly reminder resent." : (result.reason || "Weekly resend finished.");
        }
        if (url.includes("/api/jobs/send-completion-check")) {
          return result.sent ? "Completion check message sent to admin." : (result.reason || "Completion check not sent.");
        }
        if (url.includes("/api/assignments/current/reassign-next")) {
          return "This week has been reassigned to the next person.";
        }
        if (url.includes("/api/assignments/current/complete")) {
          return "Current week marked as completed.";
        }
        if (url.includes("/api/assignments/current/carry-over")) {
          return "Current duty has been carried over to next week.";
        }
        return "Action completed successfully.";
      }

      function setStatus(id, message, mode) {
        const node = document.getElementById(id);
        node.textContent = message || "";
        node.className = "status" + (mode ? " " + mode : "");
      }

      function renderState() {
        const currentAssignment = getCurrentAssignment();
        const nextEvent = getUpcomingEvents()[0] || null;

        document.getElementById("heroMeta").innerHTML = [
          '<div class="token"><strong>Address:</strong> ' + escapeHtml(state.config.address) + '</div>',
          '<div class="token"><strong>Schedule:</strong> ' + escapeHtml(state.config.scheduleSource) + '</div>',
          '<div class="token"><strong>Queued next week:</strong> ' + escapeHtml(state.rotation.nextForcedHousemateId ? housemateName(state.rotation.nextForcedHousemateId) : 'Auto') + '</div>'
        ].join("");

        document.getElementById("miniCurrentAssignee").textContent = currentAssignment ? housemateName(currentAssignment.assigneeId) : "None";
        document.getElementById("miniCurrentWindow").textContent = currentAssignment ? currentAssignment.weekStart + " to " + currentAssignment.weekEnd : "No active assignment";
        document.getElementById("miniNextCollection").textContent = nextEvent ? nextEvent.date : "-";
        document.getElementById("miniNextStreams").textContent = nextEvent ? nextEvent.streams.join(", ") : "Waiting for sync";
        document.getElementById("miniNextWeek").textContent = state.rotation.nextForcedHousemateId ? housemateName(state.rotation.nextForcedHousemateId) : "Auto";
        document.getElementById("miniNextWeekNote").textContent = state.rotation.nextForcedHousemateId ? "Next week is currently forced." : "Normal rotation will continue.";

        document.getElementById("summary").innerHTML = [
          ['Last assigned', state.rotation.lastAssignedHousemateId ? housemateName(state.rotation.lastAssignedHousemateId) : 'None'],
          ['Current status', currentAssignment ? currentAssignment.status : 'None'],
          ['Completion check', currentAssignment?.completionStatus || 'Not started'],
          ['Skip-once queue', (state.rotation.skipOnceHousemateIds || []).map(housemateName).join(', ') || 'Empty']
        ].map((item) =>
          '<div class="snapshot"><div class="label">' + item[0] + '</div><div class="value">' + escapeHtml(item[1]) + '</div></div>'
        ).join("");

        document.getElementById("metrics").innerHTML = [
          ['Assignments', state.assignments.length, 'Tracked weekly records'],
          ['Reassigned Weeks', state.assignments.filter((a) => a.reassignedToNextPerson).length, 'Advance notices handled'],
          ['Missed Weeks', state.assignments.filter((a) => a.status === 'missed').length, 'Weeks carried forward'],
          ['Active Housemates', state.housemates.filter((h) => h.isActive).length, 'Eligible for duty']
        ].map((metric) =>
          '<div class="metric"><div class="label">' + metric[0] + '</div><div class="value">' + metric[1] + '</div><div class="sub">' + metric[2] + '</div></div>'
        ).join("");

        document.getElementById("events").innerHTML = getUpcomingEvents().map((event) =>
          '<article class="timeline-item">' +
            '<div><div class="timeline-date">' + escapeHtml(event.date) + '</div><div class="muted">' + escapeHtml(event.weekStart + ' to ' + event.weekEnd) + '</div></div>' +
            '<div><div><strong>Source:</strong> ' + escapeHtml(event.source) + '</div><div class="streams">' + event.streams.map((stream) => '<span class="stream">' + escapeHtml(stream) + '</span>').join('') + '</div></div>' +
          '</article>'
        ).join("");

        document.getElementById("assignments").innerHTML = state.assignments.slice().reverse().map((assignment) => {
          const performer = assignment.actualPerformerId ? housemateName(assignment.actualPerformerId) : 'Not recorded yet';
          return '<article class="assignment-card">' +
            '<div class="assignment-top">' +
              '<div><div class="assignment-title">' + escapeHtml(housemateName(assignment.assigneeId)) + '</div><div class="muted">' + escapeHtml(assignment.weekStart + ' to ' + assignment.weekEnd) + '</div><div class="mono">' + escapeHtml(assignment.id) + '</div></div>' +
              '<span class="badge">' + escapeHtml(assignment.status) + '</span>' +
            '</div>' +
            '<div class="detail-grid">' +
              '<div class="detail"><div class="label">Actual performer</div><div class="value">' + escapeHtml(performer) + '</div></div>' +
              '<div class="detail"><div class="label">Completion</div><div class="value">' + escapeHtml(assignment.completionStatus || 'pending') + '</div></div>' +
              '<div class="detail"><div class="label">Flow</div><div class="value">' + escapeHtml(assignment.reassignedToNextPerson ? 'Assigned to next person' : assignment.carryOverToNextWeek ? 'Carried over' : 'Normal') + '</div></div>' +
            '</div>' +
          '</article>';
        }).join("");

        document.getElementById("housemates").innerHTML = state.housemates.map((housemate) =>
          '<article class="person-card">' +
            '<div class="person-top">' +
              '<div><div class="person-name">' + escapeHtml(housemate.name) + '</div><div class="muted">Room ' + escapeHtml(housemate.roomNumber) + '</div></div>' +
              '<span class="badge" style="background:' + (housemate.isActive ? 'var(--accent-2-soft); color:#47601e;' : 'var(--alert-soft); color: var(--alert);') + '">' + (housemate.isActive ? 'active' : 'inactive') + '</span>' +
            '</div>' +
            '<div class="detail-grid">' +
              '<div class="detail"><div class="label">Phone</div><div class="value">' + escapeHtml(housemate.whatsappNumber || 'Not set') + '</div></div>' +
              '<div class="detail"><div class="label">Notes</div><div class="value">' + escapeHtml(housemate.notes || 'None') + '</div></div>' +
              '<div class="detail"><div class="label">Role</div><div class="value">' + (housemate.isActive ? 'In rotation' : 'Skipped') + '</div></div>' +
            '</div>' +
          '</article>'
        ).join("");
      }

      async function refreshState() {
        state = await fetchJson("/api/state");
        renderState();
      }

      async function postAction(url, statusId) {
        setStatus(statusId, "Working...");
        try {
          const result = await fetchJson(url, { method: "POST" });
          setStatus(statusId, formatActionMessage(url, result), "ok");
          await refreshState();
        } catch (error) {
          setStatus(statusId, error.message, "error");
        }
      }

      document.getElementById("syncSchedule").onclick = () => postAction("/api/jobs/sync-schedule", "opsStatus");
      document.getElementById("runWeekly").onclick = () => postAction("/api/jobs/run-weekly-duty", "opsStatus");
      document.getElementById("resendWeekly").onclick = () => postAction("/api/jobs/resend-weekly", "opsStatus");
      document.getElementById("sendCompletionCheck").onclick = () => postAction("/api/jobs/send-completion-check", "opsStatus");
      document.getElementById("assignNext").onclick = () => postAction("/api/assignments/current/reassign-next", "actionStatus");
      document.getElementById("markComplete").onclick = () => postAction("/api/assignments/current/complete", "actionStatus");
      document.getElementById("carryOver").onclick = () => postAction("/api/assignments/current/carry-over", "actionStatus");

      refreshState().catch((error) => {
        setStatus("opsStatus", error.message, "error");
      });
    </script>
  </body>
</html>`;
}
