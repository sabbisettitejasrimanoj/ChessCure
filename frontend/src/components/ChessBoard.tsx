import { Chess, type Move, type Square } from 'chess.js'

const pieceGlyphs: Record<string, string> = {
  wk: '♔', wq: '♕', wr: '♖', wb: '♗', wn: '♘', wp: '♙',
  bk: '♚', bq: '♛', br: '♜', bb: '♝', bn: '♞', bp: '♟',
}

export function ChessBoard({
  fen,
  lastMove,
  selected,
  legalTargets,
  onSquareClick,
  disabled = false,
}: {
  fen: string
  lastMove: Move | null
  selected: Square | null
  legalTargets: Square[]
  onSquareClick: (square: Square) => void
  disabled?: boolean
}) {
  const chess = new Chess(fen)
  const squares = Array.from({ length: 64 }, (_, index) => {
    const file = index % 8
    const rank = 7 - Math.floor(index / 8)
    return `${'abcdefgh'[file]}${rank + 1}` as Square
  })

  return (
    <div className="board-frame">
      <div className="chessboard" role="group" aria-label="Chess board">
        {squares.map((square, index) => {
          const file = index % 8
          const rank = 7 - Math.floor(index / 8)
          const piece = chess.get(square)
          const isLight = (index % 8 + Math.floor(index / 8)) % 2 === 0
          const isTarget = legalTargets.includes(square)
          const isLastMove = lastMove?.from === square || lastMove?.to === square
          const pieceCode = piece ? `${piece.color}${piece.type}` : ''
          const description = piece
            ? `${piece.color === 'w' ? 'White' : 'Black'} ${piece.type}, ${square}`
            : `Empty ${square}`

          return (
            <button
              key={square}
              type="button"
              className={[
                'board-square',
                isLight ? 'square-light' : 'square-dark',
                selected === square ? 'square-selected' : '',
                isLastMove ? 'square-last-move' : '',
                isTarget ? 'square-target' : '',
              ].filter(Boolean).join(' ')}
              aria-label={description}
              aria-pressed={selected === square}
              disabled={disabled}
              onClick={() => onSquareClick(square)}
            >
              {file === 0 && <span className="rank-label" aria-hidden="true">{rank + 1}</span>}
              {rank === 0 && <span className="file-label" aria-hidden="true">{'abcdefgh'[file]}</span>}
              {piece && <span className={`piece piece-${piece.color}`} aria-hidden="true">{pieceGlyphs[pieceCode]}</span>}
              {isTarget && <span className={piece ? 'capture-target' : 'move-target'} aria-hidden="true" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}