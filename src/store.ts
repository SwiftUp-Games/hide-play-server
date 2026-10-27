import fs from 'fs';
import path from 'path';
import { dbManager } from './db';

export interface PlayerAccount {
  id: string;
  master_uuid?: string;
  platform?: 'android_pgs' | 'ios_gamecenter' | 'anonymous' | string;
  platform_player_id?: string;
  avatar_uri?: string;
  auth_token?: string;
  device_os?: string;
  locale?: string;
  app_version?: string;
  is_anonymous?: boolean;
  name: string;
  mobile_number?: string;
  avatar: string;
  hat: string;
  dress: string;
  coins: number;
  diamonds?: number;
  no_ads_purchased?: boolean;
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
  use_test_ads: boolean;
  interstitial_interval_matches: number;
  rewarded_video_coin_reward: number;
  reward_diamonds_amount: number;
  daily_impression_target: number;
  banner_refresh_seconds: number;
  reward_cooldown_seconds: number;
  max_daily_rewarded_views: number;
  banner_ecpm_usd: number;
  rewarded_ecpm_usd: number;
  cpc_usd: number;
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

export interface AnalyticsEvent {
  id: string;
  timestamp: number;
  player_id?: string;
  master_uuid?: string;
  player_name?: string;
  session_id?: string;
  event_name: 'GAME_START' | 'GAME_END' | 'SHOP_PURCHASE' | 'AD_IMPRESSION' | 'AD_REWARD' | 'COIN_TRANSACTION' | 'PLAYER_JOIN' | string;
  metadata?: Record<string, any>;
}

export interface DownloadConfig {
  r2_download_url: string;
  apk_version: string;
  apk_size_mb: string;
  apk_release_notes: string[];
  download_enabled: boolean;
  target_os: string;
}

export interface TesterFeedback {
  id: string;
  timestamp: number;
  name: string;
  rating: number; // 1 to 5
  category: 'gameplay' | 'voice' | 'performance' | 'bugs' | 'general' | 'suggestion';
  device_model: string;
  comments: string;
  status: 'new' | 'reviewed' | 'resolved';
  source?: 'game' | 'web';
  platform?: string;
  app_version?: string;
}

export interface TesterAnalytics {
  page_views: number;
  unique_visitors: number;
  download_clicks: number;
  game_opens: number;
  visitor_devices: Record<string, number>;
  daily_stats: Record<string, { views: number; downloads: number; game_opens: number }>;
}

export interface GameAdminData {
  admin_mobile_number: string;
  pricing: PricingCatalog;
  monetization: MonetizationConfig;
  download_config: DownloadConfig;
  tester_analytics: TesterAnalytics;
  tester_feedbacks: TesterFeedback[];
  players: Record<string, PlayerAccount>;
  stats: {
    total_games_completed: number;
    total_coins_distributed: number;
    total_coins_spent: number;
    ad_impressions: number;
    banner_impressions?: number;
    rewarded_ads_watched: number;
    ad_clicks?: number;
    diamonds_distributed?: number;
    daily_ad_stats?: Record<string, {
      impressions: number;
      banner_impressions: number;
      rewarded_views: number;
      clicks: number;
      diamonds_distributed: number;
    }>;
  };
  analytics_events: AnalyticsEvent[];
}

const DATA_DIR = path.resolve(__dirname, '../data');
const DATA_FILE = path.join(DATA_DIR, 'game_admin_store.json');

const DEFAULT_DATA: GameAdminData = {
  admin_mobile_number: process.env.ADMIN_OTP_CODE || process.env.ADMIN_MOBILE_NUMBER || '8606094557',
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
    interstitial_ads_enabled: false,
    rewarded_video_enabled: true,
    use_test_ads: false,
    interstitial_interval_matches: 2,
    rewarded_video_coin_reward: 50,
    reward_diamonds_amount: 5,
    daily_impression_target: 10,
    banner_refresh_seconds: 30,
    reward_cooldown_seconds: 60,
    max_daily_rewarded_views: 8,
    banner_ecpm_usd: 1.50,
    rewarded_ecpm_usd: 25.00,
    cpc_usd: 0.12,
    daily_reward_coins: 100,
    win_coin_reward: 25,
    catch_hider_coin_reward: 5,
    vip_multiplier: 2.0,
    admob_app_id: 'ca-app-pub-4147727730689223~4678106368',
    banner_ad_unit_id: 'ca-app-pub-4147727730689223/9032198625',
    interstitial_ad_unit_id: 'ca-app-pub-3940256099942544/1033173712',
    rewarded_ad_unit_id: 'ca-app-pub-4147727730689223/9590601828',
    test_devices: ['SAMSUNG-S24-ULTRA', 'IPHONE-15-PRO', 'PIXEL-8-PRO']
  },
  download_config: {
    r2_download_url: process.env.R2_APK_DOWNLOAD_URL || process.env.R2_DOWNLOAD_URL || 'https://github.com/SwiftUp-Games/hide-play-server/releases/download/apk/HideAndPlay.apk',
    apk_version: 'v1.0.0-beta',
    apk_size_mb: '61 MB',
    apk_release_notes: [
      'Authentic hide & seek village gameplay',
      'Instant 4-digit room code join & matchmaking',
      'Ultra-crisp chunky action controls & spatial proximity voice bridge',
      '12+ customizable traditional avatars, dresses, & accessories'
    ],
    download_enabled: true,
    target_os: 'Android 8.0+'
  },
  tester_analytics: {
    page_views: 0,
    unique_visitors: 0,
    download_clicks: 0,
    game_opens: 0,
    visitor_devices: { Android: 0, iOS: 0, Windows: 0, Mac: 0, Other: 0 },
    daily_stats: {}
  },
  tester_feedbacks: [],
  players: {},
  stats: {
    total_games_completed: 0,
    total_coins_distributed: 0,
    total_coins_spent: 0,
    ad_impressions: 0,
    banner_impressions: 0,
    rewarded_ads_watched: 0,
    ad_clicks: 0,
    diamonds_distributed: 0,
    daily_ad_stats: {}
  },
  analytics_events: []
};

