import { permanentRedirect } from 'next/navigation';

// /signup was the old mailto-based request form. All demo/signup requests
// now go through /demo which POSTs to the backend lead-capture endpoint.
export default function SignupPage() {
  permanentRedirect('/demo');
}
