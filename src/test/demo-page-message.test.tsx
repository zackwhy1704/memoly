import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * The Request-a-Demo form is now the ONLY web entry point for a centre — self-serve
 * signup is closed — so what it captures matters more than it used to.
 *
 * Pins the optional free-text field. It maps to demo_leads.notes, a column that
 * already existed and was admin-only, so no migration was needed. Being optional is
 * part of the contract: a blank box must send NO message key at all rather than an
 * empty string, so a lead with nothing to add doesn't write a meaningless note.
 *
 * Phone is deliberately still REQUIRED: demo_leads.phone is NOT NULL and
 * DemoRequestBody marks it @NotBlank, so dropping it from the form would fail
 * validation and then the column constraint.
 */
const demoRequest = vi.fn().mockResolvedValue({ data: { ok: true } });
vi.mock('@/lib/api', () => ({
  api: { demoRequest: (...a: unknown[]) => demoRequest(...a) },
  ApiError: class extends Error { userMessage = 'err'; },
}));

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Organisation \/ centre name/i), 'Bright Stars');
  await user.type(screen.getByLabelText(/Your name/i), 'Jane Smith');
  await user.type(screen.getByLabelText(/Work email/i), 'jane@brightstar.edu');
  await user.type(screen.getByLabelText(/Contact number/i), '+65 9123 4567');
}

describe('Request a demo form', () => {
  beforeEach(() => demoRequest.mockClear());

  it('sends the optional message when one is written', async () => {
    const { default: DemoPage } = await import('@/app/(marketing)/demo/page');
    const user = userEvent.setup();
    render(<DemoPage />);

    await fillRequiredFields(user);
    await user.type(screen.getByLabelText(/Anything you'd like us to know/i), 'P5 and P6 maths');
    await user.click(screen.getByRole('button', { name: /Request a demo/i }));

    await waitFor(() => expect(demoRequest).toHaveBeenCalled());
    expect(demoRequest.mock.calls[0][0]).toMatchObject({
      orgName: 'Bright Stars',
      contactName: 'Jane Smith',
      email: 'jane@brightstar.edu',
      message: 'P5 and P6 maths',
    });
  });

  it('omits the message key entirely when the box is left blank', async () => {
    const { default: DemoPage } = await import('@/app/(marketing)/demo/page');
    const user = userEvent.setup();
    render(<DemoPage />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: /Request a demo/i }));

    await waitFor(() => expect(demoRequest).toHaveBeenCalled());
    expect(demoRequest.mock.calls[0][0]).not.toHaveProperty('message');
  });

  it('submits a lead and never creates an account', async () => {
    // The whole point of the page: it captures interest, it does not provision.
    const { default: DemoPage } = await import('@/app/(marketing)/demo/page');
    const user = userEvent.setup();
    render(<DemoPage />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: /Request a demo/i }));

    await waitFor(() => expect(demoRequest).toHaveBeenCalledTimes(1));
  });
});
