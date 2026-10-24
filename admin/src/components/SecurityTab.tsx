import React, { useState } from 'react';
import { adminApi, getSavedPhone } from '../api';
import { 
  Key, 
  Server, 
  AlertCircle, 
  ExternalLink 
} from 'lucide-react';

interface Props {
  showToast: (msg: string, type?: 'success' | 'error') => void;
  onLogout: () => void;
}

export const SecurityTab: React.FC<Props> = ({ showToast, onLogout }) => {
  const currentPhone = getSavedPhone() || '9876543210';
  const [newMobile, setNewMobile] = useState('');
  const [confirmMobile, setConfirmMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpdateMobile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMobile.length !== 10) {
      setError('Mobile number must be exactly 10 digits.');
      return;
    }
    if (newMobile !== confirmMobile) {
      setError('Mobile numbers do not match.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.updateAdminMobile(newMobile);
      if (res.success) {
        showToast(`Admin mobile code updated to ${newMobile}. Please log in with the new code.`, 'success');
        onLogout();
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update mobile code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px' }}>
      {/* Top Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontFamily: 'var(--font-game)', fontSize: '24px', color: 'var(--primary-gold)' }}>
          ADMIN SECURITY & STUDIO SETTINGS
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Manage your 10-digit mobile authentication code and inspect relay server diagnostics.
        </p>
      </div>

      {/* 1. Change Mobile Code */}
      <div className="glass-panel glass-panel-gold" style={{ padding: '26px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Key size={20} color="var(--primary-gold)" />
          <h3 style={{ fontSize: '17px', fontWeight: 700 }}>
            Change 10-Digit Mobile Authentication Code
          </h3>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '18px' }}>
          Current Admin Code: <strong style={{ color: 'var(--primary-gold)' }}>+91 {currentPhone}</strong>. 
          Updating this will require you to log in with the new 10-digit number.
        </p>

        <form onSubmit={handleUpdateMobile}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                New 10-Digit Mobile Number
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', fontSize: '13px', fontWeight: 600 }}>
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="9876543210"
                  value={newMobile}
                  onChange={(e) => {
                    setNewMobile(e.target.value.replace(/\D/g, '').slice(0, 10));
                    setError(null);
                  }}
                  style={{ width: '100%', paddingLeft: '44px', fontWeight: 700, letterSpacing: '1px' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Confirm New Mobile Number
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', fontSize: '13px', fontWeight: 600 }}>
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="9876543210"
                  value={confirmMobile}
                  onChange={(e) => {
                    setConfirmMobile(e.target.value.replace(/\D/g, '').slice(0, 10));
                    setError(null);
                  }}
                  style={{ width: '100%', paddingLeft: '44px', fontWeight: 700, letterSpacing: '1px' }}
                />
              </div>
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
            disabled={loading || newMobile.length !== 10}
            className="btn-gold"
          >
            {loading ? 'Updating Code...' : 'Update Authentication Code'}
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
