import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';

const DB_NAME = 'vedabase_new.db';
const DB_VERSION = 2; // <-- increment this number every time you run migrate.js

export async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  const dbFolder = `${FileSystem.documentDirectory}SQLite`;
  const dbPath = `${dbFolder}/${DB_NAME}`;
  const versionPath = `${dbFolder}/db_version.txt`;

  console.log("[DB] Step 0: dbFolder =", dbFolder);

  const folderInfo = await FileSystem.getInfoAsync(dbFolder);
  if (!folderInfo.exists) {
    await FileSystem.makeDirectoryAsync(dbFolder, { intermediates: true });
  }
  console.log("[DB] Step 0b: folder ready");

  let currentVersion = 0;
  const versionInfo = await FileSystem.getInfoAsync(versionPath);
  if (versionInfo.exists) {
    const v = await FileSystem.readAsStringAsync(versionPath);
    currentVersion = parseInt(v, 10) || 0;
  }
  console.log("[DB] Step 0c: currentVersion =", currentVersion, "target =", DB_VERSION);

  const dbInfo = await FileSystem.getInfoAsync(dbPath);
  console.log("[DB] Step 0d: dbInfo.exists =", dbInfo.exists);

  if (!dbInfo.exists || currentVersion < DB_VERSION) {
    console.log("[DB] Step 1: require asset module...");
    const asset = Asset.fromModule(require("../../assets/database/vedabase_new.db"));
    console.log("[DB] Step 2: asset created, uri =", asset.uri, "name =", asset.name, "type =", asset.type);

    console.log("[DB] Step 3: calling downloadAsync()...");
    await asset.downloadAsync();
    console.log("[DB] Step 4: downloadAsync() finished. localUri =", asset.localUri);

    const uri = asset.localUri ?? asset.uri;
    console.log("[DB] Step 5: copying from", uri, "to", dbPath);
    await FileSystem.copyAsync({ from: uri, to: dbPath });
    console.log("[DB] Step 6: copy finished!");

    await FileSystem.writeAsStringAsync(versionPath, String(DB_VERSION));
    console.log("[DB] Step 7: version file written");
  }

  console.log("[DB] Step 8: opening SQLite database...");
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  console.log("[DB] Step 9: SQLite database opened!");

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      division_id INTEGER NOT NULL UNIQUE,
      division_name TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS notes (
      division_id INTEGER PRIMARY KEY,
      content TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log("[DB] Step 10: tables ready, returning db");
  return db;
}