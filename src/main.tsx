import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { InitialDataProvider } from './components/InitialDataContext';
import App from './App';
import { ThemeProvider } from './components/ThemeContext';
import { ToastProvider } from './components/ToastContext';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode><BrowserRouter><InitialDataProvider data={JSON.parse(document.getElementById('initial-data')?.textContent || '{}')}><ThemeProvider><ToastProvider><App /></ToastProvider></ThemeProvider></InitialDataProvider></BrowserRouter></StrictMode>,
);
