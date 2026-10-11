import { RoleTabs } from '@/components/role-tabs';

export default function CustomerTabs() {
  return (
    <RoleTabs
      tabs={[
        { name: 'index', title: 'home' },
        { name: 'orders', title: 'orders' },
        { name: 'wallet', title: 'wallet' },
        { name: 'profile', title: 'profile' },
      ]}
    />
  );
}
