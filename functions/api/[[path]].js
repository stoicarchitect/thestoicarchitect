/* F5IVE accounts API (Cloudflare Pages Function).
   Email sign-in links, no passwords. Needs a D1 binding called DB and a secret BREVO_API_KEY.
   Optional: MAIL_FROM (verified Brevo sender), MAIL_NAME, DEV_ECHO=1 for local testing only. */

const SESSION_COOKIE = "__Host-f5s";
const SESSION_DAYS = 30;
const TOKEN_MINUTES = 20;
const MAX_PROFILES = 50;
const MAX_DATA = 4000;

const SCHEMA = [
  "CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL, consent_at INTEGER, last_login INTEGER)",
  "CREATE TABLE IF NOT EXISTS login_tokens (token_hash TEXT PRIMARY KEY, email TEXT NOT NULL, ip TEXT, consent INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, used_at INTEGER)",
  "CREATE INDEX IF NOT EXISTS idx_tokens_email ON login_tokens (email, created_at)",
  "CREATE INDEX IF NOT EXISTS idx_tokens_ip ON login_tokens (ip, created_at)",
  "CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL)",
  "CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id)",
  "CREATE TABLE IF NOT EXISTS profiles (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at INTEGER NOT NULL, archetype TEXT NOT NULL, code TEXT NOT NULL, data TEXT NOT NULL)",
  "CREATE INDEX IF NOT EXISTS idx_profiles_user ON profiles (user_id, created_at)"
];
let schemaReady = false;
async function ensureSchema(db) {
  if (schemaReady) return;
  await db.batch(SCHEMA.map((s) => db.prepare(s)));
  schemaReady = true;
}

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });
const now = () => Date.now();
function randomToken(bytes = 32) {
  const a = new Uint8Array(bytes); crypto.getRandomValues(a);
  return btoa(String.fromCharCode(...a)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function sha256(s) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function getCookie(req, name) {
  const c = req.headers.get("cookie") || "";
  const m = c.split(/;\s*/).find((x) => x.startsWith(name + "="));
  return m ? decodeURIComponent(m.slice(name.length + 1)) : null;
}
function sessionCookie(value, maxAge) {
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
function sameOrigin(req) {
  const o = req.headers.get("origin");
  if (!o) return true; // older browsers and same-origin form posts may omit it; SameSite=Lax still applies
  try { return new URL(o).host === (req.headers.get("host") || new URL(req.url).host); } catch (e) { return false; }
}
function validEmail(e) { return typeof e === "string" && e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e); }
function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

async function currentUser(env, req) {
  const tok = getCookie(req, SESSION_COOKIE);
  if (!tok) return null;
  const h = await sha256(tok);
  const row = await env.DB.prepare("SELECT u.id, u.email, u.created_at, u.consent_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?").bind(h, now()).first();
  return row || null;
}

function validProfileData(d) {
  if (!d || typeof d !== "object") return false;
  const i = d.i;
  if (!i || typeof i !== "object" || !i.quick || !i.extra || !Array.isArray(i.style) || !Array.isArray(i.ready) || !Array.isArray(i.orient) || !i.values) return false;
  const P = ["Faith", "Family", "Finance", "Fitness", "Freedom"];
  for (const p of P) { if (typeof i.quick[p] !== "number" || !Array.isArray(i.extra[p])) return false; }
  return true;
}

/* ---------- emails ---------- */
function loginEmail(link) {
  const html = `<!doctype html><html><body style="margin:0;background:#0A0B0D;font-family:Arial,Helvetica,sans-serif;color:#F5F0E8">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0A0B0D"><tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#15181D;border:1px solid #3a3220">
<tr><td style="padding:34px 30px 10px;text-align:center"><div style="font-size:12px;letter-spacing:4px;color:#C9A84C;text-transform:uppercase;font-weight:bold">The F5IVE Identity Profile</div>
<h1 style="font-family:Georgia,serif;font-size:28px;line-height:1.25;margin:16px 0 10px;color:#F5F0E8">Your sign-in link</h1>
<p style="font-size:16px;line-height:1.6;color:#C9CDD3;margin:0 0 26px">Tap the button to open your F5IVE profile. The link works once and expires in ${TOKEN_MINUTES} minutes.</p>
<a href="${link}" style="display:inline-block;background:#C9A84C;color:#16120A;text-decoration:none;font-weight:bold;letter-spacing:2px;text-transform:uppercase;font-size:14px;padding:16px 28px">Sign in</a>
<p style="font-size:13px;line-height:1.6;color:#8A9099;margin:28px 0 0">If you did not ask for this, ignore this email. Nobody can sign in without the link.</p></td></tr>
<tr><td style="padding:24px 30px 30px;text-align:center;font-size:12px;color:#6E747D">The Stoic Architect · thestoicarchitect.com</td></tr></table></td></tr></table></body></html>`;
  const text = `Your F5IVE sign-in link\n\nOpen this link to sign in. It works once and expires in ${TOKEN_MINUTES} minutes:\n${link}\n\nIf you did not ask for this, ignore this email.\n\nThe Stoic Architect`;
  return { html, text };
}
async function sendEmail(env, to, link) {
  const { html, text } = loginEmail(link);
  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": env.BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { name: env.MAIL_NAME || "The Stoic Architect", email: env.MAIL_FROM || "F5ive@thestoicarchitect.com" },
      to: [{ email: to }],
      subject: "Your F5IVE sign-in link",
      htmlContent: html,
      textContent: text,
      tags: ["f5ive-login"]
    })
  });
  if (!r.ok) throw new Error("brevo " + r.status + " " + (await r.text()).slice(0, 200));
}

