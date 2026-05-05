# auth-theme — Suggestions

## Quick Wins

[S001] **Sidebar story smoke test** — `sidebar.stories.tsx` has no play function asserting `data-component="sidebar"`. Add a one-liner to lock the contract against renames.

[S002] **`priority` prop console warning** — The `next/image` mock in tests passes `priority` as a boolean to a real DOM `<img>`, producing a React warning. Mock could filter it: `{ src, alt, priority: _p, ...rest }`.

## Future Enhancements

[S003] **Auth layout responsive padding** — `max-w-md px-4` works fine on mobile but at 375px the card feels tight. A `sm:px-0` guard would remove the double-padding on small screens once the card has its own padding.

[S004] **Storybook stories for reset-password and forgot-password** — Only login and signup have stories. The other two pages have no visual regression coverage.

## Technical Debt

[S005] **`signup.stories.tsx` likely has the same `getByText` sync issue** — If signup ever gains error display via searchParams inside Suspense, it will need the same `findByText` fix applied to login.

## Questions for the Human

[S006] **Dashboard `bg-graphite-50` background** — spec says `bg-graphite-50` on the outer flex container. Is this intentional? The Sidebar is `bg-navy-900` and the main area would inherit the graphite tint. If main area should be `bg-white`, that's a one-line change.
