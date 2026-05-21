const express = require('express');
const axios = require('axios');
const app = express();

// 🔴 حتماً این رمز را با یک رشته ۶۴ کاراکتری تصادفی جایگزین کن
const PSK = "123456789";

const STRIP_HEADERS = new Set([
  "host", "connection", "content-length", "transfer-encoding",
  "proxy-connection", "proxy-authorization", "x-forwarded-for",
  "x-forwarded-host", "x-forwarded-proto", "x-forwarded-port",
  "x-real-ip", "forwarded", "via", "accept-encoding",
]);

app.use(express.json({ limit: '50mb' }));

// تست سلامت در ریشه
app.get('/', (req, res) => {
  res.json({ ok: true, status: "healthy" });
});

// مسیر اصلی نود خروجی
app.get('/api/exit-node', (req, res) => {
  res.json({ ok: true, status: "healthy" });
});

app.post('/api/exit-node', async (req, res) => {
  try {
    const body = req.body;
    if (!body || typeof body !== "object") {
      return res.status(400).json({ e: "bad_json" });
    }

    const k = String(body.k ?? "");
    const u = String(body.u ?? "");
    const m = String(body.m ?? "GET").toUpperCase();
    const h = sanitizeHeaders(body.h);
    const b64 = body.b;

    if (k !== PSK) return res.status(401).json({ e: "unauthorized" });
    if (!/^https?:\/\//i.test(u)) return res.status(400).json({ e: "bad_url" });

    let payload;
    if (typeof b64 === "string" && b64.length > 0) {
      payload = Buffer.from(b64, 'base64');
    }

    const response = await axios({
      method: m,
      url: u,
      headers: h,
      data: payload,
      maxRedirects: 0,
      responseType: 'arraybuffer',
      validateStatus: () => true,
    });

    const base64 = Buffer.from(response.data).toString('base64');
    const respHeaders = {};
    for (const [key, value] of Object.entries(response.headers)) {
      respHeaders[key] = value;
    }

    res.json({
      s: response.status,
      h: respHeaders,
      b: base64,
    });
  } catch (err) {
    res.status(500).json({ e: err.message });
  }
});

function sanitizeHeaders(h) {
  const out = {};
  if (!h || typeof h !== "object") return out;
  for (const [k, v] of Object.entries(h)) {
    if (!k) continue;
    if (STRIP_HEADERS.has(k.toLowerCase())) continue;
    out[k] = String(v ?? "");
  }
  return out;
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Exit node running on port ${PORT}`);
});
