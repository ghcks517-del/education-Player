import React, { useState } from 'react';
import { Smartphone, Download, Share2, PlusSquare, Check, X, Tablet } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  // If already running as an installed standalone app on tablet
  if (isInstalled) {
    return (
      <div
        className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-semibold shadow-2xs"
        title="현재 태블릿 전용 앱 모드로 실행 중입니다"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <Tablet className="w-3.5 h-3.5 text-emerald-600" />
        <span>앱 모드</span>
      </div>
    );
  }

  const handleButtonClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (!success) {
        // If user dismissed or failed, show guide
        setShowGuideModal(true);
      }
    } else {
      // Show universal tablet installation guide
      setShowGuideModal(true);
    }
  };

  return (
    <>
      <button
        onClick={handleButtonClick}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#F37321] to-[#E4222D] hover:from-[#ea6715] hover:to-[#d01c27] text-white rounded-lg text-xs font-semibold shadow-xs hover:shadow transition-all active:scale-95"
        title="태블릿 바탕화면에 다운로드하여 전체화면 앱으로 실행하기"
      >
        <Tablet className="w-3.5 h-3.5" />
        <span>태블릿 앱 설치</span>
      </button>

      {/* Tablet PWA Installation Guide Modal */}
      {showGuideModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          onClick={() => setShowGuideModal(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-5 animate-in zoom-in-95 duration-200 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#F37321]">
                  <Tablet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">태블릿 바탕화면에 앱으로 설치</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    브라우저 주소창 없이 전체화면 네이티브 앱처럼 실행됩니다.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Instruction Body based on Platform */}
            <div className="space-y-3.5 bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-xs text-slate-700">
              {isIOS ? (
                /* iPad / Safari Instructions */
                <>
                  <div className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                    <span>iPad (Safari 브라우저) 안내</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-[#F37321] text-white flex items-center justify-center font-bold text-[11px]">
                      1
                    </span>
                    <p className="leading-relaxed">
                      상단 또는 하단 Safari 툴바의{' '}
                      <strong className="text-slate-900 inline-flex items-center gap-1 font-semibold">
                        <Share2 className="w-3.5 h-3.5 text-blue-600 inline" /> 공유 버튼
                      </strong>
                      을 터치합니다.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-[#F37321] text-white flex items-center justify-center font-bold text-[11px]">
                      2
                    </span>
                    <p className="leading-relaxed">
                      메뉴를 아래로 스크롤하여{' '}
                      <strong className="text-slate-900 inline-flex items-center gap-1 font-semibold">
                        <PlusSquare className="w-3.5 h-3.5 text-slate-700 inline" /> '홈 화면에 추가'
                      </strong>
                      를 터치합니다.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[11px]">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                    <p className="leading-relaxed">
                      우측 상단 <strong>'추가'</strong>를 누르면 태블릿 바탕화면에 한화 모멘텀 아이콘이 생성되며, 터치 시 독립된 앱으로 즉시 실행됩니다!
                    </p>
                  </div>
                </>
              ) : (
                /* Android / Galaxy Tab / Chrome / Edge Instructions */
                <>
                  <div className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                    <span>갤럭시 탭 / 안드로이드 태블릿 안내</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-[#F37321] text-white flex items-center justify-center font-bold text-[11px]">
                      1
                    </span>
                    <p className="leading-relaxed">
                      브라우저(Chrome / 삼성 인터넷 등) 우측 상단의{' '}
                      <strong className="text-slate-900">메뉴(점 3개 ⋮)</strong>를 터치합니다.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-[#F37321] text-white flex items-center justify-center font-bold text-[11px]">
                      2
                    </span>
                    <p className="leading-relaxed">
                      <strong className="text-slate-900 inline-flex items-center gap-1 font-semibold">
                        <Download className="w-3.5 h-3.5 text-[#F37321] inline" /> '앱 설치'
                      </strong>{' '}
                      또는 <strong className="text-slate-900">'현재 페이지 추가 &gt; 홈 화면'</strong>을 선택합니다.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[11px]">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                    <p className="leading-relaxed">
                      바탕화면에 한화 모멘텀 앱이 추가되며, 웹 브라우저 창 없이 전체 화면 태블릿 앱 형태로 깔끔하게 학습할 수 있습니다.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2.5 justify-end">
              {isInstallable && (
                <button
                  onClick={async () => {
                    await install();
                    setShowGuideModal(false);
                  }}
                  className="px-4 py-2 bg-[#F37321] hover:bg-[#ea6715] text-white rounded-xl text-xs font-semibold shadow-xs"
                >
                  지금 즉시 설치
                </button>
              )}
              <button
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium"
              >
                확인 완료
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
