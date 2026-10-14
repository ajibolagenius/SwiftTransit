import { Banknote, House, Package, User } from 'lucide-react-native';

import { RoleTabs } from '@/components/role-tabs';

export default function CourierTabs() {
  return (
    <RoleTabs
      tabs={[
        { name: 'index', title: 'home', icon: House },
        { name: 'deliveries', title: 'deliveries', icon: Package },
        { name: 'earnings', title: 'earnings', icon: Banknote },
        { name: 'profile', title: 'profile', icon: User },
      ]}
    />
  );
}
