import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function Screen() {
  return (
    <PlaceholderScreen
      title="home"
      feature={6}
      design="main/Home"
      links={[
        { href: '/action-sheet', label: 'actionSheet' },
        { href: '/permission/location', label: 'locationPermission' },
      ]}
    />
  );
}
