#!/usr/bin/env node
/* =====================================================================
   Validador dos dados do jogo:  node tools/validate.js
   - estrutura dos casos (cases.js) e dos flashcards;
   - cenas (scenes.js): um hotspot por fase, salas existentes, caixas dentro
     de 0–100%, requires sem ciclos e todos alcançáveis, chefão por último,
     estados data-on/data-off válidos, ids do SVG sem colisão com o sprite;
   - respostas: cada fase é recalculada aqui de forma independente
     (álgebra linear numérica), inclusive as versões sorteadas (campo g).
   Sai com código 1 se houver erro.
   ===================================================================== */
"use strict";
const fs=require("fs"),path=require("path"),vm=require("vm");
const ROOT=path.join(__dirname,"..");
const ctx={console};vm.createContext(ctx);
vm.runInContext(["cases.js","scenes.js"].map(f=>fs.readFileSync(path.join(ROOT,f),"utf8")).join("\n;\n")+
  "\n;this.SEEDS=SEEDS;this.FL=FL;this.SCENES=typeof SCENES!=='undefined'?SCENES:{};this.mkR=typeof mkR!=='undefined'?mkR:null;",ctx);
const {SEEDS,FL,SCENES,mkR}=ctx;

const errs=[],warns=[];
const E=(w,m)=>errs.push(w+": "+m),W=(w,m)=>warns.push(w+": "+m);
const N=10,SAMPLES=300,EPS=1e-6;

/* ---------- álgebra linear numérica ---------- */
const mul=(A,B)=>A.map(r=>B[0].map((_,j)=>r.reduce((s,a,k)=>s+a*B[k][j],0)));
const mv=(A,x)=>A.map(r=>r.reduce((s,a,k)=>s+a*x[k],0));
const add=(A,B)=>A.map((r,i)=>r.map((a,j)=>a+B[i][j]));
const sub=(A,B)=>A.map((r,i)=>r.map((a,j)=>a-B[i][j]));
const T=A=>A[0].map((_,j)=>A.map(r=>r[j]));
const eye=n=>Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>+(i===j)));
const pow=(A,n)=>{let R=eye(A.length);for(let k=0;k<n;k++)R=mul(R,A);return R};
const same=(A,B)=>A.every((r,i)=>r.every((a,j)=>Math.abs(a-B[i][j])<1e-9));
function rank(A){
  const M=A.map(r=>r.slice());let rk=0;const m=M.length,n=M[0].length;
  for(let c=0;c<n&&rk<m;c++){
    let p=rk;for(let i=rk+1;i<m;i++)if(Math.abs(M[i][c])>Math.abs(M[p][c]))p=i;
    if(Math.abs(M[p][c])<1e-9)continue;
    [M[rk],M[p]]=[M[p],M[rk]];
    for(let i=0;i<m;i++)if(i!==rk){const f=M[i][c]/M[rk][c];for(let j=c;j<n;j++)M[i][j]-=f*M[rk][j]}
    rk++;
  }
  return rk;
}
const nullity=A=>A[0].length-rank(A);
function solve(A,b){   /* Gauss com pivô parcial; A quadrada inversível */
  const n=A.length,M=A.map((r,i)=>r.concat([b[i]]));
  for(let c=0;c<n;c++){
    let p=c;for(let i=c+1;i<n;i++)if(Math.abs(M[i][c])>Math.abs(M[p][c]))p=i;
    if(Math.abs(M[p][c])<1e-12)throw new Error("matriz singular");
    [M[c],M[p]]=[M[p],M[c]];
    for(let i=0;i<n;i++)if(i!==c){const f=M[i][c]/M[c][c];for(let j=c;j<=n;j++)M[i][j]-=f*M[c][j]}
  }
  return M.map((r,i)=>r[n]/r[i]);
}
/* matriz canônica de uma função f: R^n -> R^m (colunas = f(e_j)) */
const matOf=(f,n)=>T(Array.from({length:n},(_,j)=>f(Array.from({length:n},(_,k)=>+(k===j)))));
const rnd=()=>Math.round((Math.random()*10-5)*100)/100;
const rv=n=>Array.from({length:n},rnd);
function isLinear(f,n){
  for(let t=0;t<30;t++){
    const x=rv(n),y=rv(n),a=rnd(),fx=f(x),fy=f(y);
    const s=f(x.map((v,k)=>v+y[k])),m=f(x.map(v=>a*v));
    if(s.some((v,k)=>Math.abs(v-fx[k]-fy[k])>1e-6)||m.some((v,k)=>Math.abs(v-a*fx[k])>1e-6))return false;
  }
  return true;
}
/* autovalores reais de 2×2 (ordem crescente); null se complexos */
function eig2(A){
  const tr=A[0][0]+A[1][1],dt=A[0][0]*A[1][1]-A[0][1]*A[1][0],d=tr*tr-4*dt;
  if(d<-1e-12)return null;const r=Math.sqrt(Math.max(d,0));return [(tr-r)/2,(tr+r)/2];
}
/* autovalores de 2×2 hermitiana [[a, b],[b̄, d]] com b = re + i·im */
const eigHerm=(a,re,im,d)=>{const m=(a+d)/2,r=Math.sqrt(((a-d)/2)**2+re*re+im*im);return [m-r,m+r]};
/* polinômios como vetor de coeficientes [c0,c1,...] */
const shiftDown=p=>p.slice(1);              /* S: descarta c0 */
const shiftUp=p=>[0].concat(p);             /* T: multiplica por x */
const pad=(p,n)=>Array.from({length:n},(_,k)=>p[k]||0);
const optIdx=(P,txt)=>P.o.findIndex(o=>o.replace(/\$/g,"").trim()===txt);

