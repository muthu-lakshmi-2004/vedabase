import { createContext, useContext } from "react";
import { SQLiteDatabase } from "expo-sqlite";

const DatabaseContext = createContext<SQLiteDatabase | null>(null);

export const DatabaseProvider = DatabaseContext.Provider;

export function useDatabase(): SQLiteDatabase {
  const db = useContext(DatabaseContext);
  if (!db) throw new Error("DB not ready");
  return db;
}
