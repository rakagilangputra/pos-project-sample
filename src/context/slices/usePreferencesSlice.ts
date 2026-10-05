import { useEffect, useState } from 'react';
import { posSound } from '../../utils/formatters';

/**
 * Preferences slice of the POS store.
 *
 * Owns: UI language and sound toggle (state + persistence + applying the sound
 * flag to the `posSound` helper). Extracted verbatim from POSContext. It has no
 * dependencies on other slices, which makes it the safest first slice to split
 * out of the old god-context.
 */
export function usePreferencesSlice() {
  // Locale & Sound
  const [lang, setLang] = useState<'id' | 'en'>(() => {
    return (localStorage.getItem('pos_lang') as 'id' | 'en') || 'id';
  });
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('pos_sound') !== 'false';
  });

  useEffect(() => {
    localStorage.setItem('pos_lang', lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('pos_sound', String(soundEnabled));
    posSound.enabled = soundEnabled;
  }, [soundEnabled]);

  return { lang, setLang, soundEnabled, setSoundEnabled };
}
