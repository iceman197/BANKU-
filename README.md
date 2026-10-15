# ICEMAN CODE LEARN

A mobile-first coding academy website with a real Node.js backend and Gemini AI API integration.

## Deploy on Render
1. Upload this project to a GitHub repository.
2. In Render, create a **Web Service** connected to that repository.
3. Build command: `npm install`; start command: `npm start`.
4. In Render → **Environment**, add:
   - `GEMINI_API_KEY` — your Gemini API key
   - `ADMIN_PASSWORD` — a long, unique secret password
   - `ADMIN_PHONES` — `+233550381372,+233545274761`
   - `UPLOAD_DIR` — `/var/data/uploads` if you attach a persistent disk at `/var/data`
5. For APKs to survive deploys/restarts, attach a Render persistent disk mounted at `/var/data` and set `UPLOAD_DIR=/var/data/uploads`. The included `render.yaml` requests a 1 GB disk; availability and billing depend on Render's current plans. Without persistent storage, uploaded files may disappear after redeploy/restart.
6. Open the deployed URL. Sign into **Owner Controls** using one of the configured admin phone numbers and `ADMIN_PASSWORD`.

## Security
- The Gemini key is read only by `server.js`; it is never sent to the browser.
- Phone numbers identify allowed admin accounts but **are not passwords**. Admin changes also require `ADMIN_PASSWORD`.
- Do not put `.env`, API keys, WhatsApp session folders, or other secrets into public repositories.
- APK uploads are restricted to authenticated admins and are checked for `.apk` extension and size. This is not a malware scanner: only upload APKs you trust and tell downloaders to install apps only if they trust the source.
- Online-user count is an approximate count of browser sessions that have sent a heartbeat in the last 90 seconds, not verified identities or a list of real names.
- Network status reports the website server's health and the visitor's browser connection state; it does not reveal private Wi-Fi details or identify people.
- The terminal area in this starter is a safe UI placeholder, not a real shell. Browser pages cannot directly run Termux or a remote Linux shell. A real terminal requires a separately secured execution service.

## Local run
Requires Node.js 20+.
```bash
npm install
cp .env.example .env
# Edit .env with your values
npm start
```
Then open `http://localhost:3000`.
