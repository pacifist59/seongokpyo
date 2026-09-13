import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './components/ThemeContext';
import { ToastProvider } from './components/ToastContext';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode><ThemeProvider><ToastProvider><App /></ToastProvider></ThemeProvider></StrictMode>,
);
