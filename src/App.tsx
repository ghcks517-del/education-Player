/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  FolderPlus,
  PlusCircle,
  Sparkles,
  Info,
  CheckCircle2,
  Tv,
  BookOpen,
  ArrowRight,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { Category, VideoItem, VideoNote } from './types';
import {
  loadCategories,
  saveCategories,
  loadVideos,
  saveVideos,
  loadLastActiveVideoId,
  saveLastActiveVideoId,
  resetAllData,
  exportBackupJson,
  importBackupJson,
} from './utils/storage';
import { Header } from './components/Header';
import { VideoPlayer } from './components/VideoPlayer';
import { CategoryNav } from './components/CategoryNav';
import { VideoList } from './components/VideoList';
import { LectureNotes } from './components/LectureNotes';
import { CategoryModal } from './components/CategoryModal';
import { VideoModal } from './components/VideoModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';

export default function App() {
  // Main Data States
  const [categories, setCategories] = useState<Category[]>(loadCategories);
  const [videos, setVideos] = useState<VideoItem[]>(loadVideos);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(() => {
    const saved = loadLastActiveVideoId();
    if (saved && videos.some((v) => v.id === saved)) {
      return saved;
    }
    return videos[0]?.id || null;
  });

  // Player & UI States
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [seekTime, setSeekTime] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals States
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);

  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [videoToEdit, setVideoToEdit] = useState<VideoItem | null>(null);

  const [deleteConfirmState, setDeleteConfirmState] = useState<{
    isOpen: boolean;
    type: 'category' | 'video';
    item: Category | VideoItem | null;
  }>({
    isOpen: false,
    type: 'video',
    item: null,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save changes to localStorage whenever data changes
  useEffect(() => {
    saveCategories(categories);
  }, [categories]);

  useEffect(() => {
    saveVideos(videos);
  }, [videos]);

  useEffect(() => {
    if (activeVideoId) {
      saveLastActiveVideoId(activeVideoId);
    }
  }, [activeVideoId]);

  // Show toast notification
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3000);
  };

  // Find active video
  const activeVideo = videos.find((v) => v.id === activeVideoId) || null;

  // Filtered video list according to category
  const activeCategoryVideos = selectedCategoryId
    ? videos.filter((v) => v.categoryId === selectedCategoryId)
    : videos;

  // Navigation: Next / Prev video in current active list
  const currentVideoIndex = activeCategoryVideos.findIndex((v) => v.id === activeVideoId);
  const hasNext = currentVideoIndex >= 0 && currentVideoIndex < activeCategoryVideos.length - 1;
  const hasPrev = currentVideoIndex > 0;

  const handleNextVideo = () => {
    if (hasNext) {
      const nextVid = activeCategoryVideos[currentVideoIndex + 1];
      setActiveVideoId(nextVid.id);
    }
  };

  const handlePrevVideo = () => {
    if (hasPrev) {
      const prevVid = activeCategoryVideos[currentVideoIndex - 1];
      setActiveVideoId(prevVid.id);
    }
  };

  // Category Actions
  const handleSaveCategory = (catData: { name: string; description?: string; color: string }) => {
    if (categoryToEdit) {
      setCategories((prev) =>
        prev.map((c) => (c.id === categoryToEdit.id ? { ...c, ...catData } : c))
      );
      showToast('교안 분류가 수정되었습니다.');
    } else {
      const newCat: Category = {
        id: `cat-${Date.now()}`,
        name: catData.name,
        description: catData.description,
        color: catData.color,
        order: categories.length + 1,
        createdAt: new Date().toISOString(),
      };
      setCategories((prev) => [...prev, newCat]);
      showToast('새 교안 분류가 생성되었습니다.');
    }
    setCategoryToEdit(null);
  };

  const handleConfirmDeleteCategory = () => {
    if (deleteConfirmState.item && deleteConfirmState.type === 'category') {
      const catToDelete = deleteConfirmState.item as Category;
      const fallbackCatId = categories.find((c) => c.id !== catToDelete.id)?.id || 'cat-default';

      // Move remaining videos to another category or keep them safe
      setVideos((prev) =>
        prev.map((v) =>
          v.categoryId === catToDelete.id ? { ...v, categoryId: fallbackCatId } : v
        )
      );

      setCategories((prev) => prev.filter((c) => c.id !== catToDelete.id));

      if (selectedCategoryId === catToDelete.id) {
        setSelectedCategoryId(null);
      }

      showToast(`'${catToDelete.name}' 분류가 삭제되었습니다.`);
    }
  };

  // Video Actions
  const handleSaveVideo = (videoData: Partial<VideoItem>) => {
    if (videoToEdit) {
      setVideos((prev) =>
        prev.map((v) => (v.id === videoToEdit.id ? { ...v, ...(videoData as any) } : v))
      );
      showToast('교안 정보가 수정되었습니다.');
    } else {
      const newVid: VideoItem = {
        id: `vid-${Date.now()}`,
        categoryId: videoData.categoryId || (categories[0]?.id ?? 'cat-1'),
        title: videoData.title || '새 교안 영상',
        description: videoData.description || '',
        youtubeUrl: videoData.youtubeUrl || '',
        youtubeId: videoData.youtubeId || '',
        speaker: videoData.speaker || '한화 교육담당',
        duration: videoData.duration || '05:00',
        tags: videoData.tags || [],
        watched: false,
        notes: [],
        createdAt: new Date().toISOString(),
      };
      setVideos((prev) => [newVid, ...prev]);
      setActiveVideoId(newVid.id);
      showToast('새 교안 영상이 등록되어 바로 재생 목록에 연결되었습니다.');
    }
    setVideoToEdit(null);
  };

  const handleConfirmDeleteVideo = () => {
    if (deleteConfirmState.item && deleteConfirmState.type === 'video') {
      const vidToDelete = deleteConfirmState.item as VideoItem;
      setVideos((prev) => prev.filter((v) => v.id !== vidToDelete.id));

      if (activeVideoId === vidToDelete.id) {
        const remaining = videos.filter((v) => v.id !== vidToDelete.id);
        setActiveVideoId(remaining[0]?.id || null);
      }

      showToast(`'${vidToDelete.title}' 교안 영상이 삭제되었습니다.`);
    }
  };

  const handleToggleWatched = (video: VideoItem) => {
    setVideos((prev) =>
      prev.map((v) => (v.id === video.id ? { ...v, watched: !v.watched } : v))
    );
    showToast(
      !video.watched ? '해당 교안을 [학습 완료]로 변경했습니다.' : '학습 상태를 [미완료]로 변경했습니다.'
    );
  };

  // Note Actions for currently active video
  const handleAddNote = (noteData: Omit<VideoNote, 'id' | 'createdAt'>) => {
    if (!activeVideo) return;
    const newNote: VideoNote = {
      id: `note-${Date.now()}`,
      ...noteData,
      createdAt: new Date().toISOString(),
    };
    setVideos((prev) =>
      prev.map((v) =>
        v.id === activeVideo.id ? { ...v, notes: [...(v.notes || []), newNote] } : v
      )
    );
    showToast(`${noteData.formattedTime} 구간 메모가 등록되었습니다.`);
  };

  const handleDeleteNote = (noteId: string) => {
    if (!activeVideo) return;
    setVideos((prev) =>
      prev.map((v) =>
        v.id === activeVideo.id
          ? { ...v, notes: (v.notes || []).filter((n) => n.id !== noteId) }
          : v
      )
    );
  };

  // Backup & Reset handlers
  const handleExportData = () => {
    const jsonStr = exportBackupJson(categories, videos);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hanwha-edu-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('교안 데이터가 JSON 파일로 백업되었습니다.');
  };

  const handleTriggerImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const restored = importBackupJson(content);
      if (restored) {
        setCategories(restored.categories);
        setVideos(restored.videos);
        setActiveVideoId(restored.videos[0]?.id || null);
        showToast('백업 파일에서 교안 및 분류 데이터가 성공적으로 복원되었습니다.');
      } else {
        alert('올바른 백업 JSON 형식이 아닙니다.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetData = () => {
    if (confirm('기본 한화 교안 샘플 데이터로 초기화하시겠습니까? 현재 작성된 데이터는 대체됩니다.')) {
      const fresh = resetAllData();
      setCategories(fresh.categories);
      setVideos(fresh.videos);
      setActiveVideoId(fresh.videos[0]?.id || null);
      showToast('초기 한화 교안 데이터로 리셋되었습니다.');
    }
  };

  const completedCount = videos.filter((v) => v.watched).length;

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-slate-800 flex flex-col selection:bg-[#F37321] selection:text-white">
      {/* Hidden File Input for Data Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden"
      />

      {/* Header */}
      <Header
        onResetData={handleResetData}
        onExportData={handleExportData}
        onImportData={handleTriggerImport}
        completedCount={completedCount}
        totalCount={videos.length}
      />

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-white border border-[#F37321]/40 text-slate-800 px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2.5 text-xs animate-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-[#F37321]" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Hero / Context Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="text-[#F37321] font-semibold">동영상 교안 플랫폼</span>
              <span>·</span>
              <span>유튜브 링크 기반 스트리밍 플레이어</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
              {selectedCategoryId
                ? `${categories.find((c) => c.id === selectedCategoryId)?.name || '선택한 분류'}`
                : '전체 동영상 교안 학습실'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setVideoToEdit(null);
                setIsVideoModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#F37321] hover:bg-[#d95e12] text-white rounded-lg text-xs font-semibold shadow-sm transition-all active:scale-95 whitespace-nowrap"
            >
              <PlusCircle className="w-4 h-4" />
              <span>새 교안 등록</span>
            </button>
          </div>
        </div>

        {/* Dynamic Layout: Theater Mode vs Standard 2-Column Split */}
        {isTheaterMode ? (
          /* THEATER MODE (Full-width player) */
          <div className="space-y-6">
            <VideoPlayer
              video={activeVideo}
              onNext={handleNextVideo}
              onPrev={handlePrevVideo}
              hasNext={hasNext}
              hasPrev={hasPrev}
              onToggleWatched={handleToggleWatched}
              onAddNoteAtCurrentTime={(sec) => setSeekTime(sec)}
              isTheaterMode={isTheaterMode}
              onToggleTheaterMode={() => setIsTheaterMode(false)}
              seekToTime={seekTime}
              onSeekCompleted={() => setSeekTime(null)}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                {activeVideo && (
                  <LectureNotes
                    video={activeVideo}
                    onAddNote={handleAddNote}
                    onDeleteNote={handleDeleteNote}
                    onSeekTo={(sec) => setSeekTime(sec)}
                    currentPlaybackTime={0}
                  />
                )}
              </div>
              <div className="space-y-4">
                <CategoryNav
                  categories={categories}
                  selectedCategoryId={selectedCategoryId}
                  onSelectCategory={setSelectedCategoryId}
                  onOpenCreateCategory={() => {
                    setCategoryToEdit(null);
                    setIsCategoryModalOpen(true);
                  }}
                  onEditCategory={(cat) => {
                    setCategoryToEdit(cat);
                    setIsCategoryModalOpen(true);
                  }}
                  onDeleteCategory={(cat) => {
                    setDeleteConfirmState({
                      isOpen: true,
                      type: 'category',
                      item: cat,
                    });
                  }}
                  videos={videos}
                />
              </div>
            </div>
          </div>
        ) : (
          /* STANDARD TWO-COLUMN LAYOUT */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 8 Cols: Player & Lecture Notes */}
            <div className="lg:col-span-8 space-y-6">
              {/* Mandatory Fullscreen & Volume Player */}
              <VideoPlayer
                video={activeVideo}
                onNext={handleNextVideo}
                onPrev={handlePrevVideo}
                hasNext={hasNext}
                hasPrev={hasPrev}
                onToggleWatched={handleToggleWatched}
                onAddNoteAtCurrentTime={(sec) => setSeekTime(sec)}
                isTheaterMode={isTheaterMode}
                onToggleTheaterMode={() => setIsTheaterMode(true)}
                seekToTime={seekTime}
                onSeekCompleted={() => setSeekTime(null)}
              />

              {/* Timestamped Lecture Notes */}
              {activeVideo && (
                <LectureNotes
                  video={activeVideo}
                  onAddNote={handleAddNote}
                  onDeleteNote={handleDeleteNote}
                  onSeekTo={(sec) => setSeekTime(sec)}
                  currentPlaybackTime={0}
                />
              )}
            </div>

            {/* Right 4 Cols: Category Nav & Up Next Playlist */}
            <div className="lg:col-span-4 space-y-6">
              {/* Category Management */}
              <CategoryNav
                categories={categories}
                selectedCategoryId={selectedCategoryId}
                onSelectCategory={setSelectedCategoryId}
                onOpenCreateCategory={() => {
                  setCategoryToEdit(null);
                  setIsCategoryModalOpen(true);
                }}
                onEditCategory={(cat) => {
                  setCategoryToEdit(cat);
                  setIsCategoryModalOpen(true);
                }}
                onDeleteCategory={(cat) => {
                  setDeleteConfirmState({
                    isOpen: true,
                    type: 'category',
                    item: cat,
                  });
                }}
                videos={videos}
              />

              {/* Up Next Mini Playlist in Current Classification */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#F37321]" />
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      현재 분류 교안 목록 ({activeCategoryVideos.length})
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {currentVideoIndex >= 0 ? `${currentVideoIndex + 1}/${activeCategoryVideos.length}` : ''}
                  </span>
                </div>

                <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
                  {activeCategoryVideos.map((vid, idx) => {
                    const isActive = vid.id === activeVideoId;
                    return (
                      <button
                        key={vid.id}
                        onClick={() => setActiveVideoId(vid.id)}
                        className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
                          isActive
                            ? 'bg-orange-50 border border-orange-200 text-slate-900 font-medium'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span className="text-xs font-mono text-slate-400 w-4 text-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs truncate font-medium">{vid.title}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{vid.duration || '05:00'}</p>
                        </div>
                        {vid.watched && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Full Video Library Grid / List Section */}
        <section className="pt-4 border-t border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                교안 상세 라이브러리
              </h2>
              <p className="text-xs text-slate-500">
                등록된 모든 영상 교안을 검색하고 손쉽게 생성 및 삭제할 수 있습니다.
              </p>
            </div>
          </div>

          <VideoList
            videos={videos}
            categories={categories}
            activeVideoId={activeVideoId}
            onSelectVideo={(vid) => {
              setActiveVideoId(vid.id);
              // Scroll smoothly to video player
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenCreateVideo={() => {
              setVideoToEdit(null);
              setIsVideoModalOpen(true);
            }}
            onEditVideo={(vid) => {
              setVideoToEdit(vid);
              setIsVideoModalOpen(true);
            }}
            onDeleteVideo={(vid) => {
              setDeleteConfirmState({
                isOpen: true,
                type: 'video',
                item: vid,
              });
            }}
            onToggleWatched={handleToggleWatched}
            selectedCategoryId={selectedCategoryId}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-200 bg-white py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">한화모멘텀 동영상 교안 플레이어</span>
            <span>·</span>
            <span>Hanwha Momentum EduPlayer</span>
          </div>
          <p className="text-[11px] text-slate-400">
            사내 교육 및 커리큘럼 영상 시청 전용 웹 애플리케이션
          </p>
        </div>
      </footer>

      {/* MODALS */}
      {/* 1. Category Modal (Create / Edit) */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setIsCategoryModalOpen(false);
          setCategoryToEdit(null);
        }}
        onSave={handleSaveCategory}
        categoryToEdit={categoryToEdit}
      />

      {/* 2. Video Modal (Create / Edit with YouTube URL input) */}
      <VideoModal
        isOpen={isVideoModalOpen}
        onClose={() => {
          setIsVideoModalOpen(false);
          setVideoToEdit(null);
        }}
        onSave={handleSaveVideo}
        categories={categories}
        defaultCategoryId={selectedCategoryId}
        videoToEdit={videoToEdit}
      />

      {/* 3. Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteConfirmState.isOpen}
        onClose={() =>
          setDeleteConfirmState({ isOpen: false, type: 'video', item: null })
        }
        onConfirm={() => {
          if (deleteConfirmState.type === 'category') {
            handleConfirmDeleteCategory();
          } else {
            handleConfirmDeleteVideo();
          }
        }}
        title={
          deleteConfirmState.type === 'category'
            ? '교안 분류 삭제 확인'
            : '교안 영상 삭제 확인'
        }
        message={
          deleteConfirmState.type === 'category'
            ? '이 분류를 삭제하시겠습니까? 해당 분류에 속한 영상들은 기본 분류로 자동 재배치됩니다.'
            : '선택하신 교안 영상을 삭제하시겠습니까? 등록된 메모와 시청 기록도 함께 삭제됩니다.'
        }
        itemName={
          deleteConfirmState.item
            ? 'name' in deleteConfirmState.item
              ? (deleteConfirmState.item as Category).name
              : (deleteConfirmState.item as VideoItem).title
            : undefined
        }
        confirmButtonText="삭제"
      />
    </div>
  );
}
