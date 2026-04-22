const Database = require('better-sqlite3');
const fs = require('fs');

const OLD_DB = 'D:\\Pocket Vedas.apk.jadx\\resources\\assets\\raw\\vedabase.db';
const NEW_DB = 'D:\\vedabase\\database\\vedabase_new.db';

// Old DB open
const oldDb = new Database(OLD_DB, { readonly: true });

// New DB - fresh start
if (fs.existsSync(NEW_DB)) fs.unlinkSync(NEW_DB);
const newDb = new Database(NEW_DB);

// HTML strip
function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<A[^>]*HREF="veda:[^"]*"[^>]*>.*?<\/A>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

// Tables create
newDb.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = OFF;

  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS divisions (
    id INTEGER PRIMARY KEY,
    book_id INTEGER NOT NULL,
    parent_id INTEGER,
    name TEXT NOT NULL,
    sequence INTEGER DEFAULT 0,
    FOREIGN KEY (book_id) REFERENCES books(id),
    FOREIGN KEY (parent_id) REFERENCES divisions(id)
  );

  CREATE TABLE IF NOT EXISTS verse (
    id INTEGER PRIMARY KEY,
    division_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    title TEXT,
    sequence INTEGER DEFAULT 0,
    FOREIGN KEY (division_id) REFERENCES divisions(id)
  );

  CREATE INDEX IF NOT EXISTS idx_divisions_book ON divisions(book_id);
  CREATE INDEX IF NOT EXISTS idx_divisions_parent ON divisions(parent_id);
  CREATE INDEX IF NOT EXISTS idx_verse_division ON verse(division_id);
`);

// ✅ Books migrate
console.log('📚 Books migrating...');
const books = oldDb.prepare('SELECT rowid, * FROM book').all();
const insertBook = newDb.prepare('INSERT OR IGNORE INTO books (id, name) VALUES (?, ?)');
const bookTx = newDb.transaction(() => {
  books.forEach(b => insertBook.run(b.rowid, b.name));
});
bookTx();
console.log(`✅ ${books.length} books done!`);

// ✅ Divisions migrate
console.log('📂 Divisions migrating...');
const divisions = oldDb.prepare('SELECT rowid, * FROM division').all();
const insertDiv = newDb.prepare(`
  INSERT OR IGNORE INTO divisions (id, book_id, parent_id, name, sequence)
  VALUES (?, ?, ?, ?, ?)
`);
const divTx = newDb.transaction(() => {
  divisions.forEach(d => {
    // parent 0 = root level, NULL store பண்ணணும்
    const parentId = d.parent === 0 ? null : d.parent;
    insertDiv.run(d.rowid, d.book, parentId, d.name, d.sequence);
  });
});
divTx();
console.log(`✅ ${divisions.length} divisions done!`);

// ✅ Verse migrate - verse.rowid = division.rowid (1-to-1 mapping)
console.log('📝 Verse migrating...');
const verses = oldDb.prepare('SELECT rowid, * FROM verse').all();
const insertVerse = newDb.prepare(`
  INSERT OR IGNORE INTO verse (id, division_id, content, title, sequence)
  VALUES (?, ?, ?, ?, ?)
`);

let count = 0;
let skipped = 0;

const verseTx = newDb.transaction(() => {
  verses.forEach(v => {
    const cleanContent = stripHtml(v.content);
    const cleanTitle = v.title ? stripHtml(v.title) : null;

    if (cleanContent && cleanContent.length > 5) {
      // verse.rowid = division.rowid → division_id = v.rowid
      insertVerse.run(v.rowid, v.rowid, cleanContent, cleanTitle, 0);
      count++;
      if (count % 5000 === 0) console.log(`  ⏳ ${count} verses done...`);
    } else {
      skipped++;
    }
  });
});
verseTx();

console.log(`✅ ${count} verses inserted!`);
console.log(`⚠️  ${skipped} verses skipped (empty content)`);

// ✅ Final verification
const bookCount = newDb.prepare('SELECT COUNT(*) as c FROM books').get();
const divCount = newDb.prepare('SELECT COUNT(*) as c FROM divisions').get();
const verseCount = newDb.prepare('SELECT COUNT(*) as c FROM verse').get();

console.log('\n📊 Final Count:');
console.log(`   Books    : ${bookCount.c}`);
console.log(`   Divisions: ${divCount.c}`);
console.log(`   Verses   : ${verseCount.c}`);

// ✅ Sample - BG preface verify
const sample = newDb.prepare(`
  SELECT v.id, v.title, d.name as division_name, b.name as book_name,
         SUBSTR(v.content, 1, 120) as preview
  FROM verse v
  JOIN divisions d ON d.id = v.division_id
  JOIN books b ON b.id = d.book_id
  LIMIT 3
`).all();

console.log('\n🔍 Sample verify:');
sample.forEach(s => {
  console.log(`\n   Book: ${s.book_name} | Division: ${s.division_name}`);
  console.log(`   Title: ${s.title}`);
  console.log(`   Preview: ${s.preview}...`);
});

oldDb.close();
newDb.close();
console.log('\n🎉 Migration complete! vedabase_new.db ready!');