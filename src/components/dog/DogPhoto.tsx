import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { View } from 'react-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useSignedUrl } from '@/lib/api/storage';

type Props = {
  path: string | null | undefined;
  size?: number;
  localUri?: string | null;
  label: string;
};

/** Foto des Hundes (privater Bucket, signierte URL) – prominent laut CLAUDE.md §9. */
export function DogPhoto({ path, size = 96, localUri, label }: Props) {
  const colors = useThemeColors();
  const url = useSignedUrl('dog-photos', localUri ? null : path);
  const uri = localUri ?? url.data;
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={label}
      className="items-center justify-center overflow-hidden rounded-full bg-border dark:bg-border-dark"
      style={{ width: size, height: size }}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size }}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <Ionicons name="paw" size={size * 0.4} color={colors.muted} />
      )}
    </View>
  );
}
