import initSqlJs, { Database } from 'sql.js'
import path from 'path'
import fs from 'fs'

const DB_PATH = path.join(__dirname, '../../data/panel.db')

let db: Database = null as any

export async function initializeDatabase(): Promise<void> {
  // Create data directory if it doesn't exist
  const dataDir = path.join(__dirname, '../../data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  const SQL = await initSqlJs()

  // Load existing database from disk, or create new one
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }

  // Save database to disk on every change
  db.run('PRAGMA foreign_keys = ON')

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      username TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS servers (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'vanilla',
      version TEXT NOT NULL DEFAULT '1.20.4',
      port INTEGER NOT NULL,
      memory_mb INTEGER NOT NULL DEFAULT 1024,
      status TEXT NOT NULL DEFAULT 'stopped',
      container_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)

  // Save to disk
  saveDatabase()

  console.log('✅ Database initialized')
}

// Save database to disk after every write
export function saveDatabase(): void {
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(DB_PATH, buffer)
}

// Helper: run a write query (INSERT, UPDATE, DELETE)
export function dbRun(sql: string, params: any[] = []): void {
  db.run(sql, params)
  saveDatabase()
}

// Helper: get one row
export function dbGet(sql: string, params: any[] = []): any {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  if (stmt.step()) {
    const row = stmt.getAsObject()
    stmt.free()
    return row
  }
  stmt.free()
  return null
}

// Helper: get multiple rows
export function dbAll(sql: string, params: any[] = []): any[] {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const rows: any[] = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject())
  }
  stmt.free()
  return rows
}

export default db