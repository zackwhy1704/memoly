import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateAssignmentModal } from '@/app/dashboard/classes/[classId]/modals/CreateAssignmentModal';
import { ApiError, type ClassModule } from '@/lib/api';

// Silence analytics calls.
vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }));

// Stub the api: classModules feeds the form; createAssignment is driven per-test.
const createAssignment = vi.fn();
const classModules = vi.fn();
vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      classModules: (...args: unknown[]) => classModules(...args),
      createAssignment: (...args: unknown[]) => createAssignment(...args),
    },
  };
});

const MODULE: ClassModule = {
  moduleId: 'mod-1',
  title: 'Photosynthesis',
  wikiSlug: 'photosynthesis',
  stage: 'LEARN',
  studentCount: 5,
  completedCount: 2,
  avgMastery: 40,
};

function renderModal(props?: Partial<Parameters<typeof CreateAssignmentModal>[0]>) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const defaultProps = {
    orgId: 'org-1',
    classId: 'class-1',
    onClose: vi.fn(),
    onCreated: vi.fn(),
    ...props,
  };
  return render(
    <QueryClientProvider client={client}>
      <CreateAssignmentModal {...defaultProps} />
    </QueryClientProvider>
  );
}

// Fill in the minimum required fields (title + one module) and submit.
async function fillAndSubmit() {
  fireEvent.change(screen.getByPlaceholderText('e.g. Chapter 5 Review'), {
    target: { value: 'My Assignment' },
  });
  // Wait for the module checkbox to appear (classModules query resolves).
  const moduleLabel = await screen.findByText('Photosynthesis');
  fireEvent.click(moduleLabel);
  fireEvent.click(screen.getByRole('button', { name: /Create/ }));
}

describe('CreateAssignmentModal — backend error surfacing', () => {
  it('renders the exact backend BusinessException message, not the generic fallback', async () => {
    classModules.mockResolvedValue({ data: [MODULE] });
    // apiFetch throws an ApiError whose .message is the backend `error` field.
    const backendMessage = 'No modules below mastery threshold 60.0%';
    createAssignment.mockRejectedValue(new ApiError(400, 'BUSINESS_RULE', backendMessage, false));

    renderModal();
    await fillAndSubmit();

    expect(await screen.findByText(backendMessage)).toBeInTheDocument();
    expect(
      screen.queryByText('Failed to create assignment. Please try again.')
    ).not.toBeInTheDocument();
  });

  it('falls back to the generic copy for a non-ApiError / message-less failure', async () => {
    classModules.mockResolvedValue({ data: [MODULE] });
    createAssignment.mockRejectedValue(new Error(''));

    renderModal();
    await fillAndSubmit();

    expect(
      await screen.findByText('Failed to create assignment. Please try again.')
    ).toBeInTheDocument();
  });

  it('falls back to the generic copy when the ApiError carries an empty message', async () => {
    classModules.mockResolvedValue({ data: [MODULE] });
    createAssignment.mockRejectedValue(new ApiError(500, null, '', true));

    renderModal();
    await fillAndSubmit();

    await waitFor(() =>
      expect(
        screen.getByText('Failed to create assignment. Please try again.')
      ).toBeInTheDocument()
    );
  });
});
