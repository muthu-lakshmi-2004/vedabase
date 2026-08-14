const sqlite3 = require("better-sqlite3");
const path = require("path");
const db = sqlite3(path.join(__dirname, "assets", "database", "vedabase_new.db"));

function showRaw(bookId, label, nameFilter) {
  const row = db.prepare(
    `SELECT v.content, d.name FROM verse v
     JOIN divisions d ON d.id = v.division_id
     WHERE d.book_id = ? AND d.name LIKE ?
     LIMIT 1`
  ).get(bookId, nameFilter);
  console.log(`\n===== ${label} =====`);
  if (!row) { console.log("NOT FOUND"); return; }
  console.log("division name:", row.name);
  console.log(JSON.stringify(row.content).slice(0, 2500));
}

showRaw(10, "TLC (chapter 1)", "1");
showRaw(11, "TLK (chapter 2 verse 2)", "2");
showRaw(7, "NoD (chapter 1)", "1");

db.close();