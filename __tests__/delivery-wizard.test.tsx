import { act, fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import type { ReactNode } from 'react';
import { AccessibilityInfo } from 'react-native';
import { FadeIn, FadeInRight } from 'react-native-reanimated';

import { useDraftStore } from '@/features/deliveries/draft-store';
import type { AuthState } from '@/features/auth/guards';

// The wizard through its routes: where a deep link lands, what a step stores,
// and what the confirmation shows. Screens are rendered from the real `app/`
// tree so the step guard is the one customers hit.

let mockAuth: AuthState = { status: 'signed-in', session: null, role: 'customer' };

jest.mock('@/features/auth/auth-provider', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => mockAuth,
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/lib/env', () => ({
  env: {
    EXPO_PUBLIC_MAP_STYLE_LIGHT: 'https://tiles.openfreemap.org/styles/positron',
    EXPO_PUBLIC_MAP_STYLE_DARK: 'https://tiles.openfreemap.org/styles/dark',
  },
}));
jest.mock('../global.css', () => ({}));
jest.mock('@maplibre/maplibre-react-native', () => ({ Map: () => null, Camera: () => null }));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(() => Promise.resolve()) }));
// No native crypto module under jest. A counter keeps every uuid distinct,
// which is what the draft's idempotency key relies on.
jest.mock('expo-crypto', () => {
  let issued = 0;
  return {
    randomUUID: () => `00000000-0000-4000-8000-00000000${String((issued += 1)).padStart(4, '0')}`,
  };
});
jest.mock('@/lib/supabase', () => {
  const empty = Promise.resolve({ data: [], error: null });
  // Builder steps hand back the same chainable so any select shape resolves to
  // an empty page. Nothing here answers for real: the wizard tests never reach
  // the price or the booking call, and an empty read puts every screen in its
  // own empty state, which the screens already know how to render.
  const chainable: Record<string, unknown> = {};
  for (const step of ['select', 'eq', 'in', 'order']) chainable[step] = () => chainable;
  chainable.limit = () => empty;
  chainable.range = () => empty;
  chainable.maybeSingle = () => Promise.resolve({ data: null, error: null });
  const insert = jest.fn(() => Promise.resolve({ error: null }));
  chainable.insert = insert;
  return {
    supabase: {
      _insert: insert,
      auth: {
        updateUser: jest.fn(),
        getSession: jest.fn(() =>
          Promise.resolve({
            data: { session: { user: { id: '00000000-0000-4000-8000-0000000000c1' } } },
          }),
        ),
      },
      // A call that was supposed to be mocked shows up as a failed query, which
      // the screens already render as their error state.
      rpc: jest.fn(() => Promise.resolve({ data: null, error: new Error('not mocked') })),
      functions: { invoke: jest.fn(() => Promise.resolve({ data: null, error: new Error('not mocked') })) },
      from: jest.fn(() => chainable),
      storage: { from: jest.fn(() => ({ upload: jest.fn(), remove: jest.fn() })) },
    },
  };
});

const yaba = { line: '1 Herbert Macaulay Way, Yaba, Lagos', lat: 6.5092, lng: 3.3777 };
const ikeja = { line: 'Allen Avenue, Ikeja, Lagos', lat: 6.6018, lng: 3.3515 };

function fillDraft(patch: Record<string, unknown>) {
  useDraftStore.getState().update(patch);
}

// renderRouter returns the router once the tree has mounted. Awaiting it is
// what actually renders, so every test goes through here.
async function open(initialUrl: string) {
  const router = renderRouter('./app', { initialUrl });
  await router;
  return router;
}

type Rendered = Awaited<ReturnType<typeof open>>;

// The step frame hands its content to Reanimated through an `entering` animation.
// Nothing actually animates under jest, so the animation the frame asks for is the
// observable, and it is the one thing a test can check about the step transition.
function stepEntering(container: Rendered['container']) {
  const [frame] = container.queryAll((node) => node.props?.entering !== undefined);
  return frame?.props?.entering;
}

beforeEach(() => {
  useDraftStore.getState().restart();
  mockAuth = { status: 'signed-in', session: null, role: 'customer' };
});

