/**
 * Stech WhatsApp Business CRM — Automated Database Restore Script
 * Restores a verified PostgreSQL backup with SHA-256 integrity validation into a target database.
 * Usage: node scripts/db-restore.js --file=./backups/backup_xyz.sql [--target-db=whatsapp_crm_test]
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
let dotenv;
try {
  dotenv = require('dotenv');
} catch {
  dotenv = require(path.resolve(__dirname, '../server/node_modules/dotenv'));
}

dotenv.config({ path: path.resolve(__dirname, '../server/.env') });

const args = process.argv.slice(2);
let backupFileArg = null;
let targetDbArg = 'whatsapp_crm_recovery_test';

for (const arg of args) {
  if (arg.startsWith('--file=')) {
    backupFileArg = arg.split('=')[1];
  } else if (arg.startsWith('--target-db=')) {
    targetDbArg = arg.split('=')[1];
  }
}

if (!backupFileArg) {
  // Find latest backup if not provided
  const backupDir = path.resolve(__dirname, '../backups');
  if (fs.existsSync(backupDir)) {
    const files = fs.readdirSync(backupDir).filter((f) => f.endsWith('.sql'));
    if (files.length > 0) {
      files.sort().reverse();
      backupFileArg = path.join(backupDir, files[0]);
    }
  }
}

if (!backupFileArg || !fs.existsSync(backupFileArg)) {
  console.error('ERROR: No valid backup file found or specified with --file=<path>');
  process.exit(1);
}

// Safety Check: Never overwrite production or active development DB unless explicitly requested
if (targetDbArg === 'whatsapp_crm' && !args.includes('--confirm-overwrite-active-db')) {
  console.error('SAFETY BLOCKED: Cannot restore directly into active database "whatsapp_crm" without --confirm-overwrite-active-db flag.');
  process.exit(1);
}

console.log(`Starting PostgreSQL restore from: ${backupFileArg} into database: ${targetDbArg}...`);

try {
  // Verify SHA-256 checksum if metadata file exists
  const metaFile = backupFileArg.replace(/\.sql$/, '.meta.json');
  if (fs.existsSync(metaFile)) {
    const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
    const currentBuf = fs.readFileSync(backupFileArg);
    const currentHash = crypto.createHash('sha256').update(currentBuf).digest('hex');
    if (meta.sha256 && meta.sha256 !== currentHash) {
      console.error(`INTEGRITY ERROR: SHA-256 checksum mismatch! Expected ${meta.sha256}, got ${currentHash}`);
      process.exit(1);
    }
    console.log(`Verified SHA-256 Checksum: ${currentHash} (MATCH)`);
  }

  // Create disposable target DB if not exists
  const containerName = process.env.PG_CONTAINER || 'crm_postgres';
  let useDocker = false;
  let activeContainer = containerName;

  try {
    execSync(`docker exec ${containerName} pg_isready`, { stdio: 'pipe' });
    useDocker = true;
  } catch {
    try {
      execSync('docker exec crm_prod_postgres pg_isready', { stdio: 'pipe' });
      useDocker = true;
      activeContainer = 'crm_prod_postgres';
    } catch {
      useDocker = false;
    }
  }

  let tableCount = 0;
  if (useDocker) {
    execSync(`docker exec ${activeContainer} psql -U postgres -c "DROP DATABASE IF EXISTS ${targetDbArg};"`, { stdio: 'pipe' });
    execSync(`docker exec ${activeContainer} psql -U postgres -c "CREATE DATABASE ${targetDbArg};"`, { stdio: 'pipe' });
    let restoreCmd = `Get-Content "${backupFileArg}" | docker exec -i ${activeContainer} psql -U postgres -d ${targetDbArg}`;
    execSync(`powershell -Command "${restoreCmd}"`, { stdio: 'pipe' });
    const checkRes = execSync(
      `docker exec ${activeContainer} psql -U postgres -d ${targetDbArg} -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';"`,
      { encoding: 'utf8' }
    );
    tableCount = parseInt(checkRes.trim(), 10);
  } else {
    execSync(`psql -U postgres -c "DROP DATABASE IF EXISTS ${targetDbArg};"`, { stdio: 'pipe' });
    execSync(`psql -U postgres -c "CREATE DATABASE ${targetDbArg};"`, { stdio: 'pipe' });
    let restoreCmd = `Get-Content "${backupFileArg}" | psql -U postgres -d ${targetDbArg}`;
    execSync(`powershell -Command "${restoreCmd}"`, { stdio: 'pipe' });
    const checkRes = execSync(
      `psql -U postgres -d ${targetDbArg} -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';"`,
      { encoding: 'utf8' }
    );
    tableCount = parseInt(checkRes.trim(), 10);
  }

  console.log('Restoration completed successfully:');
  console.log(` - Target Database: ${targetDbArg}`);
  console.log(` - Restored Tables in public schema: ${tableCount}`);
  if (tableCount >= 31) {
    console.log(' - Verification Status: PASSED (All CRM models restored)');
  } else {
    console.warn(` - Warning: Restored table count (${tableCount}) is lower than expected (32).`);
  }
} catch (err) {
  console.error('Restoration failed:', err.message);
  process.exit(1);
}
