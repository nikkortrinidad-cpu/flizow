import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useBoard } from '../store/useStore';
import { store } from '../store/boardStore';

interface Props {
  value: string;
  onChange: (color: string) => void;
  size?: 'sm' | 'md';
}

export function ColorPicker({ value, onChange, size = 'sm' }: Props) {
  const { state } = useBoard();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const sizeClass = size === 'sm' ? 'w-6 h-6' : 'w-8 h-8';

  const updatePos = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 6, left: rect.left });
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePos();
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popupRef.current && !popupRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, updatePos]);

  const handleSaveColor = () => {
    store.addSavedColor(value);
  };

  const handleRemoveColor = (color: string, e: React.MouseEvent) => {
    e.stopPropagation();
    store.removeSavedColor(color);
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className={`${sizeClass} rounded-full border-2 border-[#d2d2d7] dark:border-[#424245] hover:border-[#0071e3] cursor-pointer transition shrink-0`}
        style={{ backgroundColor: value }}
        title="Click to pick color"
      />

      {open && createPortal(
        <div
          ref={popupRef}
          className="fixed z-[9999] bg-white dark:bg-[#2c2c2e] rounded-xl shadow-lg shadow-black/10 border border-[#d2d2d7] dark:border-[#424245] p-3 w-56"
          style={{ top: pos.top, left: pos.left }}
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
        >
          <p className="text-[10px] font-semibold text-[#86868b] dark:text-[#6e6e73] uppercase tracking-wide mb-2">Saved Palette</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {state.savedColors.map(color => (
              <div key={color} className="relative group/swatch">
                <button
                  onClick={() => { onChange(color); }}
                  className={`w-7 h-7 rounded-full border-2 transition ${
                    value === color ? 'border-[#0071e3] scale-110 ring-2 ring-[#0071e3]/20' : 'border-transparent hover:border-[#aeaeb2] dark:hover:border-[#6e6e73]'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
                <button
                  onClick={(e) => handleRemoveColor(color, e)}
                  className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#ff3b30] text-white rounded-full text-[10px] leading-none flex items-center justify-center opacity-0 group-hover/swatch:opacity-100 transition-opacity"
                  title="Remove from palette"
                >
                  &times;
                </button>
              </div>
            ))}
            {state.savedColors.length === 0 && (
              <p className="text-[10px] text-[#86868b] italic">No saved colors yet</p>
            )}
          </div>

          <div className="border-t border-[#e8e8ed] dark:border-[#38383a] pt-2.5">
            <p className="text-[10px] font-semibold text-[#86868b] dark:text-[#6e6e73] uppercase tracking-wide mb-1.5">Custom Color</p>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={value}
                onChange={e => onChange(e.target.value)}
                className="w-8 h-8 rounded-lg cursor-pointer border-none"
              />
              <span className="text-xs text-[#86868b] dark:text-[#86868b] font-mono flex-1">{value}</span>
              <button
                onClick={handleSaveColor}
                className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded-md font-medium hover:bg-primary/20 transition"
                title="Save to palette"
              >
                Save
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
