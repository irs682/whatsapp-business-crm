/**
 * Stech WhatsApp Business CRM — Automated Database Backup Script
 * Generates consistent, timestamped PostgreSQL backups with SHA-256 integrity checksums.
 * Usage: node scripts/db-backup.js [--output-dir=./backups]
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

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set in server/.env');
  process.exit(1);
}

// Parse database URL
const parsedUrl = new URL(DATABASE_URL);
const dbName = parsedUrl.pathname.replace(/^\//, '');
const dbUser = parsedUrl.username;
const dbHost = parsedUrl.hostname;
const dbPort = parsedUrl.port || '5432';

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.resolve(__dirname, '../backups');

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const backupFile = path.join(backupDir, `backup_${dbName}_${timestamp}.sql`);
const metadataFile = path.join(backupDir, `backup_${dbName}_${timestamp}.meta.json`);

console.log(`Starting PostgreSQL backup for database: ${dbName} at ${dbHost}:${dbPort}...`);

try {
  // Execute pg_dump via docker container if available or system pg_dump
  let dumpCommand = '';
  try {
    execSync('docker --context default exec bakesuite-db pg_dump --version', { stdio: 'pipe' });
    dumpCommand = `docker --context default exec bakesuite-db pg_dump -U ${dbUser} --clean --if-exists ${dbName} > "${backupFile}"`;
  } catch {
    dumpCommand = `pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} --clean --if-exists -f "${backupFile}"`;
  }

  execSync(dumpCommand, { stdio: 'inherit', env: { ...process.env, PGPASSWORD: parsedUrl.password } });

  const stats = fs.statSync(backupFile);
  const fileBuffer = fs.readFileSync(backupFile);
  const hashSum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

  const metadata = {
    database: dbName,
    timestamp: new Date().toISOString(),
    filename: path.basename(backupFile),
    sizeBytes: stats.size,
    sha256: hashSum,
    generator: 'Stech CRM Database Backup Utility v1.0',
  };

  fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2), 'utf8');

  console.log('Backup generated successfully:');
  console.log(` - File: ${backupFile} (${(stats.size / 1024).toFixed(2)} KB)`);
  console.log(` - SHA-256: ${hashSum}`);
  console.log(` - Metadata: ${metadataFile}`);
} catch (err) {
  console.error('Backup failed:', err.message);
  process.exit(1);
}
