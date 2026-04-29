const sqlite3 = require("better-sqlite3");
const db = sqlite3("./assets/database/vedabase_new.db");

const v = db.prepare(`SELECT * FROM verse WHERE division_id = 5 LIMIT 2`).all();
console.log(JSON.stringify(v, null, 2));

db.close();
