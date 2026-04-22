import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';

const DB_NAME = 'vedabase_new.db';

export async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  const dbFolder = `${FileSystem.documentDirectory}SQLite`;
  const dbPath = `${dbFolder}/${DB_NAME}`;

  const folderInfo = await FileSystem.getInfoAsync(dbFolder);
  if (!folderInfo.exists) {
    await FileSystem.makeDirectoryAsync(dbFolder, { intermediates: true });
  }

  const dbInfo = await FileSystem.getInfoAsync(dbPath);
  if (!dbInfo.exists) {
    console.log('DB copying from assets...');
    const asset = Asset.fromModule(require('../../assets/database/vedabase_new.db'));
    
    // downloadAsync() illama direct localUri use pannunga
    await asset.downloadAsync();
    
    const uri = asset.localUri ?? asset.uri;
    
    await FileSystem.copyAsync({
      from: uri,
      to: dbPath,
    });
    console.log('DB copy done!');
  }

  return SQLite.openDatabaseAsync(DB_NAME);
}