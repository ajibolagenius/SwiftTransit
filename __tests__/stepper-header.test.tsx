import { render, screen } from '@testing-library/react-native';

import { StepperHeader } from '@/components/ui/stepper-header';

describe('StepperHeader', () => {
  // covers: AC-1
  it('shows the progress line and the step name', async () => {
    await render(<StepperHeader progressLabel="Step 2 of 6" title="Pick-up address" step={2} total={6} />);

    expect(screen.getByText('Step 2 of 6')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Pick-up address' })).toBeTruthy();
  });

  // covers: AC-6
  it('announces progress and step as one summary', async () => {
    const { container } = await render(
      <StepperHeader progressLabel="Step 3 of 6" title="Drop-off" step={3} total={6} />,
    );

    const summaries = container.queryAll((node) => node.props.accessibilityRole === 'summary');
    expect(summaries).toHaveLength(1);
    expect(summaries[0].props.accessibilityLabel).toBe('Step 3 of 6, Drop-off');
  });

  // covers: AC-5
  it('keeps the step dots out of the accessibility tree', async () => {
    const { container } = await render(
      <StepperHeader progressLabel="Step 1 of 6" title="Package type" step={1} total={6} />,
    );

    const hiddenRows = container.queryAll((node) => node.props.accessibilityElementsHidden === true);
    expect(hiddenRows).toHaveLength(1);
  });
});
