import { SQLiteDatabase } from "expo-sqlite";

export interface Bookmark {
  id: number;
  division_id: number;
  division_name: string;
  created_at: string;
}

export interface BookmarkedBook {
  book_id: number;
  book_name: string;
  count: number;
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

export async function getBookmarksForBook(db: SQLiteDatabase, bookId: number): Promise<Bookmark[]> {
  return await db.getAllAsync<Bookmark>(
    `SELECT bm.id, bm.division_id, bm.division_name, bm.created_at
     FROM bookmarks bm
     JOIN divisions d ON d.id = bm.division_id
     WHERE d.book_id = ?
     ORDER BY d.sequence ASC`,
    [bookId],
  );
}

export async function getBookmarkedBooks(db: SQLiteDatabase): Promise<BookmarkedBook[]> {
  return await db.getAllAsync<BookmarkedBook>(
    `SELECT b.id as book_id, b.name as book_name, COUNT(*) as count
     FROM bookmarks bm
     JOIN divisions d ON d.id = bm.division_id
     JOIN books b ON b.id = d.book_id
     GROUP BY b.id, b.name
     ORDER BY b.id ASC`,
  );
}

export async function clearAllBookmarks(db: SQLiteDatabase): Promise<void> {
  await db.runAsync(`DELETE FROM bookmarks`);
}