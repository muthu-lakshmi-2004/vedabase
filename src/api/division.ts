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
export async function getSiblingDivisions(
  db: SQLiteDatabase,
  divisionId: number,
): Promise<Division[]> {
  const current = await db.getFirstAsync<Division>(
    `SELECT * FROM divisions WHERE id = ?`,
    [divisionId],
  );
  if (!current) return [];

  return await db.getAllAsync<Division>(
    `SELECT d.id, d.book_id, d.parent_id, d.sequence,
            COALESCE(v.title, d.name) as name
     FROM divisions d
     LEFT JOIN verse v ON v.division_id = d.id
     WHERE d.parent_id = ?
     ORDER BY d.sequence ASC`,
    [current.parent_id],
  );
}
export async function getNextChapterStart(
  db: SQLiteDatabase,
  divisionId: number,
): Promise<{ divisionId: number; chapterName: string } | null> {
  const current = await db.getFirstAsync<{ id: number; parent_id: number | null }>(
    `SELECT id, parent_id FROM divisions WHERE id = ?`,
    [divisionId],
  );
  if (!current || !current.parent_id) return null;

  const parent = await db.getFirstAsync<{
    id: number;
    parent_id: number | null;
    sequence: number;
  }>(`SELECT id, parent_id, sequence FROM divisions WHERE id = ?`, [current.parent_id]);
  if (!parent || !parent.parent_id) return null;

  const nextChapter = await db.getFirstAsync<{ id: number; name: string }>(
    `SELECT id, name FROM divisions WHERE parent_id = ? AND sequence > ? ORDER BY sequence ASC LIMIT 1`,
    [parent.parent_id, parent.sequence],
  );
  if (!nextChapter) return null;

  // Drill down to the first actual leaf verse under the next chapter
  // (handles nested structures like CC: chapter -> summary/verses)
  let nodeId = nextChapter.id;
  for (let depth = 0; depth < 6; depth++) {
    const children = await db.getAllAsync<{ id: number }>(
      `SELECT id FROM divisions WHERE parent_id = ? ORDER BY sequence ASC LIMIT 1`,
      [nodeId],
    );
    if (children.length === 0) break;
    nodeId = children[0].id;
  }

  return { divisionId: nodeId, chapterName: nextChapter.name };
}