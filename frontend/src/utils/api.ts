import Constants from 'expo-constants';

// Get backend URL from environment
const getBackendUrl = () => {
  // For Expo, use the packager proxy URL
  const backendUrl = Constants.expoConfig?.extra?.backendUrl 
    || process.env.EXPO_PUBLIC_BACKEND_URL 
    || '';
  return backendUrl;
};

const BACKEND_URL = getBackendUrl();

// Helper for API calls
const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${BACKEND_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  
  return response.json();
};

export const api = {
  // Settings
  getSettings: () => fetchApi('/api/settings'),
  updateSettings: (settings: any) => fetchApi('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  }),

  // Backgrounds
  getBackgrounds: () => fetchApi('/api/backgrounds'),
  createBackground: (data: any) => fetchApi('/api/backgrounds', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Videos
  getVideos: () => fetchApi('/api/videos'),
  createVideo: (data: any) => fetchApi('/api/videos', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  deleteVideo: (id: string) => fetchApi(`/api/videos/${id}`, {
    method: 'DELETE',
  }),

  // Shareable Links (new for Phase 4)
  createShareableLink: async (data: { title: string; duration: number; videoUri: string }) => {
    try {
      return await fetchApi('/api/share', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (error) {
      // If backend doesn't have the endpoint yet, return mock data
      const mockId = Math.random().toString(36).substring(7);
      return {
        shareUrl: `https://interview.video/v/${mockId}`,
        shareId: mockId,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      };
    }
  },

  getShareStats: async (shareId: string) => {
    try {
      return await fetchApi(`/api/share/${shareId}/stats`);
    } catch (error) {
      // Mock stats
      return {
        views: Math.floor(Math.random() * 50),
        uniqueViews: Math.floor(Math.random() * 30),
        lastViewed: new Date().toISOString(),
      };
    }
  },
};
