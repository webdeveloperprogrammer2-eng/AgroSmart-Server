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

  // ── Чат ────────────────────────────────────────────────────────────────
  const userIdQuery = {
    name: 'userId',
    in: 'query',
    required: true,
    schema: { type: 'integer' },
    description: 'ID-и корбари ҷорӣ (авторизатсия ҳанӯз нест — README)',
    example: 3,
  };
  const chatIdPath = {
    name: 'id',
    in: 'path',
    required: true,
    schema: { type: 'integer' },
    description: 'ID-и сӯҳбат',
  };

  paths['/chats'] = {
    get: {
      tags: ['Chat'],
      summary: 'Рӯйхати сӯҳбатҳои корбар',
      description: 'Навтаринаш дар боло. Ҳар сатр `lastMessage` ва `unreadCount` дорад.',
      parameters: [userIdQuery],
      responses: {
        200: {
          description: 'Сӯҳбатҳо',
          content: {
            'application/json': {
              example: [
                {
                  id: 1,
                  participants: [3, 5],
                  peerId: 5,
                  productId: '2',
                  productName: 'Себи Данғара',
                  unreadCount: 2,
                  lastMessage: {
                    id: 9, chatId: 1, senderId: 5, kind: 'text',
                    text: 'Салом, ҳаст?', readAt: null,
                    createdAt: '2026-09-02T10:00:00.000Z',
                  },
                  createdAt: '2026-09-02T09:00:00.000Z',
                  updatedAt: '2026-09-02T10:00:00.000Z',
                },
              ],
            },
          },
        },
      },
    },
    post: {
      tags: ['Chat'],
      summary: 'Кушодани сӯҳбат бо фурӯшанда',
      description:
        'Агар чунин сӯҳбат аллакай бошад — ҳамонаш бармегардад (`200`), сӯҳбати нав — `201`. ' +
        'Барои ҳар мол сӯҳбати алоҳида мешавад, агар `productId` дода шавад.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            example: {
              buyerId: 3,
              sellerId: 5,
              productId: '2',
              productName: 'Себи Данғара',
              productType: 'mahsulot',
            },
          },
        },
      },
      responses: {
        200: { description: 'Сӯҳбат аллакай буд' },
        201: { description: 'Сӯҳбати нав сохта шуд' },
        400: { description: 'buyerId ё sellerId нодуруст' },
      },
    },
  };

  paths['/chats/{id}'] = {
    get: {
      tags: ['Chat'],
      summary: 'Як сӯҳбат',
      parameters: [chatIdPath, userIdQuery],
      responses: {
        200: { description: 'Сӯҳбат' },
        403: { description: 'Шумо иштирокчии ин сӯҳбат нестед' },
        404: { description: 'Сӯҳбат ёфт нашуд' },
      },
    },
  };

  paths['/chats/{id}/messages'] = {
    get: {
      tags: ['Chat'],
      summary: 'Таърихи паёмҳо',
      description: 'Тартиб: кӯҳна → нав. Барои скролли боло `_before` -и ID-и паёми аввалро диҳед.',
      parameters: [
        chatIdPath,
        userIdQuery,
        { name: '_limit', in: 'query', required: false, schema: { type: 'integer' }, description: 'Пешфарз 50, то 200' },
        { name: '_before', in: 'query', required: false, schema: { type: 'integer' }, description: 'Танҳо паёмҳои кӯҳнатар аз ин ID' },
      ],
      responses: {
        200: {
          description: 'Паёмҳо',
          content: {
            'application/json': {
              example: [
                { id: 1, chatId: 1, senderId: 3, kind: 'text', text: 'Салом', readAt: null, createdAt: '2026-09-02T10:00:00.000Z' },
                { id: 2, chatId: 1, senderId: 5, kind: 'voice', audio: 'data:audio/webm;base64,...', duration: 7, mimeType: 'audio/webm', readAt: null, createdAt: '2026-09-02T10:01:00.000Z' },
                { id: 3, chatId: 1, senderId: 3, kind: 'call', callId: 'c-17', status: 'ended', duration: 42, readAt: null, createdAt: '2026-09-02T10:05:00.000Z' },
              ],
            },
          },
        },
      },
    },
    post: {
      tags: ['Chat'],
      summary: 'Фиристодани паём (матн ё овоз)',
      description:
        'Паём фавран бо WebSocket ба ҳар ду тараф мерасад. ' +
        'Барои паёми овозӣ `kind: "voice"` ва `audio` ҳамчун data-URL.',
      parameters: [chatIdPath],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            examples: {
              matn: { summary: 'Матн', value: { userId: 3, text: 'Салом, ин ҳаст?' } },
              ovoz: {
                summary: 'Паёми овозӣ',
                value: { userId: 3, kind: 'voice', audio: 'data:audio/webm;base64,GkXfo59...', duration: 7, mimeType: 'audio/webm' },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'Паём фиристода шуд' },
        400: { description: 'Матн холӣ ё `audio` data-URL нест' },
        403: { description: 'Шумо иштирокчии ин сӯҳбат нестед' },
      },
    },
  };

  paths['/chats/{id}/read'] = {
    post: {
      tags: ['Chat'],
      summary: 'Паёмҳоро хондашуда қайд кардан',
      description: 'Ҳамсӯҳбат фавран бо WebSocket (`chat:read`) хабар мегирад.',
      parameters: [chatIdPath],
      requestBody: {
        required: true,
        content: { 'application/json': { example: { userId: 3 } } },
      },
      responses: {
        200: {
          description: 'Қайд шуд',
          content: { 'application/json': { example: { chatId: 1, messageIds: [7, 8], count: 2 } } },
        },
      },
    },
  };

  paths['/chats/unread/count'] = {
    get: {
      tags: ['Chat'],
      summary: 'Шумораи умумии паёмҳои нахонда',
      description: 'Барои нишони сурх дар навбар.',
      parameters: [userIdQuery],
      responses: {
        200: {
          description: 'Шумора',
          content: { 'application/json': { example: { userId: 3, unread: 4 } } },
        },
      },
    },
  };

  // ── Танзимот / Нигоҳдоштаҳо / Ҷустуҷӯ ─────────────────────────────────
  const uidQuery = {
    name: 'userId', in: 'query', required: true,
    schema: { type: 'integer' }, example: 3,
    description: 'ID-и корбари ҷорӣ (авторизатсия ҳанӯз нест — README)',
  };

  paths['/settings'] = {
    get: {
      tags: ['Settings'],
      summary: 'Ҳамаи танзимоти корбар',
      description: 'Маълумоти шахсӣ + афзалиятҳо. Парол дар ҷавоб намеояд.',
      parameters: [uidQuery],
      responses: {
        200: {
          description: 'Танзимот',
          content: { 'application/json': { example: {
            user: { id: 3, userName: 'Ali Karimov', userPhone: '+992900000003',
                    city: 'Bokhtar', age: 28, role: 'user', avatar: 'data:image/png;base64,...' },
            preferences: { language: 'tj', theme: 'light', notifications: true },
          } } },
        },
        404: { description: 'Корбар ёфт нашуд' },
      },
    },
  };

  paths['/settings/profile'] = {
    patch: {
      tags: ['Settings'],
      summary: 'Иваз кардани маълумоти шахсӣ',
      description: 'Танҳо майдонҳои фиристодашуда иваз мешаванд. `avatar` — data-URL, сатри холӣ суратро нест мекунад.',
      requestBody: { required: true, content: { 'application/json': { example: {
        userId: 3, userName: 'Ali Karimov', city: 'Khujand', age: 29,
        avatar: 'data:image/png;base64,iVBORw0KGgo...',
      } } } },
      responses: {
        200: { description: 'Иваз шуд' },
        400: { description: 'Ном кӯтоҳ, синну сол берун аз 18–120, ё avatar data-URL нест' },
      },
    },
  };

  paths['/settings/phone'] = {
    patch: {
      tags: ['Settings'],
      summary: 'Иваз кардани рақами телефон',
      description: 'Рақам логин аст, бинобар ин паролро талаб мекунад ва рақами нав набояд банд бошад.',
      requestBody: { required: true, content: { 'application/json': { example: {
        userId: 3, userPhone: '+992900000009', password: '1234',
      } } } },
      responses: {
        200: { description: 'Рақам иваз шуд' },
        401: { description: 'Парол нодуруст' },
        409: { description: 'Ин рақам аллакай банд аст' },
      },
    },
  };

  paths['/settings/password'] = {
    patch: {
      tags: ['Settings'],
      summary: 'Иваз кардани парол',
      description: 'Пароли кӯҳна ҳатман тафтиш мешавад.',
      requestBody: { required: true, content: { 'application/json': { example: {
        userId: 3, oldPassword: '1234', newPassword: 'nav1234',
      } } } },
      responses: {
        200: { description: 'Парол иваз шуд' },
        400: { description: 'Пароли нав кӯтоҳ ё ҳамон пароли кӯҳна' },
        401: { description: 'Пароли кӯҳна нодуруст' },
      },
    },
  };

  paths['/settings/preferences'] = {
    patch: {
      tags: ['Settings'],
      summary: 'Забон, мавзӯъ, хабарномаҳо',
      description: 'Пештар инҳо танҳо дар localStorage буданд ва дар дастгоҳи дигар гум мешуданд — ҳоло дар сервер мемонанд.',
      requestBody: { required: true, content: { 'application/json': { example: {
        userId: 3, language: 'ru', theme: 'dark', notifications: true,
      } } } },
      responses: {
        200: { description: 'Афзалиятҳои нав',
               content: { 'application/json': { example: { language: 'ru', theme: 'dark', notifications: true } } } },
        400: { description: '`language` бояд tj|ru|en, `theme` бояд light|dark бошад' },
      },
    },
  };

  paths['/settings/account'] = {
    delete: {
      tags: ['Settings'],
      summary: 'Нест кардани ҳисоб',
      description: 'Ҳамроҳи корбар молҳо, заминҳо, дорувори, дархостҳо, хабарномаҳо, сӯҳбатҳо ва нигоҳдоштаҳои ӯ нест мешаванд — вагарна дар бозор моли бесоҳиб мемонд.',
      requestBody: { required: true, content: { 'application/json': { example: { userId: 3, password: '1234' } } } },
      responses: {
        200: { description: 'Нест шуд',
               content: { 'application/json': { example: { message: 'Ҳисоб нест карда шуд',
                 deleted: { mahsulot: 2, zamin: 1, ZaminApteka: 0, jobs: 1, notifications: 3, chats: 2, favorites: 4 } } } } },
        401: { description: 'Парол нодуруст' },
      },
    },
  };

  paths['/favorites'] = {
    get: {
      tags: ['Favorites'],
      summary: 'Молҳои нигоҳдошта',
      description: 'Ҳар сатр ҳамроҳи худи мол (`item`) меояд. Агар мол нест шуда бошад — `item: null`.',
      parameters: [uidQuery],
      responses: { 200: { description: 'Рӯйхат',
        content: { 'application/json': { example: [{ id: 1, itemType: 'mahsulot', itemId: '2',
          createdAt: '2026-09-02T10:00:00.000Z',
          item: { id: 2, name: 'Себи Данғара', price: 12, city: 'Dushanbe' } }] } } } },
    },
    post: {
      tags: ['Favorites'],
      summary: 'Ба нигоҳдоштаҳо илова кардан',
      description: 'Такрор пахш кардан хато намедиҳад — дубликат сохта намешавад.',
      requestBody: { required: true, content: { 'application/json': { example: {
        userId: 3, itemType: 'mahsulot', itemId: '2' } } } },
      responses: {
        201: { description: 'Илова шуд' },
        400: { description: '`itemType` бояд mahsulot | zamin | ZaminApteka бошад' },
        404: { description: 'Чунин мол ёфт нашуд' },
      },
    },
    delete: {
      tags: ['Favorites'],
      summary: 'Хориҷ кардан бо худи мол',
      description: 'Барои тугмаи "дил" қулай — ID-и сатри favorites донистан лозим нест.',
      parameters: [
        uidQuery,
        { name: 'itemType', in: 'query', required: true, schema: { type: 'string' }, example: 'mahsulot' },
        { name: 'itemId', in: 'query', required: true, schema: { type: 'string' }, example: '2' },
      ],
      responses: { 200: { description: 'Хориҷ шуд' }, 404: { description: 'Ёфт нашуд' } },
    },
  };

  paths['/favorites/{id}'] = {
    delete: {
      tags: ['Favorites'],
      summary: 'Хориҷ кардан бо ID-и сатр',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        uidQuery,
      ],
      responses: { 200: { description: 'Хориҷ шуд' }, 404: { description: 'Ёфт нашуд' } },
    },
  };

  paths['/search'] = {
    get: {
      tags: ['Search'],
      summary: 'Ҷустуҷӯ дар ҳар се бозор якбора',
      description: '`q` дар ном, тавсиф ва шаҳр ҷустуҷӯ мекунад (ҳарфи калон/хурд фарқ намекунад). Ҳар натиҷа майдони `_type` дорад — аз кадом бозор аст.',
      parameters: [
        { name: 'q', in: 'query', required: false, schema: { type: 'string' }, example: 'себ' },
        { name: 'type', in: 'query', required: false, schema: { type: 'string', enum: ['mahsulot', 'zamin', 'ZaminApteka'] } },
        { name: 'city', in: 'query', required: false, schema: { type: 'string' }, example: 'Dushanbe' },
        { name: 'category', in: 'query', required: false, schema: { type: 'string' }, example: 'Meva' },
        { name: 'minPrice', in: 'query', required: false, schema: { type: 'number' } },
        { name: 'maxPrice', in: 'query', required: false, schema: { type: 'number' } },
        { name: '_limit', in: 'query', required: false, schema: { type: 'integer' }, description: 'Пешфарз 30, то 200' },
      ],
      responses: { 200: { description: 'Натиҷаҳо',
        content: { 'application/json': { example: { query: 'себ', count: 1,
          results: [{ id: 2, name: 'Себи Данғара', price: 12, city: 'Dushanbe', _type: 'mahsulot' }] } } } } },
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
    {
      name: 'Chat',
      description:
        'Чат байни харидор ва фурӯшанда — матн, паёми овозӣ ва занги аудио. ' +
        'Ҳама чиз дар вақти воқеӣ тавассути WebSocket: ws://localhost:8000/ws?userId=<id>',
    },
    {
      name: 'Settings',
      description:
        'Танзимоти корбар — маълумоти шахсӣ, аватар, рақами телефон, парол, '  +
        'забон/мавзӯъ ва нест кардани ҳисоб.',
    },
    { name: 'Favorites', description: 'Молҳои нигоҳдоштаи корбар (маҳсулот, замин, дорувори)' },
    { name: 'Search', description: 'Ҷустуҷӯи умумӣ дар ҳар се бозор' },
    { name: 'Service', description: 'Санҷиш ва рӯйхати ресурсҳо' },
  ],
  paths: buildPaths(),
};
