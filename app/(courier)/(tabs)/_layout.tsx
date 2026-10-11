import { RoleTabs } from '@/components/role-tabs';

export default function CourierTabs() {
  return (
    <RoleTabs
      tabs={[
        { name: 'index', title: 'home' },
        { name: 'deliveries', title: 'deliveries' },
        { name: 'earnings', title: 'earnings' },
        { name: 'profile', title: 'profile' },
      ]}
    />
  );
}
