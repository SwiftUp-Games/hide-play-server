import fs from 'fs';
import path from 'path';

export interface PlayerAccount {
  id: string;
  name: string;
  mobile_number?: string;
  avatar: string;
  hat: string;
  dress: string;
  coins: number;
  matches_played: number;
  matches_won: number;
  high_score: number;
  unlocked_avatars: string[];
  unlocked_hats: string[];
  unlocked_dresses: string[];
  created_at: number;
  last_active_at: number;
  is_online?: boolean;
  coins_updated_by_admin?: boolean;
}

export interface PricingCatalog {
  avatars: Record<string, number>;
  hats: Record<string, number>;
  dresses: Record<string, number>;
  coin_bundles: Array<{ id: string; name: string; coins: number; price_usd: string }>;
}

export interface MonetizationConfig {
  ads_enabled: boolean;
  banner_ads_enabled: boolean;
  interstitial_ads_enabled: boolean;
  rewarded_video_enabled: boolean;
  interstitial_interval_matches: number;
  rewarded_video_coin_reward: number;
  daily_reward_coins: number;
  win_coin_reward: number;
  catch_hider_coin_reward: number;
  vip_multiplier: number;
  admob_app_id: string;
  banner_ad_unit_id: string;
  interstitial_ad_unit_id: string;
  rewarded_ad_unit_id: string;
  test_devices: string[];
}

export interface GameAdminData {
  admin_mobile_number: string;
  pricing: PricingCatalog;
  monetization: MonetizationConfig;
  players: Record<string, PlayerAccount>;
  stats: {
    total_games_completed: number;
    total_coins_distributed: number;
    total_coins_spent: number;
    ad_impressions: number;
    rewarded_ads_watched: number;
  };
}

const DATA_DIR = path.resolve(__dirname, '../data');
const DATA_FILE = path.join(DATA_DIR, 'game_admin_store.json');

const DEFAULT_DATA: GameAdminData = {
  admin_mobile_number: process.env.ADMIN_MOBILE_NUMBER || '9876543210',
  pricing: {
    avatars: {
      boy_default: 0,
      girl_default: 0,
      police: 250,
      pilot: 300,
      suit: 350,
      pirate: 400,
      traditional: 450,
      ninja: 500,
      schoolboy: 550,
      athlete: 600,
      girl_artist: 650,
      explorer: 700
    },
    hats: {
      hat_none: 0,
      hat_cap: 100,
      hat_flower: 150,
      hat_turban: 200,
      hat_crown: 300
    },
    dresses: {
      dress_mundu: 0,
      dress_jersey: 150,
      dress_sari: 250,
      dress_suit: 350
    },
    coin_bundles: [
      { id: 'pouch_500', name: 'Little Pouch', coins: 500, price_usd: '$0.99' },
      { id: 'sack_2500', name: 'Adventurer Sack', coins: 2500, price_usd: '$2.99' },
      { id: 'chest_10000', name: 'Kerala Royal Chest', coins: 10000, price_usd: '$8.99' }
    ]
  },
  monetization: {
    ads_enabled: true,
    banner_ads_enabled: true,
    interstitial_ads_enabled: true,
    rewarded_video_enabled: true,
    interstitial_interval_matches: 2,
    rewarded_video_coin_reward: 50,
    daily_reward_coins: 100,
    win_coin_reward: 25,
    catch_hider_coin_reward: 5,
    vip_multiplier: 2.0,
    admob_app_id: 'ca-app-pub-3940256099942544~3347511713',
    banner_ad_unit_id: 'ca-app-pub-3940256099942544/6300978111',
    interstitial_ad_unit_id: 'ca-app-pub-3940256099942544/1033173712',
    rewarded_ad_unit_id: 'ca-app-pub-3940256099942544/5224354917',
    test_devices: ['SAMSUNG-S24-ULTRA', 'IPHONE-15-PRO', 'PIXEL-8-PRO']
  },
  players: {
    'p_kuttan_01': {
      id: 'p_kuttan_01',
      name: 'Kuttan',
      mobile_number: '9876543210',
      avatar: 'boy_default',
      hat: 'hat_cap',
      dress: 'dress_mundu',
      coins: 8405,
      matches_played: 14,
      matches_won: 9,
      high_score: 320,
      unlocked_avatars: ['boy_default', 'girl_default', 'police', 'traditional'],
      unlocked_hats: ['hat_none', 'hat_cap', 'hat_turban'],
      unlocked_dresses: ['dress_mundu', 'dress_jersey'],
      created_at: Date.now() - 86400000 * 3,
      last_active_at: Date.now() - 3600000
    },
    'p_ammu_02': {
      id: 'p_ammu_02',
      name: 'Ammu',
      mobile_number: '9847012345',
      avatar: 'girl_default',
      hat: 'hat_flower',
      dress: 'dress_sari',
      coins: 3450,
      matches_played: 8,
      matches_won: 5,
      high_score: 210,
      unlocked_avatars: ['boy_default', 'girl_default', 'girl_artist'],
      unlocked_hats: ['hat_none', 'hat_flower'],
      unlocked_dresses: ['dress_mundu', 'dress_sari'],
      created_at: Date.now() - 86400000 * 2,
      last_active_at: Date.now() - 7200000
    },
    'p_chinnu_03': {
      id: 'p_chinnu_03',
      name: 'Chinnu',
      mobile_number: '9446054321',
      avatar: 'explorer',
      hat: 'hat_crown',
      dress: 'dress_suit',
      coins: 12800,
      matches_played: 26,
      matches_won: 18,
      high_score: 540,
      unlocked_avatars: ['boy_default', 'girl_default', 'explorer', 'pilot', 'ninja'],
      unlocked_hats: ['hat_none', 'hat_crown'],
      unlocked_dresses: ['dress_mundu', 'dress_suit'],
      created_at: Date.now() - 86400000 * 5,
      last_active_at: Date.now() - 1800000
    }
  },
  stats: {
    total_games_completed: 48,
    total_coins_distributed: 24655,
    total_coins_spent: 12400,
    ad_impressions: 114,
    rewarded_ads_watched: 38
  }
};

