import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Chess, type Move, type Square } from 'chess.js'

export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'

type GameContextValue = {
  difficulty: Difficulty
  setDifficulty: (difficulty: Difficulty) => void
  fen: string
  history: Move[]
  lastMove: Move | null
  turn: 'w' | 'b'
  gameOver: boolean
  playerMoveCount: number
  playHumanMove: (from: Square, to: Square) => boolean
  undoMove: () => void
  startNewGame: () => void
}

const GameContext = createContext<GameContextValue | null>(null)

function moveScore(move: Move) {
  const centralSquares = ['d4', 'e4', 'd5', 'e5']
  return (move.captured ? 5 : 0)
    + (move.promotion ? 8 : 0)
    + (move.san.includes('+') ? 3 : 0)
    + (centralSquares.includes(move.to) ? 1 : 0)
    + Math.random() * 0.3
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

  function syncState() {
    const currentHistory = engine.current.history({ verbose: true })
    setFen(engine.current.fen())
    setHistory(currentHistory)
    setTurn(engine.current.turn())
    setGameOver(engine.current.isGameOver())
  }

  function startNewGame() {
    engine.current = new Chess()
    playerMoves.current = 0
    verificationStarted.current = false
    setHistory([])
    setFen(engine.current.fen())
    setTurn('w')
    setGameOver(false)
  }

  function playHumanMove(from: Square, to: Square) {
    if (engine.current.turn() !== 'w' || engine.current.isGameOver()) return false

    try {
      engine.current.move({ from, to, promotion: 'q' })
    } catch {
      return false
    }

    playerMoves.current += 1
    syncState()

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
  }

  useEffect(() => {
    const currentGame = engine.current
    if (currentGame.turn() !== 'b' || currentGame.isGameOver()) return

    const timeout = window.setTimeout(() => {
      const legalMoves = engine.current.moves({ verbose: true })
      const selectedMove = [...legalMoves]
        .sort((first, second) => moveScore(second) - moveScore(first))[0]

      if (!selectedMove) return
      engine.current.move({
        from: selectedMove.from,
        to: selectedMove.to,
        promotion: selectedMove.promotion,
      })
      syncState()
    }, difficulty === 'Beginner' ? 450 : 750)

    return () => window.clearTimeout(timeout)
  }, [fen, difficulty])

  const value: GameContextValue = {
    difficulty,
    setDifficulty,
    fen,
    history,
    lastMove: history.at(-1) ?? null,
    turn,
    gameOver,
    playerMoveCount: playerMoves.current,
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