import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';

import { Badge, Button, Card, Chip, Screen, Text } from '@/components/ui';
import { usePosts } from '@/lib/api/forum';
import { formatDateTime } from '@/lib/format';
import type { ForumCategory } from '@/types/db';

const CATEGORIES = [
  'all',
  'training',
  'behavior',
  'puppy',
  'nutrition',
  'health',
  'everyday',
  'other',
] as const;

export default function CommunityTab() {
  const { t } = useTranslation();
  const [category, setCategory] = useState<ForumCategory | 'all'>('all');
  const posts = usePosts(category);
  const items = posts.data?.pages.flat() ?? [];

  return (
    <Screen>
      <Text variant="title">{t('community.title')}</Text>
      <Button title={t('community.new')} onPress={() => router.push('/community/new')} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="grow-0"
        contentContainerClassName="items-center gap-2"
      >
        {CATEGORIES.map((c) => (
          <Chip
            key={c}
            label={t(`community.categories.${c}`)}
            selected={category === c}
            onPress={() => setCategory(c)}
          />
        ))}
      </ScrollView>
      {posts.isLoading ? <Text variant="caption">{t('common.loading')}</Text> : null}
      {!posts.isLoading && items.length === 0 ? (
        <Text variant="caption">{t('community.empty')}</Text>
      ) : null}
      {items.map((p) => (
        <Card
          key={p.id}
          onPress={() => router.push({ pathname: '/community/[id]', params: { id: p.id } })}
          accessibilityLabel={p.title}
        >
          <Badge label={t(`community.categories.${p.category}`)} />
          <Text className="font-semibold">{p.title}</Text>
          <Text variant="caption" numberOfLines={2}>
            {p.body}
          </Text>
          <Text variant="caption">
            {formatDateTime(p.created_at)} · {t('community.replies', { count: p.reply_count })} · ♥{' '}
            {p.like_count}
          </Text>
        </Card>
      ))}
      {posts.hasNextPage ? (
        <Button
          title={t('common.next')}
          variant="ghost"
          onPress={() => void posts.fetchNextPage()}
          loading={posts.isFetchingNextPage}
        />
      ) : null}
      <Text variant="caption">{t('community.rules')}</Text>
    </Screen>
  );
}
