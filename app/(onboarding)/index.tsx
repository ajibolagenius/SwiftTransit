import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function Screen() {
  return (
    <PlaceholderScreen
      title="onboarding"
      feature={5}
      design="onboarding/iPhone 14 & 15 Pro - 21..23"
      links={[{ href: '/welcome', label: 'welcome' }]}
    />
  );
}
