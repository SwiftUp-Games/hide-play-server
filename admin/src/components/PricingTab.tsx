import React, { useState, useEffect } from 'react';
import type { PricingCatalog } from '../types';
import { adminApi } from '../api';
import { 
  Save, 
  RotateCcw, 
  ShoppingBag, 
  Crown, 
  Shirt, 
  DollarSign 
} from 'lucide-react';

interface Props {
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const PricingTab: React.FC<Props> = ({ showToast }) => {
  const [pricing, setPricing] = useState<PricingCatalog | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadPricing = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getPricing();
      setPricing(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load pricing', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPricing();
  }, []);

  const handleAvatarPriceChange = (avatarKey: string, newCost: number) => {
    if (!pricing) return;
    setPricing({
      ...pricing,
      avatars: {
        ...pricing.avatars,
        [avatarKey]: Math.max(0, newCost)
      }
    });
  };

  const handleHatPriceChange = (hatKey: string, newCost: number) => {
    if (!pricing) return;
    setPricing({
      ...pricing,
      hats: {
        ...pricing.hats,
        [hatKey]: Math.max(0, newCost)
      }
    });
  };

  const handleDressPriceChange = (dressKey: string, newCost: number) => {
    if (!pricing) return;
    setPricing({
      ...pricing,
      dresses: {
        ...pricing.dresses,
        [dressKey]: Math.max(0, newCost)
      }
    });
  };

  const handleSave = async () => {
    if (!pricing) return;
    setSaving(true);
    try {
      await adminApi.updatePricing(pricing);
      showToast('Game pricing updated successfully! Mobile clients will sync automatically.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update pricing', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!pricing) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
        Loading Game Shop Catalog...
      </div>
    );
  }

  const AVATAR_METADATA: Record<string, { label: string; emoji: string; desc: string }> = {
    boy_default: { label: 'Boy Default (Kuttan)', emoji: '👦', desc: 'Starter Hero (Always Free)' },
    girl_default: { label: 'Girl Default (Ammu)', emoji: '👧', desc: 'Starter Hero (Always Free)' },
    police: { label: 'Kerala Police Officer', emoji: '👮', desc: 'Sharp eyes, fast runner' },
    pilot: { label: 'Aviator Pilot', emoji: '🧑‍✈️', desc: 'Sky explorer with goggles' },
    suit: { label: 'Gentleman Suit', emoji: '🤵', desc: 'Sleek dark formal elegance' },
    pirate: { label: 'Arabian Sea Pirate', emoji: '🏴‍☠️', desc: 'Mysterious treasure seeker' },
    traditional: { label: 'Traditional Kerala Kuttan', emoji: '👳', desc: 'Mundu & kasavu festival look' },
    ninja: { label: 'Shadow Ninja', emoji: '🥷', desc: 'Stealth champion of the shadows' },
    schoolboy: { label: 'School Uniform Boy', emoji: '🎒', desc: 'Classic Kerala school vibe' },
    athlete: { label: 'Sports Athlete', emoji: '🏃', desc: 'High agility marathon runner' },
    girl_artist: { label: 'Artist Girl', emoji: '🎨', desc: 'Creative painter & seeker' },
    explorer: { label: 'Jungle Explorer', emoji: '🧭', desc: 'Safari hat & jungle gear' }
  };

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
          <h2 style={{ fontFamily: 'var(--font-game)', fontSize: '24px', color: 'var(--primary-gold)' }}>
            GAME SHOP & PRICING CONTROL
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Adjust coin prices for avatars, hats, dresses, and in-app purchase packs live.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={loadPricing} disabled={loading || saving} className="btn-ghost">
            <RotateCcw size={15} />
            <span>Discard Changes</span>
          </button>

          <button onClick={handleSave} disabled={saving} className="btn-gold">
            <Save size={16} />
            <span>{saving ? 'Saving...' : 'Save Pricing Changes'}</span>
          </button>
        </div>
      </div>

