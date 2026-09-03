import { pool, query } from '../config/db';

/**
 * Маълумоти намунавӣ барои санҷиш.
 *
 * `npm run seed` ҷадвалҳоро ТОЗА мекунад ва аз нав пур мекунад —
 * онро дар база бо маълумоти воқеӣ иҷро накунед.
 */

const users = [
  { userName: 'Iso Samadov', userPhone: '+992900000001', city: 'Dushanbe', age: 25, password: '1234', role: 'superadmin' },
  { userName: 'Admin', userPhone: '+992900000002', city: 'Khujand', age: 30, password: '1234', role: 'admin' },
  { userName: 'Ali Karimov', userPhone: '+992900000003', city: 'Bokhtar', age: 28, password: '1234', role: 'user' },
];

const PLACEHOLDER = '';

async function seed() {
  console.log('Clearing tables ...');
  await pool.query(
    'TRUNCATE users, mahsulot, zamin, zamin_apteka, jobs, notifications RESTART IDENTITY'
  );

  console.log('Inserting users ...');
  const userIds: number[] = [];
  for (const user of users) {
    const rows = await query<{ id: number }>(
      `INSERT INTO users (data) VALUES ($1::jsonb) RETURNING id`,
      [JSON.stringify(user)]
    );
    userIds.push(rows[0].id);
  }

  const farmer = { id: userIds[2], name: users[2].userName, phone: users[2].userPhone };

  console.log('Inserting mahsulot ...');
  await query(
    `INSERT INTO mahsulot (data) VALUES ($1::jsonb), ($2::jsonb)`,
    [
      JSON.stringify({
        name: 'Себи Данғара', category: 'Meva', city: 'Dushanbe', img: PLACEHOLDER,
        description: 'Себи тару тоза, аз боғи худамон.', price: 12, leftovers: 500,
        userId: farmer.id, farmerName: farmer.name, farmerPhone: farmer.phone,
      }),
      JSON.stringify({
        name: 'Помидори гармхонагӣ', category: 'Sabzavot', city: 'Khujand', img: PLACEHOLDER,
        description: 'Помидори ширадор.', price: 9, leftovers: 300,
        userId: farmer.id, farmerName: farmer.name, farmerPhone: farmer.phone,
      }),
    ]
  );

  console.log('Inserting zamin ...');
  await query(
    `INSERT INTO zamin (data) VALUES ($1::jsonb)`,
    [
      JSON.stringify({
        type: 'zamin', name: 'Замини кишоварзӣ дар Рудакӣ', city: 'Rudaki', img: PLACEHOLDER,
        price: 5000, leftovers: 2, desc: 'Замини обёришаванда, 2 гектар.',
        userId: farmer.id, farmerName: farmer.name, farmerPhone: farmer.phone,
      }),
    ]
  );

  console.log('Inserting ZaminApteka ...');
  await query(
    `INSERT INTO zamin_apteka (data) VALUES ($1::jsonb)`,
    [
      JSON.stringify({
        name: 'Нуриҳои минералӣ NPK', category: 'Zamin', city: 'Dushanbe', img: PLACEHOLDER,
        description: 'Барои ҳосилнокии беҳтар.', price: 150, leftovers: 40,
        userId: farmer.id, farmerName: farmer.name, farmerPhone: farmer.phone,
      }),
    ]
  );

  console.log('Inserting jobs ...');
  await query(
    `INSERT INTO jobs (data) VALUES ($1::jsonb)`,
    [
      JSON.stringify({
        companyName: 'ООО "Агроэкспорт"', productName: 'Себ', volume: '10 тонна',
        description: 'Барои содирот ба Русия.',
        userId: farmer.id, creatorName: farmer.name, creatorPhone: farmer.phone,
        createdAt: new Date().toISOString(),
      }),
    ]
  );

  console.log('✅ Seed done');
  await pool.end();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
