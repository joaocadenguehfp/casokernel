/* =====================================================================
   DADOS DO JOGO. Edite apenas este array para criar ou alterar fases.
   Cada fase:
     t: título | s: narrativa | q: enunciado
     type: "choice" (múltipla escolha) ou "num" (número ou vetor)
     o: opções (só em "choice") | a: resposta (índice em "choice";
        número ou lista, ex.: [5,6], em "num")
     h: 3 dicas | c: [nome, descrição] da pista ganha
     e: explicação mostrada ao acertar
   Matemática dentro de $...$ :
     matriz mat(1,2;3,4) | ℝ: RR | seta: -> | potência: x^2 | índice: e_1
   ===================================================================== */
const CASES=[
{t:"A cena do crime",type:"choice",
 s:"O cofre do Dr. Vetor foi arrombado. Um bilhete diz: “Só quem reconhece uma transformação linear entra no escritório.”",
 q:"Qual função $T:RR^2->RR^2$ é uma transformação linear?",
 o:["$T(x,y)=(x+1,y)$","$T(x,y)=(2x-y,x)$","$T(x,y)=(x^2,y)$","$T(x,y)=(xy,y)$"],a:1,
 h:["Toda transformação linear leva o vetor nulo no vetor nulo: $T(0)=0$.","Calcule $T(0,0)$ em cada opção e descarte as que não dão $(0,0)$.","Termos como $x^2$ e $xy$ quebram $T(x+y)=T(x)+T(y)$."],
 c:["Bilhete rasgado","Linearidade exige preservar soma e multiplicação por escalar."],
 e:"Em (a) T(0,0)=(1,0)≠0; em (c) e (d) há termos não lineares. Só (b) é combinação linear das coordenadas."},
{t:"O código da gaveta",type:"num",
 s:"A gaveta tem um teclado que recebe um vetor. A dica gravada é a matriz de uma transformação T: ℝ³ → ℝ².",
 q:"A matriz de $T$ é $mat(3,1,-2;1,0,4)$. Calcule $T(2,1,1)$. Responda como vetor, por exemplo 1,2.",
 a:[5,6],
 h:["Cada coluna da matriz é a imagem de um vetor da base: $T(e_1),T(e_2),T(e_3)$.","$T(x)=x_1T(e_1)+x_2T(e_2)+x_3T(e_3)$.","Multiplique a matriz pelo vetor coluna $mat(2;1;1)$."],
 c:["Chave de matriz","T(x)=A·x: a matriz guarda a imagem da base nas colunas."],
 e:"Linha 1: 3·2+1·1−2·1=5. Linha 2: 1·2+0·1+4·1=6. Logo T(2,1,1)=(5,6)."},
{t:"Duas pistas, um produto",type:"num",
 s:"Dois cofres em série: a mensagem passa primeiro por B e depois por A. O ladrão deixou uma composição de transformações.",
 q:"Sejam $A=mat(1,2;3,4)$ e $B=mat(5,6;7,8)$. Qual é o elemento da linha 2, coluna 1 de $AB$?",
 a:[43],
 h:["Pela convenção do curso, as imagens ficam nas colunas e a matriz da composição é o produto.","O elemento (2,1) de AB é a linha 2 de A vezes a coluna 1 de B.","$3·5+4·7$."],
 c:["Fio de composição","A composição ST tem matriz A·B, na ordem certa."],
 e:"AB=(19 22; 43 50). O elemento (2,1) vale 3·5+4·7=43. Já BA seria diferente: matrizes não comutam."},
{t:"O espaço nulo vazio",type:"num",
 s:"Uma câmera gravou só parte do vetor. O perito afirma que o que sumiu está no núcleo de T.",
 q:"$T:RR^5->RR^3$ é linear e sua imagem $T(V)$ tem dimensão 2. Qual é a dimensão do núcleo $N(T)$?",
 a:[3],
 h:["Use o Teorema do Núcleo e da Imagem.","$dim(N(T))+dim(T(V))=dim(V)$.","Aqui $dim(V)=5$ e $dim(T(V))=2$."],
 c:["Pegada no núcleo","nulidade + posto = dimensão do domínio."],
 e:"dim N(T)=5−2=3. A dimensão do domínio é a que conta, não a do contradomínio."},
{t:"A derivada culpada",type:"num",
 s:"Um polinômio foi escondido num bilhete e a pista é a sua derivada, vista como transformação linear D: P₃ → P₂.",
 q:"Nas bases canônicas, $D=mat(0,1,0,0;0,0,2,0;0,0,0,3)$. Para $p(x)=1+4x+3x^2+2x^3$, vetor $(1,4,3,2)$, calcule as coordenadas de $p'$.",
 a:[4,6,6],
 h:["Multiplique D pelo vetor coluna de coordenadas de p.","Ou derive: $(x^n)'=nx^{n-1}$.","$p'(x)=4+6x+6x^2$."],
 c:["Rastro de derivada","O operador de derivação é linear e tem matriz."],
 e:"D·p=(4,6,6), ou seja, p′(x)=4+6x+6x². Só somas e produtos de números reais."},
{t:"Quantas linhas independentes?",type:"num",
 s:"O arquivo secreto tem uma matriz de 3 linhas. O número de linhas realmente independentes revela quantos suspeitos agem sozinhos.",
 q:"Qual é a dimensão do espaço-linha de $mat(1,1,1,1;0,1,2,3;1,2,3,4)$?",
 a:[2],
 h:["Operações do método de Gauss-Jordan não alteram o espaço-linha.","Compare a terceira linha com a soma das outras.","$l_3=l_1+l_2$, então ela é redundante."],
 c:["Linha redundante","O espaço-linha é invariante por escalonamento."],
 e:"Como l3=l1+l2, o escalonamento zera a 3ª linha. Restam 2 linhas independentes, então a dimensão é 2."},
{t:"A confissão",type:"num",
 s:"Último interrogatório. T não é injetora, e o culpado só se esconde no seu núcleo.",
 q:"Seja $T(x,y,z)=(x+y,\\;y+z)$. Se $(3,y,z)\\in N(T)$, quanto vale $y·z$?",
 a:[-9],
 h:["Estar em $N(T)$ significa $T(3,y,z)=(0,0)$.","Resolva $3+y=0$ e $y+z=0$.","Então $y=-3$ e $z=3$."],
 c:["Impressão digital","N(T)={0} se e somente se T é injetora; aqui o núcleo é não trivial."],
 e:"3+y=0 ⇒ y=−3; y+z=0 ⇒ z=3. O produto vale −9. O núcleo é gerado por (−1,1,−1), então T não é inversível."}
];
