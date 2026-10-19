import type { LucideIcon } from 'lucide-react-native';
import type { TextInput, TextInputProps } from 'react-native';
import { Text, TextInput as RNTextInput, View } from 'react-native';
import { forwardRef, useState } from 'react';

import { cn } from './cn';
import { useThemeColors } from '@/theme/use-theme';

// DESIGN.md inputs: label above, 48 px field (spacing step 12) with leading icon, focus and error borders.
export const Input = forwardRef<
  TextInput,
  TextInputProps & {
    label: string;
    error?: string;
    helper?: string;
    icon?: LucideIcon;
    multiline?: boolean;
  }
>(function Input(
  { label, error, helper, icon: Icon, multiline = false, className, onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const colors = useThemeColors();

  return (
    <View className={cn('gap-2', className)}>
      <Text className="font-sans text-label-md text-secondary">{label}</Text>
      <View
        className={cn(
          'flex-row gap-3 rounded-xl border bg-primary px-6',
          multiline ? 'items-start py-3' : 'h-12 items-center',
          error ? 'border-danger' : focused ? 'border-focus' : 'border-default',
        )}
      >
        {Icon ? (
          <Icon size={20} strokeWidth={1.5} color={colors.text.tertiary} accessibilityElementsHidden />
        ) : null}
        <RNTextInput
          ref={ref}
          {...rest}
          multiline={multiline}
          numberOfLines={multiline ? 4 : undefined}
          textAlignVertical={multiline ? 'top' : undefined}
          accessibilityLabel={label}
          accessibilityState={{ disabled: Boolean(rest.editable === false) }}
          placeholderTextColor={colors.text.tertiary}
          className="min-w-0 flex-1 font-sans text-body-md text-primary"
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
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
