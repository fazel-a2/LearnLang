import de from '@/data/words/de.json';
import en from '@/data/words/en.json';
import fa from '@/data/words/fa.json';
import hy from '@/data/words/hy.json';
import ru from '@/data/words/ru.json';
import sv from '@/data/words/sv.json';
import { Word } from '@/lib/leitner';

export type LanguageId = 'en' | 'fa' | 'hy' | 'ru' | 'de' | 'sv';

export type Language = {
  id: LanguageId;
  name: string;
  nativeName: string;
  rtl: boolean;
  words: Word[];
};

export const LANGUAGES: Language[] = [
  { id: 'en', name: 'English', nativeName: 'English', rtl: false, words: en as Word[] },
  { id: 'fa', name: 'Persian', nativeName: 'فارسی', rtl: true, words: fa as Word[] },
  { id: 'hy', name: 'Armenian', nativeName: 'Հայերեն', rtl: false, words: hy as Word[] },
  { id: 'ru', name: 'Russian', nativeName: 'Русский', rtl: false, words: ru as Word[] },
  { id: 'de', name: 'German', nativeName: 'Deutsch', rtl: false, words: de as Word[] },
  { id: 'sv', name: 'Swedish', nativeName: 'Svenska', rtl: false, words: sv as Word[] },
];

export function getLanguage(id: string | undefined): Language | undefined {
  return LANGUAGES.find((l) => l.id === id);
}
