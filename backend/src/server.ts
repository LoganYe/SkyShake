import { buildApp } from './app.js';
import { readConfig } from './config.js';

const config = readConfig();
const app = buildApp(config);

async function start() {
  try {
    await app.listen({
      host: config.host,
      port: config.port,
    });
    console.log(`SkyShake backend listening on http://${config.host}:${config.port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void start();
