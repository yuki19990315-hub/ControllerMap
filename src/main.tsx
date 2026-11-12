import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register Service Worker for PWA installation & offline support
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('CrossPad PWA ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch((err) => {
        console.warn('CrossPad ServiceWorker registration failed: ', err);
      });
  });
}

createRoot(document.getElementById('root')!).render(<App />);
