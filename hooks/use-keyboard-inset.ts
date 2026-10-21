/**
 * Altura do teclado que ainda **cobre** a tela, já descontando duas coisas:
 *
 * 1. o `insets.bottom` que o `ScreenContainer`/`SafeAreaView` já reserva;
 * 2. o quanto a janela encolheu sozinha (`adjustResize` no Android).
 *
 * Sem o item 2 o compositor do chat subia duas vezes no Android (uma pelo
 * resize da janela e outra pelo padding manual) e deixava um vão branco sobre o
 * teclado; sem o item 1 sobrava a faixa do gesto de navegação.
 *
 * Só `Keyboard` + `useWindowDimensions` do core — nenhuma dependência nova.
 * Na web os eventos de teclado virtual não existem e o hook devolve zeros.
 */

import { useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type KeyboardInset = {
  /** Altura bruta reportada pelo sistema (útil para animações). */
  height: number;
  /** Padding que o conteúdo precisa somar para não ficar sob o teclado. */
  inset: number;
  /** `true` quando o teclado está efetivamente cobrindo a tela. */
  visible: boolean;
};

export function useKeyboardInset(): KeyboardInset {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  /** Maior altura de janela já vista: a referência para detectar `adjustResize`. */
  const tallestWindow = useRef(windowHeight);

  useEffect(() => {
    if (windowHeight > tallestWindow.current) tallestWindow.current = windowHeight;
  }, [windowHeight]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, event => setKeyboardHeight(event.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const resizedByWindow = Math.max(0, tallestWindow.current - windowHeight);
  const covered = Math.max(0, keyboardHeight - resizedByWindow);
  return {
    height: keyboardHeight,
    inset: Math.max(0, covered - insets.bottom),
    visible: covered > 24,
  };
}
