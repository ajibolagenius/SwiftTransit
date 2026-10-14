import { ChevronDown } from 'lucide-react-native';
import type { TextInput } from 'react-native';
import { forwardRef, useState } from 'react';
import { Pressable, Text, TextInput as RNTextInput, View } from 'react-native';

import { useThemeColors } from '@/theme/use-theme';

// TODO: missing asset: country flag icons. DESIGN.md wants flag + dial code + chevron;
// until flag art exists the selector shows the dial code only (no emoji-as-icon).

// PhoneInput: the DESIGN.md phone field, a 48 px input with a country-code selector
// defaulting to Nigeria (+234). Digits are entered without the country code.
export const PhoneInput = forwardRef<
  TextInput,
  {
    label: string;
    value: string;
    onChangeText: (value: string) => void;
    error?: string;
    helper?: string;
    placeholder?: string;
    dialCode?: string;
    countryLabel?: string;
    onPressCountry?: () => void;
    editable?: boolean;
    autoFocus?: boolean;
  }
>(function PhoneInput(
  {
    label,
    value,
    onChangeText,
    error,
    helper,
    placeholder,
    dialCode = '+234',
    countryLabel,
    onPressCountry,
    editable,
    autoFocus,
  },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const colors = useThemeColors();

  return (
    <View className="gap-2">
      <Text className="font-sans text-label-md text-secondary">{label}</Text>
      <View
        className={
          `h-12 flex-row items-center gap-2 rounded-xl border bg-primary pl-1 pr-6 ` +
          (error ? 'border-danger' : focused ? 'border-focus' : 'border-default')
        }
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={countryLabel ?? `Country code ${dialCode}`}
          onPress={onPressCountry}
          disabled={!onPressCountry}
          hitSlop={4}
          className={`h-10 flex-row items-center gap-1 rounded-lg px-4 ${onPressCountry ? 'active:bg-tertiary' : ''}`}
        >
          <Text className="font-sans text-label-md text-primary">{dialCode}</Text>
          {onPressCountry ? <ChevronDown size={16} strokeWidth={1.5} color={colors.text.tertiary} /> : null}
        </Pressable>
        <RNTextInput
          ref={ref}
          accessibilityLabel={`${label}, ${dialCode}`}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.text.tertiary}
          keyboardType="phone-pad"
          autoComplete="tel-national"
          textContentType="telephoneNumber"
          maxLength={14}
          editable={editable}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="min-w-0 flex-1 font-sans text-body-md text-primary"
        />
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" className="font-sans text-body-sm text-danger">
          {error}
        </Text>
      ) : helper ? (
        <Text className="font-sans text-body-sm text-tertiary">{helper}</Text>
      ) : null}
    </View>
  );
});
