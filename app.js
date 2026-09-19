import { upcomingSchedule } from './rotation.js';

// This site is hosted at https://ranjeetsawant.github.io/SundayDutyRoster/
// so the repo lives at github.com/ranjeetsawant/SundayDutyRoster.
const REPO_OWNER = 'ranjeetsawant';
const REPO_NAME = 'SundayDutyRoster';

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
  setupConfigEditor(config);
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

// ---------- Config editor ----------

let editorState = null; // { members: [{id,name}], roomOrder: [id], toiletOrder: [id], startSunday, toiletStartSunday, nextId }

function configToEditorState(cfg) {
  const members = cfg.members.map((name, i) => ({ id: 'm' + i, name }));
  const nameToId = Object.fromEntries(members.map((m) => [m.name, m.id]));
  const roomOrder = cfg.roomOrder.map((n) => nameToId[n]).filter(Boolean);
  const toiletOrder = cfg.toiletOrder.map((n) => nameToId[n]).filter(Boolean);
  return {
    members,
    roomOrder,
    toiletOrder,
    startSunday: cfg.startSunday,
    toiletStartSunday: cfg.toiletStartSunday || cfg.startSunday,
    nextId: members.length,
  };
}

function editorStateToConfig(state) {
  const idToName = Object.fromEntries(state.members.map((m) => [m.id, m.name.trim()]));
  return {
    startSunday: state.startSunday,
    toiletStartSunday: state.toiletStartSunday,
    members: state.members.map((m) => m.name.trim()).filter(Boolean),
    roomOrder: state.roomOrder.map((id) => idToName[id]).filter(Boolean),
    toiletOrder: state.toiletOrder.map((id) => idToName[id]).filter(Boolean),
  };
}

function setupConfigEditor(initialConfig) {
  editorState = configToEditorState(initialConfig);
  renderEditor();

  document.getElementById('add-member').addEventListener('click', () => {
    const id = 'm' + editorState.nextId++;
    editorState.members.push({ id, name: 'New flatmate' });
    editorState.roomOrder.push(id);
    editorState.toiletOrder.push(id);
    renderEditor();
  });

  document.getElementById('cfg-save').addEventListener('click', saveConfigEditor);
  document.getElementById('cfg-reload').addEventListener('click', reloadConfigEditor);
}

function renderEditor() {
  renderMemberList();
  renderOrderList('room-order-list', editorState.roomOrder);
  renderOrderList('toilet-order-list', editorState.toiletOrder);
  document.getElementById('cfg-start-sunday').value = editorState.startSunday;
  document.getElementById('cfg-toilet-start-sunday').value = editorState.toiletStartSunday;
}

function renderMemberList() {
  const container = document.getElementById('members-list');
  container.innerHTML = editorState.members
    .map(
      (m) => `
      <div class="member-row" data-id="${m.id}">
        <input type="text" value="${escapeHtml(m.name)}" data-member-input="${m.id}">
        <button type="button" class="remove-btn" data-remove-member="${m.id}" title="Remove flatmate">✕</button>
      </div>
    `
    )
    .join('');

  container.querySelectorAll('[data-member-input]').forEach((input) => {
    input.addEventListener('input', (e) => {
      const id = e.target.getAttribute('data-member-input');
      const member = editorState.members.find((m) => m.id === id);
      if (member) member.name = e.target.value;
      // live-update the name shown in the order lists without losing focus
      document.querySelectorAll(`[data-order-name="${id}"]`).forEach((el) => {
        el.textContent = e.target.value || '(unnamed)';
      });
    });
  });

  container.querySelectorAll('[data-remove-member]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (editorState.members.length <= 1) {
        setStatus(document.getElementById('cfg-status'), 'You need at least 1 flatmate.', true);
        return;
      }
      const id = btn.getAttribute('data-remove-member');
      editorState.members = editorState.members.filter((m) => m.id !== id);
      editorState.roomOrder = editorState.roomOrder.filter((x) => x !== id);
      editorState.toiletOrder = editorState.toiletOrder.filter((x) => x !== id);
      renderEditor();
    });
  });
}

