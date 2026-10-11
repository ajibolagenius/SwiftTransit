import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function Screen() {
  return (
    <PlaceholderScreen
      title="actionSheet"
      feature={6}
      design="main/Home - Action Sheet"
      links={[{ href: '/new-delivery/1', label: 'newDelivery' }]}
    />
  );
}
