
export type CellContent = 'MINE' | 'DIAMOND' | null;

export interface GameState {
  grid: CellContent[][];
  revealed: boolean[][];
  numMines: number;
  gridSize: number;
  isGameOver: boolean;
  isVictory: boolean;
}

export interface CellPrediction {
  r: number;
  c: number;
  p: number; // Probability 0-100
  reason: string;
}

export interface AnalysisResult {
  predictions: CellPrediction[];
  analysisText: string;
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  gridSize: number;
  numMines: number;
  outcome: 'WIN' | 'LOSS';
}
