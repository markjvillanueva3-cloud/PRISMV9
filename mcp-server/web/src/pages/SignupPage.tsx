/**
 * Customer self-signup (LAUNCH-FE, 2026-06-23, slot:quebec).
 *
 * The backend register stack existed (POST /api/v1/auth/register -> AuthEngine.register)
 * but there was NO signup UI -- a launch blocker (no way to onboard a new customer).
 * On success the new account lands on the free Speed/Feed Calculator (the wave-1
 * product), NOT the employee shop-floor shell. Styling mirrors the sibling LoginPage.
 */
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 14,
  fontWeight: 500,
  color: 'var(--text-secondary, #94a3b8)',
  marginBottom: 8,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 64,
  fontSize: 18,
  padding: '0 16px',
  borderRadius: 8,
  border: '2px solid var(--border, #334155)',
  background: 'var(--bg-primary, #0f172a)',
  color: 'var(--text-primary, #f1f5f9)',
  marginBottom: 16,
  boxSizing: 'border-box',
};

export function SignupPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit =
    username.trim().length >= 3 && /.+@.+\..+/.test(email.trim()) && password.length >= 8;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!canSubmit) {
      setError('Enter a username (3+ characters), a valid email, and an 8+ character password.');
      return;
    }
    setLoading(true);
    try {
      await register(username.trim(), email.trim(), password);
      navigate('/speed-feed-calc', { replace: true });
    } catch (err) {
      setError((err as Error)?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--bg-primary, #0f172a)',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'var(--bg-secondary, #1e293b)',
          borderRadius: 16,
          padding: '48px 32px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        }}
      >
        <h1
          style={{
            textAlign: 'center',
            fontSize: 28,
            fontWeight: 700,
            color: 'var(--text-primary, #f1f5f9)',
            marginBottom: 8,
          }}
        >
          Create your Kienzle account
        </h1>
        <p
          style={{
            textAlign: 'center',
            fontSize: 14,
            color: 'var(--text-secondary, #94a3b8)',
            marginBottom: 32,
          }}
        >
          Start free -- 10 speed/feed calculations a day, no credit card.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="signup-username" style={labelStyle}>
            Username
          </label>
          <input
            id="signup-username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            style={inputStyle}
          />

          <label htmlFor="signup-email" style={labelStyle}>
            Email
          </label>
          <input
            id="signup-email"
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            style={inputStyle}
          />

          <label htmlFor="signup-password" style={labelStyle}>
            Password (8+ characters)
          </label>
          <input
            id="signup-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            style={{ ...inputStyle, marginBottom: 24 }}
          />

          {error && (
            <div
              role="alert"
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: 8,
                padding: '12px 16px',
                marginBottom: 16,
                color: '#fca5a5',
                fontSize: 14,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !canSubmit}
            style={{
              width: '100%',
              height: 64,
              fontSize: 18,
              fontWeight: 600,
              borderRadius: 8,
              border: 'none',
              background: loading || !canSubmit ? '#475569' : '#3b82f6',
              color: '#fff',
              cursor: loading ? 'wait' : canSubmit ? 'pointer' : 'not-allowed',
            }}
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p
          style={{
            textAlign: 'center',
            marginTop: 24,
            fontSize: 14,
            color: 'var(--text-secondary, #94a3b8)',
          }}
        >
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#3b82f6', fontWeight: 600 }}>
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
