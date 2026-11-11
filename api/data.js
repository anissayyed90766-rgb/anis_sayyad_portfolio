/* Vercel serverless function: stores portfolio content + uploaded images.
   Storage = Upstash Redis / Vercel KV (REST). No npm packages needed.
   Env vars (added automatically when you connect Upstash Redis / KV in Vercel):
     KV_REST_API_URL + KV_REST_API_TOKEN   (or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN)
   Optional: ADMIN_PASSWORD (defaults to the password set for this site). */
const crypto = require('crypto');

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const PASS = process.env.ADMIN_PASSWORD || 'forever2302';
const configured = !!(URL_ && TOKEN);

async function redis(cmd) {
  const r = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd)
  });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(j.error || 'storage error');
  return j.result;
}

function same(a, b) {
  const x = crypto.createHash('sha256').update(String(a)).digest();
  const y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}

module.exports = async (req, res) => {
  const k = (req.query && req.query.k) || '';
  try {
    if (req.method === 'GET') {
      if (!configured) return res.status(404).json({ error: 'not_configured' });
      if (k === 'content') {
        const v = await redis(['GET', 'portfolio:content']);
        if (!v) return res.status(404).json({ error: 'empty' });
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).send(v);
      }
      if (k === 'img') {
        const id = String(req.query.id || '');
        if (!/^[A-Za-z0-9_-]{4,64}$/.test(id)) return res.status(400).end();
        const v = await redis(['GET', 'portfolio:img:' + id]);
        const m = v && /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(v);
        if (!m) return res.status(404).end();
        res.setHeader('Content-Type', m[1]);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return res.status(200).send(Buffer.from(m[2], 'base64'));
      }
      return res.status(400).json({ error: 'bad_request' });
    }

    if (req.method === 'POST') {
      if (!same(req.headers['x-admin-password'] || '', PASS)) {
        await new Promise(r => setTimeout(r, 500));
        return res.status(401).json({ error: 'unauthorized' });
      }
      if (k === 'auth') return res.status(200).json({ ok: true, storage: configured });
      if (!configured) return res.status(503).json({ error: 'not_configured' });
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

      if (k === 'content') {
        const v = body.value;
        if (!v || typeof v !== 'object' || !Array.isArray(v.projects)) return res.status(400).json({ error: 'invalid_content' });
        const s = JSON.stringify(v);
        if (s.length > 900000) return res.status(413).json({ error: 'too_large' });
        await redis(['SET', 'portfolio:content', s]);
        return res.status(200).json({ ok: true });
      }
      if (k === 'img') {
        const id = String(body.id || '');
        const d = String(body.dataUrl || '');
        if (!/^[A-Za-z0-9_-]{4,64}$/.test(id)) return res.status(400).json({ error: 'bad_id' });
        if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(d)) return res.status(400).json({ error: 'bad_image' });
        if (d.length > 950000) return res.status(413).json({ error: 'too_large' });
        await redis(['SET', 'portfolio:img:' + id, d]);
        return res.status(200).json({ ok: true, url: '/api/data?k=img&id=' + id });
      }
      return res.status(400).json({ error: 'bad_request' });
    }
    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (e) {
    return res.status(500).json({ error: 'server_error' });
  }
};
