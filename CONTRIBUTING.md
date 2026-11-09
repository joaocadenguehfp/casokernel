# Como contribuir com o Caso Kernel

Obrigado por querer ajudar! As contribuições mais valiosas costumam ser de conteúdo: um enunciado mais claro, uma dica melhor, um problema novo ou um caso inteiro. Este guia mostra onde cada coisa fica e o que precisa estar certo antes de abrir um pull request.

- Achou uma resposta errada ou uma explicação confusa? [Abra uma issue](../../issues/new/choose) com o modelo "Resposta errada".
- Tem uma ideia de problema, mas não quer mexer no código? Use o modelo "Sugestão de problema".

## Antes de começar

```bash
npm install
```

```bash
npx playwright install chromium
```

Rode o jogo localmente com `npx serve .` (ou `python3 -m http.server`). O jogo não tem etapa de build: edite os arquivos e recarregue a página.

## Regra de ouro: toda resposta é conferida

`tools/validate.js` recalcula a resposta de cada fase de forma independente, com álgebra linear numérica. **Toda fase nova precisa de uma entrada no objeto `V` desse arquivo**, com a chave `"idDoCaso:índice"`, que calcula a resposta sem olhar o campo `a`. Para fases de múltipla escolha, a função devolve o índice da alternativa certa. Sem essa entrada, a validação falha.

Antes do pull request:

```bash
npm test
```

## Problemas (`cases.js`)

`SEEDS` é a lista de casos. Cada caso tem `id` (estável, usado no save e nos recordes: nunca o troque depois de publicado), `nome`, `ic` (emoji), `intro` e `casos`, com exatamente 10 fases. A última fase é o chefão.

```js
{d:"m", t:"Ponto cego", type:"num",
 q:"Qual é a nulidade de $T(x_1,x_2)=(x_1,0)$?",
 a:[1], k:"ker",
 h:["Resolva $T(x)=0$: sobra $x_1=0$.","O núcleo é gerado por $(0,1)$."],
 e:"N(T)={(0,x₂)} tem dimensão 1 (e o posto também é 1)."}
```

| Campo | Significado |
|---|---|
| `d` | Dificuldade: `"f"` fácil, `"m"` médio, `"d"` difícil, `"b"` chefão |
| `t` | Título da pista |
| `s` | Narrativa (opcional, aparece em itálico) |
| `q` | Enunciado |
| `type` | `"num"` (resposta numérica) ou `"choice"` (múltipla escolha) |
| `a` | Resposta: lista de números em `"num"`; índice da alternativa certa em `"choice"` |
| `o` | Alternativas (só em `"choice"`, de 2 a 4) |
| `h` | Exatamente 2 dicas, da mais leve para a mais forte |
| `e` | Explicação que aparece no dossiê |
| `k` | Chave da ficha em `FL` (conceito-chave e dica de prova) |

**Matemática nos textos:** escreva entre `$...$`. O renderizador entende `mat(1,2;3,4)` (matriz, linhas separadas por `;`), `RR` (ℝ), `->` (→), `x^2`, `x^{-1}` e `x_1`. O subscrito pega só um número ou uma letra: `c_1x` vira c₁x. Para expoentes com mais de uma letra, use chaves: `A^{T}A`.

### Problemas sorteados (`g`)

Uma fase pode gerar números novos a cada partida:

```js
g:R=>{const y=[R.nz(-7,9),R.nz(-7,9)],x=[y[0],-y[1]];
  return {p:{y},a:x,q:"$T(x_1,x_2)=(x_1,-x_2)$ é inversível. Calcule $T^{-1}"+tup(y)+"$.",
    e:"T⁻¹=T, então T⁻¹"+ttup(y)+"="+ttup(x)+"."}},
```

