import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { archive } from './domain/archive';
import { legacyHash } from './domain/routes';
import { LanguageProvider } from './i18n/LanguageProvider';
import { GamesProvider } from './state/GamesProvider';
import { ToastProvider } from './ui/ToastProvider';
import './styles/global.css';

// The first site's addresses (/euro-rank/players) arrive through Pages' 404 page.
const moved = legacyHash(
  window.location.pathname,
  import.meta.env.BASE_URL,
  archive.editions[0]?.year ?? new Date().getFullYear(),
);
if (moved) window.history.replaceState(null, '', `${import.meta.env.BASE_URL}${moved}`);

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <LanguageProvider>
      <GamesProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </GamesProvider>
    </LanguageProvider>
  </StrictMode>,
);
