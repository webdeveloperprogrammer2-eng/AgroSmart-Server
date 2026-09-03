import fs from 'fs';
import path from 'path';
import { pool } from '../config/db';

async function migrate() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  console.log('Running schema.sql ...');
  await pool.query(sql);
  console.log('✅ Schema applied');

  await pool.end();
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
