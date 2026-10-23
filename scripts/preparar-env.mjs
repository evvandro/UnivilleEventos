// Cria apps/api/.env a partir do .env.example na primeira instalação (funciona em qualquer SO).
import { copyFileSync, existsSync } from 'node:fs';

const destino = 'apps/api/.env';
if (!existsSync(destino)) {
  copyFileSync('apps/api/.env.example', destino);
  console.log(`Criado ${destino} a partir do .env.example (valores locais de desenvolvimento).`);
}
