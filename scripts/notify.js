// Runs on a schedule via .github/workflows/whatsapp-notify.yml
// Posts this week's room + toilet duty to your WhatsApp group using Green API.
//
// Required environment variables (set as GitHub Actions secrets):
//   GREENAPI_ID_INSTANCE   — from your Green API console
//   GREENAPI_API_TOKEN     — from your Green API console
//   GREENAPI_GROUP_CHAT_ID — the group's chat id, ending in @g.us
//   GREENAPI_API_URL       — the "apiUrl" shown in your console for this instance
//                            (looks like https://7105.api.green-api.com — each
//                            instance gets its own dedicated subdomain now).
//                            Falls back to the universal host below if not set,
//                            but the console's own URL is more reliable.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { upcomingSchedule } from '../rotation.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadConfig() {
  const raw = readFileSync(join(__dirname, '..', 'config.json'), 'utf-8');
  return JSON.parse(raw);
}

function loadOverrides() {
  try {
    const raw = readFileSync(join(__dirname, '..', 'overrides.json'), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function buildMessage(config, week) {
  const dateStr = week.sundayUTC.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',