# Anis Sayyad – Animated Portfolio

## Deploy on Vercel
1. Push this folder to GitHub (or drag-drop the folder in Vercel → "Add New Project").
2. Framework preset: **Other**. No build command, no output directory. Deploy.

## Deploy on Netlify
1. Push to GitHub. Netlify → Add new site → Import from Git → pick the repo. Build command: empty. Publish directory: `.`  (netlify.toml already sets this). Deploy.
2. Live admin sync: create a free database at upstash.com (Redis) → copy `REST URL` and `REST Token`.
   Netlify → Site configuration → Environment variables → add `KV_REST_API_URL` and `KV_REST_API_TOKEN` → Deploys → Trigger deploy.

## Admin panel
- Footer → **ADMIN** (or open `your-site.vercel.app/#admin`). Password: `forever2302`
- Edit projects (add / delete / reorder / change link / change banner image), hero text, stats,
  education, skills, work process, quote, contact details, WhatsApp number, social links, footer.

### Make admin changes visible to EVERYONE (one-time, 2 minutes, free)
Vercel dashboard → your project → **Storage** → **Marketplace → Upstash Redis** (free) → Create & connect to the project → **Redeploy**.
This adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` automatically. The admin badge then shows **● LIVE SYNC ON**.

Without it, the admin works in **LOCAL MODE**: changes are saved in that browser only.
You can still publish them: Admin → BACKUP / DATA → *Download content.json* → replace `content.json` in the project → redeploy
(the default text/projects of the site come from `index.html`; replace `content.json` AND keep it in sync if you use this route,
or simply use Live Sync).

Optional env var: `ADMIN_PASSWORD` (default is `forever2302`).

## Contact form
"SEND MESSAGE" opens WhatsApp chat with +91 7057477861 with the visitor's name, email, subject and message prefilled
(number can be changed from Admin → Quote & Contact).

## Files
index.html · style.css · admin.css · script.js (scroll animation, unchanged) · site.js (content + WhatsApp) · admin.js · content.json · api/data.js · images/ · video_frames/
