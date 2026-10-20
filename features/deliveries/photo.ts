import * as Crypto from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from '@/lib/supabase';

// AC-6: the photo uploads as soon as it is chosen, into the customer's own
// id prefix. The bucket policy (spec 0002) refuses any other path, and the
// nightly sweep already cleans up an upload that never becomes an order.

const BUCKET = 'package-photos';
const MAX_BYTES = 5 * 1024 * 1024;

export type PickedPhoto = { uri: string; path: string };

export class PhotoError extends Error {
  constructor(readonly key: string) {
    super(key);
    this.name = 'PhotoError';
  }
}

export async function pickAndUploadPhoto(): Promise<PickedPhoto> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.8,
    allowsEditing: false,
    allowsMultipleSelection: false,
  });
  if (result.canceled) throw new PhotoError('canceled');

  const asset = result.assets[0];
  if (!asset) throw new PhotoError('swifttransit.storage.upload_failed');
  if (asset.fileSize && asset.fileSize > MAX_BYTES) throw new PhotoError('swifttransit.storage.too_large');

  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user.id;
  if (!uid) throw new PhotoError('swifttransit.auth.no_session');

  const extension = (asset.mimeType?.split('/')[1] ?? 'jpeg').replace('jpeg', 'jpg');
  const path = `${uid}/${Crypto.randomUUID()}.${extension}`;

  const form = new FormData();
  form.append('file', {
    uri: asset.uri,
    name: path.split('/').pop(),
    type: asset.mimeType ?? 'image/jpeg',
  } as unknown as Blob);

  const { error } = await supabase.storage.from(BUCKET).upload(path, form);
  if (error) {
    // Only a refused size is worth the "over 5 MB" message. Everything else,
    // including a network drop, gets the generic one that says booking can go on.
    throw new PhotoError(
      error.status === 413 ? 'swifttransit.storage.too_large' : 'swifttransit.storage.upload_failed',
    );
  }
  return { uri: asset.uri, path };
}

export async function deletePhoto(path: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([path]);
}
