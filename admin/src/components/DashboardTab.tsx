import React from 'react';
import type { DashboardData } from '../types';
import { adminApi } from '../api';
import { 
  Users, 
  Gamepad2, 
  Coins, 
  RefreshCw, 
  Sparkles, 
  Tv, 
  Layers,
  Activity,
  ShoppingBag,
  Trophy,
  PlayCircle,
  UserPlus
} from 'lucide-react';

interface Props {
  data: DashboardData | null;
  loading: boolean;
  onRefresh: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const DashboardTab: React.FC<Props> = ({ data, loading, onRefresh, showToast }) => {
  if (!data) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
        <RefreshCw size={32} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '14px' }}>Loading Live Game Data...</p>
      </div>
    );
  }

  const handleCloseRoom = async (code: string) => {
    if (!confirm(`Are you sure you want to force-close room ${code}?`)) return;
    try {
      await adminApi.closeRoom(code);
      showToast(`Room ${code} closed successfully.`, 'success');
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to close room', 'error');
    }
  };

  const { live, player_metrics, economy_metrics, monetization_metrics } = data;

  return (
    <div className="animate-fade-in">
      {/* Top Header Bar */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '12px' 
      }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-game)', fontSize: '24px', color: 'var(--primary-gold)' }}>
            LIVE STUDIO DASHBOARD
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Real-time server analytics, active multiplayer arenas, and in-game economy.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="badge badge-green">
            <span className="live-beacon"></span>
            <span>{live.region}</span>
          </div>
          <button 
            onClick={onRefresh} 
            disabled={loading}
            className="btn-ghost"
            title="Refresh Live Metrics"
          >
            <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
        gap: '18px',
        marginBottom: '28px'
      }}>
        {/* Live Players */}
        <div className="glass-panel" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>LIVE PLAYERS</span>
            <div style={{ 
              background: 'rgba(46, 204, 113, 0.15)', 
              color: 'var(--accent-green)', 
              padding: '8px', 
              borderRadius: '10px' 
            }}>
              <Users size={20} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '12px' }}>
            <span style={{ fontFamily: 'var(--font-game)', fontSize: '36px', color: 'var(--accent-green)' }}>
              {live.online_players}
            </span>
            <span className="badge badge-green" style={{ fontSize: '11px' }}>
              <span className="live-beacon" style={{ width: '6px', height: '6px' }}></span>
              ACTIVE
            </span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '6px' }}>
            WebSocket clients connected
          </div>
        </div>

        {/* Active Arenas */}
        <div className="glass-panel" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>ACTIVE ARENAS</span>
            <div style={{ 
              background: 'rgba(52, 152, 219, 0.15)', 
              color: 'var(--accent-blue)', 
              padding: '8px', 
              borderRadius: '10px' 
            }}>
              <Gamepad2 size={20} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '12px' }}>
            <span style={{ fontFamily: 'var(--font-game)', fontSize: '36px', color: 'var(--accent-blue)' }}>
              {live.active_rooms}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Running Games</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '6px' }}>
            Kerala Village & School Arenas
          </div>
        </div>

        {/* Total Player Accounts */}
        <div className="glass-panel" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>REGISTERED PLAYERS</span>
            <div style={{ 
              background: 'rgba(255, 215, 82, 0.15)', 
              color: 'var(--primary-gold)', 
              padding: '8px', 
              borderRadius: '10px' 
            }}>
              <Sparkles size={20} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '12px' }}>
            <span style={{ fontFamily: 'var(--font-game)', fontSize: '36px', color: 'var(--primary-gold)' }}>
              {player_metrics.total_registered_players}
            </span>
            <span className="badge badge-gold" style={{ fontSize: '11px' }}>
              +{player_metrics.new_players_today} TODAY
            </span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '6px' }}>
            {player_metrics.active_players_today} active in last 24h
          </div>
        </div>

        {/* Economy In Circulation */}
        <div className="glass-panel" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>COIN ECONOMY</span>
            <div style={{ 
              background: 'rgba(230, 126, 34, 0.15)', 
              color: 'var(--accent-orange)', 
              padding: '8px', 
              borderRadius: '10px' 
            }}>
              <Coins size={20} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '12px' }}>
            <span style={{ fontFamily: 'var(--font-game)', fontSize: '36px', color: 'var(--accent-orange)' }}>
              {economy_metrics.coins_in_circulation.toLocaleString()}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>🪙</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '6px' }}>
            {economy_metrics.total_coins_spent.toLocaleString()} spent in shop
          </div>
        </div>
      </div>

      {/* Two Column Layout: Live Arenas & Monetization Pulse */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '22px' }}>
        
        {/* Live Arenas List */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Gamepad2 size={20} color="var(--primary-gold)" />
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Live Match Arenas ({live.live_rooms.length})</h3>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Auto-syncs live</span>
          </div>

          {live.live_rooms.length === 0 ? (
            <div style={{ 
              padding: '36px 16px', 
              textAlign: 'center', 
              border: '1px dashed var(--border-subtle)',
              borderRadius: '12px',
              color: 'var(--text-muted)'
            }}>
              <Layers size={28} style={{ opacity: 0.5, marginBottom: '8px' }} />
              <p style={{ fontSize: '14px', fontWeight: 600 }}>No Active Game Rooms Right Now</p>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
                Rooms appear instantly when players start Quick Match or create Custom Rooms.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {live.live_rooms.map(room => (
                <div 
                  key={room.code}
                  style={{
                    background: 'rgba(8, 18, 12, 0.7)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ 
                        fontFamily: 'var(--font-game)', 
                        fontSize: '15px', 
                        color: 'var(--primary-gold)',
                        letterSpacing: '0.5px' 
                      }}>
                        {room.code}
                      </span>
                      <span className={`badge ${room.status === 'in_game' ? 'badge-green' : 'badge-blue'}`}>
                        {room.status.toUpperCase()}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                        • {room.mode === 'quick_match' ? '⚡ Quick Match' : '🔒 Custom Code'}
                      </span>
                    </div>

                    <div style={{ fontSize: '13px', color: 'var(--text-main)', marginTop: '4px' }}>
                      Host: <strong>{room.host_name}</strong> | Map: <em>{room.map || 'kerala_village'}</em>
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
                      Players ({room.players_count} / {room.max_players}): {room.players.map(p => p.name).join(', ') || room.host_name}
                    </div>
                  </div>

                  <button
                    onClick={() => handleCloseRoom(room.code)}
                    className="btn-danger"
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    Force Close
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Monetization & Ads Summary Card */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Tv size={20} color="var(--accent-emerald)" />
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Monetization & Ads Telemetry</h3>
            </div>
            <span className={`badge ${monetization_metrics.ads_enabled ? 'badge-green' : 'badge-red'}`}>
              {monetization_metrics.ads_enabled ? 'ADS ACTIVE' : 'ADS DISABLED'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
            <div style={{
              background: 'rgba(8, 18, 12, 0.6)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '14px'
            }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Estimated Revenue</span>
              <div style={{ 
                fontFamily: 'var(--font-game)', 
                fontSize: '26px', 
                color: 'var(--accent-green)',
                marginTop: '4px' 
              }}>
                ${monetization_metrics.estimated_ad_revenue_usd}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Based on eCPM telemetry</span>
            </div>

            <div style={{
              background: 'rgba(8, 18, 12, 0.6)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '14px'
            }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Rewarded Videos</span>
              <div style={{ 
                fontFamily: 'var(--font-game)', 
                fontSize: '26px', 
                color: 'var(--primary-gold)',
                marginTop: '4px' 
              }}>
                {monetization_metrics.rewarded_ads_watched}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Player coin reward claims</span>
            </div>
          </div>

          <div style={{
            background: 'rgba(8, 18, 12, 0.6)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                Total Ad Impressions
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                Banner & Interstitials served across mobile devices
              </div>
            </div>
            <span style={{ fontFamily: 'var(--font-game)', fontSize: '20px', color: 'var(--text-main)' }}>
              {monetization_metrics.ad_impressions}
            </span>
          </div>

          <div style={{ marginTop: '18px', padding: '12px', background: 'rgba(255, 215, 82, 0.05)', borderRadius: '10px', border: '1px solid rgba(255, 215, 82, 0.15)' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              💡 <strong>Creator Tip:</strong> Use the <strong>Monetization & Ads</strong> tab to tweak video coin reward payouts and interstitial match intervals live without needing to re-export the APK.
            </p>
          </div>
        </div>

      </div>

      {/* Live Game Telemetry Feed */}
      <div className="glass-panel" style={{ marginTop: '24px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={20} color="var(--primary-gold)" />
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>
              Live Telemetry & Activity Stream ({data.recent_events?.length || 0})
            </h3>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
            Real-time gameplay, purchases & ad events
          </span>
        </div>

        {(!data.recent_events || data.recent_events.length === 0) ? (
          <div style={{
            padding: '36px 16px',
            textAlign: 'center',
            border: '1px dashed var(--border-subtle)',
            borderRadius: '12px',
            color: 'var(--text-muted)'
          }}>
            <Activity size={28} style={{ opacity: 0.5, marginBottom: '8px' }} />
            <p style={{ fontSize: '14px', fontWeight: 600 }}>0 Telemetry Events Recorded</p>
            <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
              Events stream here live as players launch games, enter arenas, buy wardrobe items, or earn coins.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto' }}>
            {data.recent_events.map((evt) => {
              const timeAgo = Math.max(1, Math.floor((Date.now() - evt.timestamp) / 1000));
              const timeDisplay = timeAgo < 60 ? `${timeAgo}s ago` : `${Math.floor(timeAgo / 60)}m ago`;
              
              let badgeColor = 'badge-blue';
              let eventIcon = <Activity size={14} />;
              let eventLabel: string = evt.event_name;

              if (evt.event_name === 'GAME_START') {
                badgeColor = 'badge-green';
                eventIcon = <PlayCircle size={14} />;
                eventLabel = 'MATCH LAUNCH';
              } else if (evt.event_name === 'GAME_END') {
                badgeColor = 'badge-gold';
                eventIcon = <Trophy size={14} />;
                eventLabel = 'ROUND COMPLETE';
              } else if (evt.event_name === 'SHOP_PURCHASE') {
                badgeColor = 'badge-gold';
                eventIcon = <ShoppingBag size={14} />;
                eventLabel = 'SHOP BUY';
              } else if (evt.event_name === 'AD_IMPRESSION' || evt.event_name === 'AD_REWARD') {
                badgeColor = 'badge-purple';
                eventIcon = <Tv size={14} />;
                eventLabel = 'AD REWARD';
              } else if (evt.event_name === 'PLAYER_JOIN') {
                badgeColor = 'badge-blue';
                eventIcon = <UserPlus size={14} />;
                eventLabel = 'PLAYER JOIN';
              } else if (evt.event_name === 'COIN_TRANSACTION') {
                badgeColor = 'badge-gold';
                eventIcon = <Coins size={14} />;
                eventLabel = 'COINS';
              }

              return (
                <div
                  key={evt.id}
                  style={{
                    background: 'rgba(8, 18, 12, 0.6)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className={`badge ${badgeColor}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      {eventIcon}
                      <span>{eventLabel}</span>
                    </span>
                    <span style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: 600 }}>
                      {evt.player_name || 'System / Host'}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {evt.metadata ? JSON.stringify(evt.metadata).replace(/["{}]/g, '').replace(/,/g, ' • ') : ''}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                    {timeDisplay}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