class GameStore {
  private data: GameAdminData;
  private activeSessions = new Set<string>();
  private trackedVisitorIps = new Set<string>();

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
          download_config: { ...DEFAULT_DATA.download_config, ...(parsed.download_config || {}) },
          tester_analytics: {
            page_views: parsed.tester_analytics?.page_views || 0,
            unique_visitors: parsed.tester_analytics?.unique_visitors || 0,
            download_clicks: parsed.tester_analytics?.download_clicks || 0,
            game_opens: parsed.tester_analytics?.game_opens || 0,
            visitor_devices: parsed.tester_analytics?.visitor_devices || { Android: 0, iOS: 0, Windows: 0, Mac: 0, Other: 0 },
            daily_stats: parsed.tester_analytics?.daily_stats || {}
          },
          tester_feedbacks: Array.isArray(parsed.tester_feedbacks) ? parsed.tester_feedbacks : [],
          players: parsed.players || {},
          stats: {
            total_games_completed: parsed.stats?.total_games_completed || 0,
            total_coins_distributed: parsed.stats?.total_coins_distributed || 0,
            total_coins_spent: parsed.stats?.total_coins_spent || 0,
            ad_impressions: parsed.stats?.ad_impressions || 0,
            banner_impressions: parsed.stats?.banner_impressions || parsed.stats?.ad_impressions || 0,
            rewarded_ads_watched: parsed.stats?.rewarded_ads_watched || 0,
            ad_clicks: parsed.stats?.ad_clicks || 0,
            diamonds_distributed: parsed.stats?.diamonds_distributed || 0,
            daily_ad_stats: parsed.stats?.daily_ad_stats || {}
          },
          analytics_events: Array.isArray(parsed.analytics_events) ? parsed.analytics_events : []
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
  // DATABASE INITIALIZATION & HYDRATION (MONGODB ATLAS)
  // --------------------------------------------------------------------------
  public async initDatabase(): Promise<void> {
    const connected = await dbManager.connect();
    if (connected) {
      const state = await dbManager.loadInitialState();
      if (state) {
        if (state.players && Object.keys(state.players).length > 0) {
          this.data.players = { ...this.data.players, ...state.players };
        }
        if (state.analytics && state.analytics.length > 0) {
          this.data.analytics_events = state.analytics;
        }
        if (state.feedbacks && state.feedbacks.length > 0) {
          this.data.tester_feedbacks = state.feedbacks;
        }
        if (state.pricing) {
          this.data.pricing = { ...this.data.pricing, ...state.pricing };
        }
        if (state.monetization) {
          this.data.monetization = { ...this.data.monetization, ...state.monetization };
        }
        if (state.download_config) {
          this.data.download_config = { ...this.data.download_config, ...state.download_config };
        }
        if (state.admin_mobile_number) {
          this.data.admin_mobile_number = state.admin_mobile_number;
        }
        if (state.ad_stats) {
          this.data.stats = { ...this.data.stats, ...state.ad_stats };
        }
        console.log('[GameStore] In-memory cache hydrated from MongoDB Atlas collections.');
      }
    }
  }

  // --------------------------------------------------------------------------
  // AUTH (10-Digit OTP Authentication Code)
  // --------------------------------------------------------------------------
  public getAdminCode(): string {
    return (this.data.admin_mobile_number || '8606094557').trim().replace(/\D/g, '');
  }

  public verifyMobile(mobile: string): boolean {
    const cleanInput = (mobile || '').trim().replace(/\D/g, '');
    const cleanAdmin = this.getAdminCode();
    return cleanInput.length === 10 && cleanInput === cleanAdmin;
  }

