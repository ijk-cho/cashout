import React, { useState, useEffect } from 'react';
import { Share, Plus, X, Home } from 'lucide-react';

/**
 * iOS PWA Install Guide Component
 * Shows step-by-step instructions for iOS users to add the app to their home screen
 * Only displays on iOS Safari when the app is not installed
 */
const IOSInstallGuide = () => {
  const [showGuide, setShowGuide] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect iOS devices
    const checkIsIOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);

      // Also check for iOS 13+ on iPad which may report as Mac
      const isIPadOS = navigator.maxTouchPoints > 1 && /macintosh/.test(userAgent);

      return isIOSDevice || isIPadOS;
    };

    setIsIOS(checkIsIOS());

    // Don't show if not iOS
    if (!checkIsIOS()) {
      return;
    }

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true) {
      setIsInstalled(true);
      return;
    }

    // Check if user has previously dismissed the guide
    const dismissed = localStorage.getItem('ios-install-guide-dismissed');
    const dismissedTime = localStorage.getItem('ios-install-guide-dismissed-time');

    // Don't show again if dismissed within last 7 days
    if (dismissed && dismissedTime) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        return;
      }
    }

    // Show guide after a short delay (3 seconds - slightly longer than Android prompt)
    const timer = setTimeout(() => {
      setShowGuide(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setShowGuide(false);
    localStorage.setItem('ios-install-guide-dismissed', 'true');
    localStorage.setItem('ios-install-guide-dismissed-time', Date.now().toString());
    console.log('[iOS PWA] Install guide dismissed');
  };

  const handleGotIt = () => {
    handleDismiss();
  };

  // Don't render if not iOS, already installed, or guide shouldn't be shown
  if (!isIOS || isInstalled || !showGuide) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-slide-up">
      <div className="max-w-md mx-auto bg-gradient-to-br from-[#1E2433] to-[#252B3D] rounded-2xl shadow-2xl border border-white/10">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-white/70 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full"
          aria-label="Dismiss install guide"
        >
          <X size={20} />
        </button>

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-[#D4AF37] to-[#C9A942] rounded-2xl flex items-center justify-center shadow-[0_4px_16px_rgba(212,175,55,0.3)]">
              <span className="text-3xl text-[#0A0E14] font-bold">$</span>
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-[#F8FAFC] mb-1">
                Install CashOut
              </h3>
              <p className="text-sm text-[#CBD5E1]">
                Add to your home screen for the full app experience
              </p>
            </div>
          </div>

          {/* Step-by-step instructions */}
          <div className="space-y-4 mb-6">
            {/* Step 1 */}
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-[#F8FAFC] font-bold text-sm">
                1
              </div>
              <div className="flex-1 flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-[#D4AF37]/20 rounded-lg flex items-center justify-center border border-[#D4AF37]/30">
                  <Share size={20} className="text-[#D4AF37]" />
                </div>
                <div>
                  <p className="text-[#F8FAFC] text-sm font-medium">Tap the Share button</p>
                  <p className="text-[#CBD5E1]/70 text-xs">At the bottom of Safari</p>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-[#F8FAFC] font-bold text-sm">
                2
              </div>
              <div className="flex-1 flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-[#D4AF37]/20 rounded-lg flex items-center justify-center border border-[#D4AF37]/30">
                  <Plus size={20} className="text-[#D4AF37]" />
                </div>
                <div>
                  <p className="text-[#F8FAFC] text-sm font-medium">Select "Add to Home Screen"</p>
                  <p className="text-[#CBD5E1]/70 text-xs">Scroll down if needed</p>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-[#F8FAFC] font-bold text-sm">
                3
              </div>
              <div className="flex-1 flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-[#D4AF37]/20 rounded-lg flex items-center justify-center border border-[#D4AF37]/30">
                  <Home size={20} className="text-[#D4AF37]" />
                </div>
                <div>
                  <p className="text-[#F8FAFC] text-sm font-medium">Tap "Add"</p>
                  <p className="text-[#CBD5E1]/70 text-xs">The app will appear on your home screen</p>
                </div>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleGotIt}
              className="flex-1 bg-gradient-to-r from-[#D4AF37] to-[#C9A942] hover:shadow-[0_6px_24px_rgba(212,175,55,0.4)] text-[#0A0E14] font-semibold py-2.5 px-4 rounded-xl transition-all duration-200"
            >
              Got it!
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2.5 text-[#CBD5E1] hover:text-[#F8FAFC] hover:bg-white/10 rounded-xl transition-all duration-200 font-medium"
            >
              Later
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default IOSInstallGuide;
