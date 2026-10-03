export default function LeftPanel({
  bgMode,
  branches,
  activeCharmIndex,
  activeBranch,
  customEmojiInput,
  setCustomEmojiInput,
  searchQuery,
  setSearchQuery,
  category,
  setCategory,
  filteredEmojis,
  chainLinks,
  clusterSpread,
  clusterSpreadText,
  thickness,
  finish,
  soundEnabled,
  onSetSceneBackground,
  onAddCharm,
  onRemoveCharm,
  onSelectCharm,
  onApplyNewEmoji,
  onSpinCluster,
  onNudgeCluster,
  onResetPose,
  onUpdateLinks,
  onUpdateSpread,
  onUpdateThickness,
  onUpdateFinish,
  onCameraView,
  onToggleAudio,
  onExportGLB,
  onExportGLTF,
  onExportOBJ,
  onCaptureSnapshot
}) {
  return (
    <aside className="w-96 sm:w-[420px] md:w-[450px] lg:w-[470px] h-full bg-[#0034FF] text-white flex flex-col justify-between border-r border-white/20 z-40 flex-shrink-0 overflow-y-auto">
      {/* Top Header */}
      <div className="p-4 border-b border-white/20 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 font-pixel text-xs tracking-wider">
            <span className="inline-block w-2.5 h-2.5 bg-white"></span>
            <span>MOCHI // KEYCHAIN STUDIO</span>
          </div>
          <span className="text-white/60 font-mono text-[9px] uppercase tracking-wider">[1.SHARED.RING]</span>
        </div>

        {/* Scene Canvas Background Switcher */}
        <div className="flex items-center justify-between text-[11px] pt-0.5">
          <span className="text-white/70 uppercase text-[10px] tracking-wider">Canvas Viewport</span>
          <div className="flex items-center border border-white/30 text-[10px]">
            <button
              id="bgLightBtn"
              onClick={() => onSetSceneBackground('light')}
              className={`px-3 py-0.5 ${
                bgMode === 'light'
                  ? 'bg-white text-[#0034FF] font-semibold'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              #EBEBEB
            </button>
            <button
              id="bgDarkBtn"
              onClick={() => onSetSceneBackground('dark')}
              className={`px-3 py-0.5 ${
                bgMode === 'dark'
                  ? 'bg-white text-[#0034FF] font-semibold'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              #212121
            </button>
          </div>
        </div>
      </div>

      {/* Middle Scrollable Configuration Sections */}
      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        {/* 00 Cluster Manager (One Shared Ring) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] tracking-widest text-white/70 uppercase block">
              00 Hanging Cluster (1 Master Ring)
            </span>
            <button
              id="addClusterCharmBtn"
              onClick={onAddCharm}
              className="hud-btn-subtle px-2.5 py-0.5 text-[9px] uppercase font-bold tracking-wider hover:bg-white hover:text-[#0034FF]"
            >
              + Add To Ring
            </button>
          </div>
          {/* Active Charms in Cluster */}
          <div id="clusterCharmsList" className="flex flex-wrap gap-1.5 pt-0.5">
            {branches.map((b, idx) => {
              const isActive = idx === activeCharmIndex;
              return (
                <div
                  key={idx}
                  onClick={() => onSelectCharm(idx)}
                  className={`flex items-center gap-1.5 px-2.5 py-0.5 border text-xs cursor-pointer ${
                    isActive
                      ? 'bg-white text-[#0034FF] font-bold border-white'
                      : 'border-white/30 text-white hover:bg-white/10'
                  }`}
                >
                  <span>#{idx + 1} {b.emoji}</span>
                  {branches.length > 1 && (
                    <button
                      className="delete-charm-btn ml-1 hover:text-red-500 font-bold"
                      data-idx={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveCharm(idx);
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[9px] text-white/60 font-mono">
            ONE MASTER RING // MULTI-LINK CABLE CHAIN // 100% OPAQUE PIXEL CHARMS
          </p>
        </div>

        {/* 01 Custom Emoji & Preset Catalog for Selected Charm */}
        <div className="space-y-2 pt-2 border-t border-white/15">
          <div className="flex items-center justify-between">
            <span className="text-[10px] tracking-widest text-white/70 uppercase block">
              01 Selected Charm Emoji
            </span>
            <span id="selectedCharmLabel" className="text-[9px] text-white/80 font-mono">
              [CHARM #{activeCharmIndex + 1}: {activeBranch?.emoji || '👾'}]
            </span>
          </div>

          {/* Universal Custom Emoji Input Field */}
          <div className="space-y-1 bg-white/10 p-2 border border-white/30">
            <span className="text-[9px] text-white/80 font-mono tracking-wider block uppercase">
              Type or Paste Any Emoji Directly
            </span>
            <div className="flex items-center gap-1.5">
              <input
                id="customEmojiInput"
                type="text"
                placeholder="PASTE/TYPE ANY EMOJI (🥷, ❤️‍🔥, 🪐, 🏴‍☠️)..."
                value={customEmojiInput}
                onChange={(e) => setCustomEmojiInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customEmojiInput.trim()) {
                    onApplyNewEmoji(customEmojiInput);
                  }
                }}
                onPaste={() => {
                  setTimeout(() => {
                    if (customEmojiInput.trim()) onApplyNewEmoji(customEmojiInput);
                  }, 10);
                }}
                className="flex-1 h-8 px-2.5 text-xs font-mono bg-white text-[#0034FF] placeholder-[#0034FF]/50 border border-white font-bold outline-none"
              />
              <button
                id="applyCustomEmojiBtn"
                onClick={() => {
                  if (customEmojiInput.trim()) onApplyNewEmoji(customEmojiInput);
                }}
                className="hud-btn px-3 h-8 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1"
              >
                <i className="fa-solid fa-wand-magic-sparkles text-[9px]"></i>
                <span>Bake</span>
              </button>
            </div>
            <div className="flex items-center justify-between text-[9px] text-white/70 pt-0.5">
              <span>KEYBOARD, MULTI-BYTE & ZWJ SUPPORT</span>
              <button
                id="randomEmojiBtn"
                onClick={() => {
                  const surprisePool = ['🥷', '❤️‍🔥', '🛸', '🪐', '🦄', '🕹️', '🐉', '🍄', '🧿', '👑', '🧸', '🍦', '🏴‍☠️'];
                  const picked = surprisePool[Math.floor(Math.random() * surprisePool.length)];
                  onApplyNewEmoji(picked);
                }}
                className="hover:text-white underline uppercase cursor-pointer"
              >
                Surprise Me
              </button>
            </div>
          </div>

          {/* Quick Interaction Bar */}
          <div className="flex items-center gap-1.5 pt-1">
            <button
              id="spinClusterBtn"
              onClick={onSpinCluster}
              className="hud-btn-subtle px-2.5 h-7 text-[10px] uppercase flex items-center gap-1"
              title="Spin entire cluster 360°"
            >
              <i className="fa-solid fa-rotate text-[9px]"></i>
              <span>Spin 360°</span>
            </button>
            <button
              id="nudgeClusterBtn"
              onClick={onNudgeCluster}
              className="hud-btn-subtle px-2.5 h-7 text-[10px] uppercase flex items-center gap-1"
              title="Swing cluster naturally"
            >
              <i className="fa-solid fa-hand-fist text-[9px]"></i>
              <span>Swing</span>
            </button>
            <button
              id="resetPoseBtn"
              onClick={onResetPose}
              className="hud-btn-subtle px-2.5 h-7 text-[10px] uppercase flex items-center gap-1 ml-auto"
              title="Reset to natural rest pose"
            >
              <i className="fa-solid fa-arrows-to-dot text-[9px]"></i>
              <span>Rest</span>
            </button>
          </div>

          {/* Preset Search Box */}
          <div className="relative pt-1">
            <input
              id="emojiSearchInput"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="SEARCH PRESETS (CAT, PIZZA, SKULL, SWORD...)"
              className="w-full h-6 px-2 text-[10px] bg-white/10 text-white placeholder-white/40 border border-white/30 uppercase outline-none focus:bg-white focus:text-[#0034FF] focus:placeholder-[#0034FF]/50 transition-colors"
            />
          </div>

          {/* Category Selector Tabs */}
          <div className="flex flex-wrap gap-1 pt-0.5 text-[9px] uppercase tracking-wider font-semibold">
            {['all', 'faces', 'animals', 'food', 'objects', 'symbols'].map((cat) => {
              const isActive = category === cat;
              return (
                <button
                  key={cat}
                  data-cat={cat}
                  onClick={() => setCategory(cat)}
                  className={`cat-tab-btn px-2 py-0.5 border ${
                    isActive
                      ? 'active border-white bg-white text-[#0034FF]'
                      : 'border-white/30 text-white hover:border-white'
                  }`}
                >
                  {cat.toUpperCase()}
                </button>
              );
            })}
          </div>

          {/* Scrollable Preset Emoji Grid */}
          <div
            id="emojiCatalogGrid"
            className="grid grid-cols-8 gap-1 p-1 max-h-32 overflow-y-auto bg-black/15 border border-white/20"
          >
            {filteredEmojis.length === 0 ? (
              <div className="col-span-8 py-4 text-center text-white/50 text-[10px] uppercase font-mono">
                No presets found
              </div>
            ) : (
              filteredEmojis.map((item, idx) => (
                <button
                  key={idx}
                  className="emoji-item-btn p-1 border border-white/20 text-center text-sm hover:border-white hover:text-[#0034FF] cursor-pointer"
                  title={`${item.char} (${item.tags})`}
                  onClick={() => onApplyNewEmoji(item.char)}
                >
                  {item.char}
                </button>
              ))
            )}
          </div>
        </div>

        {/* 02 RESTORED CHAIN SELECTION: 4 TO 10 INTERLOCKING LINKS */}
        <div className="space-y-1.5 pt-2 border-t border-white/15">
          <div className="flex items-center justify-between">
            <span className="text-[10px] tracking-widest text-white/70 uppercase block">
              02 Chain Links (4–10)
            </span>
            <span id="chainLinksVal" className="text-[9px] font-semibold text-white/80 font-mono">
              {chainLinks} LINKS
            </span>
          </div>

          {/* Stepper and Range Slider */}
          <div className="flex items-center gap-2">
            <button
              id="decLinksBtn"
              onClick={() => onUpdateLinks(chainLinks - 1)}
              className="hud-btn-subtle w-7 h-7 text-xs flex items-center justify-center font-bold hover:bg-white hover:text-[#0034FF] cursor-pointer"
              title="Decrease chain links"
            >
              -
            </button>
            <input
              id="chainLinksSlider"
              type="range"
              min="4"
              max="10"
              step="1"
              value={chainLinks}
              onChange={(e) => onUpdateLinks(e.target.value)}
              className="flex-1 cursor-pointer"
            />
            <button
              id="incLinksBtn"
              onClick={() => onUpdateLinks(chainLinks + 1)}
              className="hud-btn-subtle w-7 h-7 text-xs flex items-center justify-center font-bold hover:bg-white hover:text-[#0034FF] cursor-pointer"
              title="Increase chain links"
            >
              +
            </button>
          </div>

          {/* Quick Preset Chips */}
          <div className="grid grid-cols-4 gap-1 pt-0.5 text-[9px] uppercase">
            {[4, 6, 8, 10].map((l) => (
              <button
                key={l}
                data-links={l}
                onClick={() => onUpdateLinks(l)}
                className={`link-preset-btn hud-btn-subtle py-1 text-center ${
                  chainLinks === l ? 'active' : ''
                }`}
              >
                {l} Links
              </button>
            ))}
          </div>

          {/* Cluster Tightness Spread Slider */}
          <div className="flex items-center justify-between text-[9px] text-white/60 pt-1">
            <span>CLUSTER SPREAD</span>
            <span id="clusterSpreadVal">{clusterSpreadText}</span>
          </div>
          <input
            id="clusterSpreadSlider"
            type="range"
            min="0.75"
            max="1.35"
            step="0.05"
            value={clusterSpread}
            onChange={(e) => onUpdateSpread(e.target.value)}
            className="w-full cursor-pointer"
          />
        </div>

        {/* 03 Selected Charm Molded Thickness */}
        <div className="space-y-1.5 pt-2 border-t border-white/15">
          <span className="text-[10px] tracking-widest text-white/70 uppercase block">
            03 Voxel Thickness
          </span>
          <div className="grid grid-cols-3 gap-1.5 text-[10px]">
            {[
              { val: 1, label: '3.0mm' },
              { val: 2, label: '4.5mm' },
              { val: 3, label: '6.0mm' }
            ].map(({ val, label }) => (
              <button
                key={val}
                data-thick={val}
                onClick={() => onUpdateThickness(val)}
                className={`thick-btn px-2 py-1 border text-center ${
                  thickness === val
                    ? 'active border-white'
                    : 'border-white/30 hover:border-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 04 Cluster Hardware Alloy Finish */}
        <div className="space-y-1.5 pt-2 border-t border-white/15">
          <span className="text-[10px] tracking-widest text-white/70 uppercase block">
            04 Hardware Alloy Finish
          </span>
          <div className="grid grid-cols-3 gap-1.5 text-[10px]">
            {['steel', 'gold', 'noir'].map((f) => (
              <button
                key={f}
                data-finish={f}
                onClick={() => onUpdateFinish(f)}
                className={`finish-btn px-2 py-1 border text-center capitalize ${
                  finish === f
                    ? 'active border-white'
                    : 'border-white/30 hover:border-white'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* 05 Camera Views */}
        <div className="space-y-1.5 pt-2 border-t border-white/15">
          <span className="text-[10px] tracking-widest text-white/70 uppercase block">
            05 Camera View
          </span>
          <div className="grid grid-cols-3 gap-1.5 text-[10px] uppercase">
            <button
              className="cam-btn hud-btn py-1"
              data-cam="front"
              onClick={() => onCameraView('front')}
            >
              Front
            </button>
            <button
              className="cam-btn hud-btn py-1"
              data-cam="iso"
              onClick={() => onCameraView('iso')}
            >
              Angle
            </button>
            <button
              className="cam-btn hud-btn py-1"
              data-cam="hardware"
              onClick={() => onCameraView('hardware')}
            >
              Master Ring
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Actions / Export Section */}
      <div className="p-4 border-t border-white/20 space-y-2.5 bg-[#002bd4]">
        {/* Audio Toggle */}
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-white/70 uppercase text-[10px] tracking-wider">
            Metal Clink Audio
          </span>
          <button
            id="audioToggleBtn"
            onClick={onToggleAudio}
            className="hud-btn-subtle px-2.5 py-0.5 text-[10px] flex items-center gap-1.5"
          >
            <i
              id="audioIcon"
              className={
                soundEnabled
                  ? 'fa-solid fa-volume-high text-[9px]'
                  : 'fa-solid fa-volume-xmark text-[9px] text-white/50'
              }
            ></i>
            <span id="audioStateText">{soundEnabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* PRIMARY ANIMATED CLUSTER EXPORTS: GLB & GLTF */}
        <div className="space-y-1.5 pt-1 border-t border-white/20">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-white/80 font-mono tracking-wider block uppercase">
              Export Cluster Assembly
            </span>
            <span className="text-[8px] bg-white text-[#0034FF] px-1 font-bold">
              BAKED PHYSICS
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              id="exportGlbBtn"
              onClick={onExportGLB}
              className="hud-btn py-2 text-[10px] uppercase font-bold tracking-wider flex items-center justify-center gap-1.5"
              title="Binary glTF of the entire cluster with baked swing animation"
            >
              <i className="fa-solid fa-cube text-[10px]"></i>
              <span>.GLB (Anim)</span>
            </button>
            <button
              id="exportGltfBtn"
              onClick={onExportGLTF}
              className="hud-btn py-2 text-[10px] uppercase font-bold tracking-wider flex items-center justify-center gap-1.5"
              title="Standard glTF JSON of the entire cluster with baked swing animation"
            >
              <i className="fa-solid fa-file-code text-[10px]"></i>
              <span>.GLTF (Anim)</span>
            </button>
          </div>
        </div>

        {/* STATIC EXPORTS: OBJ & SNAPSHOT */}
        <div className="grid grid-cols-2 gap-1.5 text-[10px] uppercase">
          <button
            id="exportObjBtn"
            onClick={onExportOBJ}
            className="hud-btn-subtle py-1.5 text-center flex items-center justify-center gap-1.5"
            title="Static geometry of the cluster without animation"
          >
            <i className="fa-solid fa-shapes text-[9px]"></i>
            <span>.OBJ (Static)</span>
          </button>
          <button
            id="snapPhotoBtn"
            onClick={onCaptureSnapshot}
            className="hud-btn-subtle py-1.5 text-center flex items-center justify-center gap-1.5"
            title="High-res PNG capture"
          >
            <i className="fa-solid fa-camera text-[9px]"></i>
            <span>Snapshot</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
