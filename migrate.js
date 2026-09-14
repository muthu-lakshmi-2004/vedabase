const cheerio = require("cheerio");
const sqlite3 = require("better-sqlite3");

const sourceDb = sqlite3("D:/vedabase_dababase/vedabase.db");
const appDb = sqlite3("assets/database/vedabase_new.db");

try { appDb.exec(`ALTER TABLE verse ADD COLUMN mantra_text TEXT;`); } catch (e) {}
try { appDb.exec(`ALTER TABLE verse ADD COLUMN synonyms_json TEXT;`); } catch (e) {}
try { appDb.exec(`ALTER TABLE verse ADD COLUMN translation_text TEXT;`); } catch (e) {}
try { appDb.exec(`ALTER TABLE verse ADD COLUMN purport_text TEXT;`); } catch (e) {}

// ---- Book prefix -> your app's book_id (confirm these against your `books` table) ----
const BOOK_MAP = [
  { prefix: /^Bhagavad-gita As It Is/i, bookId: 1 },
  { prefix: /^Sri Brahma-samhita/i, bookId: 2 },
  { prefix: /^Sri Caitanya Caritamrta/i, bookId: 3 },
  { prefix: /^Sri Isopanisad/i, bookId: 4 },
  { prefix: /^Mukunda-mala-stotra/i, bookId: 5 }, // adjust if MM = something else
  { prefix: /^Narada Bhakti Sutra/i, bookId: 6 },
  { prefix: /^Nectar of Devotion/i, bookId: 7 },
  { prefix: /^The Nectar of Instruction/i, bookId: 8 },
  { prefix: /^Srimad Bhagavatam/i, bookId: 9 },
  { prefix: /^Teachings of Lord Caitanya/i, bookId: 10 },
  { prefix: /^TLK/i, bookId: 11 },
  { prefix: /^Teachings of Lord Kapila/i, bookId: 11 },
  { prefix: /^Teachings of Queen Kunti/i, bookId: 12 },
  { prefix: /^Krsna Book/i, bookId: 13 },
  { prefix: /^KB /i, bookId: 13 },
];

function findBookId(title) {
  for (const b of BOOK_MAP) {
    if (b.prefix.test(title)) return b.bookId;
  }
  return null;
}

// ---- Locate the division_id in YOUR app's divisions tree for a given title ----
function findDivisionId(bookId, title) {
  const root = appDb
    .prepare(`SELECT id FROM divisions WHERE book_id = ? AND parent_id IS NULL LIMIT 1`)
    .get(bookId);
  if (!root) return null;

  // SB: "Srimad Bhagavatam Canto 4 Chapter 3 Verse 3" (or "Verses 5-7")
  let m = title.match(/Canto\s+(\d+)\s+Chapter\s+(\d+)\s+Verses?\s+([\d\-]+)/i);
  if (m) return walk(root.id, [m[1], m[2], m[3]]);

  // CC: "Sri Caitanya Caritamrta Adi-lila Chapter 1 Verse 3"
  m = title.match(/(Adi|Madhya|Antya)-lila\s+Chapter\s+(\d+)\s+Verses?\s+([\d\-]+)/i);
  if (m) return walk(root.id, [m[1].toLowerCase(), m[2], m[3]]);

  // BG / BS / Iso / NBS: "... Chapter 1 Verse 1" (2-level: chapter, verse)
  m = title.match(/Chapter\s+(\d+)\s+Verses?\s+([\d\-]+)/i);
  if (m) return walk(root.id, [m[1], m[2]]);

  // TQK / TLK / MM style: "... Text 3" (single number, no chapter)
  m = title.match(/\bText\s+([\d\-]+)\s*$/i);
  if (m) return walk(root.id, [m[1]]);

  // Iso invocation / single-number verse books
  m = title.match(/Verse\s+([\d\-]+)\s*$/i);
  if (m) return walk(root.id, [m[1]]);

  // Preface / Introduction / Foreword / Dedication / Conclusion
  m = title.match(/,\s*(Preface|Introduction|Foreword|Dedication|Conclusion|Prologue|Mission)\s*$/i);
  if (m) return walk(root.id, [m[1].toLowerCase()]);
  m = title.match(/\b(Preface|Introduction|Foreword|Dedication|Conclusion|Prologue|Mission)\s*$/i);
  if (m) return walk(root.id, [m[1].toLowerCase()]);

  return null;
}

// Walk down the tree matching each path segment against a child's `name`
function walk(startId, path) {
  let current = startId;
  for (const segment of path) {
    const children = appDb
      .prepare(`SELECT id, name FROM divisions WHERE parent_id = ?`)
      .all(current);
    const match = children.find(
      (c) => c.name.toLowerCase() === String(segment).toLowerCase(),
    );
    if (!match) return null;
    current = match.id;
  }
  return current;
}

// ---- Main migration loop ----
const rows = sourceDb.prepare(`SELECT title, content FROM verse`).all();
console.log(`Source rows: ${rows.length}`);

let updated = 0;
let skipped = 0;
const skipLog = [];

for (const row of rows) {
  const bookId = findBookId(row.title);
  if (!bookId) {
    skipped++;
    continue;
  }

  const divisionId = findDivisionId(bookId, row.title);
  if (!divisionId) {
    skipped++;
    if (skipLog.length < 30) skipLog.push(row.title);
    continue;
  }

  const $ = cheerio.load(row.content);

  const mantraLines = [];
  $(".prelude .foreign, .odd-line .foreign, .even-line .foreign").each((i, el) => {
    mantraLines.push($(el).text().trim());
  });
  const mantraText = mantraLines.join("\n");

  const synonyms = [];
  $(".synonym").each((i, el) => {
    const word = $(el).find(".word .foreign").text().trim();
    const meaning = $(el).find(".meaning").text().trim();
    if (word && meaning) synonyms.push({ word, meaning });
  });

  const translationText = $(".translation .paragraph").text().trim();

  const purportParas = [];
  $(".purport .paragraph").each((i, el) => {
    purportParas.push($(el).text().trim());
  });
  const purportText = purportParas.join("\n\n");

  // Only write if we actually have SOMETHING structured; otherwise leave existing content alone
  if (!mantraText && !translationText && !purportText) {
    skipped++;
    continue;
  }

  appDb
    .prepare(
      `UPDATE verse SET mantra_text = ?, synonyms_json = ?, translation_text = ?, purport_text = ?
       WHERE division_id = ?`,
    )
    .run(mantraText, JSON.stringify(synonyms), translationText, purportText, divisionId);

  updated++;
}

console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}`);
console.log("\nSample skipped titles (first 30):");
console.log(skipLog.join("\n"));

sourceDb.close();
appDb.close();