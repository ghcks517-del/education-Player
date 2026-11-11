import React from 'react';
import { RotateCcw, Download, Upload, Database, Cloud } from 'lucide-react';
import { HanwhaLogo } from './HanwhaLogo';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  onOpenCreateVideo?: () => void;
  onOpenCreateCategory?: () => void;
  onResetData: () => void;
  onExportData: () => void;
  onImportData: () => void;
  onOpenPersistenceModal: () => void;
  completedCount: number;
  totalCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onResetData,
  onExportData,
  onImportData,
  onOpenPersistenceModal,
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

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
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
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Cloud Real-time Sync Badge */}
          <div
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs font-semibold shadow-2xs"
            title="PC에서 올린 영상이 갤럭시 탭과 실시간으로 자동 동기화됩니다"
          >
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <Cloud className="w-3.5 h-3.5 text-blue-600" />
            <span>클라우드 실시간 동기화</span>
          </div>

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
              title="데이터 백업 및 초기화"
            >
              설정 / 백업
            </button>

            {showSettingsMenu && (
              <div
                className="absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-50 min-w-[190px] space-y-1 animate-in fade-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    setShowSettingsMenu(false);
                    onOpenPersistenceModal();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#F37321] hover:bg-orange-50 rounded-lg transition-colors text-left"
                >
                  <Database className="w-4 h-4 text-[#F37321]" />
                  <span>교안 영구 보존 &amp; 소스 복사</span>
                </button>
                <div className="border-t border-slate-100 my-1" />
                <button
                  onClick={() => {
                    setShowSettingsMenu(false);
                    onExportData();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors text-left"
                >
                  <Download className="w-4 h-4 text-slate-500" />
                  <span>교안 데이터 백업 (JSON)</span>
                </button>
                <button
                  onClick={() => {
                    setShowSettingsMenu(false);
                    onImportData();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors text-left"
                >
                  <Upload className="w-4 h-4 text-slate-500" />
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
                  <RotateCcw className="w-4 h-4" />
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
