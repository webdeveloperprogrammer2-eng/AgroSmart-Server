import { createApp } from './app';
import { env } from './config/env';
import { pool } from './config/db';
import { ensureSchema } from './db/ensureSchema';
import { RESOURCES } from './core/resources';
import { attachWebSocket } from './realtime/socket';

const app = createApp();

/**
 * Тартиби оғоз: аввал базаро тафтиш мекунем, баъд порт мекушоем.
 *
 * Агар аввал `listen` кунем, сервер "тайёр" менамояд, вале ҳар дархост
 * бо хатои база меафтад — барои ҳамин ҳама чиз пеш аз listen тафтиш мешавад.
 */
async function start() {
  const url = `http://localhost:${env.PORT}`;

  console.log('');

  // CORS
  console.log(
    env.CORS_ORIGIN === '*'
      ? '🌐 CORS: all origins allowed (CORS_ORIGIN=*)'
      : `🌐 CORS: ${env.CORS_ORIGIN}`
  );

  // База
  try {
    await pool.query('SELECT 1');
    console.log('✅ Database connected');
  } catch (err) {
    console.error('');
    console.error('❌ Database connection failed:', (err as Error).message);
    console.error(`   DATABASE_URL: ${env.DATABASE_URL.replace(/:[^:@/]*@/, ':****@')}`);
    console.error('   Postgres кор мекунад? База сохта шудааст?');
    console.error('   psql -U postgres -c "CREATE DATABASE agrosmart;"');
    console.error('');
    process.exit(1);
  }

  // Ҷадвалҳо
  try {
    await ensureSchema();
    console.log('✅ Schema up to date');
  } catch (err) {
    console.error('❌ Schema failed:', (err as Error).message);
    process.exit(1);
  }

  const server = app.listen(env.PORT, () => {
    console.log(`🚀 Server running on ${url} (${env.NODE_ENV})`);
    console.log(`📖 API docs at ${url}/docs`);
    console.log(`❤️  Health at ${url}/health`);
    console.log('');
    console.log(`📦 Resources (${RESOURCES.length}):`);
    for (const resource of RESOURCES) {
      console.log(`   • ${url}/${resource.path}`);
    }
    console.log('');
    console.log('⚙️  Settings / Favorites / Search:');
    console.log(`   • ${url}/settings?userId=3`);
    console.log(`   • ${url}/favorites?userId=3`);
    console.log(`   • ${url}/search?q=себ`);
    console.log('');
    console.log('💬 Chat (REST):');
    console.log(`   • ${url}/chats`);
    console.log(`⚡ Realtime: ws://localhost:${env.PORT}/ws?userId=<id>`);
    console.log('   text · voice · audio call (WebRTC signaling)');
    console.log(`🧪 Live demo (chat + call): ${url}/chat-demo`);
    console.log('');
  });

  // WebSocket ба ҳамон http-сервер часпонида мешавад — порти алоҳида лозим нест
  attachWebSocket(server);

  // Порт банд аст — паёми фаҳмо ба ҷои stack trace-и дароз
  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error('');
      console.error(`❌ Порти ${env.PORT} аллакай банд аст.`);
      console.error('   Эҳтимол сервер дар тирезаи дигар кор карда истодааст.');
      console.error('');
      console.error('   Онро пӯшед, ё равандро кушед:');
      console.error(`   npx kill-port ${env.PORT}`);
      console.error('');
      console.error('   Ё порти дигарро дар .env нависед (PORT=...) —');
      console.error('   вале он гоҳ BASE_URL дар фронтенд низ бояд иваз шавад.');
      console.error('');
      process.exit(1);
    }
    throw err;
  });

  async function shutdown(signal: string) {
    console.log(`\n${signal} received, shutting down...`);
    server.close();
    await pool.end();
    process.exit(0);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start();
