import { query, queryOne } from '../config/db';
import { AppError } from './AppError';

/** Сатри хом аз база. */
interface Row {
  id: number;
  data: Record<string, unknown>;
}

/** Сабт чӣ тавре ки ба фронтенд меравад: { id, ...ҳамаи майдонҳо }. */
export type Record_ = Record<string, unknown> & { id: number };

function toRecord(row: Row): Record_ {
  return { ...row.data, id: row.id };
}

/**
 * `id`-ро аз ҷисми дархост дур мекунад.
 *
 * Фронтенд ҳангоми таҳрир тамоми объектро мефиристад
 * (AdminPage.jsx: `section.api.update(editItem.id, { ...editItem, ...payload })`),
 * яъне дар дохили ҷисм `id` низ ҳаст. Онро нигоҳ доштан лозим нест —
 * id ҳамеша аз URL ва сутуни `id` гирифта мешавад.
 */
function stripId(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError('Ҷисми дархост бояд объект бошад', 400);
  }
  const { id: _ignored, ...rest } = body as Record<string, unknown>;
  return rest;
}

const SORT_DIRECTIONS = new Set(['asc', 'desc']);

export interface ListOptions {
  /** Филтрҳо аз query-string, масалан { userPhone: "+992..." } */
  filters: Record<string, string>;
  /** `_sort` — номи майдон (метавонад бо вергул чандто бошад) */
  sort?: string;
  /** `_order` — asc | desc */
  order?: string;
  /** `_limit` — маҳдудияти шумораи сабтҳо */
  limit?: string;
}

/**
 * CRUD-и умумӣ барои як ҷадвал. Рафтор ба json-server мутобиқ аст,
 * чунки фронтенд маҳз ба он навишта шудааст (src/api/httpClient.js).
 */
export class Repository {
  constructor(private readonly table: string) {}

  /** Номи ҷадвал аз рӯйхати сафеди RESOURCES меояд, вале ҳамеша иқтибос мекунем. */
  private get t(): string {
    return `"${this.table}"`;
  }

  async list(options: ListOptions): Promise<Record_[]> {
    const where: string[] = [];
    const params: unknown[] = [];

    for (const [field, value] of Object.entries(options.filters)) {
      if (field === 'id') {
        // `id` сутуни алоҳида аст, на дохили JSONB
        const asNumber = Number(value);
        if (!Number.isInteger(asNumber)) return [];
        params.push(asNumber);
        where.push(`id = $${params.length}`);
        continue;
      }
      params.push(field);
      const keyParam = `$${params.length}`;
      params.push(value);
      where.push(`data->>${keyParam} = $${params.length}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const orderSql = this.buildOrderBy(options.sort, options.order, params);

    let limitSql = '';
    if (options.limit !== undefined) {
      const limit = Number(options.limit);
      if (Number.isInteger(limit) && limit >= 0) {
        params.push(limit);
        limitSql = `LIMIT $${params.length}`;
      }
    }

    const rows = await query<Row>(
      `SELECT id, data FROM ${this.t} ${whereSql} ${orderSql} ${limitSql}`,
      params
    );
    return rows.map(toRecord);
  }

  /**
   * `_sort=id&_order=desc` -> `ORDER BY id DESC`.
   *
   * Номи майдон ҳамчун параметр дода мешавад (`data->>$n`), бинобар ин
   * SQL-injection имконнопазир аст. Самт (asc/desc) бо рӯйхати сафед
   * тафтиш мешавад, чунки онро ҳамчун параметр додан мумкин нест.
   */
  private buildOrderBy(sort: string | undefined, order: string | undefined, params: unknown[]): string {
    if (!sort) return 'ORDER BY id ASC';

    const fields = sort.split(',').map((s) => s.trim()).filter(Boolean);
    if (fields.length === 0) return 'ORDER BY id ASC';

    const directions = String(order ?? '').split(',').map((s) => s.trim().toLowerCase());

    const parts = fields.map((field, i) => {
      const raw = directions[i] ?? directions[0] ?? 'asc';
      const direction = SORT_DIRECTIONS.has(raw) ? raw.toUpperCase() : 'ASC';

      if (field === 'id') return `id ${direction}`;

      params.push(field);
      return `data->>$${params.length} ${direction}`;
    });

    return `ORDER BY ${parts.join(', ')}`;
  }

  async getById(id: string): Promise<Record_> {
    const numericId = Number(id);
    if (!Number.isInteger(numericId)) {
      throw new AppError('Сабт ёфт нашуд', 404);
    }
    const row = await queryOne<Row>(`SELECT id, data FROM ${this.t} WHERE id = $1`, [numericId]);
    if (!row) throw new AppError('Сабт ёфт нашуд', 404);
    return toRecord(row);
  }

  async create(body: unknown): Promise<Record_> {
    const data = stripId(body);
    const row = await queryOne<Row>(
      `INSERT INTO ${this.t} (data) VALUES ($1::jsonb) RETURNING id, data`,
      [JSON.stringify(data)]
    );
    return toRecord(row!);
  }

  /** PUT — сабтро пурра иваз мекунад. */
  async replace(id: string, body: unknown): Promise<Record_> {
    const numericId = Number(id);
    if (!Number.isInteger(numericId)) throw new AppError('Сабт ёфт нашуд', 404);

    const data = stripId(body);
    const row = await queryOne<Row>(
      `UPDATE ${this.t} SET data = $2::jsonb WHERE id = $1 RETURNING id, data`,
      [numericId, JSON.stringify(data)]
    );
    if (!row) throw new AppError('Сабт ёфт нашуд', 404);
    return toRecord(row);
  }

  /** PATCH — танҳо майдонҳои фиристодашуда иваз мешаванд (`||` дар JSONB). */
  async merge(id: string, body: unknown): Promise<Record_> {
    const numericId = Number(id);
    if (!Number.isInteger(numericId)) throw new AppError('Сабт ёфт нашуд', 404);

    const data = stripId(body);
    const row = await queryOne<Row>(
      `UPDATE ${this.t} SET data = data || $2::jsonb WHERE id = $1 RETURNING id, data`,
      [numericId, JSON.stringify(data)]
    );
    if (!row) throw new AppError('Сабт ёфт нашуд', 404);
    return toRecord(row);
  }

  async remove(id: string): Promise<void> {
    const numericId = Number(id);
    if (!Number.isInteger(numericId)) throw new AppError('Сабт ёфт нашуд', 404);

    const row = await queryOne<{ id: number }>(
      `DELETE FROM ${this.t} WHERE id = $1 RETURNING id`,
      [numericId]
    );
    if (!row) throw new AppError('Сабт ёфт нашуд', 404);
  }

  async count(): Promise<number> {
    const row = await queryOne<{ c: string }>(`SELECT COUNT(*) AS c FROM ${this.t}`);
    return Number(row?.c ?? 0);
  }
}
