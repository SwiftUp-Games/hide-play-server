import { MongoClient, Db, Collection } from 'mongodb';
import { PlayerAccount, AnalyticsEvent, TesterFeedback, PricingCatalog, MonetizationConfig, DownloadConfig, TesterAnalytics } from './store';

// ============================================================================
// HIDE & PLAY — MONGODB PRODUCTION DATABASE MANAGER
// Pure Database Layer: Source of Truth for Players, Analytics, Configs & Feedback
// ============================================================================

export interface ConfigDoc {
  key: string;
  value: any;
  updated_at: number;
}

class DatabaseManager {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private isConnected: boolean = false;
  private isConnecting: boolean = false;

  private playersCol: Collection<PlayerAccount> | null = null;
  private analyticsCol: Collection<AnalyticsEvent> | null = null;
  private feedbacksCol: Collection<TesterFeedback> | null = null;
  private configsCol: Collection<ConfigDoc> | null = null;

  public async connect(): Promise<boolean> {
    const uri = process.env.MONGODB_URI?.trim();
    if (!uri) {
      console.log('[Database] MONGODB_URI not set. Running in local JSON fallback mode.');
      return false;
    }

    if (this.isConnected) return true;
    if (this.isConnecting) return false;

    this.isConnecting = true;
    const dbName = process.env.MONGODB_DB_NAME?.trim() || 'hide_and_play';

    try {
      console.log(`[Database] Connecting to MongoDB (${dbName})...`);
      this.client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 15000,
        tls: true
      });

      await this.client.connect();
      this.db = this.client.db(dbName);
      this.isConnected = true;
      this.isConnecting = false;

      // Initialize Collections
      this.playersCol = this.db.collection<PlayerAccount>('players');
      this.analyticsCol = this.db.collection<AnalyticsEvent>('analytics_events');
      this.feedbacksCol = this.db.collection<TesterFeedback>('feedbacks');
      this.configsCol = this.db.collection<ConfigDoc>('game_configs');

      // Create Optimal Indexes
      await Promise.allSettled([
        this.playersCol.createIndex({ id: 1 }, { unique: true }),
        this.playersCol.createIndex({ master_uuid: 1 }, { sparse: true }),
        this.playersCol.createIndex({ platform_player_id: 1 }, { sparse: true }),
        this.playersCol.createIndex({ auth_token: 1 }, { sparse: true }),
        this.playersCol.createIndex({ last_active_at: -1 }),

        this.analyticsCol.createIndex({ id: 1 }, { unique: true }),
        this.analyticsCol.createIndex({ timestamp: -1 }),
        this.analyticsCol.createIndex({ event_name: 1, timestamp: -1 }),
        this.analyticsCol.createIndex({ player_id: 1, timestamp: -1 }),
        this.analyticsCol.createIndex({ master_uuid: 1, timestamp: -1 }),

        this.feedbacksCol.createIndex({ id: 1 }, { unique: true }),
        this.feedbacksCol.createIndex({ timestamp: -1 }),
        this.feedbacksCol.createIndex({ status: 1 }),
        this.feedbacksCol.createIndex({ category: 1 }),
        this.feedbacksCol.createIndex({ source: 1 }),

        this.configsCol.createIndex({ key: 1 }, { unique: true })
      ]);

