export type SessionStatus = 'CREATED' | 'ACTIVE' | 'PAUSED' | 'ENDED';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'PLAYING' | 'PLAYED' | 'REJECTED' | 'FAILED';
export type PlayerState = 'IDLE' | 'LOADING' | 'READY' | 'PLAYING' | 'PAUSED' | 'TRANSITIONING' | 'ENDED' | 'ERROR';
export type SourceType = 'YOUTUBE' | 'LOCAL_MP3';
export type ProjectionPreset = 'WELCOME' | 'NOW_PLAYING' | 'PARTY_VISUALS' | 'GUEST_REQUEST' | 'STANDBY';

export interface SessionSettings {
  defaultSongDurationSeconds: number; // 30, 45, 60, or 0 (full)
  defaultTransitionDurationSeconds: number; // 0, 3, 5, 8, 10
  autoApproveRequests: boolean;
  maxPendingRequestsPerGuest: number;
  allowGuestVoting: boolean;
  allowCustomTimestamps: boolean;
  allowFullSongs: boolean;
  allowRepeatedSongs: boolean;
  djDeterminesDuration: boolean;
  autoAdvance: boolean;
}

export interface Session {
  id: string;
  roomCode: string;
  name: string;
  status: SessionStatus;
  hostToken?: string;
  settings: SessionSettings;
  guestCount: number;
  currentTrack?: SongRequest;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;

  // Event & Projection Settings
  eventType?: string;
  venue?: string;
  eventDate?: string;
  startTime?: string;
  endTime?: string;
  description?: string;
  themeColor?: string;
  bannerText?: string;
  activeVisualPreset?: ProjectionPreset;
  tickerText?: string;

  // DJ Deck State
  currentDjTrackIndex?: number;
  deckRepeat?: boolean;
  deckShuffle?: boolean;
  guestRequestsPaused?: boolean;
  requestCooldownSeconds?: number;
}

export interface Guest {
  id: string;
  nickname: string;
  guestToken: string;
  sessionId: string;
  roomCode: string;
}

export interface Song {
  id?: string;
  youtubeVideoId: string;
  title: string;
  channelTitle?: string;
  artist?: string;
  album?: string;
  thumbnailUrl?: string;
  durationSeconds: number;
  embeddableStatus?: string;
}

export interface SongSearchResult {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  durationSeconds: number;
  embeddable: boolean;
  artist?: string;
  sourceType?: SourceType;
}

export interface SongRequest {
  id: string;
  song: Song;
  guestNickname: string;
  guestId: string;
  requestedStartSeconds: number;
  requestedDurationSeconds: number;
  requestedEndSeconds: number;
  status: RequestStatus;
  queuePosition: number;
  votes: number;
  userVoted: boolean;
  isDuplicate: boolean;
  createdAt: string;
  approvedAt?: string;
  startedAt?: string;
  completedAt?: string;
  selectedSourceType?: SourceType;
  selectedSourceId?: string;
}

export interface EventDJTrack {
  id: string;
  roomCode: string;
  title: string;
  artist?: string;
  album?: string;
  sourceType: SourceType;
  sourceIdentifier: string;
  durationSeconds: number;
  startSeconds: number;
  transitionType: 'CROSSFADE' | 'SEQUENTIAL' | 'CUT';
  transitionDurationSeconds: number;
  isFavorite: boolean;
  notes?: string;
  sortOrder: number;
  playbackStatus: 'UNPLAYED' | 'PLAYING' | 'PLAYED' | 'SKIPPED';
  createdAt: string;
}

export interface DJPlaylistTrack {
  id?: string;
  playlistId?: string;
  title: string;
  artist?: string;
  album?: string;
  sourceType: SourceType;
  sourceIdentifier: string;
  durationSeconds: number;
  startSeconds: number;
  transitionType: 'CROSSFADE' | 'SEQUENTIAL' | 'CUT';
  transitionDurationSeconds: number;
  isFavorite: boolean;
  notes?: string;
  sortOrder: number;
}

export interface DJPlaylist {
  id: string;
  name: string;
  description?: string;
  tags?: string;
  genre?: string;
  mood?: string;
  eventType?: string;
  estimatedDurationSeconds: number;
  trackCount: number;
  createdAt: string;
  updatedAt: string;
  tracks?: DJPlaylistTrack[];
}

export interface EventPlaybackHistory {
  id: string;
  roomCode: string;
  trackTitle: string;
  artist?: string;
  sourceType: SourceType;
  sourceIdentifier?: string;
  playlistSource: 'DJ_DECK' | 'GUEST_REQUEST';
  requesterNickname?: string;
  requestedStartSeconds: number;
  playedDurationSeconds: number;
  outcome: 'COMPLETED' | 'SKIPPED' | 'FAILED';
  startedAt: string;
  endedAt?: string;
}

export interface VisualTemplate {
  id: string;
  templateName: string;
  eventType: string;
  bannerTitle: string;
  greetingMessage?: string;
  tickerText?: string;
  themePreset: ProjectionPreset;
  bgType: 'GRADIENT' | 'ANIMATED_PATTERN' | 'IMAGE' | 'VIDEO';
  bgMediaUrl?: string;
  bgOpacity: number;
  showQrCode: boolean;
  showNowPlaying: boolean;
  showGuestAnnouncements: boolean;
  showVisualizer: boolean;
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
}

export interface SongMoment {
  id: string;
  videoId: string;
  label: string;
  startSeconds: number;
  endSeconds?: number;
  confidence: number;
  detectionMethod: 'MANUAL' | 'CROWD' | 'AUDIO_ANALYSIS';
  score: number;
  upvotes: number;
  userVoted: boolean;
  createdAt: string;
}

export interface PlaybackState {
  status: PlayerState;
  currentTrack: SongRequest | null;
  currentPositionSeconds: number;
  volume: number;
  autoAdvance: boolean;
  transitionId?: string;
  errorMessage?: string;
  playlistSource?: 'GUEST_REQUEST' | 'DJ_DECK';
  djDeckTrackId?: string;
  activeVisualPreset?: ProjectionPreset;
  tickerText?: string;
}

export interface WebSocketEvent<T = any> {
  type: string;
  roomCode: string;
  payload: T;
  timestamp: string;
}
