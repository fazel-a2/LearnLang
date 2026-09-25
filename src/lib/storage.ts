import AsyncStorage from '@react-native-async-storage/async-storage';

import { DeckState } from '@/lib/leitner';

const key = (lang: string) => `learnlang:deck:${lang}`;

export async function loadDeck(lang: string): Promise<DeckState> {
  const raw = await AsyncStorage.getItem(key(lang));
  if (!raw) return {};
  try {
    return JSON.parse(raw) as DeckState;
  } catch {
    return {};
  }
}

export function saveDeck(lang: string, deck: DeckState): Promise<void> {
  return AsyncStorage.setItem(key(lang), JSON.stringify(deck));
}

export function resetDeck(lang: string): Promise<void> {
  return AsyncStorage.removeItem(key(lang));
}
