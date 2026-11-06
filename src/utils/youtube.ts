/**
 * Utility functions for parsing YouTube links and retrieving video information
 */

/**
 * Extracts YouTube Video ID from any standard format:
 * - https://www.youtube.com/watch?v=dQw4w9WgXcQ
 * - https://youtu.be/dQw4w9WgXcQ
 * - https://www.youtube.com/embed/dQw4w9WgXcQ
 * - https://www.youtube.com/shorts/dQw4w9WgXcQ
 * - https://www.youtube.com/live/dQw4w9WgXcQ
 * - dQw4w9WgXcQ (bare ID)
 */
export function extractYouTubeId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();

  // If already an 11-character alphanumeric/dash/underscore string
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Common YouTube URL regex patterns
  const patterns = [
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|live\/|watch\?v=|watch\?.+&v=))([\w-]{11})/,
    /youtube\.com\/playlist\?list=.*[&?]v=([\w-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Returns thumbnail URLs for a YouTube video
 */
export function getYouTubeThumbnail(
  videoId: string,
  quality: 'default' | 'mq' | 'hq' | 'maxres' = 'mq'
): string {
  if (!videoId) return '';
  switch (quality) {
    case 'maxres':
      return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    case 'hq':
      return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    case 'default':
      return `https://img.youtube.com/vi/${videoId}/default.jpg`;
    case 'mq':
    default:
      return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  }
}

/**
 * Formats seconds into mm:ss or hh:mm:ss
 */
export function formatSeconds(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  const paddedSecs = secs.toString().padStart(2, '0');
  const paddedMins = mins.toString().padStart(2, '0');

  if (hrs > 0) {
    return `${hrs}:${paddedMins}:${paddedSecs}`;
  }
  return `${paddedMins}:${paddedSecs}`;
}

/**
 * Attempts to fetch video metadata (title, author) using YouTube oEmbed (no API key required)
 */
export async function fetchYouTubeMeta(
  urlOrId: string
): Promise<{ title: string; author_name?: string } | null> {
  const videoId = extractYouTubeId(urlOrId);
  if (!videoId) return null;

  try {
    const targetUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const oembedUrl = `https://noembed.com/embed?url=${encodeURIComponent(targetUrl)}`;
    
    // We race or timeout after 3.5 seconds so UI remains fast
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(oembedUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && data.title) {
        return {
          title: data.title,
          author_name: data.author_name || '한화 교육 콘텐츠',
        };
      }
    }
  } catch (error) {
    // Graceful fallback if offline or blocked
    console.debug('Failed to fetch oEmbed info:', error);
  }
  return null;
}
