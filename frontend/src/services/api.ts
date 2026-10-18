import {
  Session,
  SessionSettings,
  Guest,
  SongSearchResult,
  SongRequest,
  SongMoment,
  PlaybackState,
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}`;
    try {
      const errorJson = await res.json();
      errorMsg = errorJson.message || errorJson.error || errorMsg;
    } catch {
      // fallback to status text
    }
    throw new Error(errorMsg);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // Session API
  async createSession(name: string, customRoomCode?: string, djPasscode?: string): Promise<Session> {
    const payload: { name: string; customRoomCode?: string; djPasscode?: string } = { name };
    if (customRoomCode && customRoomCode.trim()) {
      payload.customRoomCode = customRoomCode.trim().toUpperCase();
    }
    if (djPasscode && djPasscode.trim()) {
      payload.djPasscode = djPasscode.trim();
    }
    const res = await fetch(`${API_BASE}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<Session>(res);
  },

  async djLogin(roomCode: string, passcode: string): Promise<Session> {
    const res = await fetch(`${API_BASE}/api/sessions/${roomCode.toUpperCase()}/dj-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode }),
    });
    return handleResponse<Session>(res);
  },

  async getAllSessions(activeOnly?: boolean): Promise<Session[]> {
    const params = activeOnly ? '?activeOnly=true' : '';
    const res = await fetch(`${API_BASE}/api/sessions${params}`);
    return handleResponse<Session[]>(res);
  },

  async closeSession(roomCode: string, hostToken?: string): Promise<Session> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (hostToken) headers['X-Host-Token'] = hostToken;
    const res = await fetch(`${API_BASE}/api/sessions/${roomCode.toUpperCase()}/close`, {
      method: 'POST',
      headers,
    });
    return handleResponse<Session>(res);
  },

  async deleteSession(roomCode: string, hostToken?: string): Promise<{ message: string }> {
    const headers: Record<string, string> = {};
    if (hostToken) headers['X-Host-Token'] = hostToken;
    const res = await fetch(`${API_BASE}/api/sessions/${roomCode.toUpperCase()}`, {
      method: 'DELETE',
      headers,
    });
    return handleResponse<{ message: string }>(res);
  },

  async getSession(roomCode: string, hostToken?: string): Promise<Session> {
    const headers: Record<string, string> = {};
    if (hostToken) headers['X-Host-Token'] = hostToken;

    const res = await fetch(`${API_BASE}/api/sessions/${roomCode.toUpperCase()}`, { headers });
    return handleResponse<Session>(res);
  },

  async joinSession(roomCode: string, nickname: string): Promise<Guest> {
    const res = await fetch(`${API_BASE}/api/sessions/${roomCode.toUpperCase()}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname }),
    });
    return handleResponse<Guest>(res);
  },

  async updateSettings(roomCode: string, hostToken: string, settings: Partial<SessionSettings>): Promise<Session> {
    const res = await fetch(`${API_BASE}/api/sessions/${roomCode.toUpperCase()}/settings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Host-Token': hostToken,
      },
      body: JSON.stringify(settings),
    });
    return handleResponse<Session>(res);
  },

  async updateStatus(roomCode: string, hostToken: string, status: string): Promise<Session> {
    const res = await fetch(`${API_BASE}/api/sessions/${roomCode.toUpperCase()}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Host-Token': hostToken,
      },
      body: JSON.stringify({ status }),
    });
    return handleResponse<Session>(res);
  },

  async getQrCode(
    roomCode: string,
    origin?: string,
    type: 'join' | 'dj' = 'join',
    passcode?: string
  ): Promise<{ roomCode: string; joinUrl: string; qrCodeDataUrl: string }> {
    const params = new URLSearchParams();
    if (origin) params.append('origin', origin);
    if (type && type !== 'join') params.append('type', type);
    if (passcode) params.append('passcode', passcode);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/api/sessions/${roomCode.toUpperCase()}/qrcode${qs}`);
    return handleResponse<{ roomCode: string; joinUrl: string; qrCodeDataUrl: string }>(res);
  },

  // Songs & YouTube API
  async searchSongs(query: string): Promise<SongSearchResult[]> {
    const res = await fetch(`${API_BASE}/api/songs/search?q=${encodeURIComponent(query)}`);
    return handleResponse<SongSearchResult[]>(res);
  },

  // Requests & Queue API
  async submitRequest(
    roomCode: string,
    guestToken: string,
    data: {
      videoId: string;
      title: string;
      channelTitle?: string;
      thumbnailUrl?: string;
      durationSeconds: number;
      requestedStartSeconds: number;
      requestedDurationSeconds: number;
    }
  ): Promise<SongRequest> {
    const res = await fetch(`${API_BASE}/api/sessions/${roomCode.toUpperCase()}/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Guest-Token': guestToken,
      },
      body: JSON.stringify(data),
    });
    return handleResponse<SongRequest>(res);
  },

  async getQueue(roomCode: string, guestId?: string): Promise<SongRequest[]> {
    const headers: Record<string, string> = {};
    if (guestId) headers['X-Guest-Id'] = guestId;

    const res = await fetch(`${API_BASE}/api/sessions/${roomCode.toUpperCase()}/queue`, { headers });
    return handleResponse<SongRequest[]>(res);
  },

  async approveRequest(requestId: string, hostToken: string): Promise<SongRequest> {
    const res = await fetch(`${API_BASE}/api/requests/${requestId}/approve`, {
      method: 'PATCH',
      headers: { 'X-Host-Token': hostToken },
    });
    return handleResponse<SongRequest>(res);
  },

  async rejectRequest(requestId: string, hostToken: string): Promise<SongRequest> {
    const res = await fetch(`${API_BASE}/api/requests/${requestId}/reject`, {
      method: 'PATCH',
      headers: { 'X-Host-Token': hostToken },
    });
    return handleResponse<SongRequest>(res);
  },

  async removeRequest(requestId: string, hostToken?: string, guestToken?: string): Promise<void> {
    const headers: Record<string, string> = {};
    if (hostToken) headers['X-Host-Token'] = hostToken;
    if (guestToken) headers['X-Guest-Token'] = guestToken;

    const res = await fetch(`${API_BASE}/api/requests/${requestId}`, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok) throw new Error(`Failed to remove request: ${res.status}`);
  },

  async reorderQueue(roomCode: string, hostToken: string, requestIds: string[]): Promise<SongRequest[]> {
    const res = await fetch(`${API_BASE}/api/sessions/${roomCode.toUpperCase()}/queue/reorder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Host-Token': hostToken,
      },
      body: JSON.stringify({ requestIds }),
    });
    return handleResponse<SongRequest[]>(res);
  },

  async moveToTop(roomCode: string, hostToken: string, requestId: string): Promise<SongRequest[]> {
    const queue = await this.getQueue(roomCode);
    const reordered = [requestId, ...queue.map((r) => r.id).filter((id) => id !== requestId)];
    return this.reorderQueue(roomCode, hostToken, reordered);
  },

  async voteRequest(requestId: string, guestToken: string): Promise<{ requestId: string; votes: number }> {
    const res = await fetch(`${API_BASE}/api/requests/${requestId}/vote`, {
      method: 'POST',
      headers: { 'X-Guest-Token': guestToken },
    });
    return handleResponse<{ requestId: string; votes: number }>(res);
  },

  // Playback Control API (Host only)
  async startPlayback(roomCode: string, hostToken: string): Promise<PlaybackState> {
    const res = await fetch(`${API_BASE}/api/sessions/${roomCode.toUpperCase()}/playback/start`, {
      method: 'POST',
      headers: { 'X-Host-Token': hostToken },
    });
    return handleResponse<PlaybackState>(res);
  },

  async skipTrack(roomCode: string, hostToken: string): Promise<PlaybackState> {
    const res = await fetch(`${API_BASE}/api/sessions/${roomCode.toUpperCase()}/playback/skip`, {
      method: 'POST',
      headers: { 'X-Host-Token': hostToken },
    });
    return handleResponse<PlaybackState>(res);
  },

  async pausePlayback(roomCode: string, hostToken: string): Promise<PlaybackState> {
    const res = await fetch(`${API_BASE}/api/sessions/${roomCode.toUpperCase()}/playback/pause`, {
      method: 'POST',
      headers: { 'X-Host-Token': hostToken },
    });
    return handleResponse<PlaybackState>(res);
  },

  async resumePlayback(roomCode: string, hostToken: string): Promise<PlaybackState> {
    const res = await fetch(`${API_BASE}/api/sessions/${roomCode.toUpperCase()}/playback/resume`, {
      method: 'POST',
      headers: { 'X-Host-Token': hostToken },
    });
    return handleResponse<PlaybackState>(res);
  },

  async completeSegment(
    roomCode: string,
    hostToken: string,
    requestId?: string,
    transitionId?: string
  ): Promise<PlaybackState> {
    const res = await fetch(`${API_BASE}/api/sessions/${roomCode.toUpperCase()}/playback/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Host-Token': hostToken,
      },
      body: JSON.stringify({ requestId, transitionId }),
    });
    return handleResponse<PlaybackState>(res);
  },

  async reportPlayerError(
    roomCode: string,
    hostToken: string,
    requestId?: string,
    errorCode?: number,
    errorMessage?: string
  ): Promise<PlaybackState> {
    const res = await fetch(`${API_BASE}/api/sessions/${roomCode.toUpperCase()}/playback/error`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Host-Token': hostToken,
      },
      body: JSON.stringify({ requestId, errorCode, errorMessage }),
    });
    return handleResponse<PlaybackState>(res);
  },

  // Smart Song Moments API
  async getMoments(videoId: string, guestId?: string): Promise<SongMoment[]> {
    const headers: Record<string, string> = {};
    if (guestId) headers['X-Guest-Id'] = guestId;

    const res = await fetch(`${API_BASE}/api/songs/${videoId}/moments`, { headers });
    return handleResponse<SongMoment[]>(res);
  },

  async createMoment(
    videoId: string,
    data: {
      label: string;
      startSeconds: number;
      endSeconds?: number;
      detectionMethod?: string;
    }
  ): Promise<SongMoment> {
    const res = await fetch(`${API_BASE}/api/songs/${videoId}/moments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<SongMoment>(res);
  },

  async voteMoment(momentId: string, guestId: string, vote: number): Promise<SongMoment> {
    const res = await fetch(`${API_BASE}/api/moments/${momentId}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Guest-Id': guestId,
      },
      body: JSON.stringify({ vote }),
    });
    return handleResponse<SongMoment>(res);
  },

  // ==========================================
  // DJ DECK API (Active Event Playlist)
  // ==========================================
  async getDeck(roomCode: string): Promise<import('../types').EventDJTrack[]> {
    const res = await fetch(`${API_BASE}/api/sessions/${roomCode.toUpperCase()}/deck`);
    return handleResponse<import('../types').EventDJTrack[]>(res);
  },

  async addDeckTrack(
    roomCode: string,
    hostToken: string,
    track: Partial<import('../types').EventDJTrack>
  ): Promise<import('../types').EventDJTrack> {
    const res = await fetch(`${API_BASE}/api/sessions/${roomCode.toUpperCase()}/deck`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Host-Token': hostToken,
      },
      body: JSON.stringify(track),
    });
    return handleResponse<import('../types').EventDJTrack>(res);
  },

  async updateDeckTrack(
    roomCode: string,
    trackId: string,
    hostToken: string,
    updates: Partial<import('../types').EventDJTrack>
  ): Promise<import('../types').EventDJTrack> {
    const res = await fetch(`${API_BASE}/api/sessions/${roomCode.toUpperCase()}/deck/${trackId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Host-Token': hostToken,
      },
      body: JSON.stringify(updates),
    });
    return handleResponse<import('../types').EventDJTrack>(res);
  },

  async removeDeckTrack(roomCode: string, trackId: string, hostToken: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/sessions/${roomCode.toUpperCase()}/deck/${trackId}`, {
      method: 'DELETE',
      headers: { 'X-Host-Token': hostToken },
    });
    if (!res.ok) throw new Error('Failed to remove DJ track');
  },

  async reorderDeck(roomCode: string, hostToken: string, trackIds: string[]): Promise<import('../types').EventDJTrack[]> {
    const res = await fetch(`${API_BASE}/api/sessions/${roomCode.toUpperCase()}/deck/reorder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Host-Token': hostToken,
      },
      body: JSON.stringify({ trackIds }),
    });
    return handleResponse<import('../types').EventDJTrack[]>(res);
  },

  async setDeckDurationAll(
    roomCode: string,
    hostToken: string,
    durationSeconds: number
  ): Promise<import('../types').EventDJTrack[]> {
    const res = await fetch(`${API_BASE}/api/sessions/${roomCode.toUpperCase()}/deck/duration-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Host-Token': hostToken,
      },
      body: JSON.stringify({ durationSeconds }),
    });
    return handleResponse<import('../types').EventDJTrack[]>(res);
  },

  async loadPlaylistIntoDeck(
    roomCode: string,
    hostToken: string,
    playlistId: string,
    replaceExisting: boolean = true
  ): Promise<import('../types').EventDJTrack[]> {
    const res = await fetch(`${API_BASE}/api/sessions/${roomCode.toUpperCase()}/deck/load-playlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Host-Token': hostToken,
      },
      body: JSON.stringify({ playlistId, replaceExisting }),
    });
    return handleResponse<import('../types').EventDJTrack[]>(res);
  },

  async shuffleDeck(roomCode: string, hostToken: string): Promise<import('../types').EventDJTrack[]> {
    const res = await fetch(`${API_BASE}/api/sessions/${roomCode.toUpperCase()}/deck/shuffle`, {
      method: 'POST',
      headers: { 'X-Host-Token': hostToken },
    });
    return handleResponse<import('../types').EventDJTrack[]>(res);
  },

  async clearDeck(roomCode: string, hostToken: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/sessions/${roomCode.toUpperCase()}/deck`, {
      method: 'DELETE',
      headers: { 'X-Host-Token': hostToken },
    });
    if (!res.ok) throw new Error('Failed to clear deck');
  },

  async playDeckTrackNow(roomCode: string, trackId: string, hostToken: string): Promise<PlaybackState> {
    const res = await fetch(`${API_BASE}/api/sessions/${roomCode.toUpperCase()}/deck/${trackId}/play-now`, {
      method: 'POST',
      headers: { 'X-Host-Token': hostToken },
    });
    return handleResponse<PlaybackState>(res);
  },

  async playSingleLibraryTrack(roomCode: string, playlistTrackId: string, hostToken: string): Promise<PlaybackState> {
    const res = await fetch(`${API_BASE}/api/sessions/${roomCode.toUpperCase()}/deck/play-library-track/${playlistTrackId}`, {
      method: 'POST',
      headers: { 'X-Host-Token': hostToken },
    });
    return handleResponse<PlaybackState>(res);
  },

  async importYouTubePlaylist(
    roomCode: string,
    hostToken: string,
    playlistUrl: string,
    replaceExisting?: boolean
  ): Promise<import('../types').EventDJTrack[]> {
    const res = await fetch(`${API_BASE}/api/sessions/${roomCode.toUpperCase()}/deck/import-youtube-playlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Host-Token': hostToken,
      },
      body: JSON.stringify({ playlistUrl, replaceExisting: !!replaceExisting }),
    });
    return handleResponse<import('../types').EventDJTrack[]>(res);
  },

  async importYouTubeCsv(
    roomCode: string,
    hostToken: string,
    csvContent: string,
    replaceExisting?: boolean
  ): Promise<import('../types').EventDJTrack[]> {
    const res = await fetch(`${API_BASE}/api/sessions/${roomCode.toUpperCase()}/deck/import-youtube-csv`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Host-Token': hostToken,
      },
      body: JSON.stringify({ csvContent, replaceExisting: !!replaceExisting }),
    });
    return handleResponse<import('../types').EventDJTrack[]>(res);
  },

  async resolveSongBatch(
    items: string[],
    autoSelectFirst: boolean = true
  ): Promise<import('../types').ResolveSongItem[]> {
    const res = await fetch(`${API_BASE}/api/songs/resolve-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, autoSelectFirst }),
    });
    return handleResponse<import('../types').ResolveSongItem[]>(res);
  },

  async resolveSingle(
    input: string,
    autoSelectFirst: boolean = true
  ): Promise<import('../types').ResolveSongItem> {
    const res = await fetch(
      `${API_BASE}/api/songs/resolve-single?input=${encodeURIComponent(input)}&autoSelectFirst=${autoSelectFirst}`
    );
    return handleResponse<import('../types').ResolveSongItem>(res);
  },

  async importResolvedTracks(
    roomCode: string,
    hostToken: string,
    tracks: any[],
    replaceExisting?: boolean
  ): Promise<import('../types').EventDJTrack[]> {
    const res = await fetch(`${API_BASE}/api/sessions/${roomCode.toUpperCase()}/deck/import-resolved`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Host-Token': hostToken,
      },
      body: JSON.stringify({ tracks, replaceExisting: !!replaceExisting }),
    });
    return handleResponse<import('../types').EventDJTrack[]>(res);
  },

  async importResolvedIntoLibrary(
    name: string,
    tracks: any[]
  ): Promise<import('../types').DJPlaylist> {
    const res = await fetch(`${API_BASE}/api/dj/playlists/import-resolved`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, tracks }),
    });
    return handleResponse<import('../types').DJPlaylist>(res);
  },

  async universalSearch(
    roomCode: string,
    query: string
  ): Promise<import('../types').UniversalSearchResponse> {
    const res = await fetch(
      `${API_BASE}/api/sessions/${roomCode.toUpperCase()}/deck/universal-search?q=${encodeURIComponent(query)}`
    );
    return handleResponse<import('../types').UniversalSearchResponse>(res);
  },

  // ==========================================
  // DJ LIBRARY API (Reusable Sets)
  // ==========================================
  async listPlaylists(eventType?: string): Promise<import('../types').DJPlaylist[]> {
    const url = eventType
      ? `${API_BASE}/api/dj/playlists?eventType=${encodeURIComponent(eventType)}`
      : `${API_BASE}/api/dj/playlists`;
    const res = await fetch(url);
    return handleResponse<import('../types').DJPlaylist[]>(res);
  },

  async getPlaylist(playlistId: string): Promise<import('../types').DJPlaylist> {
    const res = await fetch(`${API_BASE}/api/dj/playlists/${playlistId}`);
    return handleResponse<import('../types').DJPlaylist>(res);
  },

  async createPlaylist(playlist: Partial<import('../types').DJPlaylist>): Promise<import('../types').DJPlaylist> {
    const res = await fetch(`${API_BASE}/api/dj/playlists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(playlist),
    });
    return handleResponse<import('../types').DJPlaylist>(res);
  },

  async saveDeckAsPlaylist(
    roomCode: string,
    hostToken: string,
    name: string,
    description?: string,
    eventType?: string
  ): Promise<import('../types').DJPlaylist> {
    const res = await fetch(`${API_BASE}/api/dj/playlists/save-deck?roomCode=${roomCode.toUpperCase()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Host-Token': hostToken,
      },
      body: JSON.stringify({ name, description, eventType }),
    });
    return handleResponse<import('../types').DJPlaylist>(res);
  },

  async duplicatePlaylist(playlistId: string, name?: string): Promise<import('../types').DJPlaylist> {
    const res = await fetch(`${API_BASE}/api/dj/playlists/${playlistId}/duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    return handleResponse<import('../types').DJPlaylist>(res);
  },

  async deletePlaylist(playlistId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/dj/playlists/${playlistId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete playlist');
  },

  // ==========================================
  // EXPORT & IMPORT API
  // ==========================================
  getExportDeckUrl(roomCode: string, format: string = 'JSON'): string {
    return `${API_BASE}/api/sessions/${roomCode.toUpperCase()}/export/deck?format=${format}`;
  },

  getExportRequestsUrl(roomCode: string, format: string = 'JSON', statusFilter?: string): string {
    let url = `${API_BASE}/api/sessions/${roomCode.toUpperCase()}/export/requests?format=${format}`;
    if (statusFilter) url += `&statusFilter=${encodeURIComponent(statusFilter)}`;
    return url;
  },

  getExportHistoryUrl(roomCode: string, format: string = 'JSON'): string {
    return `${API_BASE}/api/sessions/${roomCode.toUpperCase()}/export/history?format=${format}`;
  },

  async importIntoLibrary(name: string, content: string, format: string = 'JSON'): Promise<import('../types').DJPlaylist> {
    const res = await fetch(`${API_BASE}/api/dj/playlists/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, content, format }),
    });
    return handleResponse<import('../types').DJPlaylist>(res);
  },

  async importIntoDeck(
    roomCode: string,
    hostToken: string,
    content: string,
    format: string = 'JSON',
    replaceExisting: boolean = true
  ): Promise<import('../types').EventDJTrack[]> {
    const res = await fetch(`${API_BASE}/api/sessions/${roomCode.toUpperCase()}/import/deck`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Host-Token': hostToken,
      },
      body: JSON.stringify({ content, format, replaceExisting }),
    });
    return handleResponse<import('../types').EventDJTrack[]>(res);
  },

  // ==========================================
  // EVENT & PLAYBACK HISTORY API
  // ==========================================
  async updateEventDetails(
    roomCode: string,
    hostToken: string,
    details: Partial<Session>
  ): Promise<Session> {
    const res = await fetch(`${API_BASE}/api/sessions/${roomCode.toUpperCase()}/event`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Host-Token': hostToken,
      },
      body: JSON.stringify(details),
    });
    return handleResponse<Session>(res);
  },

  async getEventHistory(roomCode: string): Promise<import('../types').EventPlaybackHistory[]> {
    const res = await fetch(`${API_BASE}/api/sessions/${roomCode.toUpperCase()}/history`);
    return handleResponse<import('../types').EventPlaybackHistory[]>(res);
  },

  // ==========================================
  // VISUAL PROJECTION API (Projector Mode)
  // ==========================================
  async listVisualTemplates(eventType?: string): Promise<import('../types').VisualTemplate[]> {
    const url = eventType
      ? `${API_BASE}/api/projector/templates?eventType=${encodeURIComponent(eventType)}`
      : `${API_BASE}/api/projector/templates`;
    const res = await fetch(url);
    return handleResponse<import('../types').VisualTemplate[]>(res);
  },

  async switchProjectorPreset(
    roomCode: string,
    hostToken: string,
    preset: import('../types').ProjectionPreset,
    tickerText?: string
  ): Promise<void> {
    const res = await fetch(`${API_BASE}/api/sessions/${roomCode.toUpperCase()}/projector/preset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Host-Token': hostToken,
      },
      body: JSON.stringify({ preset, tickerText }),
    });
    if (!res.ok) throw new Error('Failed to switch projector preset');
  },

  async sendProjectorAnnouncement(
    roomCode: string,
    hostToken: string,
    announcement: string
  ): Promise<void> {
    const res = await fetch(`${API_BASE}/api/sessions/${roomCode.toUpperCase()}/projector/announcement`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Host-Token': hostToken,
      },
      body: JSON.stringify({ announcement }),
    });
    if (!res.ok) throw new Error('Failed to broadcast projector announcement');
  },

  async createVisualTemplate(
    template: Partial<import('../types').VisualTemplate>
  ): Promise<import('../types').VisualTemplate> {
    const res = await fetch(`${API_BASE}/api/projector/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template),
    });
    return handleResponse<import('../types').VisualTemplate>(res);
  },

  async updateVisualTemplate(
    id: string,
    template: Partial<import('../types').VisualTemplate>
  ): Promise<import('../types').VisualTemplate> {
    const res = await fetch(`${API_BASE}/api/projector/templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template),
    });
    return handleResponse<import('../types').VisualTemplate>(res);
  },

  async deleteVisualTemplate(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/projector/templates/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete template');
  },

  async activateVisualTemplate(
    roomCode: string,
    hostToken: string,
    templateId: string
  ): Promise<void> {
    const res = await fetch(
      `${API_BASE}/api/sessions/${roomCode.toUpperCase()}/projector/activate-template/${templateId}`,
      {
        method: 'POST',
        headers: { 'X-Host-Token': hostToken },
      }
    );
    if (!res.ok) throw new Error('Failed to activate celebration moment');
  },

  async updateProjectorCustomScreen(
    roomCode: string,
    hostToken: string,
    data: import('../types').ProjectorCustomScreen
  ): Promise<void> {
    const res = await fetch(`${API_BASE}/api/sessions/${roomCode.toUpperCase()}/projector/custom-screen`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Host-Token': hostToken,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update projector custom screen');
  },

  async uploadVisualAsset(
    file: File,
    hostToken: string
  ): Promise<{ storageKey: string; originalFilename: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/api/media/visuals`, {
      method: 'POST',
      headers: { 'X-Host-Token': hostToken },
      body: formData,
    });
    return handleResponse<{ storageKey: string; originalFilename: string }>(res);
  },
};
