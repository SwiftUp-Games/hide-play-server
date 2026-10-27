import type { DashboardData, PlayerAccount, PricingCatalog, MonetizationConfig, DownloadConfig, TesterFeedback, TesterAnalytics, AdMetricsDetailed } from './types';

// In production, endpoints are relative to the current host (same server). In dev, points to localhost:8080.
const API_BASE = window.location.port === '5173' ? 'http://localhost:8080' : '';

const TOKEN_KEY = 'agy_admin_token';
const PHONE_KEY = 'agy_admin_phone';

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getSavedPhone(): string | null {
  return localStorage.getItem(PHONE_KEY);
}

export function setSession(token: string, phone: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(PHONE_KEY, phone);
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PHONE_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || `Request failed with status ${res.status}`);
  }
  return data;
}

// ----------------------------------------------------------------------------
// API CALLS
// ----------------------------------------------------------------------------
export const adminApi = {
  // Auth (10-Digit OTP Authentication Code)
  async login(code: string): Promise<{ success: boolean; token: string; message?: string }> {
    const res = await request<{ success: boolean; token: string; message?: string }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ code })
    });
    if (res.token) {
      setSession(res.token, code);
    }
    return res;
  },

  async verifySession(): Promise<{ valid: boolean; admin_code?: string; database?: { connected: boolean; db_name: string } }> {
    try {
      const res = await request<{ valid: boolean; admin_code?: string; database?: { connected: boolean; db_name: string } }>('/api/admin/me');
      return res;
    } catch {
      clearSession();
      return { valid: false };
    }
  },

  async logout(): Promise<void> {
    try {
      await request('/api/admin/logout', { method: 'POST' });
    } finally {
      clearSession();
    }
  },

  async updateAdminCode(newCode: string): Promise<{ success: boolean; message: string }> {
    return request('/api/admin/change-code', {
      method: 'POST',
      body: JSON.stringify({ code: newCode })
    });
  },

  async updateAdminMobile(newMobile: string): Promise<{ success: boolean; message: string }> {
    return this.updateAdminCode(newMobile);
  },

  // Dashboard Overview
  async getDashboard(): Promise<DashboardData> {
    return request<DashboardData>('/api/admin/stats');
  },

  // Players
  async getPlayers(): Promise<{ players: PlayerAccount[] }> {
    return request<{ players: PlayerAccount[] }>('/api/admin/players');
  },

  async adjustPlayerCoins(playerId: string, amount: number, mode: 'add' | 'set'): Promise<{ success: boolean; new_coins: number }> {
    return request(`/api/admin/players/${playerId}/coins`, {
      method: 'POST',
      body: JSON.stringify({ amount, mode })
    });
  },

  async unlockPlayerItem(playerId: string, itemType: 'avatar' | 'hat' | 'dress', itemId: string): Promise<{ success: boolean }> {
    return request(`/api/admin/players/${playerId}/unlock`, {
      method: 'POST',
      body: JSON.stringify({ item_type: itemType, item_id: itemId })
    });
  },

  async deletePlayer(playerId: string): Promise<{ success: boolean }> {
    return request(`/api/admin/players/${playerId}`, {
      method: 'DELETE'
    });
  },

  // Pricing
  async getPricing(): Promise<PricingCatalog> {
    return request<PricingCatalog>('/api/admin/pricing');
  },

  async updatePricing(pricing: Partial<PricingCatalog>): Promise<{ success: boolean; pricing: PricingCatalog }> {
    return request('/api/admin/pricing', {
      method: 'POST',
      body: JSON.stringify(pricing)
    });
  },

  // Monetization & Ads
  async getMonetization(): Promise<MonetizationConfig> {
    return request<MonetizationConfig>('/api/admin/monetization');
  },

  async updateMonetization(config: Partial<MonetizationConfig>): Promise<{ success: boolean; monetization: MonetizationConfig }> {
    return request('/api/admin/monetization', {
      method: 'POST',
      body: JSON.stringify(config)
    });
  },

  async getMonetizationMetrics(): Promise<AdMetricsDetailed> {
    return request<AdMetricsDetailed>('/api/admin/monetization/metrics');
  },

  async resetMonetizationMetrics(): Promise<{ success: boolean; message: string }> {
    return request('/api/admin/monetization/reset-metrics', {
      method: 'POST'
    });
  },

  // Rooms
  async closeRoom(roomCode: string): Promise<{ success: boolean }> {
    return request(`/api/admin/rooms/${roomCode}/close`, {
      method: 'POST'
    });
  },

  // Testers & Download Program
  async getTestersData(): Promise<{
    success: boolean;
    analytics: TesterAnalytics;
    feedbacks: TesterFeedback[];
    config: DownloadConfig;
  }> {
    return request('/api/admin/testers');
  },

  async updateDownloadConfig(config: Partial<DownloadConfig>): Promise<{ success: boolean; config: DownloadConfig; message: string }> {
    return request('/api/admin/download/config', {
      method: 'POST',
      body: JSON.stringify(config)
    });
  },

  async updateFeedbackStatus(id: string, status: 'new' | 'reviewed' | 'resolved'): Promise<{ success: boolean }> {
    return request('/api/admin/testers/feedback/status', {
      method: 'POST',
      body: JSON.stringify({ id, status })
    });
  },

  async deleteFeedback(id: string): Promise<{ success: boolean }> {
    return request(`/api/admin/testers/feedback/${id}`, {
      method: 'DELETE'
    });
  },

  // In-App Purchases & Onboarding Telemetry
  async getPurchases(limit: number = 50): Promise<{ success: boolean; purchases: any[] }> {
    return request(`/api/admin/purchases?limit=${limit}`);
  },

  async getOnboardings(limit: number = 50): Promise<{ success: boolean; onboardings: any[] }> {
    return request(`/api/admin/onboarding?limit=${limit}`);
  }
};
