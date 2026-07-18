/**
 * EMP-MS0 U-AUTH2: Login Page
 * Touch-friendly (72px inputs), barcode scanner support,
 * role-based redirect after login.
 */
import { useState, useRef, useEffect, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { login, isAuthenticated, clearance_level } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const scannerRef = useRef<HTMLInputElement>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const target = clearance_level === 'shop_floor' ? '/shop-clock' : '/dashboard';
      navigate(target, { replace: true });
    }
  }, [isAuthenticated, clearance_level, navigate]);

  // Auto-focus hidden scanner input for barcode badge scan
  useEffect(() => {
    scannerRef.current?.focus();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      // useEffect handles redirect
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // Barcode scanner emulates keyboard — capture rapid input
  const handleScannerInput = (value: string) => {
    if (value.length >= 6) {
      setUsername(value);
      scannerRef.current!.value = '';
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--bg-primary, #0f172a)',
      padding: '24px',
    }}>
      {/* Hidden barcode scanner input */}
      <input
        ref={scannerRef}
        style={{ position: 'absolute', left: -9999, opacity: 0 }}
        onChange={(e) => handleScannerInput(e.target.value)}
        tabIndex={-1}
        aria-hidden="true"
      />

      <div style={{
        width: '100%',
        maxWidth: 420,
        background: 'var(--bg-secondary, #1e293b)',
        borderRadius: 16,
        padding: '48px 32px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
      }}>
        <h1 style={{
          textAlign: 'center',
          fontSize: 28,
          fontWeight: 700,
          color: 'var(--text-primary, #f1f5f9)',
          marginBottom: 8,
        }}>
          Kienzle
        </h1>
        <p style={{
          textAlign: 'center',
          fontSize: 14,
          color: 'var(--text-secondary, #94a3b8)',
          marginBottom: 32,
        }}>
          Manufacturing Intelligence Platform
        </p>

        <form onSubmit={handleSubmit}>
          <label style={{
            display: 'block',
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--text-secondary, #94a3b8)',
            marginBottom: 8,
          }}>
            Username or Badge ID
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            style={{
              width: '100%',
              height: 72,
              fontSize: 20,
              padding: '0 16px',
              borderRadius: 8,
              border: '2px solid var(--border, #334155)',
              background: 'var(--bg-primary, #0f172a)',
              color: 'var(--text-primary, #f1f5f9)',
              marginBottom: 16,
              boxSizing: 'border-box',
            }}
          />

          <label style={{
            display: 'block',
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--text-secondary, #94a3b8)',
            marginBottom: 8,
          }}>
            Password or PIN
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            style={{
              width: '100%',
              height: 72,
              fontSize: 20,
              padding: '0 16px',
              borderRadius: 8,
              border: '2px solid var(--border, #334155)',
              background: 'var(--bg-primary, #0f172a)',
              color: 'var(--text-primary, #f1f5f9)',
              marginBottom: 24,
              boxSizing: 'border-box',
            }}
          />

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 16,
              color: '#fca5a5',
              fontSize: 14,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username}
            style={{
              width: '100%',
              height: 64,
              fontSize: 18,
              fontWeight: 600,
              borderRadius: 8,
              border: 'none',
              background: loading ? '#475569' : '#3b82f6',
              color: '#fff',
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{
          textAlign: 'center',
          marginTop: 20,
          fontSize: 14,
          color: 'var(--text-secondary, #94a3b8)',
        }}>
          New to Kienzle?{' '}
          <Link to="/signup" style={{ color: '#3b82f6', fontWeight: 600 }}>
            Create an account
          </Link>
        </p>

        <p style={{
          textAlign: 'center',
          marginTop: 16,
          fontSize: 13,
          color: 'var(--text-secondary, #64748b)',
        }}>
          Scan your badge or enter credentials
        </p>
      </div>
    </div>
  );
}
