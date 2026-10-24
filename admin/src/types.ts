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
