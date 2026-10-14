import { ClipboardList, House, User, Wallet } from 'lucide-react-native';

import { RoleTabs } from '@/components/role-tabs';

export default function CustomerTabs() {
  return (
    <RoleTabs
      tabs={[
        { name: 'index', title: 'home', icon: House },
        { name: 'orders', title: 'orders', icon: ClipboardList },
        { name: 'wallet', title: 'wallet', icon: Wallet },
        { name: 'profile', title: 'profile', icon: User },
      ]}
      fab={{ label: 'actionSheet', route: '/action-sheet' }}
    />
  );
}
