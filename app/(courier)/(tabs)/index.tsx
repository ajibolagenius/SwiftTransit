import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function Screen() {
  return (
    <PlaceholderScreen
      title="home"
      feature={8}
      design="courier/Home - Offline, Home - Online"
      links={[{ href: '/delivery/demo', label: 'delivery' }]}
    />
  );
}
