import { currentSundayUTC, upcomingSchedule } from './rotation.js';

const fmt = (d) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

async function main() {
  const config = await fetch('config.json').then((r) => r.json());
  const schedule = upcomingSchedule(config, 6);
  const thisWeek = schedule[0];

  renderHero(thisWeek);
  renderWheel(config, thisWeek);
  renderTable(schedule);
}

function renderHero(week) {
  const hero = document.getElementById('duty-hero');
  hero.innerHTML = `
    <div class="duty-card room">
      <p class="role">Room duty</p>
      <p class="name">${week.room.name}</p>
      <p class="week-of">Week of ${fmt(week.sundayUTC)}</p>
    </div>
    <div class="duty-card toilet">
      <p class="role">Toilet duty</p>
      <p class="name">${week.toilet.active ? week.toilet.name : 'No toilet duty this week'}</p>
      <p class="week-of">${week.toilet.active ? 'Week of ' + fmt(week.sundayUTC) : 'Resumes next week'}</p>
    </div>
  `;
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

  // pointer lines from center to active nodes
  if (roomIdx > -1) {
    const p = pos(roomIdx);
    svgParts.push(`<line class="wheel-pointer-line" x1="${cx}" y1="${cy}" x2="${p.x}" y2="${p.y}" stroke="var(--room)" stroke-width="3" />`);
  }
  if (toiletIdx > -1) {
    const p = pos(toiletIdx);
    svgParts.push(`<line class="wheel-pointer-line dashed" x1="${cx}" y1="${cy}" x2="${p.x}" y2="${p.y}" stroke="var(--toilet)" stroke-width="3" stroke-dasharray="6 6" />`);
  }

  // center hub
  svgParts.push(`<circle cx="${cx}" cy="${cy}" r="6" fill="var(--ink)" />`);

  // member nodes
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

function renderTable(schedule) {
  const tbody = document.querySelector('#schedule-table tbody');
  tbody.innerHTML = schedule
    .map((week, i) => `
      <tr class="${i === 0 ? 'is-current-week' : ''} row-enter" style="animation-delay:${0.4 + i * 0.06}s">
        <td>${fmt(week.sundayUTC)}</td>
        <td class="room-name">${week.room.name}</td>
        <td class="toilet-name">${week.toilet.active ? week.toilet.name : '—'}</td>
      </tr>
    `)
    .join('');
}

function escapeXml(s) {
  return s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));
}

main().catch((err) => {
  document.getElementById('duty-hero').innerHTML = `<p style="color:#e08383">Couldn't load config.json: ${err.message}</p>`;
  console.error(err);
});