function renderOrderList(elementId, order) {
  const list = document.getElementById(elementId);
  const nameOf = (id) => editorState.members.find((m) => m.id === id)?.name || '(unnamed)';

  list.innerHTML = order
    .map(
      (id, i) => `
      <li class="order-row">
        <span class="order-position">${i + 1}.</span>
        <span class="order-name" data-order-name="${id}">${escapeHtml(nameOf(id))}</span>
        <span class="reorder-btns">
          <button type="button" data-move="${elementId}:${i}:-1" ${i === 0 ? 'disabled' : ''} title="Move up">▲</button>
          <button type="button" data-move="${elementId}:${i}:1" ${i === order.length - 1 ? 'disabled' : ''} title="Move down">▼</button>
        </span>
      </li>
    `
    )
    .join('');

  list.querySelectorAll('[data-move]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const [listId, idxStr, dirStr] = btn.getAttribute('data-move').split(':');
      const idx = Number(idxStr);
      const dir = Number(dirStr);
      const arr = listId === 'room-order-list' ? editorState.roomOrder : editorState.toiletOrder;
      const target = idx + dir;
      if (target < 0 || target >= arr.length) return;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      renderEditor();
    });
  });
}

function isSunday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr + 'T00:00:00Z');
  return !isNaN(d) && d.getUTCDay() === 0;
}

async function saveConfigEditor() {
  const statusEl = document.getElementById('cfg-status');
  const token = document.getElementById('cfg-token').value.trim();

  editorState.startSunday = document.getElementById('cfg-start-sunday').value;
  editorState.toiletStartSunday = document.getElementById('cfg-toilet-start-sunday').value;

  if (!token) return setStatus(statusEl, 'Paste a GitHub token first.', true);
  if (editorState.members.some((m) => !m.name.trim())) return setStatus(statusEl, 'Every flatmate needs a name.', true);
  if (!isSunday(editorState.startSunday)) return setStatus(statusEl, '"Room rotation starts" must be a Sunday.', true);
  if (!isSunday(editorState.toiletStartSunday)) return setStatus(statusEl, '"Toilet rotation starts" must be a Sunday.', true);

  const names = editorState.members.map((m) => m.name.trim());
  if (new Set(names).size !== names.length) return setStatus(statusEl, 'Flatmate names must be unique.', true);

  setStatus(statusEl, 'Saving…', false);

  try {
    const newConfig = editorStateToConfig(editorState);
    await commitJsonFile('config.json', () => newConfig, 'Update roster config via website');
    setStatus(statusEl, 'Saved. GitHub Pages usually updates within a minute — refresh to see it.', false);
  } catch (err) {
    setStatus(statusEl, err.message, true);
  }
}

async function reloadConfigEditor() {
  const statusEl = document.getElementById('cfg-status');
  setStatus(statusEl, 'Reloading…', false);
  try {
    const fresh = await fetch('config.json', { cache: 'no-store' }).then((r) => r.json());
    editorState = configToEditorState(fresh);
    renderEditor();
    setStatus(statusEl, 'Reloaded from GitHub. Unsaved edits were discarded.', false);
  } catch (err) {
    setStatus(statusEl, err.message, true);
  }
}

/** GET a JSON file from the repo, run transformFn(parsedContent) -> newContent, PUT it back. */
async function commitJsonFile(path, transformFn, commitMessage) {
  const token = document.getElementById('cfg-token').value.trim();
  const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`;
  const authHeaders = {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github+json',
  };

  const getRes = await fetch(apiUrl, { headers: authHeaders });
  if (!getRes.ok) throw new Error(`Couldn't read ${path} (${getRes.status}). Check the token's repo access.`);
  const getData = await getRes.json();
  const current = JSON.parse(decodeBase64Utf8(getData.content));
  const updated = transformFn(current);

  const putRes = await fetch(apiUrl, {
    method: 'PUT',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: commitMessage,
      content: encodeBase64Utf8(JSON.stringify(updated, null, 2)),
      sha: getData.sha,
    }),
  });

  if (!putRes.ok) {
    const body = await putRes.text();
    throw new Error(`GitHub rejected the save (${putRes.status}): ${body.slice(0, 200)}`);
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
