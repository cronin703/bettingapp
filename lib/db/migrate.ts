import { sql } from '@vercel/postgres';
import fs from 'fs';
import path from 'path';
async function migrate() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  for (const stmt of schema.split(';').filter(s => s.trim())) {
    await sql.query(stmt);
    console.log('OK:', stmt.trim().slice(0, 60));
  }
  console.log('Done');
}
migrate().catch(console.error);
