import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Bot,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Crown,
  Flag,
  KeyRound,
  Lightbulb,
  LockKeyhole,
  Moon,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Sun,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { Chess, type Square } from 'chess.js'
import { useNavigate } from 'react-router-dom'
import { AppLayout, Brand } from '../components/AppLayout'
import { ChessBoard } from '../components/ChessBoard'
import { useGame, type Difficulty } from '../context/GameContext'

const enter = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.28, ease: 'easeOut' as const },
}

export function SplashPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const timeout = window.setTimeout(() => navigate('/home', { replace: true }), 2600)
    return () => window.clearTimeout(timeout)
  }, [navigate])

  return (
    <main className="splash-screen">
      <motion.div className="splash-glow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2 }} />
      <motion.div className="splash-content" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.65 }}>
        <motion.div className="splash-knight" animate={{ y: [0, -8, 0], rotate: [0, -3, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} aria-hidden="true">♞</motion.div>
        <p className="splash-eyebrow">THOUGHTFUL CHESS, EVERY DAY</p>
        <h1>Chess <span>Cure</span></h1>
        <p className="splash-tagline">Find your focus.<br />Make your next move count.</p>
        <div className="loading-track" role="progressbar" aria-label="Loading Chess Cure" aria-valuemin={0} aria-valuemax={100}>
          <motion.span initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 2.2, ease: 'easeInOut' }} />
        </div>
        <span className="splash-loading">Preparing your board</span>
        <button className="splash-skip" onClick={() => navigate('/home', { replace: true })}>Continue <ArrowRight size={15} /></button>
      </motion.div>
      <div className="splash-footnote"><span>CHESS CURE</span><span>YOUR BOARD IS READY</span></div>
    </main>
  )
}

export function HomePage() {
  const navigate = useNavigate()

  return (
    <AppLayout>
      <motion.section className="home-view" {...enter}>
        <div className="home-intro">
          <span className="eyebrow"><span className="eyebrow-line" /> YOUR BOARD IS READY</span>
          <h1>Your next move<br className="desktop-break" /> awaits.</h1>
          <p>Settle in and play at your pace.</p>
        </div>
        <div className="home-action-list">
          <button className="home-action home-action--primary" onClick={() => navigate('/difficulty')}>
            <span className="action-icon action-icon--gold"><Crown size={23} fill="currentColor" strokeWidth={1.5} /></span>
            <span className="action-copy"><strong>Play with AI</strong><small>Challenge the AI, your way</small></span>
            <ArrowRight className="action-arrow" size={19} />
          </button>
          <button className="home-action" onClick={() => navigate('/settings')}>
            <span className="action-icon"><span className="settings-glyph">⚙</span></span>
            <span className="action-copy"><strong>Settings</strong><small>Make it your own</small></span>
            <ChevronRight className="action-arrow" size={18} />
          </button>
          <button className="home-action" onClick={() => navigate('/profile')}>
            <span className="action-icon"><span className="profile-glyph">♙</span></span>
            <span className="action-copy"><strong>Profile</strong><small>Your progress, at a glance</small></span>
            <ChevronRight className="action-arrow" size={18} />
          </button>
        </div>
        <div className="home-signoff"><span className="signoff-knight">♞</span><span>Every move has a little more meaning.</span></div>
      </motion.section>
    </AppLayout>
  )
}

const difficulties: { name: Difficulty; detail: string; elo: string; Icon: typeof Sparkles }[] = [
  { name: 'Beginner', detail: 'Learn the basics', elo: '800', Icon: Sparkles },
  { name: 'Intermediate', detail: 'A balanced challenge', elo: '1,200', Icon: Award },
  { name: 'Advanced', detail: 'For experienced players', elo: '1,600', Icon: Crown },
  { name: 'Expert', detail: 'A real test', elo: '2,000', Icon: ShieldCheck },
]

