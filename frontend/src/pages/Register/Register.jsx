import { useState } from 'react'
import { Button, Card, Input } from '../../components/ui'
import './Register.css'

/** Registration view for new Chess Cure players. */
function Register({ onLogin }) {
  const [formValues, setFormValues] = useState({ password: '', confirmPassword: '' })

  const handleChange = (event) => {
    setFormValues((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
  }

  return (
    <main className="auth-page auth-page--register">
      <div className="auth-shell">
        <a className="auth-hero" href="/" aria-label="Chess Cure home">
          <span className="auth-hero__mark" aria-hidden="true">♞</span>
          <span className="auth-hero__title">Chess Cure</span>
          <span className="auth-hero__subtitle">Create your player account.</span>
        </a>

        <Card className="auth-card" padding="large">
          <div className="auth-card__intro">
            <p className="auth-card__eyebrow">Your board awaits</p>
            <h1>Start your chess journey</h1>
            <p>Build your profile and make your first move.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <Input label="Username" name="username" placeholder="Choose a username" autoComplete="username" required />
            <Input label="Email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
            <Input label="Password" name="password" type="password" placeholder="Create a password" autoComplete="new-password" value={formValues.password} onChange={handleChange} required />
            <Input label="Confirm Password" name="confirmPassword" type="password" placeholder="Repeat your password" autoComplete="new-password" value={formValues.confirmPassword} onChange={handleChange} required />
            <Button type="submit" size="large" fullWidth>Create Account</Button>
          </form>
        </Card>

        <p className="auth-switch">
          Already have an account?{' '}
          <Button variant="ghost" size="small" className="auth-switch__button" type="button" onClick={onLogin}>Login</Button>
        </p>
      </div>
    </main>
  )
}

export default Register