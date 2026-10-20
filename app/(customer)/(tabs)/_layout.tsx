import { RoleTabs } from '@/components/role-tabs';
import { icons } from '@/components/ui/rune-icon';

export default function CustomerTabs() {
  return (
    <RoleTabs
      tabs={[
        { name: 'index', title: 'home', icon: icons.House },
        { name: 'orders', title: 'orders', icon: icons.ClipboardList },
        { name: 'wallet', title: 'wallet', icon: icons.Wallet },
        { name: 'profile', title: 'profile', icon: icons.User },
      ]}
      fab={{ label: 'actionSheet', route: '/action-sheet' }}
    />
  );
}
