import React, { useState } from 'react';
import { adminApi } from '../api';
import { ShieldCheck, Smartphone, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';

interface Props {
  onLoginSuccess: (mobile: string) => void;
}

export const LoginModal: React.FC<Props> = ({ onLoginSuccess }) => {
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDigitsOnly = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setMobile(val);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mobile.length !== 10) {
      setError('Please enter your 10-digit mobile authentication number.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.login(mobile);
      if (res.success) {
        onLoginSuccess(mobile);
      } else {
        setError(res.message || 'Invalid mobile authentication code.');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify the code.');
    } finally {
      setLoading(false);
    }
  };

  const handleUseDefault = () => {
    setMobile('9876543210');
    setError(null);
  };

  return (
    <div className="modal-overlay">
      <div 
        className="glass-panel glass-panel-gold animate-fade-in" 
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '36px 32px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.8), 0 0 40px rgba(255, 215, 82, 0.12)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ 
            fontSize: '48px', 
            marginBottom: '8px', 
            display: 'inline-block',
            animation: 'floatGentle 3s ease-in-out infinite' 
          }}>
            🌴
          </div>
          <h1 style={{ 
            fontFamily: 'var(--font-game)', 
            fontSize: '28px', 
            color: 'var(--primary-gold)',
            letterSpacing: '1px'
          }}>
            HIDE & PLAY
          </h1>
          <p style={{ 
            fontSize: '13px', 
            fontWeight: 600, 
            color: 'var(--accent-green)',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            marginTop: '2px'
          }}>
            Creator & Studio Admin Panel
          </p>
        </div>

        <div style={{
          background: 'rgba(46, 204, 113, 0.08)',
          border: '1px solid rgba(46, 204, 113, 0.25)',
          borderRadius: '12px',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '22px'
        }}>
          <ShieldCheck size={20} color="var(--accent-green)" />
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Code-Based 10-Digit Mobile Authentication
          </span>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '18px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '13px', 
              fontWeight: 600, 
              color: 'var(--text-muted)',
              marginBottom: '8px'
            }}>
              Enter 10-Digit Mobile Number
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{ 
                position: 'absolute', 
                left: '14px', 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: 'var(--text-dim)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Smartphone size={18} />
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>+91</span>
              </div>
              <input
                type="tel"
                value={mobile}
                onChange={handleDigitsOnly}
                placeholder="98765 43210"
                autoFocus
                style={{
                  width: '100%',
                  paddingLeft: '72px',
                  fontSize: '18px',
                  fontWeight: 700,
                  letterSpacing: '2px',
                  textAlign: 'left'
                }}
              />
            </div>
          </div>

          {error && (
            <div style={{
              background: 'rgba(231, 76, 60, 0.15)',
              border: '1px solid rgba(231, 76, 60, 0.35)',
              color: 'var(--accent-red)',
              padding: '10px 14px',
              borderRadius: '10px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px'
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || mobile.length !== 10}
            className="btn-gold"
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '14px',
              fontSize: '16px',
              opacity: (loading || mobile.length !== 10) ? 0.6 : 1
            }}
          >
            {loading ? 'Verifying Code...' : (
              <>
                <span>Access Admin Studio</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div style={{ 
          marginTop: '22px', 
          paddingTop: '16px', 
          borderTop: '1px solid var(--border-subtle)',
          textAlign: 'center' 
        }}>
          <button
            type="button"
            onClick={handleUseDefault}
            style={{
              background: 'transparent',
              color: 'var(--text-muted)',
              fontSize: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Sparkles size={14} color="var(--primary-gold)" />
            <span>Use Default Test Mobile Code (9876543210)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
