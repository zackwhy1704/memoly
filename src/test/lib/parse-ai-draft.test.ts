import { describe, it, expect } from 'vitest';
import { parseAiDraft } from '@/lib/api';

/**
 * parseAiDraft must never hand back a `criteria` that isn't an array — the
 * marking detail panel does `draft.criteria?.map(...)`, so a string/object
 * criteria would throw "map is not a function" and collapse the Submissions tab.
 */
describe('parseAiDraft', () => {
  it('keeps a valid array criteria', () => {
    const d = parseAiDraft(
      '{"suggestedGrade":"B","criteria":[{"criterion":"Method","comment":"Show working"}]}',
    );
    expect(d?.suggestedGrade).toBe('B');
    expect(Array.isArray(d?.criteria)).toBe(true);
    expect(d?.criteria).toHaveLength(1);
  });

  it('drops a STRING criteria to undefined (no crash)', () => {
    const d = parseAiDraft('{"suggestedGrade":"B","criteria":"see comments"}');
    expect(d?.suggestedGrade).toBe('B');
    expect(d?.criteria).toBeUndefined();
  });

  it('drops an OBJECT criteria to undefined', () => {
    const d = parseAiDraft('{"criteria":{"a":1},"feedback":"ok"}');
    expect(d?.criteria).toBeUndefined();
    expect(d?.feedback).toBe('ok');
  });

  it('returns null for non-object / malformed / empty', () => {
    expect(parseAiDraft('"just a string"')).toBeNull();
    expect(parseAiDraft('not json')).toBeNull();
    expect(parseAiDraft('')).toBeNull();
    expect(parseAiDraft(null)).toBeNull();
  });
});
