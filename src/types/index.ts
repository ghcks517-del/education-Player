export interface VideoNote {
  id: string;
  timestamp: number; // in seconds
  formattedTime: string;
  text: string;
  createdAt: string;
}

export interface VideoItem {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  youtubeUrl: string;
  youtubeId: string;
  duration?: string;
  speaker?: string;
  tags?: string[];
  watched?: boolean;
  notes?: VideoNote[];
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string; // hex accent or tag
  order: number;
  createdAt: string;
}

export interface PlayerControlsState {
  isPlaying: boolean;
  volume: number; // 0 to 100
  isMuted: boolean;
  playbackRate: number;
  currentTime: number;
  duration: number;
  isFullscreen: boolean;
  isTheaterMode: boolean;
  autoPlayNext: boolean;
}
