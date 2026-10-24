import { useState, useEffect } from 'react';
import { adminApi } from '../api';
import type { DownloadConfig, TesterFeedback, TesterAnalytics } from '../types';
import { 
  DownloadCloud, 
  ExternalLink, 
  Copy, 
  Check, 
  Smartphone, 
  MessageSquare, 
  TrendingUp, 
  Trash2, 
  Save, 
  RefreshCw,
  Sparkles,
  CloudLightning
} from 'lucide-react';

interface TestersTabProps {
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
}

export function TestersTab({ onShowToast }: TestersTabProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [analytics, setAnalytics] = useState<TesterAnalytics | null>(null);
  const [feedbacks, setFeedbacks] = useState<TesterFeedback[]>([]);
  const [config, setConfig] = useState<DownloadConfig>({
    r2_download_url: '',
    apk_version: 'v1.2.0-beta',
    apk_size_mb: '70 MB',
    apk_release_notes: [],
    download_enabled: true,
    target_os: 'Android 8.0+'
  });
  const [releaseNotesText, setReleaseNotesText] = useState<string>('');
  const [savingConfig, setSavingConfig] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const downloadPageUrl = `${window.location.origin}/download`;

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getTestersData();
      if (res.success) {
        setAnalytics(res.analytics);
        setFeedbacks(res.feedbacks || []);
        setConfig(res.config);
        setReleaseNotesText((res.config.apk_release_notes || []).join('\n'));
      }
    } catch (err: any) {
      onShowToast('Failed to load tester analytics: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const notesArray = releaseNotesText
        .split('\n')
        .map(n => n.trim())
        .filter(n => n.length > 0);

      const res = await adminApi.updateDownloadConfig({
        ...config,
        apk_release_notes: notesArray
      });

      if (res.success) {
        setConfig(res.config);
        onShowToast('Cloudflare R2 download configuration saved successfully!', 'success');
      }
    } catch (err: any) {
      onShowToast('Error saving download config: ' + err.message, 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(downloadPageUrl);
    setCopiedLink(true);
    onShowToast('Tester link copied to clipboard! Share it with your players.', 'success');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleDeleteFeedback = async (id: string) => {
    if (!window.confirm('Delete this feedback item?')) return;
    try {
      const res = await adminApi.deleteFeedback(id);
      if (res.success) {
        setFeedbacks(prev => prev.filter(f => f.id !== id));
        onShowToast('Feedback removed.', 'success');
      }
    } catch (err: any) {
      onShowToast('Failed to delete feedback: ' + err.message, 'error');
    }
  };

  const handleToggleStatus = async (item: TesterFeedback) => {
    const nextStatus = item.status === 'resolved' ? 'new' : 'resolved';
    try {
      await adminApi.updateFeedbackStatus(item.id, nextStatus);
      setFeedbacks(prev => prev.map(f => f.id === item.id ? { ...f, status: nextStatus } : f));
      onShowToast(`Marked feedback as ${nextStatus}.`, 'success');
    } catch (err: any) {
      onShowToast('Error updating status.', 'error');
    }
  };

  if (loading && !analytics) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <RefreshCw className="spin" size={32} style={{ margin: '0 auto 16px', display: 'block', color: 'var(--primary-gold)' }} />
        <div>Loading tester community analytics & downloads...</div>
      </div>
    );
  }

  const views = analytics?.page_views ?? 0;
  const uniques = analytics?.unique_visitors ?? 0;
  const downloads = analytics?.download_clicks ?? 0;
  const opens = analytics?.game_opens ?? 0;
  const feedbacksCount = feedbacks.length;
  const conversionRate = views > 0 ? ((downloads / views) * 100).toFixed(1) : '0';
  const openRate = downloads > 0 ? ((opens / downloads) * 100).toFixed(1) : '0';

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Banner & Quick Share */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(14, 43, 27, 0.95), rgba(7, 25, 15, 0.95))',
        border: '1px solid rgba(84, 180, 114, 0.35)',
        borderRadius: '18px',
        padding: '20px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: '0 12px 30px rgba(0,0,0,0.4)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ fontSize: '24px' }}>📲</span>
            <h2 style={{ fontFamily: 'var(--font-game)', fontSize: '20px', color: 'var(--primary-gold)', margin: 0 }}>
              TESTER COMMUNITY & APK DOWNLOAD PROGRAM
            </h2>
            <span className="badge badge-gold" style={{ fontSize: '11px' }}>EARLY ACCESS</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
            Share the custom testing page with players, distribute builds via Cloudflare R2, and review their gameplay feedback.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleCopyLink}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontSize: '13px' }}
          >
            {copiedLink ? <Check size={16} /> : <Copy size={16} />}
            <span>{copiedLink ? 'Copied Link!' : 'Copy Tester Link'}</span>
          </button>

          <a
            href={downloadPageUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid var(--border-subtle)',
              color: '#fff',
              padding: '10px 16px',
              borderRadius: '10px',
              textDecoration: 'none',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ExternalLink size={15} />
            <span>Open Website</span>
          </a>

          <button
            onClick={fetchData}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
              padding: '10px',
              borderRadius: '10px',
              cursor: 'pointer'
            }}
            title="Refresh Data"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* 4 Conversion Funnel Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        
        {/* Metric 1: Page Views */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>
            <span>Link Visits (Page Views)</span>
            <ExternalLink size={16} color="var(--primary-gold)" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-game)' }}>
            {views.toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
            <strong>{uniques.toLocaleString()}</strong> unique visitors tracked
          </div>
        </div>

        {/* Metric 2: Download Clicks */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>
            <span>APK Downloads</span>
            <DownloadCloud size={16} color="#2ecc71" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#2ecc71', fontFamily: 'var(--font-game)' }}>
            {downloads.toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
            <span style={{ color: '#2ecc71', fontWeight: 600 }}>{conversionRate}%</span> download conversion rate
          </div>
        </div>

        {/* Metric 3: Game Launches */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>
            <span>Game Launches (Opens)</span>
            <Smartphone size={16} color="#38bdf8" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-game)' }}>
            {opens.toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
            <span style={{ color: '#38bdf8', fontWeight: 600 }}>{openRate}%</span> of downloads launched the game
          </div>
        </div>

        {/* Metric 4: Feedbacks Received */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>
            <span>Tester Reviews</span>
            <MessageSquare size={16} color="var(--primary-gold)" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--primary-gold)', fontFamily: 'var(--font-game)' }}>
            {feedbacksCount}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
            Valuable notes & ratings submitted
          </div>
        </div>
      </div>

      {/* Visual Conversion Funnel Progress Bar */}
      <div className="card" style={{ padding: '20px 24px' }}>
        <h3 style={{ fontSize: '15px', color: '#fff', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={16} color="var(--primary-gold)" />
          <span>Tester Acquisition & Conversion Funnel</span>
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', alignItems: 'center' }}>
          {/* Step 1 */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '12px', borderLeft: '4px solid var(--primary-gold)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Step 1: Visited Link</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>{views} Visitors</div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>100% of reach</div>
          </div>

          <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '18px' }}>➔</div>

          {/* Step 2 */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '12px', borderLeft: '4px solid #2ecc71' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Step 2: Downloaded APK</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#2ecc71' }}>{downloads} Clicks</div>
            <div style={{ fontSize: '11px', color: '#2ecc71' }}>{conversionRate}% Conversion</div>
          </div>

          <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '18px' }}>➔</div>

          {/* Step 3 */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '12px', borderLeft: '4px solid #38bdf8' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Step 3: Opened & Played</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#38bdf8' }}>{opens} Launches</div>
            <div style={{ fontSize: '11px', color: '#38bdf8' }}>{openRate}% Player Activation</div>
          </div>
        </div>
      </div>

      {/* Cloudflare R2 Storage Configuration Card */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <CloudLightning size={22} color="var(--primary-gold)" />
          <h3 style={{ fontSize: '17px', color: '#fff', margin: 0 }}>
            Cloudflare R2 Storage & Download Settings
          </h3>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '18px' }}>
          Upload your Android APK to your Cloudflare R2 bucket and paste the public URL below. Players worldwide will download directly via Cloudflare's ultra-fast global edge network.
        </p>

        <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
              Cloudflare R2 Public Download URL (Direct APK Link)
            </label>
            <input
              type="url"
              className="form-input"
              style={{ width: '100%', fontFamily: 'monospace', fontSize: '13px' }}
              placeholder="e.g. https://pub-xxxx.r2.dev/HideAndPlay.apk or https://download.yourdomain.com/HideAndPlay.apk"
              value={config.r2_download_url}
              onChange={e => setConfig({ ...config, r2_download_url: e.target.value })}
            />
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
              * Tip: If empty, the server automatically streams the local APK from <code>/download/apk</code>.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
                APK Version
              </label>
              <input
                type="text"
                className="form-input"
                style={{ width: '100%' }}
                placeholder="v1.2.0-beta"
                value={config.apk_version}
                onChange={e => setConfig({ ...config, apk_version: e.target.value })}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
                File Size
              </label>
              <input
                type="text"
                className="form-input"
                style={{ width: '100%' }}
                placeholder="70 MB"
                value={config.apk_size_mb}
                onChange={e => setConfig({ ...config, apk_size_mb: e.target.value })}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
                Target OS Requirement
              </label>
              <input
                type="text"
                className="form-input"
                style={{ width: '100%' }}
                placeholder="Android 8.0+"
                value={config.target_os}
                onChange={e => setConfig({ ...config, target_os: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
              Release Notes / Highlights (One per line)
            </label>
            <textarea
              className="form-input"
              rows={4}
              style={{ width: '100%', resize: 'vertical' }}
              value={releaseNotesText}
              onChange={e => setReleaseNotesText(e.target.value)}
              placeholder="e.g.&#10;Authentic Kerala village hide & seek&#10;3D tactile buttons & voice bridge&#10;12+ Kerala traditional avatars"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={savingConfig}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px' }}
            >
              <Save size={16} />
              <span>{savingConfig ? 'Saving...' : 'Save Cloudflare R2 Settings'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Tester Feedback Feed */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '17px', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={18} color="var(--primary-gold)" />
              <span>Tester Reviews & Feedback ({feedbacks.length})</span>
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Feedback submitted by players directly from the download webpage.
            </div>
          </div>
        </div>

        {feedbacks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <Sparkles size={32} style={{ margin: '0 auto 12px', display: 'block', color: 'var(--primary-gold)', opacity: 0.6 }} />
            <div style={{ fontSize: '14px', fontWeight: 600 }}>No tester reviews yet!</div>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
              Share your tester link <a href={downloadPageUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-gold)' }}>{downloadPageUrl}</a> to collect feedback.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {feedbacks.map(f => {
              const dateStr = new Date(f.timestamp).toLocaleDateString() + ' ' + new Date(f.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              return (
                <div
                  key={f.id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '14px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: 700, color: '#fff', fontSize: '14px' }}>{f.name}</span>
                      
                      {/* Star rating */}
                      <div style={{ display: 'flex', color: 'var(--primary-gold)', fontSize: '14px' }}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i} style={{ opacity: i < f.rating ? 1 : 0.25 }}>★</span>
                        ))}
                      </div>

                      <span className="badge badge-blue" style={{ fontSize: '10px', textTransform: 'capitalize' }}>
                        {f.category}
                      </span>

                      {f.status === 'resolved' && (
                        <span className="badge badge-green" style={{ fontSize: '10px' }}>RESOLVED</span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{dateStr}</span>
                      
                      <button
                        onClick={() => handleToggleStatus(f)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: f.status === 'resolved' ? '#2ecc71' : 'var(--text-muted)',
                          cursor: 'pointer',
                          fontSize: '11px',
                          textDecoration: 'underline'
                        }}
                      >
                        {f.status === 'resolved' ? 'Reopen' : 'Mark Done'}
                      </button>

                      <button
                        onClick={() => handleDeleteFeedback(f.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '4px'
                        }}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <p style={{ margin: 0, fontSize: '13.5px', color: '#e2e8f0', lineHeight: 1.5 }}>
                    "{f.comments}"
                  </p>

                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Smartphone size={12} />
                    <span>Device: {f.device_model || 'Unknown'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
