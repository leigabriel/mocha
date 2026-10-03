import { useState } from 'react';
import Toast from './components/Toast.jsx';
import LeftPanel from './components/LeftPanel.jsx';
import Viewport from './components/Viewport.jsx';
import { useKeychainStudio } from './hooks/useKeychainStudio.js';

export default function App() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const {
    containerRef,
    toast,
    bgMode,
    branches,
    activeCharmIndex,
    activeBranch,
    customEmojiInput,
    setCustomEmojiInput,
    category,
    setCategory,
    searchQuery,
    setSearchQuery,
    chainLinks,
    clusterSpread,
    clusterSpreadText,
    thickness,
    finish,
    exportAnimType,
    setExportAnimType,
    filteredEmojis,
    selectCharm,
    applyNewEmoji,
    handleAddCharm,
    handleRemoveCharm,
    handleUpdateLinks,
    handleUpdateSpread,
    handleUpdateThickness,
    handleUpdateFinish,
    handleCameraView,
    handleSetSceneBackground,
    handleSpinCluster,
    handleNudgeCluster,
    handleResetPose,
    handleExportGLB,
    handleExportGLTF,
    handleExportOBJ,
    handleCaptureSnapshot
  } = useKeychainStudio();

  return (
    <div className="w-screen h-screen flex flex-row overflow-hidden bg-sceneLight relative">
      {/* In-Canvas Toast Notification */}
      <Toast toast={toast} />

      {/* Mobile Floating HUD Toggle */}
      <button
        type="button"
        onClick={() => {
          const next = !mobileOpen;
          setMobileOpen(next);
          setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
          }, 50);
        }}
        className="md:hidden fixed bottom-4 right-4 z-50 hud-btn px-3.5 py-2 font-mono text-xs uppercase font-bold tracking-wider flex items-center gap-2 shadow-2xl cursor-pointer"
        title={mobileOpen ? 'Switch to 3D Viewport' : 'Open Studio Controls'}
      >
        <i className={mobileOpen ? 'fa-solid fa-cube text-xs' : 'fa-solid fa-sliders text-xs'}></i>
        <span>{mobileOpen ? '3D View' : 'Controls'}</span>
      </button>

      {/* WIDER LEFT PANEL: #0034FF with Pure White Typography and Sharp Controls */}
      <LeftPanel
        bgMode={bgMode}
        branches={branches}
        activeCharmIndex={activeCharmIndex}
        activeBranch={activeBranch}
        customEmojiInput={customEmojiInput}
        setCustomEmojiInput={setCustomEmojiInput}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        category={category}
        setCategory={setCategory}
        filteredEmojis={filteredEmojis}
        chainLinks={chainLinks}
        clusterSpread={clusterSpread}
        clusterSpreadText={clusterSpreadText}
        thickness={thickness}
        finish={finish}
        exportAnimType={exportAnimType}
        setExportAnimType={setExportAnimType}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        onSetSceneBackground={handleSetSceneBackground}
        onAddCharm={handleAddCharm}
        onRemoveCharm={handleRemoveCharm}
        onSelectCharm={selectCharm}
        onApplyNewEmoji={applyNewEmoji}
        onSpinCluster={handleSpinCluster}
        onNudgeCluster={handleNudgeCluster}
        onResetPose={handleResetPose}
        onUpdateLinks={handleUpdateLinks}
        onUpdateSpread={handleUpdateSpread}
        onUpdateThickness={handleUpdateThickness}
        onUpdateFinish={handleUpdateFinish}
        onCameraView={handleCameraView}
        onExportGLB={handleExportGLB}
        onExportGLTF={handleExportGLTF}
        onExportOBJ={handleExportOBJ}
        onCaptureSnapshot={handleCaptureSnapshot}
      />

      {/* RIGHT MAIN VIEWPORT: 3D Canvas Area */}
      <Viewport containerRef={containerRef} />
    </div>
  );
}
