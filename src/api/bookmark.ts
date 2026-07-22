import { SQLiteDatabase } from "expo-sqlite";

export interface Bookmark {
  id: number;
  division_id: number;
  division_name: string;
  created_at: string;
}

export async function isBookmarked(db: SQLiteDatabase, divisionId: number): Promise<boolean> {
  const row = await db.getFirstAsync(`SELECT id FROM bookmarks WHERE division_id = ?`, [divisionId]);
  return !!row;
}

export async function addBookmark(db: SQLiteDatabase, divisionId: number, divisionName: string): Promise<void> {
  await db.runAsync(
    `INSERT OR IGNORE INTO bookmarks (division_id, division_name) VALUES (?, ?)`,
    [divisionId, divisionName],
  );
}

export async function removeBookmark(db: SQLiteDatabase, divisionId: number): Promise<void> {
  await db.runAsync(`DELETE FROM bookmarks WHERE division_id = ?`, [divisionId]);
}

export async function getAllBookmarks(db: SQLiteDatabase): Promise<Bookmark[]> {
  return await db.getAllAsync<Bookmark>(`SELECT * FROM bookmarks ORDER BY created_at DESC`);
}