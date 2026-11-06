import { Category, VideoItem } from '../types';
import { INITIAL_CATEGORIES, INITIAL_VIDEOS } from './initialData';

const STORAGE_KEY_CATEGORIES = 'hanwha_player_categories_v1';
const STORAGE_KEY_VIDEOS = 'hanwha_player_videos_v1';
const STORAGE_KEY_ACTIVE_VIDEO = 'hanwha_player_active_video_id';

export function loadCategories(): Category[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CATEGORIES);
    if (!raw) return INITIAL_CATEGORIES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_CATEGORIES;
  } catch (e) {
    console.error('Failed to load categories from storage', e);
    return INITIAL_CATEGORIES;
  }
}

export function saveCategories(categories: Category[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(categories));
  } catch (e) {
    console.error('Failed to save categories to storage', e);
  }
}

export function loadVideos(): VideoItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VIDEOS);
    if (!raw) return INITIAL_VIDEOS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_VIDEOS;
  } catch (e) {
    console.error('Failed to load videos from storage', e);
    return INITIAL_VIDEOS;
  }
}

export function saveVideos(videos: VideoItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_VIDEOS, JSON.stringify(videos));
  } catch (e) {
    console.error('Failed to save videos to storage', e);
  }
}

export function loadLastActiveVideoId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_ACTIVE_VIDEO);
  } catch {
    return null;
  }
}

export function saveLastActiveVideoId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE_VIDEO, id);
  } catch (e) {
    console.error(e);
  }
}

export function resetAllData(): { categories: Category[]; videos: VideoItem[] } {
  try {
    localStorage.removeItem(STORAGE_KEY_CATEGORIES);
    localStorage.removeItem(STORAGE_KEY_VIDEOS);
    localStorage.removeItem(STORAGE_KEY_ACTIVE_VIDEO);
  } catch (e) {
    console.error(e);
  }
  return {
    categories: INITIAL_CATEGORIES,
    videos: INITIAL_VIDEOS,
  };
}

export function exportBackupJson(categories: Category[], videos: VideoItem[]): string {
  return JSON.stringify(
    {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      categories,
      videos,
    },
    null,
    2
  );
}

export function importBackupJson(
  jsonStr: string
): { categories: Category[]; videos: VideoItem[] } | null {
  try {
    const data = JSON.parse(jsonStr);
    if (data && Array.isArray(data.categories) && Array.isArray(data.videos)) {
      saveCategories(data.categories);
      saveVideos(data.videos);
      return {
        categories: data.categories,
        videos: data.videos,
      };
    }
  } catch (e) {
    console.error('Invalid backup JSON format', e);
  }
  return null;
}
