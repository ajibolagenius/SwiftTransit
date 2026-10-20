import { render, screen } from '@testing-library/react-native';

import { Chip } from '@/components/ui/chip';
import { icons } from '@/components/ui/rune-icon';

describe('Chip', () => {
  // covers: AC-1
  it('shows its label', async () => {
    await render(<Chip>Fragile</Chip>);
    expect(screen.getByText('Fragile')).toBeTruthy();
  });

  // covers: AC-1
  it.each([
    ['brand', 'Express'],
    ['amber', 'Fragile'],
    ['neutral', 'Documents'],
  ] as const)('renders the %s tone', async (tone, label) => {
    await render(<Chip tone={tone}>{label}</Chip>);
    expect(screen.getByText(label)).toBeTruthy();
  });

  // covers: AC-5
  it('keeps the leading icon decorative', async () => {
    await render(<Chip icon={icons.AlertTriangle}>Fragile</Chip>);
    expect(screen.queryAllByRole('image')).toHaveLength(0);
    expect(screen.getAllByText('Fragile')).toHaveLength(1);
  });

  it('caps label growth so the chip stays on one line at large font sizes', async () => {
    await render(<Chip>Same-day delivery</Chip>);
    const label = screen.getByText('Same-day delivery');
    expect(label.props.numberOfLines).toBe(1);
    expect(label.props.maxFontSizeMultiplier).toBe(1.5);
  });
});
