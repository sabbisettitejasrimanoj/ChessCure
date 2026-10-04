import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Chess, type Move, type Square } from 'chess.js'
import {
  playMoveSound,
  playCaptureSound,
  playCheckSound,
  playVictorySound,
} from '../utils/sound'
import type { PieceStyle } from '../components/ChessPieces'

export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'

export type BoardWoodTheme = 'Classic' | 'Rosewood' | 'Oak'

type GameContextValue = {
  difficulty: Difficulty
  setDifficulty: (difficulty: Difficulty) => void
  fen: string
  history: Move[]
  lastMove: Move | null
  turn: 'w' | 'b'
  gameOver: boolean
  inCheck: boolean
  isCheckmate: boolean
  isDraw: boolean
  playerMoveCount: number
  soundEnabled: boolean
  setSoundEnabled: (enabled: boolean) => void
  showLegalMoves: boolean
  setShowLegalMoves: (show: boolean) => void
  boardTheme: BoardWoodTheme
  setBoardTheme: (theme: BoardWoodTheme) => void
  pieceStyle: PieceStyle
  setPieceStyle: (style: PieceStyle) => void
  playHumanMove: (from: Square, to: Square) => boolean
  undoMove: () => void
  startNewGame: () => void
}

const GameContext = createContext<GameContextValue | null>(null)

function moveScore(move: Move) {
  const centralSquares = ['d4', 'e4', 'd5', 'e5']
  return (
    (move.captured ? 5 : 0) +
    (move.promotion ? 8 : 0) +
    (move.san.includes('+') ? 3 : 0) +
    (centralSquares.includes(move.to) ? 1 : 0) +
    Math.random() * 0.3
  )
}

