import { fireEvent, render, screen } from '@testing-library/react-native';
import { Bike, Package } from 'lucide-react-native';

import { SelectCard } from '@/components/ui/select-card';

describe('SelectCard', () => {
  // covers: AC-1
  it('shows title and subtitle', async () => {
    await render(<SelectCard icon={Package} title="Documents" subtitle="Up to 5 kg" />);

    expect(screen.getByText('Documents')).toBeTruthy();
    expect(screen.getByText('Up to 5 kg')).toBeTruthy();
  });

  // covers: AC-6
  it('names the control with title and subtitle and marks it unselected by default', async () => {
    await render(<SelectCard icon={Package} title="Documents" subtitle="Up to 5 kg" />);

    const card = screen.getByRole('button', { name: 'Documents, Up to 5 kg' });
    expect(card.props.accessibilityState).toMatchObject({ selected: false });
  });

  // covers: AC-6
  it('announces the selected state', async () => {
    await render(<SelectCard icon={Bike} title="Parcel" selected />);
    expect(screen.getByRole('button', { name: 'Parcel', selected: true })).toBeTruthy();
  });

  it('reports the tap', async () => {
    const onPress = jest.fn();
    await render(<SelectCard icon={Package} title="Documents" onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Documents' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  // covers: AC-5
  it('keeps the tile icon and radio decorative', async () => {
    await render(<SelectCard icon={Package} title="Documents" selected />);
    expect(screen.queryAllByRole('image')).toHaveLength(0);
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
