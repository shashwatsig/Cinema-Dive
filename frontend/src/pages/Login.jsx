import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import './Login.css'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <aside className="auth-visual">
          <div className="auth-brand">
            <span className="auth-brand-icon">🎬</span>
            <span className="auth-brand-name">Cinema<span>Dive</span></span>
          </div>
          <h2>Your personal movie universe awaits.</h2>
          <p>Track what you watch, discover what's next, and explore every episode.</p>
          <div className="auth-features">
            <span className="auth-feature-pill">🎬 Movies & TV Shows</span>
            <span className="auth-feature-pill">📋 Personal Watchlist</span>
            <span className="auth-feature-pill">♥ Favorites</span>
            <span className="auth-feature-pill">📺 Episode Ratings</span>
          </div>
        </aside>

        <section className="auth-card">
          <h3>Sign in</h3>
          <p className="auth-sub">Welcome back to Cinema Dive</p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
            </div>
            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="auth-switch">
            Don't have an account? <Link to="/register">Create one</Link>
          </p>
        </section>
      </div>
    </div>
  )
}

export default Login