export function GameProvider({ children }: { children: ReactNode }) {
  const engine = useRef(new Chess())
  const playerMoves = useRef(0)
  const verificationStarted = useRef(false)
  const [difficulty, setDifficulty] = useState<Difficulty>('Intermediate')
  const [fen, setFen] = useState(engine.current.fen())
  const [history, setHistory] = useState<Move[]>([])
  const [turn, setTurn] = useState<'w' | 'b'>('w')
  const [gameOver, setGameOver] = useState(false)
  const [inCheck, setInCheck] = useState(false)
  const [isCheckmate, setIsCheckmate] = useState(false)
  const [isDraw, setIsDraw] = useState(false)

  // User preferences with fallback and persistence
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = window.localStorage.getItem('chess-cure-sound')
      return saved !== null ? saved === 'true' : true
    } catch {
      return true
    }
  })

  const [showLegalMoves, setShowLegalMoves] = useState<boolean>(() => {
    try {
      const saved = window.localStorage.getItem('chess-cure-legal-hints')
      return saved !== null ? saved === 'true' : true
    } catch {
      return true
    }
  })

  const [boardTheme, setBoardTheme] = useState<BoardWoodTheme>(() => {
    try {
      const saved = window.localStorage.getItem('chess-cure-board-theme')
      if (saved === 'Classic' || saved === 'Rosewood' || saved === 'Oak') {
        return saved
      }
    } catch {
      // Ignore
    }
    return 'Classic'
  })

  const [pieceStyle, setPieceStyle] = useState<PieceStyle>(() => {
    try {
      const saved = window.localStorage.getItem('chess-cure-piece-style')
      if (
        saved === 'Classic' ||
        saved === 'Wood' ||
        saved === 'Tournament' ||
        saved === 'Modern' ||
        saved === 'Luxury'
      ) {
        return saved as PieceStyle
      }
    } catch {
      // Ignore
    }
    return 'Wood'
  })

  useEffect(() => {
    try {
      window.localStorage.setItem('chess-cure-sound', String(soundEnabled))
    } catch {
      // Ignore
    }
  }, [soundEnabled])

  useEffect(() => {
    try {
      window.localStorage.setItem('chess-cure-legal-hints', String(showLegalMoves))
    } catch {
      // Ignore
    }
  }, [showLegalMoves])

  useEffect(() => {
    try {
      window.localStorage.setItem('chess-cure-board-theme', boardTheme)
    } catch {
      // Ignore
    }
  }, [boardTheme])

  useEffect(() => {
    try {
      window.localStorage.setItem('chess-cure-piece-style', pieceStyle)
    } catch {
      // Ignore
    }
  }, [pieceStyle])

  function triggerSoundForMove(moveResult: Move) {
    if (!soundEnabled) return
    if (engine.current.isCheckmate()) {
      playVictorySound(true)
    } else if (engine.current.inCheck()) {
      playCheckSound(true)
    } else if (moveResult.captured) {
      playCaptureSound(true)
    } else {
      playMoveSound(true)
    }
  }

  function syncState() {
    const currentHistory = engine.current.history({ verbose: true })
    setFen(engine.current.fen())
    setHistory(currentHistory)
    setTurn(engine.current.turn())
    const over = engine.current.isGameOver()
    setGameOver(over)
    setInCheck(engine.current.inCheck())
    setIsCheckmate(engine.current.isCheckmate())
    setIsDraw(engine.current.isDraw())
  }

  function startNewGame() {
    engine.current = new Chess()
    playerMoves.current = 0
    verificationStarted.current = false
    setHistory([])
    setFen(engine.current.fen())
    setTurn('w')
    setGameOver(false)
    setInCheck(false)
    setIsCheckmate(false)
    setIsDraw(false)
  }

  function playHumanMove(from: Square, to: Square) {
    if (engine.current.turn() !== 'w' || engine.current.isGameOver()) return false

    let moveResult: Move | null = null
    try {
      moveResult = engine.current.move({ from, to, promotion: 'q' })
    } catch {
      return false
    }

    if (!moveResult) return false

    playerMoves.current += 1
    syncState()
    triggerSoundForMove(moveResult)

    if (playerMoves.current >= 2 && !verificationStarted.current) {
      verificationStarted.current = true
      return true
    }

    return false
  }

  function undoMove() {
    const wasWhiteToMove = engine.current.turn() === 'w'
    const firstUndo = engine.current.undo()
    if (!firstUndo) return

    if (wasWhiteToMove) engine.current.undo()
    playerMoves.current = Math.max(0, playerMoves.current - 1)
    syncState()
    if (soundEnabled) playMoveSound(true)
  }

  useEffect(() => {
    const currentGame = engine.current
    if (currentGame.turn() !== 'b' || currentGame.isGameOver()) return

    const timeout = window.setTimeout(() => {
      const legalMoves = engine.current.moves({ verbose: true })
      const selectedMove = [...legalMoves].sort(
        (first, second) => moveScore(second) - moveScore(first)
      )[0]

      if (!selectedMove) return
      const moveResult = engine.current.move({
        from: selectedMove.from,
        to: selectedMove.to,
        promotion: selectedMove.promotion,
      })
      syncState()
      if (moveResult) {
        triggerSoundForMove(moveResult)
      }
    }, difficulty === 'Beginner' ? 450 : 750)

    return () => window.clearTimeout(timeout)
  }, [fen, difficulty, soundEnabled])

  const value: GameContextValue = {
    difficulty,
    setDifficulty,
    fen,
    history,
    lastMove: history.at(-1) ?? null,
    turn,
    gameOver,
    inCheck,
    isCheckmate,
    isDraw,
    playerMoveCount: playerMoves.current,
    soundEnabled,
    setSoundEnabled,
    showLegalMoves,
    setShowLegalMoves,
    boardTheme,
    setBoardTheme,
    pieceStyle,
    setPieceStyle,
    playHumanMove,
    undoMove,
    startNewGame,
  }

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame() {
  const context = useContext(GameContext)
  if (!context) throw new Error('useGame must be used inside GameProvider')
  return context
}