import { SQLiteDatabase } from 'expo-sqlite';
import { Book } from '../types';

export async function getAllBooks(db: SQLiteDatabase): Promise<Book[]> {
  return await db.getAllAsync<Book>(
    'SELECT * FROM books ORDER BY id ASC'
  );
}

export async function getBookById(db: SQLiteDatabase, id: number): Promise<Book | null> {
  return await db.getFirstAsync<Book>(
    'SELECT * FROM books WHERE id = ?', [id]
  );
}