/* ---------- respostas esperadas, calculadas sem olhar P.a ----------
   Cada função recebe o caso resolvido P (com P.p = parâmetros sorteados, se houver). */
const V={
  /* ===== O Cofre Vazio ===== */
  "cofre:0":P=>{const f=[x=>[x[1],x[0]],x=>[x[0],1],x=>[x[0]+1,x[1]+2],x=>[x[0]**2,x[1]**2]];
    const lin=f.map(g=>isLinear(g,2));return lin.filter(Boolean).length===1?lin.indexOf(true):-1},
  "cofre:1":P=>{const [a,b,c,d]=P.p?P.p.m:[1,-1,1,1];const A=matOf(x=>[a*x[0]+b*x[1],c*x[0]+d*x[1]],2);return [A.flat().reduce((s,v)=>s+v,0)]},
  "cofre:2":()=>[nullity(matOf(x=>[x[0],0],2))],
  "cofre:3":()=>[rank(matOf(x=>[x[0],x[1],0],3))],
  "cofre:4":P=>{const A=P.p?P.p.A:[[1,-4,2],[-1,4,-2]],B=P.p?P.p.B:[[1,2],[-1,3],[5,-2]];return [mul(A,B)[0][0]]},
  "cofre:5":P=>solve(matOf(x=>[x[0]-x[1],x[0]+x[1]],2),P.p?P.p.y:[2,4]),
  "cofre:6":P=>{const S=x=>[x[0]-x[1],x[0]+x[1],x[0]+2*x[1]],Tt=x=>[x[0],-x[1]];return S(Tt(P.p?P.p.v:[2,1]))},
  "cofre:7":P=>pad(shiftUp(shiftDown(P.p?P.p.c:[2,3,-1,1])),4),
  "cofre:8":()=>{const S=x=>[x[0]-x[1],x[1]+x[2]],Tt=x=>[x[2],x[1],x[0]];return [nullity(matOf(x=>S(Tt(x)),3))]},
  "cofre:9":P=>{const Tt=x=>[x[0],2*x[1],3*x[2]],S=x=>[x[2],x[1],x[0]];return solve(matOf(x=>S(Tt(x)),3),P.p?P.p.y:[3,4,9])},
  /* ===== A Matriz Fantasma ===== */
  "fantasma:0":P=>solve(matOf(x=>[x[0],-x[1]],2),P.p?P.p.y:[3,5]),
  "fantasma:1":P=>{const A=matOf(x=>[x[0],x[1]],3);return optIdx(P,A.length+" × "+A[0].length)},
  "fantasma:2":P=>mv([[1,-1,0],[0,1,1]],P.p?P.p.v:[1,2,3]),
  "fantasma:3":()=>{ /* D na base (sen, cos): coordenadas de D(f) achadas numericamente */
    const h=1e-5,d=f=>x=>(f(x+h)-f(x-h))/(2*h),basis=[Math.sin,Math.cos],xs=[.3,1.1];
    const B=xs.map(x=>basis.map(b=>b(x)));
    const cols=basis.map(b=>solve(B,xs.map(x=>d(b)(x))));
    return [Math.round(T(cols)[0][1]*1e4)/1e4]},
  "fantasma:4":P=>[pow([[1,1],[0,1]],P.p?P.p.n:10)[0][1]],
  "fantasma:5":P=>{const B=[[1,2],[-1,3],[5,-2]],C=P.p?P.p.C:[[2,2],[1,-1],[1,-3]];return [add(B,C).flat().reduce((s,v)=>s+v,0)]},
  "fantasma:6":P=>{
    const ok=[];for(let t=0;t<20;t++){
      const A=[rv(2),rv(2)],B=[rv(2),rv(2)],S=add(A,B),D=sub(A,B),A2=mul(A,A),B2=mul(B,B),AB=mul(A,B),BA=mul(B,A);
      const two=AB.map(r=>r.map(v=>2*v));
      ok.push([same(mul(S,S),add(add(A2,two),B2)),same(mul(S,S),add(add(add(A2,AB),BA),B2)),same(mul(S,D),sub(A2,B2)),same(AB,BA)]);
    }
    const always=[0,1,2,3].filter(k=>ok.every(r=>r[k]));return always.length===1?always[0]:-1},
  "fantasma:7":P=>[pow([[1,1,1],[0,1,1],[0,0,1]],P.p?P.p.n:4)[0][2]],
  "fantasma:8":P=>{ /* P5: D e T(p)=∫0^x p; núcleo de TD */
    /* T: P_5 -> P_6 (7×6); D: P_6 -> P_5 (6×7) para DT; D: P_5 -> P_5 (6×6) para TD */
    const n=6,Dm=c=>Array.from({length:n},(_,i)=>Array.from({length:c},(_,j)=>j===i+1?j:0));
    const I=Array.from({length:n+1},(_,i)=>Array.from({length:n},(_,j)=>i===j+1?1/i:0));
    if(!same(mul(Dm(n+1),I),eye(n)))return -2;
    const TD=mul(I,Dm(n)),k=nullity(TD),cte=mv(TD,[1,0,0,0,0,0]).every(v=>Math.abs(v)<1e-12);
    return optIdx(P,k===0?"Apenas {0}":k===1&&cte?"Os polinômios constantes":k===2?"Polinômios de grau ≤ 1":"Todo P_5")},
  "fantasma:9":P=>solve([[1,1,0],[0,1,1],[0,0,1]],P.p?P.p.y:[1,2,3]),
  /* ===== A Dependência Letal ===== */
  "dependencia:0":P=>{const f=[x=>[x[0],x[0]],x=>[x[0],0],x=>[Math.exp(x[0]),Math.exp(x[1])],x=>[x[0]-x[1],x[0]+x[1]]];
    const nl=f.map(g=>!isLinear(g,2));return nl.filter(Boolean).length===1?nl.indexOf(true):-1},
  "dependencia:1":()=>[rank([[1,-1,0],[0,1,-1],[2,3,1]])],
  "dependencia:2":()=>[rank(matOf(x=>[x[0]-x[1],x[0]+x[1],x[0]+2*x[1]],2))],
  "dependencia:3":()=>[rank([[1,-1,2,1],[-1,2,-1,0],[3,-1,1,0],[1,0,0,1]])],
  "dependencia:4":()=>[rank([[1,0,0,0,1],[1,1,0,0,0],[1,0,1,0,1],[1,1,0,1,1],[0,1,0,1,0]])],
  "dependencia:5":()=>[nullity(matOf(x=>[x[0]+x[2],0,x[0]+x[1]],3))],
  "dependencia:6":P=>{const S=x=>[x[0]-x[1],x[1]+x[2]],Tt=x=>[x[0]+x[2],0,x[0]+x[1]];return S(Tt(P.p?P.p.v:[1,2,3]))},
  "dependencia:7":P=>{ /* V truncado em grau 7: S descarta c0 */
    const n=8,S=Array.from({length:n-1},(_,i)=>Array.from({length:n},(_,j)=>+(j===i+1)));
    const k=nullity(S),cte=mv(S,[1,0,0,0,0,0,0,0]).every(v=>v===0);
    return optIdx(P,k===0?"Apenas {0}":k===1&&cte?"Os polinômios constantes":"Polinômios de grau 1")},
  "dependencia:8":P=>{ /* T injetora (posto cheio nas colunas) leva LI em LI: testa numericamente */
    for(let t=0;t<20;t++){
      let A;do{A=[rv(3),rv(3),rv(3),rv(3)]}while(rank(A)<3);
      let E;do{E=[rv(3),rv(3),rv(3)]}while(rank(E)<3);
      if(rank(E.map(e=>mv(A,e)))!==3)return -1;
    }
    return optIdx(P,"São LI")},
  "dependencia:9":P=>{const TS=p=>pad(shiftUp(shiftDown(p)),3);return TS(TS(P.p?P.p.c:[1,2,3]))},
  /* ===== O Observatório Quadrático ===== */
  "observatorio:0":P=>{const A=P.p?P.p.A:[[2,1],[1,2]],v=[1,1],w=mv(A,v),l=w[0]/v[0];
    return w.every((x,k)=>Math.abs(x-l*v[k])<1e-9)?[l]:[NaN]},
  "observatorio:1":P=>{const e=eig2(P.p?P.p.A:[[3,5],[0,-2]]);return [e[1]]},
  "observatorio:2":P=>eig2(P.p?P.p.A:[[4,1],[2,3]]),
  "observatorio:3":P=>solve(T([[1,1],[1,-1]]),P.p?P.p.v:[5,1]),
  "observatorio:4":P=>{const a=P.p?P.p.a:2,b=P.p?P.p.b:1;return eigHerm(a,0,b,a)},
  "observatorio:5":P=>{const Q=[[0,-1],[1,0]];return same(mul(T(Q),Q),eye(2))?mv(T(Q),P.p?P.p.v:[1,2]):[NaN]},
  "observatorio:6":P=>{const [a,b,c]=P.p?P.p.f:[3,4,3];return eig2([[a,b/2],[b/2,c]])},
  "observatorio:7":P=>{const e=eig2([[3,2],[2,3]]),r=5,pos=e.filter(x=>x>1e-9).length,ng=e.filter(x=>x<-1e-9).length;
    return optIdx(P,pos===2&&r>0?"Elipse":pos===1&&ng===1?"Hipérbole":pos+ng===1?"Parábola":"Par de retas")},
  "observatorio:8":P=>{const d=[1,1,-1],r=1,pos=d.filter(x=>x>0).length;
    return optIdx(P,r===0?"Cone":pos===3?"Elipsoide":pos===2?"Hiperboloide de uma folha":"Hiperboloide de duas folhas")},
  "observatorio:9":P=>{const pts=P.p?P.p.pts:[[-1,1],[0,1],[1,4]],A=pts.map(q=>[1,q[0]]),y=pts.map(q=>q[1]),At=T(A);
    return solve(mul(At,A),mv(At,y))},
};

