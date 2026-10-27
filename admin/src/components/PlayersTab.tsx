import React, { useState, useEffect } from 'react';
import type { PlayerAccount } from '../types';
import { adminApi } from '../api';
import { 
  Search, 
  Coins, 
  Shirt, 
  Trash2, 
  RefreshCw, 
  Smartphone,
  Gift,
  Users
} from 'lucide-react';

interface Props {
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const PlayersTab: React.FC<Props> = ({ showToast }) => {
  const [players, setPlayers] = useState<PlayerAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [coinModalPlayer, setCoinModalPlayer] = useState<PlayerAccount | null>(null);
  const [coinAmount, setCoinAmount] = useState<number>(500);
  const [coinMode, setCoinMode] = useState<'add' | 'set'>('add');

  const [unlockModalPlayer, setUnlockModalPlayer] = useState<PlayerAccount | null>(null);
  const [unlockType, setUnlockType] = useState<'avatar' | 'hat' | 'dress'>('avatar');
  const [unlockId, setUnlockId] = useState<string>('police');

  const loadPlayers = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getPlayers();
      setPlayers(res.players);
    } catch (err: any) {
      showToast(err.message || 'Failed to load players', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlayers();
  }, []);

  const handleAdjustCoins = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coinModalPlayer) return;

    try {
      const res = await adminApi.adjustPlayerCoins(coinModalPlayer.id, coinAmount, coinMode);
      if (res.success) {
        showToast(
          coinMode === 'add' 
            ? `Added ${coinAmount} coins to ${coinModalPlayer.name}. New total: ${res.new_coins}`
            : `Set ${coinModalPlayer.name}'s coins to ${res.new_coins}`,
          'success'
        );
        setCoinModalPlayer(null);
        loadPlayers();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to adjust coins', 'error');
    }
  };

  const handleUnlockItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockModalPlayer) return;

    try {
      const res = await adminApi.unlockPlayerItem(unlockModalPlayer.id, unlockType, unlockId);
      if (res.success) {
        showToast(`Unlocked ${unlockId} for ${unlockModalPlayer.name}!`, 'success');
        setUnlockModalPlayer(null);
        loadPlayers();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to unlock item', 'error');
    }
  };

  const handleDeletePlayer = async (p: PlayerAccount) => {
    if (!confirm(`Are you sure you want to permanently delete player ${p.name} (${p.id})?`)) return;
    try {
      await adminApi.deletePlayer(p.id);
      showToast(`Player ${p.name} deleted.`, 'success');
      loadPlayers();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete player', 'error');
    }
  };

  const filteredPlayers = players.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.mobile_number && p.mobile_number.includes(searchTerm))
  );

  const AVAILABLE_AVATARS = [
    'boy_default', 'girl_default', 'police', 'pilot', 'suit', 
    'pirate', 'traditional', 'ninja', 'schoolboy', 'athlete', 'girl_artist', 'explorer'
  ];

  const AVAILABLE_HATS = ['hat_none', 'hat_cap', 'hat_flower', 'hat_turban', 'hat_crown'];
  const AVAILABLE_DRESSES = ['dress_mundu', 'dress_jersey', 'dress_sari', 'dress_suit'];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px' 
      }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-game)', fontSize: '24px', color: 'var(--primary-gold)' }}>
            PLAYERS & ACCOUNTS DIRECTORY
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Manage player balances, inspect stats, grant coins, and unlock wardrobe items.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ position: 'relative', width: '260px' }}>
            <Search 
              size={16} 
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} 
            />
            <input
              type="text"
              placeholder="Search player, ID, mobile..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', paddingLeft: '36px', fontSize: '13px' }}
            />
          </div>

          <button onClick={loadPlayers} disabled={loading} className="btn-ghost" title="Refresh Players">
            <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {/* Players List Table */}
      <div className="glass-panel" style={{ overflowX: 'auto', padding: '6px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '760px' }}>
          <thead>
            <tr style={{ 
              borderBottom: '1px solid var(--border-subtle)', 
              color: 'var(--text-muted)',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              <th style={{ padding: '14px 16px' }}>Player</th>
              <th style={{ padding: '14px 16px' }}>Balance (🪙 / 💎)</th>
              <th style={{ padding: '14px 16px' }}>Stats</th>
              <th style={{ padding: '14px 16px' }}>Wardrobe Unlocks</th>
              <th style={{ padding: '14px 16px' }}>Last Active</th>
              <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPlayers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted)' }}>
                  {loading ? (
                    'Fetching player profiles...'
                  ) : players.length === 0 ? (
                    <div>
                      <Users size={32} style={{ opacity: 0.5, marginBottom: '8px', display: 'block', margin: '0 auto 8px' }} />
                      <p style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '15px' }}>0 Player Accounts Registered</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
                        Player profiles appear dynamically the moment users launch Hide & Play on their devices.
                      </p>
                    </div>
                  ) : (
                    'No players found matching search query.'
                  )}
                </td>
              </tr>
            ) : (
              filteredPlayers.map(p => {
                const winRate = p.matches_played > 0 ? Math.round((p.matches_won / p.matches_played) * 100) : 0;
                return (
                  <tr 
                    key={p.id}
                    style={{ 
                      borderBottom: '1px solid rgba(46, 204, 113, 0.08)',
                      transition: 'background 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Player Info */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '12px',
                          background: 'rgba(255, 215, 82, 0.1)',
                          border: '1px solid rgba(255, 215, 82, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '22px'
                        }}>
                          {p.avatar.includes('girl') ? '👧' : (p.avatar.includes('ninja') ? '🥷' : '👦')}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-main)' }}>
                              {p.name}
                            </span>
                            {p.platform && (
                              <span className="badge badge-blue" style={{ fontSize: '10px', padding: '2px 6px' }}>
                                {p.platform.includes('android') ? 'Android' : (p.platform.includes('ios') ? 'iOS' : p.platform)}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>ID: {p.id}</span>
                            {p.mobile_number && (
                              <span style={{ color: 'var(--accent-green)' }}>
                                <Smartphone size={10} style={{ display: 'inline' }} /> {p.mobile_number}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Coins & Diamonds */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ 
                        fontFamily: 'var(--font-game)', 
                        fontSize: '17px', 
                        color: 'var(--primary-gold)' 
                      }}>
                        🪙 {p.coins.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '12px', color: '#60a5fa', fontWeight: 600, marginTop: '2px' }}>
                        💎 {(p.diamonds || 0).toLocaleString()}
                      </div>
                    </td>

                    {/* Stats */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontSize: '13px' }}>
                        <span>{p.matches_won}W / {p.matches_played}M</span>
                        <span style={{ marginLeft: '6px', color: 'var(--accent-green)', fontWeight: 600 }}>
                          ({winRate}%)
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                        High Score: {p.high_score} pts
                      </div>
                    </td>

                    {/* Wardrobe */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <span className="badge badge-gold" style={{ fontSize: '11px' }}>
                          {p.unlocked_avatars?.length || 2} Avatars
                        </span>
                        <span className="badge badge-blue" style={{ fontSize: '11px' }}>
                          {p.unlocked_hats?.length || 1} Hats
                        </span>
                        <span className="badge badge-green" style={{ fontSize: '11px' }}>
                          {p.unlocked_dresses?.length || 1} Dresses
                        </span>
                      </div>
                    </td>

                    {/* Last Active */}
                    <td style={{ padding: '14px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      {new Date(p.last_active_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                        {new Date(p.last_active_at).toLocaleDateString()}
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          onClick={() => {
                            setCoinModalPlayer(p);
                            setCoinAmount(500);
                            setCoinMode('add');
                          }}
                          className="btn-gold"
                          style={{ padding: '6px 10px', fontSize: '12px' }}
                          title="Grant or adjust coins"
                        >
                          <Coins size={14} />
                          <span>Coins</span>
                        </button>

                        <button
                          onClick={() => {
                            setUnlockModalPlayer(p);
                            setUnlockType('avatar');
                            setUnlockId('police');
                          }}
                          className="btn-ghost"
                          style={{ padding: '6px 10px', fontSize: '12px' }}
                          title="Unlock wardrobe items"
                        >
                          <Gift size={14} color="var(--accent-emerald)" />
                          <span>Unlock</span>
                        </button>

                        <button
                          onClick={() => handleDeletePlayer(p)}
                          className="btn-danger"
                          style={{ padding: '6px 8px' }}
                          title="Delete player profile"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Adjust Coins Modal */}
      {coinModalPlayer && (
        <div className="modal-overlay">
          <div className="glass-panel glass-panel-gold animate-fade-in" style={{ width: '100%', maxWidth: '420px', padding: '26px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Coins size={22} color="var(--primary-gold)" />
                <h3 style={{ fontFamily: 'var(--font-game)', fontSize: '20px', color: 'var(--primary-gold)' }}>
                  ADJUST COINS
                </h3>
              </div>
              <button onClick={() => setCoinModalPlayer(null)} className="btn-ghost" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Modifying coin balance for <strong>{coinModalPlayer.name}</strong> (Current: {coinModalPlayer.coins.toLocaleString()} 🪙)
            </p>

            <form onSubmit={handleAdjustCoins}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <button
                  type="button"
                  onClick={() => setCoinMode('add')}
                  className={coinMode === 'add' ? 'btn-gold' : 'btn-ghost'}
                  style={{ flex: 1, justifyContent: 'center', fontSize: '13px' }}
                >
                  ➕ Add Coins
                </button>
                <button
                  type="button"
                  onClick={() => setCoinMode('set')}
                  className={coinMode === 'set' ? 'btn-gold' : 'btn-ghost'}
                  style={{ flex: 1, justifyContent: 'center', fontSize: '13px' }}
                >
                  🎯 Set Exact
                </button>
              </div>

              {/* Quick Pick Chips */}
              {coinMode === 'add' && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  {[100, 500, 1000, 5000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCoinAmount(amt)}
                      className="btn-ghost"
                      style={{ 
                        flex: '1 1 40px', 
                        justifyContent: 'center', 
                        fontSize: '12px',
                        borderColor: coinAmount === amt ? 'var(--primary-gold)' : undefined,
                        background: coinAmount === amt ? 'rgba(255, 215, 82, 0.15)' : undefined 
                      }}
                    >
                      +{amt}
                    </button>
                  ))}
                </div>
              )}

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  {coinMode === 'add' ? 'Amount to Add (or negative to deduct)' : 'Exact Coin Balance Target'}
                </label>
                <input
                  type="number"
                  value={coinAmount}
                  onChange={(e) => setCoinAmount(parseInt(e.target.value) || 0)}
                  style={{ width: '100%', fontSize: '18px', fontWeight: 700 }}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setCoinModalPlayer(null)} className="btn-ghost">
                  Cancel
                </button>
                <button type="submit" className="btn-gold">
                  Save Balance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unlock Wardrobe Modal */}
      {unlockModalPlayer && (
        <div className="modal-overlay">
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '420px', padding: '26px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shirt size={22} color="var(--accent-emerald)" />
                <h3 style={{ fontFamily: 'var(--font-game)', fontSize: '20px', color: 'var(--accent-emerald)' }}>
                  UNLOCK WARDROBE
                </h3>
              </div>
              <button onClick={() => setUnlockModalPlayer(null)} className="btn-ghost" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Grant special unlocked hero avatar, hat, or dress to <strong>{unlockModalPlayer.name}</strong>.
            </p>

            <form onSubmit={handleUnlockItem}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Category
                </label>
                <select
                  value={unlockType}
                  onChange={(e) => {
                    const t = e.target.value as any;
                    setUnlockType(t);
                    setUnlockId(t === 'avatar' ? 'police' : (t === 'hat' ? 'hat_crown' : 'dress_suit'));
                  }}
                  style={{ width: '100%' }}
                >
                  <option value="avatar">Avatar Character</option>
                  <option value="hat">Hat / Headwear</option>
                  <option value="dress">Dress / Outfit</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Select Item
                </label>
                <select
                  value={unlockId}
                  onChange={(e) => setUnlockId(e.target.value)}
                  style={{ width: '100%' }}
                >
                  {unlockType === 'avatar' && AVAILABLE_AVATARS.map(a => (
                    <option key={a} value={a}>{a.replace('_', ' ').toUpperCase()}</option>
                  ))}
                  {unlockType === 'hat' && AVAILABLE_HATS.map(h => (
                    <option key={h} value={h}>{h.replace('_', ' ').toUpperCase()}</option>
                  ))}
                  {unlockType === 'dress' && AVAILABLE_DRESSES.map(d => (
                    <option key={d} value={d}>{d.replace('_', ' ').toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setUnlockModalPlayer(null)} className="btn-ghost">
                  Cancel
                </button>
                <button type="submit" className="btn-green">
                  Grant Unlock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
