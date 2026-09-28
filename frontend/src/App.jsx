import { useState } from 'react'
import Login from './pages/Login/Login.jsx'
import Register from './pages/Register/Register.jsx'
import './App.css'

function App() {
  const [page, setPage] = useState('login')

  return page === 'login'
    ? <Login onCreateAccount={() => setPage('register')} />
    : <Register onLogin={() => setPage('login')} />
}

export default App
