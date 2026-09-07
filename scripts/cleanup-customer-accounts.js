/*
 * Lists (and optionally deletes) leftover non-admin accounts from when the site
 * was a shop. The catalogue has no customer accounts, so these serve no purpose.
 *
 *   node scripts/cleanup-customer-accounts.js            # list only, changes nothing
 *   node scripts/cleanup-customer-accounts.js --delete   # actually delete them
 *
 * Reads DATABASE_URL from the environment or from .env. Take a backup before
 * running with --delete: it cannot be undone.
 */
// dotenv is available transitively via @nestjs/config; fall back to plain env vars.
try { require('dotenv').config(); } catch { /* ignore */ }
const { Client } = require('pg');

const shouldDelete = process.argv.includes('--delete');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set. Add it to .env or the environment.');
    process.exit(1);
  }

  const db = new Client({ connectionString });
  await db.connect();

  const { rows } = await db.query(
    `SELECT id, username, email, role FROM "user" WHERE role <> 'admin' ORDER BY id`,
  );

  if (rows.length === 0) {
    console.log('No non-admin accounts found. Nothing to do.');
    await db.end();
    return;
  }

  console.log(`${rows.length} non-admin account(s):\n`);
  rows.forEach(r => console.log(`  ${String(r.id).padStart(4)}  ${String(r.username).padEnd(20)} ${r.email}`));

  const admins = await db.query(`SELECT COUNT(*)::int AS n FROM "user" WHERE role = 'admin'`);
  console.log(`\nAdmin accounts that will be kept: ${admins.rows[0].n}`);

  if (!shouldDelete) {
    console.log('\nListing only. Re-run with --delete to remove them.');
    await db.end();
    return;
  }

  if (admins.rows[0].n === 0) {
    console.error('\nRefusing to delete: there are no admin accounts, so you would be locked out.');
    await db.end();
    process.exit(1);
  }

  const result = await db.query(`DELETE FROM "user" WHERE role <> 'admin'`);
  console.log(`\nDeleted ${result.rowCount} account(s).`);

  await db.end();
}

main().catch(err => { console.error('FAILED:', err.message); process.exit(1); });