export function DifficultyPage() {
  const navigate = useNavigate()
  const { difficulty, setDifficulty, startNewGame } = useGame()

  function beginMatch() {
    startNewGame()
    navigate('/game')
  }

  return (
    <AppLayout>
      <motion.section className="difficulty-view" {...enter}>
        <button className="back-link" onClick={() => navigate('/home')}><ArrowLeft size={16} /> Home</button>
        <div className="difficulty-heading">
          <div className="robot-illustration"><Bot size={40} strokeWidth={1.55} /><span className="robot-orbit" /></div>
          <span className="eyebrow">A MATCH AT YOUR PACE</span>
          <h1>Choose your difficulty</h1>
          <p>Pick a level. The board is yours.</p>
        </div>
        <div className="difficulty-options" role="radiogroup" aria-label="AI difficulty">
          {difficulties.map(({ name, detail, elo, Icon }) => (
            <button key={name} className={`difficulty-option${difficulty === name ? ' is-selected' : ''}`} role="radio" aria-checked={difficulty === name} onClick={() => setDifficulty(name)}>
              <span className="radio-mark">{difficulty === name && <span />}</span>
              <span className="difficulty-icon"><Icon size={18} /></span>
              <span className="difficulty-copy"><strong>{name}</strong><small>{detail}</small></span>
              <span className="difficulty-elo">{elo}</span>
            </button>
          ))}
        </div>
        <button className="button button--primary button--wide" onClick={beginMatch}>Start Match <ArrowRight size={17} /></button>
      </motion.section>
    </AppLayout>
  )
}

