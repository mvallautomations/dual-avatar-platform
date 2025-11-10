import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API methods
export const api = {
  // Auth
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }),
  register: (name: string, email: string, password: string) =>
    apiClient.post('/auth/register', { name, email, password }),
  logout: () => apiClient.post('/auth/logout'),
  getCurrentUser: () => apiClient.get('/auth/me'),

  // Projects
  getProjects: () => apiClient.get('/projects'),
  getProject: (id: string) => apiClient.get(`/projects/${id}`),
  createProject: (data: { title: string; description?: string }) =>
    apiClient.post('/projects', data),
  updateProject: (id: string, data: Partial<{ title: string; description: string }>) =>
    apiClient.put(`/projects/${id}`, data),
  deleteProject: (id: string) => apiClient.delete(`/projects/${id}`),
  duplicateProject: (id: string) => apiClient.post(`/projects/${id}/duplicate`),

  // Videos
  getVideos: (params?: { project_id?: string; status?: string }) =>
    apiClient.get('/videos', { params }),
  getVideo: (id: string) => apiClient.get(`/videos/${id}`),
  createVideo: (data: {
    project_id: string;
    title: string;
    script?: any;
    timeline?: any;
  }) => apiClient.post('/videos', data),
  updateVideo: (
    id: string,
    data: Partial<{ title: string; script: any; timeline: any }>
  ) => apiClient.put(`/videos/${id}`, data),
  deleteVideo: (id: string) => apiClient.delete(`/videos/${id}`),
  renderVideo: (id: string) => apiClient.post(`/videos/${id}/render`),
  getVideoStatus: (id: string) => apiClient.get(`/videos/${id}/status`),
  downloadVideo: (id: string) => apiClient.get(`/videos/${id}/download`),
  cancelRender: (id: string) => apiClient.post(`/videos/${id}/cancel`),

  // Characters
  getCharacters: () => apiClient.get('/characters'),
  getCharacter: (id: string) => apiClient.get(`/characters/${id}`),
  createCharacter: (data: { name: string; voice_id?: string; avatar_config?: any }) =>
    apiClient.post('/characters', data),
  updateCharacter: (
    id: string,
    data: Partial<{ name: string; voice_id: string; avatar_config: any }>
  ) => apiClient.put(`/characters/${id}`, data),
  deleteCharacter: (id: string) => apiClient.delete(`/characters/${id}`),
  uploadCharacterAsset: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post(`/characters/${id}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Assets
  getAssets: (params?: { type?: string; project_id?: string }) =>
    apiClient.get('/assets', { params }),
  getAsset: (id: string) => apiClient.get(`/assets/${id}`),
  uploadAsset: (file: File, type: string, project_id?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    if (project_id) formData.append('project_id', project_id);
    return apiClient.post('/assets/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteAsset: (id: string) => apiClient.delete(`/assets/${id}`),
  getAssetUrl: (id: string) => apiClient.get(`/assets/${id}/url`),

  // Transcriptions
  createTranscription: (videoId: string, data: { audioStorageKey: string; language?: string }) =>
    apiClient.post(`/transcriptions/video/${videoId}`, data),
  getTranscription: (videoId: string) => apiClient.get(`/transcriptions/video/${videoId}`),
  updateTranscription: (transcriptionId: string, segments: any[]) =>
    apiClient.put(`/transcriptions/${transcriptionId}`, { segments }),
  generateSubtitles: (transcriptionId: string, options?: { maxCharsPerLine?: number; maxDuration?: number }) =>
    apiClient.post(`/transcriptions/${transcriptionId}/subtitles`, options),
  exportTranscription: (transcriptionId: string, format: 'srt' | 'vtt' | 'txt' | 'json') =>
    apiClient.get(`/transcriptions/${transcriptionId}/export?format=${format}`),
  getSubtitleTracks: (videoId: string) =>
    apiClient.get(`/transcriptions/subtitles/video/${videoId}`),
  updateSubtitleTrack: (trackId: string, data: { entries?: any[]; style?: any }) =>
    apiClient.put(`/transcriptions/subtitles/${trackId}`, data),

  // Eye Tracking
  startEyeTracking: (videoId: string, data: {
    videoStorageKey: string;
    targetPosition?: { x: number; y: number; z: number };
    correctionStrength?: number;
    smoothing?: number;
    preserveBlinking?: boolean;
    framerate?: number;
  }) => apiClient.post(`/eye-tracking/video/${videoId}`, data),
  getEyeTrackingData: (videoId: string, keyframesOnly?: boolean) =>
    apiClient.get(`/eye-tracking/video/${videoId}`, { params: { keyframesOnly } }),
  updateEyeTrackingConfig: (eyeTrackingId: string, config: {
    targetPosition?: { x: number; y: number; z: number };
    correctionStrength?: number;
    smoothing?: number;
  }) => apiClient.put(`/eye-tracking/${eyeTrackingId}`, config),
  applyEyeCorrection: (videoId: string, data: { eyeTrackingId: string; outputPath: string }) =>
    apiClient.post(`/eye-tracking/video/${videoId}/apply`, data),
  getEyeContactMetrics: (videoId: string) =>
    apiClient.get(`/eye-tracking/video/${videoId}/metrics`),
  getGazeHeatmap: (videoId: string, width?: number, height?: number) =>
    apiClient.get(`/eye-tracking/video/${videoId}/heatmap`, { params: { width, height } }),

  // Timeline
  getTimeline: (videoId: string) => apiClient.get(`/timeline/video/${videoId}`),
  createClip: (videoId: string, data: {
    type: 'video' | 'audio' | 'image' | 'text' | 'avatar';
    startTime: number;
    endTime: number;
    trackIndex?: number;
    sourceAssetId?: string;
    sourceUrl?: string;
    properties?: any;
  }) => apiClient.post(`/timeline/video/${videoId}/clips`, data),
  updateClip: (clipId: string, data: any) => apiClient.put(`/timeline/clips/${clipId}`, data),
  deleteClip: (clipId: string) => apiClient.delete(`/timeline/clips/${clipId}`),
  duplicateClip: (clipId: string, offsetTime?: number) =>
    apiClient.post(`/timeline/clips/${clipId}/duplicate`, { offsetTime }),
  trimClip: (clipId: string, startTime: number, endTime: number) =>
    apiClient.post(`/timeline/clips/${clipId}/trim`, { startTime, endTime }),
  splitClip: (clipId: string, splitTime: number) =>
    apiClient.post(`/timeline/clips/${clipId}/split`, { splitTime }),
  checkCollisions: (videoId: string) =>
    apiClient.get(`/timeline/video/${videoId}/collisions`),
  arrangeClips: (videoId: string) =>
    apiClient.post(`/timeline/video/${videoId}/arrange`),
  validateTimeline: (videoId: string) =>
    apiClient.get(`/timeline/video/${videoId}/validate`),
  exportTimeline: (videoId: string, format: 'ffmpeg' | 'json') =>
    apiClient.get(`/timeline/video/${videoId}/export?format=${format}`),
  bulkUpdateClips: (videoId: string, clips: any[]) =>
    apiClient.put(`/timeline/video/${videoId}/bulk`, { clips }),
};
