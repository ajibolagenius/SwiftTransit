import * as Crypto from 'expo-crypto';
import { create } from 'zustand';

import type { HandlingFlag, OrderType, PackageSize, Place, StepNumber } from './schemas';

// The booking draft lives in memory only. Spec 0005 rejects the server side
// draft option: a third party's phone number and address never go to disk.

export type DraftState = {
  idempotencyKey: string;
  type?: OrderType;
  pickup?: Place;
  dropoff?: Place;
  receiverName?: string;
  receiverPhone?: string;
  packageSize?: PackageSize;
  weightKg?: number;
  handlingFlags: HandlingFlag[];
  instructions: string;
  packagePhotoPath: string | null;
  // Local file uri for the thumbnail. The bucket is private until an order
  // references the object, so the preview cannot come from a signed URL.
  packagePhotoPreviewUri: string | null;
  scheduledAt: string | null;
  savePickup: boolean;
  saveDropoff: boolean;
};

function emptyDraft(): DraftState {
  return {
    // One key per wizard session, so a double tap or a retry books once (AC-14).
    idempotencyKey: Crypto.randomUUID(),
    handlingFlags: [],
    instructions: '',
    packagePhotoPath: null,
    packagePhotoPreviewUri: null,
    scheduledAt: null,
    savePickup: false,
    saveDropoff: false,
  };
}

type DraftStore = {
  draft: DraftState;
  // AC-20: where to pick the customer up if a lost session routes them to sign in.
  resumeStep: StepNumber | null;
  /** Merge a step's answer into the draft. */
  update: (patch: Partial<DraftState>) => void;
  setResumeStep: (step: StepNumber | null) => void;
  /** Start a fresh booking. Call when the wizard opens with no draft in it. */
  restart: () => void;
  /** Wipe the draft after a booking lands (AC-15, "send another"). */
  clear: () => void;
};

export const useDraftStore = create<DraftStore>((set) => ({
  draft: emptyDraft(),
  resumeStep: null,
  update: (patch) => set((state) => ({ draft: { ...state.draft, ...patch } })),
  setResumeStep: (step) => set({ resumeStep: step }),
  restart: () => set({ draft: emptyDraft(), resumeStep: null }),
  clear: () => set({ draft: emptyDraft(), resumeStep: null }),
}));

export const selectDraft = (state: DraftStore) => state.draft;
