import { existsSync } from 'node:fs';

if (existsSync('.env')) process.loadEnvFile('.env');

const { criarApp } = await import('./app');
const app = await criarApp();
const port = Number(process.env.PORT ?? 3333);

await app.listen({ port, host: '0.0.0.0' });