  public verifyCode(code: string): boolean {
    return this.verifyMobile(code);
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

  public async updateAdminMobile(newMobile: string): Promise<{ success: boolean; message: string }> {
    const clean = (newMobile || '').trim().replace(/\D/g, '');
    if (clean.length !== 10) {
      return { success: false, message: 'Authentication code must be exactly 10 digits.' };
    }
    this.data.admin_mobile_number = clean;
    this.saveData(this.data);
    await dbManager.saveConfig('admin_security', { admin_mobile_number: clean });
    return { success: true, message: `Admin OTP authentication code updated to ${clean}` };
  }

  public async updateAdminCode(newCode: string): Promise<{ success: boolean; message: string }> {
    return this.updateAdminMobile(newCode);
  }

  // --------------------------------------------------------------------------
  // STATS & DASHBOARD (PURE DATABASE FIRST)
  // --------------------------------------------------------------------------
  public async getDashboardOverview(activeRoomsCount: number, onlineClientsCount: number, liveRoomsList: any[]) {
    if (dbManager.getStatus().connected) {
      const dbOverview = await dbManager.getDashboardOverview(activeRoomsCount, onlineClientsCount, liveRoomsList);
      if (dbOverview) return dbOverview;
    }

    const allPlayers = Object.values(this.data.players);
    const totalCoinsInCirculation = allPlayers.reduce((acc, p) => acc + (p.coins || 0), 0);
    const now = Date.now();
    const activeToday = allPlayers.filter(p => now - p.last_active_at < 86400000).length;
    const newToday = allPlayers.filter(p => now - p.created_at < 86400000).length;

    // Dynamic Ad Metrics
    const monMetrics = this.getMonetizationMetrics();

    return {
      live: {
        online_players: onlineClientsCount,
        active_rooms: activeRoomsCount,
        live_rooms: liveRoomsList,
        region: process.env.SERVER_REGION || 'Asia-South (Mumbai)',
        uptime_seconds: Math.floor(process.uptime()),
        database: dbManager.getStatus()
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
        ad_impressions: monMetrics.total_impressions,
        rewarded_ads_watched: monMetrics.rewarded_views,
        estimated_ad_revenue_usd: monMetrics.estimated_revenue_usd
      },
      recent_events: (this.data.analytics_events || []).slice(0, 30)
    };
  }

  // --------------------------------------------------------------------------
  // ANALYTICS & TELEMETRY
  // --------------------------------------------------------------------------
  public recordAnalyticsEvent(event: {
    player_id?: string;
    master_uuid?: string;
    player_name?: string;
    session_id?: string;
    event_name: 'GAME_START' | 'GAME_END' | 'SHOP_PURCHASE' | 'AD_IMPRESSION' | 'AD_REWARD' | 'COIN_TRANSACTION' | 'PLAYER_JOIN' | string;
    metadata?: Record<string, any>;
    timestamp?: number;
  }): AnalyticsEvent {
    const newEvent: AnalyticsEvent = {
      id: 'evt_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
      timestamp: event.timestamp || Date.now(),
      player_id: event.player_id,
      master_uuid: event.master_uuid,
      player_name: event.player_name,
      session_id: event.session_id,
      event_name: event.event_name,
      metadata: event.metadata || {}
    };

    if (!Array.isArray(this.data.analytics_events)) {
      this.data.analytics_events = [];
    }
    this.data.analytics_events.unshift(newEvent);
    if (this.data.analytics_events.length > 200) {
      this.data.analytics_events = this.data.analytics_events.slice(0, 200);
    }

    // Dynamic stats aggregation based on actual events
    if (event.event_name === 'GAME_END') {
      this.data.stats.total_games_completed++;
    } else if (event.event_name === 'AD_IMPRESSION') {
      if (!event.metadata?.handled_by_tracker) {
        this.data.stats.ad_impressions++;
      }
    } else if (event.event_name === 'AD_REWARD') {
      if (!event.metadata?.handled_by_tracker) {
        this.data.stats.rewarded_ads_watched++;
      }
      if (typeof event.metadata?.coins === 'number') {
        this.data.stats.total_coins_distributed += event.metadata.coins;
      }
    } else if (event.event_name === 'SHOP_PURCHASE') {
      if (typeof event.metadata?.price === 'number') {
        this.data.stats.total_coins_spent += event.metadata.price;
      }
    } else if (event.event_name === 'COIN_TRANSACTION') {
      if (event.metadata?.type === 'earned' && typeof event.metadata?.amount === 'number') {
        this.data.stats.total_coins_distributed += event.metadata.amount;
      } else if (event.metadata?.type === 'spent' && typeof event.metadata?.amount === 'number') {
        this.data.stats.total_coins_spent += event.metadata.amount;
      }
    }

    this.saveData(this.data);
    dbManager.recordAnalyticsEvent(newEvent).catch(err => console.warn('[GameStore] Error saving analytics event to MongoDB:', err));
    return newEvent;
  }

  public async getRecentAnalyticsEvents(limit: number = 50): Promise<AnalyticsEvent[]> {
    if (dbManager.getStatus().connected) {
      const events = await dbManager.getAnalyticsEvents(limit);
      if (events) return events;
    }
    return (this.data.analytics_events || []).slice(0, limit);
  }

  // --------------------------------------------------------------------------
  // PLAYERS DIRECTORY (PURE DATABASE FIRST)
  // --------------------------------------------------------------------------
  public async getAllPlayers(): Promise<PlayerAccount[]> {
    if (dbManager.getStatus().connected) {
      const dbPlayers = await dbManager.getPlayers();
      if (dbPlayers && dbPlayers.length > 0) return dbPlayers;
    }
    return Object.values(this.data.players).sort((a, b) => b.last_active_at - a.last_active_at);
  }

  public async getPlayer(id: string): Promise<PlayerAccount | undefined> {
    if (dbManager.getStatus().connected) {
      const p = await dbManager.getPlayer(id);
      if (p) return p;
    }
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
      dbManager.upsertPlayer(existing).catch(err => console.warn('[GameStore] Error updating player in MongoDB:', err));
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
      dbManager.upsertPlayer(newPlayer).catch(err => console.warn('[GameStore] Error inserting player in MongoDB:', err));
      this.recordAnalyticsEvent({
        player_id: id,
        player_name: newPlayer.name,
        event_name: 'PLAYER_JOIN',
        metadata: { is_new: true, avatar: newPlayer.avatar, coins: newPlayer.coins }
      });
      return newPlayer;
    }
  }

  public async adjustCoins(playerId: string, amount: number, mode: 'add' | 'set'): Promise<{ success: boolean; new_coins?: number; message?: string }> {
    if (dbManager.getStatus().connected) {
      const dbRes = await dbManager.adjustPlayerCoins(playerId, amount, mode);
      if (dbRes.success && typeof dbRes.new_coins === 'number') {
        if (this.data.players[playerId]) {
          this.data.players[playerId].coins = dbRes.new_coins;
          this.data.players[playerId].coins_updated_by_admin = true;
          this.data.players[playerId].last_active_at = Date.now();
        }
        return dbRes;
      }
    }

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
    dbManager.upsertPlayer(player).catch(err => console.warn('[GameStore] Error updating player coins in MongoDB:', err));
    return { success: true, new_coins: player.coins };
  }

