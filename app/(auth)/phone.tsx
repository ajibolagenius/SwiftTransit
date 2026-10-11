import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function Screen() {
  return (
    <PlaceholderScreen
      title="phone"
      feature={5}
      design="auth/Enter Phone Number"
      links={[{ href: '/verify', label: 'verify' }]}
    />
  );
}
