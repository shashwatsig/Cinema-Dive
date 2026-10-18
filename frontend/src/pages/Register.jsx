import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import './Login.css'

const Register = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await register({ name, email, password })
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.')
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
          <h2>Dive Into Movies. Explore Every Episode.</h2>
          <p>Join Cinema Dive and start building your personal entertainment universe today.</p>
          <div className="auth-features">
            <span className="auth-feature-pill">🔥 Trending Movies & Shows</span>
            <span className="auth-feature-pill">📺 Season & Episode Details</span>
            <span className="auth-feature-pill">📋 Personal Watchlist</span>
            <span className="auth-feature-pill">♥ Save Favorites</span>
          </div>
        </aside>

        <section className="auth-card">
          <h3>Create account</h3>
          <p className="auth-sub">Free forever. No credit card needed.</p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Your name" />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} placeholder="Min. 6 characters" />
            </div>
            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </section>
      </div>
    </div>
  )
}

export default Register
