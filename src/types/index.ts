export interface Book {
  id: number;
  name: string;
  image: string;
}

export interface Division {
  id: number;
  book_id: number;
  parent_id: number | null;
  name: string;
  sequence: number;
}

export interface Verse {
  id: number;
  division_id: number;
  content: string;              // kept for search.ts (LIKE queries + snippets)
  title: string | null;
  mantra: string | null;        // Sanskrit/transliteration, \n-separated lines
  synonyms: string | null;      // "word — meaning; word — meaning; ..."
  translation: string | null;
  purport: string | null;
  sequence: number;
}