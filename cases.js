/* =====================================================================
   DADOS DO JOGO (edite aqui). Estrutura:
   SEEDS[] -> {id (estável: usado no save e nos recordes), nome, ic, intro, casos[10]}
   Caso: d dificuldade ("f" fácil, "m" médio, "d" difícil, "b" chefão)
         t título | s narrativa (opcional) | q enunciado
         type "choice" (o opções, a índice) ou "num" (a número ou lista)
         h 2 dicas | e explicação | k chave do flashcard em FL
   Matemática em $...$: mat(1,2;3,4) | RR | -> | x^2 | e_1
   Sorteio (opcional): g:R=>({q,a,h,e,p}) gera uma versão nova a cada partida.
         R = gerador da partida (R.int(a,b), R.nz(a,b) sem zero, R.pick(lista)).
         p guarda os parâmetros para tools/validate.js recalcular a resposta.
         g não pode trocar t, k, d nem type. Os campos fixos valem como padrão.
   ===================================================================== */

/* ---- gerador pseudoaleatório reprodutível (mulberry32) ---- */
function mkR(seed){
  let a=seed>>>0;
  const f=()=>{a=a+0x6D2B79F5>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296};
  const int=(lo,hi)=>lo+Math.floor(f()*(hi-lo+1));
  return {f,int,nz:(lo,hi)=>{let v;do v=int(lo,hi);while(v===0);return v},pick:l=>l[Math.floor(f()*l.length)]};
}
/* ---- formatação usada pelos sorteios ---- */
const neg=n=>n<0?"−"+(-n):String(n);                                  /* texto: −3 */
const tup=v=>"("+v.join(",")+")";                                       /* em $...$: (3,-1) */
const ttup=v=>"("+v.map(neg).join(",")+")";                             /* texto: (3,−1) */
const sub=["₀","₁","₂","₃"];
/* combinação linear em $...$: lc([2,-1],["x_1","x_2"]) = "2x_1-x_2" */
const lc=(c,v)=>{let s="";c.forEach((k,i)=>{if(!k)return;const a=Math.abs(k),t=(a===1?"":a)+v[i];s+=s?(k<0?"-":"+")+t:(k<0?"-":"")+t});return s||"0"};
/* polinômio em $...$: poly([2,3,-1,1]) = "2+3x-x^2+x^3" */
const poly=c=>{let s="";c.forEach((k,i)=>{if(!k)return;const a=Math.abs(k),t=(a===1&&i>0?"":a)+(i===0?"":i===1?"x":"x^"+i);s+=s?(k<0?"-":"+")+t:(k<0?"-":"")+t});return s||"0"};
const polyT=c=>poly(c).replace(/-/g,"−").replace(/\^(\d)/g,(_,d)=>"⁰¹²³⁴⁵⁶⁷⁸⁹"[d]);
const FL={
lin:{k:"Propriedades da linearidade",p:"Teste primeiro T(0)=0. Depois verifique T(x+y)=T(x)+T(y) e T(αx)=αT(x). Constantes, quadrados, produtos e exponenciais reprovam."},
mat:{k:"Representação matricial",p:"A j-ésima coluna da matriz é T(e_j). Para aplicar, multiplique a matriz pelo vetor em coluna: T(x)=A·x."},
ker:{k:"Núcleo, imagem e nulidade",p:"Resolva T(x)=0: o número de parâmetros livres é a nulidade. A imagem é gerada pelas colunas da matriz."},
rank:{k:"Teorema do Núcleo e da Imagem",p:"nulidade + posto = dimensão do domínio. Ache um dos dois e subtraia do domínio."},
prod:{k:"Álgebra de matrizes",p:"AB = linha de A × coluna de B (colunas de A = linhas de B). Em geral AB≠BA. Para Aⁿ, calcule A², A³ e procure o padrão."},
comp:{k:"Composição ST",p:"ST(x)=S(T(x)): aplique T primeiro. A matriz de ST é o produto A·B, na mesma ordem."},
inv:{k:"Condição de inversibilidade",p:"T é inversível ⇔ injetora ⇔ N(T)={0}. Para achar T⁻¹, resolva y=T(x) para x em função de y."},
row:{k:"Espaço-linha e dependência linear",p:"Escalone: Gauss-Jordan não altera o espaço-linha. Posto = linhas não nulas; se for menor que o número de vetores, eles são LD."},
idop:{k:"Operadores D, integral e deslocamento",p:"DT=I não implica TD=I. Aplique os operadores a um polinômio genérico e compare coeficientes."}
};

