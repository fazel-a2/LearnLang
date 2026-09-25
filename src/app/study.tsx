import { Link, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Spacing, ThemeColor } from '@/constants/theme';
import { getLanguage } from '@/data/languages';
import {
  BOXES,
  CardState,
  DeckState,
  buildSession,
  dueIndices,
  formatRemaining,
  nextReviewAt,
} from '@/lib/leitner';
import { loadDeck, saveDeck } from '@/lib/storage';

const REQUEUE_WINDOW_MS = 20 * 60_000;
const ACCENT = '#0274DF';
const AGAIN = '#D7443E';
const GOT_IT = '#2E9E5B';

type Phase = 'loading' | 'study' | 'waiting' | 'done';

type Theme = Record<ThemeColor, string>;

export default function StudyScreen() {
  const { lang } = useLocalSearchParams<{ lang: string }>();
  const language = getLanguage(lang);
  const theme = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();

  const [deck, setDeck] = useState<DeckState | null>(null);
  const [queue, setQueue] = useState<number[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [phase, setPhase] = useState<Phase>('loading');
  const [nextDue, setNextDue] = useState<number | null>(null);
  const [nextDueText, setNextDueText] = useState('');
  const [tick, setTick] = useState(0);

  const deckRef = useRef<DeckState | null>(null);

  useEffect(() => {
    if (!language) return;
    let cancelled = false;
    (async () => {
      const loaded = await loadDeck(language.id);
      if (cancelled) return;
      deckRef.current = loaded;
      setDeck(loaded);
      applyQueue(loaded, buildSession(loaded, language.words.length, Date.now()));
    })();
    return () => {
      cancelled = true;
    };
  }, [language]);

  useEffect(() => {
    if (phase !== 'waiting') return;
    const interval = setInterval(() => {
      const current = deckRef.current;
      if (!current) return;
      const now = Date.now();
      setTick(now);
      const due = dueIndices(current, now);
      if (due.length > 0) {
        setQueue(due);
        setPhase('study');
      }
    }, 500);
    return () => clearInterval(interval);
  }, [phase]);

  function applyQueue(deckState: DeckState, first: number[]) {
    const now = Date.now();
    if (first.length > 0) {
      setQueue(first);
      setPhase('study');
      return;
    }
    const due = dueIndices(deckState, now);
    if (due.length > 0) {
      setQueue(due);
      setPhase('study');
      return;
    }
    const nearest = nextReviewAt(deckState, now);
    setNextDue(nearest);
    setNextDueText(nearest !== null ? formatRemaining(nearest - now) : '');
    setTick(now);
    setPhase(nearest !== null && nearest - now <= REQUEUE_WINDOW_MS ? 'waiting' : 'done');
  }

  if (!language) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text, fontSize: 16 }}>Unknown language.</Text>
        <Link href="/" style={{ color: ACCENT, marginTop: Spacing.three }}>
          Back to languages
        </Link>
      </View>
    );
  }

  const answer = (index: number, box: number) => {
    const current = deckRef.current;
    if (!current) return;
    const updated: DeckState = {
      ...current,
      [index]: { box, due: Date.now() + BOXES[box].ms },
    };
    deckRef.current = updated;
    setDeck(updated);
    void saveDeck(language.id, updated);
    setReviewed((r) => r + 1);
    setRevealed(false);
    const remaining = queue.slice(1);
    setQueue(remaining);
    applyQueue(updated, remaining);
  };

  const grade = (box: number) => {
    const id = queue[0];
    if (id === undefined) return;
    answer(id, box);
  };

  const gotIt = () => {
    const id = queue[0];
    if (id === undefined) return;
    const previous: CardState | undefined = deckRef.current?.[id];
    grade(Math.min((previous?.box ?? -1) + 1, BOXES.length - 1));
  };

  const restartSession = () => {
    const current = deckRef.current;
    if (!current) return;
    setReviewed(0);
    setRevealed(false);
    applyQueue(current, buildSession(current, language.words.length, Date.now()));
  };

  const card = queue.length > 0 ? language.words[queue[0]] : undefined;
  const currentBox = card !== undefined && deck ? deck[queue[0]]?.box ?? -1 : -1;
  const remainingNew = language.words.length - Object.keys(deck ?? {}).length;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          paddingTop: insets.top + Spacing.three,
          paddingBottom: insets.bottom + Spacing.three,
        },
      ]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
          <Text style={{ color: theme.text, fontSize: 22 }}>←</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{language.name}</Text>
          <Text style={[styles.headerSub, { color: theme.textSecondary }]}>
            {reviewed} reviewed · {queue.length} in queue
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {phase === 'loading' && <CenterMessage theme={theme} text="Loading deck…" />}

      {phase === 'study' && card && (
        <>
          <Pressable
            onPress={() => setRevealed((r) => !r)}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
              pressed && { opacity: 0.9 },
            ]}>
            <Text style={[styles.word, { color: theme.text }, language.rtl && styles.rtl]}>
              {card.word}
            </Text>
            {revealed ? (
              <View style={styles.revealed}>
                {card.roman ? (
                  <Text style={[styles.roman, { color: theme.textSecondary }]}>{card.roman}</Text>
                ) : null}
                <Text style={[styles.meaning, { color: theme.text }]}>{card.meaning}</Text>
              </View>
            ) : (
              <Text style={[styles.hint, { color: theme.textSecondary }]}>Tap to reveal</Text>
            )}
            {currentBox >= 0 && (
              <View style={[styles.boxTag, { backgroundColor: theme.backgroundSelected }]}>
                <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                  Box {currentBox + 1} · {BOXES[currentBox].label}
                </Text>
              </View>
            )}
          </Pressable>

          {revealed ? (
            <View style={styles.grading}>
              <View style={styles.gradeRow}>
                <GradeButton label="Again" color={AGAIN} onPress={() => grade(0)} theme={theme} />
                <GradeButton label="Got it" color={GOT_IT} onPress={gotIt} theme={theme} />
              </View>
              <Text style={[styles.chipsLabel, { color: theme.textSecondary }]}>
                Repeat this word in
              </Text>
              <View style={styles.chips}>
                {BOXES.map((box, i) => (
                  <Pressable
                    key={box.short}
                    onPress={() => grade(i)}
                    style={({ pressed }) => [
                      styles.chip,
                      {
                        backgroundColor: i === currentBox ? ACCENT : theme.backgroundElement,
                        borderColor: theme.backgroundSelected,
                      },
                      pressed && { opacity: 0.7 },
                    ]}>
                    <Text
                      style={{
                        color: i === currentBox ? '#ffffff' : theme.text,
                        fontSize: 14,
                        fontWeight: '600',
                      }}>
                      {box.short}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            <Text style={[styles.chipsLabel, { color: theme.textSecondary, textAlign: 'center' }]}>
              Recall the meaning, then tap the card
            </Text>
          )}
        </>
      )}

      {phase === 'waiting' && (
        <CenterMessage
          theme={theme}
          text={`Nothing due right now.\nNext card in ${formatRemaining(Math.max((nextDue ?? tick) - tick, 0))}`}
          sub="Keep the app open and the word will come back automatically."
        />
      )}

      {phase === 'done' && (
        <View style={styles.center}>
          <Text style={[styles.doneTitle, { color: theme.text }]}>Session complete</Text>
          <Text style={[styles.doneSub, { color: theme.textSecondary }]}>
            {reviewed} card{reviewed === 1 ? '' : 's'} reviewed
            {nextDueText ? ` · next review in ${nextDueText}` : ''}
            {remainingNew > 0 ? ` · ${remainingNew} words not started yet` : ''}
          </Text>
          <Pressable
            onPress={restartSession}
            style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.8 }]}>
            <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '700' }}>Study more</Text>
          </Pressable>
          <Link href="/" style={{ color: ACCENT, marginTop: Spacing.three, fontSize: 15 }}>
            Done
          </Link>
        </View>
      )}
    </View>
  );
}

