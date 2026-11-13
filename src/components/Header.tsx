import React from 'react';
import {
  RotateCcw,
  Download,
  Upload,
  Database,
  Cloud,
  CloudUpload,
  RefreshCw,
  AlertTriangle,
  WifiOff,
} from 'lucide-react';
import { HanwhaLogo } from './HanwhaLogo';
import { PWAInstallButton } from './PWAInstallButton';

export type SyncStatus = 'connecting' | 'syncing' | 'synced' | 'cache' | 'error';

interface HeaderProps {
  onOpenCreateVideo?: () => void;
  onOpenCreateCategory?: () => void;
  onResetData: () => void;
  onExportData: () => void;
  onImportData: () => void;
  onOpenPersistenceModal: () => void;
  onPushToCloud: () => Promise<void>;
  onPullFromCloud: () => Promise<void>;
  syncStatus: SyncStatus;
  syncError?: string | null;
  lastSyncedAt?: string | null;
  completedCount: number;
  totalCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onResetData,
  onExportData,
  onImportData,
  onOpenPersistenceModal,
  onPushToCloud,
  onPullFromCloud,
  syncStatus,
  syncError,
  lastSyncedAt,
  completedCount,
  totalCount,
}) => {
  const [showSettingsMenu, setShowSettingsMenu] = React.useState(false);

  React.useEffect(() => {
    const handleOutside = () => setShowSettingsMenu(false);
    window.addEventListener('click', handleOutside);
    return () => window.removeEventListener('click', handleOutside);
  }, []);

  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const formattedSyncTime = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null;

  const renderSyncBadge = () => {
    if (syncStatus === 'error') {
      return (
        <button
          type="button"
          onClick={() => void onPullFromCloud()}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
          title={syncError || '클라우드 동기화 오류. 클릭하여 다시 연결합니다.'}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
          <span className="hidden sm:inline">동기화 오류 (재시도)</span>
          <span className="sm:hidden">동기화 오류</span>
        </button>
      );
    }

    if (syncStatus === 'cache') {
      return (
        <button
          type="button"
          onClick={() => void onPullFromCloud()}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
          title="로컬 캐시 데이터 표시 중입니다. 클릭하여 클라우드 서버에서 최신 목록을 불러옵니다."
        >
          <WifiOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span className="hidden sm:inline">캐시 모드 (새로고침)</span>
          <span className="sm:hidden">새로고침</span>
        </button>
      );
    }

    if (syncStatus === 'connecting' || syncStatus === 'syncing') {
      return (
        <div
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs font-semibold shadow-2xs"
          title="클라우드 데이터베이스와 동기화 중입니다"
        >
          <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin shrink-0" />
          <span className="hidden sm:inline">
            {syncStatus === 'connecting' ? '클라우드 연결 중...' : '동기화 중...'}
          </span>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={() => void onPullFromCloud()}
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors group"
        title={
          formattedSyncTime
            ? `클라우드와 연결됨 (최근 동기화: ${formattedSyncTime}). 클릭하면 최신 목록을 다시 불러옵니다.`
            : '클라우드와 연결됨. 클릭하면 최신 목록을 다시 불러옵니다.'
        }
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
        <Cloud className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span className="hidden sm:inline">클라우드 동기화됨</span>
        <RefreshCw className="w-3 h-3 text-emerald-600 opacity-70 group-hover:opacity-100 shrink-0" />
      </button>
    );
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Zone 1: Brand Wordmark & Emblem */}
        <div className="flex items-center gap-4 shrink-0">
          <HanwhaLogo size="md" showText={true} />
        </div>

        {/* Zone 2: Learning Progress & Quick Nav */}
        <div className="hidden md:flex items-center gap-6">
          {/* Progress Indicator */}
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-lg text-xs shadow-xs">
            <span className="text-slate-600 font-medium">교안 학습 진도</span>
            <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#F37321] to-[#E4222D] transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="font-mono font-semibold text-slate-800 tabular-nums">
              {progressPercent}%
            </span>
            <span className="text-slate-500 text-[11px]">
              ({completedCount}/{totalCount})
            </span>
          </div>
        </div>

        {/* Zone 3: Actions (Data Options & Primary CTA) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Live Cloud Sync Status & Manual Refresh */}
          {renderSyncBadge()}

          {/* Tablet PWA Install Button */}
          <PWAInstallButton />

          {/* Data Management Menu Toggle */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowSettingsMenu(!showSettingsMenu);
              }}
              className="px-2.5 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors border border-slate-200 shadow-2xs"
              title="클라우드 동기화, 데이터 백업 및 초기화"
            >
              설정 / 백업
            </button>

            {showSettingsMenu && (
              <div
                className="absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-50 min-w-[230px] space-y-1 animate-in fade-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    setShowSettingsMenu(false);
                    void onPushToCloud();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 rounded-lg transition-colors text-left"
                >
                  <CloudUpload className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>클라우드에 지금 업로드 (PC→탭)</span>
                </button>
                <button
                  onClick={() => {
                    setShowSettingsMenu(false);
                    void onPullFromCloud();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors text-left"
                >
                  <RefreshCw className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>클라우드 최신 목록 받기 (새로고침)</span>
                </button>
                <div className="border-t border-slate-100 my-1" />
                <button
                  onClick={() => {
                    setShowSettingsMenu(false);
                    onOpenPersistenceModal();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#F37321] hover:bg-orange-50 rounded-lg transition-colors text-left"
                >
                  <Database className="w-4 h-4 text-[#F37321] shrink-0" />
                  <span>교안 영구 보존 &amp; 동기화 설정</span>
                </button>
                <div className="border-t border-slate-100 my-1" />
                <button
                  onClick={() => {
                    setShowSettingsMenu(false);
                    onExportData();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors text-left"
                >
                  <Download className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>교안 데이터 백업 (JSON)</span>
                </button>
                <button
                  onClick={() => {
                    setShowSettingsMenu(false);
                    onImportData();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors text-left"
                >
                  <Upload className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>백업 파일 불러오기</span>
                </button>
                <div className="border-t border-slate-100 my-1" />
                <button
                  onClick={() => {
                    setShowSettingsMenu(false);
                    onResetData();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors text-left"
                >
                  <RotateCcw className="w-4 h-4 shrink-0" />
                  <span>기본 교안으로 초기화</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
