import { Camera, Package, X } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Chip } from '@/components/ui/chip';
import { Input } from '@/components/ui/input';
import { SelectCard } from '@/components/ui/select-card';
import { errorLabel } from '@/lib/error-label';
import { useThemeColors } from '@/theme/use-theme';
import { selectDraft, useDraftStore } from '../draft-store';
import { deletePhoto, pickAndUploadPhoto, PhotoError } from '../photo';
import { handlingFlags, packageSlice, packageSizes, type HandlingFlag } from '../schemas';
import { WizardScreen, type StepProps } from '../wizard';

// AC-6: size and weight are required, flags come only from the known set,
// instructions are capped, and the photo uploads as soon as it is chosen.

const INSTRUCTION_LIMIT = 500;
const PHOTO_SIZE = 72; // thumbnail side, a component constant not a spacing step

function ToggleChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={4}
      className="py-1"
    >
      <Chip tone={selected ? 'brand' : 'neutral'}>{label}</Chip>
    </Pressable>
  );
}

export function PackageStep({ onBack, onContinue }: StepProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const draft = useDraftStore(selectDraft);
  const update = useDraftStore((state) => state.update);

  const [weight, setWeight] = useState(draft.weightKg ? String(draft.weightKg) : '');
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const weightKg = Number(weight);
  const weightProblem = packageSlice.shape.weightKg.safeParse(weightKg).success
    ? null
    : t('newDelivery.package.weightInvalid');

  const toggleFlag = (flag: HandlingFlag) =>
    update({
      handlingFlags: draft.handlingFlags.includes(flag)
        ? draft.handlingFlags.filter((other) => other !== flag)
        : [...draft.handlingFlags, flag],
    });

  const addPhoto = async () => {
    setPhotoError(null);
    setUploading(true);
    try {
      const picked = await pickAndUploadPhoto();
      update({ packagePhotoPath: picked.path, packagePhotoPreviewUri: picked.uri });
    } catch (error) {
      if (error instanceof PhotoError && error.key !== 'canceled') setPhotoError(errorLabel(t, error.key));
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async () => {
    if (draft.packagePhotoPath) await deletePhoto(draft.packagePhotoPath);
    update({ packagePhotoPath: null, packagePhotoPreviewUri: null });
  };

  return (
    <WizardScreen
      step={5}
      title={t('newDelivery.package.title')}
      body={t('newDelivery.package.body')}
      continueLabel={t('newDelivery.continue')}
      continueDisabled={!draft.packageSize || weight.length === 0 || weightProblem !== null}
      onContinue={() => {
        if (!draft.packageSize || weightProblem) return;
        update({ weightKg });
        onContinue();
      }}
      onBack={onBack}
    >
      <ScrollView contentContainerClassName="gap-6 pb-4">
        <View className="gap-3">
          <Text className="font-sans text-label-md text-secondary">{t('newDelivery.package.sizeLabel')}</Text>
          {packageSizes.map((size) => (
            <SelectCard
              key={size}
              icon={Package}
              title={t(`newDelivery.package.${size}`)}
              subtitle={t(`newDelivery.package.${size}Hint`)}
              selected={draft.packageSize === size}
              onPress={() => update({ packageSize: size })}
            />
          ))}
        </View>

        <Input
          label={t('newDelivery.package.weightLabel')}
          placeholder={t('newDelivery.package.weightPlaceholder')}
          value={weight}
          onChangeText={setWeight}
          keyboardType="decimal-pad"
          error={weight.length > 0 ? (weightProblem ?? undefined) : undefined}
        />

        <View className="gap-3">
          <Text className="font-sans text-label-md text-secondary">
            {t('newDelivery.package.flagsLabel')}
          </Text>
          <View className="flex-row flex-wrap gap-3">
            {handlingFlags.map((flag) => (
              <ToggleChip
                key={flag}
                label={t(`newDelivery.package.${flag}`)}
                selected={draft.handlingFlags.includes(flag)}
                onPress={() => toggleFlag(flag)}
              />
            ))}
          </View>
        </View>

        <View className="gap-2">
          <Input
            label={t('newDelivery.package.instructionsLabel')}
            placeholder={t('newDelivery.package.instructionsPlaceholder')}
            value={draft.instructions}
            onChangeText={(value) => update({ instructions: value.slice(0, INSTRUCTION_LIMIT) })}
            multiline
          />
          <Text className="font-sans text-body-sm text-tertiary">
            {t('newDelivery.package.instructionsCount', { count: draft.instructions.length })}
          </Text>
        </View>

        <View className="gap-3">
          <Text className="font-sans text-label-md text-secondary">
            {t('newDelivery.package.photoLabel')}
          </Text>
          {draft.packagePhotoPath && draft.packagePhotoPreviewUri ? (
            <View className="flex-row items-center gap-4">
              <Image
                source={{ uri: draft.packagePhotoPreviewUri }}
                accessibilityLabel={t('newDelivery.package.photoLabel')}
                style={{ width: PHOTO_SIZE, height: PHOTO_SIZE }}
                resizeMode="cover"
                className="rounded-xl border border-default"
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('newDelivery.package.changePhoto')}
                onPress={() => void addPhoto()}
                hitSlop={8}
                className="py-3"
              >
                <Text className="font-sans text-label-md text-link">
                  {t('newDelivery.package.changePhoto')}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('newDelivery.package.removePhoto')}
                onPress={() => void removePhoto()}
                hitSlop={8}
                className="p-3"
              >
                <X size={20} strokeWidth={1.5} color={colors.text.danger} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('newDelivery.package.addPhoto')}
              onPress={() => void addPhoto()}
              disabled={uploading}
              className="flex-row items-center justify-center gap-3 rounded-xl border border-dashed border-strong p-5 active:bg-tertiary"
            >
              {uploading ? (
                <ActivityIndicator />
              ) : (
                <Camera size={20} strokeWidth={1.5} color={colors.text.tertiary} />
              )}
              <Text className="font-sans text-label-md text-secondary">
                {uploading ? t('newDelivery.package.uploading') : t('newDelivery.package.addPhoto')}
              </Text>
            </Pressable>
          )}
          {photoError ? (
            <Text accessibilityLiveRegion="polite" className="font-sans text-body-sm text-danger">
              {photoError}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </WizardScreen>
  );
}
