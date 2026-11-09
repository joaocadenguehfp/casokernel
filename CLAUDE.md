# Caso Kernel: instruções para o Claude

Jogo web de investigação noir para estudar Álgebra Linear, em pt-BR.
- Repositório: `joaocadenguehfp/casokernel`.
- Site publicado: https://case-kernel.vercel.app/ (a Vercel publica a partir do `main`).
- `README.md` e `CONTRIBUTING.md` descrevem o jogo, a estrutura e os formatos de dados: leia antes de mexer.

## Como trabalhar neste projeto
- Envie as alterações **direto para o `main`**, com commits pequenos, um por assunto, e mensagens em português.
- Antes de cada push, rode `node tools/validate.js` e `node tools/smoke.js` (também `node tools/smoke.js --mobile`). Os mesmos testes rodam no GitHub Actions (`.github/workflows/testes.yml`).
- Antes de assumir que um bug é seu, confira se o último resultado dos testes no GitHub Actions passou.
- Responda em português, de forma direta.

## Arquitetura (HTML/CSS/JS puros, sem build)
| Arquivo | Conteúdo |
|---|---|
| `index.html` | Página, ícones e modais (`#pz` problema, `#fc` dossiê, `#ov` fim) |
| `style.css` | Visual Art Déco noir (dourado, ciano, cobre) |
| `cases.js` | `SEEDS` (4 casos com id estável: `cofre`, `fantasma`, `dependencia`, `observatorio`, 10 fases cada, a última é o chefão), `FL` (fichas do dossiê), `mkR` (gerador reprodutível), `SORTEIO_VERSAO` |
| `scenes.js` | `SCENES[id]=()=>cena`: salas em SVG 1600×900 com camadas `data-depth`, hotspots com `requires`, estados `data-on`/`data-off`, `interrogatorio` (3 depoimentos antes do chefão) |
| `tools2d.js` | Ferramentas no plano e a lupa de escalonamento (`TOOLS2D[tipo]`: `nome`, `ans`, `solve`, `ui`) |
| `tools3d.js` | Ferramentas 3D (`image3d`, `kernel3d`, `quadric`): Three.js r160 em `vendor/` carregado sob demanda, reserva em SVG |
| `script.js` | Motor: estado `S` (save v6 no localStorage), cenas, painéis, modos (Detetive, Investigador, Time Attack `S.ta`, Revisão `S.rv`), desafio (`S.dz`), áudio, paralaxe |
| `sw.js` | Service worker "rede primeiro"; suba `VERSAO` ao mudar a lista de arquivos |
| `tools/validate.js` | Recalcula cada resposta de forma independente (objeto `V`), confere ferramentas, cenas, interrogatórios e a estabilidade dos sorteios (`tools/sorteios.json`) |
| `tools/smoke.js` | Joga tudo no Chromium com Playwright |

## Recursos que já existem
- Quatro casos point and click, com interrogatório antes do chefão.
- 22 fases com números sorteados (campo `g`).
- 14 ferramentas visuais: 9 em 2D, a lupa de escalonamento e 3 em 3D, mais um tipo-base interno (`solve`, usado por `det` e `orto`).
- Prévia da resposta e barra de símbolos no celular.
- Modos Detetive, Investigador e Time Attack.
- Desafio da turma (`?desafio=CÓDIGO&v=N`) e "Copiar resultado".
- Modo Revisão com repetição espaçada (conceitos em `localStorage` `caso-kernel-revisao`; volta em 1, 3, 7 e 14 dias).
- Sugestão de ferramenta após um erro.
- Paralaxe, trilha opcional e funcionamento offline.

## Regras que não podem ser quebradas
1. **Toda fase nova** precisa de verificação independente no objeto `V` de `tools/validate.js` (chave `"idDoCaso:índice"`).
2. **Ao criar, mudar ou remover um gerador `g`:** suba `SORTEIO_VERSAO` em `cases.js` e rode `node tools/validate.js --atualizar-sorteios`. Sem isso, links de desafio mudariam de números sem aviso.
3. **Nunca troque o `id` de um caso.** O save e os recordes dependem dele.
4. **Ferramentas:** `ans(tp)` precisa alcançar a resposta da fase pela própria grade de ímã; tudo precisa funcionar por teclado.
5. **Desempenho:** anime só `transform` e `opacity`, redesenhe só quando houver interação, respeite `prefers-reduced-motion`.
6. **Arte:** original, em SVG, sem assets de terceiros. Ids do SVG prefixados por cena.
7. **Renderizador matemático (`$...$`):** `mat(1,2;3,4)`, `RR`, `->`, `x^2`, `x_1`. O subscrito pega só um número ou uma letra (`c_1x` vira c₁x); para expoentes com várias letras, use chaves (`A^{T}A`).

## Ambiente (Claude Code na nuvem)
- Chromium e Playwright já vêm instalados: não rode `playwright install`.
- O teste de fumaça sobe um servidor HTTP próprio. Abrir o `index.html` via `file://` deixa o 3D sem WebGL, que cai na reserva em SVG.
- Neste ambiente, o acesso a `vercel.app` é bloqueado: não dá para conferir o site publicado daqui.
- Para posicionar objetos na arte, use `?debug=1`.

## Pendências conhecidas
- Licença ainda não escolhida (sugestão: MIT para o código e CC BY 4.0 para textos e arte).
- Proteção do branch `main` e descrição e tópicos do repositório (configurações do GitHub, feitas pelo dono do repositório).
- Nunca testado em celular real (desempenho, giroscópio, som) nem com Lighthouse.
- Ideias para depois: medição com Lighthouse e axe na CI; ferramenta visual de linearidade para "A cena do crime"; potências de matriz 3×3 em 3D; caso novo só se a disciplina cobrir temas que faltam (ex.: diagonalização, Gram-Schmidt).

Mantenha este arquivo atualizado quando a arquitetura, as regras ou as pendências mudarem.