describe('entering the wizard', () => {
  // covers: AC-1
  it('starts at step 1 from the home shortcut', async () => {
    await open('/');
    await act(async () => {
      fireEvent.press(await screen.findByText('Send a package'));
    });

    expect(await screen.findByText('What are you sending?')).toBeTruthy();
    expect(screen.getByText('Step 1 of 6')).toBeTruthy();
  });

  // covers: AC-1
  it('starts at step 1 from the centre action sheet', async () => {
    await open('/');
    await act(async () => {
      fireEvent.press(await screen.findByRole('button', { name: 'What would you like to do?' }));
    });
    await act(async () => {
      fireEvent.press(await screen.findByRole('button', { name: 'Send a package' }));
    });

    expect(await screen.findByText('What are you sending?')).toBeTruthy();
  });

  // Spec 0006 replaced AC-17's unavailable stub: the track row opens the Orders tab.
  it('opens the orders tab from the home track row', async () => {
    await open('/');

    await act(async () => {
      fireEvent.press(await screen.findByText('Track a delivery'));
    });

    expect(await screen.findByText('All Orders')).toBeTruthy();
  });

  // covers: AC-20
  it('picks a draft left by a lost session up on the step it was left on', async () => {
    fillDraft({ type: 'parcel', pickup: yaba, dropoff: ikeja });
    useDraftStore.getState().setResumeStep(4);
    await open('/');
    await act(async () => {
      fireEvent.press(await screen.findByText('Send a package'));
    });

    expect(await screen.findByText('Who is receiving it?')).toBeTruthy();
  });
});

describe('the wizard frame', () => {
  // The guard sends a bare deep link back to step 1, so the frame tests fill the
  // draft to the receiver step first, the same way openReceiver does below.
  async function openFrame(url = '/new-delivery/4') {
    fillDraft({ type: 'parcel', pickup: yaba, dropoff: ikeja });
    return open(url);
  }

  // covers: AC-1
  it('names the screen, the step and the back control', async () => {
    await openFrame();

    expect(await screen.findByRole('header', { name: 'New delivery' })).toBeTruthy();
    expect(screen.getByText('Step 4 of 6')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Receiver' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Go back' })).toBeTruthy();
  });

  // covers: AC-22
  it('enters a step with a fade and a slide', async () => {
    const view = await openFrame();
    await screen.findByText('Who is receiving it?');

    // The plain SlideIn variants are the ones that leave this flex-1 content about
    // 60 pt too high once they settle on Reanimated 4.5, so the frame must not ask
    // for them. Identity against FadeInRight is what holds that line.
    expect(stepEntering(view.container)).toBe(FadeInRight);
  });

  // covers: AC-22
  it('cross fades the step when the platform asks for Reduce Motion', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);

    const view = await openFrame();
    await screen.findByText('Who is receiving it?');
    await act(async () => {
      await Promise.resolve();
    });

    expect(stepEntering(view.container)).toBe(FadeIn);
    jest.restoreAllMocks();
  });

  // covers: AC-1
  it('takes the back control to the previous step', async () => {
    await open('/new-delivery/1');
    await act(async () => {
      fireEvent.press(await screen.findByText('Parcel'));
    });
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: /Continue/ }));
    });
    expect(await screen.findByText('Where do we collect it?')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Go back' }));
    });
    expect(await screen.findByText('What are you sending?')).toBeTruthy();
  });
});

