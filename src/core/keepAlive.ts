/**
 * Нигоҳ доштани сервер дар ҳолати бедор (keep-alive).
 *
 * Render-и ройгон сервисро баъди 15 дақиқаи бе дархост хоб мекунад —
 * баъд дархости аввал ~1 дақиқа интизор мешавад ва телефон менависад
 * "сервер ҷавоб намедиҳад". Барои ҳамин сервер худаш ҳар чанд дақиқа
 * ба суроғаи ҷамъиятии худ дархост мефиристад.
 *
 * Суроға аз KEEP_ALIVE_URL ё RENDER_EXTERNAL_URL (Render худаш медиҳад)
 * гирифта мешавад. Дар компютери худ (localhost) ин холӣ аст — кор намекунад.
 */
export function startKeepAlive(baseUrl: string, minutes: number) {
  if (!baseUrl || minutes <= 0) {
    console.log('💓 Keep-alive: хомӯш (суроғаи ҷамъиятӣ нест)');
    return;
  }

  const target = `${baseUrl.replace(/\/+$/, '')}/health`;

  async function ping() {
    try {
      const res = await fetch(target, { signal: AbortSignal.timeout(30_000) });
      if (!res.ok) console.warn(`💓 Keep-alive: ${target} → ${res.status}`);
    } catch (err) {
      console.warn(`💓 Keep-alive: хато — ${(err as Error).message}`);
    }
  }

  const timer = setInterval(ping, minutes * 60 * 1000);
  timer.unref?.();
  console.log(`💓 Keep-alive: ҳар ${minutes} дақиқа → ${target}`);
}
