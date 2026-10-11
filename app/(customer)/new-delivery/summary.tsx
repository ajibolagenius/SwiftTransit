import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function Screen() {
  return (
    <PlaceholderScreen
      title="orderSummary"
      feature={6}
      design="main/New Delivery - Order Summary (Card)"
      links={[{ href: '/new-delivery/booked', label: 'booked' }]}
    />
  );
}
