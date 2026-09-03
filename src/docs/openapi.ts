import { RESOURCES } from '../core/resources';

/**
 * Спецификацияи OpenAPI 3 — аз ҳамин Swagger UI дар /docs сохта мешавад.
 *
 * Ҳамаи шаш ресурс амалиёти якхела доранд, бинобар ин роҳҳо дар давр
 * сохта мешаванд. Ҳангоми иловаи ресурси нав ба `src/core/resources.ts`
 * ҳуҷҷат худаш нав мешавад — дасти касе лозим нест.
 */

interface ResourceDoc {
  /** Номи гурӯҳ дар Swagger */
  tag: string;
  /** Тавсифи гурӯҳ */
  summary: string;
  /** Намунаи объект — Swagger онро дар "Example Value" нишон медиҳад */
  example: Record<string, unknown>;
  /** Филтрҳое, ки фронтенд воқеан истифода мебарад */
  filters?: { name: string; description: string; example: string }[];
}

const DOCS: Record<string, ResourceDoc> = {
  users: {
    tag: 'Users',
    summary: 'Корбарон — сабти ном, вуруд, нақшҳо (user / admin / superadmin)',
    example: {
      userName: 'Ali Karimov',
      userPhone: '+992900000003',
      city: 'Bokhtar',
      age: 28,
      password: '1234',
      role: 'user',
    },
    filters: [
      {
        name: 'userPhone',
        description: 'Ҷустуҷӯи корбар бо рақами телефон — вуруд ва санҷиши такрор',
        example: '+992900000003',
      },
    ],
  },
  mahsulot: {
    tag: 'Mahsulot',
    summary: 'Маҳсулоти бозор — саҳифаи Бозор ва кабинети деҳқон',
    example: {
      name: 'Себи Данғара',
      category: 'Meva',
      city: 'Dushanbe',
      img: 'data:image/png;base64,...',
      description: 'Себи тару тоза',
      price: 12,
      leftovers: 500,
      userId: 3,
      farmerName: 'Ali Karimov',
      farmerPhone: '+992900000003',
    },
    filters: [
      { name: 'userId', description: 'Танҳо моли ҳамин корбар', example: '3' },
      { name: 'city', description: 'Филтр аз рӯи шаҳр', example: 'Dushanbe' },
      { name: 'category', description: 'Sabzavot | Meva | Khushmeva | Alaf', example: 'Meva' },
    ],
  },
  zamin: {
    tag: 'Zamin',
    summary: 'Замин ба иҷора — саҳифаи Замин',
    example: {
      type: 'zamin',
      name: 'Замини кишоварзӣ дар Рудакӣ',
      city: 'Rudaki',
      img: 'data:image/png;base64,...',
      price: 5000,
      leftovers: 2,
      desc: 'Замини обёришаванда, 2 гектар',
      userId: 3,
      farmerName: 'Ali Karimov',
      farmerPhone: '+992900000003',
    },
    filters: [
      { name: 'userId', description: 'Танҳо замини ҳамин корбар', example: '3' },
      { name: 'city', description: 'Филтр аз рӯи шаҳр', example: 'Rudaki' },
    ],
  },
  ZaminApteka: {
    tag: 'ZaminApteka',
    summary: 'Дорувори ва нуриҳо — саҳифаи Дорувори',
    example: {
      name: 'Нуриҳои минералӣ NPK',
      category: 'Zamin',
      city: 'Dushanbe',
      img: 'data:image/png;base64,...',
      description: 'Барои ҳосилнокии беҳтар',
      price: 150,
      leftovers: 40,
      userId: 3,
      farmerName: 'Ali Karimov',
      farmerPhone: '+992900000003',
    },
    filters: [
      { name: 'userId', description: 'Танҳо дорувории ҳамин корбар', example: '3' },
      {
        name: 'category',
        description: 'Darakhtho | Sabzavot | Hayvonot | Zamin | Digar',
        example: 'Zamin',
      },
    ],
  },
  jobs: {
    tag: 'Jobs',
    summary: 'Дархостҳои харид — саҳифаи Муштарӣ',
    example: {
      companyName: 'ООО "Агроэкспорт"',
      productName: 'Себ',
      volume: '10 тонна',
      description: 'Барои содирот',
      userId: 3,
      creatorName: 'Ali Karimov',
      creatorPhone: '+992900000003',
      createdAt: '2026-09-02T10:00:00.000Z',
    },
    filters: [{ name: 'userId', description: 'Танҳо дархости ҳамин корбар', example: '3' }],
  },
  notifications: {
    tag: 'Notifications',
    summary: 'Хабарномаи фармоиш — ҷойгузини боти Telegram',
    example: {
      userId: 3,
      type: 'order',
      buyerId: 5,
      buyerName: 'Iso Samadov',
      buyerPhone: '+992933347770',
      address: 'Душанбе, кӯчаи Рӯдакӣ 10',
      items: [{ name: 'Себи Данғара', price: 12, quantity: 2, total: 24 }],
      total: 24,
      createdAt: '2026-09-02T10:00:00.000Z',
      read: false,
    },
    filters: [
      { name: 'userId', description: 'Хабарномаҳои соҳиби мол', example: '3' },
      { name: 'buyerId', description: 'Хабарномаҳои харидор', example: '5' },
    ],
  },
};

const ID_PARAM = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'integer' },
  description: 'ID-и сабт',
};

const SORT_PARAMS = [
  {
    name: '_sort',
    in: 'query',
    required: false,
    schema: { type: 'string' },
    description: 'Майдони тартиб, масалан `id` ё `createdAt`',
  },
  {
    name: '_order',
    in: 'query',
    required: false,
    schema: { type: 'string', enum: ['asc', 'desc'] },
    description: 'Самти тартиб (пешфарз `asc`)',
  },
  {
    name: '_limit',
    in: 'query',
    required: false,
    schema: { type: 'integer' },
    description: 'Маҳдудияти шумораи сабтҳо',
  },
];

