/* webhook.mjs — Listener de GitHub que dispara deploy.sh en cada push a main.
 *
 * Copia el patrón del webhook de Fresh Service (sin tocarlo):
 *   - Verifica la firma HMAC-SHA256 (X-Hub-Signature-256) con WEBHOOK_SECRET del .env.
 *   - Solo despliega en push a refs/heads/main.
 *   - Responde 202 al instante y corre deploy.sh en segundo plano (deploy.sh tiene su propio flock).
 *   - Escucha en WEBHOOK_HOST (172.18.0.1 en el VPS: solo lo alcanza Traefik), nunca en 0.0.0.0.
 *
 * Sin dependencias. Se arranca con PM2 (ver ecosystem.config.cjs), que carga el .env con --env-file.
 */
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import { appendFileSync, mkdirSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DEPLOY = path.join(REPO_DIR, 'deploy.sh');
const LOG_DIR = process.env.CONTIKIDS_LOG_DIR || '/root/logs';
const LOGFILE = path.join(LOG_DIR, 'contikids-webhook.log');
const HOST = process.env.WEBHOOK_HOST || '127.0.0.1';
const PORT = Number(process.env.WEBHOOK_PORT || 4420);
const SECRET = process.env.WEBHOOK_SECRET || '';
const BRANCH_REF = 'refs/heads/main';
const MAX_BODY = 5 * 1024 * 1024; // GitHub limita los payloads a 25 MB; un push normal pesa KB.

if (!SECRET) {
  console.error('FATAL: falta WEBHOOK_SECRET en el .env. Abortando.');
  process.exit(1);
}
if (HOST === '0.0.0.0' || HOST === '::') {
  console.error('FATAL: el webhook no debe escuchar en todas las interfaces.');
  process.exit(1);
}
mkdirSync(LOG_DIR, { recursive: true });

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    appendFileSync(LOGFILE, line);
  } catch {
    /* sin log en disco: seguimos con stdout */
  }
  process.stdout.write(line);
}

function validSignature(sig, body) {
  if (typeof sig !== 'string') return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', SECRET).update(body).digest('hex');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function reply(res, code, text) {
  res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(`${text}\n`);
}

const server = http.createServer((req, res) => {
  if (req.method !== 'POST') {
    return reply(res, 200, 'Contikids webhook activo. Envía un POST firmado de GitHub.');
  }

  const chunks = [];
  let size = 0;
  req.on('data', (c) => {
    size += c.length;
    if (size > MAX_BODY) {
      log('✖ Payload demasiado grande — rechazado (413).');
      reply(res, 413, 'payload demasiado grande');
      req.destroy();
      return;
    }
    chunks.push(c);
  });

  req.on('end', () => {
    if (res.writableEnded) return;
    const body = Buffer.concat(chunks);
    const event = req.headers['x-github-event'];

    if (!validSignature(req.headers['x-hub-signature-256'], body)) {
      log('✖ Firma inválida — petición rechazada (401).');
      return reply(res, 401, 'firma inválida');
    }
    if (event === 'ping') {
      log('✔ Ping de GitHub recibido (webhook configurado correctamente).');
      return reply(res, 200, 'pong');
    }
    if (event !== 'push') return reply(res, 200, `evento ${event} ignorado`);

    let payload = {};
    try {
      payload = JSON.parse(body.toString('utf8'));
    } catch {
      return reply(res, 400, 'JSON inválido');
    }
    if (payload.ref !== BRANCH_REF) {
      log(`Push a ${payload.ref} ignorado (solo se despliega ${BRANCH_REF}).`);
      return reply(res, 200, 'rama ignorada');
    }

    // Responder ya (GitHub corta a los 10 s); el deploy corre en segundo plano.
    reply(res, 202, 'deploy encolado');

    const pusher = payload.pusher?.name || 'alguien';
    const head = (payload.head_commit?.message || '').split('\n')[0];
    log(`▶ Push a main por ${pusher}: "${head}" — lanzando deploy.sh`);

    // deploy.sh escribe su propio log y usa flock: si hay otro deploy, espera su turno.
    const child = spawn('bash', [DEPLOY], {
      cwd: REPO_DIR,
      env: { ...process.env, NO_COLOR: '1', DEPLOY_TRIGGER: 'webhook' },
      stdio: 'ignore',
      detached: true,
    });
    child.on('error', (err) => log(`✖ No se pudo lanzar deploy.sh: ${err.message}`));
    child.on('exit', (code) =>
      log(code === 0 ? '✅ Deploy terminado (exit 0).' : `✖ Deploy falló (exit ${code}).`),
    );
  });
});

server.listen(PORT, HOST, () => log(`Webhook escuchando en http://${HOST}:${PORT}`));
