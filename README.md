# Chore Wheel — Weekly Room & Toilet Duty

A small site + automation for a 5-person flat share:
- **Website** (GitHub Pages): shows this week's room/toilet duty and the next 6 weeks.
- **Automation** (GitHub Actions): every Sunday morning, posts the schedule to your
  WhatsApp group automatically.

Room and toilet duty rotate on **independent** 5-person orders (set in `config.json`),
so the pairing of who's on room vs. toilet shifts over time.

## 1. Edit `config.json`

```json
{
  "startSunday": "2026-08-02",
  "members": ["Member 1", "Member 2", "Member 3", "Member 4", "Member 5"],
  "roomOrder": ["Member 1", "Member 2", "Member 3", "Member 4", "Member 5"],
  "toiletOrder": ["Member 3", "Member 5", "Member 1", "Member 4", "Member 2"]
}
```

- Replace the placeholder names with your actual 5 flatmates.
- `startSunday` must be an actual Sunday (any Sunday works as the reference point —
  the rotation counts forward and backward from it).
- `roomOrder` and `toiletOrder` list the same 5 names, just in whatever order you
  want them to take turns. They don't have to match each other.

## 2. Host the site on GitHub Pages

1. Push this folder to a GitHub repo.
2. Repo Settings → Pages → Source: **Deploy from a branch** → Branch: `main`, folder `/ (root)`.
3. Your dashboard will be live at `https://<username>.github.io/<repo>/` within a minute or two.

No build step needed — it's plain HTML/CSS/JS.

> **Note:** `app.js` has `REPO_OWNER` and `REPO_NAME` constants at the top, set to
> match `ranjeetsawant/SundayDutyRoster`. If you ever rename the repo or move it to
> a different account, update those two lines too, or the roster editor's save
> button won't be able to find the right repo.

## 3. Set up automatic WhatsApp messages (Green API)

GitHub Actions can run on a schedule for free, even for a static-site repo — that's
what sends the WhatsApp message. It uses **Green API**, a service that lets a
regular WhatsApp number send messages via API (including into an existing group),
after a one-time QR-code login.

1. Go to **green-api.com** and create a free account. It gives you one free instance.
2. In the Green API console, scan the QR code with the WhatsApp account you want
   sending the messages (this can be your own number, or a spare number — either works,
   but a dedicated number is tidier since it'll message the group every week).
3. Copy your **idInstance** and **apiTokenInstance** from the console.
4. Find your group's chat ID:
   - Send any message in your WhatsApp group from the linked number.
   - Call Green API's `getChats` or `lastIncomingMessages` endpoint (documented in
     their console) — the group's `chatId` will look like `1234567890@g.us`.
5. In your GitHub repo: Settings → Secrets and variables → Actions → New repository secret.
   Add three secrets:
   - `GREENAPI_ID_INSTANCE`
   - `GREENAPI_API_TOKEN`
   - `GREENAPI_GROUP_CHAT_ID`

## 4. Test it

Go to the **Actions** tab → "WhatsApp Sunday Notify" → **Run workflow** (manual
trigger) to send a test message immediately, without waiting for Sunday.

The scheduled run fires every Sunday at 08:00 IST (`.github/workflows/whatsapp-notify.yml`,
edit the cron line if you want a different time — cron times are in UTC).

## 5. Edit the roster from the website (config editor)

The site has a **⚙️ Edit roster** panel at the bottom for adding/removing flatmates,
renaming them, reordering whose turn is next, and changing the rotation start dates —
all from the browser, no code editing needed. It writes directly to `config.json` in
your repo via the GitHub API, so the site and the next WhatsApp message both pick it up.

**One-time setup — create a token:**
1. GitHub → your profile photo → **Settings** → **Developer settings** (bottom of
   left sidebar) → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
2. Give it a name, set **Repository access** to **Only select repositories** → pick
   this repo.
3. Under **Permissions** → **Repository permissions** → set **Contents** to
   **Read and write**. Leave everything else as No access.
4. Generate it and copy the token (starts with `github_pat_...`).

**Using the panel:**
1. Open the site, expand **⚙️ Edit roster**.
2. Add a flatmate with **+ Add flatmate**, remove one with the ✕ next to their name,
   or just edit the name text directly.
3. Reorder the "Room cleaning order" and "Toilet cleaning order" lists with the ▲▼
   buttons — each list is independent, so the room/toilet pairing can differ.
4. Adjust the start dates if needed (both must land on an actual Sunday).
5. Paste your token, click **Save changes**.
6. **Reload from GitHub** discards any unsaved edits in the form and pulls the
   latest saved version back in — handy if you want to start over.

The token is only used to call GitHub's API directly from your browser — it's never
saved anywhere by the site (not in `localStorage`, not sent anywhere else). Paste it
fresh each time you make a change. Since it only has Contents access to this one
repo, the worst it could do if leaked is let someone edit files in this repo — treat
it like a password anyway, and regenerate it if you're ever unsure.

Changes take effect on the site within about a minute (GitHub Pages rebuild time) —
refresh if you don't see it immediately.

## Notes / limits

- Green API is an **unofficial** WhatsApp automation service (it works by driving a
  real WhatsApp Web session), not Meta's official Business API. It's the practical
  option for posting into a personal WhatsApp group automatically; the official
  Business API generally can't post into existing personal groups at all.
  Keep the linked number's WhatsApp session active (don't log it out elsewhere).
- GitHub Actions' scheduled cron jobs can be delayed by a few minutes during high load —
  fine for a weekly reminder, but don't rely on it for something time-critical.
