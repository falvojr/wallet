# 0011. Material Design 3 como referência visual, com design tokens em CSS

- **Data**: 2026-06-11
- **Status**: Aceita
- **Tipo**: Técnica

## Contexto

Sem biblioteca de componentes, a interface precisa de uma referência de design consistente para cores, tipografia, espaçamento, estados de interação e acessibilidade visual.

## Decisão

Usar o Material Design 3 (M3) como referência, implementado à mão em `style.css`:

- Design tokens como CSS custom properties em `:root` (cores, tipografia, raios, easing, alvo mínimo de toque).
- Tema escuro como padrão e tema claro via `[data-theme="light"]`, que apenas redefine tokens.
- Componentes no espírito M3: botões filled, tonal e text, icon buttons com state layer (`::after` com opacidade), chips, badges e dialogs.
- Cada classe de ativo tem uma cor própria (`--card-color`), definida por tema e aplicada via atributos `data-goto`/`data-tab`.

## Consequências

- Visual consistente sem dependência externa; mudar o tema é redefinir tokens, não reescrever regras.
- Novos componentes devem usar os tokens existentes em vez de valores soltos.
- A paleta por classe precisa ser mantida nos dois temas, com contraste adequado em ambos.
- M3 é referência, não especificação: desvios conscientes são aceitáveis quando simplificam.
