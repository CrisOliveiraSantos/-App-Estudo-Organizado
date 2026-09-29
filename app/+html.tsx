import { ScrollViewStyleReset } from 'expo-router/html';
import type { ReactNode } from 'react';

export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Estudo Organizado — Planejamento, Editor e Cris</title>
        <meta name="description" content="Estudo Organizado: planeje seus estudos, organize materiais, use editor acadêmico, editor de código e converse com a Cris." />
        <meta name="theme-color" content="#F8F9FA" />
        <meta property="og:title" content="Estudo Organizado — Cris" />
        <meta property="og:description" content="Um espaço acadêmico para planejar, escrever, programar e estudar com organização." />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="pt_BR" />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href="https://crisoliveirasantos.github.io/-App-Estudo-Organizado/" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
