// Pure rotation logic — shared by the website (app.js) and the
// notifier (scripts/notify.js). No dependencies, works in browser or Node.

/** Most recent Sunday at UTC midnight, for a given reference Date. */
export function currentSundayUTC(ref = new Date()) {
  const d = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - d.getUTCDay()); // getUTCDay(): 0 = Sunday
  return d;
}

/** Number of full weeks between startSunday and the given Sunday. */
export function weekIndex(startSundayISO, sundayUTC) {
  const start = new Date(startSundayISO + "T00:00:00Z");
  const diffDays = Math.round((sundayUTC - start) / 86400000);
  return Math.floor(diffDays / 7);
}

/** Positive modulo (handles negative weekIndex for Sundays before startSunday). */
function mod(n, len) {
  return ((n % len) + len) % len;
}

/** Who is on duty for a given order array, on a given Sunday. Rotates every week. */
export function assigneeFor(order, startSundayISO, sundayUTC) {
  const idx = weekIndex(startSundayISO, sundayUTC);
  const pos = mod(idx, order.length);
  return { name: order[pos], weekIndex: idx, position: pos };
}

/**
 * Toilet duty happens only every other Sunday (skips a week in between).
 * config.toiletStartSunday is the first Sunday toilet cleaning happens on;
 * the rotation only advances on those "active" Sundays.
 */
export function toiletDutyFor(config, sundayUTC) {
  const toiletStart = config.toiletStartSunday || config.startSunday;
  const idx = weekIndex(toiletStart, sundayUTC);
  const active = mod(idx, 2) === 0;
  if (!active) {
    return { active: false, name: null, weekIndex: idx, position: null };
  }
  const cyclePos = mod(Math.floor(idx / 2), config.toiletOrder.length);
  return { active: true, name: config.toiletOrder[cyclePos], weekIndex: idx, position: cyclePos };
}

/** Full duty (room + toilet) for a given Sunday, from config. */
export function dutyForWeek(config, sundayUTC) {
  const room = assigneeFor(config.roomOrder, config.startSunday, sundayUTC);
  const toilet = toiletDutyFor(config, sundayUTC);
  return { sundayUTC, room, toilet };
}

/** dutyForWeek for N upcoming Sundays starting this week (n=0 is this week). */
export function upcomingSchedule(config, n = 6, ref = new Date()) {
  const start = currentSundayUTC(ref);
  const out = [];
  for (let i = 0; i < n; i++) {
    const sunday = new Date(start);
    sunday.setUTCDate(sunday.getUTCDate() + i * 7);
    out.push(dutyForWeek(config, sunday));
  }
  return out;
}
