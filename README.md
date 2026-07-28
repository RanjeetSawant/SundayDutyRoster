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

## Notes / limits

- Green API is an **unofficial** WhatsApp automation service (it works by driving a
  real WhatsApp Web session), not Meta's official Business API. It's the practical
  option for posting into a personal WhatsApp group automatically; the official
  Business API generally can't post into existing personal groups at all.
  Keep the linked number's WhatsApp session active (don't log it out elsewhere).
- GitHub Actions' scheduled cron jobs can be delayed by a few minutes during high load —
  fine for a weekly reminder, but don't rely on it for something time-critical.
