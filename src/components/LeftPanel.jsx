import { useState } from 'react';
import ClusterSection from './panel/ClusterSection.jsx';
import EmojiSection from './panel/EmojiSection.jsx';
import ExportSection from './panel/ExportSection.jsx';
import PanelHeader from './panel/PanelHeader.jsx';
import { CameraSection, ChainSection, FinishSection, ThicknessSection } from './panel/HardwareSection.jsx';

/**
 * Studio controls. On phones this is a bottom sheet under the 3D view (so the result
 * stays visible while tuning) that can be collapsed to just its header; from `md` up
 * it is a fixed-width side panel. There is a single scroll container.
 */
export default function LeftPanel(props) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      aria-label="Studio controls"
      className={`z-40 flex w-full shrink-0 flex-col border-t border-white/30 bg-brand text-white md:order-first md:h-full md:w-[400px] md:border-r md:border-t-0 lg:w-[460px] ${
        collapsed ? 'h-auto' : 'h-[48dvh]'
      }`}
    >
      <PanelHeader
        bgMode={props.bgMode}
        onSetSceneBackground={props.handleSetSceneBackground}
        canUndo={props.canUndo}
        canRedo={props.canRedo}
        onUndo={props.handleUndo}
        onRedo={props.handleRedo}
        onCopyShareLink={props.handleCopyShareLink}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
      />

      <div id="studio-controls" className={`min-h-0 flex-1 overflow-y-auto ${collapsed ? 'hidden md:block' : 'block'}`}>
        <ClusterSection
          branches={props.branches}
          activeCharmIndex={props.activeCharmIndex}
          onSelectCharm={props.selectCharm}
          onRemoveCharm={props.handleRemoveCharm}
          onAddCharm={props.handleAddCharm}
        />
        <EmojiSection
          activeCharmIndex={props.activeCharmIndex}
          activeBranch={props.activeBranch}
          customEmojiInput={props.customEmojiInput}
          setCustomEmojiInput={props.setCustomEmojiInput}
          searchQuery={props.searchQuery}
          setSearchQuery={props.setSearchQuery}
          category={props.category}
          setCategory={props.setCategory}
          filteredEmojis={props.filteredEmojis}
          onApplyNewEmoji={props.applyNewEmoji}
          onSpinCluster={props.handleSpinCluster}
          onNudgeCluster={props.handleNudgeCluster}
          onResetPose={props.handleResetPose}
        />
        <ChainSection
          chainLinks={props.chainLinks}
          clusterSpread={props.clusterSpread}
          clusterSpreadText={props.clusterSpreadText}
          onUpdateLinks={props.handleUpdateLinks}
          onUpdateSpread={props.handleUpdateSpread}
        />
        <ThicknessSection thickness={props.thickness} sizeMm={props.sizeMm} onUpdateThickness={props.handleUpdateThickness} />
        <FinishSection finish={props.finish} onUpdateFinish={props.handleUpdateFinish} />
        <CameraSection onCameraView={props.handleCameraView} />
        <ExportSection
          exportAnimType={props.exportAnimType}
          setExportAnimType={props.setExportAnimType}
          snapshotTransparent={props.snapshotTransparent}
          setSnapshotTransparent={props.setSnapshotTransparent}
          onExportGLB={props.handleExportGLB}
          onExportGLTF={props.handleExportGLTF}
          onExportOBJ={props.handleExportOBJ}
          onCaptureSnapshot={props.handleCaptureSnapshot}
        />
      </div>
    </aside>
  );
}
