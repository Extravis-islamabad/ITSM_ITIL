import { useState } from 'react';
import { SparklesIcon } from '@heroicons/react/24/solid';
import AIChatbot from './AIChatbot';

export default function ChatbotButton() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <>
      {/* Floating Button */}
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-6 right-6 z-40 group"
          aria-label="Open AI Chatbot"
        >
          <div className="relative">
            {/* Pulsing animation background */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary-600 to-accent-600 rounded-full animate-pulse opacity-75"></div>

            {/* Main button */}
            <div className="relative bg-gradient-to-r from-primary-600 to-accent-600 text-white p-4 rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-110 transition-all duration-300">
              <SparklesIcon className="h-7 w-7" />

              {/* Notification badge */}
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-bounce">
                AI
              </span>
            </div>
          </div>

          {/* Tooltip */}
          <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <div className="bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
              Need help? Chat with AI Assistant
              <div className="absolute top-full right-6 -mt-1">
                <div className="border-8 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          </div>
        </button>
      )}

      {/* Chatbot Component */}
      <AIChatbot isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </>
  );
}
