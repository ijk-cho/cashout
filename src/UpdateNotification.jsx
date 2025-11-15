import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * Update Notification Component
 * Shows a banner when a new version of the app is available
 */
const UpdateNotification = () => {
  const [showUpdate, setShowUpdate] = useState(false);
  const [registration, setRegistration] = useState(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        setRegistration(reg);

        // Check for updates periodically (every 60 seconds)
        const interval = setInterval(() => {
          reg.update();
        }, 60000);

        return () => clearInterval(interval);
      });

      // Listen for new service worker waiting
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Service worker updated, reload the page
        if (!showUpdate) {
          window.location.reload();
        }
      });

      // Check if there's an update waiting
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg && reg.waiting) {
          setShowUpdate(true);
        }
      });

      // Listen for updates
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
          setShowUpdate(true);
        }
      });
    }
  }, []);

  const handleUpdate = () => {
    if (registration && registration.waiting) {
      // Tell the service worker to skip waiting
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      setShowUpdate(false);
      // The page will reload when controllerchange event fires
    }
  };

  if (!showUpdate) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-4 animate-slide-down">
      <div className="max-w-md mx-auto bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-2xl border border-blue-500 overflow-hidden">
        <div className="p-4 flex items-center gap-4">
          <div className="flex-shrink-0">
            <RefreshCw className="text-white" size={24} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold">
              Update Available
            </p>
            <p className="text-blue-100 text-sm">
              A new version of CashOut is ready
            </p>
          </div>

          <button
            onClick={handleUpdate}
            className="flex-shrink-0 bg-white text-blue-600 hover:bg-blue-50 font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Update
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slide-down {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default UpdateNotification;
