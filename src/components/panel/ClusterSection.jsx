import { MAX_CHARMS } from '../../constants/index.js';
import { Seg, Section } from './ui.jsx';

export default function ClusterSection({ branches, activeCharmIndex, onSelectCharm, onRemoveCharm, onAddCharm }) {
  const atMax = branches.length >= MAX_CHARMS;

  return (
    <Section title="00 Hanging Cluster" hint={`${branches.length}/${MAX_CHARMS} charms`}>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Charms on the ring">
        {branches.map((b, idx) => (
          <div key={idx} className="flex">
            <Seg
              pressed={idx === activeCharmIndex}
              onClick={() => onSelectCharm(idx)}
              className="min-h-[36px] px-2.5 text-xs"
              aria-label={`Select charm ${idx + 1}, ${b.emoji}`}
            >
              #{idx + 1} {b.emoji}
            </Seg>
            {branches.length > 1 && (
              <button
                type="button"
                onClick={() => onRemoveCharm(idx)}
                aria-label={`Remove charm ${idx + 1}, ${b.emoji}`}
                className="hud-btn-subtle min-h-[36px] w-8 text-sm font-bold hover:bg-white hover:text-brand"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onAddCharm}
        disabled={atMax}
        className="hud-btn-subtle min-h-[36px] w-full text-[11px] font-bold uppercase tracking-wider hover:bg-white hover:text-brand"
      >
        {atMax ? `Ring is full (${MAX_CHARMS} charms)` : '+ Add charm to ring'}
      </button>

      <p className="text-soft font-mono text-[11px]">One shared ring · multi-link chain · solid pixel charms</p>
    </Section>
  );
}
