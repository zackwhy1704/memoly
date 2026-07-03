/**
 * Canonical B2C plan definitions — the SINGLE source of truth for prices.
 *
 * Currency is USD, matching the Stripe product (prod_UdpRpXbhmTnDHa) that
 * actually charges the customer and the mobile app's displayed prices. Do NOT
 * hardcode prices in a page again: the billing page previously showed SGD while
 * the marketing page showed USD (different amounts AND currencies), which is a
 * trust/confusion issue for teachers. Both pages now import from here.
 */
export interface ConsumerPlan {
  /** Local tier key used for the "current plan" highlight on billing. */
  id: string;
  /** EXACT key the backend POST /subscription/checkout accepts. */
  checkoutId: string;
  name: string;
  priceMonthly: string; // e.g. "US$9.99"
  perMonth: string; // e.g. "/month"
  priceAnnual: string; // e.g. "US$79"
  annualSave: string; // e.g. "save ~17%"
  featured: boolean;
  features: string[];
}

export const CONSUMER_PLANS: ConsumerPlan[] = [
  {
    id: 'pro',
    checkoutId: 'pro_monthly',
    name: 'Pro',
    priceMonthly: 'US$9.99',
    perMonth: '/month',
    priceAnnual: 'US$79',
    annualSave: 'save ~17%',
    featured: false,
    features: ['Unlimited chat with Mochi', 'Full LEARN → TEST → PROVE loop', 'Progress analytics'],
  },
  {
    id: 'max',
    checkoutId: 'max_monthly',
    name: 'Max',
    priceMonthly: 'US$19.99',
    perMonth: '/month',
    priceAnnual: 'US$159',
    annualSave: 'save ~17%',
    featured: true,
    features: ['Everything in Pro', 'Group study', 'Priority AI speed'],
  },
  {
    id: 'family',
    checkoutId: 'family_monthly_new',
    name: 'Family',
    priceMonthly: 'US$34.99',
    perMonth: '/month',
    priceAnnual: 'US$279',
    annualSave: 'save ~17%',
    featured: false,
    features: ['Up to 4 learners', 'Parent dashboard', 'Everything in Max'],
  },
];
