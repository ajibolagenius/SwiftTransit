import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function Screen() {
  return (
    <PlaceholderScreen
      title="welcome"
      feature={5}
      design="auth/Welcome - Sign In Options"
      links={[
        { href: '/phone', label: 'phone' },
        { href: '/email', label: 'email' },
      ]}
    />
  );
}
