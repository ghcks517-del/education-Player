import {createRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Ensure installed PWA apps (e.g. Galaxy Tab home-screen app) check for new builds automatically
if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  const updateSW = registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      const checkUpdate = () => {
        registration.update().catch(() => {
          // Ignore update check failure when offline
        });
      };

      // Check when tablet app resumes from background or regains connectivity
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          checkUpdate();
        }
      });
      window.addEventListener('online', checkUpdate);
    },
  });

  // Expose update check helper for manual sync/refresh action
  (window as Window & { __checkPwaUpdate?: () => Promise<void> }).__checkPwaUpdate = () =>
    updateSW(true);
}

createRoot(document.getElementById('root')!).render(<App />);
