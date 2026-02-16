export interface Chunk {
  id: string;
  document: string;
  start_line: number;
  end_line: number;
  language: string;
  file_path: string;
  symbol?: string;
}
