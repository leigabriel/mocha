import Toast from './components/Toast.jsx';
import LeftPanel from './components/LeftPanel.jsx';
import Viewport from './components/Viewport.jsx';
import { useKeychainStudio } from './hooks/useKeychainStudio.js';

export default function App() {
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
    soundEnabled,
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
    handleToggleAudio,
    handleSpinCluster,
    handleNudgeCluster,
    handleResetPose,
    handleExportGLB,
    handleExportGLTF,
    handleExportOBJ,
    handleCaptureSnapshot
  } = useKeychainStudio();

  return (
    <div className="w-screen h-screen flex flex-row overflow-hidden bg-sceneLight">
      {/* In-Canvas Toast Notification */}
      <Toast toast={toast} />

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
        soundEnabled={soundEnabled}
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
        onToggleAudio={handleToggleAudio}
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
