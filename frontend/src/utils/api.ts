const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

class API {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_URL}/api`;
  }

  async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }

  // Videos
  async getVideos() {
    return this.request('/videos');
  }

  async getVideo(id: string) {
    return this.request(`/videos/${id}`);
  }

  async createVideo(video: any) {
    return this.request('/videos', {
      method: 'POST',
      body: JSON.stringify(video),
    });
  }

  async deleteVideo(id: string) {
    return this.request(`/videos/${id}`, { method: 'DELETE' });
  }

  // Backgrounds
  async getBackgrounds() {
    return this.request('/backgrounds');
  }

  async createBackground(background: any) {
    return this.request('/backgrounds', {
      method: 'POST',
      body: JSON.stringify(background),
    });
  }

  async deleteBackground(id: string) {
    return this.request(`/backgrounds/${id}`, { method: 'DELETE' });
  }

  // Settings
  async getSettings() {
    return this.request('/settings');
  }

  async updateSettings(settings: any) {
    return this.request('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  async upgradeToPremium() {
    return this.request('/settings/premium', { method: 'POST' });
  }
}

export const api = new API();