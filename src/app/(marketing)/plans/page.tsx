import { redirect } from 'next/navigation';

// /plans is now the consumer segment of the unified, audience-segmented pricing
// page. Kept as a permanent redirect so existing inbound links (nav, app,
// emails) still resolve to the right place — single source of truth is /pricing.
export default function PlansRedirect() {
  redirect('/pricing?for=consumer');
}
