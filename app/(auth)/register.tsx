import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function Screen() {
  return (
    <PlaceholderScreen
      title="register"
      feature={5}
      design="auth/Registration - Account Details"
      links={[{ href: '/courier-apply', label: 'courierApply' }]}
    />
  );
}
