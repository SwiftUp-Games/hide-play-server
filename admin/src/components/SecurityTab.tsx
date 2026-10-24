import React, { useState, useRef } from 'react';
import { adminApi, getSavedPhone } from '../api';
import { 
  Key, 
  Server, 
  AlertCircle, 
  ExternalLink,
  CheckCircle2,
  RotateCcw
} from 'lucide-react';

interface Props {
  showToast: (msg: string, type?: 'success' | 'error') => void;
  onLogout: () => void;
}

// 10-Digit OTP Input Sub-Component
const OtpBoxGroup: React.FC<{
  digits: string[];
  onChange: (newDigits: string[]) => void;
  disabled?: boolean;
}> = ({ digits, onChange, disabled }) => {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleDigitChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, '').slice(-1);
    const updated = [...digits];
    updated[index] = clean;
    onChange(updated);

    if (clean && index < 9) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        const updated = [...digits];
        updated[index - 1] = '';
        onChange(updated);
        refs.current[index - 1]?.focus();
      } else {
        const updated = [...digits];
        updated[index] = '';
        onChange(updated);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 9) {
      refs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 10);
    if (!pasted) return;

    const updated = Array(10).fill('');
    for (let i = 0; i < pasted.length; i++) {
      updated[i] = pasted[i];
    }
    onChange(updated);

    const nextIndex = Math.min(pasted.length, 9);
    refs.current[nextIndex]?.focus();
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
      {/* First 5 digits */}
      <div style={{ display: 'flex', gap: '5px' }}>
        {digits.slice(0, 5).map((digit, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            disabled={disabled}
            value={digit}
            onChange={(e) => handleDigitChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            style={{
              width: '32px',
              height: '42px',
              textAlign: 'center',
              fontSize: '18px',
              fontFamily: 'var(--font-game)',
              color: 'var(--primary-gold)',
              background: digit ? 'rgba(255, 215, 82, 0.12)' : 'rgba(8, 20, 12, 0.8)',
              border: digit ? '2px solid var(--primary-gold)' : '1px solid var(--border-subtle)',
              borderRadius: '8px',
              outline: 'none',
              boxShadow: digit ? '0 0 10px rgba(255, 215, 82, 0.2)' : 'none',
              transition: 'all 0.15s ease'
            }}
          />
        ))}
      </div>

      <span style={{ color: 'var(--primary-gold)', fontWeight: 800, padding: '0 2px' }}>—</span>

      {/* Second 5 digits */}
      <div style={{ display: 'flex', gap: '5px' }}>
        {digits.slice(5, 10).map((digit, i) => {
          const idx = i + 5;
          return (
            <input
              key={idx}
              ref={(el) => { refs.current[idx] = el; }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              disabled={disabled}
              value={digit}
              onChange={(e) => handleDigitChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              onPaste={handlePaste}
              style={{
                width: '32px',
                height: '42px',
                textAlign: 'center',
                fontSize: '18px',
                fontFamily: 'var(--font-game)',
                color: 'var(--primary-gold)',
                background: digit ? 'rgba(255, 215, 82, 0.12)' : 'rgba(8, 20, 12, 0.8)',
                border: digit ? '2px solid var(--primary-gold)' : '1px solid var(--border-subtle)',
                borderRadius: '8px',
                outline: 'none',
                boxShadow: digit ? '0 0 10px rgba(255, 215, 82, 0.2)' : 'none',
                transition: 'all 0.15s ease'
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

export const SecurityTab: React.FC<Props> = ({ showToast, onLogout }) => {
  const currentPhone = getSavedPhone() || '8606094557';
  const [newDigits, setNewDigits] = useState<string[]>(Array(10).fill(''));
  const [confirmDigits, setConfirmDigits] = useState<string[]>(Array(10).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const newCode = newDigits.join('');
  const confirmCode = confirmDigits.join('');
  const isMatch = newCode.length === 10 && newCode === confirmCode;

  const handleUpdateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newCode.length !== 10) {
      setError('New authentication code must be exactly 10 digits.');
      return;
    }
    if (newCode !== confirmCode) {
      setError('Confirmation code does not match.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.updateAdminCode(newCode);
      if (res.success) {
        showToast(`Admin authentication code updated to ${newCode}. Please log in with the new code.`, 'success');
        onLogout();
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update authentication code');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = () => {
    setNewDigits(Array(10).fill(''));
    setConfirmDigits(Array(10).fill(''));
    setError(null);
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '820px' }}>
      {/* Top Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontFamily: 'var(--font-game)', fontSize: '24px', color: 'var(--primary-gold)' }}>
          ADMIN SECURITY & STUDIO SETTINGS
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Manage your 10-digit OTP authentication code and inspect relay server diagnostics.
        </p>
      </div>

      {/* 1. Change 10-Digit OTP Code */}
      <div className="glass-panel glass-panel-gold" style={{ padding: '26px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Key size={20} color="var(--primary-gold)" />
            <h3 style={{ fontSize: '17px', fontWeight: 700 }}>
              Change 10-Digit Authentication Code
            </h3>
          </div>
          {(newCode.length > 0 || confirmCode.length > 0) && (
            <button
              type="button"
              onClick={handleClearAll}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-dim)',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer'
              }}
            >
              <RotateCcw size={12} />
              <span>Reset Fields</span>
            </button>
          )}
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '22px' }}>
          Current Active Master Code: <strong style={{ color: 'var(--primary-gold)', letterSpacing: '1px' }}>{currentPhone}</strong>. 
          Updating this code will require you to log in with the new 10-digit number.
        </p>

        <form onSubmit={handleUpdateCode}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', marginBottom: '20px' }}>
            {/* New Code Slots */}
            <div>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                <span>Enter New 10-Digit Code</span>
                <span style={{ color: 'var(--text-dim)' }}>{newCode.length}/10</span>
              </label>
              <OtpBoxGroup
                digits={newDigits}
                onChange={(d) => { setNewDigits(d); setError(null); }}
                disabled={loading}
              />
            </div>

            {/* Confirm Code Slots */}
            <div>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                <span>Confirm New 10-Digit Code</span>
                <span style={{ color: isMatch ? 'var(--accent-green)' : 'var(--text-dim)' }}>
                  {isMatch ? '✓ Matched' : `${confirmCode.length}/10`}
                </span>
              </label>
              <OtpBoxGroup
                digits={confirmDigits}
                onChange={(d) => { setConfirmDigits(d); setError(null); }}
                disabled={loading}
              />
            </div>
          </div>

          {/* Match Alert */}
          {isMatch && (
            <div style={{
              background: 'rgba(46, 204, 113, 0.12)',
              border: '1px solid rgba(46, 204, 113, 0.35)',
              color: 'var(--accent-green)',
              padding: '10px 14px',
              borderRadius: '10px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '18px'
            }}>
              <CheckCircle2 size={16} />
              <span>10-digit code verified and confirmed: <strong>{newCode}</strong></span>
            </div>
          )}

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
              marginBottom: '18px'
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !isMatch}
            className="btn-gold"
            style={{
              opacity: (loading || !isMatch) ? 0.5 : 1,
              cursor: (loading || !isMatch) ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Updating Code...' : 'Save New 10-Digit OTP Code'}
          </button>
        </form>
      </div>

      {/* 2. System Diagnostics */}
      <div className="glass-panel" style={{ padding: '26px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Server size={20} color="var(--accent-blue)" />
          <h3 style={{ fontSize: '17px', fontWeight: 700 }}>
            Server Diagnostics & Quick API Endpoints
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
          <div style={{ background: 'rgba(8, 18, 12, 0.6)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>SERVER DEPLOYMENT</span>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-green)', marginTop: '2px' }}>
              Render Cloud (Asia-South)
            </div>
          </div>

          <div style={{ background: 'rgba(8, 18, 12, 0.6)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>WEBSOCKET RELAY</span>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary-gold)', marginTop: '2px' }}>
              wss://hide-play-server.onrender.com
            </div>
          </div>

          <div style={{ background: 'rgba(8, 18, 12, 0.6)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>GODOT ENGINE SUPPORT</span>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-blue)', marginTop: '2px' }}>
              v4.7.2 Android / iOS / Web
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <a
            href="/health"
            target="_blank"
            rel="noreferrer"
            className="btn-ghost"
            style={{ textDecoration: 'none', fontSize: '13px' }}
          >
            <span>Inspect /health Endpoint</span>
            <ExternalLink size={14} />
          </a>

          <a
            href="/api/game/config"
            target="_blank"
            rel="noreferrer"
            className="btn-ghost"
            style={{ textDecoration: 'none', fontSize: '13px' }}
          >
            <span>Live Mobile Client Config (/api/game/config)</span>
            <ExternalLink size={14} />
          </a>

          <a
            href="/rooms"
            target="_blank"
            rel="noreferrer"
            className="btn-ghost"
            style={{ textDecoration: 'none', fontSize: '13px' }}
          >
            <span>Public Rooms Directory (/rooms)</span>
            <ExternalLink size={14} />
          </a>
        </div>
      </div>

    </div>
  );
};
