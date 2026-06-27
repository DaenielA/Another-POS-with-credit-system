const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function setup() {
  // Connect without database first
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    multipleStatements: true,
  });

  console.log('Connected to MySQL...');

  const migrationSQL = fs.readFileSync(path.join(__dirname, '../database/migrations.sql'), 'utf8');
  const seedSQL = fs.readFileSync(path.join(__dirname, '../database/seed.sql'), 'utf8');

  console.log('Running migrations...');
  await conn.query(migrationSQL);
  console.log('Migrations done.');

  console.log('Running seed...');
  await conn.query(seedSQL);
  console.log('Seed done.');

  await conn.end();
  console.log('\n✅ Database setup complete!');
  console.log('You can now run: npm start');
}

setup().catch(err => {
  console.error('❌ Setup failed:', err.message);
  process.exit(1);
});
