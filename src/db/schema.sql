-- AgroSmart.tj schema. Safe to run multiple times (IF NOT EXISTS everywhere).
--
-- Ҳар ресурс як ҷадвал дорад: `id` (рақами худкор, ба монанди json-server)
-- ва `data` (JSONB) — ҳамаи майдонҳои дигар.
--
-- Чаро JSONB? Фронтенд барои як ресурс шаклҳои гуногун мефиристад:
-- формаи профил ва панели admin майдонҳои гуногун доранд, сабтҳои кӯҳна
-- номҳои дигар доранд (CITY_ALIASES дар lib/catalog.js). Бо сутунҳои
-- қатъӣ ҳар тағйири форма миграцияи нав талаб мекард.

CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  data       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Ҷустуҷӯи корбар бо рақами телефон: GET /users?userPhone=...
CREATE INDEX IF NOT EXISTS idx_users_phone ON users ((data->>'userPhone'));

CREATE TABLE IF NOT EXISTS mahsulot (
  id         SERIAL PRIMARY KEY,
  data       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mahsulot_user ON mahsulot ((data->>'userId'));

CREATE TABLE IF NOT EXISTS zamin (
  id         SERIAL PRIMARY KEY,
  data       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_zamin_user ON zamin ((data->>'userId'));

-- Диққат: номи ҷадвал бо ҳарфҳои хурд аст, вале фронтенд
-- /ZaminApteka-ро даъват мекунад. Мутобиқат дар src/core/resources.ts.
CREATE TABLE IF NOT EXISTS zamin_apteka (
  id         SERIAL PRIMARY KEY,
  data       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_apteka_user ON zamin_apteka ((data->>'userId'));

CREATE TABLE IF NOT EXISTS jobs (
  id         SERIAL PRIMARY KEY,
  data       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_jobs_user ON jobs ((data->>'userId'));

CREATE TABLE IF NOT EXISTS notifications (
  id         SERIAL PRIMARY KEY,
  data       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- GET /notifications?userId=...&_sort=id&_order=desc
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications ((data->>'userId'));
CREATE INDEX IF NOT EXISTS idx_notifications_buyer ON notifications ((data->>'buyerId'));

-- ══════════════════════════════════════════════════════════════════════════
-- ЧАТ байни харидор ва фурӯшанда (+ занги аудио ва паёми овозӣ)
-- ══════════════════════════════════════════════════════════════════════════

-- Як сӯҳбат байни ду корбар. Барои ҳар мол сӯҳбати алоҳида мешавад:
-- харидор метавонад бо ҳамон фурӯшанда дар бораи ду моли гуногун
-- ҷудогона нависад.
--
-- user_a ҳамеша ID-и хурдтар аст, user_b — калонтар. Ин ба он хотир аст,
-- ки ҷуфти (3,5) ва (5,3) як сӯҳбат бошанд, на дуто.
CREATE TABLE IF NOT EXISTS chats (
  id         SERIAL PRIMARY KEY,
  user_a     INTEGER NOT NULL,
  user_b     INTEGER NOT NULL,
  data       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chats_users_ordered CHECK (user_a < user_b)
);

-- Такрор нашудани сӯҳбат: як ҷуфт + як мол = як сӯҳбат.
-- COALESCE лозим аст, чунки дар индекси UNIQUE қиймати NULL такрорро намебандад.
CREATE UNIQUE INDEX IF NOT EXISTS idx_chats_pair
  ON chats (user_a, user_b, (COALESCE(data->>'productId', '')));

CREATE INDEX IF NOT EXISTS idx_chats_user_a ON chats (user_a);
CREATE INDEX IF NOT EXISTS idx_chats_user_b ON chats (user_b);

-- Паёмҳо: матн, овоз ва сабти занг дар як ҷадвал.
--   kind = 'text'  -> data.text
--   kind = 'voice' -> data.audio (data-URL base64), data.duration
--   kind = 'call'  -> data.callId, data.status, data.duration
CREATE TABLE IF NOT EXISTS messages (
  id         SERIAL PRIMARY KEY,
  chat_id    INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id  INTEGER NOT NULL,
  kind       TEXT NOT NULL DEFAULT 'text'
             CHECK (kind IN ('text', 'voice', 'call')),
  data       JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Таърихи сӯҳбат ҳамеша бо chat_id ва тартиби id хонда мешавад
CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages (chat_id, id);
-- Ҳисоби паёмҳои нахонда
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages (chat_id, sender_id) WHERE read_at IS NULL;
