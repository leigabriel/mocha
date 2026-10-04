import Toast from './components/Toast.jsx';
import LeftPanel from './components/LeftPanel.jsx';
import Viewport from './components/Viewport.jsx';
import { useKeychainStudio } from './hooks/useKeychainStudio.js';

export default function App() {
  const studio = useKeychainStudio();

  return (
    <div className="relative flex h-dvh w-screen flex-col overflow-hidden bg-sceneLight md:flex-row">
      <Toast toast={studio.toast} />
      <Viewport containerRef={studio.containerRef} branches={studio.branches} onKeyDown={studio.handleViewportKeyDown} />
      <LeftPanel {...studio} />
    </div>
  );
}