      {/* 1. Avatars Section */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
          <ShoppingBag size={20} color="var(--primary-gold)" />
          <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Avatar Character Prices (Coins 🪙)</h3>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
          gap: '16px' 
        }}>
          {Object.entries(pricing.avatars).map(([key, cost]) => {
            const meta = AVATAR_METADATA[key] || { label: key, emoji: '👤', desc: 'Character avatar' };
            const isFree = cost === 0;

            return (
              <div 
                key={key}
                style={{
                  background: 'rgba(8, 18, 12, 0.65)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '14px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  transition: 'border-color 0.2s ease'
                }}
              >
                <div style={{
                  fontSize: '32px',
                  width: '52px',
                  height: '52px',
                  borderRadius: '12px',
                  background: 'rgba(255, 215, 82, 0.08)',
                  border: '1px solid rgba(255, 215, 82, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {meta.emoji}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {meta.label}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '8px' }}>
                    {meta.desc}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="number"
                      value={cost}
                      disabled={key === 'boy_default' || key === 'girl_default'}
                      onChange={(e) => handleAvatarPriceChange(key, parseInt(e.target.value) || 0)}
                      style={{
                        width: '100px',
                        padding: '6px 10px',
                        fontSize: '14px',
                        fontWeight: 700,
                        color: isFree ? 'var(--accent-green)' : 'var(--primary-gold)'
                      }}
                    />
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>coins</span>
                    {isFree && <span className="badge badge-green" style={{ fontSize: '10px' }}>FREE</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Hats and Dresses Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '22px', marginBottom: '24px' }}>
        
        {/* Hats */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Crown size={20} color="var(--accent-blue)" />
            <h3 style={{ fontSize: '17px', fontWeight: 700 }}>Hats & Headwear (Coins 🪙)</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.entries(pricing.hats).map(([key, cost]) => (
              <div 
                key={key}
                style={{
                  background: 'rgba(8, 18, 12, 0.6)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)' }}>
                    {key.replace('hat_', '').toUpperCase()}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                    {key === 'hat_none' ? 'Default Head (No item)' : 'Headwear accessory'}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    value={cost}
                    disabled={key === 'hat_none'}
                    onChange={(e) => handleHatPriceChange(key, parseInt(e.target.value) || 0)}
                    style={{
                      width: '90px',
                      padding: '6px 10px',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: cost === 0 ? 'var(--accent-green)' : 'var(--primary-gold)'
                    }}
                  />
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>coins</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dresses */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Shirt size={20} color="var(--accent-purple)" />
            <h3 style={{ fontSize: '17px', fontWeight: 700 }}>Dresses & Outfits (Coins 🪙)</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.entries(pricing.dresses).map(([key, cost]) => (
              <div 
                key={key}
                style={{
                  background: 'rgba(8, 18, 12, 0.6)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)' }}>
                    {key.replace('dress_', '').toUpperCase()}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                    {key === 'dress_mundu' ? 'Default Traditional Kerala Mundu' : 'Special themed attire'}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    value={cost}
                    disabled={key === 'dress_mundu'}
                    onChange={(e) => handleDressPriceChange(key, parseInt(e.target.value) || 0)}
                    style={{
                      width: '90px',
                      padding: '6px 10px',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: cost === 0 ? 'var(--accent-green)' : 'var(--primary-gold)'
                    }}
                  />
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>coins</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 3. In-App Purchase Coin Bundles */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <DollarSign size={20} color="var(--accent-green)" />
          <h3 style={{ fontSize: '17px', fontWeight: 700 }}>Real-Money Coin Packs (In-App Purchases)</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          {pricing.coin_bundles.map((bundle, idx) => (
            <div
              key={bundle.id}
              style={{
                background: 'rgba(8, 18, 12, 0.6)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '28px', marginBottom: '4px' }}>
                {idx === 0 ? '🪙' : (idx === 1 ? '💰' : '👑')}
              </div>
              <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-main)' }}>
                {bundle.name}
              </div>
              <div style={{ 
                fontFamily: 'var(--font-game)', 
                fontSize: '22px', 
                color: 'var(--primary-gold)',
                margin: '6px 0' 
              }}>
                {bundle.coins.toLocaleString()} Coins
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Price:</span>
                <input
                  type="text"
                  value={bundle.price_usd}
                  onChange={(e) => {
                    const nextBundles = [...pricing.coin_bundles];
                    nextBundles[idx].price_usd = e.target.value;
                    setPricing({ ...pricing, coin_bundles: nextBundles });
                  }}
                  style={{ width: '80px', padding: '4px 8px', textAlign: 'center', fontWeight: 700 }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
