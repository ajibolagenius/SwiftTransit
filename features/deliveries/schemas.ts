import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { z } from 'zod';

// The wizard's contract. One schema for the whole draft, plus a slice per step,
// so the step guard and the Continue buttons check the same thing (AC-8).

export const orderTypes = ['document', 'parcel', 'food', 'groceries'] as const;
export const packageSizes = ['small', 'medium', 'large'] as const;
export const handlingFlags = ['fragile', 'perishable', 'handle_with_care', 'keep_upright'] as const;

export type OrderType = (typeof orderTypes)[number];
export type PackageSize = (typeof packageSizes)[number];
export type HandlingFlag = (typeof handlingFlags)[number];

export const placeSchema = z.object({
  line: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  addressId: z.string().uuid().optional(),
});
export type Place = z.infer<typeof placeSchema>;

/** A Nigerian mobile number, normalised to E.164 with a +234 default. */
export function toE164(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withPrefix = trimmed.startsWith('+') ? trimmed : `+234${trimmed.replace(/^0+/, '')}`;
  const parsed = parsePhoneNumberFromString(withPrefix, 'NG');
  if (!parsed || !parsed.isValid() || parsed.country !== 'NG') return null;
  return parsed.number;
}

export const typeSlice = z.object({
  type: z.enum(orderTypes),
});

export const pickupSlice = z.object({ pickup: placeSchema });
export const dropoffSlice = z.object({ dropoff: placeSchema });

export const receiverSlice = z.object({
  receiverName: z.string().trim().min(2).max(80),
  receiverPhone: z
    .string()
    .refine((value) => parsePhoneNumberFromString(value, 'NG')?.isValid() === true, 'receiver.phoneInvalid'),
});

export const packageSlice = z.object({
  packageSize: z.enum(packageSizes),
  weightKg: z.number().positive().max(2000),
  handlingFlags: z.array(z.enum(handlingFlags)),
  instructions: z.string().max(500),
  packagePhotoPath: z.string().max(256).nullable(),
});

export const scheduleSlice = z.object({
  scheduledAt: z
    .string()
    .datetime()
    .nullable()
    .refine((value) => {
      if (value === null) return true; // ASAP
      const at = new Date(value).getTime();
      const now = Date.now();
      return at >= now - 60_000 && at <= now + 7 * 24 * 60 * 60 * 1000;
    }, 'schedule.outOfRange'),
});

export const draftSchema = typeSlice
  .merge(pickupSlice)
  .merge(dropoffSlice)
  .merge(receiverSlice)
  .merge(packageSlice)
  .merge(scheduleSlice)
  .extend({
    idempotencyKey: z.string().uuid(),
    savePickup: z.boolean(),
    saveDropoff: z.boolean(),
  });

export type DeliveryDraft = z.infer<typeof draftSchema>;

export const STEP_COUNT = 6;

// Literal step numbers so the i18n keys `newDelivery.steps.N` stay type checked.
export const stepNumbers = [1, 2, 3, 4, 5, 6] as const;
export type StepNumber = (typeof stepNumbers)[number];

export function isStepNumber(value: number): value is StepNumber {
  return (stepNumbers as readonly number[]).includes(value);
}

// Each step is complete when its slice parses. Step 6 is always valid on its
// own (ASAP is a choice, not a gap), so completeness there means "seen".
const sliceForStep: Record<number, z.ZodTypeAny> = {
  1: typeSlice,
  2: pickupSlice,
  3: dropoffSlice,
  4: receiverSlice,
  5: packageSlice,
  6: scheduleSlice,
};

/** The first step whose data is missing or invalid; `null` when the draft is complete. */
export function firstIncompleteStep(draft: Partial<DeliveryDraft>): number | null {
  for (let step = 1; step <= STEP_COUNT; step += 1) {
    if (!sliceForStep[step].safeParse(draft).success) return step;
  }
  return null;
}

/** True when the draft can reach the summary (AC-8, invariant 5). */
export function draftIsComplete(draft: Partial<DeliveryDraft>): boolean {
  return firstIncompleteStep(draft) === null;
}

/** The jsonb shape `create_order` reads. Money and distance are never in it. */
export function toOrderDraftJsonb(draft: DeliveryDraft, method: 'card' | 'wallet') {
  return {
    type: draft.type,
    payment_method: method,
    pickup_line: draft.pickup.line,
    pickup_lat: draft.pickup.lat,
    pickup_lng: draft.pickup.lng,
    dropoff_line: draft.dropoff.line,
    dropoff_lat: draft.dropoff.lat,
    dropoff_lng: draft.dropoff.lng,
    receiver_name: draft.receiverName,
    receiver_phone: draft.receiverPhone,
    instructions: draft.instructions,
    package_size: draft.packageSize,
    weight_kg: draft.weightKg,
    package_photo_path: draft.packagePhotoPath,
    handling_flags: draft.handlingFlags,
    scheduled_at: draft.scheduledAt,
  };
}
