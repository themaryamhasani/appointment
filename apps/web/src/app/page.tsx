import { redirect } from 'next/navigation';

/** Fallback if middleware does not run; prefer locale-prefixed routes. */
export default function RootPage() {
  redirect('/fa');
}
