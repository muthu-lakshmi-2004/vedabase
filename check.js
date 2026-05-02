const sqlite3 = require("better-sqlite3");
const db = sqlite3("./assets/database/vedabase_new.db");

const v = db
  .prepare(
    `
  SELECT id, title, substr(content, 1, 400) as preview 
  FROM verse 
  LIMIT 10
`,
  )
  .all();

console.log(JSON.stringify(v, null, 2));
