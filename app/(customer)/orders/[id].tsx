import { AppMap } from '@/components/app-map';
import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function Screen() {
  return (
    <PlaceholderScreen title="orderDetail" feature={7} links={[{ href: '/chat/demo', label: 'chat' }]}>
      <AppMap />
    </PlaceholderScreen>
  );
}