describe('the step guard', () => {
  // covers: AC-8
  it('lands a deep link to a later step on the first incomplete one', async () => {
    await open('/new-delivery/4');

    expect(await screen.findByText('What are you sending?')).toBeTruthy();
    expect(screen.queryByText('Who is receiving it?')).toBeNull();
  });

  // covers: AC-8
  it('moves the landing forward as the draft fills in', async () => {
    fillDraft({ type: 'parcel' });
    await open('/new-delivery/3');

    expect(await screen.findByText('Where do we collect it?')).toBeTruthy();
    expect(screen.queryByText('Where are we taking it?')).toBeNull();
  });

  // covers: AC-8
  it('keeps the summary out of reach until the draft is complete', async () => {
    fillDraft({ type: 'parcel', pickup: yaba });
    await open('/new-delivery/summary');

    // Drop-off is the first gap, so that is where the summary lands.
    expect(await screen.findByText('Where are we taking it?')).toBeTruthy();
    expect(screen.queryByText('Order summary')).toBeNull();
  });

  // covers: AC-8, AC-14
  it('opens on step 1 with a fresh idempotency key for the booking', async () => {
    await open('/new-delivery/1');
    await screen.findByText('What are you sending?');

    const key = useDraftStore.getState().draft.idempotencyKey;
    expect(key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

    // A new wizard session is a new booking, so it must not reuse the key.
    useDraftStore.getState().restart();
    expect(useDraftStore.getState().draft.idempotencyKey).not.toBe(key);
  });
});

describe('step 1, the delivery type', () => {
  // covers: AC-2
  it('holds Continue until a type is chosen, then stores it and moves on', async () => {
    await open('/new-delivery/1');
    const continueButton = await screen.findByRole('button', { name: /Continue/ });
    expect(continueButton.props.accessibilityState).toMatchObject({ disabled: true });

    fireEvent.press(screen.getByText('Parcel'));

    const cont = await screen.findByRole('button', { name: /Continue/ });
    expect(cont.props.accessibilityState).toMatchObject({ disabled: false });
    await act(async () => {
      fireEvent.press(cont);
    });

    expect(useDraftStore.getState().draft.type).toBe('parcel');
    expect(await screen.findByText('Where do we collect it?')).toBeTruthy();
  });
});

describe('step 4, the receiver', () => {
  // The step guard needs the draft filled to here, otherwise the deep link
  // lands on the first incomplete step instead of the receiver form.
  async function openReceiver() {
    fillDraft({ type: 'parcel', pickup: yaba, dropoff: ikeja });
    await open('/new-delivery/4');
    const phone = await screen.findByLabelText('Receiver phone, +234');
    return { phone, name: screen.getByLabelText('Receiver name') };
  }

  // covers: AC-5
  it('shows the inline error the moment the number is invalid, with Continue held', async () => {
    const { phone } = await openReceiver();

    expect(screen.getByRole('button', { name: /Continue/ }).props.accessibilityState).toMatchObject({
      disabled: true,
    });
    expect(screen.queryByText('Enter a valid Nigerian mobile number.')).toBeNull();

    await act(async () => {
      fireEvent.changeText(phone, '12345');
    });

    expect(screen.getByText('Enter a valid Nigerian mobile number.')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Continue/ }).props.accessibilityState).toMatchObject({
      disabled: true,
    });
  });

  // covers: AC-5
  it('flags a name too short to be a full name', async () => {
    const { name } = await openReceiver();

    await act(async () => {
      fireEvent.changeText(name, 'A');
    });

    expect(screen.getByText('Enter the receiver’s full name.')).toBeTruthy();
  });

  // covers: AC-5
  it('stores the number as E.164 with the +234 default and moves on', async () => {
    const { phone, name } = await openReceiver();

    await act(async () => {
      fireEvent.changeText(name, 'Amina Yusuf');
      // Typed the way a customer dials locally, leading zero and all.
      fireEvent.changeText(phone, '08021234567');
    });

    const cont = await screen.findByRole('button', { name: /Continue/ });
    expect(cont.props.accessibilityState).toMatchObject({ disabled: false });
    await act(async () => {
      fireEvent.press(cont);
    });

    expect(useDraftStore.getState().draft).toMatchObject({
      receiverName: 'Amina Yusuf',
      receiverPhone: '+2348021234567',
    });
    expect(await screen.findByText('What is the package like?')).toBeTruthy();
  });

  // covers: AC-5
  it('holds Continue while the name is missing, even with a valid number', async () => {
    const { phone } = await openReceiver();

    await act(async () => {
      fireEvent.changeText(phone, '08021234567');
    });
    expect(screen.getByRole('button', { name: /Continue/ }).props.accessibilityState).toMatchObject({
      disabled: true,
    });

    await act(async () => {
      fireEvent.changeText(screen.getByLabelText('Receiver name'), 'Amina Yusuf');
    });
    expect(screen.getByRole('button', { name: /Continue/ }).props.accessibilityState).toMatchObject({
      disabled: false,
    });
  });

  // covers: AC-5
  it('drops the phone error once the number turns valid', async () => {
    const { phone } = await openReceiver();

    await act(async () => {
      fireEvent.changeText(phone, '12345');
    });
    expect(screen.getByText('Enter a valid Nigerian mobile number.')).toBeTruthy();

    await act(async () => {
      fireEvent.changeText(phone, '08021234567');
    });
    expect(screen.queryByText('Enter a valid Nigerian mobile number.')).toBeNull();
  });

  // covers: AC-5
  it('refuses a mobile number from another country', async () => {
    const { phone } = await openReceiver();

    await act(async () => {
      fireEvent.changeText(phone, '+14155552671');
    });

    expect(screen.getByText('Enter a valid Nigerian mobile number.')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Continue/ }).props.accessibilityState).toMatchObject({
      disabled: true,
    });
  });

  // covers: AC-5
  it('states who sees the number and opens the privacy policy from the link', async () => {
    await openReceiver();

    expect(
      screen.getByText('This number and both addresses are shared with the courier who takes the job.'),
    ).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByRole('link', { name: 'Read the privacy policy' }));
    });
    expect(await screen.findByText('Privacy Policy')).toBeTruthy();
  });

  // covers: AC-5, AC-20
  it('reopens a stored receiver with the number ready to send', async () => {
    fillDraft({
      type: 'parcel',
      pickup: yaba,
      dropoff: ikeja,
      receiverName: 'Amina Yusuf',
      receiverPhone: '+2348021234567',
    });
    await open('/new-delivery/4');

    // The field carries the national digits, so the dial code stays in the prefix.
    const phone = await screen.findByLabelText('Receiver phone, +234');
    expect(phone.props.value).toBe('8021234567');
    expect(screen.getByLabelText('Receiver name').props.value).toBe('Amina Yusuf');
    expect(screen.queryByText('Enter a valid Nigerian mobile number.')).toBeNull();
    expect(screen.getByRole('button', { name: /Continue/ }).props.accessibilityState).toMatchObject({
      disabled: false,
    });
  });
});

