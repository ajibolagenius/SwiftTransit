import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function Screen() {
  return (
    <PlaceholderScreen
      title="newDelivery"
      feature={6}
      design="main/New Delivery - Step 1..6"
      links={[{ href: '/new-delivery/summary', label: 'orderSummary' }]}
    />
  );
}
