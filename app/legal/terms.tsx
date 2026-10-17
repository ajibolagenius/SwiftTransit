import { useTranslation } from 'react-i18next';
import { ScrollView, Text } from 'react-native';

import { AuthScaffold } from '@/components/auth-scaffold';

// Spec 0003: static placeholder legal pages. Real policy text is a follow-up.
export default function TermsScreen() {
  const { t } = useTranslation();
  return (
    <AuthScaffold title={t('legal.terms')}>
      <ScrollView>
        <Text className="font-sans text-body-md text-secondary">{t('legal.stub')}</Text>
      </ScrollView>
    </AuthScaffold>
  );
}