/* ---------- casos ---------- */
const ids=new Set();
const checkCase=(w,P,seedId,i)=>{
  if(!/^[fmdb]$/.test(P.d))E(w,"dificuldade inválida: "+P.d);
  ["t","q","e"].forEach(k=>{if(typeof P[k]!=="string"||!P[k].trim())E(w,"campo "+k+" vazio")});
  if(!FL[P.k])E(w,"chave FL inexistente: "+P.k);
  if(!Array.isArray(P.h)||P.h.length!==2||P.h.some(x=>typeof x!=="string"||!x.trim()))E(w,"precisa de exatamente 2 dicas");
  if(P.type==="choice"){
    if(!Array.isArray(P.o)||P.o.length<2||P.o.length>4)E(w,"choice precisa de 2–4 opções");
    else if(!(Number.isInteger(P.a)&&P.a>=0&&P.a<P.o.length))E(w,"índice a fora de o: "+P.a);
    if(new Set(P.o).size!==P.o.length)E(w,"opções repetidas");
  }else if(P.type==="num"){
    const a=[].concat(P.a);
    if(!a.length||a.some(v=>!Number.isFinite(v)))E(w,"resposta numérica inválida: "+JSON.stringify(P.a));
  }else E(w,"type inválido: "+P.type);
  const f=V[seedId+":"+i];
  if(!f){E(w,"sem verificação independente em tools/validate.js");return}
  let exp;try{exp=f(P)}catch(e){E(w,"verificação falhou: "+e.message);return}
  if(P.type==="choice"){if(exp!==P.a)E(w,"resposta "+P.a+" mas o cálculo dá "+exp)}
  else{const a=[].concat(P.a);if(exp.length!==a.length||exp.some((v,k)=>Math.abs(v-a[k])>EPS))E(w,"resposta "+JSON.stringify(a)+" mas o cálculo dá "+JSON.stringify(exp))}
};
if(!Array.isArray(SEEDS)||!SEEDS.length)E("SEEDS","vazio");
let gens=0;
SEEDS.forEach((s,si)=>{
  const w0="caso "+(s.id||si);
  if(typeof s.id!=="string"||!/^[a-z0-9-]+$/.test(s.id))E(w0,"id ausente ou inválido");
  else if(ids.has(s.id))E(w0,"id repetido");else ids.add(s.id);
  ["nome","ic","intro"].forEach(k=>{if(!s[k])E(w0,"campo "+k+" vazio")});
  if(!Array.isArray(s.casos)||s.casos.length!==N){E(w0,"precisa de "+N+" fases");return}
  if(s.casos[N-1].d!=="b")W(w0,"a última fase não é chefão");
  s.casos.forEach((P,i)=>{
    const w=w0+" fase "+i+" ("+P.t+")";
    checkCase(w,P,s.id,i);
    if(typeof P.g==="function"){
      gens++;
      if(!mkR){E(w,"g definido mas mkR ausente em cases.js");return}
      const seen=new Set();
      for(let k=0;k<SAMPLES;k++){
        const G=P.g(mkR(1000+k*7919));
        if(!G||typeof G!=="object"){E(w,"g não devolveu objeto");break}
        if("t" in G||"k" in G||"d" in G||"type" in G)E(w,"g não pode trocar t, k, d ou type");
        const Q=Object.assign({},P,G),n0=errs.length;
        checkCase(w+" [sorteio "+k+"]",Q,s.id,i);
        if(errs.length>n0)break;
        seen.add(JSON.stringify(Q.a));
      }
      if(seen.size<3)W(w,"g gera só "+seen.size+" respostas distintas");
    }
  });
});
for(const k in FL)if(!FL[k].k||!FL[k].p)E("FL."+k,"precisa de k e p");
const usedFL=new Set(SEEDS.flatMap(s=>s.casos.map(c=>c.k)));
for(const k in FL)if(!usedFL.has(k))W("FL."+k,"não usado por nenhuma fase");

