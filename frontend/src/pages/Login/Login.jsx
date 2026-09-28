import { useState } from 'react'
import { Button, Card, Input } from '../../components/ui'
import './Login.css'

/** Login view for players returning to Chess Cure. */
function Login({ onCreateAccount }) {
  const [rememberMe, setRememberMe] = useState(false)

  const handleSubmit = (event) => {
    event.preventDefault()
  }

  return (
    <main className="auth-page auth-page--login">
      <div className="auth-shell">
        <a className="auth-hero" href="/" aria-label="Chess Cure home">
          <span className="auth-hero__mark" aria-hidden="true">♞</span>
          <span className="auth-hero__title">Chess Cure</span>
          <span className="auth-hero__subtitle">Continue your chess journey.</span>
        </a>

        <Card className="auth-card" padding="large">
          <div className="auth-card__intro">
            <p className="auth-card__eyebrow">Welcome back</p>
            <h1>Ready for your next move?</h1>
            <p>Pick up where your board left off.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <Input
              label="Username or Email"
              name="identifier"
              placeholder="Enter your username or email"
              autoComplete="username"
              required
            />
            <Input
              label="Password"
              name="password"
              type="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />

            <div className="auth-form__options">
              <Input
                className="auth-checkbox"
                label="Remember me"
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
              />
              <a className="auth-link" href="/forgot-password">Forgot password?</a>
            </div>

            <Button type="submit" size="large" fullWidth>Login</Button>
          </form>
        </Card>

        <p className="auth-switch">
          Don&apos;t have an account?{' '}
          <Button variant="ghost" size="small" className="auth-switch__button" type="button" onClick={onCreateAccount}>
            Create Account
          </Button>
        </p>
      </div>
    </main>
  )
}

export default Login