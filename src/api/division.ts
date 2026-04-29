import { SQLiteDatabase } from "expo-sqlite";
import { Division } from "../types";

export async function getDivisionsByBook(
  db: SQLiteDatabase,
  bookId: number,
): Promise<Division[]> {
  const root = await db.getFirstAsync<Division>(
    `SELECT * FROM divisions WHERE book_id = ? AND parent_id IS NULL LIMIT 1`,
    [bookId],
  );
  if (!root) return [];

  return await db.getAllAsync<Division>(
    `SELECT d.id, d.book_id, d.parent_id, d.sequence,
            COALESCE(v.title, d.name) as name
     FROM divisions d
     LEFT JOIN verse v ON v.division_id = d.id
     WHERE d.book_id = ? AND d.parent_id = ?
     ORDER BY d.sequence ASC`,
    [bookId, root.id],
  );
}

export async function getVerseListByDivision(
  db: SQLiteDatabase,
  divisionId: number,
): Promise<Division[]> {
  return await db.getAllAsync<Division>(
    `SELECT d.id, d.book_id, d.parent_id, d.sequence,
            COALESCE(v.title, d.name) as name
     FROM divisions d
     LEFT JOIN verse v ON v.division_id = d.id
     WHERE d.parent_id = ?
     ORDER BY d.sequence ASC`,
    [divisionId],
  );
}
