import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  NarrationAction,
  NARRATION_ENABLED,
} from '@/app/dashboard/classes/[classId]/components/NarrationAction';

/**
 * The "Generate narration" button POSTs to a backend endpoint that does not exist yet
 * (no narration controller in pally-backend → 404). It is gated off until the endpoint
 * ships. This pins that it's hidden by default and never renders through the guard.
 */
describe('NarrationAction gating', () => {
  it('is disabled by default (backend narration endpoint unimplemented)', () => {
    expect(NARRATION_ENABLED).toBe(false);
  });

  it('the guarded render site shows no Generate-narration button when disabled', () => {
    // Mirrors ModulesTab's guard exactly: {NARRATION_ENABLED && <NarrationAction/>}
    render(
      <div>
        {NARRATION_ENABLED && (
          <NarrationAction orgId="o" classId="c" moduleId="m" />
        )}
      </div>,
    );
    expect(screen.queryByText(/Generate narration/i)).toBeNull();
  });
});
