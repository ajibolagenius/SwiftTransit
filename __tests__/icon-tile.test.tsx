import { render, screen } from '@testing-library/react-native';
import { Package } from 'lucide-react-native';

import { sizedNodes } from '@/testing/sized-nodes';
import { IconTile } from '@/components/ui/icon-tile';

describe('IconTile', () => {
  // covers: AC-5
  it('stays out of the accessibility tree', async () => {
    const { container } = await render(<IconTile icon={Package} />);
    expect(screen.queryAllByRole('image')).toHaveLength(0);
    expect(container.queryAll((node) => node.props.accessibilityElementsHidden === true)).toHaveLength(1);
  });

  // covers: AC-1
  it('draws the 40 px circle by default', async () => {
    const { container } = await render(<IconTile icon={Package} />);
    expect(sizedNodes(container, 40)).toHaveLength(1);
  });

  it('honours an explicit size', async () => {
    const { container } = await render(<IconTile icon={Package} size={64} />);
    expect(sizedNodes(container, 64)).toHaveLength(1);
  });
});
