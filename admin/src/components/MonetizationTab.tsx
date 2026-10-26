import React, { useState, useEffect } from 'react';
import type { MonetizationConfig, AdMetricsDetailed } from '../types';
import { adminApi } from '../api';
import { 
  Tv, 
  ToggleLeft, 
  ToggleRight, 
  Save, 
  RotateCcw, 
  Coins, 
  Smartphone, 
  Sliders,
  DollarSign,
  TrendingUp,
  BarChart3,
  PlayCircle,
  Eye,
  MousePointerClick,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Calendar
} from 'lucide-react';

interface Props {
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const MonetizationTab: React.FC<Props> = ({ showToast }) => {
  const [config, setConfig] = useState<MonetizationConfig | null>(null);
  const [metrics, setMetrics] = useState<AdMetricsDetailed | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshingMetrics, setRefreshingMetrics] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [confData, metricsData] = await Promise.all([
        adminApi.getMonetization(),
        adminApi.getMonetizationMetrics()
      ]);
      setConfig(confData);
      setMetrics(metricsData);
    } catch (err: any) {
      showToast(err.message || 'Failed to load monetization data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const refreshMetrics = async () => {
    setRefreshingMetrics(true);
    try {
      const data = await adminApi.getMonetizationMetrics();
      setMetrics(data);
      showToast('Live Ad metrics refreshed', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to refresh metrics', 'error');
    } finally {
      setRefreshingMetrics(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (updatedConfig?: MonetizationConfig) => {
    const toSave = updatedConfig || config;
    if (!toSave) return;
    setSaving(true);
    try {
      const res = await adminApi.updateMonetization(toSave);
      setConfig(res.monetization);
      // Also refresh metrics to reflect new settings
      const mData = await adminApi.getMonetizationMetrics();
      setMetrics(mData);
      showToast('Monetization & Ad settings deployed live to all players!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleMasterToggle = async () => {
    if (!config) return;
    const nextState = !config.ads_enabled;
    const updated = { ...config, ads_enabled: nextState };
    setConfig(updated);
    await handleSave(updated);
  };

  const handleResetMetrics = async () => {
    if (!window.confirm('Are you sure you want to reset all ad impression, click, and revenue counters? This action cannot be undone.')) {
      return;
    }
    try {
      const res = await adminApi.resetMonetizationMetrics();
      showToast(res.message, 'success');
      const mData = await adminApi.getMonetizationMetrics();
      setMetrics(mData);
    } catch (err: any) {
      showToast(err.message || 'Failed to reset metrics', 'error');
    }
  };

  if (!config) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
        <RefreshCw size={32} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '14px' }}>Loading Monetization & Ad Network Telemetry...</p>
      </div>
    );
  }

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontFamily: 'var(--font-game)', fontSize: '24px', color: 'var(--accent-emerald)' }}>
              MONETIZATION & AD REVENUE CONTROL
            </h2>
            <span className="badge badge-green" style={{ fontSize: '11px' }}>
              <span className="live-beacon"></span>
              ADMOB LIVE
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Real-time AdMob telemetry, live eCPM & CPC financial calculations, and instant remote kill switch.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button onClick={loadData} disabled={loading || saving} className="btn-ghost" title="Reload from server">
            <RotateCcw size={15} />
            <span>Reload</span>
          </button>

          <button onClick={handleResetMetrics} className="btn-ghost" style={{ color: 'var(--accent-red)' }} title="Clear telemetry counters">
            <span>Reset Counters</span>
          </button>

          <button onClick={() => handleSave()} disabled={saving} className="btn-green">
            <Save size={16} />
            <span>{saving ? 'Deploying...' : 'Deploy Ad Settings'}</span>
          </button>
        </div>
      </div>

      {/* Global Master Switch */}
      <div className="glass-panel" style={{ 
        padding: '24px', 
        marginBottom: '24px',
        background: config.ads_enabled 
          ? 'linear-gradient(135deg, rgba(46, 204, 113, 0.12) 0%, rgba(14, 30, 20, 0.9) 100%)'
          : 'linear-gradient(135deg, rgba(231, 76, 60, 0.14) 0%, rgba(30, 14, 14, 0.9) 100%)',
        border: config.ads_enabled 
          ? '1px solid rgba(46, 204, 113, 0.35)' 
          : '1px solid rgba(231, 76, 60, 0.4)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                background: config.ads_enabled ? 'rgba(46, 204, 113, 0.2)' : 'rgba(231, 76, 60, 0.2)',
                padding: '10px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Tv size={28} color={config.ads_enabled ? 'var(--accent-green)' : 'var(--accent-red)'} />
              </div>
              <div>
                <h3 style={{ fontSize: '19px', fontWeight: 800, color: config.ads_enabled ? 'var(--text-main)' : 'var(--accent-red)' }}>
                  Global Ad Network Master Switch: {config.ads_enabled ? 'ACTIVE & SERVING' : 'TOTALLY SUSPENDED'}
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {config.ads_enabled 
                    ? 'All bottom banners and 30-sec rewarded video ads are active and generating revenue across mobile devices.' 
                    : 'Emergency Kill-Switch Engaged: All ads are immediately muted and suppressed across all active players in real time.'}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleMasterToggle}
            disabled={saving}
            style={{
              background: config.ads_enabled ? 'rgba(46, 204, 113, 0.15)' : 'rgba(231, 76, 60, 0.15)',
              border: `1px solid ${config.ads_enabled ? 'rgba(46, 204, 113, 0.4)' : 'rgba(231, 76, 60, 0.4)'}`,
              padding: '10px 18px',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '16px',
              fontWeight: 800,
              cursor: 'pointer',
              color: config.ads_enabled ? 'var(--accent-green)' : 'var(--accent-red)',
              transition: 'all 0.2s ease'
            }}
          >
            {config.ads_enabled ? (
              <>
                <span>SYSTEM ONLINE</span>
                <ToggleRight size={38} color="var(--accent-green)" />
              </>
            ) : (
              <>
                <span>SYSTEM DISABLED</span>
                <ToggleLeft size={38} color="var(--accent-red)" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Financial & Performance KPI Dashboard */}
      {metrics && (
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={18} color="var(--primary-gold)" />
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>
                Live AdMob Revenue & Financial Analytics
              </h3>
            </div>
            <button 
              onClick={refreshMetrics}
              disabled={refreshingMetrics}
              className="btn-ghost"
              style={{ fontSize: '12px', padding: '4px 10px' }}
            >
              <RefreshCw size={13} style={{ animation: refreshingMetrics ? 'spin 1s linear infinite' : 'none' }} />
              <span>Refresh Metrics</span>
            </button>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', 
            gap: '16px' 
          }}>
            {/* Total Estimated Revenue */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>ESTIMATED AD REVENUE</span>
                <div style={{ background: 'rgba(46, 204, 113, 0.15)', color: 'var(--accent-green)', padding: '6px', borderRadius: '8px' }}>
                  <DollarSign size={18} />
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-game)', fontSize: '32px', color: 'var(--accent-green)', marginTop: '8px' }}>
                ${metrics.estimated_revenue_usd}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
                Today: <strong>${metrics.today.estimated_revenue_usd}</strong>
              </div>
            </div>

            {/* Effective eCPM */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>BLENDED eCPM</span>
                <div style={{ background: 'rgba(52, 152, 219, 0.15)', color: 'var(--accent-blue)', padding: '6px', borderRadius: '8px' }}>
                  <TrendingUp size={18} />
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-game)', fontSize: '32px', color: 'var(--accent-blue)', marginTop: '8px' }}>
                ${metrics.effective_cpm_usd}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
                Effective revenue per 1,000 views
              </div>
            </div>

            {/* Cost Per Click (CPC) & CTR */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>CPC & CTR TELEMETRY</span>
                <div style={{ background: 'rgba(243, 156, 18, 0.15)', color: 'var(--accent-orange)', padding: '6px', borderRadius: '8px' }}>
                  <MousePointerClick size={18} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
                <span style={{ fontFamily: 'var(--font-game)', fontSize: '28px', color: 'var(--accent-orange)' }}>
                  ${metrics.cpc_usd}
                </span>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>CPC</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
                CTR: <strong>{metrics.ctr_percent}%</strong> ({metrics.total_clicks} clicks)
              </div>
            </div>

            {/* Total Impressions */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL IMPRESSIONS</span>
                <div style={{ background: 'rgba(155, 89, 182, 0.15)', color: 'var(--accent-purple)', padding: '6px', borderRadius: '8px' }}>
                  <Eye size={18} />
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-game)', fontSize: '32px', color: 'var(--text-main)', marginTop: '8px' }}>
                {metrics.total_impressions.toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
                {metrics.banner_impressions} banners • {metrics.rewarded_views} rewarded
              </div>
            </div>

            {/* Diamonds Distributed */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>DIAMONDS DISTRIBUTED</span>
                <div style={{ background: 'rgba(0, 210, 211, 0.15)', color: '#00d2d3', padding: '6px', borderRadius: '8px' }}>
                  <Sparkles size={18} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '8px' }}>
                <span style={{ fontFamily: 'var(--font-game)', fontSize: '32px', color: '#00d2d3' }}>
                  {metrics.total_diamonds_distributed.toLocaleString()}
                </span>
                <span style={{ fontSize: '18px' }}>💎</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
                Earned by watching 30s videos
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Two Column Layout: Format Controls & Economic Pacing */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '22px', marginBottom: '24px' }}>
        
        {/* Ad Formats & Safe Non-Intrusive Delivery */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <Sliders size={20} color="var(--accent-blue)" />
            <h3 style={{ fontSize: '17px', fontWeight: 700 }}>Ad Formats & Delivery Controls</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Rewarded Video (+5 Diamonds) */}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <PlayCircle size={16} color="#00d2d3" />
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>30-Sec Rewarded Video Ads</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Player opt-in: watch 30s ad to earn {config.reward_diamonds_amount || 5} Diamonds (💎)
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfig({ ...config, rewarded_video_enabled: !config.rewarded_video_enabled })}
                style={{ background: 'transparent' }}
              >
                {config.rewarded_video_enabled 
                  ? <ToggleRight size={34} color="var(--accent-green)" />
                  : <ToggleLeft size={34} color="var(--text-dim)" />
                }
              </button>
            </div>

            {/* Bottom Banner Ads */}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Tv size={16} color="var(--accent-blue)" />
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>Bottom Screen Banner Ads</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Non-intrusive bottom label banner (hidden during active gameplay)
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfig({ ...config, banner_ads_enabled: !config.banner_ads_enabled })}
                style={{ background: 'transparent' }}
              >
                {config.banner_ads_enabled 
                  ? <ToggleRight size={34} color="var(--accent-green)" />
                  : <ToggleLeft size={34} color="var(--text-dim)" />
                }
              </button>
            </div>

            {/* AdMob Test Mode Switch */}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={16} color="var(--primary-gold)" />
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>Google AdMob Test Ads Mode</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Serve official Google test ad units to prevent invalid traffic penalties
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfig({ ...config, use_test_ads: !config.use_test_ads })}
                style={{ background: 'transparent' }}
              >
                {config.use_test_ads 
                  ? <ToggleRight size={34} color="var(--primary-gold)" />
                  : <ToggleLeft size={34} color="var(--text-dim)" />
                }
              </button>
            </div>

            {/* Banner Refresh Interval */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Banner Auto-Refresh Cooldown:</span>
                <strong style={{ color: 'var(--primary-gold)' }}>{config.banner_refresh_seconds || 30}s</strong>
              </div>
              <input
                type="range"
                min="30"
                max="90"
                step="5"
                value={config.banner_refresh_seconds || 30}
                onChange={(e) => setConfig({ ...config, banner_refresh_seconds: parseInt(e.target.value) || 30 })}
                style={{ width: '100%', accentColor: 'var(--primary-gold)' }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                AdMob recommended pacing is 30–60 seconds for banner lifecycle.
              </span>
            </div>

          </div>
        </div>

        {/* Economic Pacing & Diamond Tuning */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <Coins size={20} color="var(--primary-gold)" />
            <h3 style={{ fontSize: '17px', fontWeight: 700 }}>Diamond & Impression Pacing</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* Diamonds per Rewarded Video */}
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
                <div style={{ fontWeight: 600, fontSize: '13px' }}>Diamonds Per 30s Ad</div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Reward granted upon watching video</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={config.reward_diamonds_amount || 5}
                  onChange={(e) => setConfig({ ...config, reward_diamonds_amount: parseInt(e.target.value) || 5 })}
                  style={{ width: '70px', padding: '6px', fontSize: '14px', fontWeight: 700, color: '#00d2d3' }}
                />
                <span style={{ fontSize: '14px' }}>💎</span>
              </div>
            </div>

            {/* Daily Target Impressions Per User */}
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
                <div style={{ fontWeight: 600, fontSize: '13px' }}>Daily Impression Target</div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Target impressions per user per day</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="number"
                  min="5"
                  max="30"
                  value={config.daily_impression_target || 10}
                  onChange={(e) => setConfig({ ...config, daily_impression_target: parseInt(e.target.value) || 10 })}
                  style={{ width: '70px', padding: '6px', fontSize: '14px', fontWeight: 700, color: 'var(--primary-gold)' }}
                />
                <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>ads</span>
              </div>
            </div>

            {/* Max Rewarded Videos Per User Per Day */}
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
                <div style={{ fontWeight: 600, fontSize: '13px' }}>Max Daily Rewarded Views</div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Cap per player to protect economy</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={config.max_daily_rewarded_views || 8}
                  onChange={(e) => setConfig({ ...config, max_daily_rewarded_views: parseInt(e.target.value) || 8 })}
                  style={{ width: '70px', padding: '6px', fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}
                />
                <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>views</span>
              </div>
            </div>

            {/* Rewarded Video Cooldown */}
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
                <div style={{ fontWeight: 600, fontSize: '13px' }}>Rewarded Video Cooldown</div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Minimum wait between consecutive videos</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="number"
                  min="10"
                  max="300"
                  value={config.reward_cooldown_seconds || 60}
                  onChange={(e) => setConfig({ ...config, reward_cooldown_seconds: parseInt(e.target.value) || 60 })}
                  style={{ width: '70px', padding: '6px', fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}
                />
                <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>sec</span>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Financial eCPM & CPC Benchmark Tuning */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <DollarSign size={20} color="var(--accent-green)" />
          <h3 style={{ fontSize: '17px', fontWeight: 700 }}>Financial Calculation Rates (eCPM & CPC Modeling)</h3>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Tune your benchmark rates to project real AdMob revenue based on impressions, completions, and clicks.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'rgba(8, 18, 12, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Banner eCPM ($ / 1,000 Impressions)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>$</span>
              <input
                type="number"
                step="0.10"
                min="0.10"
                max="20.00"
                value={config.banner_ecpm_usd || 1.50}
                onChange={(e) => setConfig({ ...config, banner_ecpm_usd: parseFloat(e.target.value) || 1.50 })}
                style={{ width: '100%', fontSize: '14px', fontWeight: 700, color: 'var(--accent-blue)' }}
              />
            </div>
          </div>

          <div style={{ background: 'rgba(8, 18, 12, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Rewarded Video eCPM ($ / 1,000 Views)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>$</span>
              <input
                type="number"
                step="0.50"
                min="1.00"
                max="100.00"
                value={config.rewarded_ecpm_usd || 25.00}
                onChange={(e) => setConfig({ ...config, rewarded_ecpm_usd: parseFloat(e.target.value) || 25.00 })}
                style={{ width: '100%', fontSize: '14px', fontWeight: 700, color: 'var(--accent-green)' }}
              />
            </div>
          </div>

          <div style={{ background: 'rgba(8, 18, 12, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Benchmark CPC ($ / Click)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="5.00"
                value={config.cpc_usd || 0.12}
                onChange={(e) => setConfig({ ...config, cpc_usd: parseFloat(e.target.value) || 0.12 })}
                style={{ width: '100%', fontSize: '14px', fontWeight: 700, color: 'var(--accent-orange)' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Daily Performance Breakdown Table */}
      {metrics && metrics.daily_history && (
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Calendar size={18} color="var(--primary-gold)" />
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>
                Daily Ad Performance Breakdown ({metrics.daily_history.length} Days)
              </h3>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
              Real-time daily aggregates
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 12px' }}>Date</th>
                  <th style={{ padding: '10px 12px' }}>Total Impressions</th>
                  <th style={{ padding: '10px 12px' }}>Banners</th>
                  <th style={{ padding: '10px 12px' }}>Rewarded Views</th>
                  <th style={{ padding: '10px 12px' }}>Clicks</th>
                  <th style={{ padding: '10px 12px' }}>Diamonds Given</th>
                  <th style={{ padding: '10px 12px' }}>eCPM</th>
                  <th style={{ padding: '10px 12px' }}>Est. Revenue</th>
                </tr>
              </thead>
              <tbody>
                {metrics.daily_history.map((row) => (
                  <tr key={row.date} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 600 }}>
                      {row.date}
                      {row.date === metrics.today.date && (
                        <span className="badge badge-green" style={{ marginLeft: '8px', fontSize: '10px', padding: '2px 6px' }}>
                          TODAY
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px', fontWeight: 700 }}>
                      {row.impressions.toLocaleString()}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)' }}>
                      {row.banner_impressions.toLocaleString()}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--accent-green)' }}>
                      {row.rewarded_views.toLocaleString()}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--accent-orange)' }}>
                      {row.clicks.toLocaleString()}
                    </td>
                    <td style={{ padding: '12px', color: '#00d2d3' }}>
                      {row.diamonds_distributed.toLocaleString()} 💎
                    </td>
                    <td style={{ padding: '12px', color: 'var(--accent-blue)', fontWeight: 600 }}>
                      ${row.ecpm_usd}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--accent-green)', fontWeight: 700 }}>
                      ${row.estimated_revenue_usd}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Google AdMob SDK Unit IDs */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Smartphone size={20} color="var(--primary-gold)" />
            <h3 style={{ fontSize: '17px', fontWeight: 700 }}>
              Google AdMob Unit Configuration (Live Remote Deployment)
            </h3>
          </div>
          <div className="badge badge-blue">
            <CheckCircle2 size={13} />
            <span>AdMob Connected: pub-4147727730689223</span>
          </div>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '18px' }}>
          Production unit IDs configured below are automatically pushed to game clients upon startup.
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
              Rewarded Video Unit ID
            </label>
            <input
              type="text"
              value={config.rewarded_ad_unit_id}
              onChange={(e) => setConfig({ ...config, rewarded_ad_unit_id: e.target.value })}
              style={{ width: '100%', fontSize: '12px', fontFamily: 'monospace' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Interstitial Ad Unit ID (Optional)
            </label>
            <input
              type="text"
              value={config.interstitial_ad_unit_id}
              onChange={(e) => setConfig({ ...config, interstitial_ad_unit_id: e.target.value })}
              style={{ width: '100%', fontSize: '12px', fontFamily: 'monospace' }}
            />
          </div>
        </div>
      </div>

    </div>
  );
};
