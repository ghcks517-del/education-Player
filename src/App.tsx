/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Repeat,
  X,
} from 'lucide-react';
import { Category, VideoItem, VideoNote } from './types';
import {
  loadCategories,
  saveCategories,
  loadVideos,
  saveVideos,
  loadLastActiveVideoId,
  saveLastActiveVideoId,
  loadLoopCategoryId,
  saveLoopCategoryId,
  resetAllData,
  exportBackupJson,
  importBackupJson,
} from './utils/storage';
import { Header, SyncStatus } from './components/Header';
import { VideoPlayer } from './components/VideoPlayer';
import { CategoryNav } from './components/CategoryNav';
import { VideoList } from './components/VideoList';
import { LectureNotes } from './components/LectureNotes';
import { CategoryModal } from './components/CategoryModal';
import { VideoModal } from './components/VideoModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { DataPersistenceModal } from './components/DataPersistenceModal';
import {
  subscribeCategories,
  subscribeVideos,
  saveCategoryToFirestore,
  deleteCategoryFromFirestore,
  saveVideoToFirestore,
  deleteVideoFromFirestore,
  importAllToFirestore,
  fetchAllFromFirestoreServer,
} from './utils/firestoreSync';
import { testConnection, formatFirestoreErrorMessage } from './utils/firebase';

