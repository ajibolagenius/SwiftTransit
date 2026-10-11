import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function Screen() {
  return (
    <PlaceholderScreen
      title="profile"
      feature={13}
      design="main/Profile"
      links={[
        { href: '/profile/edit', label: 'editProfile' },
        { href: '/profile/addresses', label: 'addresses' },
      ]}
    />
  );
}
