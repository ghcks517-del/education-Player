import React from 'react';
import {
  Folder,
  FolderPlus,
  MoreVertical,
  Edit2,
  Trash2,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { Category, VideoItem } from '../types';

interface CategoryNavProps {
  categories: Category[];
  selectedCategoryId: string | null; // null represents "All"
  onSelectCategory: (categoryId: string | null) => void;
  onOpenCreateCategory: () => void;
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (category: Category) => void;
  videos: VideoItem[];
}

export const CategoryNav: React.FC<CategoryNavProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onOpenCreateCategory,
  onEditCategory,
  onDeleteCategory,
  videos,
}) => {
  const [activeMenuId, setActiveMenuId] = React.useState<string | null>(null);

  // Close popup menu when clicking outside
  React.useEffect(() => {
    const handleOutsideClick = () => setActiveMenuId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const getVideoCount = (catId: string | null) => {
    if (catId === null) return videos.length;
    return videos.filter((v) => v.categoryId === catId).length;
  };

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
      {/* Category Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#F37321]" />
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            교안 분류 메뉴
          </h3>
        </div>
        <button
          onClick={onOpenCreateCategory}
          className="flex items-center gap-1 text-xs text-[#F37321] hover:text-[#d95e12] font-semibold px-2 py-1 rounded-md hover:bg-orange-50 transition-colors"
          title="새 분류 생성"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          <span>분류 추가</span>
        </button>
      </div>

      {/* Category List */}
      <nav className="space-y-1">
        {/* All Videos item */}
        <button
          onClick={() => onSelectCategory(null)}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors text-left ${
            selectedCategoryId === null
              ? 'bg-orange-50 text-[#F37321] border border-orange-200 font-semibold shadow-2xs'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Layers className="w-4 h-4 shrink-0" />
            <span className="truncate">전체 교안 모아보기</span>
          </div>
          <span
            className={`text-[11px] font-mono px-2 py-0.5 rounded-md ${
              selectedCategoryId === null
                ? 'bg-[#F37321] text-white'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {getVideoCount(null)}
          </span>
        </button>

        {/* Dynamic Categories */}
        {categories.map((cat) => {
          const isSelected = selectedCategoryId === cat.id;
          const count = getVideoCount(cat.id);
          const isMenuOpen = activeMenuId === cat.id;

          return (
            <div key={cat.id} className="relative group">
              <div
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isSelected
                    ? 'bg-orange-50 text-slate-900 border border-orange-200'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {/* Select button */}
                <button
                  onClick={() => onSelectCategory(cat.id)}
                  className="flex-1 flex items-center gap-2.5 min-w-0 text-left py-0.5"
                  title={cat.description || cat.name}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color || '#F37321' }}
                  />
                  <span className={`truncate ${isSelected ? 'font-semibold text-slate-900' : ''}`}>
                    {cat.name}
                  </span>
                </button>

                {/* Right side: Count and Context menu */}
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <span
                    className={`text-[11px] font-mono px-1.5 py-0.5 rounded ${
                      isSelected
                        ? 'bg-[#F37321] text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>

                  {/* Actions Dropdown Toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuId(isMenuOpen ? null : cat.id);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200/60 opacity-80 group-hover:opacity-100 transition-opacity"
                    title="분류 관리"
                    aria-label="분류 관리"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Category Popover Menu (Edit / Delete) */}
              {isMenuOpen && (
                <div
                  className="absolute right-2 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl p-1 z-30 min-w-[120px] animate-in fade-in zoom-in-95 duration-150"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => {
                      setActiveMenuId(null);
                      onEditCategory(cat);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors text-left"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                    <span>분류 수정</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveMenuId(null);
                      onDeleteCategory(cat);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors text-left"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>분류 삭제</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Quick Add helper if list is empty */}
      {categories.length === 0 && (
        <div className="text-center py-6 px-3">
          <p className="text-xs text-slate-500 mb-2">등록된 분류가 없습니다.</p>
          <button
            onClick={onOpenCreateCategory}
            className="text-xs text-[#F37321] hover:underline font-medium"
          >
            첫 번째 분류 생성하기
          </button>
        </div>
      )}
    </div>
  );
};