      console.log('================================================================');
      console.log('🍃 MongoDB connected successfully! Database: ' + dbName);
      console.log('📊 Collections: players, analytics_events, feedbacks, game_configs');
      console.log('================================================================');
      return true;
    } catch (err: any) {
      this.isConnecting = false;
      this.isConnected = false;
      console.error('[Database] Failed to connect to MongoDB:', err?.message || err);
      console.log('[Database] Continuing with local file store fallback.');
      return false;
    }
  }

  public getStatus(): { connected: boolean; db_name: string } {
    return {
      connected: this.isConnected,
      db_name: process.env.MONGODB_DB_NAME || 'Cluster0'
    };
  }

  // --------------------------------------------------------------------------
  // HYDRATION & REPOSITORIES (SOURCE OF TRUTH)
  // --------------------------------------------------------------------------
  public async loadInitialState(): Promise<{
    players?: Record<string, PlayerAccount>;
    analytics?: AnalyticsEvent[];
    feedbacks?: TesterFeedback[];
    pricing?: PricingCatalog;
    monetization?: MonetizationConfig;
    download_config?: DownloadConfig;
    admin_mobile_number?: string;
    ad_stats?: any;
  } | null> {
    if (!this.isConnected) return null;

    try {
      const result: any = {};

      // 1. Load Players
      if (this.playersCol) {
        const playersList = await this.playersCol.find({}).toArray();
        if (playersList.length > 0) {
          result.players = {};
          for (const p of playersList) {
            const { _id, ...cleanPlayer } = p as any;
            result.players[cleanPlayer.id] = cleanPlayer;
          }
          console.log(`[Database] Hydrated ${playersList.length} players from MongoDB.`);
        }
      }

      // 2. Load Feedbacks
      if (this.feedbacksCol) {
        const feedbacksList = await this.feedbacksCol.find({}).sort({ timestamp: -1 }).limit(300).toArray();
        if (feedbacksList.length > 0) {
          result.feedbacks = feedbacksList.map((f: any) => {
            const { _id, ...cleanF } = f;
            return cleanF;
          });
          console.log(`[Database] Hydrated ${feedbacksList.length} feedbacks from MongoDB.`);
        }
      }

      // 3. Load Recent Analytics Events
      if (this.analyticsCol) {
        const events = await this.analyticsCol.find({}).sort({ timestamp: -1 }).limit(200).toArray();
        if (events.length > 0) {
          result.analytics = events.map((e: any) => {
            const { _id, ...cleanE } = e;
            return cleanE;
          });
          console.log(`[Database] Hydrated ${events.length} recent analytics events from MongoDB.`);
        }
      }

      // 4. Load Configs (Pricing, Monetization, Download Config)
      if (this.configsCol) {
        const configs = await this.configsCol.find({}).toArray();
        for (const c of configs) {
          if (c.key === 'pricing') result.pricing = c.value;
          if (c.key === 'monetization') result.monetization = c.value;
          if (c.key === 'download_config') result.download_config = c.value;
          if (c.key === 'admin_security' && c.value?.admin_mobile_number) {
            result.admin_mobile_number = c.value.admin_mobile_number;
          }
          if (c.key === 'ad_stats') result.ad_stats = c.value;
        }
      }

      return result;
    } catch (err: any) {
      console.error('[Database] Error loading initial state:', err?.message || err);
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // DIRECT PLAYERS DATABASE QUERIES
  // --------------------------------------------------------------------------
  public async getPlayers(limit: number = 300): Promise<PlayerAccount[]> {
    if (!this.isConnected || !this.playersCol) return [];
    try {
      const docs = await this.playersCol.find({}).sort({ last_active_at: -1 }).limit(limit).toArray();
      return docs.map((d: any) => {
        const { _id, ...clean } = d;
        return clean;
      });
    } catch (err: any) {
      console.warn('[Database] Error fetching players:', err?.message || err);
      return [];
    }
  }

  public async getPlayer(id: string): Promise<PlayerAccount | null> {
    if (!this.isConnected || !this.playersCol) return null;
    try {
      const doc = await this.playersCol.findOne({
        $or: [{ id }, { master_uuid: id }]
      });
      if (!doc) return null;
      const { _id, ...clean } = doc as any;
      return clean;
    } catch (err: any) {
      console.warn('[Database] Error fetching player:', err?.message || err);
      return null;
    }
  }

  public async upsertPlayer(player: PlayerAccount): Promise<void> {
    if (!this.isConnected || !this.playersCol) return;
    try {
      await this.playersCol.updateOne(
        { id: player.id },
        { $set: player },
        { upsert: true }
      );
    } catch (err: any) {
      console.warn('[Database] Error saving player to MongoDB:', err?.message || err);
    }
  }

  public async adjustPlayerCoins(playerId: string, amount: number, mode: 'add' | 'set'): Promise<{ success: boolean; new_coins?: number; message?: string }> {
    if (!this.isConnected || !this.playersCol) return { success: false, message: 'Database disconnected' };
    try {
      const player = await this.getPlayer(playerId);
      if (!player) return { success: false, message: 'Player not found in database.' };
      const newCoins = mode === 'add' ? Math.max(0, (player.coins || 0) + amount) : Math.max(0, amount);
      await this.playersCol.updateOne(
        { id: player.id },
        { $set: { coins: newCoins, coins_updated_by_admin: true, last_active_at: Date.now() } }
      );
      return { success: true, new_coins: newCoins };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Error updating player coins.' };
    }
  }

  public async unlockPlayerItem(playerId: string, itemType: 'avatar' | 'hat' | 'dress', itemId: string): Promise<{ success: boolean; message?: string }> {
    if (!this.isConnected || !this.playersCol) return { success: false, message: 'Database disconnected' };
    try {
      const field = itemType === 'avatar' ? 'unlocked_avatars' : (itemType === 'hat' ? 'unlocked_hats' : 'unlocked_dresses');
      await this.playersCol.updateOne(
        { id: playerId },
        { 
          $addToSet: { [field]: itemId } as any,
          $set: { last_active_at: Date.now() }
        }
      );
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Error unlocking player item.' };
    }
  }

  public async deletePlayer(playerId: string): Promise<boolean> {
    if (!this.isConnected || !this.playersCol) return false;
    try {
      const res = await this.playersCol.deleteOne({ id: playerId });
      return (res.deletedCount || 0) > 0;
    } catch (err: any) {
      console.warn('[Database] Error deleting player from MongoDB:', err?.message || err);
      return false;
    }
  }

  // --------------------------------------------------------------------------
  // DIRECT ANALYTICS DATABASE QUERIES & AGGREGATIONS
  // --------------------------------------------------------------------------
  public async recordAnalyticsEvent(event: AnalyticsEvent): Promise<void> {
    if (!this.isConnected || !this.analyticsCol) return;
    try {
      await this.analyticsCol.insertOne({ ...event } as any);
    } catch (err: any) {
      console.warn('[Database] Error saving analytics event to MongoDB:', err?.message || err);
    }
  }

  public async getAnalyticsEvents(limit: number = 100, filter: Record<string, any> = {}): Promise<AnalyticsEvent[]> {
    if (!this.isConnected || !this.analyticsCol) return [];
    try {
      const docs = await this.analyticsCol.find(filter).sort({ timestamp: -1 }).limit(limit).toArray();
      return docs.map((d: any) => {
        const { _id, ...clean } = d;
        return clean;
      });
    } catch (err: any) {
      console.warn('[Database] Error querying analytics from MongoDB:', err?.message || err);
      return [];
    }
  }

  public async purgePlayerAnalytics(targetMaster: string): Promise<void> {
    if (!this.isConnected || !this.analyticsCol) return;
    try {
      await this.analyticsCol.deleteMany({
        $or: [
          { master_uuid: targetMaster },
          { player_id: targetMaster }
        ]
      });
    } catch (err: any) {
      console.warn('[Database] Error purging player analytics:', err?.message || err);
    }
  }

  // --------------------------------------------------------------------------
  // DIRECT FEEDBACKS DATABASE QUERIES
  // --------------------------------------------------------------------------
  public async getFeedbacks(limit: number = 100, status?: string): Promise<TesterFeedback[]> {
    if (!this.isConnected || !this.feedbacksCol) return [];
    try {
      const query: any = status && status !== 'all' ? { status } : {};
      const docs = await this.feedbacksCol.find(query).sort({ timestamp: -1 }).limit(limit).toArray();
      return docs.map((d: any) => {
        const { _id, ...clean } = d;
        return clean;
      });
    } catch (err: any) {
      console.warn('[Database] Error querying feedbacks from MongoDB:', err?.message || err);
      return [];
    }
  }

  public async insertFeedback(feedback: TesterFeedback): Promise<void> {
    if (!this.isConnected || !this.feedbacksCol) return;
    try {
      await this.feedbacksCol.insertOne({ ...feedback } as any);
    } catch (err: any) {
      console.warn('[Database] Error saving feedback to MongoDB:', err?.message || err);
    }
  }

  public async updateFeedbackStatus(id: string, status: 'new' | 'reviewed' | 'resolved'): Promise<boolean> {
    if (!this.isConnected || !this.feedbacksCol) return false;
    try {
      const res = await this.feedbacksCol.updateOne({ id }, { $set: { status } });
      return (res.matchedCount || 0) > 0;
    } catch (err: any) {
      console.warn('[Database] Error updating feedback status in MongoDB:', err?.message || err);
      return false;
    }
  }

  public async deleteFeedback(id: string): Promise<boolean> {
    if (!this.isConnected || !this.feedbacksCol) return false;
    try {
      const res = await this.feedbacksCol.deleteOne({ id });
      return (res.deletedCount || 0) > 0;
    } catch (err: any) {
      console.warn('[Database] Error deleting feedback from MongoDB:', err?.message || err);
      return false;
    }
  }

  // --------------------------------------------------------------------------
  // CONFIGS & SETTINGS PERSISTENCE
  // --------------------------------------------------------------------------
  public async getConfig<T>(key: string): Promise<T | null> {
    if (!this.isConnected || !this.configsCol) return null;
    try {
      const doc = await this.configsCol.findOne({ key });
      return doc ? (doc.value as T) : null;
    } catch (err: any) {
      console.warn(`[Database] Error getting config ${key}:`, err?.message || err);
      return null;
    }
  }

  public async saveConfig(key: string, value: any): Promise<void> {
    if (!this.isConnected || !this.configsCol) return;
    try {
      await this.configsCol.updateOne(
        { key },
        { $set: { key, value, updated_at: Date.now() } },
        { upsert: true }
      );
    } catch (err: any) {
      console.warn('[Database] Error saving config to MongoDB:', err?.message || err);
    }
  }

  // --------------------------------------------------------------------------
  // LIVE DATABASE-AGGREGATED DASHBOARD OVERVIEW
  // --------------------------------------------------------------------------
  public async getDashboardOverview(activeRoomsCount: number, onlineClientsCount: number, liveRoomsList: any[]): Promise<any> {
    if (!this.isConnected || !this.playersCol || !this.analyticsCol) return null;

    try {
      const now = Date.now();
      const oneDayAgo = now - 86400000;

      // 1. Players aggregate metrics
      const [totalPlayers, activeToday, newToday, coinAgg] = await Promise.all([
        this.playersCol.countDocuments(),
        this.playersCol.countDocuments({ last_active_at: { $gt: oneDayAgo } }),
        this.playersCol.countDocuments({ created_at: { $gt: oneDayAgo } }),
        this.playersCol.aggregate<{ totalCoins: number }>([
          { $group: { _id: null, totalCoins: { $sum: '$coins' } } }
        ]).toArray()
      ]);

      const totalCoinsInCirculation = coinAgg[0]?.totalCoins || 0;

      // 2. Telemetry and Analytics aggregates
      const [totalGamesCompleted, totalAdImpressions, totalRewardedWatched, recentEvents] = await Promise.all([
        this.analyticsCol.countDocuments({ event_name: 'GAME_END' }),
        this.analyticsCol.countDocuments({ event_name: 'AD_IMPRESSION' }),
        this.analyticsCol.countDocuments({ event_name: 'AD_REWARD' }),
        this.getAnalyticsEvents(30)
      ]);

      // 3. Monetization config
      const monetizationConfig = (await this.getConfig<MonetizationConfig>('monetization')) || {
        ads_enabled: true,
        banner_ecpm_usd: 1.5,
        rewarded_ecpm_usd: 25.0,
        cpc_usd: 0.12
      };

      const bannerEcpm = Number(monetizationConfig.banner_ecpm_usd) || 1.50;
      const rewardedEcpm = Number(monetizationConfig.rewarded_ecpm_usd) || 25.00;
      const estimatedRev = (totalAdImpressions * (bannerEcpm / 1000)) + (totalRewardedWatched * (rewardedEcpm / 1000));

      return {
        live: {
          online_players: onlineClientsCount,
          active_rooms: activeRoomsCount,
          live_rooms: liveRoomsList,
          region: process.env.SERVER_REGION || 'Asia-South (Mumbai)',
          uptime_seconds: Math.floor(process.uptime()),
          database: { connected: true, db_name: process.env.MONGODB_DB_NAME || 'Cluster0' }
        },
        player_metrics: {
          total_registered_players: totalPlayers,
          active_players_today: activeToday,
          new_players_today: newToday
        },
        economy_metrics: {
          coins_in_circulation: totalCoinsInCirculation,
          total_coins_distributed: totalCoinsInCirculation,
          total_coins_spent: 0,
          total_games_completed: totalGamesCompleted
        },
        monetization_metrics: {
          ads_enabled: monetizationConfig.ads_enabled ?? true,
          ad_impressions: totalAdImpressions,
          rewarded_ads_watched: totalRewardedWatched,
          estimated_ad_revenue_usd: estimatedRev.toFixed(2)
        },
        recent_events: recentEvents
      };
    } catch (err: any) {
      console.warn('[Database] Error aggregating dashboard metrics:', err?.message || err);
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // PROMO WEBSITE ANALYTICS (DATABASE-FIRST)
  // --------------------------------------------------------------------------
  public async recordPromoEvent(type: 'visit' | 'click', metadata: Record<string, any> = {}): Promise<void> {
    const eventName = type === 'visit' ? 'PROMO_VISIT' : 'PROMO_DOWNLOAD_CLICK';
    const newEvent: AnalyticsEvent = {
      id: 'evt_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
      timestamp: Date.now(),
      event_name: eventName,
      metadata
    };
    await this.recordAnalyticsEvent(newEvent);

    if (this.isConnected && this.configsCol) {
      const today = new Date().toISOString().split('T')[0];
      const doc = (await this.getConfig<TesterAnalytics>('tester_analytics')) || {
        page_views: 0,
        unique_visitors: 0,
        download_clicks: 0,
        game_opens: 0,
        visitor_devices: {},
        daily_stats: {}
      };

      if (!doc.daily_stats) doc.daily_stats = {};
      if (!doc.daily_stats[today]) doc.daily_stats[today] = { views: 0, downloads: 0, game_opens: 0 };
      if (!doc.visitor_devices) doc.visitor_devices = {};

      if (type === 'visit') {
        doc.page_views = (doc.page_views || 0) + 1;
        doc.daily_stats[today].views = (doc.daily_stats[today].views || 0) + 1;
        if (metadata.is_unique) {
          doc.unique_visitors = (doc.unique_visitors || 0) + 1;
        }
        const dev = metadata.device || 'Other';
        doc.visitor_devices[dev] = (doc.visitor_devices[dev] || 0) + 1;
      } else if (type === 'click') {
        doc.download_clicks = (doc.download_clicks || 0) + 1;
        doc.daily_stats[today].downloads = (doc.daily_stats[today].downloads || 0) + 1;
      }

      await this.saveConfig('tester_analytics', doc);
    }
  }

  public async getTesterAnalytics(): Promise<any> {
    if (!this.isConnected || !this.configsCol || !this.analyticsCol) return null;
    try {
      const doc = await this.getConfig<TesterAnalytics>('tester_analytics');

      const [visitCount, clickCount, openCount, feedbackCount] = await Promise.all([
        this.analyticsCol.countDocuments({ event_name: 'PROMO_VISIT' }),
        this.analyticsCol.countDocuments({ event_name: 'PROMO_DOWNLOAD_CLICK' }),
        this.analyticsCol.countDocuments({ event_name: { $in: ['GAME_LAUNCH', 'SESSION_START', 'GAME_START'] } }),
        this.feedbacksCol ? this.feedbacksCol.countDocuments() : 0
      ]);

      const views = Math.max(doc?.page_views || 0, visitCount);
      const downloads = Math.max(doc?.download_clicks || 0, clickCount);
      const opens = Math.max(doc?.game_opens || 0, openCount);

      const conversionRate = views > 0 ? Number(((downloads / views) * 100).toFixed(1)) : 0;
      const openRate = downloads > 0 ? Number(((opens / downloads) * 100).toFixed(1)) : 0;

      return {
        page_views: views,
        unique_visitors: doc?.unique_visitors || (views > 0 ? 1 : 0),
        download_clicks: downloads,
        game_opens: opens,
        visitor_devices: doc?.visitor_devices || {},
        daily_stats: doc?.daily_stats || {},
        feedbacks_count: feedbackCount,
        conversion_rate: conversionRate,
        open_rate: openRate
      };
    } catch (err: any) {
      console.warn('[Database] Error aggregating tester analytics:', err?.message || err);
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // IN-APP PURCHASES & MONETIZATION (DATABASE-FIRST)
  // --------------------------------------------------------------------------
  public async recordPurchase(purchase: {
    player_id?: string;
    master_uuid?: string;
    player_name?: string;
    item_id: string;
    item_type: string;
    currency: 'coins' | 'diamonds' | 'real_money' | string;
    price: number;
    platform?: string;
    receipt_token?: string;
  }): Promise<{ success: boolean; player?: PlayerAccount; event?: AnalyticsEvent; message?: string }> {
    const event: AnalyticsEvent = {
      id: 'evt_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
      timestamp: Date.now(),
      player_id: purchase.player_id || purchase.master_uuid,
      master_uuid: purchase.master_uuid,
      player_name: purchase.player_name,
      event_name: 'SHOP_PURCHASE',
      metadata: {
        item_id: purchase.item_id,
        item_type: purchase.item_type,
        currency: purchase.currency,
        price: purchase.price,
        platform: purchase.platform || 'mobile',
        receipt_token: purchase.receipt_token
      }
    };
    await this.recordAnalyticsEvent(event);

    const playerId = purchase.player_id || purchase.master_uuid;
    let player: PlayerAccount | null | undefined;
    if (playerId) {
      player = await this.getPlayer(playerId);
      if (player) {
        if (purchase.currency === 'coins') {
          player.coins = Math.max(0, (player.coins || 0) - purchase.price);
        } else if (purchase.currency === 'diamonds') {
          player.diamonds = Math.max(0, (player.diamonds || 0) - purchase.price);
        }

        if (purchase.item_type === 'avatar' && !player.unlocked_avatars.includes(purchase.item_id)) {
          player.unlocked_avatars.push(purchase.item_id);
        } else if (purchase.item_type === 'hat' && !player.unlocked_hats.includes(purchase.item_id)) {
          player.unlocked_hats.push(purchase.item_id);
        } else if (purchase.item_type === 'dress' && !player.unlocked_dresses.includes(purchase.item_id)) {
          player.unlocked_dresses.push(purchase.item_id);
        }
        player.last_active_at = Date.now();
        await this.upsertPlayer(player);
      }
    }

    return { success: true, player: player || undefined, event };
  }

  public async getPurchases(limit: number = 50): Promise<AnalyticsEvent[]> {
    return this.getAnalyticsEvents(limit, { event_name: { $in: ['SHOP_PURCHASE', 'PURCHASE_VERIFIED'] } });
  }

  // --------------------------------------------------------------------------
  // ONBOARDING & ACCOUNT CREATION (DATABASE-FIRST)
  // --------------------------------------------------------------------------
  public async recordOnboarding(data: {
    player_id: string;
    master_uuid?: string;
    name: string;
    avatar?: string;
    hat?: string;
    dress?: string;
    tutorial_completed?: boolean;
    device_model?: string;
    platform?: string;
  }): Promise<{ success: boolean; player?: PlayerAccount }> {
    let player = await this.getPlayer(data.player_id);
    if (!player && data.master_uuid) {
      player = await this.getPlayer(data.master_uuid);
    }

    if (player) {
      if (data.name) player.name = data.name;
      if (data.avatar) player.avatar = data.avatar;
      if (data.hat) player.hat = data.hat;
      if (data.dress) player.dress = data.dress;
      if (data.platform) player.platform = data.platform;
      if (data.device_model) player.device_os = data.device_model;
      player.last_active_at = Date.now();
      await this.upsertPlayer(player);
    } else {
      player = {
        id: data.player_id,
        master_uuid: data.master_uuid || data.player_id,
        name: data.name || 'Player',
        avatar: data.avatar || 'boy_default',
        hat: data.hat || 'hat_none',
        dress: data.dress || 'dress_mundu',
        coins: 500,
        diamonds: 15,
        matches_played: 0,
        matches_won: 0,
        high_score: 0,
        unlocked_avatars: ['boy_default', 'girl_default', ...(data.avatar ? [data.avatar] : [])],
        unlocked_hats: ['hat_none'],
        unlocked_dresses: ['dress_mundu'],
        platform: data.platform || 'mobile',
        created_at: Date.now(),
        last_active_at: Date.now()
      };
      await this.upsertPlayer(player);
    }

    const event: AnalyticsEvent = {
      id: 'evt_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
      timestamp: Date.now(),
      player_id: data.player_id,
      master_uuid: data.master_uuid,
      player_name: player.name,
      event_name: 'ONBOARDING_COMPLETED',
      metadata: {
        tutorial_completed: data.tutorial_completed ?? true,
        device_model: data.device_model,
        platform: data.platform
      }
    };
    await this.recordAnalyticsEvent(event);

    return { success: true, player };
  }

  public async getOnboardings(limit: number = 50): Promise<AnalyticsEvent[]> {
    return this.getAnalyticsEvents(limit, { event_name: { $in: ['ONBOARDING_COMPLETED', 'ACCOUNT_CREATED', 'PLAYER_JOIN'] } });
  }

  // --------------------------------------------------------------------------
  // DIAGNOSTIC SUMMARY
  // --------------------------------------------------------------------------
  public async getDiagnostics(): Promise<any> {
    if (!this.isConnected || !this.db) {
      return { connected: false, message: 'Database disconnected' };
    }

    try {
      const [players, analytics, feedbacks, configs] = await Promise.all([
        this.playersCol?.countDocuments() || 0,
        this.analyticsCol?.countDocuments() || 0,
        this.feedbacksCol?.countDocuments() || 0,
        this.configsCol?.countDocuments() || 0
      ]);

      return {
        connected: true,
        db_name: process.env.MONGODB_DB_NAME || 'Cluster0',
        collections: {
          players,
          analytics_events: analytics,
          feedbacks,
          game_configs: configs
        }
      };
    } catch (err: any) {
      return { connected: false, error: err?.message || err };
    }
  }

  public async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.isConnected = false;
      this.client = null;
    }
  }
}

export const dbManager = new DatabaseManager();
