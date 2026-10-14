import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function Screen() {
  return (
    <PlaceholderScreen
      title="onboarding"
      feature={5}
      design="onboarding/iPhone 14 & 15 Pro - 21..23"
      links={[
        { href: '/welcome', label: 'welcome' },
        // Dev-only entry to the design system gallery (scope feature 4).
        ...(__DEV__ ? [{ href: '/dev/gallery' as const, label: 'gallery' as const }] : []),
      ]}
    />
  );
}
