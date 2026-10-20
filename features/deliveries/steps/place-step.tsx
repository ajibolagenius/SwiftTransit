import { MapPin, Search } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { errorLabel } from '@/lib/error-label';
import { reverseGeocode, usePlaceSearch } from '@/lib/geo';
import { useSavedAddresses } from '../addresses';
import { selectDraft, useDraftStore } from '../draft-store';
import { readCurrentPosition } from '../location';
import { PlaceMap } from '../place-map';
import type { Place } from '../schemas';
import { WizardScreen, type StepProps } from '../wizard';
import { useThemeColors } from '@/theme/use-theme';

// AC-3: four ways to make a place (pin, search, saved address, my location), each
// producing the same {line, lat, lng}. AC-19: the pin path still works when geo fails.

const SEARCH_LIST_HEIGHT = 200;

function PlaceRow({ title, subtitle, onPress }: { title: string; subtitle?: string; onPress: () => void }) {
  const colors = useThemeColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      onPress={onPress}
      className="flex-row items-center gap-3 px-5 py-4 active:bg-tertiary"
    >
      <MapPin size={20} strokeWidth={1.5} color={colors.text.tertiary} />
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="font-sans text-body-md text-primary">
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} className="font-sans text-body-sm text-tertiary">
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export function PlaceStep({ step, onBack, onContinue }: StepProps & { step: 2 | 3 }) {
  const { t } = useTranslation();
  const draft = useDraftStore(selectDraft);
  const update = useDraftStore((state) => state.update);

  const key = step === 2 ? 'pickup' : 'dropoff';
  const place = step === 2 ? draft.pickup : draft.dropoff;
  const saved = useSavedAddresses();
  const [query, setQuery] = useState('');
  const { predictions, loading, errorKey, retry } = usePlaceSearch(query);
  const [resolving, setResolving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [noFix, setNoFix] = useState(false);
  // Re-mount the camera when a search or saved pick moves the selection.
  const [cameraCentre, setCameraCentre] = useState<[number, number] | undefined>(
    place ? [place.lng, place.lat] : undefined,
  );
  const [cameraKey, setCameraKey] = useState(0);
  const seq = useRef(0);

  useEffect(() => {
    setQuery('');
  }, [step]);

  const setPlace = (next: Place, moveCamera = false) => {
    update({ [key]: next } as { pickup?: Place; dropoff?: Place });
    // Only a pick from outside the map moves the camera. A pan already left the
    // pin over the chosen spot, and re-mounting it there would throw the view away.
    if (!moveCamera) return;
    // An explicit pick outranks a reverse geocode still on its way from a pan,
    // which would otherwise land afterwards and overwrite what was just chosen.
    seq.current += 1;
    setResolving(false);
    setCameraCentre([next.lng, next.lat]);
    setCameraKey((value) => value + 1);
  };

  // A pin drop becomes a place name through reverse geocoding. If geo is down the
  // step still completes, under the generic "Dropped pin" label (AC-19).
  const resolveCentre = async ([lng, lat]: [number, number], moveCamera = false) => {
    const attempt = ++seq.current;
    setResolving(true);
    let line = t('newDelivery.droppedPin');
    try {
      const result = await reverseGeocode(lat, lng);
      if (result.line) line = result.line;
    } catch {
      // The coordinates stand on their own; the name is a convenience.
    }
    if (attempt !== seq.current) return;
    setResolving(false);
    setPlace({ line, lat, lng }, moveCamera);
  };

  const locateMe = async () => {
    setLocating(true);
    setNoFix(false);
    const fix = await readCurrentPosition();
    if (!fix) {
      setLocating(false);
      setNoFix(true);
      return;
    }
    await resolveCentre([fix.lng, fix.lat], true);
    setLocating(false);
  };

  const searching = query.trim().length >= 2;

  return (
    <WizardScreen
      step={step}
      title={t(`newDelivery.${key}.title`)}
      body={t(`newDelivery.${key}.body`)}
      continueLabel={t('newDelivery.continue')}
      continueDisabled={!place || resolving}
      onContinue={onContinue}
      onBack={onBack}
    >
      <View className="flex-1 gap-5">
        <Input
          label={t('newDelivery.searchLabel')}
          placeholder={t('newDelivery.searchPlaceholder')}
          value={query}
          onChangeText={setQuery}
          icon={Search}
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel={t('newDelivery.searchLabel')}
        />

        {(searching || errorKey) && (
          <View className="absolute inset-x-0 top-20 z-10 overflow-hidden rounded-xl border border-default bg-primary">
            {errorKey ? (
              <View className="gap-4 p-5">
                <Text className="font-sans text-body-md text-danger">{errorLabel(t, errorKey)}</Text>
                <Button variant="secondary" onPress={() => void retry()}>
                  {t('newDelivery.retry')}
                </Button>
              </View>
            ) : loading ? (
              <Text className="p-5 font-sans text-body-md text-tertiary">{t('newDelivery.searching')}</Text>
            ) : predictions.length === 0 ? (
              <Text className="p-5 font-sans text-body-md text-secondary">
                {t('newDelivery.searchEmpty')}
              </Text>
            ) : (
              <ScrollView style={{ maxHeight: SEARCH_LIST_HEIGHT }}>
                {predictions.map((prediction) => (
                  <PlaceRow
                    key={prediction.placeId}
                    title={prediction.name}
                    subtitle={prediction.line}
                    onPress={() => {
                      setQuery('');
                      setPlace(
                        {
                          line: prediction.line || prediction.name,
                          lat: prediction.lat,
                          lng: prediction.lng,
                        },
                        true,
                      );
                    }}
                  />
                ))}
              </ScrollView>
            )}
          </View>
        )}

        <View className="flex-1">
          <PlaceMap
            key={cameraKey}
            initialCentre={cameraCentre}
            pinTone={step === 2 ? 'pickup' : 'dropoff'}
            onSettled={(centre) => void resolveCentre(centre)}
          />
        </View>

        <View className="gap-4">
          <View className="gap-1 rounded-xl bg-tertiary p-5">
            <Text className="font-sans text-label-sm text-tertiary">
              {resolving ? t('newDelivery.mapResolving') : t('newDelivery.selectedLabel')}
            </Text>
            <Text numberOfLines={2} className="font-sans text-body-md text-primary">
              {place?.line ?? t('newDelivery.droppedPin')}
            </Text>
            {noFix ? (
              <Text accessibilityLiveRegion="polite" className="font-sans text-body-sm text-danger">
                {t('newDelivery.locationDenied')}
              </Text>
            ) : null}
          </View>

          {step === 2 ? (
            <Button variant="secondary" loading={locating} onPress={() => void locateMe()}>
              {t('newDelivery.useMyLocation')}
            </Button>
          ) : null}

          {(saved.data?.length ?? 0) > 0 && (
            <View className="gap-2">
              <Text className="font-sans text-label-md text-secondary">
                {t('newDelivery.savedAddresses')}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3">
                {(saved.data ?? []).map((address) => (
                  <Pressable
                    key={address.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${t('newDelivery.savedAddresses')}: ${address.label}, ${address.line}`}
                    accessibilityState={{ selected: place?.addressId === address.id }}
                    onPress={() =>
                      setPlace(
                        {
                          line: address.line,
                          lat: address.lat,
                          lng: address.lng,
                          addressId: address.id,
                        },
                        true,
                      )
                    }
                    className={`max-w-56 rounded-xl border p-4 ${
                      place?.addressId === address.id
                        ? 'border-brand bg-brand-soft'
                        : 'border-default bg-primary'
                    }`}
                  >
                    <Text numberOfLines={1} className="font-sans text-label-md text-primary">
                      {address.label}
                    </Text>
                    <Text numberOfLines={1} className="font-sans text-body-sm text-tertiary">
                      {address.line}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {!place ? (
            <Text className="font-sans text-body-sm text-tertiary">{t('newDelivery.pinHint')}</Text>
          ) : null}
        </View>
      </View>
    </WizardScreen>
  );
}