/* ---------- pages ---------- */
function page(title, body, status = 200) {
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)} | The Stoic Architect</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0A0B0D;color:#F5F0E8;font-family:Barlow,system-ui,-apple-system,"Segoe UI",sans-serif;padding:24px;box-sizing:border-box}
.c{max-width:460px;width:100%;text-align:center;border:1px solid rgba(201,168,76,.25);background:#15181D;padding:38px 28px}
.k{font:600 12px/1 system-ui;letter-spacing:4px;text-transform:uppercase;color:#C9A84C}
h1{font-family:Georgia,"Playfair Display",serif;font-size:28px;margin:16px 0 10px}p{color:#A3A8B0;line-height:1.6}
button,a.b{display:inline-block;margin-top:18px;border:0;cursor:pointer;background:linear-gradient(180deg,#E8CF86,#C9A84C 55%,#9A7629);color:#16120A;font:700 14px/1 system-ui;letter-spacing:3px;text-transform:uppercase;padding:18px 28px;text-decoration:none}</style></head>
<body><div class="c"><div class="k">The F5IVE Identity Profile</div>${body}</div></body></html>`, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "referrer-policy": "same-origin" } });
}

/* ---------- handlers ---------- */
async function start(env, req) {
  let b; try { b = await req.json(); } catch { return json({ error: "bad_request" }, 400); }
  const email = String(b.email || "").trim().toLowerCase();
  if (!validEmail(email)) return json({ error: "invalid_email" }, 400);
  if (b.consent !== true) return json({ error: "consent_required" }, 400);
  const ip = req.headers.get("cf-connecting-ip") || "local";
  const hour = now() - 3600e3;
  const perEmail = await env.DB.prepare("SELECT COUNT(*) AS n FROM login_tokens WHERE email = ? AND created_at > ?").bind(email, hour).first();
  const perIp = await env.DB.prepare("SELECT COUNT(*) AS n FROM login_tokens WHERE ip = ? AND created_at > ?").bind(ip, hour).first();
  if (perEmail.n >= 5 || perIp.n >= 20) return json({ error: "rate_limited" }, 429);
  const token = randomToken();
  await env.DB.prepare("INSERT INTO login_tokens (token_hash, email, ip, consent, created_at, expires_at) VALUES (?, ?, ?, 1, ?, ?)")
    .bind(await sha256(token), email, ip, now(), now() + TOKEN_MINUTES * 60e3).run();
  // tidy old rows now and then
  if (Math.random() < 0.05) await env.DB.batch([
    env.DB.prepare("DELETE FROM login_tokens WHERE created_at < ?").bind(now() - 7 * 864e5),
    env.DB.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(now())
  ]);
  const link = new URL("/api/auth/verify?t=" + token, req.url).toString();
  if (env.DEV_ECHO === "1") return json({ ok: true, dev_link: link });
  if (!env.BREVO_API_KEY) return json({ error: "not_configured" }, 503);
  try { await sendEmail(env, email, link); } catch (e) { console.log("send failed", e.message); return json({ error: "send_failed" }, 502); }
  return json({ ok: true });
}

function verifyPage(req) {
  const t = new URL(req.url).searchParams.get("t") || "";
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(t)) return page("Link not valid", `<h1>That link is not valid</h1><p>Request a new sign-in link from the assessment.</p><a class="b" href="/F5iveassessment#log-in">Get a new link</a>`, 400);
  // a button, not an automatic sign-in, so email scanners that open links cannot use up the token
  return page("Sign in", `<h1>Open your F5IVE profile</h1><p>One tap and you are in. You stay signed in on this device for ${SESSION_DAYS} days.</p><form method="POST" action="/api/auth/verify"><input type="hidden" name="t" value="${esc(t)}"><button type="submit">Sign in</button></form>`);
}

async function verify(env, req) {
  if (!sameOrigin(req)) return page("Link not valid", "<h1>That did not work</h1><p>Please open the link from your email again.</p>", 403);
  const form = await req.formData();
  const t = String(form.get("t") || "");
  const h = await sha256(t);
  const row = await env.DB.prepare("SELECT email, consent, expires_at, used_at FROM login_tokens WHERE token_hash = ?").bind(h).first();
  if (!row || row.used_at || row.expires_at < now()) {
    return page("Link expired", `<h1>This link has expired</h1><p>Sign-in links work once and last ${TOKEN_MINUTES} minutes. Request a fresh one and use the newest email.</p><a class="b" href="/F5iveassessment#log-in">Get a new link</a>`, 400);
  }
  const used = await env.DB.prepare("UPDATE login_tokens SET used_at = ? WHERE token_hash = ? AND used_at IS NULL").bind(now(), h).run();
  if (!used.meta || used.meta.changes !== 1) return page("Link expired", `<h1>This link was already used</h1><a class="b" href="/F5iveassessment#log-in">Get a new link</a>`, 400);
  let user = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(row.email).first();
  if (!user) {
    user = { id: randomToken(12) };
    await env.DB.prepare("INSERT INTO users (id, email, created_at, consent_at, last_login) VALUES (?, ?, ?, ?, ?)").bind(user.id, row.email, now(), row.consent ? now() : null, now()).run();
  } else {
    await env.DB.prepare("UPDATE users SET last_login = ?, consent_at = COALESCE(consent_at, ?) WHERE id = ?").bind(now(), row.consent ? now() : null, user.id).run();
  }
  const sess = randomToken();
  await env.DB.prepare("INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)").bind(await sha256(sess), user.id, now(), now() + SESSION_DAYS * 864e5).run();
  return new Response(null, { status: 303, headers: { location: "/F5iveassessment#my-profile", "set-cookie": sessionCookie(sess, SESSION_DAYS * 86400), "cache-control": "no-store" } });
}

async function me(env, req) {
  const u = await currentUser(env, req);
  if (!u) return json({ user: null }, 401);
  const rows = await env.DB.prepare("SELECT id, created_at, archetype, code, data FROM profiles WHERE user_id = ? ORDER BY created_at DESC LIMIT ?").bind(u.id, MAX_PROFILES).all();
  return json({ user: { email: u.email, created_at: u.created_at, consent_at: u.consent_at }, profiles: rows.results.map((r) => ({ id: r.id, created_at: r.created_at, archetype: r.archetype, code: r.code, data: JSON.parse(r.data) })) });
}

async function saveProfile(env, req) {
  if (!sameOrigin(req)) return json({ error: "forbidden" }, 403);
  const u = await currentUser(env, req);
  if (!u) return json({ error: "signed_out" }, 401);
  if (!u.consent_at) return json({ error: "consent_required" }, 403);
  let b; try { b = await req.json(); } catch { return json({ error: "bad_request" }, 400); }
  const data = { i: b.input, f: b.faith === false || b.faith === 0 ? 0 : 1 };
  const s = JSON.stringify(data);
  const archetype = String(b.archetype || "").slice(0, 40), code = String(b.code || "").slice(0, 12);
  if (!validProfileData(data) || s.length > MAX_DATA || !archetype || !/^[A-Z0-9]{3,5}-[SVBO][PMR]$/.test(code)) return json({ error: "invalid_profile" }, 400);
  const dup = await env.DB.prepare("SELECT id FROM profiles WHERE user_id = ? AND data = ?").bind(u.id, s).first();
  if (dup) return json({ ok: true, id: dup.id, duplicate: true });
  const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM profiles WHERE user_id = ?").bind(u.id).first();
  if (n.n >= MAX_PROFILES) return json({ error: "limit" }, 409);
  const id = randomToken(9);
  const at = Number.isFinite(b.taken_at) && b.taken_at > 1.7e12 && b.taken_at <= now() ? Math.floor(b.taken_at) : now();
  await env.DB.prepare("INSERT INTO profiles (id, user_id, created_at, archetype, code, data) VALUES (?, ?, ?, ?, ?, ?)").bind(id, u.id, at, archetype, code, s).run();
  return json({ ok: true, id });
}

async function deleteProfile(env, req, id) {
  if (!sameOrigin(req)) return json({ error: "forbidden" }, 403);
  const u = await currentUser(env, req);
  if (!u) return json({ error: "signed_out" }, 401);
  await env.DB.prepare("DELETE FROM profiles WHERE id = ? AND user_id = ?").bind(id, u.id).run();
  return json({ ok: true });
}

async function logout(env, req) {
  if (!sameOrigin(req)) return json({ error: "forbidden" }, 403);
  const tok = getCookie(req, SESSION_COOKIE);
  if (tok) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(tok)).run();
  return json({ ok: true }, 200, { "set-cookie": sessionCookie("", 0) });
}

async function deleteAccount(env, req) {
  if (!sameOrigin(req)) return json({ error: "forbidden" }, 403);
  const u = await currentUser(env, req);
  if (!u) return json({ error: "signed_out" }, 401);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM profiles WHERE user_id = ?").bind(u.id),
    env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(u.id),
    env.DB.prepare("DELETE FROM login_tokens WHERE email = ?").bind(u.email),
    env.DB.prepare("DELETE FROM users WHERE id = ?").bind(u.id)
  ]);
  return json({ ok: true }, 200, { "set-cookie": sessionCookie("", 0) });
}

async function exportData(env, req) {
  const u = await currentUser(env, req);
  if (!u) return json({ error: "signed_out" }, 401);
  const rows = await env.DB.prepare("SELECT id, created_at, archetype, code, data FROM profiles WHERE user_id = ? ORDER BY created_at").bind(u.id).all();
  const out = { exported_at: new Date().toISOString(), account: { email: u.email, created_at: new Date(u.created_at).toISOString(), consent_at: u.consent_at ? new Date(u.consent_at).toISOString() : null },
    profiles: rows.results.map((r) => ({ id: r.id, taken_at: new Date(r.created_at).toISOString(), archetype: r.archetype, code: r.code, answers: JSON.parse(r.data) })) };
  return new Response(JSON.stringify(out, null, 2), { headers: { "content-type": "application/json; charset=utf-8", "content-disposition": 'attachment; filename="My F5IVE data.json"', "cache-control": "no-store" } });
}

/* ---------- founding lists and enquiries (Brevo) ----------
   POST /api/lead with JSON { kind, email, name, pillar, organisation, type, message, consent, website }
   kind "profile":  sets Identity Profile attributes (ARCHETYPE, GRAVITY_PILLAR and so on) on the Brevo contact.
   kind "founding": adds the contact to the Brevo list "Founding list: <pillar>" (created if missing)
                    and emails a short notice to NOTIFY_TO.
   kind "enquiry":  emails the enquiry to NOTIFY_TO with reply-to set to the sender. Nothing is added to a list.
   Needs BREVO_API_KEY. Optional: NOTIFY_TO (defaults to F5ive@thestoicarchitect.com), BREVO_FOLDER_ID. */
const LEAD_PILLARS = ["Finance", "Faith", "Family", "Fitness", "Freedom", "Brotherhood"];
const leadHits = new Map();
async function brevo(env, path, init = {}) {
  const r = await fetch("https://api.brevo.com/v3" + path, { ...init, headers: { "api-key": env.BREVO_API_KEY, "content-type": "application/json", accept: "application/json", ...(init.headers || {}) } });
  const text = await r.text();
  let body = null; try { body = text ? JSON.parse(text) : null; } catch (e) { body = text; }
  return { ok: r.ok, status: r.status, body };
}
async function listIdFor(env, name) {
  for (let offset = 0; offset < 500; offset += 50) {
    const r = await brevo(env, `/contacts/lists?limit=50&offset=${offset}`);
    if (!r.ok) throw new Error("lists " + r.status);
    const lists = (r.body && r.body.lists) || [];
    const hit = lists.find((l) => l.name === name);
    if (hit) return hit.id;
    if (lists.length < 50) break;
  }
  let folderId = Number(env.BREVO_FOLDER_ID) || 0;
  if (!folderId) {
    const f = await brevo(env, "/contacts/folders?limit=10&offset=0");
    folderId = f.ok && f.body && f.body.folders && f.body.folders[0] ? f.body.folders[0].id : 0;
  }
  if (!folderId) throw new Error("no folder");
  const c = await brevo(env, "/contacts/lists", { method: "POST", body: JSON.stringify({ name, folderId }) });
  if (!c.ok) throw new Error("create list " + c.status);
  return c.body.id;
}
async function notify(env, subject, lines, replyTo) {
  const to = env.NOTIFY_TO || "F5ive@thestoicarchitect.com";
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#222">${lines.map(([k, v]) => `<p style="margin:0 0 10px"><b>${esc(k)}:</b> ${esc(v).replace(/\n/g, "<br>")}</p>`).join("")}</div>`;
  const msg = { sender: { name: env.MAIL_NAME || "The Stoic Architect", email: env.MAIL_FROM || "F5ive@thestoicarchitect.com" }, to: [{ email: to }], subject, htmlContent: html, tags: ["site-lead"] };
  if (replyTo) msg.replyTo = { email: replyTo.email, name: replyTo.name || replyTo.email };
  const r = await brevo(env, "/smtp/email", { method: "POST", body: JSON.stringify(msg) });
  if (!r.ok) throw new Error("notify " + r.status);
}
async function lead(env, req) {
  if (!sameOrigin(req)) return json({ error: "forbidden" }, 403);
  let b; try { b = await req.json(); } catch { return json({ error: "bad_request" }, 400); }
  if (b.website) return json({ ok: true }); // honeypot: bots fill every field
  const ip = req.headers.get("cf-connecting-ip") || "local";
  const t = now(), hits = (leadHits.get(ip) || []).filter((x) => x > t - 3600e3);
  if (hits.length >= 10) return json({ error: "rate_limited" }, 429);
  hits.push(t); leadHits.set(ip, hits);
  const email = String(b.email || "").trim().toLowerCase();
  const name = String(b.name || "").trim().slice(0, 80);
  if (!validEmail(email)) return json({ error: "invalid_email" }, 400);
  if (!env.BREVO_API_KEY) return json({ error: "not_configured" }, 503);
  if (b.kind === "founding") {
    if (b.consent !== true) return json({ error: "consent_required" }, 400);
    const pillar = LEAD_PILLARS.includes(b.pillar) ? b.pillar : "Finance";
    const listName = pillar === "Brotherhood" ? "Founding list: Brotherhood" : `Founding list: ${pillar} Pillar`;
    const listId = await listIdFor(env, listName);
    const contact = { email, listIds: [listId], updateEnabled: true };
    if (name) contact.attributes = { FIRSTNAME: name };
    let r = await brevo(env, "/contacts", { method: "POST", body: JSON.stringify(contact) });
    if (!r.ok && contact.attributes) { delete contact.attributes; r = await brevo(env, "/contacts", { method: "POST", body: JSON.stringify(contact) }); }
    if (!r.ok) { console.log("contact failed", r.status, JSON.stringify(r.body).slice(0, 200)); return json({ error: "save_failed" }, 502); }
    try { await notify(env, `New sign-up: ${listName}`, [["List", listName], ["Name", name || "-"], ["Email", email], ["Consent", "Ticked on " + new Date(t).toISOString()]]); } catch (e) { console.log("notify failed", e.message); }
    return json({ ok: true });
  }
  if (b.kind === "profile") {
    // Identity Profile result: written to the contact so the Brevo sequence can personalise by archetype.
    // The Brevo form on the page handles list membership and opt-in; this only sets attributes.
    if (b.consent !== true) return json({ error: "consent_required" }, 400);
    const pick = (v, allowed) => (allowed.includes(v) ? v : "");
    const PILL = ["Faith", "Family", "Finance", "Fitness", "Freedom"];
    const archetype = String(b.archetype || "").slice(0, 40);
    if (!/^The [A-Za-z ]{3,30}$/.test(archetype)) return json({ error: "bad_request" }, 400);
    const attrs = {
      ARCHETYPE: archetype,
      GRAVITY_PILLAR: pick(b.gravity, PILL),
      OPERATING_MODE: pick(b.mode, ["Strategist", "Visionary", "Builder", "Operator"]),
      DRIVE_SOURCE: pick(b.drive, ["Inner", "Outer"]),
      SUPPORT_STYLE: pick(b.support, ["Solo", "Shared"]),
      SACRIFICED_PILLAR: pick(b.sacrificed, PILL),
      ALIGNMENT_GAP: pick(b.alignment, ["Aligned", "Drifting", "Misaligned"]),
      IMBALANCE_BAND: pick(b.imbalance, ["Balanced", "Leaning", "Lopsided", "Critical"]),
      PROFILE_DATE: new Date(t).toISOString().slice(0, 10),
      PROFILE_VERSION: 1
    };
    Object.keys(attrs).forEach((k) => { if (attrs[k] === "") delete attrs[k]; });
    if (name) attrs.FIRSTNAME = name;
    const r = await brevo(env, "/contacts", { method: "POST", body: JSON.stringify({ email, attributes: attrs, updateEnabled: true }) });
    if (!r.ok) { console.log("profile attrs failed", r.status, JSON.stringify(r.body).slice(0, 200)); return json({ error: "save_failed" }, 502); }
    return json({ ok: true });
  }
  if (b.kind === "enquiry") {
    const message = String(b.message || "").trim().slice(0, 5000);
    if (!message) return json({ error: "message_required" }, 400);
    const type = String(b.type || "Enquiry").slice(0, 60);
    try {
      await notify(env, `${type}: ${name || email}`, [["Type", type], ["Name", name || "-"], ["Email", email], ["Organisation", String(b.organisation || "-").slice(0, 120)], ["Message", message]], { email, name });
    } catch (e) { console.log("enquiry failed", e.message); return json({ error: "send_failed" }, 502); }
    return json({ ok: true });
  }
  return json({ error: "bad_request" }, 400);
}

export async function onRequest(context) {
  const { request: req, env } = context;
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, "");
  const m = req.method;
  if (path === "/api/lead" && m === "POST") {
    try { return await lead(env, req); } catch (e) { console.log("lead error", e && e.stack || e); return json({ error: "server_error" }, 500); }
  }
  if (!env.DB) return json({ error: "not_configured" }, 503);
  try {
    await ensureSchema(env.DB);
    if (path === "/api/auth/start" && m === "POST") return await start(env, req);
    if (path === "/api/auth/verify" && m === "GET") return verifyPage(req);
    if (path === "/api/auth/verify" && m === "POST") return await verify(env, req);
    if (path === "/api/auth/logout" && m === "POST") return await logout(env, req);
    if (path === "/api/me" && m === "GET") return await me(env, req);
    if (path === "/api/me" && m === "DELETE") return await deleteAccount(env, req);
    if (path === "/api/me/export" && m === "GET") return await exportData(env, req);
    if (path === "/api/profiles" && m === "POST") return await saveProfile(env, req);
    const pm = path.match(/^\/api\/profiles\/([A-Za-z0-9_-]{6,40})$/);
    if (pm && m === "DELETE") return await deleteProfile(env, req, pm[1]);
    return json({ error: "not_found" }, 404);
  } catch (e) {
    console.log("api error", e && e.stack || e);
    return json({ error: "server_error" }, 500);
  }
}
