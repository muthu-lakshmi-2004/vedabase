const sqlite3 = require('better-sqlite3');
const db = sqlite3('./assets/database/vedabase_new.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log(tables);
db.close();