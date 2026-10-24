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

export interface AnalyticsEvent {
  id: string;
  timestamp: number;
  player_id?: string;
  player_name?: string;
  event_name: 'GAME_START' | 'GAME_END' | 'SHOP_PURCHASE' | 'AD_IMPRESSION' | 'AD_REWARD' | 'COIN_TRANSACTION' | 'PLAYER_JOIN';
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
  category: 'gameplay' | 'voice' | 'performance' | 'bugs' | 'general';
  device_model: string;
  comments: string;
  status: 'new' | 'reviewed' | 'resolved';
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
    rewarded_ads_watched: number;
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
  download_config: {
    r2_download_url: process.env.R2_APK_DOWNLOAD_URL || process.env.R2_DOWNLOAD_URL || '',
    apk_version: 'v1.2.0-beta',
    apk_size_mb: '70 MB',
    apk_release_notes: [
      'Authentic 3D hide & seek village gameplay',
      'Instant 4-digit room code join & matchmaking',
      'Ultra-crisp 3D chunky action controls & spatial proximity voice bridge',
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
    rewarded_ads_watched: 0
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
            rewarded_ads_watched: parsed.stats?.rewarded_ads_watched || 0
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
  // AUTH (10-Digit OTP Authentication Code)
  // --------------------------------------------------------------------------
  public verifyMobile(mobile: string): boolean {
    const cleanInput = (mobile || '').trim().replace(/\D/g, '');
    const cleanAdmin = (this.data.admin_mobile_number || '8606094557').trim().replace(/\D/g, '');
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

  public updateAdminMobile(newMobile: string): { success: boolean; message: string } {
    const clean = (newMobile || '').trim().replace(/\D/g, '');
    if (clean.length !== 10) {
      return { success: false, message: 'Authentication code must be exactly 10 digits.' };
    }
    this.data.admin_mobile_number = clean;
    this.saveData(this.data);
    return { success: true, message: `Admin OTP authentication code updated to ${clean}` };
  }

  public updateAdminCode(newCode: string): { success: boolean; message: string } {
    return this.updateAdminMobile(newCode);
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

    // Real dynamic Ad Revenue: calculated purely from actual ad events (no fake mock defaults)
    const rawAdRev = (this.data.stats.rewarded_ads_watched * 0.025) + (this.data.stats.ad_impressions * 0.0015);
    const adRev = rawAdRev > 0 ? rawAdRev.toFixed(2) : '0.00';

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
      },
      recent_events: this.getRecentAnalyticsEvents(30)
    };
  }

  // --------------------------------------------------------------------------
  // ANALYTICS & TELEMETRY
  // --------------------------------------------------------------------------
  public recordAnalyticsEvent(event: {
    player_id?: string;
    player_name?: string;
    event_name: 'GAME_START' | 'GAME_END' | 'SHOP_PURCHASE' | 'AD_IMPRESSION' | 'AD_REWARD' | 'COIN_TRANSACTION' | 'PLAYER_JOIN';
    metadata?: Record<string, any>;
    timestamp?: number;
  }): AnalyticsEvent {
    const newEvent: AnalyticsEvent = {
      id: 'evt_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
      timestamp: event.timestamp || Date.now(),
      player_id: event.player_id,
      player_name: event.player_name,
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
      this.data.stats.ad_impressions++;
    } else if (event.event_name === 'AD_REWARD') {
      this.data.stats.rewarded_ads_watched++;
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
    return newEvent;
  }

  public getRecentAnalyticsEvents(limit: number = 50): AnalyticsEvent[] {
    return (this.data.analytics_events || []).slice(0, limit);
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
      this.recordAnalyticsEvent({
        player_id: id,
        player_name: newPlayer.name,
        event_name: 'PLAYER_JOIN',
        metadata: { is_new: true, avatar: newPlayer.avatar, coins: newPlayer.coins }
      });
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

  // --------------------------------------------------------------------------
  // DOWNLOAD & TESTER STORAGE CONFIG
  // --------------------------------------------------------------------------
  public getDownloadConfig(): DownloadConfig {
    return this.data.download_config;
  }

  public updateDownloadConfig(update: Partial<DownloadConfig>): DownloadConfig {
    this.data.download_config = {
      ...this.data.download_config,
      ...update
    };
    this.saveData(this.data);
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

  public trackPageVisit(ip: string, userAgent: string, _referrer?: string): void {
    this.data.tester_analytics.page_views += 1;
    const today = this._ensureTodayDailyStats();
    today.views += 1;

    // Track unique visitor
    const visitorKey = `${ip}_${this._getTodayKey()}`;
    if (!this.trackedVisitorIps.has(visitorKey)) {
      this.trackedVisitorIps.add(visitorKey);
      this.data.tester_analytics.unique_visitors += 1;
    }

    // Device breakdown
    const device = this._detectDeviceFromUA(userAgent);
    this.data.tester_analytics.visitor_devices[device] = (this.data.tester_analytics.visitor_devices[device] || 0) + 1;

    this.saveData(this.data);
  }

  public trackDownloadClick(_ip: string, _userAgent: string): void {
    this.data.tester_analytics.download_clicks += 1;
    const today = this._ensureTodayDailyStats();
    today.downloads += 1;
    this.saveData(this.data);
  }

  public trackGameOpen(_playerId?: string): void {
    this.data.tester_analytics.game_opens += 1;
    const today = this._ensureTodayDailyStats();
    today.game_opens += 1;
    this.saveData(this.data);
  }

  public getTesterAnalytics() {
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
  // TESTER FEEDBACK
  // --------------------------------------------------------------------------
  public submitTesterFeedback(feedback: {
    name: string;
    rating: number;
    category?: 'gameplay' | 'voice' | 'performance' | 'bugs' | 'general';
    device_model?: string;
    comments: string;
  }): TesterFeedback {
    const entry: TesterFeedback = {
      id: 'fb_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
      timestamp: Date.now(),
      name: (feedback.name || 'Anonymous Tester').trim().substring(0, 50),
      rating: Math.max(1, Math.min(5, Math.round(feedback.rating || 5))),
      category: feedback.category || 'gameplay',
      device_model: (feedback.device_model || 'Unknown Device').trim().substring(0, 60),
      comments: (feedback.comments || '').trim().substring(0, 1000),
      status: 'new'
    };

    this.data.tester_feedbacks.unshift(entry);
    // Keep last 200 feedback submissions
    if (this.data.tester_feedbacks.length > 200) {
      this.data.tester_feedbacks = this.data.tester_feedbacks.slice(0, 200);
    }
    this.saveData(this.data);
    return entry;
  }

  public getTesterFeedbacks(limit: number = 50): TesterFeedback[] {
    return this.data.tester_feedbacks.slice(0, limit);
  }

  public updateTesterFeedbackStatus(id: string, status: 'new' | 'reviewed' | 'resolved'): boolean {
    const item = this.data.tester_feedbacks.find(f => f.id === id);
    if (item) {
      item.status = status;
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  public deleteTesterFeedback(id: string): boolean {
    const idx = this.data.tester_feedbacks.findIndex(f => f.id === id);
    if (idx !== -1) {
      this.data.tester_feedbacks.splice(idx, 1);
      this.saveData(this.data);
      return true;
    }
    return false;
  }
}

export const gameStore = new GameStore();

