import React from 'react';

interface HanwhaLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const HanwhaLogo: React.FC<HanwhaLogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
}) => {
  const iconDimensions = {
    sm: { width: 38, height: 32 },
    md: { width: 48, height: 40 },
    lg: { width: 58, height: 48 },
  }[size];

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* 100% Authentic Hanwha Group CI Trio Circle Emblem Vector */}
      <svg
        width={iconDimensions.width}
        height={iconDimensions.height}
        viewBox="-1 0 65 54"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-200 hover:scale-105"
        aria-label="한화모멘텀 심볼 마크"
      >
        {/* Ring 3: Soft warm apricot gold ring (Top-right) */}
        <path
          fill="#FBB584"
          d="M23.08,29.06c-.81-7.37,6.92-13.28,17.25-13.2,10.34,.08,19.38,6.12,20.19,13.48,.81,7.38-6.91,13.28-17.25,13.2-10.34-.08-19.38-6.11-20.19-13.48m39.37,2.28c-.94-9.14-11.34-16.62-23.24-16.72-11.91-.1-20.8,7.23-19.86,16.37,.94,9.14,11.34,16.63,23.24,16.73,11.9,.09,20.8-7.23,19.86-16.38"
        />

        {/* Ring 2: Medium warm orange ring (Bottom-right) */}
        <path
          fill="#F89B6C"
          d="M44.48,47.9c-5.86,6.13-15.27,6.64-21.02,1.14-5.75-5.5-5.65-14.92,.22-21.04,5.86-6.12,15.28-6.63,21.01-1.14,5.74,5.5,5.65,14.92-.22,21.04M22.77,27.8c-6.81,7.12-6.92,18.07-.25,24.46,6.67,6.39,17.62,5.8,24.43-1.32,6.82-7.12,6.93-18.07,.25-24.46-6.67-6.39-17.61-5.8-24.43,1.32"
        />

        {/* Ring 1: Hanwha Signature Core Orange ring (Dominant center) */}
        <path
          fill="#F37321"
          d="M23.39,4.88c12.19-4.57,24.25,.05,26.93,10.32,2.68,10.28-5.03,22.3-17.22,26.87-12.19,4.58-24.25-.05-26.93-10.32C3.48,21.48,11.2,9.45,23.39,4.88m-11.33,3.92C-.58,18.82-3.8,33.33,4.87,41.21c8.67,7.89,25.96,6.16,38.61-3.86,12.65-10.01,15.87-24.52,7.19-32.41C42-2.94,24.71-1.21,12.06,8.8"
        />
      </svg>

      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-extrabold tracking-tight text-slate-900 font-sans text-base lg:text-lg">
              Hanwha
            </span>
            <span className="font-extrabold tracking-tight text-[#F37321] font-sans text-base lg:text-lg">
              Momentum
            </span>
            <span className="text-[10px] font-bold text-slate-600 tracking-wider uppercase ml-1 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
              EduPlayer
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium tracking-tight mt-1">
            한화모멘텀 동영상 교안 플레이어
          </span>
        </div>
      )}
    </div>
  );
};
