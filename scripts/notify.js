// Runs on a schedule via .github/workflows/whatsapp-notify.yml
// Posts this week's room + toilet duty to your WhatsApp group using Green API.
//
// Required environment variables (set as GitHub Actions secrets):
//   GREENAPI_ID_INSTANCE   — from your Green API console
//   GREENAPI_API_TOKEN     — from your Green API console
//   GREENAPI_GROUP_CHAT_ID — the group's chat id, ending in @g.us

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { upcomingSchedule } from '../rotation.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadConfig() {
  const raw = readFileSync(join(__dirname, '..', 'config.json'), 'utf-8');
  return JSON.parse(raw);
}

function buildMessage(config, week) {
  const dateStr = week.sundayUTC.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const lines = [
    `🧹 *Weekly cleaning duty — ${dateStr}*`,
    ``,
    `🚪 Room: *${week.room.name}*`,
  ];
  if (week.toilet.active) {
    lines.push(`🚿 Toilet: *${week.toilet.name}*`);
  }
  lines.push(``, `Please finish by end of day. Thanks!`);
  return lines.join('\n');
}

async function sendToWhatsApp(message) {
  const { GREENAPI_ID_INSTANCE, GREENAPI_API_TOKEN, GREENAPI_GROUP_CHAT_ID } = process.env;

  if (!GREENAPI_ID_INSTANCE || !GREENAPI_API_TOKEN || !GREENAPI_GROUP_CHAT_ID) {
    throw new Error(
      'Missing one of GREENAPI_ID_INSTANCE / GREENAPI_API_TOKEN / GREENAPI_GROUP_CHAT_ID env vars.'
    );
  }

  const url = `https://api.green-api.com/waInstance${GREENAPI_ID_INSTANCE}/sendMessage/${GREENAPI_API_TOKEN}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chatId: GREENAPI_GROUP_CHAT_ID,
      message,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Green API request failed (${res.status}): ${body}`);
  }

  return res.json();
}

async function main() {
  const config = loadConfig();
  const [thisWeek] = upcomingSchedule(config, 1);
  const message = buildMessage(config, thisWeek);

  console.log('Sending message:\n' + message);
  const result = await sendToWhatsApp(message);
  console.log('Green API response:', result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
