import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CreateClassModal from '@/app/dashboard/classes/modals/CreateClassModal';

// MochiUploader and child components that hit the network / use router are
// only rendered in step-2 (after class creation). Step-2 requires the
// mutation to succeed, which we don't trigger here, so these mocks are
// defensive guards for the static import tree only.
vi.mock('@/components/MochiUploader', () => ({
  default: () => <div data-testid="mochi-uploader" />,
}));
vi.mock('@/app/dashboard/classes/components/CreatedClassAvatar', () => ({
  default: () => <div data-testid="created-class-avatar" />,
}));
// Silence analytics calls.
vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }));
// api.createClass is called by the mutation; stub it so mutations resolve in
// tests that drive form submission.
vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      createClass: vi.fn(),
    },
  };
});

function renderModal(props?: Partial<Parameters<typeof CreateClassModal>[0]>) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const defaultProps = {
    orgId: 'org-1',
    onClose: vi.fn(),
    onCreated: vi.fn(),
    ...props,
  };
  return render(
    <QueryClientProvider client={client}>
      <CreateClassModal {...defaultProps} />
    </QueryClientProvider>
  );
}

describe('CreateClassModal', () => {
  it('renders the modal with a class name input field', () => {
    renderModal();
    expect(screen.getByText('New class')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('P4 Math')).toBeInTheDocument();
  });

  it('submit button is disabled when the class name input is empty', () => {
    renderModal();
    const submitBtn = screen.getByRole('button', { name: /Create & add content/ });
    expect(submitBtn).toBeDisabled();
  });

  it('submit button is enabled once the class name has text', () => {
    renderModal();
    const input = screen.getByPlaceholderText('P4 Math');
    fireEvent.change(input, { target: { value: 'P4 Science' } });
    expect(screen.getByRole('button', { name: /Create & add content/ })).not.toBeDisabled();
  });

  it('submit button returns to disabled after clearing the input', () => {
    renderModal();
    const input = screen.getByPlaceholderText('P4 Math');
    fireEvent.change(input, { target: { value: 'P4 Science' } });
    fireEvent.change(input, { target: { value: '' } });
    expect(screen.getByRole('button', { name: /Create & add content/ })).toBeDisabled();
  });

  it('calls onClose when the Cancel button is clicked', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows subject selector and level input', () => {
    renderModal();
    expect(screen.getByPlaceholderText('P4')).toBeInTheDocument();
    // Subject select — should exist in the form.
    const selects = screen.getAllByRole('combobox');
    // At least the subject combobox is enabled (others are disabled accessories).
    const enabledSelects = selects.filter((s) => !(s as HTMLSelectElement).disabled);
    expect(enabledSelects.length).toBeGreaterThanOrEqual(1);
  });

  it('shows the Step 1 of 2 label', () => {
    renderModal();
    expect(
      screen.getByText(/Step 1 of 2/)
    ).toBeInTheDocument();
  });
});
