import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/theme';
import { LANGUAGES, Language } from '@/data/languages';
import { MASTERED_BOX } from '@/lib/leitner';
import { loadDeck, resetDeck } from '@/lib/storage';

type Summary = { due: number; learned: number; mastered: number };

type SummaryMap = Record<string, Summary>;

const EMPTY: Summary = { due: 0, learned: 0, mastered: 0 };

export default function HomeScreen() {
  const theme = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const [summaries, setSummaries] = useState<SummaryMap | null>(null);

  const refresh = useCallback(() => {
    let cancelled = false;
    (async () => {
      const now = Date.now();
      const entries = await Promise.all(
        LANGUAGES.map(async (language) => {
          const deck = await loadDeck(language.id);
          let due = 0;
          let learned = 0;
          let mastered = 0;
          for (const key of Object.keys(deck)) {
            const card = deck[key];
            learned += 1;
            if (card.box >= MASTERED_BOX) mastered += 1;
            if (card.due <= now) due += 1;
          }
          return [language.id, { due, learned, mastered }] as const;
        })
      );
      if (!cancelled) setSummaries(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useFocusEffect(refresh);

  const confirmReset = (language: Language) => {
    Alert.alert(
      `Reset ${language.name} deck?`,
      'All Leitner box progress for this language will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetDeck(language.id);
            refresh();
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top + Spacing.four }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>LearnLang</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Leitner flashcards — 1000 most frequent words per language
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {LANGUAGES.map((language) => {
          const summary = summaries?.[language.id] ?? EMPTY;
          const progress = summary.learned / language.words.length;
          return (
            <Pressable
              key={language.id}
              onPress={() => router.push({ pathname: '/study', params: { lang: language.id } })}
              onLongPress={() => confirmReset(language)}
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
                pressed && styles.pressed,
              ]}>
              <View style={[styles.badge, { backgroundColor: theme.backgroundSelected }]}>
                <Text style={[styles.badgeText, { color: theme.text }]}>{language.id.toUpperCase()}</Text>
              </View>
              <View style={styles.rowBody}>
                <View style={styles.rowTitleLine}>
                  <Text style={[styles.rowTitle, { color: theme.text }]}>{language.name}</Text>
                  <Text style={[styles.rowNative, { color: theme.textSecondary }]}>{language.nativeName}</Text>
                </View>
                {summaries ? (
                  <>
                    <Text style={[styles.rowStats, { color: theme.textSecondary }]}>
                      {summary.due > 0
                        ? `${summary.due} due now`
                        : `No cards due${summary.learned ? '' : ' — start with 20 new words'}`}
                      {'  ·  '}
                      {summary.learned}/{language.words.length} learned
                      {summary.mastered > 0 ? `  ·  ${summary.mastered} mastered` : ''}
                    </Text>
                    <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
                      <View style={[styles.fill, { width: `${Math.round(progress * 100)}%`, backgroundColor: ACCENT }]} />
                    </View>
                  </>
                ) : (
                  <Text style={[styles.rowStats, { color: theme.textSecondary }]}>Loading…</Text>
                )}
              </View>
            </Pressable>
          );
        })}
        <Text style={[styles.footnote, { color: theme.textSecondary }]}>
          Tip: long-press a language to reset its deck.
        </Text>
      </ScrollView>
    </View>
  );
}

const ACCENT = '#0274DF';

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.three },
  title: { fontSize: 30, fontWeight: '800' },
  subtitle: { fontSize: 14, marginTop: Spacing.half },
  list: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.six },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  pressed: { opacity: 0.75 },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.three,
  },
  badgeText: { fontSize: 15, fontWeight: '700' },
  rowBody: { flex: 1 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two },
  rowTitle: { fontSize: 18, fontWeight: '700' },
  rowNative: { fontSize: 15 },
  rowStats: { fontSize: 13, marginTop: Spacing.one },
  track: {
    height: 6,
    borderRadius: 3,
    marginTop: Spacing.two,
    overflow: 'hidden',
  },
  fill: { height: 6, borderRadius: 3 },
  footnote: { fontSize: 12, textAlign: 'center', marginTop: Spacing.two },
});
