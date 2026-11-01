import { router } from 'expo-router';

import { DogForm } from '@/components/dog/DogForm';
import { Screen } from '@/components/ui';

export default function NewDogScreen() {
  return (
    <Screen>
      <DogForm onSaved={() => router.back()} />
    </Screen>
  );
}