export function GamePage() {
  const navigate = useNavigate()
  const { difficulty, fen, history, lastMove, turn, gameOver, playHumanMove, undoMove } = useGame()
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const savedTheme = window.localStorage.getItem('chess-cure-game-theme')
      if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme
    } catch {
      // Fall through to the system preference when storage is unavailable.
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  const [selected, setSelected] = useState<Square | null>(null)
  const [showToast, setShowToast] = useState(false)
  const [showResign, setShowResign] = useState(false)
  const game = useMemo(() => new Chess(fen), [fen])
  const legalTargets = useMemo(() => selected
    ? game.moves({ square: selected, verbose: true }).map((move) => move.to)
    : [], [game, selected])

  useEffect(() => {
    try {
      window.localStorage.setItem('chess-cure-game-theme', theme)
    } catch {
      // Theme remains available for this session when storage is unavailable.
    }
  }, [theme])

  useEffect(() => {
    if (!showToast) return
    const timeout = window.setTimeout(() => navigate('/identity'), 1700)
    return () => window.clearTimeout(timeout)
  }, [navigate, showToast])

  function selectSquare(square: Square) {
    if (turn !== 'w' || gameOver) return
    if (selected && legalTargets.includes(square)) {
      const shouldVerify = playHumanMove(selected, square)
      setSelected(null)
      if (shouldVerify) setShowToast(true)
      return
    }
    const piece = game.get(square)
    setSelected(piece?.color === 'w' ? square : null)
  }

  function showHint() {
    if (turn !== 'w' || gameOver) return
    const hint = game.moves({ verbose: true })[0]
    if (hint) setSelected(hint.from)
  }

  return (
    <AppLayout width="wide">
      <motion.section className="game-view" data-theme={theme} {...enter}>
        <div className="game-heading-row">
          <div><span className="eyebrow">YOUR MATCH</span><h1>Play with AI</h1></div>
          <div className="game-heading-actions">
            <button className="icon-button game-help" aria-label="Game help" title="Game help"><CircleHelp size={19} /></button>
            <button className="icon-button game-theme-toggle" type="button" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} aria-pressed={theme === 'dark'} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
            </button>
          </div>
        </div>
        <div className="game-layout">
          <div className="board-column">
            <ChessBoard fen={fen} lastMove={lastMove} selected={selected} legalTargets={legalTargets} onSquareClick={selectSquare} disabled={turn !== 'w' || gameOver} />
            <div className="player-bar"><span className="player-avatar">♙</span><span><strong>You</strong><small>{turn === 'w' ? 'Your move' : 'AI is thinking…'}</small></span><span className="player-rating">1,500</span></div>
            <div className="game-controls">
              <button onClick={undoMove} disabled={!history.length} aria-label="Undo last move"><RotateCcw size={18} /><span>Undo</span></button>
              <button onClick={showHint} disabled={turn !== 'w' || gameOver} aria-label="Show a hint"><Lightbulb size={18} /><span>Hint</span></button>
              <button onClick={() => setShowResign(true)} disabled={gameOver} aria-label="Resign from match"><Flag size={18} /><span>Resign</span></button>
            </div>
            {gameOver && <div className="game-result"><Award size={17} /> Match complete <button onClick={() => navigate('/home')}>Home</button></div>}
          </div>
          <aside className="game-aside">
            <div className="aside-card ai-card"><span className="eyebrow">YOUR OPPONENT</span><div className="opponent-bar"><span className="opponent-avatar"><Bot size={21} /></span><span className="opponent-info"><strong>Chess Cure AI</strong><small>{difficulty} · Rating {difficulties.find((entry) => entry.name === difficulty)?.elo}</small></span></div><div className="ai-card-footer"><span>Match timer</span><span className="timer-pill"><Clock3 size={14} /> 04:28</span></div></div>
            <div className="aside-card turn-card"><span className="eyebrow">ON THE BOARD</span><div className="turn-indicator"><span className={`turn-dot${turn === 'b' ? ' turn-dot--ai' : ''}`} /><strong>{gameOver ? 'Match complete' : turn === 'w' ? 'Your move' : 'AI to move'}</strong></div><p>{gameOver ? 'Good game. Ready for another?' : 'Take your time. Your next move is waiting.'}</p></div>
            <div className="aside-card moves-card"><div className="moves-card-head"><span className="eyebrow">MOVE HISTORY</span><span>{Math.ceil(history.length / 2)} moves</span></div><div className="move-list">{history.length === 0 ? <p className="empty-moves">Your moves will appear here.</p> : history.map((move, index) => <div className="move-row" key={`${move.from}-${move.to}-${index}`}><span>{Math.floor(index / 2) + 1}.</span><span>{index % 2 === 0 ? 'You' : 'AI'}</span><strong>{move.san}</strong></div>)}</div></div>
            <div className="aside-card match-status-card"><span className="eyebrow">MATCH STATUS</span><div><span className={`status-dot${gameOver ? ' status-dot--complete' : ''}`} /><strong>{gameOver ? 'Complete' : 'In progress'}</strong></div><p>{gameOver ? 'Your match has finished.' : 'Your position is saved as you play.'}</p></div>
          </aside>
        </div>
      </motion.section>
      <AnimatePresence>
        {showToast && <motion.div className="brilliant-toast" initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} role="status"><span className="toast-star">✦</span><span><strong>Brilliant move</strong><small>A precise move. Well played.</small></span><Check size={18} /></motion.div>}
      </AnimatePresence>
      <AnimatePresence>
        {showResign && <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowResign(false)}><motion.div className="confirm-modal" initial={{ y: 12, scale: 0.98 }} animate={{ y: 0, scale: 1 }} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="resign-title"><span className="modal-icon"><Flag size={20} /></span><h2 id="resign-title">Resign this match?</h2><p>Your current position will be saved.</p><div className="modal-actions"><button className="button button--quiet" onClick={() => setShowResign(false)}>Keep playing</button><button className="button button--primary" onClick={() => navigate('/home')}>Resign</button></div></motion.div></motion.div>}
      </AnimatePresence>
    </AppLayout>
  )
}

