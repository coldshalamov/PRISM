import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/bricolage-grotesque/opsz.css';
import '@fontsource-variable/instrument-sans/wght.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/shell.css';
import './styles/controls.css';
import './styles/data.css';
import './styles/workspace.css';
import './styles/views.css';
import './styles/polish.css';
import Shell from './shell/Shell';
import { WorkspaceProvider } from './workspace';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WorkspaceProvider>
      <Shell />
    </WorkspaceProvider>
  </StrictMode>,
);
