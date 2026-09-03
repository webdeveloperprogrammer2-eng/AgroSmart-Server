import fs from 'fs';
import path from 'path';
import { pool } from '../config/db';

/**
 * Ҳангоми ҳар оғоз schema.sql-ро иҷро мекунад.
 *
 * Дар schema.sql ҳама чиз бо `IF NOT EXISTS` навишта шудааст, бинобар ин
 * такрор иҷро кардан бехатар аст ва маълумоти мавҷуда нест намешавад.
 * Ин барои он лозим аст, ки баъди `git clone` фаромӯш накунанд
 * `npm run migrate`-ро иҷро кунанд.
 */
export async function ensureSchema(): Promise<void> {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(sql);
}
