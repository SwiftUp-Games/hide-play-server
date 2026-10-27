import React, { useState, useRef, useEffect } from 'react';
import { adminApi } from '../api';
import { KeyRound, AlertCircle, ArrowRight, RotateCcw } from 'lucide-react';

interface Props {
  onLoginSuccess: (code: string) => void;
}

export const LoginModal: React.FC<Props> = ({ onLoginSuccess }) => {
  const [digits, setDigits] = useState<string[]>(Array(10).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus the first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const fullCode = digits.join('');

  const submitCode = async (codeToSubmit: string) => {
    if (codeToSubmit.length !== 10) {
      setError('Please enter the complete 10-digit authentication code.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.login(codeToSubmit);
      if (res.success) {
        onLoginSuccess(codeToSubmit);
      } else {
        setError(res.message || 'Invalid 10-digit authentication code.');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify the 10-digit code.');
    } finally {
      setLoading(false);
    }
  };

  const handleDigitChange = (index: number, value: string) => {
    setError(null);
    const cleanDigit = value.replace(/\D/g, '').slice(-1);

    const newDigits = [...digits];
    newDigits[index] = cleanDigit;
    setDigits(newDigits);

    if (cleanDigit) {
      // Advance to next box if available
      if (index < 9) {
        inputRefs.current[index + 1]?.focus();
      } else {
        // If 10th digit is filled, auto-verify!
        const completeCode = newDigits.join('');
        if (completeCode.length === 10) {
          submitCode(completeCode);
        }
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 9) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 10);
    if (!pasted) return;

    const newDigits = Array(10).fill('');
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);

    const nextIndex = Math.min(pasted.length, 9);
    inputRefs.current[nextIndex]?.focus();

    if (pasted.length === 10) {
      submitCode(pasted);
    }
  };

  const handleClear = () => {
    setDigits(Array(10).fill(''));
    setError(null);
    inputRefs.current[0]?.focus();
  };

  return (
    <div className="modal-overlay">
      <div 
        className="glass-panel glass-panel-gold animate-fade-in" 
        style={{
          width: '100%',
          maxWidth: '520px',
          padding: '36px 28px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.85), 0 0 50px rgba(255, 215, 82, 0.15)',
          borderRadius: '24px'
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '26px' }}>
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
            fontWeight: 700, 
            color: 'var(--accent-green)',
            letterSpacing: '0.8px',
            textTransform: 'uppercase',
            marginTop: '2px'
          }}>
            Studio Creator Admin Panel
          </p>
        </div>

        {/* Security Badge */}
        <div style={{
          background: 'rgba(46, 204, 113, 0.08)',
          border: '1px solid rgba(46, 204, 113, 0.25)',
          borderRadius: '12px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          marginBottom: '26px'
        }}>
          <KeyRound size={18} color="var(--primary-gold)" />
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
            Enter 10-Digit OTP Authentication Code
          </span>
        </div>

        {/* 10-Digit OTP Column Grid */}
        <form onSubmit={(e) => { e.preventDefault(); submitCode(fullCode); }}>
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              flexWrap: 'nowrap'
            }}>
              {/* First 5 digits */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {digits.slice(0, 5).map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onPaste={handlePaste}
                    style={{
                      width: '38px',
                      height: '50px',
                      textAlign: 'center',
                      fontSize: '22px',
                      fontFamily: 'var(--font-game)',
                      color: 'var(--primary-gold)',
                      background: digit ? 'rgba(255, 215, 82, 0.12)' : 'rgba(10, 25, 16, 0.8)',
                      border: digit ? '2px solid var(--primary-gold)' : '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      outline: 'none',
                      boxShadow: digit ? '0 0 12px rgba(255, 215, 82, 0.25)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  />
                ))}
              </div>

              {/* Separator dash */}
              <div style={{
                color: 'var(--primary-gold)',
                fontWeight: 900,
                fontSize: '20px',
                padding: '0 2px'
              }}>
                —
              </div>

              {/* Last 5 digits */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {digits.slice(5, 10).map((digit, i) => {
                  const idx = i + 5;
                  return (
                    <input
                      key={idx}
                      ref={(el) => { inputRefs.current[idx] = el; }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      onPaste={handlePaste}
                      style={{
                        width: '38px',
                        height: '50px',
                        textAlign: 'center',
                        fontSize: '22px',
                        fontFamily: 'var(--font-game)',
                        color: 'var(--primary-gold)',
                        background: digit ? 'rgba(255, 215, 82, 0.12)' : 'rgba(10, 25, 16, 0.8)',
                        border: digit ? '2px solid var(--primary-gold)' : '1px solid var(--border-subtle)',
                        borderRadius: '10px',
                        outline: 'none',
                        boxShadow: digit ? '0 0 12px rgba(255, 215, 82, 0.25)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Helper status text */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginTop: '12px',
              padding: '0 4px'
            }}>
              <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                {fullCode.length}/10 digits entered
              </span>
              {fullCode.length > 0 && (
                <button
                  type="button"
                  onClick={handleClear}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-dim)',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  <RotateCcw size={12} />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>

          {/* Error Message */}
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

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || fullCode.length !== 10}
            className="btn-gold"
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '14px',
              fontSize: '16px',
              opacity: (loading || fullCode.length !== 10) ? 0.5 : 1,
              cursor: (loading || fullCode.length !== 10) ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Verifying OTP...' : (
              <>
                <span>Authenticate & Enter Studio</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