const NOT_FOUND = {
  description: 'Сабт ёфт нашуд',
  content: {
    'application/json': {
      schema: { type: 'object', properties: { error: { type: 'string' } } },
      example: { error: 'Сабт ёфт нашуд' },
    },
  },
};

function itemSchema(doc: ResourceDoc) {
  return {
    type: 'object',
    description: 'Майдонҳо озоданд (JSONB) — дар поён майдонҳои воқеии фронтенд',
    example: { id: 1, ...doc.example },
  };
}

function bodySchema(doc: ResourceDoc) {
  return {
    required: true,
    content: {
      'application/json': {
        schema: { type: 'object', example: doc.example },
      },
    },
  };
}

function buildPaths() {
  const paths: Record<string, unknown> = {};

  for (const resource of RESOURCES) {
    const doc = DOCS[resource.path];
    const tag = doc.tag;
    const item = itemSchema(doc);

    const listParams = [
      ...(doc.filters ?? []).map((f) => ({
        name: f.name,
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: f.description,
        example: f.example,
      })),
      ...SORT_PARAMS,
    ];

    paths[`/${resource.path}`] = {
      get: {
        tags: [tag],
        summary: 'Ҳамаи сабтҳо',
        description:
          'Массив бармегардонад. Ҳар параметри query, ки бо `_` сар намешавад, ҳамчун филтр `майдон = қиймат` кор мекунад.',
        parameters: listParams,
        responses: {
          200: {
            description: 'Массиви сабтҳо',
            content: {
              'application/json': { schema: { type: 'array', items: item } },
            },
          },
        },
      },
      post: {
        tags: [tag],
        summary: 'Сабти нав',
        description: '`id` худаш дода мешавад — онро фиристодан лозим нест.',
        requestBody: bodySchema(doc),
        responses: {
          201: {
            description: 'Сабт сохта шуд',
            content: { 'application/json': { schema: item } },
          },
        },
      },
    };

    paths[`/${resource.path}/{id}`] = {
      get: {
        tags: [tag],
        summary: 'Як сабт бо ID',
        parameters: [ID_PARAM],
        responses: {
          200: { description: 'Сабт', content: { 'application/json': { schema: item } } },
          404: NOT_FOUND,
        },
      },
      put: {
        tags: [tag],
        summary: 'Сабтро ПУРРА иваз мекунад',
        description:
          'Майдонҳои нафиристодашуда нест мешаванд. Фронтенд объекти пурраро мефиристад.',
        parameters: [ID_PARAM],
        requestBody: bodySchema(doc),
        responses: {
          200: { description: 'Иваз шуд', content: { 'application/json': { schema: item } } },
          404: NOT_FOUND,
        },
      },
      patch: {
        tags: [tag],
        summary: 'Танҳо майдонҳои фиристодашуда',
        parameters: [ID_PARAM],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object' },
              example: resource.path === 'notifications' ? { read: true } : { price: 30 },
            },
          },
        },
        responses: {
          200: { description: 'Нав шуд', content: { 'application/json': { schema: item } } },
          404: NOT_FOUND,
        },
      },
      delete: {
        tags: [tag],
        summary: 'Сабтро нест мекунад',
        parameters: [ID_PARAM],
        responses: {
          200: {
            description: 'Нест шуд',
            content: { 'application/json': { schema: { type: 'object' }, example: {} } },
          },
          404: NOT_FOUND,
        },
      },
    };
  }

  // Роҳҳои хизматӣ
  paths['/health'] = {
    get: {
      tags: ['Service'],
      summary: 'Санҷиши кор',
      responses: {
        200: {
          description: 'Сервер кор мекунад',
          content: {
            'application/json': {
              example: { status: 'ok', time: '2026-09-02T10:00:00.000Z' },
            },
          },
        },
      },
    },
  };

  paths['/'] = {
    get: {
      tags: ['Service'],
      summary: 'Рӯйхати ҳамаи ресурсҳо',
      responses: {
        200: {
          description: 'Ресурсҳо ва суроғаҳои онҳо',
          content: {
            'application/json': {
              example: { users: 'http://localhost:8000/users' },
            },
          },
        },
      },
    },
  };

  return paths;
}

export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'AgroSmart.tj API',
    version: '1.0.0',
    description: [
      'Бэкенд барои фронтенди **AgroSmart.tj** (React + Vite).',
      '',
      'Фронтенд зери **json-server** навишта шудааст, бинобар ин ин API',
      'маҳз ҳамон рафторро такрор мекунад — дар фронтенд ҳеҷ чиз иваз кардан лозим нест.',
      'Ҳар шаш ресурс як хел кор мекунад: `getAll`, `getById`, `create`, `update` (PUT),',
      '`patch`, `remove` — ҳамон тавре ки дар `src/api/httpClient.js` навишта шудааст.',
      '',
      '⚠️ **Огоҳӣ:** паролҳо дар `/users` кушода нигоҳ дошта мешаванд, чунки',
      '`context/UserContext.jsx` онҳоро дар браузер муқоиса мекунад.',
      'Тафсилот ва роҳи ислоҳ — дар `README.md`.',
    ].join('\n'),
  },
  tags: [
    ...RESOURCES.map((r) => ({ name: DOCS[r.path].tag, description: DOCS[r.path].summary })),
    { name: 'Service', description: 'Санҷиш ва рӯйхати ресурсҳо' },
  ],
  paths: buildPaths(),
};