  public async unlockItem(playerId: string, itemType: 'avatar' | 'hat' | 'dress', itemId: string): Promise<{ success: boolean; message?: string }> {
    if (dbManager.getStatus().connected) {
      const dbRes = await dbManager.unlockPlayerItem(playerId, itemType, itemId);
      if (dbRes.success) {
        const player = this.data.players[playerId];
        if (player) {
          if (itemType === 'avatar' && !player.unlocked_avatars.includes(itemId)) player.unlocked_avatars.push(itemId);
          if (itemType === 'hat' && !player.unlocked_hats.includes(itemId)) player.unlocked_hats.push(itemId);
          if (itemType === 'dress' && !player.unlocked_dresses.includes(itemId)) player.unlocked_dresses.push(itemId);
        }
        return dbRes;
      }
    }

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
    dbManager.upsertPlayer(player).catch(err => console.warn('[GameStore] Error updating player unlocks in MongoDB:', err));
    return { success: true };
  }

  public async deletePlayer(playerId: string): Promise<boolean> {
    if (dbManager.getStatus().connected) {
      await dbManager.deletePlayer(playerId);
    }
    if (this.data.players[playerId]) {
      delete this.data.players[playerId];
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  public syncAuthPlayer(payload: {
    master_uuid: string;
    platform?: string;
    platform_player_id?: string;
    display_name?: string;
    avatar_uri?: string;
    auth_token?: string;
    is_anonymous?: boolean;
    app_version?: string;
    device_os?: string;
    locale?: string;
    coins?: number;
    diamonds?: number;
    no_ads_purchased?: boolean;
    unlocked_avatars?: string[];
    unlocked_hats?: string[];
    unlocked_dresses?: string[];
  }): PlayerAccount {
    const masterId = payload.master_uuid;
    let existingPlayer = this.data.players[masterId];

    // Check if player exists by platform_player_id (link platform account to master UUID)
    if (!existingPlayer && payload.platform_player_id) {
      for (const p of Object.values(this.data.players)) {
        if (p.platform_player_id === payload.platform_player_id) {
          existingPlayer = p;
          break;
        }
      }
    }

    if (existingPlayer) {
      if (payload.display_name && (existingPlayer.name === 'Kuttan' || !existingPlayer.name)) {
        existingPlayer.name = payload.display_name;
      }
      if (payload.platform) existingPlayer.platform = payload.platform;
      if (payload.platform_player_id) existingPlayer.platform_player_id = payload.platform_player_id;
      if (payload.avatar_uri) existingPlayer.avatar_uri = payload.avatar_uri;
      if (payload.auth_token) existingPlayer.auth_token = payload.auth_token;
      if (payload.device_os) existingPlayer.device_os = payload.device_os;
      if (payload.locale) existingPlayer.locale = payload.locale;
      if (payload.app_version) existingPlayer.app_version = payload.app_version;
      if (typeof payload.is_anonymous === 'boolean') existingPlayer.is_anonymous = payload.is_anonymous;

      // Cloud Economy Restoration & Bidirectional Sync
      if (typeof payload.coins === 'number') {
        existingPlayer.coins = Math.max(existingPlayer.coins || 0, payload.coins);
      }
      if (typeof payload.diamonds === 'number') {
        existingPlayer.diamonds = Math.max(existingPlayer.diamonds || 0, payload.diamonds);
      }
      if (payload.no_ads_purchased === true) {
        existingPlayer.no_ads_purchased = true;
      }
      if (Array.isArray(payload.unlocked_avatars)) {
        existingPlayer.unlocked_avatars = Array.from(new Set([...(existingPlayer.unlocked_avatars || []), ...payload.unlocked_avatars]));
      }
      if (Array.isArray(payload.unlocked_hats)) {
        existingPlayer.unlocked_hats = Array.from(new Set([...(existingPlayer.unlocked_hats || []), ...payload.unlocked_hats]));
      }
      if (Array.isArray(payload.unlocked_dresses)) {
        existingPlayer.unlocked_dresses = Array.from(new Set([...(existingPlayer.unlocked_dresses || []), ...payload.unlocked_dresses]));
      }

      existingPlayer.last_active_at = Date.now();
      this.saveData(this.data);
      dbManager.upsertPlayer(existingPlayer).catch(err => console.warn('[GameStore] Error updating auth player in MongoDB:', err));
      return existingPlayer;
    }

    // Create fresh player record with master_uuid
    const newPlayer: PlayerAccount = {
      id: masterId,
      master_uuid: masterId,
      name: payload.display_name || 'Kuttan',
      platform: payload.platform || 'anonymous',
      platform_player_id: payload.platform_player_id || '',
      avatar_uri: payload.avatar_uri || '',
      auth_token: payload.auth_token || '',
      device_os: payload.device_os || '',
      locale: payload.locale || '',
      app_version: payload.app_version || '1.0.4',
      is_anonymous: payload.is_anonymous !== undefined ? payload.is_anonymous : true,
      avatar: 'boy_default',
      hat: 'hat_none',
      dress: 'dress_mundu',
      coins: typeof payload.coins === 'number' ? Math.max(500, payload.coins) : 500,
      diamonds: typeof payload.diamonds === 'number' ? Math.max(15, payload.diamonds) : 15,
      no_ads_purchased: payload.no_ads_purchased || false,
      matches_played: 0,
      matches_won: 0,
      high_score: 0,
      unlocked_avatars: Array.isArray(payload.unlocked_avatars) && payload.unlocked_avatars.length > 0 ? payload.unlocked_avatars : ['boy_default', 'girl_default'],
      unlocked_hats: Array.isArray(payload.unlocked_hats) && payload.unlocked_hats.length > 0 ? payload.unlocked_hats : ['hat_none'],
      unlocked_dresses: Array.isArray(payload.unlocked_dresses) && payload.unlocked_dresses.length > 0 ? payload.unlocked_dresses : ['dress_mundu'],
      created_at: Date.now(),
      last_active_at: Date.now()
    };
    this.data.players[masterId] = newPlayer;
    this.saveData(this.data);
    dbManager.upsertPlayer(newPlayer).catch(err => console.warn('[GameStore] Error inserting auth player in MongoDB:', err));
    return newPlayer;
  }

  public deleteUserAccount(target: { master_uuid?: string; platform_player_id?: string }): { success: boolean; deleted_count: number } {
    let deletedCount = 0;
    const targetMaster = target.master_uuid;
    const targetPlatform = target.platform_player_id;

    const idsToDelete: string[] = [];
    for (const [id, player] of Object.entries(this.data.players)) {
      if ((targetMaster && (id === targetMaster || player.master_uuid === targetMaster)) ||
          (targetPlatform && targetPlatform.length > 0 && player.platform_player_id === targetPlatform)) {
        idsToDelete.push(id);
      }
    }

    for (const id of idsToDelete) {
      delete this.data.players[id];
      dbManager.deletePlayer(id).catch(err => console.warn('[GameStore] Error deleting player from MongoDB:', err));
      deletedCount++;
    }

    // Purge corresponding analytics events for complete legal privacy compliance
    if (Array.isArray(this.data.analytics_events)) {
      this.data.analytics_events = this.data.analytics_events.filter(e => {
        if (targetMaster && (e.master_uuid === targetMaster || e.player_id === targetMaster)) return false;
        return true;
      });
    }

    if (targetMaster) {
      dbManager.purgePlayerAnalytics(targetMaster).catch(err => console.warn('[GameStore] Error purging analytics from MongoDB:', err));
    }

    if (deletedCount > 0) {
      this.saveData(this.data);
    }
    return { success: true, deleted_count: deletedCount };
  }

  // --------------------------------------------------------------------------
  // PRICING MANAGEMENT (DATABASE-FIRST)
  // --------------------------------------------------------------------------
  public async getPricing(): Promise<PricingCatalog> {
    if (dbManager.getStatus().connected) {
      const cfg = await dbManager.getConfig<PricingCatalog>('pricing');
      if (cfg) return cfg;
    }
    return this.data.pricing;
  }

  public async updatePricing(newPricing: Partial<PricingCatalog>): Promise<PricingCatalog> {
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
    await dbManager.saveConfig('pricing', this.data.pricing);
    return this.data.pricing;
  }

  // --------------------------------------------------------------------------
  // MONETIZATION & ADS CONFIG (DATABASE-FIRST)
  // --------------------------------------------------------------------------
  public async getMonetization(): Promise<MonetizationConfig> {
    if (dbManager.getStatus().connected) {
      const cfg = await dbManager.getConfig<MonetizationConfig>('monetization');
      if (cfg) return cfg;
    }
    return this.data.monetization;
  }

  public async updateMonetization(newConfig: Partial<MonetizationConfig>): Promise<MonetizationConfig> {
    this.data.monetization = { ...this.data.monetization, ...newConfig };
    this.saveData(this.data);
    await dbManager.saveConfig('monetization', this.data.monetization);
    return this.data.monetization;
  }

  public recordAdImpression(rewarded: boolean = false): void {
    this.trackAdEvent({
      type: rewarded ? 'rewarded_completion' : 'banner_impression'
    });
  }

  public trackAdEvent(event: {
    type: 'banner_impression' | 'rewarded_completion' | 'ad_click';
    player_id?: string;
    player_name?: string;
    diamonds_awarded?: number;
    ad_unit_id?: string;
  }): { success: boolean; stats: any } {
    const todayKey = new Date().toISOString().split('T')[0];
    if (!this.data.stats.daily_ad_stats) {
      this.data.stats.daily_ad_stats = {};
    }
    if (!this.data.stats.daily_ad_stats[todayKey]) {
      this.data.stats.daily_ad_stats[todayKey] = {
        impressions: 0,
        banner_impressions: 0,
        rewarded_views: 0,
        clicks: 0,
        diamonds_distributed: 0
      };
    }
    const today = this.data.stats.daily_ad_stats[todayKey];

    if (event.type === 'banner_impression') {
      this.data.stats.ad_impressions = (this.data.stats.ad_impressions || 0) + 1;
      this.data.stats.banner_impressions = (this.data.stats.banner_impressions || 0) + 1;
      today.impressions = (today.impressions || 0) + 1;
      today.banner_impressions = (today.banner_impressions || 0) + 1;

      this.recordAnalyticsEvent({
        player_id: event.player_id,
        player_name: event.player_name || 'Player',
        event_name: 'AD_IMPRESSION',
        metadata: { format: 'banner', unit_id: event.ad_unit_id || this.data.monetization.banner_ad_unit_id, handled_by_tracker: true }
      });
    } else if (event.type === 'rewarded_completion') {
      this.data.stats.ad_impressions = (this.data.stats.ad_impressions || 0) + 1;
      this.data.stats.rewarded_ads_watched = (this.data.stats.rewarded_ads_watched || 0) + 1;
      const diamonds = event.diamonds_awarded || this.data.monetization.reward_diamonds_amount || 5;
      this.data.stats.diamonds_distributed = (this.data.stats.diamonds_distributed || 0) + diamonds;
      
      today.impressions = (today.impressions || 0) + 1;
      today.rewarded_views = (today.rewarded_views || 0) + 1;
      today.diamonds_distributed = (today.diamonds_distributed || 0) + diamonds;

      this.recordAnalyticsEvent({
        player_id: event.player_id,
        player_name: event.player_name || 'Player',
        event_name: 'AD_REWARD',
        metadata: { format: 'rewarded_video', diamonds, unit_id: event.ad_unit_id || this.data.monetization.rewarded_ad_unit_id, handled_by_tracker: true }
      });
    } else if (event.type === 'ad_click') {
      this.data.stats.ad_clicks = (this.data.stats.ad_clicks || 0) + 1;
      today.clicks = (today.clicks || 0) + 1;

      this.recordAnalyticsEvent({
        player_id: event.player_id,
        player_name: event.player_name || 'Player',
        event_name: 'AD_IMPRESSION',
        metadata: { format: 'click', unit_id: event.ad_unit_id, handled_by_tracker: true }
      });
    }

    this.saveData(this.data);
    dbManager.saveConfig('ad_stats', {
      ad_impressions: this.data.stats.ad_impressions,
      banner_impressions: this.data.stats.banner_impressions,
      rewarded_ads_watched: this.data.stats.rewarded_ads_watched,
      ad_clicks: this.data.stats.ad_clicks,
      diamonds_distributed: this.data.stats.diamonds_distributed,
      daily_ad_stats: this.data.stats.daily_ad_stats
    }).catch(err => console.warn('[GameStore] Error saving ad_stats to DB:', err));
    return { success: true, stats: this.getMonetizationMetrics() };
  }

  public getMonetizationMetrics() {
    const todayKey = new Date().toISOString().split('T')[0];
    const dailyStats = this.data.stats.daily_ad_stats || {};
    const todayStat = dailyStats[todayKey] || {
      impressions: 0,
      banner_impressions: 0,
      rewarded_views: 0,
      clicks: 0,
      diamonds_distributed: 0
    };

    const bannerEcpm = Number(this.data.monetization.banner_ecpm_usd) || 1.50;
    const rewardedEcpm = Number(this.data.monetization.rewarded_ecpm_usd) || 25.00;
    const cpcRate = Number(this.data.monetization.cpc_usd) || 0.12;

    const bannerImpressions = this.data.stats.banner_impressions || 0;
    const rewardedViews = this.data.stats.rewarded_ads_watched || 0;
    const totalImpressions = bannerImpressions + rewardedViews;
    const totalClicks = this.data.stats.ad_clicks || 0;
    const diamondsDistributed = this.data.stats.diamonds_distributed || 0;

    // Estimated Revenue Calculation
    const rawRevenue = (bannerImpressions * (bannerEcpm / 1000)) + 
                        (rewardedViews * (rewardedEcpm / 1000)) + 
                        (totalClicks * cpcRate);
    const estimatedRevenue = rawRevenue.toFixed(2);

    // Blended eCPM = (Total Revenue / Total Impressions) * 1000
    const blendedEcpm = totalImpressions > 0 
      ? ((rawRevenue / totalImpressions) * 1000).toFixed(2)
      : bannerEcpm.toFixed(2);

    // Click-Through Rate (CTR) = (Clicks / Impressions) * 100
    const ctr = totalImpressions > 0 
      ? ((totalClicks / totalImpressions) * 100).toFixed(2)
      : '0.00';

    // Effective Cost Per Click (CPC)
    const effectiveCpc = totalClicks > 0
      ? (rawRevenue / totalClicks).toFixed(2)
      : cpcRate.toFixed(2);

    // Today's revenue calculation
    const todayBanner = todayStat.banner_impressions || 0;
    const todayRewarded = todayStat.rewarded_views || 0;
    const todayClicks = todayStat.clicks || 0;
    const todayRawRev = (todayBanner * (bannerEcpm / 1000)) + 
                        (todayRewarded * (rewardedEcpm / 1000)) + 
                        (todayClicks * cpcRate);
    const todayRevenue = todayRawRev.toFixed(2);

    // 14-day history array sorted descending
    const dailyHistory: Array<{
      date: string;
      impressions: number;
      banner_impressions: number;
      rewarded_views: number;
      clicks: number;
      diamonds_distributed: number;
      estimated_revenue_usd: string;
      ecpm_usd: string;
    }> = [];

    const allDates = Object.keys(dailyStats).sort().reverse();
    if (!allDates.includes(todayKey)) {
      allDates.unshift(todayKey);
    }

    for (const d of allDates.slice(0, 14)) {
      const st = dailyStats[d] || { impressions: 0, banner_impressions: 0, rewarded_views: 0, clicks: 0, diamonds_distributed: 0 };
      const b = st.banner_impressions || 0;
      const r = st.rewarded_views || 0;
      const c = st.clicks || 0;
      const tot = b + r;
      const rev = (b * (bannerEcpm / 1000)) + (r * (rewardedEcpm / 1000)) + (c * cpcRate);
      const ecpm = tot > 0 ? ((rev / tot) * 1000).toFixed(2) : '0.00';
      dailyHistory.push({
        date: d,
        impressions: tot,
        banner_impressions: b,
        rewarded_views: r,
        clicks: c,
        diamonds_distributed: st.diamonds_distributed || 0,
        estimated_revenue_usd: rev.toFixed(2),
        ecpm_usd: ecpm
      });
    }

    return {
      ads_enabled: this.data.monetization.ads_enabled,
      banner_ads_enabled: this.data.monetization.banner_ads_enabled,
      rewarded_video_enabled: this.data.monetization.rewarded_video_enabled,
      use_test_ads: this.data.monetization.use_test_ads,
      total_impressions: totalImpressions,
      banner_impressions: bannerImpressions,
      rewarded_views: rewardedViews,
      total_clicks: totalClicks,
      ctr_percent: ctr,
      total_diamonds_distributed: diamondsDistributed,
      estimated_revenue_usd: estimatedRevenue,
      effective_cpm_usd: blendedEcpm,
      cpc_usd: effectiveCpc,
      today: {
        date: todayKey,
        impressions: todayBanner + todayRewarded,
        banner_impressions: todayBanner,
        rewarded_views: todayRewarded,
        clicks: todayClicks,
        diamonds_distributed: todayStat.diamonds_distributed || 0,
        estimated_revenue_usd: todayRevenue
      },
      daily_history: dailyHistory,
      rates: {
        banner_ecpm_usd: bannerEcpm,
        rewarded_ecpm_usd: rewardedEcpm,
        cpc_usd: cpcRate
      }
    };
  }

  public async resetMonetizationMetrics(): Promise<{ success: boolean; message: string }> {
    this.data.stats.ad_impressions = 0;
    this.data.stats.banner_impressions = 0;
    this.data.stats.rewarded_ads_watched = 0;
    this.data.stats.ad_clicks = 0;
    this.data.stats.diamonds_distributed = 0;
    this.data.stats.daily_ad_stats = {};
    this.saveData(this.data);
    await dbManager.saveConfig('ad_stats', {
      ad_impressions: 0,
      banner_impressions: 0,
      rewarded_ads_watched: 0,
      ad_clicks: 0,
      diamonds_distributed: 0,
      daily_ad_stats: {}
    });
    return { success: true, message: 'All ad metrics have been reset successfully in database and local cache.' };
  }

  public recordGameCompleted(): void {
    this.data.stats.total_games_completed += 1;
    this.saveData(this.data);
  }

  // Public config served to Godot mobile clients
  public async getPublicClientConfig() {
    const pricing = await this.getPricing();
    const monetization = await this.getMonetization();
    return {
      pricing,
      monetization: {
        ads_enabled: monetization.ads_enabled,
        banner_ads_enabled: monetization.banner_ads_enabled,
        interstitial_ads_enabled: monetization.interstitial_ads_enabled,
        rewarded_video_enabled: monetization.rewarded_video_enabled,
        use_test_ads: monetization.use_test_ads,
        reward_diamonds_amount: monetization.reward_diamonds_amount || 5,
        daily_impression_target: monetization.daily_impression_target || 10,
        banner_refresh_seconds: monetization.banner_refresh_seconds || 30,
        reward_cooldown_seconds: monetization.reward_cooldown_seconds || 60,
        max_daily_rewarded_views: monetization.max_daily_rewarded_views || 8,
        rewarded_video_coin_reward: monetization.rewarded_video_coin_reward,
        daily_reward_coins: monetization.daily_reward_coins,
        win_coin_reward: monetization.win_coin_reward,
        catch_hider_coin_reward: monetization.catch_hider_coin_reward,
        interstitial_interval_matches: monetization.interstitial_interval_matches,
        admob_app_id: monetization.admob_app_id,
        banner_ad_unit_id: monetization.banner_ad_unit_id,
        interstitial_ad_unit_id: monetization.interstitial_ad_unit_id,
        rewarded_ad_unit_id: monetization.rewarded_ad_unit_id
      },
      version: '1.2.0',
      maintenance: false
    };
  }

  public getPublicClientConfigSync() {
    return {
      pricing: this.data.pricing,
      monetization: {
        ads_enabled: this.data.monetization.ads_enabled,
        banner_ads_enabled: this.data.monetization.banner_ads_enabled,
        interstitial_ads_enabled: this.data.monetization.interstitial_ads_enabled,
        rewarded_video_enabled: this.data.monetization.rewarded_video_enabled,
        use_test_ads: this.data.monetization.use_test_ads,
        reward_diamonds_amount: this.data.monetization.reward_diamonds_amount || 5,
        daily_impression_target: this.data.monetization.daily_impression_target || 10,
        banner_refresh_seconds: this.data.monetization.banner_refresh_seconds || 30,
        reward_cooldown_seconds: this.data.monetization.reward_cooldown_seconds || 60,
        max_daily_rewarded_views: this.data.monetization.max_daily_rewarded_views || 8,
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

  // --------------------------------------------------------------------------
  // DOWNLOAD & TESTER STORAGE CONFIG (DATABASE-FIRST)
  // --------------------------------------------------------------------------
  public async getDownloadConfig(): Promise<DownloadConfig> {
    if (dbManager.getStatus().connected) {
      const cfg = await dbManager.getConfig<DownloadConfig>('download_config');
      if (cfg) return cfg;
    }
    return this.data.download_config;
  }

  public async updateDownloadConfig(update: Partial<DownloadConfig>): Promise<DownloadConfig> {
    this.data.download_config = {
      ...this.data.download_config,
      ...update
    };
    this.saveData(this.data);
    await dbManager.saveConfig('download_config', this.data.download_config);
    return this.data.download_config;
  }

  // --------------------------------------------------------------------------
  // TESTER ANALYTICS TRACKING
  // --------------------------------------------------------------------------
  private _getTodayKey(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private _ensureTodayDailyStats() {
    const today = this._getTodayKey();
    if (!this.data.tester_analytics.daily_stats[today]) {
      this.data.tester_analytics.daily_stats[today] = { views: 0, downloads: 0, game_opens: 0 };
    }
    return this.data.tester_analytics.daily_stats[today];
  }

  private _detectDeviceFromUA(ua: string): string {
    if (!ua) return 'Other';
    const lower = ua.toLowerCase();
    if (lower.includes('android')) return 'Android';
    if (lower.includes('iphone') || lower.includes('ipad') || lower.includes('ios')) return 'iOS';
    if (lower.includes('windows')) return 'Windows';
    if (lower.includes('macintosh') || lower.includes('mac os')) return 'Mac';
    if (lower.includes('linux')) return 'Linux';
    return 'Other';
  }

  public trackPageVisit(ip: string, userAgent: string, referrer?: string): void {
    this.data.tester_analytics.page_views += 1;
    const today = this._ensureTodayDailyStats();
    today.views += 1;

    // Track unique visitor
    const visitorKey = `${ip}_${this._getTodayKey()}`;
    const isUnique = !this.trackedVisitorIps.has(visitorKey);
    if (isUnique) {
      this.trackedVisitorIps.add(visitorKey);
      this.data.tester_analytics.unique_visitors += 1;
    }

    // Device breakdown
    const device = this._detectDeviceFromUA(userAgent);
    this.data.tester_analytics.visitor_devices[device] = (this.data.tester_analytics.visitor_devices[device] || 0) + 1;

    this.saveData(this.data);
    dbManager.recordPromoEvent('visit', { ip, user_agent: userAgent, device, referrer, is_unique: isUnique }).catch(err => console.warn('[GameStore] Error recording visit in MongoDB:', err));
  }

  public trackDownloadClick(ip: string, userAgent: string): void {
    this.data.tester_analytics.download_clicks += 1;
    const today = this._ensureTodayDailyStats();
    today.downloads += 1;
    this.saveData(this.data);
    const device = this._detectDeviceFromUA(userAgent);
    dbManager.recordPromoEvent('click', { ip, user_agent: userAgent, device }).catch(err => console.warn('[GameStore] Error recording download click in MongoDB:', err));
  }

  public trackGameOpen(playerId?: string): void {
    this.data.tester_analytics.game_opens += 1;
    const today = this._ensureTodayDailyStats();
    today.game_opens += 1;
    this.saveData(this.data);
    dbManager.recordAnalyticsEvent({
      id: 'evt_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
      timestamp: Date.now(),
      player_id: playerId,
      event_name: 'GAME_LAUNCH',
      metadata: { player_id: playerId }
    }).catch(err => console.warn('[GameStore] Error recording game launch in MongoDB:', err));
  }

  public async getTesterAnalytics() {
    if (dbManager.getStatus().connected) {
      const dbAnalytics = await dbManager.getTesterAnalytics();
      if (dbAnalytics) return dbAnalytics;
    }

    const views = this.data.tester_analytics.page_views;
    const downloads = this.data.tester_analytics.download_clicks;
    const opens = this.data.tester_analytics.game_opens;

    const conversionRate = views > 0 ? Number(((downloads / views) * 100).toFixed(1)) : 0;
    const openRate = downloads > 0 ? Number(((opens / downloads) * 100).toFixed(1)) : 0;

    return {
      ...this.data.tester_analytics,
      feedbacks_count: this.data.tester_feedbacks.length,
      conversion_rate: conversionRate,
      open_rate: openRate
    };
  }

  // --------------------------------------------------------------------------
  // TESTER & IN-GAME FEEDBACK
  // --------------------------------------------------------------------------
  public submitTesterFeedback(feedback: {
    name: string;
    rating?: number;
    category?: 'gameplay' | 'voice' | 'performance' | 'bugs' | 'general' | 'suggestion';
    device_model?: string;
    comments: string;
    source?: 'game' | 'web';
    platform?: string;
    app_version?: string;
  }): TesterFeedback {
    const entry: TesterFeedback = {
      id: 'fb_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
      timestamp: Date.now(),
      name: (feedback.name || 'Player').trim().substring(0, 50),
      rating: Math.max(1, Math.min(5, Math.round(feedback.rating || 5))),
      category: feedback.category || 'general',
      device_model: (feedback.device_model || 'Unknown Device').trim().substring(0, 60),
      comments: (feedback.comments || '').trim().substring(0, 1500),
      status: 'new',
      source: feedback.source || 'game',
      platform: (feedback.platform || 'Cross-Platform').trim().substring(0, 50),
      app_version: (feedback.app_version || '1.0.0').trim().substring(0, 20)
    };

    this.data.tester_feedbacks.unshift(entry);
    // Keep last 300 feedback submissions
    if (this.data.tester_feedbacks.length > 300) {
      this.data.tester_feedbacks = this.data.tester_feedbacks.slice(0, 300);
    }
    this.saveData(this.data);
    dbManager.insertFeedback(entry).catch(err => console.warn('[GameStore] Error inserting feedback in MongoDB:', err));
    return entry;
  }

  public async getTesterFeedbacks(limit: number = 50): Promise<TesterFeedback[]> {
    if (dbManager.getStatus().connected) {
      const dbFeedbacks = await dbManager.getFeedbacks(limit);
      if (dbFeedbacks && dbFeedbacks.length > 0) return dbFeedbacks;
    }
    return (this.data.tester_feedbacks || []).slice(0, limit);
  }

  public async updateTesterFeedbackStatus(id: string, status: 'new' | 'reviewed' | 'resolved'): Promise<boolean> {
    let dbOk = false;
    if (dbManager.getStatus().connected) {
      dbOk = await dbManager.updateFeedbackStatus(id, status);
    }
    const item = (this.data.tester_feedbacks || []).find(f => f.id === id);
    if (item) {
      item.status = status;
      this.saveData(this.data);
      return true;
    }
    return dbOk;
  }

  public async deleteTesterFeedback(id: string): Promise<boolean> {
    let dbOk = false;
    if (dbManager.getStatus().connected) {
      dbOk = await dbManager.deleteFeedback(id);
    }
    const idx = (this.data.tester_feedbacks || []).findIndex(f => f.id === id);
    if (idx !== -1) {
      this.data.tester_feedbacks.splice(idx, 1);
      this.saveData(this.data);
      return true;
    }
    return dbOk;
  }
}

export const gameStore = new GameStore();

