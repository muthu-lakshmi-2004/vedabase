import { SQLiteDatabase } from "expo-sqlite";
import { Verse } from "../types";

export async function getVersesByDivision(
  db: SQLiteDatabase,
  divisionId: number,
): Promise<Verse[]> {
  return await db.getAllAsync<Verse>(
    "SELECT * FROM verse WHERE division_id = ? ORDER BY sequence ASC",
    [divisionId],
  );
}
