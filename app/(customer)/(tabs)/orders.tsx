import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function Screen() {
  return (
    <PlaceholderScreen
      title="orders"
      feature={7}
      design="main/Orders"
      links={[{ href: '/orders/demo', label: 'orderDetail' }]}
    />
  );
}