class GameStore {
  private data: GameAdminData;
  private activeSessions = new Set<string>();

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): GameAdminData {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULT_DATA,
          ...parsed,
          pricing: { ...DEFAULT_DATA.pricing, ...(parsed.pricing || {}) },
          monetization: { ...DEFAULT_DATA.monetization, ...(parsed.monetization || {}) },
          players: { ...DEFAULT_DATA.players, ...(parsed.players || {}) },
          stats: { ...DEFAULT_DATA.stats, ...(parsed.stats || {}) }
        };
      }
    } catch (err) {
      console.error('[GameStore] Error reading data file, using defaults:', err);
    }
    this.saveData(DEFAULT_DATA);
    return DEFAULT_DATA;
  }

  private saveData(data: GameAdminData): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[GameStore] Error saving data file:', err);
    }
  }

  // --------------------------------------------------------------------------
  // AUTH (10-Digit Mobile Number Code)
  // --------------------------------------------------------------------------
  public verifyMobile(mobile: string): boolean {
    const cleanInput = (mobile || '').trim().replace(/\D/g, '');
    const cleanAdmin = (this.data.admin_mobile_number || '9876543210').trim().replace(/\D/g, '');
    return cleanInput.length === 10 && cleanInput === cleanAdmin;
  }

  public createSession(): string {
    const token = 'agy_adm_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    this.activeSessions.add(token);
    return token;
  }

  public validateSession(token: string | undefined): boolean {
    if (!token) return false;
    return this.activeSessions.has(token);
  }

  public invalidateSession(token: string): void {
    this.activeSessions.delete(token);
  }

  public updateAdminMobile(newMobile: string): { success: boolean; message: string } {
    const clean = (newMobile || '').trim().replace(/\D/g, '');
    if (clean.length !== 10) {
      return { success: false, message: 'Admin mobile number must be exactly 10 digits.' };
    }
    this.data.admin_mobile_number = clean;
    this.saveData(this.data);
    return { success: true, message: `Admin mobile updated to ${clean}` };
  }

  // --------------------------------------------------------------------------
  // STATS & DASHBOARD
  // --------------------------------------------------------------------------
  public getDashboardOverview(activeRoomsCount: number, onlineClientsCount: number, liveRoomsList: any[]) {
    const allPlayers = Object.values(this.data.players);
    const totalCoinsInCirculation = allPlayers.reduce((acc, p) => acc + (p.coins || 0), 0);
    const now = Date.now();
    const activeToday = allPlayers.filter(p => now - p.last_active_at < 86400000).length;
    const newToday = allPlayers.filter(p => now - p.created_at < 86400000).length;

    // Simulated Ad eCPM Calculation ($2.50 per 1000 rewarded impressions, $1.20 banner/interstitial)
    const adRev = ((this.data.stats.rewarded_ads_watched * 0.025) + (this.data.stats.ad_impressions * 0.0015)).toFixed(2);

    return {
      live: {
        online_players: onlineClientsCount,
        active_rooms: activeRoomsCount,
        live_rooms: liveRoomsList,
        region: 'Asia-South (Mumbai)',
        uptime_seconds: Math.floor(process.uptime())
      },
      player_metrics: {
        total_registered_players: allPlayers.length,
        active_players_today: activeToday,
        new_players_today: newToday
      },
      economy_metrics: {
        coins_in_circulation: totalCoinsInCirculation,
        total_coins_distributed: this.data.stats.total_coins_distributed,
        total_coins_spent: this.data.stats.total_coins_spent,
        total_games_completed: this.data.stats.total_games_completed
      },
      monetization_metrics: {
        ads_enabled: this.data.monetization.ads_enabled,
        ad_impressions: this.data.stats.ad_impressions,
        rewarded_ads_watched: this.data.stats.rewarded_ads_watched,
        estimated_ad_revenue_usd: adRev
      }
    };
  }

  // --------------------------------------------------------------------------
  // PLAYERS DIRECTORY
  // --------------------------------------------------------------------------
  public getAllPlayers(): PlayerAccount[] {
    return Object.values(this.data.players).sort((a, b) => b.last_active_at - a.last_active_at);
  }

  public getPlayer(id: string): PlayerAccount | undefined {
    return this.data.players[id];
  }

  public registerOrSyncPlayer(payload: Partial<PlayerAccount> & { id: string }): PlayerAccount {
    const id = payload.id;
    const existing = this.data.players[id];
    if (existing) {
      if (payload.name) existing.name = payload.name;
      if (payload.avatar) existing.avatar = payload.avatar;
      if (payload.hat) existing.hat = payload.hat;
      if (payload.dress) existing.dress = payload.dress;
      if (existing.coins_updated_by_admin) {
        // Admin explicitly altered coins, clear flag so client receives new total
        existing.coins_updated_by_admin = false;
      } else if (typeof payload.coins === 'number') {
        existing.coins = payload.coins;
      }
      if (typeof payload.high_score === 'number' && payload.high_score > existing.high_score) {
        existing.high_score = payload.high_score;
      }
      if (typeof payload.matches_played === 'number') existing.matches_played = payload.matches_played;
      if (typeof payload.matches_won === 'number') existing.matches_won = payload.matches_won;
      if (payload.unlocked_avatars) {
        existing.unlocked_avatars = Array.from(new Set([...existing.unlocked_avatars, ...payload.unlocked_avatars]));
      }
      if (payload.unlocked_hats) {
        existing.unlocked_hats = Array.from(new Set([...existing.unlocked_hats, ...payload.unlocked_hats]));
      }
      if (payload.unlocked_dresses) {
        existing.unlocked_dresses = Array.from(new Set([...existing.unlocked_dresses, ...payload.unlocked_dresses]));
      }
      existing.last_active_at = Date.now();
      this.saveData(this.data);
      return existing;
    } else {
      const newPlayer: PlayerAccount = {
        id,
        name: payload.name || 'New Player',
        mobile_number: payload.mobile_number || '',
        avatar: payload.avatar || 'boy_default',
        hat: payload.hat || 'hat_none',
        dress: payload.dress || 'dress_mundu',
        coins: typeof payload.coins === 'number' ? payload.coins : 500,
        matches_played: payload.matches_played || 0,
        matches_won: payload.matches_won || 0,
        high_score: payload.high_score || 0,
        unlocked_avatars: payload.unlocked_avatars || ['boy_default', 'girl_default'],
        unlocked_hats: payload.unlocked_hats || ['hat_none'],
        unlocked_dresses: payload.unlocked_dresses || ['dress_mundu'],
        created_at: Date.now(),
        last_active_at: Date.now()
      };
      this.data.players[id] = newPlayer;
      this.saveData(this.data);
      return newPlayer;
    }
  }

  public adjustCoins(playerId: string, amount: number, mode: 'add' | 'set'): { success: boolean; new_coins?: number; message?: string } {
    const player = this.data.players[playerId];
    if (!player) {
      return { success: false, message: 'Player not found.' };
    }
    if (mode === 'add') {
      player.coins = Math.max(0, player.coins + amount);
      if (amount > 0) {
        this.data.stats.total_coins_distributed += amount;
      } else {
        this.data.stats.total_coins_spent += Math.abs(amount);
      }
    } else {
      player.coins = Math.max(0, amount);
    }
    player.coins_updated_by_admin = true;
    player.last_active_at = Date.now();
    this.saveData(this.data);
    return { success: true, new_coins: player.coins };
  }

  public unlockItem(playerId: string, itemType: 'avatar' | 'hat' | 'dress', itemId: string): { success: boolean; message?: string } {
    const player = this.data.players[playerId];
    if (!player) return { success: false, message: 'Player not found.' };
    if (itemType === 'avatar') {
      if (!player.unlocked_avatars.includes(itemId)) player.unlocked_avatars.push(itemId);
    } else if (itemType === 'hat') {
      if (!player.unlocked_hats.includes(itemId)) player.unlocked_hats.push(itemId);
    } else if (itemType === 'dress') {
      if (!player.unlocked_dresses.includes(itemId)) player.unlocked_dresses.push(itemId);
    }
    this.saveData(this.data);
    return { success: true };
  }

  public deletePlayer(playerId: string): boolean {
    if (this.data.players[playerId]) {
      delete this.data.players[playerId];
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  // --------------------------------------------------------------------------
  // PRICING MANAGEMENT
  // --------------------------------------------------------------------------
  public getPricing(): PricingCatalog {
    return this.data.pricing;
  }

  public updatePricing(newPricing: Partial<PricingCatalog>): PricingCatalog {
    if (newPricing.avatars) {
      this.data.pricing.avatars = { ...this.data.pricing.avatars, ...newPricing.avatars };
    }
    if (newPricing.hats) {
      this.data.pricing.hats = { ...this.data.pricing.hats, ...newPricing.hats };
    }
    if (newPricing.dresses) {
      this.data.pricing.dresses = { ...this.data.pricing.dresses, ...newPricing.dresses };
    }
    if (newPricing.coin_bundles) {
      this.data.pricing.coin_bundles = newPricing.coin_bundles;
    }
    this.saveData(this.data);
    return this.data.pricing;
  }

  // --------------------------------------------------------------------------
  // MONETIZATION & ADS CONFIG
  // --------------------------------------------------------------------------
  public getMonetization(): MonetizationConfig {
    return this.data.monetization;
  }

  public updateMonetization(newConfig: Partial<MonetizationConfig>): MonetizationConfig {
    this.data.monetization = { ...this.data.monetization, ...newConfig };
    this.saveData(this.data);
    return this.data.monetization;
  }

  public recordAdImpression(rewarded: boolean = false): void {
    if (rewarded) {
      this.data.stats.rewarded_ads_watched += 1;
    } else {
      this.data.stats.ad_impressions += 1;
    }
    this.saveData(this.data);
  }

  public recordGameCompleted(): void {
    this.data.stats.total_games_completed += 1;
    this.saveData(this.data);
  }

  // Public config served to Godot mobile clients
  public getPublicClientConfig() {
    return {
      pricing: this.data.pricing,
      monetization: {
        ads_enabled: this.data.monetization.ads_enabled,
        banner_ads_enabled: this.data.monetization.banner_ads_enabled,
        interstitial_ads_enabled: this.data.monetization.interstitial_ads_enabled,
        rewarded_video_enabled: this.data.monetization.rewarded_video_enabled,
        rewarded_video_coin_reward: this.data.monetization.rewarded_video_coin_reward,
        daily_reward_coins: this.data.monetization.daily_reward_coins,
        win_coin_reward: this.data.monetization.win_coin_reward,
        catch_hider_coin_reward: this.data.monetization.catch_hider_coin_reward,
        interstitial_interval_matches: this.data.monetization.interstitial_interval_matches,
        admob_app_id: this.data.monetization.admob_app_id,
        banner_ad_unit_id: this.data.monetization.banner_ad_unit_id,
        interstitial_ad_unit_id: this.data.monetization.interstitial_ad_unit_id,
        rewarded_ad_unit_id: this.data.monetization.rewarded_ad_unit_id
      },
      version: '1.2.0',
      maintenance: false
    };
  }
}

export const gameStore = new GameStore();