export function IdentityPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const timeout = window.setTimeout(() => navigate('/space', { replace: true }), 3200)
    return () => window.clearTimeout(timeout)
  }, [navigate])

  return (
    <main className="identity-screen">
      <div className="identity-grid" />
      <motion.div className="identity-content" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <Brand compact />
        <motion.div className="shield-orbit" initial={{ scale: 0.82, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.65, delay: 0.2 }}>
          <div className="shield-halo" />
          <ShieldCheck size={76} strokeWidth={1.35} />
          <motion.span className="shield-spark" animate={{ opacity: [0.35, 1, 0.35], scale: [0.8, 1.15, 0.8] }} transition={{ duration: 2, repeat: Infinity }} />
        </motion.div>
        <span className="verified-label"><span /> SECURE ACCESS GRANTED</span>
        <h1>Identity Verified</h1>
        <p>Opening Secure Space...</p>
        <div className="identity-progress"><motion.span initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 2.8, ease: 'easeInOut' }} /></div>
        <button className="identity-continue" onClick={() => navigate('/space', { replace: true })}>Continue <ArrowRight size={16} /></button>
      </motion.div>
      <span className="identity-caption">A quiet moment, just for you.</span>
    </main>
  )
}

const initialNotes = [
  { title: 'A thought for later', body: 'Make room for the things that matter.', time: 'Just now', color: 'mint' },
  { title: 'Weekend plans', body: 'A slow morning, a long walk, and nowhere else to be.', time: 'Yesterday', color: 'blue' },
  { title: 'Remember', body: 'Small steps are still progress.', time: 'Monday', color: 'gold' },
]

