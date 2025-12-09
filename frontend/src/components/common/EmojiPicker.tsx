import { useState, useRef, useEffect } from 'react';
import EmojiPickerReact, { EmojiClickData, Theme } from 'emoji-picker-react';

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  className?: string;
  placeholder?: string;
}

export default function EmojiPicker({ value, onChange, className = '', placeholder = '📁' }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const handleEmojiSelect = (emojiData: EmojiClickData) => {
    onChange(emojiData.emoji);
    setIsOpen(false);
  };

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Calculate position to avoid being cut off
  useEffect(() => {
    if (isOpen && pickerRef.current && containerRef.current) {
      const picker = pickerRef.current;
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      // Check if picker would go off bottom of screen
      if (rect.bottom + 420 > viewportHeight) {
        picker.style.bottom = '100%';
        picker.style.top = 'auto';
        picker.style.marginBottom = '4px';
      } else {
        picker.style.top = '100%';
        picker.style.bottom = 'auto';
        picker.style.marginTop = '4px';
      }

      // Check if picker would go off right of screen
      if (rect.left + 350 > viewportWidth) {
        picker.style.right = '0';
        picker.style.left = 'auto';
      } else {
        picker.style.left = '0';
        picker.style.right = 'auto';
      }
    }
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-10 border border-gray-300 rounded-lg px-3 py-2 text-2xl hover:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent flex items-center justify-center bg-white"
      >
        {value || placeholder}
      </button>

      {isOpen && (
        <div
          ref={pickerRef}
          className="absolute z-[9999] bg-white border border-gray-200 rounded-lg shadow-xl"
          style={{ position: 'absolute' }}
        >
          <EmojiPickerReact
            onEmojiClick={handleEmojiSelect}
            theme={Theme.LIGHT}
            searchPlaceHolder="Search emoji..."
            width={320}
            height={380}
          />
        </div>
      )}
    </div>
  );
}
