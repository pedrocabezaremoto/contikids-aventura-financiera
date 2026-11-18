// PM2: proceso del webhook de auto-deploy de Contikids.
//   pm2 start infra/webhook/ecosystem.config.cjs
// El .env (con WEBHOOK_SECRET) se carga con --env-file; nunca va en el repo.
const path = require('node:path');

const repo = path.resolve(__dirname, '../..');

module.exports = {
  apps: [
    {
      name: 'contikids-webhook',
      script: path.join(repo, 'infra/webhook/webhook.mjs'),
      cwd: repo,
      node_args: `--env-file=${path.join(repo, '.env')}`,
      autorestart: true,
      max_memory_restart: '100M',
      time: true,
    },
  ],
};
