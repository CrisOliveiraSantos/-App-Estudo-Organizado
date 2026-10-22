/**
 * Fundo ilustrado dos quatro temas da Dolla (Manhã, Tarde, Noite e Madrugada).
 *
 * Antes a cena era **desenhada em `react-native-svg`** (16 raios de sol,
 * 54 estrelas, 46 raios da explosão, 22 bolhas, ondas, serras…). Em teoria era
 * barato (alguns KB de marcação), mas no Android cada troca de tema obrigava o
 * renderizador a recriar centenas de nós e recompô-los — era o "lag de tema":
 * o toque no seletor de Ajustes travava por um instante e a interface só
 * terminava de trocar depois de um salto visível.
 *
 * Agora a arte é **raster** (PNG 2160×4320) e trocar de tema é um crossfade
 * entre duas `<Image>` com `resizeMode="cover"`: dois draws, `opacity` animada
 * no driver nativo, nenhum nó de SVG para reconciliar. A geometria continua no
 * repositório (`scripts/generate-theme-backgrounds.cjs`) — o script é a fonte
 * da arte; para mudar uma ilustração, edite-o e rode
 * `node scripts/generate-theme-backgrounds.cjs`.
 *
 * Contraste: por cima da imagem há um véu (`scrim`) na cor do tema. Sem ele o
 * céu/onda/estrela engole texto de 11-14 px. `vivid` corta o véu pela metade —
 * é o modo da tela de login, onde a arte é protagonista.
 */

import { memo, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useThemeScheme } from '@/lib/theme-provider';
import { themePalettes, themeSceneByScheme, type ThemeScene } from '@/lib/theme-runtime';

/**
 * `require` estático (e não caminho em string) para o Metro embutir os PNGs no
 * APK e o bundler do web copiá-los com hash para `_expo/static`.
 */
const SCENE_SOURCES: Record<ThemeScene, ImageSourcePropType> = {
  manha: require('../assets/brand/backgrounds/manha.png'),
  tarde: require('../assets/brand/backgrounds/tarde.png'),
  noite: require('../assets/brand/backgrounds/noite.png'),
  madrugada: require('../assets/brand/backgrounds/madrugada.png'),
};

/** Duração do crossfade na troca de tema (curto o bastante para não "arrastar"). */
const FADE_MS = 420;

function SceneLayer({
  fade,
  scene,
  vivid,
}: {
  /** Quando presente, a camada entra em fade (a anterior fica embaixo, opaca). */
  fade?: Animated.Value;
  scene: ThemeScene;
  vivid: boolean;
}) {
  const spec = themePalettes[scene];
  const scrimAlpha = Math.min(1, spec.scrimAlpha * (vivid ? 0.5 : 1));
  return (
    <Animated.View style={[styles.layer, { opacity: fade ?? 1 }]}>
      <Image
        accessibilityIgnoresInvertColors
        resizeMode="cover"
        source={SCENE_SOURCES[scene]}
        style={styles.image}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: spec.scrim, opacity: scrimAlpha }]} />
    </Animated.View>
  );
}


type ThemeBackgroundProps = {
  /** Opacidade da camada inteira (deixa as partículas do shell respirarem). */
  opacity?: number;
  /** Força uma cena; por padrão segue o tema ativo. */
  scene?: ThemeScene;
  style?: StyleProp<ViewStyle>;
  /** Véu mais leve: a arte aparece quase inteira (tela de login). */
  vivid?: boolean;
};

function ThemeBackgroundBase({ opacity = 1, scene, style, vivid = false }: ThemeBackgroundProps) {
  const scheme = useThemeScheme();
  const activeScene = scene ?? themeSceneByScheme[scheme] ?? null;
  /**
   * Duas camadas: `current` (a cena nova, entrando em fade) e `previous` (a
   * antiga, opaca embaixo). Guardar as duas evita o "salto seco" da troca e,
   * como cada cena é um PNG já decodificado, o custo é só mais um draw.
   */
  const [layers, setLayers] = useState<{ current: ThemeScene | null; previous: ThemeScene | null }>(
    () => ({ current: activeScene, previous: null }),
  );
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setLayers(state => (state.current === activeScene ? state : { current: activeScene, previous: state.current }));
  }, [activeScene]);

  const previous = layers.previous;
  useEffect(() => {
    if (!previous) return;
    fade.setValue(0);
    const animation = Animated.timing(fade, {
      duration: FADE_MS,
      easing: Easing.inOut(Easing.quad),
      toValue: 1,
      /** `opacity` roda no driver nativo: a thread de JS pode ser interrompida sem travar o fade. */
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (!finished) return;
      /** Fim do crossfade: a camada antiga sai da árvore (só a imagem nova fica). */
      setLayers(state => (state.previous ? { current: state.current, previous: null } : state));
    });
    return () => animation.stop();
  }, [fade, previous]);

  if (!layers.current && !layers.previous) return null;

  return (
    <View pointerEvents="none" style={[styles.container, { opacity }, style]}>
      {layers.previous ? <SceneLayer scene={layers.previous} vivid={vivid} /> : null}
      {layers.current ? (
        <SceneLayer fade={layers.previous ? fade : undefined} scene={layers.current} vivid={vivid} />
      ) : null}
    </View>
  );
}

/**
 * `memo`: o fundo é pintado por várias telas e não depende de nenhuma prop que
 * mude com teclado, formulário ou foco. Assina só `useThemeScheme` (nome do
 * tema), não a paleta: trocar de preferência que resolve para a mesma cena não
 * recria imagens.
 */
export const ThemeBackground = memo(ThemeBackgroundBase);
ThemeBackground.displayName = 'ThemeBackground';

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  image: { ...StyleSheet.absoluteFillObject, height: '100%', width: '100%' },
  layer: { ...StyleSheet.absoluteFillObject },
});