describe('the confirmation', () => {
  const bookedUrl =
    '/new-delivery/booked?orderId=3f2a6d3e-9a1b-4c0d-8e5f-6a7b8c9d0e1f' +
    '&trackingCode=7KQ2M4XJ&status=searching&totalKobo=224900&method=card';

  // covers: AC-15
  it('shows the code, the status the order came back with, and what was paid', async () => {
    fillDraft({ pickup: yaba, dropoff: ikeja });
    await open(bookedUrl);

    expect(await screen.findByText('7KQ2M4XJ')).toBeTruthy();
    expect(screen.getByText('Searching for a courier')).toBeTruthy();
    expect(screen.getByText('Paid ₦2,249.00 with card')).toBeTruthy();
  });

  // covers: AC-15
  it('copies the tracking code', async () => {
    const clipboard = require('expo-clipboard') as { setStringAsync: jest.Mock };
    await open(bookedUrl);

    await act(async () => {
      fireEvent.press(await screen.findByLabelText('Copy code'));
    });
    await screen.findByText('Copied');
    expect(clipboard.setStringAsync).toHaveBeenCalledWith('7KQ2M4XJ');
  });

  // covers: AC-13 (spec 0006 replaced the stub this test used to pin)
  it('offers View order as the way to the order detail', async () => {
    await open(bookedUrl);

    const viewOrder = await screen.findByRole('button', { name: /View order/ });
    expect(viewOrder.props.accessibilityState).toMatchObject({ disabled: false });
  });

  // covers: AC-15
  it('clears the draft on send another', async () => {
    fillDraft({ type: 'parcel', pickup: yaba });
    await open(bookedUrl);

    await act(async () => {
      fireEvent.press(await screen.findByText('Send another'));
    });
    expect(useDraftStore.getState().draft.type).toBeUndefined();
  });

  // covers: AC-16
  it('writes the chosen places to the customer own addresses', async () => {
    const { supabase } = require('@/lib/supabase') as { supabase: { from: jest.Mock } };
    fillDraft({ pickup: yaba, dropoff: ikeja });
    await open(bookedUrl);

    // Nothing is offered for writing until the customer picks a place.
    const save = await screen.findByRole('button', { name: 'Save these addresses' });
    expect(save.props.accessibilityState).toMatchObject({ disabled: true });

    // The toggles write to the draft store and the button re-renders from that
    // subscription, so the presses need a flush before the next query.
    await act(async () => {
      fireEvent.press(screen.getByLabelText('1 Herbert Macaulay Way, Yaba, Lagos'));
      fireEvent.press(screen.getByLabelText('Allen Avenue, Ikeja, Lagos'));
    });
    expect(useDraftStore.getState().draft).toMatchObject({ savePickup: true, saveDropoff: true });

    const enabled = await screen.findByRole('button', { name: 'Save these addresses' });
    expect(enabled.props.accessibilityState).toMatchObject({ disabled: false });

    await act(async () => {
      fireEvent.press(enabled);
    });

    await screen.findByText('Saved to your profile');
    // Every write goes through the one insert the mock hands back, so both rows
    // show up as calls on it.
    const { _insert: inserted } = supabase as unknown as { _insert: jest.Mock };
    const written = inserted.mock.calls.map((call) => call[0]);
    expect(written).toHaveLength(2);
    expect(written[0]).toMatchObject({
      owner_id: '00000000-0000-4000-8000-0000000000c1',
      label: '1 Herbert Macaulay Way',
      line: yaba.line,
    });
    expect(written[1]).toMatchObject({
      owner_id: '00000000-0000-4000-8000-0000000000c1',
      label: 'Allen Avenue',
      line: ikeja.line,
    });
  });
});
