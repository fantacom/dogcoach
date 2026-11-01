import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AuthorLine } from '@/components/community/AuthorLine';
import { ReportPanel } from '@/components/community/ReportSheet';
import {
  Badge,
  Button,
  Card,
  ErrorView,
  InlineError,
  LoadingView,
  Markdown,
  Screen,
  Text,
  TextField,
} from '@/components/ui';
import { useConfigValue } from '@/lib/api/admin';
import { FunctionError } from '@/lib/api/functions';
import {
  precheck,
  useBlockUser,
  useCreateReply,
  useDeleteOwn,
  useMarkBest,
  useMyLikes,
  usePost,
  useToggleLike,
} from '@/lib/api/forum';
import { useSignedUrl } from '@/lib/api/storage';
import { confirm, notify } from '@/lib/dialogs';
import { useAuthStore } from '@/stores/authStore';

export default function PostScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useAuthStore((s) => s.session?.user.id);
  const data = usePost(id);
  const likes = useMyLikes();
  const toggleLike = useToggleLike(id);
  const markBest = useMarkBest(id);
  const reply = useCreateReply(id);
  const block = useBlockUser();
  const remove = useDeleteOwn(id);
  const image = useSignedUrl('forum-images', data.data?.post.image_url);
  const hours = useConfigValue('forum_ai_reply_after_hours');
  const contact = useConfigValue('contact_email');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<{ type: 'post' | 'reply' | 'user'; id: string } | null>(
    null,
  );

  if (data.isLoading) return <LoadingView />;
  if (!data.data) return <ErrorView onRetry={() => void data.refetch()} />;
  const { post, replies, names } = data.data;
  const isMine = post.author_id === me;
  const liked = (type: 'post' | 'reply', tid: string) => likes.data?.has(`${type}:${tid}`) ?? false;

  async function send() {
    const check = precheck(text);
    if (!check.ok) return setError(t(`community.filter.${check.reason}`));
    if (text.trim().length < 2) return;
    setError(null);
    try {
      await reply.mutateAsync(text.trim());
      setText('');
    } catch (e) {
      if (e instanceof FunctionError && e.status === 422)
        setError(t(`community.filter.${e.code}` as never));
      else if (e instanceof FunctionError && e.status === 429) setError(t('community.rateLimited'));
      else setError(t('common.error'));
    }
  }

  async function onBlock(userId: string) {
    const ok = await confirm({
      title: t('community.blockTitle'),
      message: t('community.blockBody'),
      confirmLabel: t('community.block'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    await block.mutateAsync(userId);
    notify(t('community.blocked'));
    router.back();
  }

  async function onDelete(type: 'post' | 'reply', tid: string) {
    const ok = await confirm({
      title: t('community.deleteOwn'),
      message: '',
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    await remove.mutateAsync({ type, id: tid });
    if (type === 'post') router.back();
  }

  const actions = (type: 'post' | 'reply', tid: string, authorId: string | null) => (
    <View className="gap-2">
      {report?.id === tid ? <ReportPanel target={report} onClose={() => setReport(null)} /> : null}
      <View className="flex-row flex-wrap gap-1">
        <Button
          title={`♥ ${t('community.like')}`}
          variant={liked(type, tid) ? 'secondary' : 'ghost'}
          className="min-h-9 px-3 py-1"
          onPress={() => toggleLike.mutate({ type, id: tid, liked: liked(type, tid) })}
        />
        {authorId === me ? (
          <Button
            title={t('common.delete')}
            variant="ghost"
            className="min-h-9 px-3 py-1"
            onPress={() => void onDelete(type, tid)}
          />
        ) : (
          <>
            <Button
              title={t('community.report')}
              variant="ghost"
              className="min-h-9 px-3 py-1"
              onPress={() => setReport({ type, id: tid })}
            />
            {authorId ? (
              <Button
                title={t('community.block')}
                variant="ghost"
                className="min-h-9 px-3 py-1"
                onPress={() => void onBlock(authorId)}
              />
            ) : null}
          </>
        )}
      </View>
    </View>
  );

  return (
    <Screen>
      <Badge label={t(`community.categories.${post.category}`)} />
      <Text variant="title">{post.title}</Text>
      <AuthorLine
        isAi={post.is_ai}
        name={post.author_id ? names[post.author_id] : null}
        createdAt={post.created_at}
      />
      {post.dog_snapshot?.breed ? (
        <Text variant="caption">
          {t('community.dogInfo', {
            breed: post.dog_snapshot.breed,
            phase: post.dog_snapshot.phase ?? '',
          })}
        </Text>
      ) : null}
      <Text>{post.body}</Text>
      {image.data ? (
        <Image
          source={{ uri: image.data }}
          style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 24 }}
          contentFit="cover"
        />
      ) : null}
      {actions('post', post.id, post.author_id)}

      <Text variant="subtitle">{t('community.replies', { count: replies.length })}</Text>
      {replies.length === 0 ? (
        <Text variant="caption">
          {t('community.noReplies', { hours: typeof hours === 'number' ? hours : 6 })}
        </Text>
      ) : null}
      {replies.map((r) => (
        <Card key={r.id} className={r.is_best ? 'border-primary dark:border-primary-dark' : ''}>
          {r.is_best ? <Badge label={t('community.best')} tone="primary" /> : null}
          <AuthorLine
            isAi={r.is_ai}
            name={r.author_id ? names[r.author_id] : null}
            createdAt={r.created_at}
          />
          {r.is_ai ? <Markdown>{r.body}</Markdown> : <Text>{r.body}</Text>}
          {actions('reply', r.id, r.author_id)}
          {isMine && !r.is_best ? (
            <Button
              title={t('community.markBest')}
              variant="ghost"
              className="min-h-9 px-3 py-1"
              onPress={() => markBest.mutate(r.id)}
            />
          ) : null}
        </Card>
      ))}

      <TextField
        label={t('community.reply')}
        placeholder={t('community.replyPlaceholder')}
        value={text}
        onChangeText={setText}
        multiline
        maxLength={4000}
      />
      <InlineError message={error} />
      <Button
        title={t('community.send')}
        onPress={send}
        loading={reply.isPending}
        disabled={text.trim().length < 2}
      />
      {typeof contact === 'string' ? (
        <Text variant="caption">{t('community.contact', { email: contact })}</Text>
      ) : null}
    </Screen>
  );
}
