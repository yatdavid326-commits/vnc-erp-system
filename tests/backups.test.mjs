import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const workflowUrl = new URL('../.github/workflows/supabase-backup.yml', import.meta.url);

test('scheduled Supabase backup is encrypted and retained briefly', () => {
  const source = readFileSync(workflowUrl, 'utf8');
  assert.match(source, /cron:\s*['"]15 3 \* \* \*['"]/);
  assert.match(source, /environment:\s*\[staging, operations\]/);
  assert.match(source, /environment:\s*\$\{\{\s*matrix\.environment\s*\}\}/);
  assert.match(source, /postgresql-client-17/);
  assert.match(source, /pg_dump --format=custom --no-owner --no-acl/);
  assert.match(source, /aes-256-cbc -pbkdf2/);
  assert.match(source, /retention-days:\s*30/);
  assert.match(source, /BACKUP_ENVIRONMENT: \$\{\{ matrix\.environment \}\}/);
  assert.match(source, /vnc-erp-\$\{BACKUP_ENVIRONMENT\}-\$\{stamp\}/);
  assert.doesNotMatch(source, /postgres(?:ql)?:\/\/[^${\s]+:[^@]+@/i);
});

test('backup secrets are validated before database export', () => {
  const source = readFileSync(workflowUrl, 'utf8');
  assert.match(source, /SUPABASE_DB_CONNECTION_STRING: \$\{\{ secrets\.SUPABASE_DB_CONNECTION_STRING \}\}/);
  assert.match(source, /BACKUP_ENCRYPTION_PASSWORD: \$\{\{ secrets\.BACKUP_ENCRYPTION_PASSWORD \}\}/);
  assert.match(source, /test -n "\$SUPABASE_DB_CONNECTION_STRING"/);
  assert.match(source, /test -n "\$BACKUP_ENCRYPTION_PASSWORD"/);
  assert.match(source, /trap 'rm -f -- "\$backup"' EXIT/);
});
