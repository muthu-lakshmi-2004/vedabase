import { SQLiteDatabase } from "expo-sqlite";

export interface SearchResult {
  division_id: number;
  division_name: string;
  book_id: number;
  book_name: string;
  snippet: string;
}

function makeSnippet(content: string, query: string): string {
  const lower = content.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return content.slice(0, 120) + "...";
  const start = Math.max(0, idx - 40);
  const end = Math.min(content.length, idx + query.length + 80);
  return (start > 0 ? "..." : "") + content.slice(start, end).trim() + "...";
}

export async function searchVerses(
  db: SQLiteDatabase,
  query: string,
  limit: number = 50,
): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const rows = await db.getAllAsync<{
    division_id: number;
    division_name: string;
    book_id: number;
    book_name: string;
    content: string;
  }>(
    `SELECT d.id as division_id, d.name as division_name, b.id as book_id, b.name as book_name, v.content
     FROM verse v
     JOIN divisions d ON d.id = v.division_id
     JOIN books b ON b.id = d.book_id
     WHERE v.content LIKE ?
     ORDER BY b.id ASC, d.sequence ASC
     LIMIT ?`,
    [`%${trimmed}%`, limit],
  );

  return rows.map((r) => ({
    division_id: r.division_id,
    division_name: r.division_name,
    book_id: r.book_id,
    book_name: r.book_name,
    snippet: makeSnippet(r.content, trimmed),
  }));
}