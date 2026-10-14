import type { TextInput } from 'react-native';
import { forwardRef, useState } from 'react';
import { Text, TextInput as RNTextInput, View } from 'react-native';

import { cn } from './cn';

const OTP_LENGTH = 6; // DESIGN.md: 6 single-digit boxes, two groups of three separated by a dash.

export const OtpInput = forwardRef<
  TextInput,
  {
    label: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    onComplete?: (value: string) => void;
  }
>(function OtpInput({ label, value, onChange, error, onComplete }, ref) {
  const [focused, setFocused] = useState(false);
  const digits = value.slice(0, OTP_LENGTH);
  const caretIndex = digits.length; // the box the next digit lands in; highlighted while focused

  return (
    <View className="gap-2">
      <Text className="font-sans text-label-md text-secondary">{label}</Text>
      <View className="h-12 flex-row items-stretch gap-2">
        {/* Decorative boxes: the single invisible input below owns typing, paste and autofill. */}
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          className="absolute inset-0 flex-row items-center gap-2"
        >
          {Array.from({ length: OTP_LENGTH }, (_, i) => (
            <Box
              key={i}
              digit={digits[i]}
              after={i === 2}
              active={focused && i === caretIndex}
              invalid={Boolean(error)}
            />
          ))}
        </View>
        <RNTextInput
          ref={ref}
          accessibilityLabel={label}
          value={digits}
          onChangeText={(text) => {
            const next = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
            onChange(next);
            if (next.length === OTP_LENGTH) onComplete?.(next);
          }}
          className="absolute inset-0 opacity-0"
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          selectionColor="transparent"
          caretHidden
          maxLength={OTP_LENGTH}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" className="font-sans text-body-sm text-danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
});

function Box({
  digit,
  after,
  active,
  invalid,
}: {
  digit?: string;
  after: boolean;
  active: boolean;
  invalid: boolean;
}) {
  return (
    <>
      <View
        className={cn(
          'flex-1 items-center justify-center rounded-xl border bg-primary',
          invalid ? 'border-danger' : active ? 'border-focus' : 'border-default',
        )}
      >
        <Text className="font-sans text-h3 text-primary">{digit ?? ''}</Text>
      </View>
      {after ? <Text className="font-sans text-h4 text-tertiary">-</Text> : null}
    </>
  );
}
