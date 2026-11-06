import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  Maximize2,
  Minimize2,
  SkipBack,
  SkipForward,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Bookmark,
  Tv,
  HelpCircle,
} from 'lucide-react';
import { VideoItem } from '../types';
import { formatSeconds } from '../utils/youtube';

interface VideoPlayerProps {
  video: VideoItem | null;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
  onToggleWatched?: (video: VideoItem) => void;
  onAddNoteAtCurrentTime?: (seconds: number) => void;
  isTheaterMode: boolean;
  onToggleTheaterMode: () => void;
  seekToTime?: number | null;
  onSeekCompleted?: () => void;
}

// Declare YouTube API window types
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  video,
  onNext,
  onPrev,
  hasNext = false,
  hasPrev = false,
  onToggleWatched,
  onAddNoteAtCurrentTime,
  isTheaterMode,
  onToggleTheaterMode,
  seekToTime,
  onSeekCompleted,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const iframeContainerRef = useRef<HTMLDivElement>(null);

  // Player state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(80);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isApiReady, setIsApiReady] = useState<boolean>(false);
  const [isPlayerReady, setIsPlayerReady] = useState<boolean>(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState<boolean>(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState<boolean>(false);
  const [autoPlayNext, setAutoPlayNext] = useState<boolean>(true);

  // Load YouTube IFrame API once
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setIsApiReady(true);
      return;
    }

    if (!document.getElementById('yt-iframe-api')) {
      const tag = document.createElement('script');
      tag.id = 'yt-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const previousOnReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (previousOnReady) previousOnReady();
      setIsApiReady(true);
    };
  }, []);

  // Initialize or re-create player when video changes
  useEffect(() => {
    if (!video?.youtubeId) {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.debug(e);
        }
        playerRef.current = null;
      }
      setIsPlayerReady(false);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    // If API is ready and container exists, initialize YouTube Player
    if (isApiReady && window.YT && window.YT.Player) {
      try {
        if (playerRef.current) {
          playerRef.current.loadVideoById({
            videoId: video.youtubeId,
            startSeconds: 0,
          });
          return;
        }

        playerRef.current = new window.YT.Player('yt-player-element', {
          videoId: video.youtubeId,
          playerVars: {
            autoplay: 1,
            modestbranding: 1,
            rel: 0,
            controls: 1, // Keep native controls available as well
            fs: 1, // Enable native fullscreen button
            iv_load_policy: 3,
            enablejsapi: 1,
          },
          events: {
            onReady: (event: any) => {
              setIsPlayerReady(true);
              event.target.setVolume(volume);
              if (isMuted) event.target.mute();
              setDuration(event.target.getDuration() || 0);
              event.target.playVideo();
            },
            onStateChange: (event: any) => {
              // YT.PlayerState: -1: unstarted, 0: ended, 1: playing, 2: paused, 3: buffering, 5: cued
              if (event.data === 1) {
                setIsPlaying(true);
              } else if (event.data === 2) {
                setIsPlaying(false);
              } else if (event.data === 0) {
                setIsPlaying(false);
                if (video && onToggleWatched && !video.watched) {
                  onToggleWatched(video);
                }
                if (autoPlayNext && onNext && hasNext) {
                  onNext();
                }
              }
            },
          },
        });
      } catch (err) {
        console.error('Error initializing YT Player:', err);
      }
    }
  }, [video?.youtubeId, isApiReady]);

  // Handle external seek requests (e.g. clicking a timestamp note)
  useEffect(() => {
    if (seekToTime !== null && seekToTime !== undefined && playerRef.current) {
      try {
        playerRef.current.seekTo(seekToTime, true);
        playerRef.current.playVideo();
        setCurrentTime(seekToTime);
        if (onSeekCompleted) onSeekCompleted();
      } catch (err) {
        console.error('Seek error:', err);
      }
    }
  }, [seekToTime, onSeekCompleted]);

  // Sync current time and duration periodically
  useEffect(() => {
    if (!isPlaying || !playerRef.current) return;

    const interval = setInterval(() => {
      try {
        if (playerRef.current?.getCurrentTime) {
          const curr = playerRef.current.getCurrentTime();
          setCurrentTime(curr);
          const dur = playerRef.current.getDuration();
          if (dur && dur > 0) setDuration(dur);
        }
      } catch (e) {
        console.debug(e);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      } else if (e.key === 'ArrowLeft' || e.key === 'j') {
        e.preventDefault();
        seekRelative(-5);
      } else if (e.key === 'ArrowRight' || e.key === 'l') {
        e.preventDefault();
        seekRelative(5);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleVolumeChange(Math.min(100, volume + 5));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleVolumeChange(Math.max(0, volume - 5));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, volume, isMuted, currentTime, duration]);

  // Player action handlers
  const togglePlayPause = useCallback(() => {
    if (!playerRef.current) return;
    try {
      if (isPlaying) {
        playerRef.current.pauseVideo();
        setIsPlaying(false);
      } else {
        playerRef.current.playVideo();
        setIsPlaying(true);
      }
    } catch (e) {
      console.debug(e);
    }
  }, [isPlaying]);

  // MANDATORY: Volume Control handler
  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (newVolume === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }

    if (playerRef.current?.setVolume) {
      try {
        playerRef.current.setVolume(newVolume);
        if (newVolume > 0 && isMuted) {
          playerRef.current.unMute();
        }
      } catch (e) {
        console.debug(e);
      }
    }
  };

  // MANDATORY: Mute toggle
  const toggleMute = () => {
    if (!playerRef.current) return;
    try {
      if (isMuted) {
        playerRef.current.unMute();
        setIsMuted(false);
        if (volume === 0) {
          setVolume(50);
          playerRef.current.setVolume(50);
        }
      } else {
        playerRef.current.mute();
        setIsMuted(true);
      }
    } catch (e) {
      console.debug(e);
    }
  };

  // MANDATORY: Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.warn('Fullscreen request failed:', err);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.warn('Exit fullscreen failed:', err);
      });
    }
  };

  const seekRelative = (offsetSeconds: number) => {
    if (!playerRef.current) return;
    const newTime = Math.max(0, Math.min(duration, currentTime + offsetSeconds));
    try {
      playerRef.current.seekTo(newTime, true);
      setCurrentTime(newTime);
    } catch (e) {
      console.debug(e);
    }
  };

  const handleSeekSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (playerRef.current?.seekTo) {
      playerRef.current.seekTo(newTime, true);
    }
  };

  const handleSpeedSelect = (speed: number) => {
    setPlaybackRate(speed);
    setShowSpeedMenu(false);
    if (playerRef.current?.setPlaybackRate) {
      playerRef.current.setPlaybackRate(speed);
    }
  };

  // If no video is selected
  if (!video) {
    return (
      <div className="w-full bg-white rounded-xl border border-slate-200 p-8 md:p-14 text-center flex flex-col items-center justify-center min-h-[460px] shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-[#F37321]/10 flex items-center justify-center mb-5 text-[#F37321] border border-[#F37321]/20">
          <Tv className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">
          시청할 동영상 교안을 선택해주세요
        </h3>
        <p className="text-sm text-slate-600 max-w-md leading-relaxed mb-6">
          좌측 및 하단 교안 목록에서 영상을 선택하거나, 상단의{' '}
          <strong className="text-[#F37321] font-semibold">+ 새 교안 등록</strong>{' '}
          버튼을 눌러 유튜브 링크를 추가해보세요.
        </p>
        <div className="flex items-center gap-3 text-xs text-slate-600 bg-slate-50 px-4 py-2.5 rounded-lg border border-slate-200">
          <Sparkles className="w-4 h-4 text-[#F37321]" />
          <span>한화 교육 포털 전용 고화질 플레이어 및 교안 메모 지원</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-xl overflow-hidden bg-white border border-slate-200 shadow-md transition-all duration-300 ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none' : ''
      }`}
    >
      {/* Aspect Ratio 16:9 Video Canvas */}
      <div className="relative w-full aspect-video bg-black flex items-center justify-center">
        {/* YouTube Player mounting node */}
        <div ref={iframeContainerRef} className="w-full h-full">
          <div id="yt-player-element" className="w-full h-full" />
        </div>

        {/* Fallback direct iframe if API fails or delay */}
        {!isPlayerReady && (
          <div className="absolute inset-0 z-0 w-full h-full">
            <iframe
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
            />
          </div>
        )}
      </div>

      {/* Prominent Hanwha Signature Player Control Bar */}
      <div className="bg-white border-t border-slate-200 px-4 py-3 select-none">
        {/* Progress Scrubber Slider */}
        <div className="flex items-center gap-3 mb-2.5">
          <span className="text-xs font-mono text-slate-600 tabular-nums min-w-[42px]">
            {formatSeconds(currentTime)}
          </span>
          <div className="relative flex-1 group flex items-center">
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.5"
              value={currentTime}
              onChange={handleSeekSlider}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#F37321] hover:h-2 transition-all"
              aria-label="재생 시간 조절"
            />
          </div>
          <span className="text-xs font-mono text-slate-500 tabular-nums min-w-[42px] text-right">
            {formatSeconds(duration)}
          </span>
        </div>

        {/* Controls Layout */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left Group: Play/Pause, Prev/Next, Volume Slider */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Previous Video */}
            <button
              onClick={onPrev}
              disabled={!hasPrev}
              className={`p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors ${
                !hasPrev ? 'opacity-30 cursor-not-allowed' : ''
              }`}
              title="이전 교안 영상"
              aria-label="이전 교안 영상"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            {/* Play / Pause Toggle */}
            <button
              onClick={togglePlayPause}
              className="p-2.5 rounded-lg bg-[#F37321] hover:bg-[#d95e12] text-white shadow-md transition-all active:scale-95"
              title={isPlaying ? '일시정지 (스페이스바)' : '재생 (스페이스바)'}
              aria-label={isPlaying ? '일시정지' : '재생'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            {/* Next Video */}
            <button
              onClick={onNext}
              disabled={!hasNext}
              className={`p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors ${
                !hasNext ? 'opacity-30 cursor-not-allowed' : ''
              }`}
              title="다음 교안 영상"
              aria-label="다음 교안 영상"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* 10s Rewind quick button */}
            <button
              onClick={() => seekRelative(-10)}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors hidden sm:inline-flex"
              title="10초 뒤로 (←)"
              aria-label="10초 뒤로"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* MANDATORY REQUIREMENT: Volume Control Group */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <button
                onClick={toggleMute}
                className="p-2 rounded-lg text-slate-600 hover:text-[#F37321] hover:bg-slate-100 transition-colors"
                title={isMuted ? '음소거 해제 (M)' : '음소거 (M)'}
                aria-label="음소거 토글"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-red-500" />
                ) : volume < 50 ? (
                  <Volume1 className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>

              <div className="flex items-center gap-1.5 group">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseInt(e.target.value, 10))}
                  className="w-16 sm:w-24 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#F37321]"
                  aria-label="음량 조절 슬라이더"
                  title={`음량: ${isMuted ? 0 : volume}%`}
                />
                <span className="text-[11px] font-mono text-slate-600 tabular-nums w-7 text-right">
                  {isMuted ? 0 : volume}%
                </span>
              </div>
            </div>
          </div>

          {/* Right Group: Note Shortcut, Speed, Theater, Fullscreen (MANDATORY) */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Bookmark / Note at current time */}
            {onAddNoteAtCurrentTime && (
              <button
                onClick={() => onAddNoteAtCurrentTime(currentTime)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 hover:text-[#F37321] rounded-lg transition-colors border border-slate-200"
                title="현재 시간에 강의 메모 남기기"
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">메모 추가</span>
              </button>
            )}

            {/* Playback Speed Selector */}
            <div className="relative">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="px-2.5 py-1.5 text-xs font-mono font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors border border-slate-200"
                title="재생 속도"
              >
                {playbackRate}x
              </button>

              {showSpeedMenu && (
                <div className="absolute right-0 bottom-full mb-2 bg-white border border-slate-200 rounded-lg shadow-xl p-1 z-30 min-w-[75px] animate-in fade-in zoom-in-95 duration-150">
                  {[0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => handleSpeedSelect(rate)}
                      className={`w-full text-center px-2 py-1 text-xs font-mono rounded transition-colors ${
                        playbackRate === rate
                          ? 'bg-[#F37321] text-white font-semibold'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Theater Mode Toggle (hidden in fullscreen) */}
            {!isFullscreen && (
              <button
                onClick={onToggleTheaterMode}
                className={`p-2 rounded-lg transition-colors ${
                  isTheaterMode
                    ? 'text-[#F37321] bg-orange-50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title={isTheaterMode ? '일반 화면' : '극장 모드 (와이드)'}
                aria-label="극장 모드 토글"
              >
                <Tv className="w-4 h-4" />
              </button>
            )}

            {/* MANDATORY REQUIREMENT: Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg text-slate-600 hover:text-[#F37321] hover:bg-slate-100 transition-colors"
              title={isFullscreen ? '전체화면 종료 (F / ESC)' : '전체화면 (F)'}
              aria-label={isFullscreen ? '전체화면 종료' : '전체화면'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4 text-[#F37321]" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>

            {/* Shortcuts Help modal toggle */}
            <button
              onClick={() => setShowShortcutsHelp(!showShortcutsHelp)}
              className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
              title="단축키 안내"
              aria-label="단축키 안내"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Keyboard Shortcuts Hint Bar (Collapsible) */}
        {showShortcutsHelp && (
          <div className="mt-3 pt-2.5 border-t border-slate-200 text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-lg">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>
                <kbd className="px-1.5 py-0.5 bg-white text-slate-700 rounded border border-slate-200 shadow-2xs">Space</kbd> 재생/일시정지
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 bg-white text-slate-700 rounded border border-slate-200 shadow-2xs">F</kbd> 전체화면
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 bg-white text-slate-700 rounded border border-slate-200 shadow-2xs">M</kbd> 음소거
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 bg-white text-slate-700 rounded border border-slate-200 shadow-2xs">←/→</kbd> 5초 탐색
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 bg-white text-slate-700 rounded border border-slate-200 shadow-2xs">↑/↓</kbd> 음량 조절
              </span>
            </div>
            <button
              onClick={() => setShowShortcutsHelp(false)}
              className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
            >
              닫기
            </button>
          </div>
        )}
      </div>

      {/* Video Title, Speaker & Status strip */}
      <div className="bg-slate-50/70 p-4 border-t border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-[#F37321] uppercase tracking-wide">
              현재 재생 중인 교안
            </span>
            {video.speaker && (
              <>
                <span className="text-slate-400">·</span>
                <span className="text-xs text-slate-600 font-medium">강사/부서: {video.speaker}</span>
              </>
            )}
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate" title={video.title}>
            {video.title}
          </h2>
          {video.description && (
            <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
              {video.description}
            </p>
          )}
        </div>

        {/* Watched Toggle and Next Auto play */}
        <div className="flex items-center gap-3 shrink-0">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 hover:text-slate-800 select-none">
            <input
              type="checkbox"
              checked={autoPlayNext}
              onChange={(e) => setAutoPlayNext(e.target.checked)}
              className="rounded accent-[#F37321]"
            />
            <span>연속 재생</span>
          </label>

          {onToggleWatched && (
            <button
              onClick={() => onToggleWatched(video)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                video.watched
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <CheckCircle2 className={`w-3.5 h-3.5 ${video.watched ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>{video.watched ? '학습 완료' : '미완료'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
