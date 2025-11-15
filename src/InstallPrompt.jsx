import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

/**
 * PWA Install Prompt Component
 * Shows a nice UI to prompt users to install the app
 */
const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true) {
      setIsInstalled(true);
      return;
    }

    // Check if user has previously dismissed the prompt
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    const dismissedTime = localStorage.getItem('pwa-install-dismissed-time');

    // Don't show again if dismissed within last 7 days
    if (dismissed && dismissedTime) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        return;
      }
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      console.log('[PWA] Install prompt event captured');
      e.preventDefault();
      setDeferredPrompt(e);

      // Show prompt after a short delay (2 seconds)
      setTimeout(() => {
        setShowPrompt(true);
      }, 2000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Detect if app was installed
    const handleAppInstalled = () => {
      console.log('[PWA] App installed successfully');
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      console.log('[PWA] No install prompt available');
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] User response: ${outcome}`);

    if (outcome === 'accepted') {
      console.log('[PWA] User accepted the install prompt');
    } else {
      console.log('[PWA] User dismissed the install prompt');
    }

    // Clear the deferred prompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
    localStorage.setItem('pwa-install-dismissed-time', Date.now().toString());
    console.log('[PWA] Install prompt dismissed');
  };

  // Don't render if installed or prompt shouldn't be shown
  if (isInstalled || !showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-slide-up">
      <div className="max-w-md mx-auto bg-gradient-to-br from-[#1E2433] to-[#252B3D] rounded-2xl shadow-2xl border border-white/10">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-white/70 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full"
          aria-label="Dismiss install prompt"
        >
          <X size={20} />
        </button>

        <div className="p-6">
          {/* Icon */}
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-[#D4AF37] to-[#C9A942] rounded-2xl flex items-center justify-center shadow-[0_4px_16px_rgba(212,175,55,0.3)]">
              <span className="text-3xl text-[#0A0E14] font-bold">$</span>
            </div>

            <div className="flex-1 min-w-0">
              {/* Title */}
              <h3 className="text-lg font-bold text-[#F8FAFC] mb-1">
                Install CashOut App
              </h3>

              {/* Description */}
              <p className="text-sm text-[#CBD5E1] mb-4">
                Add to your home screen for quick access and offline support. Track poker games anytime!
              </p>

              {/* Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleInstallClick}
                  className="flex-1 bg-gradient-to-r from-[#D4AF37] to-[#C9A942] hover:shadow-[0_6px_24px_rgba(212,175,55,0.4)] text-[#0A0E14] font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <Download size={18} />
                  <span>Install</span>
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

export default InstallPrompt;
