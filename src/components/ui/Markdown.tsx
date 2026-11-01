import { View } from 'react-native';

import { Text } from './Text';

/**
 * Minimaler Markdown-Renderer für KI-Texte: Überschriften (#), Listen (-, *, 1.), Absätze, **fett**.
 * Kein HTML, keine Links – bewusst einfach und sicher.
 */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <Text>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? (
          <Text key={i} className="font-semibold">
            {p.slice(2, -2)}
          </Text>
        ) : (
          p.replace(/\*([^*]+)\*/g, '$1')
        ),
      )}
    </Text>
  );
}

export function Markdown({ children }: { children: string }) {
  const blocks = children.replace(/\r/g, '').split(/\n{2,}/);
  return (
    <View className="gap-3">
      {blocks.map((block, bi) => {
        const lines = block.split('\n').filter((l) => l.trim().length > 0);
        if (lines.length === 0) return null;
        const heading = lines[0]!.match(/^#{1,6}\s+(.*)$/);
        if (heading && lines.length === 1) {
          return (
            <Text key={bi} variant="subtitle" accessibilityRole="header">
              {heading[1]}
            </Text>
          );
        }
        if (lines.every((l) => /^\s*([-*•]|\d+\.)\s+/.test(l))) {
          return (
            <View key={bi} className="gap-1.5">
              {lines.map((l, li) => {
                const m = l.match(/^\s*([-*•]|\d+\.)\s+(.*)$/)!;
                const bullet = /\d+\./.test(m[1]!) ? m[1]! : '•';
                return (
                  <View key={li} className="flex-row gap-2">
                    <Text className="w-5">{bullet}</Text>
                    <View className="flex-1">
                      <Inline text={m[2]!} />
                    </View>
                  </View>
                );
              })}
            </View>
          );
        }
        return (
          <View key={bi} className="gap-1">
            {lines.map((l, li) => {
              const h = l.match(/^#{1,6}\s+(.*)$/);
              return h ? (
                <Text key={li} variant="subtitle" accessibilityRole="header">
                  {h[1]}
                </Text>
              ) : (
                <Inline key={li} text={l} />
              );
            })}
          </View>
        );
      })}
    </View>
  );
}