function CenterMessage({ theme, text, sub }: { theme: Theme; text: string; sub?: string }) {
  return (
    <View style={styles.center}>
      <Text style={[styles.waiting, { color: theme.text }]}>{text}</Text>
      {sub ? (
        <Text style={[styles.hint, { color: theme.textSecondary, marginTop: Spacing.two }]}>{sub}</Text>
      ) : null}
    </View>
  );
}

function GradeButton({ label, color, onPress, theme }: { label: string; color: string; onPress: () => void; theme: Theme }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.gradeButton,
        { backgroundColor: theme.backgroundElement, borderColor: color },
        pressed && { opacity: 0.7 },
      ]}>
      <Text style={{ color, fontSize: 16, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: Spacing.four },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.three },
  backButton: { width: 40, alignItems: 'flex-start' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  headerSub: { fontSize: 12, marginTop: 2 },
  card: {
    flex: 1,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  word: { fontSize: 48, fontWeight: '700', textAlign: 'center' },
  rtl: { writingDirection: 'rtl' },
  revealed: { marginTop: Spacing.four, alignItems: 'center' },
  roman: { fontSize: 16, marginBottom: Spacing.one },
  meaning: { fontSize: 24, fontWeight: '500', textAlign: 'center' },
  hint: { fontSize: 14, marginTop: Spacing.four },
  waiting: { fontSize: 18, textAlign: 'center', lineHeight: 28 },
  boxTag: {
    position: 'absolute',
    top: Spacing.three,
    right: Spacing.three,
    borderRadius: 10,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
  },
  grading: { marginTop: Spacing.three },
  gradeRow: { flexDirection: 'row', gap: Spacing.three },
  gradeButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  chipsLabel: { fontSize: 13, marginTop: Spacing.three, marginBottom: Spacing.two, textAlign: 'center' },
  chips: { flexDirection: 'row', justifyContent: 'space-between' },
  chip: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  primaryButton: {
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingHorizontal: Spacing.six,
    paddingVertical: Spacing.three,
    marginTop: Spacing.four,
  },
  doneTitle: { fontSize: 26, fontWeight: '800' },
  doneSub: { fontSize: 14, textAlign: 'center', marginTop: Spacing.two, lineHeight: 20 },
});
