import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/geist-pixel/index.css';
import '@fontsource/silkscreen/400.css';
import '@fontsource/silkscreen/700.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
