// Arranque: carga la base desde Prisma (SQLite) y recién ahí levanta el servidor.
const path = require('path'), fs = require('fs');
process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:' + path.join(process.env.IPHUB_DATA || __dirname, 'iphub.db');

(async () => {
  const st = {};
  try {
    const { PrismaClient } = require('@prisma/client');
    const p = new PrismaClient();
    await p.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS "Collection" ("name" TEXT NOT NULL PRIMARY KEY, "data" TEXT NOT NULL, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)');
    for (const r of await p.collection.findMany()) st[r.name] = JSON.parse(r.data);
    const old = path.join(__dirname, 'db.json');
    if (!Object.keys(st).length && fs.existsSync(old)) {
      const j = JSON.parse(fs.readFileSync(old, 'utf8'));
      for (const [k, v] of Object.entries(j)) {
        st[k] = v;
        await p.collection.create({ data: { name: k, data: JSON.stringify(v) } });
      }
      console.log('Migrado db.json a Prisma');
    }
    await p.$disconnect();
  } catch (e) {
    console.warn('Prisma no disponible, usando memoria/db.json:', e.message);
    const old = path.join(__dirname, 'db.json');
    if (fs.existsSync(old)) {
      try { Object.assign(st, JSON.parse(fs.readFileSync(old, 'utf8'))); } catch (_) {}
    }
  }
  global.__IPHUB_STATE = st;
  require('./server');
})().catch(e => { console.error(e); process.exit(1); });
