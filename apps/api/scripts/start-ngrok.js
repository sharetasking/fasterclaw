#!/usr/bin/env node
import 'dotenv/config';
import { spawn } from 'child_process';

const domain = process.env.NGROK_DOMAIN;
const port = process.env.PORT || '3001';

if (!domain) {
  console.log('⚠️  NGROK_DOMAIN not set, skipping ngrok tunnel');
  process.exit(0);
}

console.log(`🔗 Starting ngrok tunnel: https://${domain} -> http://localhost:${port}`);

const ngrok = spawn('ngrok', ['http', port, '--url', domain], {
  stdio: 'inherit',
  shell: true,
});

ngrok.on('error', (err) => {
  console.error('Failed to start ngrok:', err.message);
  process.exit(1);
});

ngrok.on('close', (code) => {
  process.exit(code || 0);
});
