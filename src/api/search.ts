import { SQLiteDatabase } from "expo-sqlite";

export interface BookSearchResult {
  division_id: number;
  division_name: string;
  breadcrumb: string;
  snippet: string;
}

function makeSnippet(content: string, query: string): string {
  const lower = content.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return content.slice(0, 100) + "...";
  const start = Math.max(0, idx - 30);
  const end = Math.min(content.length, idx + query.length + 60);
  return (start > 0 ? "..." : "") + content.slice(start, end).trim() + "...";
}

export async function searchWithinBook(
  db: SQLiteDatabase,
  bookId: number,
  query: string,
  limit: number = 30,
): Promise<BookSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const rows = await db.getAllAsync<{
    division_id: number;
    leaf_name: string;
    content: string;
  }>(
    `SELECT d.id as division_id, d.name as leaf_name, v.content
     FROM verse v
     JOIN divisions d ON d.id = v.division_id
     WHERE d.book_id = ? AND v.content LIKE ?
     ORDER BY d.sequence ASC
     LIMIT ?`,
    [bookId, `%${trimmed}%`, limit],
  );

  const results: BookSearchResult[] = [];

  for (const row of rows) {
    const ancestors = await db.getAllAsync<{
      id: number;
      name: string;
      parent_id: number | null;
    }>(
      `WITH RECURSIVE ancestors(id, name, parent_id) AS (
         SELECT id, name, parent_id FROM divisions WHERE id = ?
         UNION ALL
         SELECT d.id, d.name, d.parent_id FROM divisions d
         JOIN ancestors a ON d.id = a.parent_id
       )
       SELECT * FROM ancestors`,
      [row.division_id],
    );

    // ancestors[0] = leaf (verse) itself, last = book root ("index") — drop the root
    const chain = ancestors.slice(0, -1).reverse().map((a) => a.name);

    let breadcrumb: string;
    if (chain.length >= 2) {
      const verseLabel = chain[chain.length - 1];
      const chapterPart = chain.slice(0, -1).join(" ");
      breadcrumb = `Chapter ${chapterPart}, Verse ${verseLabel}`;
    } else if (chain.length === 1) {
      breadcrumb = `Verse ${chain[0]}`;
    } else {
      breadcrumb = row.leaf_name;
    }

    results.push({
      division_id: row.division_id,
      division_name: row.leaf_name,
      breadcrumb,
      snippet: makeSnippet(row.content, trimmed),
    });
  }

  return results;
}