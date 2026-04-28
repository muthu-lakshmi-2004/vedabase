import { SQLiteDatabase } from "expo-sqlite";
import { Division } from "../types";

export async function getDivisionsByBook(
  db: SQLiteDatabase,
  bookId: number,
): Promise<Division[]> {
  return await db.getAllAsync<Division>(
    "SELECT * FROM divisions WHERE book_id = ? AND parent_id IS NULL ORDER BY sequence ASC",
    [bookId],
  );
}
