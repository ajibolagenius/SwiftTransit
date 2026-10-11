import { AppMap } from '@/components/app-map';
import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function Screen() {
  return (
    <PlaceholderScreen
      title="delivery"
      feature={9}
      design="courier/Home - Active Delivery (Navigation)"
      links={[{ href: '/chat/demo', label: 'chat' }]}
    >
      <AppMap />
    </PlaceholderScreen>
  );
}
