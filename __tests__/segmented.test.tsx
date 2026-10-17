import { fireEvent, render, screen } from '@testing-library/react-native';

import { Segmented } from '@/components/ui/segmented';

const options: { value: string; label: string }[] = [
  { value: 'bike', label: 'Bike' },
  { value: 'van', label: 'Van' },
  { value: 'truck', label: 'Truck' },
];

describe('Segmented', () => {
  // covers: AC-1
  it('renders every option label', async () => {
    await render(<Segmented options={options} value="van" onChange={jest.fn()} />);

    for (const label of ['Bike', 'Van', 'Truck']) expect(screen.getByText(label)).toBeTruthy();
  });

  // covers: AC-6
  it('marks only the current option as selected', async () => {
    await render(<Segmented options={options} value="van" onChange={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Van', selected: true })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Bike' }).props.accessibilityState).toMatchObject({
      selected: false,
    });
  });

  it('reports the tapped option', async () => {
    const onChange = jest.fn();
    await render(<Segmented options={options} value="van" onChange={onChange} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Truck' }));
    expect(onChange).toHaveBeenCalledWith('truck');
  });

  it('moves the selection when the value changes', async () => {
    const utils = await render(<Segmented options={options} value="van" onChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Van', selected: true })).toBeTruthy();

    await utils.rerender(<Segmented options={options} value="bike" onChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Bike', selected: true })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Van' }).props.accessibilityState).toMatchObject({
      selected: false,
    });
  });

  it('caps label growth so segments stay on one line', async () => {
    await render(<Segmented options={options} value="van" onChange={jest.fn()} />);
    expect(screen.getByText('Truck').props.maxFontSizeMultiplier).toBe(1.5);
  });
});
