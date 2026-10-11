import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function Screen() {
  return (
    <PlaceholderScreen
      title="courierApply"
      feature={8}
      design="auth/Courier Application"
      links={[{ href: '/permission/location', label: 'locationPermission' }]}
    />
  );
}
