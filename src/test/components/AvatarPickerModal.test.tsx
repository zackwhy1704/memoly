import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import AvatarPickerModal from '@/components/AvatarPickerModal';
import { DEFAULT_MOCHI_CONFIG, type MochiConfig } from '@/lib/api';

describe('AvatarPickerModal', () => {
  it('renders presets by default and switches to the customise tab', () => {
    render(
      <AvatarPickerModal
        initial={DEFAULT_MOCHI_CONFIG}
        onSave={vi.fn()}
        onDismiss={vi.fn()}
      />
    );
    // Presets tab content present.
    expect(screen.getByText('Scholar')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Customise' }));
    // Customise tab shows the colour/section labels.
    expect(screen.getByText('Body colour')).toBeInTheDocument();
    expect(screen.getByText('Aura')).toBeInTheDocument();
  });

  it('clicking a preset then Save calls onSave with that preset config', () => {
    const onSave = vi.fn();
    render(
      <AvatarPickerModal initial={DEFAULT_MOCHI_CONFIG} onSave={onSave} onDismiss={vi.fn()} />
    );

    // "Scholar" preset = { body:6, cheek:0, eyes:'happy', accessory:'cap', aura:'none' }
    fireEvent.click(screen.getByText('Scholar'));
    fireEvent.click(screen.getByRole('button', { name: 'Save avatar' }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const saved = onSave.mock.calls[0][0] as MochiConfig;
    expect(saved.accessory).toBe('cap');
    expect(saved.body).toBe(6);
  });

  it('Save reflects a customise change (eyes -> star)', () => {
    const onSave = vi.fn();
    render(
      <AvatarPickerModal initial={DEFAULT_MOCHI_CONFIG} onSave={onSave} onDismiss={vi.fn()} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Customise' }));
    fireEvent.click(screen.getByRole('button', { name: 'Star' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save avatar' }));

    const saved = onSave.mock.calls[0][0] as MochiConfig;
    expect(saved.eyes).toBe('star');
  });

  it('Random produces a config and Save passes it through', () => {
    const onSave = vi.fn();
    render(
      <AvatarPickerModal initial={DEFAULT_MOCHI_CONFIG} onSave={onSave} onDismiss={vi.fn()} />
    );
    fireEvent.click(screen.getByRole('button', { name: /Random/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save avatar' }));
    expect(onSave).toHaveBeenCalledTimes(1);
    const saved = onSave.mock.calls[0][0] as MochiConfig;
    expect(saved).toHaveProperty('body');
    expect(saved).toHaveProperty('eyes');
  });

  it('dismiss button calls onDismiss', () => {
    const onDismiss = vi.fn();
    render(
      <AvatarPickerModal initial={DEFAULT_MOCHI_CONFIG} onSave={vi.fn()} onDismiss={onDismiss} />
    );
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
