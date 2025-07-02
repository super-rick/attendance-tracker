import Database from "better-sqlite3"
import path from "path"
const os = require('os');

const dbPath = path.join(os.homedir(), "data", "attendance.db")

// 确保数据目录存在
import fs from "fs"
const dataDir = path.dirname(dbPath)
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

let db: Database.Database

function tableExists(tableName: string): boolean {
  const stmt = db.prepare(`
    SELECT 1 FROM sqlite_master 
    WHERE type='table' AND name=?
  `);
  return stmt.get(tableName) !== undefined;
}

function getDatabase() {
  if (db) {
    return db
  }

  console.log("dbPath:" + dbPath)
  db = new Database(dbPath)

  if (!tableExists("records")) {
    // 创建表
    db.exec(`
      CREATE TABLE IF NOT EXISTS records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        names TEXT NOT NULL,
        date TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('overtime', 'leave')),
        duration TEXT NOT NULL DEFAULT 'full' CHECK (duration IN ('full', 'morning', 'afternoon')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
  }
    
  return db
}

export interface RecordData {
  id?: number
  names: string[]
  date: string
  type: "overtime" | "leave"
  duration: "full" | "morning" | "afternoon"
  created_at?: string
}

export class SQLiteService {
  private db: Database.Database

  constructor() {
    this.db = getDatabase()
  }

  getAllRecords(): RecordData[] {
    const stmt = this.db.prepare("SELECT * FROM records ORDER BY created_at DESC")
    const rows = stmt.all() as any[]

    return rows.map((row) => ({
      id: row.id,
      names: JSON.parse(row.names),
      date: row.date,
      type: row.type,
      duration: row.duration,
      created_at: row.created_at,
    }))
  }

  createRecord(record: Omit<RecordData, "id" | "created_at">): RecordData {
    const stmt = this.db.prepare(`
      INSERT INTO records (names, date, type, duration)
      VALUES (?, ?, ?, ?)
    `)

    const result = stmt.run(JSON.stringify(record.names), record.date, record.type, record.duration)

    const newRecord = this.getRecordById(result.lastInsertRowid as number)
    if (!newRecord) {
      throw new Error("Failed to create record")
    }

    return newRecord
  }

  deleteRecord(id: number): boolean {
    const stmt = this.db.prepare("DELETE FROM records WHERE id = ?")
    const result = stmt.run(id)
    return result.changes > 0
  }

  private getRecordById(id: number): RecordData | null {
    const stmt = this.db.prepare("SELECT * FROM records WHERE id = ?")
    const row = stmt.get(id) as any

    if (!row) return null

    return {
      id: row.id,
      names: JSON.parse(row.names),
      date: row.date,
      type: row.type,
      duration: row.duration,
      created_at: row.created_at,
    }
  }

  close() {
    if (this.db) {
      this.db.close()
    }
  }
}

export default SQLiteService
