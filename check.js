const sqlite3 = require("better-sqlite3");
const path = require("path");
const db = sqlite3(path.join(__dirname, "assets", "database", "vedabase_new.db"));

function showRaw(bookId, label, divisionName) {
  const row = db.prepare(
    `SELECT v.content FROM verse v
     JOIN divisions d ON d.id = v.division_id
     WHERE d.book_id = ? AND d.name = ?
     LIMIT 1`
  ).get(bookId, divisionName);
  console.log(`\n===== ${label} =====`);
  if (!row) { console.log("NOT FOUND"); return; }
  console.log(JSON.stringify(row.content).slice(0, 500));
}

showRaw(1, "BG 1.1", "1");
showRaw(9, "SB 1.1.1", "1");
showRaw(2, "BS (chapter 1 first verse)", "1");
showRaw(12, "TQK (first verse)", "1");

db.close();