export default function App() {
  // Main Data States (starts from localStorage cache for instant zero-latency render)
  const [categories, setCategories] = useState<Category[]>(loadCategories);
  const [videos, setVideos] = useState<VideoItem[]>(loadVideos);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [loopCategoryId, setLoopCategoryId] = useState<string | null>(() => loadLoopCategoryId());
  const [activeVideoId, setActiveVideoId] = useState<string | null>(() => {
    const saved = loadLastActiveVideoId();
    if (saved && videos.some((v) => v.id === saved)) {
      return saved;
    }
    return videos[0]?.id || null;
  });

  // Cloud Sync States
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('connecting');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // Player & UI States
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [seekTime, setSeekTime] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modals States
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);

  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [videoToEdit, setVideoToEdit] = useState<VideoItem | null>(null);
  const [isPersistenceModalOpen, setIsPersistenceModalOpen] = useState(false);

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
  const lastAutoRefreshRef = useRef<number>(0);

  // Show toast notification
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((current) => (current?.message === message ? null : current));
    }, type === 'error' ? 5000 : 3500);
  }, []);

  // Force fetch latest data from Firestore server (bypasses local cache)
  const syncFromCloudServer = useCallback(
    async (silent = false) => {
      setSyncStatus('syncing');
      if (!silent) {
        const checkPwa = (window as Window & { __checkPwaUpdate?: () => Promise<void> }).__checkPwaUpdate;
        if (checkPwa) {
          checkPwa().catch(() => {});
        }
      }
      try {
        const serverData = await fetchAllFromFirestoreServer();
        if (serverData.categories.length > 0) {
          setCategories(serverData.categories);
        }
        if (serverData.videos.length > 0) {
          setVideos(serverData.videos);
          setActiveVideoId((prev) => {
            if (prev && serverData.videos.some((v) => v.id === prev)) {
              return prev;
            }
            return serverData.videos[0]?.id || null;
          });
        }
        setSyncStatus('synced');
        setSyncError(null);
        setLastSyncedAt(new Date().toISOString());
        lastAutoRefreshRef.current = Date.now();
        if (!silent) {
          showToast(`클라우드에서 최신 교안 ${serverData.videos.length}개를 불러왔습니다.`);
        }
      } catch (err) {
        const msg = formatFirestoreErrorMessage(err);
        setSyncStatus('error');
        setSyncError(msg);
        if (!silent) {
          showToast(msg, 'error');
          throw new Error(msg);
        }
      }
    },
    [showToast]
  );

  // Force push current device's categories & videos to Firestore
  const handlePushLocalToCloud = useCallback(async () => {
    setSyncStatus('syncing');
    try {
      const synced = await importAllToFirestore(categories, videos);
      setCategories(synced.categories);
      setVideos(synced.videos);
      setSyncStatus('synced');
      setSyncError(null);
      setLastSyncedAt(new Date().toISOString());
      showToast(
        `현재 기기의 교안 ${synced.videos.length}개가 클라우드에 업로드되었습니다. 이제 탭에서도 동일하게 보입니다.`
      );
    } catch (err) {
      const msg = formatFirestoreErrorMessage(err);
      setSyncStatus('error');
      setSyncError(msg);
      showToast(`클라우드 업로드 실패: ${msg}`, 'error');
      throw new Error(msg);
    }
  }, [categories, videos, showToast]);

  // Connect to Firestore and subscribe to real-time multi-device sync
  useEffect(() => {
    let active = true;

    testConnection().then((res) => {
      if (!active) return;
      if (!res.connected) {
        setSyncStatus('error');
        setSyncError(formatFirestoreErrorMessage(res.error));
      }
    });

    // 1. Subscribe to Categories
    const unsubCats = subscribeCategories(
      (cloudCats, meta) => {
        if (!active) return;
        if (cloudCats && cloudCats.length > 0) {
          setCategories(cloudCats);
        }
        setSyncStatus(meta.fromCache ? 'cache' : 'synced');
        setSyncError(null);
        if (!meta.fromCache) {
          setLastSyncedAt(new Date().toISOString());
        }
      },
      (err) => {
        if (!active) return;
        setSyncStatus('error');
        setSyncError(formatFirestoreErrorMessage(err));
      }
    );

    // 2. Subscribe to Videos
    const unsubVids = subscribeVideos(
      (cloudVids, meta) => {
        if (!active) return;
        if (cloudVids) {
          setVideos(cloudVids);
          setActiveVideoId((prev) => {
            if (prev && cloudVids.some((v) => v.id === prev)) {
              return prev;
            }
            return cloudVids[0]?.id || null;
          });
        }
        setSyncStatus(meta.fromCache ? 'cache' : 'synced');
        setSyncError(null);
        if (!meta.fromCache) {
          setLastSyncedAt(new Date().toISOString());
        }
      },
      (err) => {
        if (!active) return;
        setSyncStatus('error');
        setSyncError(formatFirestoreErrorMessage(err));
      }
    );

    // Re-sync from Firestore server when installed tablet PWA resumes or regains connectivity
    const handleWakeSync = () => {
      if (document.visibilityState === 'hidden') return;
      const now = Date.now();
      if (now - lastAutoRefreshRef.current < 5000) return;
      lastAutoRefreshRef.current = now;
      void syncFromCloudServer(true);
    };

    document.addEventListener('visibilitychange', handleWakeSync);
    window.addEventListener('online', handleWakeSync);

    return () => {
      active = false;
      unsubCats();
      unsubVids();
      document.removeEventListener('visibilitychange', handleWakeSync);
      window.removeEventListener('online', handleWakeSync);
    };
  }, [syncFromCloudServer]);

  // Save changes to localStorage as offline fallback whenever data changes
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

  useEffect(() => {
    saveLoopCategoryId(loopCategoryId);
  }, [loopCategoryId]);

  // Clear loopCategoryId if the category no longer exists
  useEffect(() => {
    if (loopCategoryId && categories.length > 0 && !categories.some((c) => c.id === loopCategoryId)) {
      setLoopCategoryId(null);
    }
  }, [categories, loopCategoryId]);

  // Find active video
  const activeVideo = videos.find((v) => v.id === activeVideoId) || null;

  // Filtered video list according to category view
  const activeCategoryVideos = selectedCategoryId
    ? videos.filter((v) => v.categoryId === selectedCategoryId)
    : videos;

  // Loop category playback state
  const loopCategory = loopCategoryId
    ? categories.find((c) => c.id === loopCategoryId) || null
    : null;
  const loopCategoryVideos = loopCategoryId
    ? videos.filter((v) => v.categoryId === loopCategoryId)
    : [];
  const isCategoryLoopActive = !!(loopCategory && loopCategoryVideos.length > 0);
  const isSingleVideoLoop = isCategoryLoopActive && loopCategoryVideos.length === 1;

  // Playback queue: locked strictly to loopCategoryVideos when category loop is active
  const playbackVideos = isCategoryLoopActive ? loopCategoryVideos : activeCategoryVideos;

  // Navigation: Next / Prev video in active playback list
  const currentVideoIndex = activeCategoryVideos.findIndex((v) => v.id === activeVideoId);
  const currentPlaybackIndex = playbackVideos.findIndex((v) => v.id === activeVideoId);

  const hasNext = isCategoryLoopActive
    ? loopCategoryVideos.length > 0
    : currentPlaybackIndex >= 0 && currentPlaybackIndex < playbackVideos.length - 1;
  const hasPrev = isCategoryLoopActive
    ? loopCategoryVideos.length > 1
    : currentPlaybackIndex > 0;

  const handleNextVideo = () => {
    if (isCategoryLoopActive) {
      if (loopCategoryVideos.length === 0) return;
      const nextIdx =
        currentPlaybackIndex >= 0
          ? (currentPlaybackIndex + 1) % loopCategoryVideos.length
          : 0;
      setActiveVideoId(loopCategoryVideos[nextIdx].id);
    } else if (hasNext) {
      const nextVid = playbackVideos[currentPlaybackIndex + 1];
      setActiveVideoId(nextVid.id);
    }
  };

  const handlePrevVideo = () => {
    if (isCategoryLoopActive) {
      if (loopCategoryVideos.length === 0) return;
      const prevIdx =
        currentPlaybackIndex >= 0
          ? (currentPlaybackIndex - 1 + loopCategoryVideos.length) % loopCategoryVideos.length
          : 0;
      setActiveVideoId(loopCategoryVideos[prevIdx].id);
    } else if (hasPrev) {
      const prevVid = playbackVideos[currentPlaybackIndex - 1];
      setActiveVideoId(prevVid.id);
    }
  };

  const handleToggleLoopCategory = (categoryId: string) => {
    if (loopCategoryId === categoryId) {
      setLoopCategoryId(null);
      showToast('분류 반복 연속 재생이 해제되었습니다.');
      return;
    }

    const targetCat = categories.find((c) => c.id === categoryId);
    const catVideos = videos.filter((v) => v.categoryId === categoryId);

    if (catVideos.length === 0) {
      showToast(`'${targetCat?.name || '선택한 분류'}'에 등록된 영상이 없습니다. 영상을 먼저 추가해주세요.`);
      return;
    }

    setLoopCategoryId(categoryId);
    setSelectedCategoryId(categoryId);
    if (!catVideos.some((v) => v.id === activeVideoId)) {
      setActiveVideoId(catVideos[0].id);
    }
    showToast(`'${targetCat?.name || '선택한 분류'}' 분류 영상(${catVideos.length}개)만 반복 연속 재생합니다.`);
  };

  const handleSelectVideoSafely = (vid: VideoItem) => {
    if (loopCategoryId && vid.categoryId !== loopCategoryId) {
      setLoopCategoryId(null);
      showToast('다른 분류의 영상을 선택하여 분류 반복 재생이 해제되었습니다.');
    }
    setActiveVideoId(vid.id);
  };

  // Helper to run cloud writes with real status & error reporting
  const runCloudWrite = async (task: () => Promise<void>, successMessage: string) => {
    setSyncStatus('syncing');
    try {
      await task();
      setSyncStatus('synced');
      setSyncError(null);
      setLastSyncedAt(new Date().toISOString());
      if (successMessage) {
        showToast(successMessage);
      }
    } catch (err) {
      const msg = formatFirestoreErrorMessage(err);
      setSyncStatus('error');
      setSyncError(msg);
      showToast(`클라우드 동기화 실패: ${msg}`, 'error');
    }
  };

  // Category Actions
  const handleSaveCategory = async (catData: { name: string; description?: string; color: string }) => {
    if (categoryToEdit) {
      const updatedCat: Category = { ...categoryToEdit, ...catData };
      setCategories((prev) =>
        prev.map((c) => (c.id === categoryToEdit.id ? updatedCat : c))
      );
      setCategoryToEdit(null);
      await runCloudWrite(
        () => saveCategoryToFirestore(updatedCat),
        '교안 분류가 수정되었습니다. (갤럭시 탭 등 모든 기기 동기화 완료)'
      );
    } else {
      const newCat: Category = {
        id: `cat-${Date.now()}`,
        name: catData.name,
        description: catData.description || '',
        color: catData.color,
        order: categories.length + 1,
        createdAt: new Date().toISOString(),
      };
      setCategories((prev) => [...prev, newCat]);
      setCategoryToEdit(null);
      await runCloudWrite(
        () => saveCategoryToFirestore(newCat),
        '새 교안 분류가 생성되었습니다. (모든 기기에 실시간 반영됨)'
      );
    }
  };

  const handleConfirmDeleteCategory = async () => {
    if (deleteConfirmState.item && deleteConfirmState.type === 'category') {
      const catToDelete = deleteConfirmState.item as Category;
      const fallbackCatId = categories.find((c) => c.id !== catToDelete.id)?.id || 'cat-default';
      const movedVideos = videos
        .filter((v) => v.categoryId === catToDelete.id)
        .map((v) => ({ ...v, categoryId: fallbackCatId, updatedAt: new Date().toISOString() }));

      setVideos((prev) =>
        prev.map((v) =>
          v.categoryId === catToDelete.id ? { ...v, categoryId: fallbackCatId } : v
        )
      );
      setCategories((prev) => prev.filter((c) => c.id !== catToDelete.id));

      if (selectedCategoryId === catToDelete.id) {
        setSelectedCategoryId(null);
      }
      if (loopCategoryId === catToDelete.id) {
        setLoopCategoryId(null);
      }

      await runCloudWrite(async () => {
        await Promise.all(movedVideos.map((v) => saveVideoToFirestore(v)));
        await deleteCategoryFromFirestore(catToDelete.id);
      }, `'${catToDelete.name}' 분류가 삭제되었습니다. (클라우드 동기화 완료)`);
    }
  };

  // Video Actions
  const handleSaveVideo = async (videoData: Partial<VideoItem>) => {
    if (videoToEdit) {
      const updatedVid: VideoItem = {
        ...videoToEdit,
        ...videoData,
        updatedAt: new Date().toISOString(),
      };
      setVideos((prev) =>
        prev.map((v) => (v.id === videoToEdit.id ? updatedVid : v))
      );
      setVideoToEdit(null);
      await runCloudWrite(
        () => saveVideoToFirestore(updatedVid),
        '교안 정보가 수정되었습니다. (갤럭시 탭 등 모든 기기에 실시간 반영됨)'
      );
    } else {
      const newVid: VideoItem = {
        id: `vid-${Date.now()}`,
        categoryId: videoData.categoryId || (categories[0]?.id ?? 'cat-1'),
        title: videoData.title || '새 교안 영상',
        description: videoData.description || '',
        youtubeUrl: videoData.youtubeUrl || '',
        youtubeId: videoData.youtubeId || '',
        speaker: videoData.speaker || '안전관리팀',
        duration: videoData.duration || '05:00',
        tags: videoData.tags || [],
        watched: false,
        notes: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setVideos((prev) => [newVid, ...prev]);
      setActiveVideoId(newVid.id);
      setVideoToEdit(null);
      await runCloudWrite(
        () => saveVideoToFirestore(newVid),
        '새 교안 영상이 등록되었습니다. (갤럭시 탭 등 모든 기기에 실시간 자동 반영됩니다!)'
      );
    }
  };

  const handleConfirmDeleteVideo = async () => {
    if (deleteConfirmState.item && deleteConfirmState.type === 'video') {
      const vidToDelete = deleteConfirmState.item as VideoItem;
      setVideos((prev) => prev.filter((v) => v.id !== vidToDelete.id));

      if (activeVideoId === vidToDelete.id) {
        const remaining = videos.filter((v) => v.id !== vidToDelete.id);
        setActiveVideoId(remaining[0]?.id || null);
      }

      await runCloudWrite(
        () => deleteVideoFromFirestore(vidToDelete.id),
        `'${vidToDelete.title}' 교안 영상이 삭제되었습니다. (클라우드 동기화 완료)`
      );
    }
  };

  const handleToggleWatched = async (video: VideoItem) => {
    const updatedVid: VideoItem = {
      ...video,
      watched: !video.watched,
      updatedAt: new Date().toISOString(),
    };
    setVideos((prev) =>
      prev.map((v) => (v.id === video.id ? updatedVid : v))
    );
    await runCloudWrite(
      () => saveVideoToFirestore(updatedVid),
      !video.watched ? '해당 교안을 [학습 완료]로 변경했습니다.' : '학습 상태를 [미완료]로 변경했습니다.'
    );
  };

  // Note Actions for currently active video
  const handleAddNote = async (noteData: Omit<VideoNote, 'id' | 'createdAt'>) => {
    if (!activeVideo) return;
    const newNote: VideoNote = {
      id: `note-${Date.now()}`,
      ...noteData,
      createdAt: new Date().toISOString(),
    };
    const updatedVid: VideoItem = {
      ...activeVideo,
      notes: [...(activeVideo.notes || []), newNote],
      updatedAt: new Date().toISOString(),
    };
    setVideos((prev) =>
      prev.map((v) => (v.id === activeVideo.id ? updatedVid : v))
    );
    await runCloudWrite(
      () => saveVideoToFirestore(updatedVid),
      `${noteData.formattedTime} 구간 메모가 등록되었습니다.`
    );
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!activeVideo) return;
    const updatedVid: VideoItem = {
      ...activeVideo,
      notes: (activeVideo.notes || []).filter((n) => n.id !== noteId),
      updatedAt: new Date().toISOString(),
    };
    setVideos((prev) =>
      prev.map((v) => (v.id === activeVideo.id ? updatedVid : v))
    );
    await runCloudWrite(() => saveVideoToFirestore(updatedVid), '');
  };

  // Backup & Reset handlers
  const handleExportData = () => {
    const jsonStr = exportBackupJson(categories, videos);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `안전교육_교안백업_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const restored = importBackupJson(content);
      if (!restored) {
        showToast('올바른 백업 JSON 형식이 아닙니다.', 'error');
        return;
      }

      setCategories(restored.categories);
      setVideos(restored.videos);
      setActiveVideoId(restored.videos[0]?.id || null);
      setSyncStatus('syncing');

      try {
        const synced = await importAllToFirestore(restored.categories, restored.videos);
        setCategories(synced.categories);
        setVideos(synced.videos);
        setSyncStatus('synced');
        setSyncError(null);
        setLastSyncedAt(new Date().toISOString());
        showToast(
          `백업 파일에서 교안 ${synced.videos.length}개가 복원되어 클라우드와 모든 기기에 동기화되었습니다.`
        );
      } catch (err) {
        const msg = formatFirestoreErrorMessage(err);
        setSyncStatus('error');
        setSyncError(msg);
        showToast(`파일은 열렸으나 클라우드 동기화 실패: ${msg}`, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetData = async () => {
    if (confirm('기본 안전 교육 영상 데이터로 초기화하시겠습니까? 클라우드와 모든 기기의 교안이 초기화됩니다.')) {
      const fresh = resetAllData();
      setCategories(fresh.categories);
      setVideos(fresh.videos);
      setActiveVideoId(fresh.videos[0]?.id || null);
      await runCloudWrite(async () => {
        const synced = await importAllToFirestore(fresh.categories, fresh.videos);
        setCategories(synced.categories);
        setVideos(synced.videos);
      }, '초기 안전 교육 영상 데이터로 리셋되었습니다. (모든 기기 동기화 완료)');
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
        onOpenPersistenceModal={() => setIsPersistenceModalOpen(true)}
        onPushToCloud={handlePushLocalToCloud}
        onPullFromCloud={() => syncFromCloudServer(false)}
        syncStatus={syncStatus}
        syncError={syncError}
        lastSyncedAt={lastSyncedAt}
        completedCount={completedCount}
        totalCount={videos.length}
      />

      {/* Toast Notification Banner */}
      {toast && (
        <div
          className={`fixed top-20 right-6 z-50 bg-white px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2.5 text-xs animate-in slide-in-from-top-2 duration-200 max-w-md border ${
            toast.type === 'error'
              ? 'border-red-300 text-red-700'
              : 'border-[#F37321]/40 text-slate-800'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-[#F37321] shrink-0" />
          )}
          <span className="font-medium">{toast.message}</span>
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

          <div className="flex flex-wrap items-center gap-2">
            {isCategoryLoopActive && loopCategory && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-[#F37321]/40 text-[#F37321] rounded-lg text-xs font-semibold shadow-2xs">
                <Repeat className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {loopCategory.name} ({loopCategoryVideos.length}개) 반복 연속 재생 중
                </span>
                <button
                  type="button"
                  onClick={() => setLoopCategoryId(null)}
                  className="p-0.5 rounded hover:bg-[#F37321]/15 text-[#F37321]"
                  title="분류 반복 재생 해제"
                  aria-label="분류 반복 재생 해제"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

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
              loopCategoryName={isCategoryLoopActive ? loopCategory?.name : null}
              isSingleVideoLoop={isSingleVideoLoop}
              onClearLoopCategory={() => setLoopCategoryId(null)}
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
                  loopCategoryId={loopCategoryId}
                  onSelectCategory={setSelectedCategoryId}
                  onToggleLoopCategory={handleToggleLoopCategory}
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
                loopCategoryName={isCategoryLoopActive ? loopCategory?.name : null}
                isSingleVideoLoop={isSingleVideoLoop}
                onClearLoopCategory={() => setLoopCategoryId(null)}
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
                loopCategoryId={loopCategoryId}
                onSelectCategory={setSelectedCategoryId}
                onToggleLoopCategory={handleToggleLoopCategory}
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
                <div className="flex items-center justify-between gap-2 mb-3 px-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <BookOpen className="w-4 h-4 text-[#F37321] shrink-0" />
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider truncate">
                      현재 분류 교안 목록 ({activeCategoryVideos.length})
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {selectedCategoryId && (
                      <button
                        type="button"
                        onClick={() => handleToggleLoopCategory(selectedCategoryId)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold border transition-colors ${
                          loopCategoryId === selectedCategoryId
                            ? 'bg-[#F37321] text-white border-[#F37321]'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-[#F37321] hover:text-[#F37321]'
                        }`}
                        title={
                          loopCategoryId === selectedCategoryId
                            ? '현재 분류 반복 연속 재생 해제'
                            : '현재 분류의 영상만 반복 연속 재생'
                        }
                      >
                        <Repeat className="w-3 h-3" />
                        <span>{loopCategoryId === selectedCategoryId ? '반복 중' : '분류 반복'}</span>
                      </button>
                    )}
                    <span className="text-[11px] text-slate-400 font-mono">
                      {currentVideoIndex >= 0 ? `${currentVideoIndex + 1}/${activeCategoryVideos.length}` : ''}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
                  {activeCategoryVideos.map((vid, idx) => {
                    const isActive = vid.id === activeVideoId;
                    return (
                      <button
                        key={vid.id}
                        onClick={() => handleSelectVideoSafely(vid)}
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
              handleSelectVideoSafely(vid);
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
            void handleConfirmDeleteCategory();
          } else {
            void handleConfirmDeleteVideo();
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

      {/* Data Persistence and Cloud Sync Modal */}
      <DataPersistenceModal
        isOpen={isPersistenceModalOpen}
        onClose={() => setIsPersistenceModalOpen(false)}
        categories={categories}
        videos={videos}
        syncStatus={syncStatus}
        syncError={syncError}
        lastSyncedAt={lastSyncedAt}
        onPushToCloud={handlePushLocalToCloud}
        onPullFromCloud={() => syncFromCloudServer(false)}
        onDataImported={async (newCats, newVids) => {
          setCategories(newCats);
          setVideos(newVids);
          setActiveVideoId(newVids[0]?.id || null);
          setSyncStatus('syncing');
          try {
            const synced = await importAllToFirestore(newCats, newVids);
            setCategories(synced.categories);
            setVideos(synced.videos);
            setSyncStatus('synced');
            setSyncError(null);
            setLastSyncedAt(new Date().toISOString());
            showToast('교안 데이터가 클라우드에 성공적으로 반영되어 모든 기기에 동기화되었습니다.');
          } catch (err) {
            const msg = formatFirestoreErrorMessage(err);
            setSyncStatus('error');
            setSyncError(msg);
            throw new Error(msg);
          }
        }}
      />

      {/* Offline Status Toast */}
      <OfflineIndicator />
    </div>
  );
}
