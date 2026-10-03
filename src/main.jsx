import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>,
)

// Registering a service worker — even one that does no caching — is what
// makes Chrome treat this as a fully installable PWA (a real WebAPK on
// Android), instead of a plain bookmark shortcut that Android can discard
// whenever it hands control to a native picker (e.g. the file chooser).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
