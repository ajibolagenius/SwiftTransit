import * as aesjs from 'aes-js';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import Storage from 'expo-sqlite/kv-store';

// Supabase sessions outgrow SecureStore's ~2 KB limit, so the session is AES-encrypted
// into SQLite and only the per-write random key lives in the Keychain/Keystore.
// A fresh key per write makes CTR's fixed counter safe (a key is never reused).

const keyName = (key: string) => `${key}.key`;

async function encrypt(key: string, value: string) {
  const encryptionKey = Crypto.getRandomBytes(32);
  const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
  const encrypted = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
  await SecureStore.setItemAsync(keyName(key), aesjs.utils.hex.fromBytes(encryptionKey));
  return aesjs.utils.hex.fromBytes(encrypted);
}

async function decrypt(key: string, value: string) {
  const encryptionKeyHex = await SecureStore.getItemAsync(keyName(key));
  if (!encryptionKeyHex) return null;
  const cipher = new aesjs.ModeOfOperation.ctr(
    aesjs.utils.hex.toBytes(encryptionKeyHex),
    new aesjs.Counter(1),
  );
  return aesjs.utils.utf8.fromBytes(cipher.decrypt(aesjs.utils.hex.toBytes(value)));
}

export const secureSessionStorage = {
  async getItem(key: string) {
    const encrypted = await Storage.getItem(key);
    return encrypted ? decrypt(key, encrypted) : null;
  },
  async setItem(key: string, value: string) {
    await Storage.setItem(key, await encrypt(key, value));
  },
  async removeItem(key: string) {
    await Storage.removeItem(key);
    await SecureStore.deleteItemAsync(keyName(key));
  },
};
