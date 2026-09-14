const sqlite3 = require("better-sqlite3");
const db = sqlite3("assets/database/vedabase_new.db");

console.log("Books:", db.prepare("SELECT id, name FROM books ORDER BY id").all());

// Find NBS book_id, then look at its chapter/verse structure
const nbs = db.prepare("SELECT id FROM books WHERE name LIKE '%NBS%' OR name LIKE '%Narada%'").get();
if (nbs) {
  console.log("\nNBS book_id:", nbs.id);
  const root = db.prepare("SELECT id FROM divisions WHERE book_id = ? AND parent_id IS NULL").get(nbs.id);
  const chapters = db.prepare("SELECT id, name FROM divisions WHERE parent_id = ? ORDER BY sequence").all(root.id);
  console.log("Chapters:", chapters);

  if (chapters.length > 0) {
    const verses = db.prepare("SELECT id, name FROM divisions WHERE parent_id = ? ORDER BY sequence").all(chapters[0].id);
    console.log(`\nVerses under chapter "${chapters[0].name}":`, verses.map(v => v.name));
    if (chapters.length > 1) {
      const verses2 = db.prepare("SELECT id, name FROM divisions WHERE parent_id = ? ORDER BY sequence").all(chapters[1].id);
      console.log(`\nVerses under chapter "${chapters[1].name}":`, verses2.map(v => v.name));
    }
  }
}

db.close();