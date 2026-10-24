import React, { useState, useEffect } from 'react';
import type { MonetizationConfig } from '../types';
import { adminApi } from '../api';
import { 
  Tv, 
  ToggleLeft, 
  ToggleRight, 
  Save, 
  RotateCcw, 
  Coins, 
  Smartphone, 
  Sliders 
} from 'lucide-react';

interface Props {
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const MonetizationTab: React.FC<Props> = ({ showToast }) => {
  const [config, setConfig] = useState<MonetizationConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadMonetization = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getMonetization();
      setConfig(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load monetization settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMonetization();
  }, []);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await adminApi.updateMonetization(config);
      showToast('Monetization & Ads configuration saved live!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!config) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
        Loading Monetization Config...
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Top Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '12px' 
      }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-game)', fontSize: '24px', color: 'var(--accent-emerald)' }}>
            MONETIZATION & ADVERTISING SYSTEM
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Configure Google AdMob units, rewarded video coin rewards, and match interstitial cooldowns.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={loadMonetization} disabled={loading || saving} className="btn-ghost">
            <RotateCcw size={15} />
            <span>Reset</span>
          </button>

          <button onClick={handleSave} disabled={saving} className="btn-green">
            <Save size={16} />
            <span>{saving ? 'Saving...' : 'Deploy Ad Settings'}</span>
          </button>
        </div>
      </div>

      {/* Global Master Switch */}
      <div className="glass-panel" style={{ 
        padding: '24px', 
        marginBottom: '24px',
        background: config.ads_enabled 
          ? 'linear-gradient(135deg, rgba(46, 204, 113, 0.1) 0%, rgba(14, 30, 20, 0.85) 100%)'
          : 'linear-gradient(135deg, rgba(231, 76, 60, 0.1) 0%, rgba(14, 30, 20, 0.85) 100%)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Tv size={24} color={config.ads_enabled ? 'var(--accent-green)' : 'var(--accent-red)'} />
              <h3 style={{ fontSize: '18px', fontWeight: 800 }}>
                Master Ads Network Switch: {config.ads_enabled ? 'ENABLED' : 'PAUSED'}
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              When enabled, game clients serve banners, interstitials, and rewarded video ads automatically.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setConfig({ ...config, ads_enabled: !config.ads_enabled })}
            style={{
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '18px',
              fontWeight: 700,
              color: config.ads_enabled ? 'var(--accent-green)' : 'var(--accent-red)'
            }}
          >
            {config.ads_enabled ? (
              <>
                <span>ACTIVE</span>
                <ToggleRight size={38} color="var(--accent-green)" />
              </>
            ) : (
              <>
                <span>DISABLED</span>
                <ToggleLeft size={38} color="var(--accent-red)" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Two Column Layout: Formats & Rewards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '22px', marginBottom: '24px' }}>
        
        {/* Ad Formats & Frequency */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <Sliders size={20} color="var(--accent-blue)" />
            <h3 style={{ fontSize: '17px', fontWeight: 700 }}>Ad Formats & Delivery Rules</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Rewarded Video */}
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
                <div style={{ fontWeight: 600, fontSize: '14px' }}>Rewarded Video Ads</div>
                <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Watch short video to earn in-game coins</div>
              </div>
              <button
                type="button"
                onClick={() => setConfig({ ...config, rewarded_video_enabled: !config.rewarded_video_enabled })}
                style={{ background: 'transparent' }}
              >
                {config.rewarded_video_enabled 
                  ? <ToggleRight size={32} color="var(--accent-green)" />
                  : <ToggleLeft size={32} color="var(--text-dim)" />
                }
              </button>
            </div>

            {/* Interstitial Ads */}
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
                <div style={{ fontWeight: 600, fontSize: '14px' }}>Interstitial Fullscreen Ads</div>
                <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Full screen ad between match rounds</div>
              </div>
              <button
                type="button"
                onClick={() => setConfig({ ...config, interstitial_ads_enabled: !config.interstitial_ads_enabled })}
                style={{ background: 'transparent' }}
              >
                {config.interstitial_ads_enabled 
                  ? <ToggleRight size={32} color="var(--accent-green)" />
                  : <ToggleLeft size={32} color="var(--text-dim)" />
                }
              </button>
            </div>

            {/* Banner Ads */}
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
                <div style={{ fontWeight: 600, fontSize: '14px' }}>Banner Ads</div>
                <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Bottom banner in menus & lobby</div>
              </div>
              <button
                type="button"
                onClick={() => setConfig({ ...config, banner_ads_enabled: !config.banner_ads_enabled })}
                style={{ background: 'transparent' }}
              >
                {config.banner_ads_enabled 
                  ? <ToggleRight size={32} color="var(--accent-green)" />
                  : <ToggleLeft size={32} color="var(--text-dim)" />
                }
              </button>
            </div>

            {/* Interstitial Frequency Slider */}
            <div style={{ marginTop: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Interstitial Ad Cooldown:</span>
                <strong style={{ color: 'var(--primary-gold)' }}>Every {config.interstitial_interval_matches} Matches</strong>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={config.interstitial_interval_matches}
                onChange={(e) => setConfig({ ...config, interstitial_interval_matches: parseInt(e.target.value) || 2 })}
                style={{ width: '100%', accentColor: 'var(--primary-gold)' }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                Shows an interstitial ad once every {config.interstitial_interval_matches} completed games.
              </span>
            </div>

          </div>
        </div>

        {/* Player Coin Rewards & Incentives */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <Coins size={20} color="var(--primary-gold)" />
            <h3 style={{ fontSize: '17px', fontWeight: 700 }}>In-Game Coin Payout Tuning</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* Rewarded Video Payout */}
            <div style={{
              background: 'rgba(8, 18, 12, 0.6)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '12px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>Rewarded Video Payout</div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Coins rewarded per completed ad</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="number"
                  value={config.rewarded_video_coin_reward}
                  onChange={(e) => setConfig({ ...config, rewarded_video_coin_reward: parseInt(e.target.value) || 0 })}
                  style={{ width: '80px', padding: '6px', fontSize: '14px', fontWeight: 700, color: 'var(--primary-gold)' }}
                />
                <span style={{ fontSize: '12px' }}>🪙</span>
              </div>
            </div>

            {/* Daily Login Reward */}
            <div style={{
              background: 'rgba(8, 18, 12, 0.6)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '12px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>Daily Login Bonus</div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Free coins upon opening game daily</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="number"
                  value={config.daily_reward_coins}
                  onChange={(e) => setConfig({ ...config, daily_reward_coins: parseInt(e.target.value) || 0 })}
                  style={{ width: '80px', padding: '6px', fontSize: '14px', fontWeight: 700, color: 'var(--primary-gold)' }}
                />
                <span style={{ fontSize: '12px' }}>🪙</span>
              </div>
            </div>

            {/* Match Win Bonus */}
            <div style={{
              background: 'rgba(8, 18, 12, 0.6)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '12px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>Match Win Bonus</div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Bonus coins given to winner</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="number"
                  value={config.win_coin_reward}
                  onChange={(e) => setConfig({ ...config, win_coin_reward: parseInt(e.target.value) || 0 })}
                  style={{ width: '80px', padding: '6px', fontSize: '14px', fontWeight: 700, color: 'var(--primary-gold)' }}
                />
                <span style={{ fontSize: '12px' }}>🪙</span>
              </div>
            </div>

            {/* Spot / Catch Hider Bonus */}
            <div style={{
              background: 'rgba(8, 18, 12, 0.6)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '12px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>Spot Hider Bonus</div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Coins per spotted player as Finder</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="number"
                  value={config.catch_hider_coin_reward}
                  onChange={(e) => setConfig({ ...config, catch_hider_coin_reward: parseInt(e.target.value) || 0 })}
                  style={{ width: '80px', padding: '6px', fontSize: '14px', fontWeight: 700, color: 'var(--primary-gold)' }}
                />
                <span style={{ fontSize: '12px' }}>🪙</span>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Google AdMob SDK Unit IDs */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Smartphone size={20} color="var(--primary-gold)" />
          <h3 style={{ fontSize: '17px', fontWeight: 700 }}>Google AdMob Unit Configuration (Live Remote IDs)</h3>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '18px' }}>
          Update your live production Google AdMob IDs here. Currently populated with Google test ad units for safe testing.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              AdMob App ID
            </label>
            <input
              type="text"
              value={config.admob_app_id}
              onChange={(e) => setConfig({ ...config, admob_app_id: e.target.value })}
              style={{ width: '100%', fontSize: '12px', fontFamily: 'monospace' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Banner Ad Unit ID
            </label>
            <input
              type="text"
              value={config.banner_ad_unit_id}
              onChange={(e) => setConfig({ ...config, banner_ad_unit_id: e.target.value })}
              style={{ width: '100%', fontSize: '12px', fontFamily: 'monospace' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Interstitial Ad Unit ID
            </label>
            <input
              type="text"
              value={config.interstitial_ad_unit_id}
              onChange={(e) => setConfig({ ...config, interstitial_ad_unit_id: e.target.value })}
              style={{ width: '100%', fontSize: '12px', fontFamily: 'monospace' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Rewarded Video Unit ID
            </label>
            <input
              type="text"
              value={config.rewarded_ad_unit_id}
              onChange={(e) => setConfig({ ...config, rewarded_ad_unit_id: e.target.value })}
              style={{ width: '100%', fontSize: '12px', fontFamily: 'monospace' }}
            />
          </div>
        </div>
      </div>

    </div>
  );
};
