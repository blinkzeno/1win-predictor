
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GameState, CellContent, HistoryItem, CellPrediction } from './types';
import { GeminiService } from './services/geminiService';

// --- Sub-components ---

const StatCard: React.FC<{ label: string, value: string | number, color?: string, icon?: string }> = ({ label, value, color = "text-blue-400", icon }) => (
  <div className="bg-slate-800/50 backdrop-blur-md p-4 rounded-2xl border border-slate-700/50 shadow-inner">
    <div className="flex items-center gap-2 mb-1">
      {icon && <span className="text-lg">{icon}</span>}
      <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">{label}</p>
    </div>
    <p className={`text-2xl font-black ${color}`}>{value}</p>
  </div>
);

const App: React.FC = () => {
  const [gridSize, setGridSize] = useState(5);
  const [numMines, setNumMines] = useState(3);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisText, setAnalysisText] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<CellPrediction[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showTriche, setShowTriche] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Initialize a new game
  const initGame = useCallback((size = gridSize, mines = numMines) => {
    const grid: CellContent[][] = Array(size).fill(null).map(() => Array(size).fill('DIAMOND'));
    const revealed: boolean[][] = Array(size).fill(false).map(() => Array(size).fill(false));

    let minesPlaced = 0;
    while (minesPlaced < mines) {
      const r = Math.floor(Math.random() * size);
      const c = Math.floor(Math.random() * size);
      if (grid[r][c] !== 'MINE') {
        grid[r][c] = 'MINE';
        minesPlaced++;
      }
    }

    setGameState({
      grid,
      revealed,
      numMines: mines,
      gridSize: size,
      isGameOver: false,
      isVictory: false
    });
    setAnalysisText(null);
    setPredictions([]);
    setErrorMessage(null);
  }, [gridSize, numMines]);

  useEffect(() => {
    initGame();
  }, []);

  const handleCellClick = (r: number, c: number) => {
    if (!gameState || gameState.isGameOver || gameState.revealed[r][c]) return;

    const newRevealed = gameState.revealed.map(row => [...row]);
    newRevealed[r][c] = true;

    // Clear prediction if cell is clicked
    setPredictions(prev => prev.filter(p => p.r !== r || p.c !== c));

    const content = gameState.grid[r][c];
    let isGameOver = content === 'MINE';
    
    // Check for victory
    const unrevealedSafe = gameState.grid.reduce((acc, row, ri) => 
      acc + row.filter((cell, ci) => cell === 'DIAMOND' && !newRevealed[ri][ci]).length, 0
    );
    const isVictory = !isGameOver && unrevealedSafe === 0;

    if (isGameOver || isVictory) {
      const outcome = isVictory ? 'WIN' : 'LOSS';
      const newItem: HistoryItem = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString(),
        gridSize: gameState.gridSize,
        numMines: gameState.numMines,
        outcome
      };
      setHistory(prev => [newItem, ...prev].slice(0, 10));
    }

    setGameState({
      ...gameState,
      revealed: newRevealed,
      isGameOver: isGameOver || isVictory,
      isVictory
    });
  };

  const safeProbability = useMemo(() => {
    if (!gameState) return 0;
    const totalCells = gameState.gridSize * gameState.gridSize;
    const revealedCount = gameState.revealed.flat().filter(r => r).length;
    const remainingCells = totalCells - revealedCount;
    
    const totalSafe = totalCells - gameState.numMines;
    const revealedSafe = gameState.grid.reduce((acc, row, r) => 
        acc + row.filter((cell, c) => cell === 'DIAMOND' && gameState.revealed[r][c]).length, 0);
    
    if (remainingCells === 0) return 0;
    return ((totalSafe - revealedSafe) / remainingCells) * 100;
  }, [gameState]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setErrorMessage(null);
    setAnalysisText(null);
    setPredictions([]);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        const gemini = GeminiService.getInstance();
        const result = await gemini.analyzeScreenshot(base64String, gridSize);
        setAnalysisText(result.analysisText);
        setPredictions(result.predictions);
      } catch (err: any) {
        if (err.message === "KEY_NOT_FOUND") {
          setErrorMessage("Erreur de clé API. Veuillez sélectionner une clé valide dans les paramètres.");
          setIsSettingsOpen(true);
        } else {
          setErrorMessage("L'analyse IA a échoué. Vérifiez votre connexion et votre clé API.");
        }
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGridSizeChange = (size: number) => {
    setGridSize(size);
    const maxMines = size * size - 1;
    const adjustedMines = Math.min(numMines, maxMines);
    setNumMines(adjustedMines);
    initGame(size, adjustedMines);
  };

  const handleOpenApiKeyDialog = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio && typeof aistudio.openSelectKey === 'function') {
      await aistudio.openSelectKey();
      setErrorMessage(null); // Clear errors after potential re-selection
    } else {
      alert("La sélection de clé API n'est pas disponible dans cet environnement.");
    }
  };

  if (!gameState) return <div className="p-10 text-center animate-pulse">Chargement de l'algorithme...</div>;

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center bg-[#0a0f1e]">
      {/* Decorative background elements */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full"></div>
      </div>

      {/* Header */}
      <header className="w-full mb-10 text-center relative">
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="absolute right-0 top-0 p-3 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 rounded-full transition-all"
          title="Paramètres"
        >
          <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
        </button>

        <div className="inline-block px-4 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-bold tracking-widest mb-4">
          PREDICTOR V3.0 AI VISION
        </div>
        <h1 className="text-5xl md:text-6xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-500 mb-2">
          1WIN MINES <span className="text-blue-500">PRO</span>
        </h1>
        <p className="text-slate-400 font-medium italic">Prédictions visuelles synchronisées par IA</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full max-w-7xl">
        
        {/* Left Panel: Tools */}
        <div className="lg:col-span-3 space-y-6">
          <section className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <h2 className="text-lg font-black mb-5 flex items-center gap-3">
              <span className="p-1.5 bg-blue-500 rounded-lg text-white">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
              </span>
              CONTRÔLES
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-3">Grille</label>
                <div className="grid grid-cols-3 gap-2">
                  {[3, 5, 7].map(s => (
                    <button 
                      key={s}
                      onClick={() => handleGridSizeChange(s)}
                      className={`py-2 rounded-xl text-sm font-bold border transition-all ${gridSize === s ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-900/40' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                    >
                      {s}x{s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-3 flex justify-between">
                  <span>Mines</span>
                  <span className="text-blue-400">{numMines}</span>
                </label>
                <input 
                  type="range" min="1" max={gridSize * gridSize - 1} step="1" 
                  value={numMines} 
                  onChange={(e) => setNumMines(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              <div className="pt-2">
                <button 
                  onClick={() => initGame()}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all rounded-2xl font-black text-sm tracking-widest shadow-xl shadow-blue-900/20 active:scale-95"
                >
                  Nouveau Round
                </button>
              </div>
            </div>
          </section>

          <section className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <h2 className="text-lg font-black mb-5 flex items-center gap-3">
              <span className="p-1.5 bg-purple-500 rounded-lg text-white">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
              </span>
              IA SCANNER
            </h2>
            <div className="relative group">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-700 border-dashed rounded-2xl cursor-pointer bg-slate-800/30 hover:bg-slate-800 hover:border-purple-500/50 transition-all">
                <div className="flex flex-col items-center justify-center py-4">
                  <p className="mb-2 text-xs font-bold text-slate-500 group-hover:text-purple-400 transition-colors uppercase tracking-widest">Scanner Screenshot</p>
                  <p className="text-[10px] text-slate-600">ANALYSE VISION</p>
                </div>
                <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={isAnalyzing} />
              </label>
            </div>

            {isAnalyzing && (
              <div className="mt-4 flex flex-col items-center justify-center gap-3 text-purple-400 animate-pulse">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-500 border-t-transparent"></div>
                <span className="text-[10px] font-black uppercase tracking-widest">Processing...</span>
              </div>
            )}
          </section>
        </div>

        {/* Center Panel: Grid */}
        <div className="lg:col-span-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Indice de Confiance" value={`${safeProbability.toFixed(1)}%`} color={safeProbability > 80 ? "text-emerald-400" : safeProbability > 50 ? "text-yellow-400" : "text-red-400"} icon="🛡️" />
            <StatCard label="Points IA" value={predictions.length} color={predictions.length > 0 ? "text-blue-400" : "text-slate-600"} icon="🎯" />
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-[40px] p-8 md:p-12 shadow-2xl relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
            
            <div 
              className="grid gap-2 md:gap-4 mx-auto"
              style={{ 
                gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
                maxWidth: gridSize > 5 ? '550px' : '450px'
              }}
            >
              {gameState.grid.map((row, r) => 
                row.map((cell, c) => {
                  const isRevealed = gameState.revealed[r][c];
                  const cheatVisible = showTriche && !isRevealed;
                  const isMine = cell === 'MINE';
                  const aiPred = predictions.find(p => p.r === r && p.c === c);
                  const isAiRecommended = !isRevealed && aiPred;
                  
                  let cellStyles = "aspect-square rounded-2xl flex items-center justify-center text-3xl md:text-4xl cursor-pointer transition-all duration-300 relative group overflow-hidden ";
                  
                  if (isRevealed) {
                    cellStyles += isMine ? 'bg-gradient-to-br from-red-500 to-red-800 shadow-lg shadow-red-900/40 border border-red-400/50' : 'bg-gradient-to-br from-emerald-400 to-emerald-700 shadow-lg shadow-emerald-900/40 border border-emerald-300/50';
                  } else if (cheatVisible) {
                    cellStyles += isMine ? 'bg-red-500/10 border border-red-500/30' : 'bg-emerald-500/10 border border-emerald-500/30';
                  } else {
                    cellStyles += 'bg-slate-800 border border-slate-700/50 hover:bg-slate-700 hover:border-blue-500/50 hover:scale-[1.03] shadow-inner';
                  }

                  return (
                    <div 
                      key={`${r}-${c}`} 
                      className={cellStyles}
                      onClick={() => handleCellClick(r, c)}
                    >
                      <span className="absolute top-1 left-1 text-[8px] text-slate-600 font-bold uppercase z-10">{String.fromCharCode(65 + c)}{r + 1}</span>
                      
                      {isRevealed && (isMine ? '💣' : '💎')}
                      {!isRevealed && cheatVisible && (
                        <span className="opacity-40 grayscale">{isMine ? '💣' : '💎'}</span>
                      )}
                      
                      {/* ENHANCED AI PREDICTION OVERLAY */}
                      {isAiRecommended && (
                        <div className="absolute inset-0 z-20 pointer-events-none flex flex-col items-center justify-center">
                          {/* Pulsing Outer Border */}
                          <div className="absolute inset-0 border-2 border-blue-400 rounded-2xl animate-pulse shadow-[0_0_20px_rgba(59,130,246,0.6)]"></div>
                          
                          {/* Rotating Light Sweep Effect */}
                          <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 via-transparent to-blue-500/10 animate-pulse opacity-50"></div>
                          
                          {/* Confidence Tag */}
                          <div className="bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg mb-1 transform translate-y-[-2px]">
                            {aiPred.p}%
                          </div>
                          
                          {/* Tactical Signal */}
                          <div className="text-blue-400 font-black text-xs tracking-tighter animate-bounce drop-shadow-[0_0_10px_rgba(59,130,246,1)]">
                            SAFE
                          </div>
                          
                          {/* Tech Crosshair Corners */}
                          <div className="absolute top-1 right-1 w-1.5 h-1.5 border-t border-r border-blue-400"></div>
                          <div className="absolute bottom-1 left-1 w-1.5 h-1.5 border-b border-l border-blue-400"></div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {gameState.isGameOver && (
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 rounded-[40px] text-center animate-in zoom-in duration-300 z-50">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center text-5xl mb-6 shadow-2xl ${gameState.isVictory ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-red-600 shadow-red-600/50'}`}>
                  {gameState.isVictory ? '🏆' : '💥'}
                </div>
                <h3 className={`text-4xl font-black mb-2 ${gameState.isVictory ? 'text-emerald-400' : 'text-red-500'}`}>
                  {gameState.isVictory ? 'WIN' : 'LOSS'}
                </h3>
                <button 
                  onClick={() => initGame()}
                  className="px-12 py-5 bg-white text-slate-950 rounded-full font-black text-sm tracking-[0.2em] hover:bg-blue-400 transition-all shadow-2xl active:scale-95"
                >
                  RETRY
                </button>
              </div>
            )}
          </div>

          {(analysisText || errorMessage || predictions.length > 0) && (
            <div className={`p-6 rounded-3xl border animate-in slide-in-from-bottom-4 duration-500 ${errorMessage ? 'bg-red-950/20 border-red-500/30' : 'bg-blue-950/20 border-blue-500/30 shadow-2xl shadow-blue-500/5'}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-2 h-2 rounded-full animate-pulse ${errorMessage ? 'bg-red-500' : 'bg-blue-400'}`}></div>
                <h4 className={`text-[10px] font-black uppercase tracking-[0.3em] ${errorMessage ? 'text-red-400' : 'text-blue-400'}`}>
                  {errorMessage ? 'Alerte Système' : 'Rapport Vision IA'}
                </h4>
              </div>
              <div className={`text-sm leading-relaxed ${errorMessage ? 'text-red-300' : 'text-slate-300'}`}>
                {errorMessage || analysisText}
              </div>
              {predictions.length > 0 && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {predictions.map((p, idx) => (
                    <div key={idx} className="bg-blue-500/10 border border-blue-500/20 p-2 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="bg-blue-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded">
                          {String.fromCharCode(65 + p.c)}{p.r + 1}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">{p.reason}</span>
                      </div>
                      <span className="text-blue-400 font-black text-xs">{p.p}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Panel: Logs */}
        <div className="lg:col-span-3 space-y-6">
          <section className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl p-6 shadow-2xl h-full flex flex-col">
            <h2 className="text-lg font-black mb-5 flex items-center gap-3">
              <span className="p-1.5 bg-emerald-500 rounded-lg text-white">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </span>
              LOGS
            </h2>
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
              {history.map(item => (
                <div key={item.id} className="p-4 bg-slate-800/40 rounded-2xl flex items-center justify-between border border-slate-700/30">
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold">{item.timestamp}</p>
                    <p className="text-xs font-black text-slate-300">{item.gridSize}x{item.gridSize} • {item.numMines}M</p>
                  </div>
                  <div className={`font-black text-[10px] tracking-tighter ${item.outcome === 'WIN' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {item.outcome === 'WIN' ? 'WIN' : 'LOSS'}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsSettingsOpen(false)}></div>
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black mb-6 text-white flex items-center gap-3">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              Configuration Système
            </h3>
            
            <div className="space-y-6">
              <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
                <p className="text-sm font-bold text-slate-400 mb-4">Gestion de l'API Google Gemini</p>
                <button 
                  onClick={handleOpenApiKeyDialog}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-sm transition-all shadow-lg shadow-blue-900/40"
                >
                  SÉLECTIONNER UNE CLÉ API
                </button>
                <p className="mt-4 text-[10px] text-slate-500 leading-relaxed">
                  L'application utilise votre clé API personnelle pour les prédictions IA. 
                  Assurez-vous que la facturation est activée sur votre projet GCP.
                </p>
                <a 
                  href="https://ai.google.dev/gemini-api/docs/billing" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-[10px] text-blue-400 font-bold hover:underline"
                >
                  Documentation sur la facturation &rarr;
                </a>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
                <span className="text-sm font-bold text-slate-400">Mode Développeur (Triche)</span>
                <button 
                  onClick={() => setShowTriche(!showTriche)}
                  className={`w-12 h-6 rounded-full relative transition-all ${showTriche ? 'bg-blue-500' : 'bg-slate-600'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${showTriche ? 'left-7' : 'left-1'}`}></div>
                </button>
              </div>

              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-black text-sm transition-all"
              >
                FERMER
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="mt-16 py-10 text-slate-600 text-[10px] font-bold tracking-[0.4em] uppercase text-center border-t border-slate-900 w-full max-w-4xl">
        Security Level 4 • Kernel Predictive Engine 2.1.0 • Gemini Neural Cloud
      </footer>
    </div>
  );
};

export default App;
