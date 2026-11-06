import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  itemName?: string;
  confirmButtonText?: string;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemName,
  confirmButtonText = '삭제하기',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white border border-red-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-red-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-red-100 text-red-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm text-slate-700 leading-relaxed mb-3">{message}</p>
          {itemName && (
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 break-all">
              {itemName}
            </div>
          )}
          <p className="text-xs text-slate-500 mt-3">
            삭제된 항목은 복구할 수 없습니다. 계속 진행하시겠습니까?
          </p>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-md transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              <span>{confirmButtonText}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
