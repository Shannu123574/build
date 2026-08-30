import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { schemaSql } from './schema.ts';
import fs from 'fs';
import path from 'path';

let dbInstance: Database | null = null;

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  const dbDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const isTest = process.env.NODE_ENV === 'test';
  
  dbInstance = await open({
    filename: isTest ? ':memory:' : path.join(dbDir, 'recoveros.sqlite'),
    driver: sqlite3.Database
  });

  await dbInstance.exec(schemaSql);
    if (isTest) {
      // initialize ledger genesis root if empty
      const genesis = await dbInstance.get('SELECT * FROM audit_ledger WHERE event_type = ?', ['SYSTEM_GENESIS']);
      if (!genesis) {
        await dbInstance.run(
          'INSERT INTO audit_ledger (hash, previous_hash, event_type, timestamp) VALUES (?, ?, ?, ?)',
          ['0000000000000000000000000000000000000000000000000000000000000000', '0000000000000000000000000000000000000000000000000000000000000000', 'SYSTEM_GENESIS', Date.now()]
        );
      }
    } else {
      const genesis = await dbInstance.get('SELECT * FROM audit_ledger WHERE event_type = ?', ['SYSTEM_GENESIS']);
      if (!genesis) {
        await dbInstance.run(
          'INSERT INTO audit_ledger (hash, previous_hash, event_type, timestamp) VALUES (?, ?, ?, ?)',
          ['0000000000000000000000000000000000000000000000000000000000000000', '0000000000000000000000000000000000000000000000000000000000000000', 'SYSTEM_GENESIS', Date.now()]
        );
      }
    }

  return dbInstance;
}

export async function clearDbForTesting() {
  if (dbInstance) {
    await dbInstance.exec(`
      DELETE FROM webhook_events;
      DELETE FROM incidents;
      DELETE FROM policy_decisions;
      DELETE FROM actions;
      DELETE FROM audit_ledger;
      DELETE FROM customer_limits;
    `);
    await dbInstance.run(
      'INSERT INTO audit_ledger (hash, previous_hash, event_type, timestamp) VALUES (?, ?, ?, ?)',
      ['0000000000000000000000000000000000000000000000000000000000000000', '0000000000000000000000000000000000000000000000000000000000000000', 'SYSTEM_GENESIS', Date.now()]
    );
  }
}
