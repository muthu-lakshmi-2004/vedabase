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
  content: string;
  title: string | null;
  sequence: number;
}