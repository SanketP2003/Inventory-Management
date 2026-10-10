import { default as pgServer } from 'embedded-postgres';

async function start() {
  console.log('Initializing embedded PostgreSQL server...');
  const pg = new pgServer({
    databaseDir: './.pgdata',
    port: 5432,
    user: 'inventory_user',
    password: 'inventory_secret_pw',
    initialDatabase: 'inventory_db',
  });

  try {
    await pg.initialise();
    console.log('PostgreSQL initialized.');
  } catch (err: any) {
    console.log('Init note:', err?.message || err);
  }

  await pg.start();
  console.log('Embedded PostgreSQL is now running on port 5432!');
  console.log('Database URL: postgresql://inventory_user:inventory_secret_pw@localhost:5432/inventory_db?schema=public');
}

start().catch((err) => {
  console.error('Failed to start embedded PostgreSQL:', err);
  process.exit(1);
});