- `R.int(a,b)`, `R.nz(a,b)` (sem zero) e `R.pick(lista)` usam o gerador reprodutível da partida.
- Devolva junto `q`, `a`, `h` e `e` que dependem dos números, e os parâmetros em `p`: o validador usa `P.p` para recalcular a resposta.
- `g` não pode trocar `t`, `k`, `d` nem `type`.
- Prefira **sortear a resposta primeiro e montar o problema a partir dela**: assim os números ficam inteiros ou com frações simples.
- Auxiliares de formatação: `tup`, `ttup`, `lc` (combinação linear), `poly`, `polyT`, `charStr`, `neg`, `dec`.
- Se a arte da cena mostrar números do problema, não sorteie essa fase (ou troque os números da arte por símbolos).
- **Estabilidade dos desafios:** links de desafio dependem de os geradores produzirem sempre os mesmos números. Ao criar, alterar ou remover um `g`, suba `SORTEIO_VERSAO` em `cases.js` e rode `node tools/validate.js --atualizar-sorteios`; sem isso, a validação falha. Links antigos continuam abrindo, com um aviso de versão.

### Ferramentas (`tool`)

Uma fase pode oferecer uma ferramenta visual:

```js
tool:"eigen", p:{A:[[2,1],[1,2]]}, tp:P=>({A:P.p.A,v:[1,1]}),
```

`tp` recebe a fase já sorteada e devolve os parâmetros da ferramenta. Fases fixas trazem `p` com os mesmos valores do enunciado. `toolOpen:true` abre a ferramenta junto com o problema. Os tipos existentes estão em `tools2d.js` (`kernel`, `compose`, `det`, `orto`, `power`, `eigen`, `basis`, `conic`, `lsq`, `rref`) e `tools3d.js` (`image3d`, `kernel3d`, `quadric`).

Cada tipo de ferramenta tem `ans(tp)`: a resposta que ela alcança usando só a própria grade de ímã. O validador exige que essa resposta seja a da fase. Ao criar um tipo novo, implemente `nome`, `ans`, `solve` (leva o estado ao alvo, usado nos testes) e `ui`, e garanta que funcione por teclado.

## Cenas (`scenes.js`)

`SCENES[idDoCaso]` é uma função que devolve a cena. Ela só é montada quando o caso abre.

- **`salas`:** `{id, nome, svg}`. A arte é um SVG com `viewBox="0 0 1600 900"`.
  - Ids prefixados por cena (ex.: `oGold`, `dGlow`), nunca começando com `i-`, para não colidir com os ícones.
  - Camadas de paralaxe: `<g data-depth="0">` (fundo), `<g data-depth="1">` (objetos) e itens soltos `data-depth="2"` (frente, sem objeto clicável).
  - Estados visuais: elementos com `data-on="k"` aparecem quando a fase k é resolvida; com `data-off="k"`, somem.
- **`hotspots`:** um por fase.
  - Campos: `caso` (índice da fase), `sala`, `nome`, a caixa (`...box(x,y,w,h)` em pixels da arte), `falaAbrir`, `falaResolvido`, `pista` (linha do dossiê) e, opcionalmente, `quem` (quem fala ao resolver).
  - `requires`: fases que precisam estar resolvidas antes. Se houver `requires`, inclua `falaBloqueado`.
  - O validador exige que todas as fases fiquem alcançáveis, sem ciclos, e que o chefão dependa de todas as outras.
- **`interrogatorio`:** 3 depoimentos falsos antes do chefão, `{fala, pista, refuta}`. `pista` é o índice da fase que desmente a fala e precisa vir antes do chefão, sem repetir.
- **`intro`** e **`final`** (`{texto, fala}`).

Use `?debug=1` no endereço para ver as caixas dos objetos e as coordenadas do cursor sobre a arte. A arte precisa ser original: nada de imagens, logos ou personagens de terceiros.

## Estilo de código

- JavaScript puro, sem dependências em tempo de execução além do Three.js já guardado em `vendor/`.
- Comentários e textos em português.
- Desempenho: anime só `transform` e `opacity`, evite laços contínuos de animação e redesenhe só quando houver interação.
- Acessibilidade: tudo precisa funcionar por teclado, com foco visível e rótulos.

## Pull requests

- Um assunto por pull request, com commits pequenos e mensagens claras.
- `npm test` passando (a mesma verificação roda automaticamente no GitHub).
- Para mudanças visuais, anexe uma captura de tela.