export function PrivateSpacePage() {
  const navigate = useNavigate()
  const [notes, setNotes] = useState(initialNotes)
  const [draft, setDraft] = useState('')

  function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const body = draft.trim()
    if (!body) return
    setNotes([{ title: 'A new note', body, time: 'Just now', color: 'mint' }, ...notes])
    setDraft('')
  }

  return (
    <main className="vault-screen">
      <header className="vault-topbar"><Brand compact /><div className="vault-secure"><LockKeyhole size={15} /><span>End-to-end encrypted</span></div></header>
      <motion.section className="vault-content" {...enter}>
        <div className="vault-heading"><span className="vault-lock"><LockKeyhole size={19} /></span><span className="eyebrow">YOUR PRIVATE SPACE</span><h1>A little room<br />to yourself.</h1><p>Personal notes, kept private and secure.</p></div>
        <form className="note-compose" onSubmit={saveNote}><KeyRound size={17} /><input aria-label="Write a private note" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a note for yourself…" maxLength={220} /><button type="submit" disabled={!draft.trim()} aria-label="Save note"><ArrowRight size={17} /></button></form>
        <div className="vault-note-list">{notes.map((note, index) => <motion.article className="vault-note" key={`${note.title}-${index}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}><span className={`note-mark note-mark--${note.color}`}><Sparkles size={16} /></span><div><h2>{note.title}</h2><p>{note.body}</p><time>{note.time}</time></div><LockKeyhole className="note-lock" size={14} /></motion.article>)}</div>
        <button className="resume-link" onClick={() => navigate('/resume')}><span className="resume-link-icon"><ArrowLeft size={17} /></span><span><strong>Return to your match</strong><small>Continue right where you left off</small></span><ChevronRight size={18} /></button>
      </motion.section>
      <footer className="vault-footer"><span><LockKeyhole size={13} /> PRIVATE BY DESIGN</span><span>Nothing here is connected to your board.</span></footer>
    </main>
  )
}

export function ResumePage() {
  const navigate = useNavigate()
  const { difficulty, fen, lastMove, history } = useGame()
  return (
    <AppLayout width="wide">
      <motion.section className="resume-view" {...enter}>
        <button className="back-link" onClick={() => navigate('/space')}><ArrowLeft size={16} /> Private space</button>
        <div className="resume-layout"><div className="resume-copy"><span className="eyebrow">YOUR MATCH IS RIGHT WHERE YOU LEFT IT</span><h1>Pick up<br />where you<br />left off.</h1><p>{difficulty} match · {history.length} half-moves played</p><button className="button button--primary" onClick={() => navigate('/game')}>Resume Match <ArrowRight size={17} /></button></div><div className="resume-board-wrap"><div className="resume-opponent"><span className="opponent-avatar"><Bot size={18} /></span><span><strong>Chess Cure AI</strong><small>{difficulty}</small></span></div><ChessBoard fen={fen} lastMove={lastMove} selected={null} legalTargets={[]} onSquareClick={() => undefined} disabled /><div className="resume-board-caption"><span><span className="status-dot" /> Saved just now</span><span>Your game stays here.</span></div></div></div>
      </motion.section>
    </AppLayout>
  )
}

export function SettingsPage() {
  const [soundOn, setSoundOn] = useState(true)
  const [showLegalMoves, setShowLegalMoves] = useState(true)
  const [boardTheme, setBoardTheme] = useState('Classic')

  return (
    <AppLayout>
      <motion.section className="settings-view" {...enter}>
        <span className="eyebrow">PREFERENCES</span><h1>Settings</h1><p className="section-lead">A few small things, just the way you like them.</p>
        <div className="settings-group"><span className="settings-group-title">YOUR GAME</span>
          <SettingRow Icon={soundOn ? Volume2 : VolumeX} title="Game sounds" description="Subtle feedback as you play"><Toggle checked={soundOn} onChange={setSoundOn} label="Toggle game sounds" /></SettingRow>
          <SettingRow Icon={CircleHelp} title="Legal move hints" description="Show available squares when selecting a piece"><Toggle checked={showLegalMoves} onChange={setShowLegalMoves} label="Toggle legal move hints" /></SettingRow>
          <SettingRow Icon={Moon} title="Board style" description="Choose your board colors"><select className="select-control" aria-label="Board style" value={boardTheme} onChange={(event) => setBoardTheme(event.target.value)}><option>Classic</option><option>Forest</option><option>Midnight</option></select></SettingRow>
        </div>
        <div className="settings-group"><span className="settings-group-title">ACCOUNT</span><SettingRow Icon={LockKeyhole} title="Account security" description="Your security preferences are active"><span className="privacy-status"><span /> On</span></SettingRow></div>
        <p className="settings-version">Chess Cure <span>·</span> Version 1.0.0</p>
      </motion.section>
    </AppLayout>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`toggle${checked ? ' is-on' : ''}`} onClick={() => onChange(!checked)}><span /></button>
}

function SettingRow({ Icon, title, description, children }: { Icon: typeof Volume2; title: string; description: string; children: React.ReactNode }) {
  return <div className="setting-row"><span className="setting-icon"><Icon size={18} /></span><span className="setting-copy"><strong>{title}</strong><small>{description}</small></span>{children}</div>
}

export function ProfilePage() {
  const navigate = useNavigate()
  const { history, difficulty, startNewGame } = useGame()
  const played = Math.floor(history.length / 2)
  return (
    <AppLayout>
      <motion.section className="profile-view" {...enter}>
        <span className="eyebrow">YOUR CHESS CURE</span><h1>Profile</h1>
        <div className="profile-card"><div className="profile-avatar-large">♙</div><div><span className="profile-member-label">PLAYER</span><h2>Chess Player</h2><p>Finding your next great move.</p></div><button className="icon-button" aria-label="Edit profile" title="Edit profile"><KeyRound size={17} /></button></div>
        <div className="profile-stats"><div><span className="stat-value">1,500</span><span className="stat-label">Rating</span></div><div><span className="stat-value">{played}</span><span className="stat-label">Moves played</span></div><div><span className="stat-value">{difficulty}</span><span className="stat-label">Last level</span></div></div>
        <div className="profile-note"><ShieldCheck size={20} /><span><strong>Every game is a chance to grow.</strong><small>Keep building your instincts, one move at a time.</small></span></div>
        <button className="profile-play-button" onClick={() => { startNewGame(); navigate('/difficulty') }}>Start a new match <ArrowRight size={17} /></button>
      </motion.section>
    </AppLayout>
  )
}