/* ---------- cenas ---------- */
const svgIds={};
for(const id in SCENES){
  const w0="cena "+id,seed=SEEDS.find(s=>s.id===id);
  if(!seed){E(w0,"não corresponde a nenhum id de SEEDS");continue}
  let D;try{D=typeof SCENES[id]==="function"?SCENES[id]():SCENES[id]}catch(e){E(w0,"falhou ao montar: "+e.message);continue}
  if(!D||!Array.isArray(D.salas)||!D.salas.length){E(w0,"sem salas");continue}
  ["intro"].forEach(k=>{if(!D[k])E(w0,"campo "+k+" vazio")});
  if(!D.final||!D.final.texto||!D.final.fala)E(w0,"final precisa de texto e fala");
  const salas=new Set();
  D.salas.forEach(r=>{
    if(salas.has(r.id))E(w0,"sala repetida "+r.id);salas.add(r.id);
    if(!r.nome)E(w0,"sala "+r.id+" sem nome");
    if(typeof r.svg!=="string"||!/^<svg[\s\S]*<\/svg>$/.test(r.svg.trim()))E(w0,"sala "+r.id+": svg inválido");
    if(!/viewBox="0 0 1600 900"/.test(r.svg))E(w0,"sala "+r.id+": viewBox deve ser 0 0 1600 900");
    const open=(r.svg.match(/<g\b/g)||[]).length,close=(r.svg.match(/<\/g>/g)||[]).length;
    if(open!==close)E(w0,"sala "+r.id+": <g> sem fechar ("+open+" abertos, "+close+" fechados)");
    for(const m of r.svg.matchAll(/data-(on|off)="([^"]*)"/g)){const k=+m[2];if(!(Number.isInteger(k)&&k>=0&&k<N))E(w0,"sala "+r.id+": data-"+m[1]+" inválido: "+m[2])}
    for(const m of r.svg.matchAll(/\bid="([^"]+)"/g)){
      if(m[1].startsWith("i-"))E(w0,"id "+m[1]+" colide com o sprite de ícones");
      (svgIds[m[1]]=svgIds[m[1]]||new Set()).add(id+"/"+r.id);
    }
    for(const m of r.svg.matchAll(/url\(#([^)]+)\)/g))if(!new RegExp('id="'+m[1]+'"').test(r.svg))E(w0,"sala "+r.id+": url(#"+m[1]+") sem definição");
  });
  const hs=D.hotspots||[],by={};
  hs.forEach(h=>{
    const w=w0+" hotspot "+h.caso+" ("+h.nome+")";
    if(!(Number.isInteger(h.caso)&&h.caso>=0&&h.caso<N)){E(w,"caso inválido");return}
    if(by[h.caso])E(w,"fase com mais de um hotspot");by[h.caso]=h;
    if(!salas.has(h.sala))E(w,"sala inexistente: "+h.sala);
    ["nome","falaAbrir","falaResolvido","pista"].forEach(k=>{if(!h[k])E(w,"campo "+k+" vazio")});
    ["x","y","w","h"].forEach(k=>{if(!Number.isFinite(h[k]))E(w,k+" inválido")});
    if(h.x<0||h.y<0||h.w<=0||h.h<=0||h.x+h.w>100+1e-9||h.y+h.h>100+1e-9)E(w,"caixa fora da cena: "+[h.x,h.y,h.w,h.h].map(v=>v.toFixed(2)).join(","));
    const rq=h.requires||[];
    rq.forEach(r=>{if(!(Number.isInteger(r)&&r>=0&&r<N)||r===h.caso)E(w,"requires inválido: "+r)});
    if(rq.length&&!h.falaBloqueado)E(w,"tem requires mas não tem falaBloqueado");
  });
  for(let i=0;i<N;i++)if(!by[i])E(w0,"fase "+i+" sem hotspot");
  /* alcançabilidade (também detecta ciclos): resolve tudo que estiver disponível até parar */
  const done=new Set();let moved=true;
  while(moved){moved=false;for(const h of hs)if(!done.has(h.caso)&&(h.requires||[]).every(r=>done.has(r))){done.add(h.caso);moved=true}}
  for(let i=0;i<N;i++)if(by[i]&&!done.has(i))E(w0,"fase "+i+" nunca fica disponível (ciclo ou requires impossível)");
  const boss=seed.casos.findIndex(c=>c.d==="b");
  if(boss>=0&&by[boss]){
    const need=new Set(),st=[...(by[boss].requires||[])];
    while(st.length){const r=st.pop();if(need.has(r))continue;need.add(r);if(by[r])st.push(...(by[r].requires||[]))}
    const miss=[...Array(N).keys()].filter(i=>i!==boss&&!need.has(i));
    if(miss.length)E(w0,"o chefão (fase "+boss+") abre antes das fases "+miss.join(","));
  }
  if(!hs.some(h=>!(h.requires||[]).length))E(w0,"nenhum hotspot começa disponível");
}
for(const k in svgIds)if(svgIds[k].size>1){
  const scenes=new Set([...svgIds[k]].map(x=>x.split("/")[0]));
  if(scenes.size>1)W("svg id "+k,"repetido em cenas diferentes: "+[...svgIds[k]].join(", "));
}

/* ---------- relatório ---------- */
warns.forEach(m=>console.log("aviso  "+m));
errs.forEach(m=>console.log("ERRO   "+m));
const nc=SEEDS.reduce((s,x)=>s+(x.casos||[]).length,0);
console.log("\n"+SEEDS.length+" casos, "+nc+" fases ("+gens+" com sorteio × "+SAMPLES+"), "+Object.keys(SCENES).length+" cenas. "+
  (errs.length?errs.length+" erro(s).":"Tudo certo.")+(warns.length?" "+warns.length+" aviso(s).":""));
process.exit(errs.length?1:0);
