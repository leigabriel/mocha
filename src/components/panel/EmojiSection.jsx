import { CATEGORIES, SURPRISE_POOL } from '../../constants/index.js';
import { RotateIcon, ResetIcon, SwingIcon, WandIcon } from '../Icons.jsx';
import { Field, Seg, Section } from './ui.jsx';

export default function EmojiSection({
  activeCharmIndex,
  activeBranch,
  customEmojiInput,
  setCustomEmojiInput,
  searchQuery,
  setSearchQuery,
  category,
  setCategory,
  filteredEmojis,
  onApplyNewEmoji,
  onSpinCluster,
  onNudgeCluster,
  onResetPose,
}) {
  const apply = () => onApplyNewEmoji(customEmojiInput);

  return (
    <Section title="01 Selected Charm" hint={`#${activeCharmIndex + 1} ${activeBranch?.emoji ?? ''}`}>
      <div className="space-y-2 border border-white/40 bg-white/10 p-2.5">
        <Field id="customEmojiInput" label="Type or paste any emoji">
          <div className="flex items-center gap-1.5">
            <input
              id="customEmojiInput"
              type="text"
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="🥷  ❤️‍🔥  🪐  🏴‍☠️"
              value={customEmojiInput}
              onChange={(e) => setCustomEmojiInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') apply();
              }}
              onPaste={(e) => {
                // Use the pasted text itself; React state is still the previous value here.
                e.preventDefault();
                onApplyNewEmoji(e.clipboardData.getData('text'));
              }}
              className="h-9 min-w-0 flex-1 border border-white bg-white px-2.5 font-mono text-sm font-bold text-brand placeholder-brand/80"
            />
            <button
              type="button"
              onClick={apply}
              className="hud-btn flex h-9 items-center gap-1.5 px-3 text-[11px] font-bold uppercase tracking-wider"
            >
              <WandIcon />
              <span>Bake</span>
            </button>
          </div>
        </Field>
        <div className="text-soft flex items-center justify-between text-[11px]">
          <span>Multi-byte & ZWJ emoji supported</span>
          <button
            type="button"
            onClick={() => onApplyNewEmoji(SURPRISE_POOL[Math.floor(Math.random() * SURPRISE_POOL.length)])}
            className="underline uppercase hover:text-white"
          >
            Surprise me
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button type="button" onClick={onSpinCluster} className="hud-btn-subtle flex min-h-[36px] items-center gap-1.5 px-2.5 text-[11px] uppercase">
          <RotateIcon />
          <span>Spin 360°</span>
        </button>
        <button type="button" onClick={onNudgeCluster} className="hud-btn-subtle flex min-h-[36px] items-center gap-1.5 px-2.5 text-[11px] uppercase">
          <SwingIcon />
          <span>Swing</span>
        </button>
        <button type="button" onClick={onResetPose} className="hud-btn-subtle ml-auto flex min-h-[36px] items-center gap-1.5 px-2.5 text-[11px] uppercase">
          <ResetIcon />
          <span>Rest</span>
        </button>
      </div>

      <Field id="emojiSearchInput" label="Search presets">
        <input
          id="emojiSearchInput"
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="cat, pizza, skull, sword…"
          className="h-9 w-full border border-white/50 bg-white/10 px-2 text-xs text-white placeholder-white/80 focus:bg-white focus:text-brand focus:placeholder-brand/80"
        />
      </Field>

      <div className="flex flex-wrap gap-1" role="group" aria-label="Preset categories">
        {CATEGORIES.map((cat) => (
          <Seg key={cat} pressed={category === cat} onClick={() => setCategory(cat)} className="min-h-[32px] px-2.5 text-[11px] font-semibold uppercase tracking-wider">
            {cat}
          </Seg>
        ))}
      </div>

      <div className="grid max-h-44 grid-cols-8 gap-1 overflow-y-auto border border-white/30 bg-black/15 p-1" role="group" aria-label="Preset emoji">
        {filteredEmojis.length === 0 ? (
          <p className="text-soft col-span-8 py-4 text-center font-mono text-[11px] uppercase">No presets found</p>
        ) : (
          filteredEmojis.map((item) => (
            <button
              key={item.char}
              type="button"
              className="emoji-item-btn aspect-square border border-white/30 text-center text-xl leading-none hover:border-white"
              title={`${item.char} (${item.tags})`}
              aria-label={item.tags.split(' ').slice(0, 3).join(' ')}
              onClick={() => onApplyNewEmoji(item.char)}
            >
              {item.char}
            </button>
          ))
        )}
      </div>
    </Section>
  );
}
