/* Netlify adapter: reuses the same logic as api/data.js */
const core = require('../../api/data.js');

exports.handler = async (event) => {
  let body = event.body;
  if (body && event.isBase64Encoded) body = Buffer.from(body, 'base64').toString('utf8');
  try { body = body ? JSON.parse(body) : {}; } catch (e) { body = {}; }
  const headers = {};
  Object.keys(event.headers || {}).forEach(k => { headers[k.toLowerCase()] = event.headers[k]; });
  const req = { method: event.httpMethod, query: event.queryStringParameters || {}, headers, body };

  return new Promise((resolve) => {
    const out = { statusCode: 200, headers: {}, body: '' };
    const res = {
      status(c) { out.statusCode = c; return this; },
      setHeader(k, v) { out.headers[k] = v; },
      json(o) { out.headers['Content-Type'] = 'application/json'; out.body = JSON.stringify(o); resolve(out); },
      send(b) {
        if (Buffer.isBuffer(b)) { out.isBase64Encoded = true; out.body = b.toString('base64'); }
        else out.body = String(b);
        resolve(out);
      },
      end() { resolve(out); }
    };
    Promise.resolve(core(req, res)).catch(() => resolve({ statusCode: 500, body: '{"error":"server_error"}' }));
  });
};
