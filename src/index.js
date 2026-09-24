import React from 'react';
import ReactDOM from 'react-dom/client';
import './design-system/tokens.css';
import './design-system/qz.css';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { initTheme } from './design-system/theme';

initTheme();

// Suppress ResizeObserver benign warning from CRA dev overlay
window.addEventListener('error', (e) => {
  if (
    e.message === 'ResizeObserver loop completed with undelivered notifications.' ||
    e.message === 'ResizeObserver loop limit exceeded'
  ) {
    e.stopImmediatePropagation()
  }
})

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
