import {
  draftIsComplete,
  firstIncompleteStep,
  toE164,
  toOrderDraftJsonb,
  type DeliveryDraft,
} from '@/features/deliveries/schemas';

// The wizard's contract: what counts as complete, how a phone is normalised,
// and what the client is allowed to send when it books.

const yaba = { line: '1 Herbert Macaulay Way, Yaba, Lagos', lat: 6.5092, lng: 3.3777 };
const ikeja = { line: 'Allen Avenue, Ikeja, Lagos', lat: 6.6018, lng: 3.3515 };

function draftWith(overrides: Partial<DeliveryDraft> = {}): DeliveryDraft {
  return {
    idempotencyKey: '3f2a6d3e-9a1b-4c0d-8e5f-6a7b8c9d0e1f',
    type: 'parcel',
    pickup: yaba,
    dropoff: ikeja,
    receiverName: 'Amina Yusuf',
    receiverPhone: '+2348021234567',
    packageSize: 'medium',
    weightKg: 3,
    handlingFlags: ['fragile'],
    instructions: 'Gate code 12A',
    packagePhotoPath: null,
    scheduledAt: null,
    savePickup: false,
    saveDropoff: false,
    ...overrides,
  };
}

describe('toE164', () => {
  // covers: AC-5
  it('adds the +234 country code to a local mobile number', () => {
    expect(toE164('08021234567')).toBe('+2348021234567');
    expect(toE164('8021234567')).toBe('+2348021234567');
  });

  // covers: AC-5
  it('keeps a number that already carries the country code', () => {
    expect(toE164('+234 802 123 4567')).toBe('+2348021234567');
  });

  // covers: AC-5
  it('refuses a number that is not a Nigerian mobile', () => {
    expect(toE164('+447911123456')).toBeNull();
    expect(toE164('12345')).toBeNull();
    expect(toE164('   ')).toBeNull();
  });
});

describe('firstIncompleteStep', () => {
  // covers: AC-8
  it('names the first gap, in step order', () => {
    expect(firstIncompleteStep({})).toBe(1);
    expect(firstIncompleteStep({ type: 'parcel' })).toBe(2);
    expect(firstIncompleteStep({ type: 'parcel', pickup: yaba })).toBe(3);
    expect(firstIncompleteStep({ ...draftWith(), dropoff: undefined })).toBe(3);
    expect(firstIncompleteStep({ ...draftWith(), receiverPhone: 'not-a-number' })).toBe(4);
    expect(firstIncompleteStep({ ...draftWith(), weightKg: 0 })).toBe(5);
  });

  // covers: AC-8
  it('reports null only for a complete draft', () => {
    expect(firstIncompleteStep(draftWith())).toBeNull();
    expect(draftIsComplete(draftWith())).toBe(true);
  });

  // covers: AC-7, AC-8
  it('keeps a slot outside the seven day window from reaching the summary', () => {
    const far = new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString();
    expect(firstIncompleteStep(draftWith({ scheduledAt: far }))).toBe(6);
  });

  // covers: AC-6
  it('refuses instructions over 500 characters and a weight above 2000 kg', () => {
    expect(firstIncompleteStep(draftWith({ instructions: 'x'.repeat(501) }))).toBe(5);
    expect(firstIncompleteStep(draftWith({ weightKg: 2001 }))).toBe(5);
  });
});

describe('toOrderDraftJsonb', () => {
  // covers: AC-10
  it('sends no price, distance or money field', () => {
    const jsonb = toOrderDraftJsonb(draftWith(), 'card') as Record<string, unknown>;
    const moneyShapes = Object.keys(jsonb).filter(
      (key) => key.includes('kobo') || key.includes('price') || key.includes('route_km'),
    );
    expect(moneyShapes).toEqual([]);
  });

  // covers: AC-2, AC-7, AC-12
  it('carries the draft fields create_order reads, plus the chosen method', () => {
    const jsonb = toOrderDraftJsonb(draftWith({ scheduledAt: null }), 'wallet') as Record<string, unknown>;
    expect(jsonb).toMatchObject({
      type: 'parcel',
      payment_method: 'wallet',
      pickup_line: yaba.line,
      dropoff_lat: ikeja.lat,
      receiver_phone: '+2348021234567',
      package_size: 'medium',
      weight_kg: 3,
      handling_flags: ['fragile'],
      scheduled_at: null,
    });
  });
});
