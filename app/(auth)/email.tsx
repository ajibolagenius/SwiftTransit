import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function Screen() {
  return (
    <PlaceholderScreen
      title="email"
      feature={5}
      design="auth/Enter Email Address"
      links={[{ href: '/verify', label: 'verify' }]}
    />
  );
}
