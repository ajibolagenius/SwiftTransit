import { RoleTabs } from '@/components/role-tabs';
import { icons } from '@/components/ui/rune-icon';

export default function CourierTabs() {
  return (
    <RoleTabs
      tabs={[
        { name: 'index', title: 'home', icon: icons.House },
        { name: 'deliveries', title: 'deliveries', icon: icons.Package },
        { name: 'earnings', title: 'earnings', icon: icons.Banknote },
        { name: 'profile', title: 'profile', icon: icons.User },
      ]}
    />
  );
}
