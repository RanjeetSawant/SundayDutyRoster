import { currentSundayUTC, upcomingSchedule, sundayKey } from './rotation.js';

// This site is hosted at https://ranjeetsawant.github.io/SundayDutyRoster/
// so the repo lives at github.com/ranjeetsawant/SundayDutyRoster.
const REPO_OWNER = 'ranjeetsawant';
const REPO_NAME = 'SundayDutyRoster';
const OVERRIDES_PATH = 'overrides.json';

const fmt = (d) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

let config = null;
let overrides = {};
let schedule = [];

async function main() {
  config = await fetch('config.json').then((r) => r.json());
  overrides = await fetchOverrides();
  schedule = upcomingSchedule(config, 8, new Date(), overrides);

  renderHero(schedule[0]);
  renderWheel(config, schedule[0]);
  renderTable(schedule.slice(0, 6));
  setupAdminPanel();
}

async function fetchOverrides() {
  try {
    const res = await fetch('overrides.json', { cache: 'no-store' });
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}

function renderHero(week) {
  const hero = document.getElementById('duty-hero');
  hero.innerHTML = `
    <div class="duty-card room">
      <p class="role">Room duty</p>
      <p class="name">${escapeHtml(week.room.name)}${week.room.manual ? manualBadge() : ''}</p>
      <p class="week-of">Week of ${fmt(week.sundayUTC)}</p>
    </div>
    <div class="duty-card toilet">
      <p class="role">Toilet duty</p>
      <p class="name">${week.toilet.active ? escapeHtml(week.toilet.name) + (week.toilet.manual ? manualBadge() : '') : 'No toilet duty this week'}</p>
      <p class="week-of">${week.toilet.active ? 'Week of ' + fmt(week.sundayUTC) : 'Resumes next week'}</p>
    </div>
  `;
}

function manualBadge() {
  return ' <span class="manual-badge" title="Manually assigned">✎</span>';
}

function renderWheel(config, week) {
  const svg = document.getElementById('wheel');
  const cx = 200, cy = 200, r = 140;
  const members = config.members;
  const n = members.length;

  const pos = (i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  const roomIdx = members.indexOf(week.room.name);
  const toiletIdx = week.toilet.active ? members.indexOf(week.toilet.name) : -1;

  let svgParts = [];

  if (roomIdx > -1) {
    const p = pos(roomIdx);
    svgParts.push(`<line class="wheel-pointer-line" x1="${cx}" y1="${cy}" x2="${p.x}" y2="${p.y}" stroke="var(--room)" stroke-width="3" />`);
  }
  if (toiletIdx > -1) {
    const p = pos(toiletIdx);
    svgParts.push(`<line class="wheel-pointer-line dashed" x1="${cx}" y1="${cy}" x2="${p.x}" y2="${p.y}" stroke="var(--toilet)" stroke-width="3" stroke-dasharray="6 6" />`);
  }

  svgParts.push(`<circle cx="${cx}" cy="${cy}" r="6" fill="var(--ink)" />`);

  members.forEach((name, i) => {
    const p = pos(i);
    const isRoom = i === roomIdx;
    const isToilet = i === toiletIdx;
    const fill = isRoom ? 'var(--room)' : isToilet ? 'var(--toilet)' : 'var(--surface-2)';
    const stroke = isRoom || isToilet ? 'none' : 'var(--rule)';
    const labelY = p.y + (p.y > cy ? 28 : -20);
    const nodeClass = `wheel-node${isRoom ? ' active-room' : ''}${isToilet ? ' active-toilet' : ''}`;
    svgParts.push(`<circle class="${nodeClass}" cx="${p.x}" cy="${p.y}" r="16" fill="${fill}" stroke="${stroke}" stroke-width="1.5"><title>${escapeXml(name)}</title></circle>`);
    svgParts.push(`<text x="${p.x}" y="${labelY}" text-anchor="middle" class="wheel-node-label${isRoom || isToilet ? ' active' : ''}">${escapeXml(name)}</text>`);
  });

  svg.innerHTML = svgParts.join('\n');
}

function renderTable(rows) {
  const tbody = document.querySelector('#schedule-table tbody');
  tbody.innerHTML = rows
    .map((week, i) => `
      <tr class="${i === 0 ? 'is-current-week' : ''} row-enter" style="animation-delay:${0.4 + i * 0.06}s">
        <td>${fmt(week.sundayUTC)}</td>
        <td class="room-name">${escapeHtml(week.room.name)}${week.room.manual ? manualBadge() : ''}</td>
        <td class="toilet-name">${week.toilet.active ? escapeHtml(week.toilet.name) + (week.toilet.manual ? manualBadge() : '') : '—'}</td>
      </tr>
    `)
    .join('');
}

// ---------- Admin panel ----------

function setupAdminPanel() {
  const weekSelect = document.getElementById('admin-week');
  const roomSelect = document.getElementById('admin-room');
  const toiletSelect = document.getElementById('admin-toilet');
  const statusEl = document.getElementById('admin-status');

  weekSelect.innerHTML = schedule
    .map((w) => `<option value="${sundayKey(w.sundayUTC)}">${fmt(w.sundayUTC)}</option>`)
    .join('');

  roomSelect.innerHTML = config.members
    .map((m) => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`)
    .join('');

  toiletSelect.innerHTML =
    `<option value="__skip__">No toilet duty (skip)</option>` +
    config.members.map((m) => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join('');

  function syncSelectsToWeek() {
    const key = weekSelect.value;
    const week = schedule.find((w) => sundayKey(w.sundayUTC) === key);
    if (!week) return;
    roomSelect.value = week.room.name;
    toiletSelect.value = week.toilet.active ? week.toilet.name : '__skip__';
  }
  weekSelect.addEventListener('change', syncSelectsToWeek);
  syncSelectsToWeek();

  document.getElementById('admin-save').addEventListener('click', () => {
    const key = weekSelect.value;
    const override = {
      room: roomSelect.value,
      toilet: toiletSelect.value === '__skip__' ? null : toiletSelect.value,
    };
    commitOverride(key, override, statusEl);
  });

  document.getElementById('admin-reset').addEventListener('click', () => {
    const key = weekSelect.value;
    commitOverride(key, undefined, statusEl); // undefined = remove this week's override entirely
  });
}

async function commitOverride(dateKey, override, statusEl) {
  const token = document.getElementById('admin-token').value.trim();
  if (!token) {
    setStatus(statusEl, 'Paste a GitHub token first.', true);
    return;
  }

  setStatus(statusEl, 'Saving…', false);

  try {
    const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${OVERRIDES_PATH}`;
    const authHeaders = {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github+json',
    };

    const getRes = await fetch(apiUrl, { headers: authHeaders });
    if (!getRes.ok) throw new Error(`Couldn't read overrides.json (${getRes.status}). Check the token's repo access.`);
    const getData = await getRes.json();
    const current = JSON.parse(decodeBase64Utf8(getData.content));

    if (override === undefined) {
      delete current[dateKey];
    } else {
      current[dateKey] = override;
    }

    const putRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: override === undefined
          ? `Reset ${dateKey} to rotation via website`
          : `Override ${dateKey} via website`,
        content: encodeBase64Utf8(JSON.stringify(current, null, 2)),
        sha: getData.sha,
      }),
    });

    if (!putRes.ok) {
      const body = await putRes.text();
      throw new Error(`GitHub rejected the save (${putRes.status}): ${body.slice(0, 200)}`);
    }

    setStatus(statusEl, 'Saved. GitHub Pages usually updates within a minute — refresh to see it.', false);
  } catch (err) {
    setStatus(statusEl, err.message, true);
  }
}

function setStatus(el, message, isError) {
  el.textContent = message;
  el.classList.toggle('is-error', isError);
}

function encodeBase64Utf8(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

function decodeBase64Utf8(b64) {
  return decodeURIComponent(escape(atob(b64.replace(/\n/g, ''))));
}

function escapeXml(s) {
  return s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));
}

function escapeHtml(s) {
  return escapeXml(String(s));
}

main().catch((err) => {
  document.getElementById('duty-hero').innerHTML = `<p style="color:#e08383">Couldn't load the roster: ${err.message}</p>`;
  console.error(err);
});
