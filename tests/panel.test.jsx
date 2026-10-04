// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import EmojiSection from '../src/components/panel/EmojiSection.jsx';
import ClusterSection from '../src/components/panel/ClusterSection.jsx';

afterEach(cleanup);

function Harness({ onApply }) {
  const [val, setVal] = useState('👾');
  return (
    <EmojiSection activeCharmIndex={0} activeBranch={{ emoji: '👾' }} customEmojiInput={val} setCustomEmojiInput={setVal}
      searchQuery="" setSearchQuery={() => {}} category="all" setCategory={() => {}} filteredEmojis={[]}
      onApplyNewEmoji={(c) => { onApply(c); setVal(c); }} onSpinCluster={() => {}} onNudgeCluster={() => {}} onResetPose={() => {}} />
  );
}

describe('emoji input', () => {
  it('applies the PASTED emoji, not the previous one', () => {
    const apply = vi.fn();
    render(<Harness onApply={apply} />);
    fireEvent.paste(screen.getByLabelText(/type or paste/i), { clipboardData: { getData: () => '🐉' } });
    expect(apply).toHaveBeenCalledWith('🐉');
    expect(screen.getByLabelText(/type or paste/i).value).toBe('🐉');
  });
  it('applies typed text on Enter', () => {
    const apply = vi.fn();
    render(<Harness onApply={apply} />);
    fireEvent.keyDown(screen.getByLabelText(/type or paste/i), { key: 'Enter' });
    expect(apply).toHaveBeenCalledWith('👾');
  });
});

describe('cluster list accessibility', () => {
  const branches = [{ emoji: '👾' }, { emoji: '🥑' }];
  it('uses real buttons with a pressed state and named delete buttons', () => {
    const onSelect = vi.fn(), onRemove = vi.fn();
    render(<ClusterSection branches={branches} activeCharmIndex={1} onSelectCharm={onSelect} onRemoveCharm={onRemove} onAddCharm={() => {}} />);
    expect(screen.getByRole('button', { name: /select charm 2/i }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: /select charm 1/i }).getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: /remove charm 1/i }));
    expect(onRemove).toHaveBeenCalledWith(0);
  });
  it('disables Add at five charms', () => {
    render(<ClusterSection branches={Array(5).fill({ emoji: '⭐' })} activeCharmIndex={0} onSelectCharm={() => {}} onRemoveCharm={() => {}} onAddCharm={() => {}} />);
    expect(screen.getByRole('button', { name: /ring is full/i }).disabled).toBe(true);
  });
});