const SEEDS=[
{id:"cofre",nome:"O Cofre Vazio",ic:"🗝️",intro:"Linearidade, núcleo, composição e inversa.",casos:[
{d:"f",t:"A cena do crime",type:"choice",q:"Qual função $T:RR^2->RR^2$ é linear?",
 o:["$T(x_1,x_2)=(x_2,x_1)$","$T(x_1,x_2)=(x_1,1)$","$T(x_1,x_2)=(x_1+1,x_2+2)$","$T(x_1,x_2)=(x_1^2,x_2^2)$"],a:0,k:"lin",
 h:["Uma transformação linear leva $(0,0)$ em $(0,0)$.","Termos quadráticos quebram a soma."],
 e:"(x₁,1) e (x₁+1,x₂+2) não fixam a origem; os quadrados não preservam a soma. Só (x₂,x₁) é linear."},
{d:"f",t:"A chave 2×2",
 g:R=>{const m=[R.nz(-3,3),R.nz(-3,3),R.nz(-3,3),R.nz(-3,3)],[a,b,c,d]=m,X=["x_1","x_2"];
   return {p:{m},a:[a+b+c+d],
    q:"Seja $T(x_1,x_2)=("+lc([a,b],X)+", "+lc([c,d],X)+")$. Qual é a soma de todos os elementos da matriz canônica de $T$?",
    h:["As colunas são $T(e_1)$ e $T(e_2)$.","$T(1,0)="+tup([a,c])+"$ e $T(0,1)="+tup([b,d])+"$."],
    e:"$A=mat("+a+","+b+";"+c+","+d+")$, cuja soma é "+neg(a+b+c+d)+"."}},
 type:"num",q:"Seja $T(x_1,x_2)=(x_1-x_2, x_1+x_2)$. Qual é a soma de todos os elementos da matriz canônica de $T$?",a:[2],k:"mat",
 h:["As colunas são $T(e_1)$ e $T(e_2)$.","$T(1,0)=(1,1)$ e $T(0,1)=(-1,1)$."],
 e:"$A=mat(1,-1;1,1)$, cuja soma é 1−1+1+1=2."},
{d:"m",t:"Ponto cego",type:"num",q:"Qual é a nulidade de $T(x_1,x_2)=(x_1,0)$?",a:[1],k:"ker",
 h:["Resolva $T(x)=0$: sobra $x_1=0$.","O núcleo é gerado por $(0,1)$."],
 e:"N(T)={(0,x₂)} tem dimensão 1 (e o posto também é 1)."},
{d:"m",t:"Fora do campo",type:"num",q:"Qual é o posto de $T(x_1,x_2,x_3)=(x_1,x_2,0)$?",a:[2],k:"rank",
 h:["A imagem é o plano $x_3=0$.","Posto = dimensão da imagem."],
 e:"Im(T)={(a,b,0)} tem dimensão 2; a nulidade é 1 e 2+1=3."},
{d:"m",t:"Dois cofres",
 g:R=>{const r=[R.nz(-4,4),R.nz(-4,4),R.nz(-4,4)],B=[[R.nz(-3,5),R.int(-3,3)],[R.nz(-3,5),R.int(-3,3)],[R.nz(-3,5),R.int(-3,3)]];
   const A=[r,r.map(v=>-v)],v=r[0]*B[0][0]+r[1]*B[1][0]+r[2]*B[2][0],M=X=>X.map(l=>l.join(",")).join(";");
   return {p:{A,B},a:[v],
    q:"Sejam $A=mat("+M(A)+")$ e $B=mat("+M(B)+")$. Qual é o elemento (1,1) de $AB$?",
    h:["Linha 1 de A vezes coluna 1 de B.","$"+r.map((x,k)=>"("+x+")("+B[k][0]+")").join("+")+"$."],
    e:r.map((x,k)=>neg(x*B[k][0])).join(" + ")+" = "+neg(v)+"."}},
 type:"num",q:"Sejam $A=mat(1,-4,2;-1,4,-2)$ e $B=mat(1,2;-1,3;5,-2)$. Qual é o elemento (1,1) de $AB$?",a:[15],k:"prod",
 h:["Linha 1 de A vezes coluna 1 de B.","$1·1+(-4)(-1)+2·5$."],e:"1+4+10=15."},
{d:"m",t:"Desfazendo o golpe",
 g:R=>{const x=[R.int(-5,6),R.int(-5,6)],y=[x[0]-x[1],x[0]+x[1]];
   return {p:{y},a:x,
    q:"$T(x_1,x_2)=(x_1-x_2, x_1+x_2)$ é inversível. Calcule $T^{-1}"+tup(y)+"$.",
    h:["Resolva $x_1-x_2="+y[0]+"$ e $x_1+x_2="+y[1]+"$.","Some as duas equações."],
    e:"Somando, 2x₁="+neg(y[0]+y[1])+": x₁="+neg(x[0])+" e x₂="+neg(x[1])+"."}},
 type:"num",q:"$T(x_1,x_2)=(x_1-x_2, x_1+x_2)$ é inversível. Calcule $T^{-1}(2,4)$.",a:[3,1],k:"inv",
 h:["Resolva $x_1-x_2=2$ e $x_1+x_2=4$.","Some as duas equações."],e:"x₁=3 e x₂=1."},
{d:"d",t:"Cadeia de custódia",
 g:R=>{const v=[R.nz(-4,5),R.nz(-4,5)],t=[v[0],-v[1]],r=[t[0]-t[1],t[0]+t[1],t[0]+2*t[1]];
   return {p:{v},a:r,
    q:"$S(x_1,x_2)=(x_1-x_2, x_1+x_2, x_1+2x_2)$ e $T(x_1,x_2)=(x_1,-x_2)$. Calcule $ST"+tup(v)+"$.",
    h:["$ST(x)=S(T(x))$: aplique $T$ primeiro.","$T"+tup(v)+"="+tup(t)+"$."],
    e:"T"+ttup(v)+"="+ttup(t)+" e S"+ttup(t)+"="+ttup(r)+"."}},
 type:"num",q:"$S(x_1,x_2)=(x_1-x_2, x_1+x_2, x_1+2x_2)$ e $T(x_1,x_2)=(x_1,-x_2)$. Calcule $ST(2,1)$.",a:[3,1,0],k:"comp",
 h:["$ST(x)=S(T(x))$: aplique $T$ primeiro.","$T(2,1)=(2,-1)$."],e:"T(2,1)=(2,−1) e S(2,−1)=(3,1,0)."},
{d:"d",t:"O polinômio escondido",
 g:R=>{const c=[R.nz(-4,4),R.nz(-4,4),R.nz(-4,4),R.nz(-4,4)],sp=c.slice(1),ts=[0].concat(sp);
   return {p:{c},a:ts,
    q:"Para $p=c_0+c_1x+c_2x^2+c_3x^3$, $S(p)=c_1+c_2x+c_3x^2$ e $T(p)=c_0x+c_1x^2+c_2x^3+c_3x^4$. Com $p="+poly(c)+"$, dê os coeficientes $(c_0,c_1,c_2,c_3)$ de $TS(p)$.",
    h:["$S(p)="+poly(sp)+"$.","Aplique $T$: cada coeficiente sobe uma potência."],
    e:"S(p)="+polyT(sp)+" e T(S(p))="+polyT(ts)+", logo "+ttup(ts)+". O termo "+neg(c[0])+" se perdeu: TS≠I."}},
 type:"num",q:"Para $p=c_0+c_1x+c_2x^2+c_3x^3$, $S(p)=c_1+c_2x+c_3x^2$ e $T(p)=c_0x+c_1x^2+c_2x^3+c_3x^4$. Com $p=2+3x-x^2+x^3$, dê os coeficientes $(c_0,c_1,c_2,c_3)$ de $TS(p)$.",a:[0,3,-1,1],k:"idop",
 h:["$S(p)=3-x+x^2$.","Aplique $T$: cada coeficiente sobe uma potência."],e:"S(p)=3−x+x² e T(S(p))=3x−x²+x³, logo (0,3,−1,1). TS≠I."},
{d:"d",t:"Interrogatório cruzado",type:"num",q:"$S(x_1,x_2,x_3)=(x_1-x_2, x_2+x_3)$ e $T(x_1,x_2,x_3)=(x_3,x_2,x_1)$. Qual é a nulidade de $ST$?",a:[1],k:"rank",
 h:["$ST(x)=(x_3-x_2, x_2+x_1)$.","Resolva $ST(x)=0$ e conte os parâmetros livres."],e:"x₃=x₂ e x₁=−x₂: núcleo gerado por (−1,1,1). Nulidade 1."},
{d:"b",t:"O suspeito principal",
 g:R=>{const x=[R.int(1,9),R.int(1,9),R.int(1,9)],y=[3*x[2],2*x[1],x[0]];
   return {p:{y},a:x,
    q:"$T(x_1,x_2,x_3)=(x_1,2x_2,3x_3)$ e $S(x_1,x_2,x_3)=(x_3,x_2,x_1)$. Sabendo que $ST$ é inversível, calcule $(ST)^{-1}"+tup(y)+"$.",
    h:["$ST(x)=(3x_3, 2x_2, x_1)$.","Iguale a $"+tup(y)+"$ e resolva coordenada a coordenada."],
    e:"ST(x)=(3x₃,2x₂,x₁)="+ttup(y)+" ⇒ x="+ttup(x)+"."}},
 type:"num",s:"Um único nome sobrou na lista e ele já apagou cada rastro. Só a inversa de uma composição o expõe.",
 q:"$T(x_1,x_2,x_3)=(x_1,2x_2,3x_3)$ e $S(x_1,x_2,x_3)=(x_3,x_2,x_1)$. Sabendo que $ST$ é inversível, calcule $(ST)^{-1}(3,4,9)$.",a:[9,2,1],k:"inv",
 h:["$ST(x)=(3x_3, 2x_2, x_1)$.","Iguale a $(3,4,9)$ e resolva coordenada a coordenada."],e:"ST(x)=(3x₃,2x₂,x₁)=(3,4,9) ⇒ x=(9,2,1)."}
]},
{id:"fantasma",nome:"A Matriz Fantasma",ic:"👻",intro:"Matrizes de transformações, potências Aⁿ e operadores.",casos:[
{d:"f",t:"A reflexão",
 g:R=>{const y=[R.nz(-7,9),R.nz(-7,9)],x=[y[0],-y[1]];
   return {p:{y},a:x,q:"$T(x_1,x_2)=(x_1,-x_2)$ é inversível. Calcule $T^{-1}"+tup(y)+"$.",
    e:"T⁻¹=T, então T⁻¹"+ttup(y)+"="+ttup(x)+"."}},
 type:"num",q:"$T(x_1,x_2)=(x_1,-x_2)$ é inversível. Calcule $T^{-1}(3,5)$.",a:[3,-5],k:"inv",
 h:["Aplicar a reflexão duas vezes devolve o vetor.","Logo $T^{-1}=T$."],e:"T⁻¹=T, então T⁻¹(3,5)=(3,−5)."},
{d:"f",t:"Dimensões da ficha",type:"choice",q:"Qual é a ordem (linhas × colunas) da matriz canônica de $T:RR^3->RR^2$, $T(x_1,x_2,x_3)=(x_1,x_2)$?",
 o:["2 × 3","3 × 2","2 × 2","3 × 3"],a:0,k:"mat",h:["Há uma coluna para cada vetor da base do domínio.","O domínio é $RR^3$."],
 e:"$A=mat(1,0,0;0,1,0)$: 2 linhas (contradomínio) e 3 colunas (domínio)."},
{d:"m",t:"A tabela de suspeitos",
 g:R=>{const v=[R.int(-4,6),R.int(-4,6),R.int(-4,6)],r=[v[0]-v[1],v[1]+v[2]];
   return {p:{v},a:r,
    q:"A matriz de $T:RR^3->RR^2$ é $mat(1,-1,0;0,1,1)$. Calcule $T"+tup(v)+"$.",
    h:["Multiplique a matriz pelo vetor coluna.","Linha 1: $"+v[0]+"-("+v[1]+")+0$."],
    e:"("+neg(v[0])+"−("+neg(v[1])+"), "+neg(v[1])+"+("+neg(v[2])+"))="+ttup(r)+"."}},
 type:"num",q:"A matriz de $T:RR^3->RR^2$ é $mat(1,-1,0;0,1,1)$. Calcule $T(1,2,3)$.",a:[-1,5],k:"mat",
 h:["Multiplique a matriz pelo vetor coluna.","Linha 1: $1-2+0$."],e:"(1−2, 2+3)=(−1,5)."},
{d:"m",t:"Derivando senos",type:"num",q:"Na base (sen x, cos x), as colunas da matriz de $D=d/dx$ são $D(sen x)$ e $D(cos x)$. Qual é o elemento (1,2)?",a:[-1],k:"mat",
 h:["$D(sen x)=cos x$ e $D(cos x)=-sen x$.","A coluna 2 é $(-1,0)$."],e:"$D=mat(0,-1;1,0)$. O elemento (1,2) é −1."},
{d:"m",t:"Potências suspeitas",
 g:R=>{const n=R.int(5,25);
   return {p:{n},a:[n],q:"Seja $A=mat(1,1;0,1)$. Qual é o elemento (1,2) de $A^{"+n+"}$?",
    e:"Aⁿ=mat(1,n;0,1): o canto superior direito de A^"+n+" vale "+n+"."}},
 type:"num",q:"Seja $A=mat(1,1;0,1)$. Qual é o elemento (1,2) de $A^{10}$?",a:[10],k:"prod",
 h:["Calcule $A^2=mat(1,2;0,1)$ e $A^3$.","O padrão é $A^n=mat(1,n;0,1)$."],e:"Aⁿ tem n no canto superior direito: 10."},
{d:"m",t:"Somando provas",
 g:R=>{const C=[[R.int(-3,4),R.int(-3,4)],[R.int(-3,4),R.int(-3,4)],[R.int(-3,4),R.int(-3,4)]],B=[[1,2],[-1,3],[5,-2]];
   const S=B.map((l,i)=>l.map((v,j)=>v+C[i][j])),M=X=>X.map(l=>l.join(",")).join(";"),t=S.flat().reduce((a,b)=>a+b,0);
   return {p:{C},a:[t],
    q:"Com $B=mat(1,2;-1,3;5,-2)$ e $C=mat("+M(C)+")$, qual é a soma de todos os elementos de $B+C$?",
    h:["A soma é elemento a elemento.","$B+C=mat("+M(S)+")$."],
    e:S.flat().map(neg).join(" + ").replace(/\+ −/g,"− ")+" = "+neg(t)+"."}},
 type:"num",q:"Com $B=mat(1,2;-1,3;5,-2)$ e $C=mat(2,2;1,-1;1,-3)$, qual é a soma de todos os elementos de $B+C$?",a:[10],k:"prod",
 h:["A soma é elemento a elemento.","$B+C=mat(3,4;0,2;6,-5)$."],e:"3+4+0+2+6−5=10."},
{d:"d",t:"Identidades falsas",type:"choice",q:"Qual identidade vale para quaisquer matrizes quadradas $A$ e $B$?",
 o:["$(A+B)^2=A^2+2AB+B^2$","$(A+B)^2=A^2+AB+BA+B^2$","$(A+B)(A-B)=A^2-B^2$","$AB=BA$"],a:1,k:"prod",
 h:["O produto de matrizes não é comutativo.","Distribua $(A+B)(A+B)$ sem trocar a ordem."],e:"Só vale 2AB se AB=BA, e (A+B)(A−B)=A²−AB+BA−B²."},
{d:"d",t:"O padrão triangular",
 g:R=>{const n=R.int(3,9),v=n*(n+1)/2;
   return {p:{n},a:[v],q:"Seja $A=mat(1,1,1;0,1,1;0,0,1)$. Qual é o elemento (1,3) de $A^{"+n+"}$?",
    e:"O elemento (1,3) de Aⁿ é n(n+1)/2, que vale "+v+" para n="+n+"."}},
 type:"num",q:"Seja $A=mat(1,1,1;0,1,1;0,0,1)$. Qual é o elemento (1,3) de $A^4$?",a:[10],k:"prod",
 h:["Calcule $A^2$ e $A^3$ e observe a linha 1.","Linha 1 de $A^n$: $(1, n, n(n+1)/2)$."],e:"O elemento (1,3) de Aⁿ é n(n+1)/2, que vale 10 para n=4."},
{d:"d",t:"A inversa que falta",type:"choice",q:"Em $P_5$, $D$ é a derivação e $T(p)=∫_0^x p(t)dt$, com $DT=I$. Qual é o núcleo de $TD$?",
 o:["Apenas {0}","Os polinômios constantes","Polinômios de grau ≤ 1","Todo $P_5$"],a:1,k:"idop",
 h:["$TD(p)=p(x)-p(0)$.","Quais polinômios $TD$ leva em zero?"],e:"TD(p)=p−p(0) é zero só nas constantes, logo TD≠I."},
{d:"b",t:"A matriz que não existe",
 g:R=>{const x=[R.int(-4,6),R.int(-4,6),R.int(-4,6)],y=[x[0]+x[1],x[1]+x[2],x[2]];
   return {p:{y},a:x,
    q:"$T(x_1,x_2,x_3)=(x_1+x_2, x_2+x_3, x_3)$ tem matriz $mat(1,1,0;0,1,1;0,0,1)$. Calcule $T^{-1}"+tup(y)+"$.",
    e:"x₃="+neg(x[2])+", x₂="+neg(y[1])+"−("+neg(x[2])+")="+neg(x[1])+" e x₁="+neg(y[0])+"−("+neg(x[1])+")="+neg(x[0])+"."}},
 type:"num",s:"O suspeito adulterou as provas com uma matriz triangular. A inversa dela é a chave.",
 q:"$T(x_1,x_2,x_3)=(x_1+x_2, x_2+x_3, x_3)$ tem matriz $mat(1,1,0;0,1,1;0,0,1)$. Calcule $T^{-1}(1,2,3)$.",a:[2,-1,3],k:"inv",
 h:["Resolva de baixo para cima: $x_3=y_3$.","Depois $x_2=y_2-x_3$ e $x_1=y_1-x_2$."],e:"x₃=3, x₂=2−3=−1 e x₁=1−(−1)=2."}
]},
{id:"dependencia",nome:"A Dependência Letal",ic:"🧬",intro:"Espaço-linha, dependência linear, posto e composição.",casos:[
{d:"f",t:"Dedo apontado",type:"choice",q:"Qual função NÃO é linear?",
 o:["$T(x_1,x_2)=(x_1,x_1)$","$T(x_1,x_2)=(x_1,0)$","$T(x_1,x_2)=(e^{x_1},e^{x_2})$","$T(x_1,x_2)=(x_1-x_2,x_1+x_2)$"],a:2,k:"lin",
 h:["Teste $T(0,0)$.","Lembre que $e^0=1$."],e:"T(0,0)=(1,1)≠(0,0)."},
{d:"f",t:"Três linhas",type:"num",q:"Qual é a dimensão do espaço-linha de $A_1=(1,-1,0)$, $A_2=(0,1,-1)$ e $A_3=(2,3,1)$?",a:[3],k:"row",
 h:["Monte a matriz com esses vetores nas linhas.","O determinante vale 6, diferente de zero."],e:"As 3 linhas são LI (det=6), então a dimensão é 3."},
{d:"m",t:"Imagem completa",type:"num",q:"$S(x_1,x_2)=(x_1-x_2, x_1+x_2, x_1+2x_2)$. Qual é o posto de $S$?",a:[2],k:"rank",
 h:["Resolva $S(x)=0$.","Só o vetor nulo vai a zero."],e:"N(S)={0}, nulidade 0 e posto 2−0=2."},
{d:"m",t:"Quatro vetores",type:"num",q:"Qual é a dimensão do espaço-linha de $(1,-1,2,1)$, $(-1,2,-1,0)$, $(3,-1,1,0)$ e $(1,0,0,1)$?",a:[4],k:"row",
 h:["Escalone usando a 1ª linha como pivô.","Restam $(0,0,-7,-5)$ e $(0,0,-3,-1)$, independentes."],e:"Posto 4: os quatro vetores são LI."},
{d:"d",t:"Cinco vetores",type:"num",q:"Qual é a dimensão do espaço-linha de $A_1=(1,0,0,0,1)$, $A_2=(1,1,0,0,0)$, $A_3=(1,0,1,0,1)$, $A_4=(1,1,0,1,1)$ e $A_5=(0,1,0,1,0)$?",a:[4],k:"row",
 h:["Procure uma relação entre os vetores.","$A_4-A_1=A_5$."],e:"A₅=A₄−A₁, então o conjunto é LD; os outros quatro são LI. Dimensão 4."},
{d:"m",t:"Sem saída",type:"num",q:"Qual é a nulidade de $T(x_1,x_2,x_3)=(x_1+x_3, 0, x_1+x_2)$?",a:[1],k:"ker",
 h:["$x_1+x_3=0$ e $x_1+x_2=0$.","Há um parâmetro livre."],e:"O núcleo é gerado por (1,−1,−1): nulidade 1."},
{d:"d",t:"Composição mortal",
 g:R=>{const v=[R.int(-4,5),R.int(-4,5),R.int(-4,5)],t=[v[0]+v[2],0,v[0]+v[1]],r=[t[0]-t[1],t[1]+t[2]];
   return {p:{v},a:r,
    q:"$S(x_1,x_2,x_3)=(x_1-x_2, x_2+x_3)$ e $T(x_1,x_2,x_3)=(x_1+x_3, 0, x_1+x_2)$. Calcule $ST"+tup(v)+"$.",
    h:["$T"+tup(v)+"="+tup(t)+"$.","Aplique $S$ ao resultado."],
    e:"T"+ttup(v)+"="+ttup(t)+" e S"+ttup(t)+"="+ttup(r)+"."}},
 type:"num",q:"$S(x_1,x_2,x_3)=(x_1-x_2, x_2+x_3)$ e $T(x_1,x_2,x_3)=(x_1+x_3, 0, x_1+x_2)$. Calcule $ST(1,2,3)$.",a:[4,3],k:"comp",
 h:["$T(1,2,3)=(4,0,3)$.","Aplique $S$ ao resultado."],e:"S(4,0,3)=(4−0, 0+3)=(4,3)."},
{d:"d",t:"Atalho no núcleo",type:"choice",q:"Em $V$ (polinômios), $S$ descarta $c_0$ e desloca os coeficientes: $S(p)=c_1+c_2x+c_3x^2+...$. Qual é o núcleo de $S$?",
 o:["Apenas {0}","Os polinômios constantes","Polinômios de grau 1","Todo $V$"],a:1,k:"ker",
 h:["$S(p)=0$ exige $c_1=c_2=...=0$.","$c_0$ fica livre."],e:"Só c₀ pode sobrar em p: N(S) são as constantes."},
{d:"d",t:"Prova indireta",type:"choice",q:"Se $T$ é injetora e $e_1,e_2,e_3$ são LI, o que se pode dizer de $T(e_1),T(e_2),T(e_3)$?",
 o:["São LI","São LD","Geram o contradomínio","Formam a base canônica"],a:0,k:"inv",
 h:["Se T é injetora, N(T)={0}.","Σ cᵢ·T(eᵢ) = T(Σ cᵢ·eᵢ)."],e:"Σ cᵢeᵢ ∈ N(T)={0}, e como os eᵢ são LI, todos os cᵢ são 0."},
{d:"b",t:"A dependência letal",
 g:R=>{const c=[R.nz(-5,5),R.nz(-5,5),R.nz(-5,5)],sp=c.slice(1),ts=[0,c[1],c[2]];
   return {p:{c},a:ts,
    q:"Para $p=c_0+c_1x+c_2x^2$, $S(p)=c_1+c_2x$ e $T(p)=c_0x+c_1x^2+c_2x^3$. Com $p="+poly(c)+"$, dê $(c_0,c_1,c_2)$ de $(TS)^2(p)$.",
    h:["Calcule $TS(p)$ primeiro: $S(p)="+poly(sp)+"$.","$TS(p)="+poly(ts)+"$. Aplique $TS$ de novo."],
    e:"TS(p)="+polyT(ts)+" e (TS)²(p)=TS("+polyT(ts)+")="+polyT(ts)+": TS zera c₀ e o resto fica. Logo "+ttup(ts)+"."}},
 type:"num",s:"Última sala. O suspeito sempre desfazia o que fazia, mas deixava marcas em cada coeficiente.",
 q:"Para $p=c_0+c_1x+c_2x^2$, $S(p)=c_1+c_2x$ e $T(p)=c_0x+c_1x^2+c_2x^3$. Com $p=1+2x+3x^2$, dê $(c_0,c_1,c_2)$ de $(TS)^2(p)$.",a:[0,2,3],k:"idop",
 h:["Calcule $TS(p)$ primeiro: $S(p)=2+3x$.","$TS(p)=2x+3x^2$. Aplique $TS$ de novo."],e:"TS(p)=2x+3x² e (TS)²(p)=TS(2x+3x²)=2x+3x², logo (0,2,3)."}
]}
];
