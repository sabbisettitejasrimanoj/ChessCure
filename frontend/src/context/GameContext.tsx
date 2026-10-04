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
  createGame,
  getGameHistory,
  submitAiMove,
  submitPlayerMove,
  undoGameTurn,
  type ApiGame,
  type GameHistory,
} from '../services/gameApi'

export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'

type GameContextValue = {
  difficulty: Difficulty
  setDifficulty: (difficulty: Difficulty) => void
  fen: string
  history: Move[]
  lastMove: Move | null
  turn: 'w' | 'b'
  gameOver: boolean
  gameId: string | null
  isBusy: boolean
  apiError: string | null
  clearApiError: () => void
  playHumanMove: (from: Square, to: Square) => Promise<boolean>
  retryAiMove: () => Promise<void>
  undoMove: () => Promise<void>
  startNewGame: () => Promise<boolean>
}

const GameContext = createContext<GameContextValue | null>(null)

function toDifficulty(value: string | undefined): Difficulty {
  if (
    value === 'Beginner'
    || value === 'Intermediate'
    || value === 'Advanced'
    || value === 'Expert'
  ) return value
  return 'Intermediate'
}

export function GameProvider({ children }: { children: ReactNode }) {
  const engine = useRef(new Chess())
  const gameIdRef = useRef<string | null>(null)
  const playerMoves = useRef(0)
  const verificationStarted = useRef(false)
  const [difficulty, setDifficulty] = useState<Difficulty>('Intermediate')
  const [gameId, setGameId] = useState<string | null>(null)
  const [fen, setFen] = useState(engine.current.fen())
  const [history, setHistory] = useState<Move[]>([])
  const [turn, setTurn] = useState<'w' | 'b'>('w')
  const [gameOver, setGameOver] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  function syncState(authoritativeFen?: string, status?: ApiGame['status']) {
    const currentFen = authoritativeFen ?? engine.current.fen()
    setFen(currentFen)
    setHistory(engine.current.history({ verbose: true }))
    setTurn(engine.current.turn())
    setGameOver(status === 'completed' || engine.current.isGameOver())
  }

  function restoreGame(snapshot: GameHistory) {
    engine.current = new Chess()
    for (const move of snapshot.moves) {
      engine.current.move({
        from: move.from_square,
        to: move.to_square,
        promotion: move.uci.length === 5 ? move.uci[4] : undefined,
      })
    }
    if (snapshot.moves.length === 0) {
      engine.current = new Chess(snapshot.game.current_fen)
    }
    setFen(snapshot.game.current_fen)
    setHistory(engine.current.history({ verbose: true }))
    setTurn(engine.current.turn())
    setGameOver(snapshot.game.status === 'completed' || engine.current.isGameOver())
    setDifficulty(toDifficulty(snapshot.game.difficulty))
    playerMoves.current = snapshot.moves.filter((move) => move.actor === 'human').length
    verificationStarted.current = playerMoves.current >= 2
    gameIdRef.current = snapshot.game.id
    setGameId(snapshot.game.id)
  }

  useEffect(() => {
    let savedGameId: string | null
    try {
      savedGameId = window.localStorage.getItem('chess-cure-game-id')
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Could not read the saved game ID.')
      return
    }
    if (!savedGameId) return

    let cancelled = false
    setIsBusy(true)
    getGameHistory(savedGameId)
      .then((snapshot) => {
        if (!cancelled) restoreGame(snapshot)
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setApiError(error instanceof Error ? error.message : 'Could not load the saved game.')
        }
      })
      .finally(() => {
        if (!cancelled) setIsBusy(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function startNewGame() {
    setIsBusy(true)
    setApiError(null)
    try {
      const game = await createGame(difficulty)
      gameIdRef.current = game.id
      setGameId(game.id)
      try {
        window.localStorage.setItem('chess-cure-game-id', game.id)
      } catch (error) {
        setApiError(
          error instanceof Error
            ? `Game started, but its ID could not be saved in this browser: ${error.message}`
            : 'Game started, but its ID could not be saved in this browser.',
        )
      }
      engine.current = new Chess(game.current_fen)
      playerMoves.current = 0
      verificationStarted.current = false
      setHistory([])
      setFen(game.current_fen)
      setTurn(engine.current.turn())
      setGameOver(false)
      return true
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Could not start a new game.')
      return false
    } finally {
      setIsBusy(false)
    }
  }

  async function requestAiMove() {
    const currentGameId = gameIdRef.current
    if (!currentGameId) throw new Error('Start a game before requesting an AI move.')
    const result = await submitAiMove(currentGameId)
    engine.current.move({
      from: result.move.from_square,
      to: result.move.to_square,
      promotion: result.move.uci.length === 5 ? result.move.uci[4] : undefined,
    })
    syncState(result.game.current_fen, result.game.status)
  }

  async function playHumanMove(from: Square, to: Square) {
    const currentGameId = gameIdRef.current
    if (isBusy || !currentGameId || turn !== 'w' || engine.current.isGameOver()) return false

    setIsBusy(true)
    setApiError(null)
    let shouldVerify = false
    try {
      const result = await submitPlayerMove(currentGameId, from, to)
      engine.current.move({ from, to, promotion: 'q' })
      playerMoves.current += 1
      if (playerMoves.current >= 2 && !verificationStarted.current) {
        verificationStarted.current = true
        shouldVerify = true
      }
      syncState(result.game.current_fen, result.game.status)
      if (result.game.current_turn === 'black' && result.game.status === 'active') {
        try {
          await requestAiMove()
        } catch (error) {
          setApiError(
            error instanceof Error
              ? `Your move was saved, but the AI move failed: ${error.message}`
              : 'Your move was saved, but the AI move failed.',
          )
        }
      }
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Could not save your move.')
      return false
    } finally {
      setIsBusy(false)
    }
    return shouldVerify
  }

  async function retryAiMove() {
    setIsBusy(true)
    setApiError(null)
    try {
      await requestAiMove()
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Could not complete the AI move.')
    } finally {
      setIsBusy(false)
    }
  }

  async function undoMove() {
    const currentGameId = gameIdRef.current
    if (!currentGameId || isBusy || history.length === 0) return
    setIsBusy(true)
    setApiError(null)
    try {
      const snapshot = await undoGameTurn(currentGameId)
      restoreGame(snapshot)
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Could not undo the last turn.')
    } finally {
      setIsBusy(false)
    }
  }

  const value: GameContextValue = {
    difficulty,
    setDifficulty,
    fen,
    history,
    lastMove: history.at(-1) ?? null,
    turn,
    gameOver,
    gameId,
    isBusy,
    apiError,
    clearApiError: () => setApiError(null),
    playHumanMove,
    retryAiMove,
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
