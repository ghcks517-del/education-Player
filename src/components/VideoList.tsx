import React, { useState } from 'react';
import {
  Play,
  CheckCircle2,
  Clock,
  User,
  MoreVertical,
  Edit2,
  Trash2,
  Search,
  Plus,
  Filter,
  Check,
  Video,
  LayoutGrid,
  List,
} from 'lucide-react';
import { Category, VideoItem } from '../types';
import { getYouTubeThumbnail } from '../utils/youtube';

interface VideoListProps {
  videos: VideoItem[];
  categories: Category[];
  activeVideoId: string | null;
  onSelectVideo: (video: VideoItem) => void;
  onOpenCreateVideo: () => void;
  onEditVideo: (video: VideoItem) => void;
  onDeleteVideo: (video: VideoItem) => void;
  onToggleWatched: (video: VideoItem) => void;
  selectedCategoryId: string | null;
}

export const VideoList: React.FC<VideoListProps> = ({
  videos,
  categories,
  activeVideoId,
  onSelectVideo,
  onOpenCreateVideo,
  onEditVideo,
  onDeleteVideo,
  onToggleWatched,
  selectedCategoryId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterWatched, setFilterWatched] = useState<'all' | 'watched' | 'unwatched'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  React.useEffect(() => {
    const handleOutsideClick = () => setActiveMenuId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const getCategory = (catId: string) => {
    return categories.find((c) => c.id === catId);
  };

  // Filter videos based on category, search, and watched filter
  const filteredVideos = videos.filter((video) => {
    // Category filter
    if (selectedCategoryId && video.categoryId !== selectedCategoryId) {
      return false;
    }

    // Watched filter
    if (filterWatched === 'watched' && !video.watched) return false;
    if (filterWatched === 'unwatched' && video.watched) return false;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const inTitle = video.title.toLowerCase().includes(q);
      const inDesc = video.description?.toLowerCase().includes(q);
      const inSpeaker = video.speaker?.toLowerCase().includes(q);
      const inTags = video.tags?.some((t) => t.toLowerCase().includes(q));
      return inTitle || inDesc || inSpeaker || inTags;
    }

    return true;
  });

  return (
    <div className="w-full space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="교안 제목, 강사명, 키워드 검색..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-[#F37321] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700"
            >
              초기화
            </button>
          )}
        </div>

        {/* Filter controls and view switch */}
        <div className="flex items-center gap-2">
          {/* Watched segmented filter */}
          <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200">
            <button
              onClick={() => setFilterWatched('all')}
              className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
                filterWatched === 'all'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              전체 ({videos.length})
            </button>
            <button
              onClick={() => setFilterWatched('unwatched')}
              className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
                filterWatched === 'unwatched'
                  ? 'bg-white text-[#F37321] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              미시청
            </button>
            <button
              onClick={() => setFilterWatched('watched')}
              className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
                filterWatched === 'watched'
                  ? 'bg-white text-emerald-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              완료
            </button>
          </div>

          {/* View mode buttons */}
          <div className="flex items-center bg-slate-100 rounded-lg border border-slate-200 p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="그리드 뷰"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="리스트 뷰"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Add video button */}
          <button
            onClick={onOpenCreateVideo}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#F37321] hover:bg-[#d95e12] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">교안 추가</span>
          </button>
        </div>
      </div>

      {/* Videos List / Grid */}
      {filteredVideos.length === 0 ? (
        <div className="w-full bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-500">
            <Video className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-slate-800 mb-1">
            등록된 교안 영상이 없습니다
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            {searchQuery
              ? '검색 조건에 맞는 교안이 없습니다. 검색어를 변경해보세요.'
              : '새로운 유튜브 영상 링크를 등록하여 학습을 시작해보세요.'}
          </p>
          <button
            onClick={onOpenCreateVideo}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#F37321] hover:bg-[#d95e12] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>첫 교안 등록하기</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVideos.map((video) => {
            const isActive = activeVideoId === video.id;
            const category = getCategory(video.categoryId);
            const isMenuOpen = activeMenuId === video.id;

            return (
              <div
                key={video.id}
                onClick={() => onSelectVideo(video)}
                className={`group relative flex flex-col bg-white rounded-xl border overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                  isActive
                    ? 'border-[#F37321] shadow-md ring-2 ring-[#F37321]/20 bg-orange-50/10'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Thumbnail Header */}
                <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
                  <img
                    src={getYouTubeThumbnail(video.youtubeId, 'mq')}
                    alt={video.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />

                  {/* Playing Indicator */}
                  {isActive && (
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#F37321] text-white text-[11px] font-semibold shadow-md">
                      <span className="flex gap-0.5 items-end h-2.5">
                        <span className="w-0.5 h-2.5 bg-white animate-pulse" />
                        <span className="w-0.5 h-1.5 bg-white animate-pulse delay-75" />
                        <span className="w-0.5 h-3 bg-white animate-pulse delay-150" />
                      </span>
                      <span>재생 중</span>
                    </div>
                  )}

                  {/* Watched Badge */}
                  {video.watched && (
                    <div className="absolute top-2.5 right-2.5 p-1 rounded-full bg-emerald-500/90 text-white shadow-md">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}

                  {/* Play Overlay Button on Hover */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                    <div className="w-11 h-11 rounded-full bg-[#F37321] text-white flex items-center justify-center shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>

                  {/* Duration tag */}
                  {video.duration && (
                    <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-slate-200">
                      {video.duration}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Category & Speaker Line */}
                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 mb-1.5">
                      <div className="flex items-center gap-1.5 truncate">
                        {category && (
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: category.color || '#F37321' }}
                          />
                        )}
                        <span className="truncate font-medium">{category?.name || '미분류'}</span>
                      </div>
                      {video.speaker && (
                        <span className="text-slate-400 truncate shrink-0 max-w-[100px]">
                          {video.speaker}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h4
                      className={`text-xs font-semibold line-clamp-2 leading-snug mb-1.5 transition-colors ${
                        isActive ? 'text-[#F37321]' : 'text-slate-900 group-hover:text-[#F37321]'
                      }`}
                    >
                      {video.title}
                    </h4>

                    {/* Description */}
                    {video.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mb-2">
                        {video.description}
                      </p>
                    )}
                  </div>

                  {/* Footer Row: Tags, Watched Toggle, and Actions Menu */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs mt-2">
                    <div className="flex items-center gap-1 overflow-hidden">
                      {video.tags?.slice(0, 2).map((t, idx) => (
                        <span key={idx} className="text-[10px] text-slate-500 truncate">
                          #{t}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onToggleWatched(video)}
                        className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${
                          video.watched ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
                        }`}
                        title={video.watched ? '학습 미완료로 변경' : '학습 완료 처리'}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>

                      {/* Dropdown Menu */}
                      <div className="relative">
                        <button
                          onClick={() => setActiveMenuId(isMenuOpen ? null : video.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
                          title="교안 옵션"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {isMenuOpen && (
                          <div
                            className="absolute right-0 bottom-full mb-1 bg-white border border-slate-200 rounded-lg shadow-xl p-1 z-30 min-w-[110px] animate-in fade-in zoom-in-95 duration-150"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                onEditVideo(video);
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors text-left"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                              <span>수정</span>
                            </button>
                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                onDeleteVideo(video);
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors text-left"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>삭제</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="space-y-2">
          {filteredVideos.map((video) => {
            const isActive = activeVideoId === video.id;
            const category = getCategory(video.categoryId);
            const isMenuOpen = activeMenuId === video.id;

            return (
              <div
                key={video.id}
                onClick={() => onSelectVideo(video)}
                className={`group relative flex items-center justify-between gap-4 p-3 bg-white rounded-xl border cursor-pointer transition-colors ${
                  isActive
                    ? 'border-[#F37321] bg-orange-50/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 shadow-2xs'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Small Thumbnail */}
                  <div className="relative w-24 sm:w-32 aspect-video rounded-lg overflow-hidden bg-black shrink-0 border border-slate-200">
                    <img
                      src={getYouTubeThumbnail(video.youtubeId, 'mq')}
                      alt={video.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    {video.watched && (
                      <div className="absolute top-1 right-1 p-0.5 rounded-full bg-emerald-500 text-white">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                    {isActive && (
                      <div className="absolute inset-0 bg-[#F37321]/30 flex items-center justify-center">
                        <Play className="w-5 h-5 text-white fill-current" />
                      </div>
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-1">
                      {category && (
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: category.color || '#F37321' }}
                        />
                      )}
                      <span className="truncate font-medium">{category?.name || '미분류'}</span>
                      {video.speaker && (
                        <>
                          <span>·</span>
                          <span className="truncate">{video.speaker}</span>
                        </>
                      )}
                    </div>
                    <h4
                      className={`text-xs sm:text-sm font-semibold truncate ${
                        isActive ? 'text-[#F37321]' : 'text-slate-900 group-hover:text-[#F37321]'
                      }`}
                    >
                      {video.title}
                    </h4>
                    {video.description && (
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5 hidden sm:block">
                        {video.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* List Actions */}
                <div
                  className="flex items-center gap-2 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => onToggleWatched(video)}
                    className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${
                      video.watched ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
                    }`}
                    title={video.watched ? '학습 미완료로 변경' : '학습 완료 처리'}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>

                  <div className="relative">
                    <button
                      onClick={() => setActiveMenuId(isMenuOpen ? null : video.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {isMenuOpen && (
                      <div
                        className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl p-1 z-30 min-w-[110px] animate-in fade-in zoom-in-95 duration-150"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            setActiveMenuId(null);
                            onEditVideo(video);
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors text-left"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                          <span>수정</span>
                        </button>
                        <button
                          onClick={() => {
                            setActiveMenuId(null);
                            onDeleteVideo(video);
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors text-left"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>삭제</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
