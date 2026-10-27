export interface LiveStats {
  online_players: number;
  active_rooms: number;
  live_rooms: Array<{
    code: string;
    mode: string;
    host_name: string;
    host_avatar: string;
    map: string;
    players_count: number;
    max_players: number;
    status: string;
    players: Array<{ id: number; name: string; avatar: string }>;
  }>;
  region: string;
  uptime_seconds: number;
  database?: { connected: boolean; db_name: string };
}

export interface PlayerMetrics {
  total_registered_players: number;
  active_players_today: number;
  new_players_today: number;
}

export interface EconomyMetrics {
  coins_in_circulation: number;
  total_coins_distributed: number;
  total_coins_spent: number;
  total_games_completed: number;
}

export interface MonetizationMetrics {
  ads_enabled: boolean;
  ad_impressions: number;
  rewarded_ads_watched: number;
  estimated_ad_revenue_usd: string;
}

export interface AdDailyStat {
  date: string;
  impressions: number;
  banner_impressions: number;
  rewarded_views: number;
  clicks: number;
  diamonds_distributed: number;
  estimated_revenue_usd: string;
  ecpm_usd: string;
}

export interface AdMetricsDetailed {
  ads_enabled: boolean;
  banner_ads_enabled: boolean;
  rewarded_video_enabled: boolean;
  use_test_ads: boolean;
  total_impressions: number;
  banner_impressions: number;
  rewarded_views: number;
  total_clicks: number;
  ctr_percent: string;
  total_diamonds_distributed: number;
  estimated_revenue_usd: string;
  effective_cpm_usd: string;
  cpc_usd: string;
  today: {
    date: string;
    impressions: number;
    banner_impressions: number;
    rewarded_views: number;
    clicks: number;
    diamonds_distributed: number;
    estimated_revenue_usd: string;
  };
  daily_history: AdDailyStat[];
  rates: {
    banner_ecpm_usd: number;
    rewarded_ecpm_usd: number;
    cpc_usd: number;
  };
}

export interface AnalyticsEvent {
  id: string;
  timestamp: number;
  player_id?: string;
  player_name?: string;
  event_name: 'GAME_START' | 'GAME_END' | 'SHOP_PURCHASE' | 'AD_IMPRESSION' | 'AD_REWARD' | 'COIN_TRANSACTION' | 'PLAYER_JOIN';
  metadata?: Record<string, any>;
}

export interface DashboardData {
  live: LiveStats;
  player_metrics: PlayerMetrics;
  economy_metrics: EconomyMetrics;
  monetization_metrics: MonetizationMetrics;
  recent_events?: AnalyticsEvent[];
}

export interface PlayerAccount {
  id: string;
  master_uuid?: string;
  platform?: string;
  platform_player_id?: string;
  display_name?: string;
  name: string;
  mobile_number?: string;
  avatar: string;
  hat: string;
  dress: string;
  coins: number;
  diamonds?: number;
  matches_played: number;
  matches_won: number;
  high_score: number;
  unlocked_avatars: string[];
  unlocked_hats: string[];
  unlocked_dresses: string[];
  device_os?: string;
  locale?: string;
  app_version?: string;
  is_anonymous?: boolean;
  no_ads_purchased?: boolean;
  created_at: number;
  last_active_at: number;
  is_online?: boolean;
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
  rating: number;
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
  feedbacks_count: number;
  conversion_rate: number;
  open_rate: number;
  visitor_devices: Record<string, number>;
  daily_stats: Record<string, { views: number; downloads: number; game_opens: number }>;
}
