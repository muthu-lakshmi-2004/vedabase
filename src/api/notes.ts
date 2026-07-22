import { SQLiteDatabase } from "expo-sqlite";

export interface Note {
  division_id: number;
  content: string;
  updated_at: string;
}

export async function getNote(db: SQLiteDatabase, divisionId: number): Promise<string> {
  const row = await db.getFirstAsync<Note>(
    `SELECT * FROM notes WHERE division_id = ?`,
    [divisionId],
  );
  return row?.content ?? "";
}

export async function saveNote(db: SQLiteDatabase, divisionId: number, content: string): Promise<void> {
  if (content.trim() === "") {
    await db.runAsync(`DELETE FROM notes WHERE division_id = ?`, [divisionId]);
    return;
  }
  await db.runAsync(
    `INSERT INTO notes (division_id, content, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(division_id) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at`,
    [divisionId, content],
  );
}