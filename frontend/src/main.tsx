import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from '@/App';
import { initGlobalErrorTelemetry } from '@/services/telemetry/errorReporter';
import '@/styles/index.css';

initGlobalErrorTelemetry();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
