import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

const rootStyles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #F8F9FA;
    color: #1A1A2E;
    line-height: 1.5;
  }
  a { color: inherit; text-decoration: none; }
  button { cursor: pointer; font-family: inherit; }
  input, select, textarea { font-family: inherit; }
`;

const styleEl = document.createElement('style');
styleEl.textContent = rootStyles;
document.head.appendChild(styleEl);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
