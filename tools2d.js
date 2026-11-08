"use strict";
/* =====================================================================
   FERRAMENTAS GEOMÉTRICAS 2D (Etapa 4). Carregado depois de scenes.js.
   Uma fase usa uma ferramenta com:  tool:"tipo", tp:P=>({parâmetros})
   (tp recebe a fase já sorteada, então a ferramenta acompanha P.p).
   Cada tipo tem:
     nome          rótulo do botão
     ans(tp)       resposta obtida SÓ pelo que a ferramenta alcança (grade de ímã);
                   tools/validate.js confere que ela bate com a resposta da fase
     solve(tp,st)  leva o estado ao alvo (usado pelo teste de fumaça)
     ui(el,tp,st,use)  monta a ferramenta; use(valor) entrega o resultado ao painel
   Desenho em SVG, refeito só quando há interação. Teclado: setas movem o ponto.
   ===================================================================== */
const TL={
  mv:(A,x)=>A.map(r=>r.reduce((s,a,k)=>s+a*x[k],0)),
  mul:(A,B)=>A.map(r=>B[0].map((_,j)=>r.reduce((s,a,k)=>s+a*B[k][j],0))),
  eq:(a,b)=>a.length===b.length&&a.every((v,k)=>Math.abs(v-b[k])<1e-9),
  zero:v=>v.every(x=>Math.abs(x)<1e-9),
  r6:x=>Math.round(x*1e6)/1e6,
  /* número para exibir: −3, 1,5 */
  f:x=>{const v=Math.round(x*100)/100;return (v<0?"−":"")+String(Math.abs(v)).replace(".",",")},
  vec:v=>"("+v.map(x=>TL.f(x)).join(v.some(x=>Math.round(x)!==x)?"; ":", ")+")",
  rank2:vs=>{if(!vs.length)return 0;const [a,b]=vs[0];return vs.some(([c,d])=>Math.abs(a*d-b*c)>1e-9)?2:1},
  /* plano com limites b={x0,x1,y0,y1} desenhado em W×H unidades de SVG */
  plane(b,W,H){
    const kx=W/(b.x1-b.x0),ky=H/(b.y1-b.y0),X=x=>+((x-b.x0)*kx).toFixed(2),Y=y=>+((b.y1-y)*ky).toFixed(2);
    return {b,W,H,X,Y,kx,ky,
      grid(step){let s='<g class="tg">';const st=step||1;
        for(let x=Math.ceil(b.x0/st)*st;x<=b.x1;x+=st)s+='<line x1="'+X(x)+'" y1="0" x2="'+X(x)+'" y2="'+H+'"'+(Math.abs(x)<1e-9?' class="ax"':"")+"/>";
        for(let y=Math.ceil(b.y0/st)*st;y<=b.y1;y+=st)s+='<line x1="0" y1="'+Y(y)+'" x2="'+W+'" y2="'+Y(y)+'"'+(Math.abs(y)<1e-9?' class="ax"':"")+"/>";
        return s+"</g>"},
      arrow(p,q,cls,lab){const x1=X(p[0]),y1=Y(p[1]),x2=X(q[0]),y2=Y(q[1]),L=Math.hypot(x2-x1,y2-y1);if(L<2)return "";
        const a=Math.atan2(y2-y1,x2-x1),h=Math.min(13,L/2),hx=(t)=>(x2-h*Math.cos(a+t)).toFixed(1)+","+(y2-h*Math.sin(a+t)).toFixed(1);
        return '<g class="ta '+cls+'"><line x1="'+x1+'" y1="'+y1+'" x2="'+(x2-h*.6*Math.cos(a)).toFixed(1)+'" y2="'+(y2-h*.6*Math.sin(a)).toFixed(1)+'"/><polygon points="'+x2+","+y2+" "+hx(.45)+" "+hx(-.45)+'"/>'+
          (lab?'<text x="'+(x2+12*Math.cos(a)+(Math.cos(a)<-.3?-8:4)).toFixed(1)+'" y="'+(y2+12*Math.sin(a)+5).toFixed(1)+'"'+(Math.cos(a)<-.3?' text-anchor="end"':"")+">"+lab+"</text>":"")+"</g>"},
      line(p,q,cls){return '<line class="'+cls+'" x1="'+X(p[0])+'" y1="'+Y(p[1])+'" x2="'+X(q[0])+'" y2="'+Y(q[1])+'"/>'},
      dot(p,cls,r,lab){return '<circle class="'+cls+'" cx="'+X(p[0])+'" cy="'+Y(p[1])+'" r="'+(r||6)+'"/>'+(lab?'<text class="tl" x="'+(X(p[0])+10)+'" y="'+(Y(p[1])-10)+'">'+lab+"</text>":"")},
      handle(p,id,lab){return '<g class="th" data-h="'+id+'"><circle cx="'+X(p[0])+'" cy="'+Y(p[1])+'" r="22" class="thz"/><circle cx="'+X(p[0])+'" cy="'+Y(p[1])+'" r="9"/>'+(lab?'<text x="'+(X(p[0])+14)+'" y="'+(Y(p[1])+22)+'">'+lab+"</text>":"")+"</g>"},
      user(svg,e){const r=svg.getBoundingClientRect();return [((e.clientX-r.left)*W/r.width)/kx+b.x0,b.y1-((e.clientY-r.top)*H/r.height)/ky]}
    };
  },
  sq:(R)=>({x0:-R,x1:R,y0:-R,y1:R}),
  /* esqueleto comum: svg + leitura + botão "Usar resultado" (+ controles extras em html) */
  frame(el,o){
    el.innerHTML='<p class="tint">'+o.intro+'</p>'+(o.ctrl||"")+
      '<svg class="tsvg" viewBox="0 0 '+o.W+" "+o.H+'" tabindex="0" role="application" aria-label="'+o.aria+'" aria-describedby="tread"></svg>'+
      '<p class="tread" id="tread" aria-live="polite"></p><div class="row trow2"><button type="button" class="btn stamp" id="tuse" disabled>Usar resultado</button></div>';
    return {svg:el.querySelector("svg"),read:el.querySelector(".tread"),use:el.querySelector("#tuse")};
  },
  /* arraste: pointer sobre o svg move a alça (a mais próxima, ou a padrão); redesenho a cada quadro */
  drag(svg,P,pick,move){
    let on=null;
    svg.addEventListener("pointerdown",e=>{const h=e.target.closest("[data-h]");on=h?h.dataset.h:pick(P.user(svg,e));if(!on)return;
      svg.setPointerCapture(e.pointerId);e.preventDefault();move(on,P.user(svg,e))});
    svg.addEventListener("pointermove",e=>{if(on)move(on,P.user(svg,e))});
    const up=()=>{on=null};svg.addEventListener("pointerup",up);svg.addEventListener("pointercancel",up);
  },
  keys(svg,fn){svg.addEventListener("keydown",e=>{const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,1],ArrowDown:[0,-1]}[e.key];if(d){e.preventDefault();fn(d,e.shiftKey)}})},
  raf(fn){let q=false;return()=>{if(q)return;q=true;requestAnimationFrame(()=>{q=false;fn()})}},
  clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),
  W:420
};

const TOOLS2D={
/* ---------- núcleo: achar as direções que vão para zero ---------- */
kernel:{nome:"Ponto cego (núcleo)",
  ans(tp){const f=[];for(let x=-3;x<=3;x++)for(let y=-3;y<=3;y++)if((x||y)&&TL.zero(TL.mv(tp.A,[x,y])))f.push([x,y]);return [TL.rank2(f)]},
  solve(tp,st){st.marks=[];for(let x=-3;x<=3;x++)for(let y=-3;y<=3;y++)if((x||y)&&TL.zero(TL.mv(tp.A,[x,y]))&&TL.rank2(st.marks.concat([[x,y]]))>st.marks.length)st.marks.push([x,y]);st.v=st.marks[0]||[1,1]},
  ui(el,tp,st,use){
    st.v=st.v||[1,1];st.marks=st.marks||[];const R=4,P=TL.plane(TL.sq(R),TL.W,TL.W);
    const F=TL.frame(el,{W:TL.W,H:TL.W,aria:"Plano: arraste o vetor v ou use as setas",
      intro:"Arraste <b>v</b>. A seta ciano é <b>Av</b>. Quando ela some (Av = 0), marque a direção: o núcleo é o conjunto dessas direções.",
      ctrl:'<div class="row trow2"><button type="button" class="btn sm" id="tmark" disabled>Marcar direção</button><button type="button" class="btn sm" id="tclr">Limpar marcas</button></div>'});
    const mark=el.querySelector("#tmark");
    const draw=TL.raf(()=>{
      const Av=TL.mv(tp.A,st.v),z=TL.zero(Av)&&!TL.zero(st.v);
      let s=P.grid();
      st.marks.forEach(m=>{const k=R*2;s+=P.line([-m[0]*k,-m[1]*k],[m[0]*k,m[1]*k],"tk")});
      s+=P.arrow([0,0],st.v,"go wide","v")+P.arrow([0,0],Av,"cy","Av")+P.handle(st.v,"v");
      F.svg.innerHTML=s;F.svg.classList.toggle("lock",z);
      const novo=z&&TL.rank2(st.marks.concat([st.v]))>st.marks.length;mark.disabled=!novo;
      F.read.innerHTML="v = "+TL.vec(st.v)+" · Av = "+TL.vec(Av)+(z?' · <b class="tok">Av = 0: esta direção some.</b>':"")+
        "<br>Direções independentes marcadas: <b>"+st.marks.length+"</b> ⇒ dimensão do núcleo (nulidade) = <b>"+st.marks.length+"</b>";
      F.use.disabled=!st.marks.length;
    });
    const set=p=>{st.v=[TL.clamp(Math.round(p[0]),-R,R),TL.clamp(Math.round(p[1]),-R,R)];draw()};
    TL.drag(F.svg,P,()=>"v",(_,p)=>set(p));TL.keys(F.svg,d=>set([st.v[0]+d[0],st.v[1]+d[1]]));
    mark.onclick=()=>{st.marks.push(st.v.slice());draw()};
    el.querySelector("#tclr").onclick=()=>{st.marks=[];draw()};
    F.use.onclick=()=>use([st.marks.length]);draw();
  }},

/* ---------- composição: a ordem importa (e as dimensões precisam encaixar) ---------- */
compose:{nome:"Ordem da composição",
  ans(tp){return TL.mv(tp.S,TL.mv(tp.T,tp.v))},
  solve(tp,st){st.order="ST"},
  ui(el,tp,st,use){
    const Tv=TL.mv(tp.T,tp.v),R=Math.max(4,...tp.v.map(Math.abs),...Tv.map(Math.abs))+1,P=TL.plane(TL.sq(R),TL.W,TL.W);
    const dim=M=>M.length+"×"+M[0].length;
    const F=TL.frame(el,{W:TL.W,H:TL.W,aria:"Plano com v e T(v)",
      intro:"Escolha a ordem dos cartões. Em <b>ST</b>, T age primeiro; em <b>TS</b>, S age primeiro. T é "+dim(tp.T)+" e S é "+dim(tp.S)+".",
      ctrl:'<div class="row trow2 cards" role="radiogroup" aria-label="Ordem"><button type="button" class="btn sm" role="radio" data-o="ST">Primeiro T, depois S (ST)</button><button type="button" class="btn sm" role="radio" data-o="TS">Primeiro S, depois T (TS)</button></div>'});
    const draw=()=>{
      el.querySelectorAll("[data-o]").forEach(b=>b.setAttribute("aria-checked",b.dataset.o===st.order));
      let s=P.grid()+P.arrow([0,0],tp.v,"go","v");
      if(st.order==="ST")s+=P.arrow([0,0],Tv,"cy","T(v)");
      F.svg.innerHTML=s;
      if(st.order==="ST"){const r=TL.mv(tp.S,Tv);F.read.innerHTML="1) T(v) = "+TL.vec(Tv)+" (no plano)<br>2) S(T(v)) = <b>"+TL.vec(r)+"</b> ∈ ℝ"+r.length+' · <b class="tok">ST(v) calculado.</b>';F.use.disabled=false}
      else if(st.order==="TS"){const r=TL.mv(tp.S,tp.v);F.read.innerHTML="1) S(v) = "+TL.vec(r)+" ∈ ℝ"+r.length+"<br>2) T só aceita vetores do ℝ"+tp.T[0].length+': <b class="tbad">TS(v) não existe.</b> A ordem muda tudo.';F.use.disabled=true}
      else{F.read.textContent="Escolha uma ordem.";F.use.disabled=true}
    };
    el.querySelectorAll("[data-o]").forEach(b=>b.onclick=()=>{st.order=b.dataset.o;draw()});
    F.use.onclick=()=>use(TL.mv(tp.S,Tv));draw();
  }},

/* ---------- resolver Ax = y arrastando x (inversa; com determinante ou comprimentos) ---------- */
solve:{nome:"Achar x com Ax = y",
  ans(tp){for(let x=-12;x<=12;x++)for(let y=-12;y<=12;y++)if(TL.eq(TL.mv(tp.A,[x,y]),tp.y))return [x,y];return [NaN,NaN]},
  solve(tp,st){st.x=TOOLS2D.solve.ans(tp)},
  ui(el,tp,st,use){
    st.x=st.x||[1,1];const xs=TOOLS2D.solve.ans(tp),R=Math.max(4,...tp.y.map(Math.abs),...xs.map(Math.abs))+1,P=TL.plane(TL.sq(R),TL.W,TL.W);
    const det=tp.A[0][0]*tp.A[1][1]-tp.A[0][1]*tp.A[1][0],len=v=>Math.hypot(v[0],v[1]);
    const F=TL.frame(el,{W:TL.W,H:TL.W,aria:"Plano: arraste x ou use as setas",
      intro:"Arraste <b>x</b> até que <b>Ax</b> (ciano) caia sobre o alvo <b>y</b>. Esse x é a inversa aplicada a y."+(tp.show==="det"?" O paralelogramo é a imagem do quadrado unitário: sua área com sinal é o determinante.":" Compare os comprimentos de x e de Ax.")});
    const draw=TL.raf(()=>{
      const Ax=TL.mv(tp.A,st.x),ok=TL.eq(Ax,tp.y);let s=P.grid();
      if(tp.show==="det"){const c=[[0,0],[1,0],[1,1],[0,1]],im=c.map(p=>TL.mv(tp.A,p));
        s+='<polygon class="tsq" points="'+c.map(p=>P.X(p[0])+","+P.Y(p[1])).join(" ")+'"/><polygon class="tpar" points="'+im.map(p=>P.X(p[0])+","+P.Y(p[1])).join(" ")+'"/>'}
      s+=P.dot(tp.y,"ttg",11,"y")+P.arrow([0,0],st.x,"go wide","x")+P.arrow([0,0],Ax,"cy","Ax")+P.handle(st.x,"x");
      F.svg.innerHTML=s;F.svg.classList.toggle("lock",ok);
      F.read.innerHTML="x = "+TL.vec(st.x)+" · Ax = "+TL.vec(Ax)+" · alvo y = "+TL.vec(tp.y)+
        (tp.show==="det"?"<br>det A = <b>"+TL.f(det)+"</b>"+(det<0?" (orientação invertida)":""):"<br>|x| = "+TL.f(len(st.x))+" · |Ax| = "+TL.f(len(Ax))+(Math.abs(len(st.x)-len(Ax))<1e-9?" · comprimentos iguais":""))+
        (ok?'<br><b class="tok">Ax = y: a inversa leva y em x = '+TL.vec(st.x)+".</b>":"");
      F.use.disabled=!ok;
    });
    const set=p=>{st.x=[TL.clamp(Math.round(p[0]),-R,R),TL.clamp(Math.round(p[1]),-R,R)];draw()};
    TL.drag(F.svg,P,()=>"x",(_,p)=>set(p));TL.keys(F.svg,d=>set([st.x[0]+d[0],st.x[1]+d[1]]));
    F.use.onclick=()=>use(st.x.slice());draw();
  }},

/* ---------- potências: aplicar A repetidas vezes à grade ---------- */
power:{nome:"Potências de A",
  ans(tp){let M=[[1,0],[0,1]];for(let k=0;k<tp.n;k++)M=TL.mul(tp.A,M);return [M[tp.e[0]][tp.e[1]]]},
  solve(tp,st){st.k=tp.n},
  ui(el,tp,st,use){
    st.k=st.k||0;const R=4,P=TL.plane(TL.sq(R),TL.W,TL.W);
    const F=TL.frame(el,{W:TL.W,H:TL.W,aria:"Grade transformada por A elevado a k",
      intro:"Cada clique aplica A mais uma vez à grade. Observe o padrão da matriz e chegue a A<sup>"+tp.n+"</sup>.",
      ctrl:'<div class="row trow2"><button type="button" class="btn sm" id="tm1">−1</button><button type="button" class="btn sm" id="tp1">Aplicar A (+1)</button><button type="button" class="btn sm" id="tp5">+5</button></div>'});
    const pw=k=>{let M=[[1,0],[0,1]];for(let j=0;j<k;j++)M=TL.mul(tp.A,M);return M};
    const draw=()=>{
      const M=pw(st.k),ok=st.k===tp.n;let s=P.grid()+'<g class="tw">';
      for(let c=-8;c<=8;c++){s+=P.line(TL.mv(M,[c,-8]),TL.mv(M,[c,8]),"")+P.line(TL.mv(M,[-8,c]),TL.mv(M,[8,c]),"")}
      s+="</g>"+P.arrow([0,0],TL.mv(M,[1,0]),"go","Aᵏe₁")+P.arrow([0,0],TL.mv(M,[0,1]),"cy","Aᵏe₂");
      F.svg.innerHTML=s;F.svg.classList.toggle("lock",ok);
      const mt="mat("+M.map(r=>r.map(TL.f).join(",")).join(";")+")";
      F.read.innerHTML="k = <b>"+st.k+"</b> · A<sup>"+st.k+'</sup> = <span class="m">'+(typeof mth==="function"?mth(mt):mt)+"</span>"+
        (ok?'<br><b class="tok">Chegou a A<sup>'+tp.n+"</sup>: o elemento ("+(tp.e[0]+1)+","+(tp.e[1]+1)+") vale "+TL.f(M[tp.e[0]][tp.e[1]])+".</b>":"");
      F.use.disabled=!ok;
    };
    const add=d=>{st.k=TL.clamp(st.k+d,0,60);draw()};
    el.querySelector("#tm1").onclick=()=>add(-1);el.querySelector("#tp1").onclick=()=>add(1);el.querySelector("#tp5").onclick=()=>add(5);
    TL.keys(F.svg,d=>add(d[0]||d[1]));
    F.use.onclick=()=>use([pw(st.k)[tp.e[0]][tp.e[1]]]);draw();
  }},

/* ---------- luneta dos autovetores: girar v até Av ficar paralelo ---------- */
eigen:{nome:"Luneta dos autovetores",
  ans(tp){const ok=[];for(let g=0;g<360;g+=15){const a=g*Math.PI/180,v=[Math.cos(a),Math.sin(a)],Av=TL.mv(tp.A,v);
      if(Math.abs(Av[0]*v[1]-Av[1]*v[0])<1e-9&&Math.abs(v[0]*tp.v[1]-v[1]*tp.v[0])<1e-9)ok.push(TL.r6(Av[0]*v[0]+Av[1]*v[1]))}
    return ok.length?[ok[0]]:[NaN]},
  solve(tp,st){st.g=Math.round(Math.atan2(tp.v[1],tp.v[0])*180/Math.PI/15)*15;if(st.g<0)st.g+=360},
  ui(el,tp,st,use){
    st.g=st.g==null?0:st.g;
    let B=1;for(let k=0;k<72;k++){const a=k/72*Math.PI*2,w=TL.mv(tp.A,[Math.cos(a),Math.sin(a)]);B=Math.max(B,Math.hypot(w[0],w[1]))}   /* maior esticamento de A */
    const R=Math.max(4,Math.ceil(B*1.25)),P=TL.plane(TL.sq(R),TL.W,TL.W),L=Math.max(1.5,R*.35);
    const F=TL.frame(el,{W:TL.W,H:TL.W,aria:"Plano: gire a luneta v",
      intro:"Gire a luneta <b>v</b>. A seta ciano é <b>Av</b>. Quando as duas ficam na mesma reta, v é autovetor e o fator entre elas é o autovalor λ.",
      ctrl:'<label class="trng">Direção de v: <input type="range" id="tang" min="0" max="345" step="15" aria-label="Ângulo da luneta em graus"><output id="tango"></output></label>'});
    const rng=el.querySelector("#tang");
    const dirTxt=v=>{const c=[[1,0],[0,1],[1,1],[1,-1],[2,1],[1,2],[2,-1],[1,-2]].find(d=>Math.abs(d[0]*v[1]-d[1]*v[0])<1e-9);return c?" (direção de "+TL.vec(c)+")":""};
    const draw=TL.raf(()=>{
      const a=st.g*Math.PI/180,u=[Math.cos(a),Math.sin(a)],Av=TL.mv(tp.A,u),par=Math.abs(Av[0]*u[1]-Av[1]*u[0])<1e-9,lam=Av[0]*u[0]+Av[1]*u[1];
      rng.value=st.g;el.querySelector("#tango").textContent=st.g+"°";
      let s=P.grid();if(par)s+=P.line([-u[0]*R*2,-u[1]*R*2],[u[0]*R*2,u[1]*R*2],"tk");
      /* v largo e translúcido por baixo; Av por cima: quando se alinham, os dois continuam visíveis */
      s+=P.arrow([0,0],[u[0]*L,u[1]*L],"go wide","v")+P.arrow([0,0],Av,"cy","Av")+P.handle([u[0]*L,u[1]*L],"v");
      F.svg.innerHTML=s;F.svg.classList.toggle("lock",par);
      F.read.innerHTML="v na direção de "+st.g+"°"+dirTxt(u)+(par?'<br><b class="tok">Av = λv com λ = '+TL.f(lam)+": autovetor encontrado.</b>":"<br>Av não está na reta de v: ainda não é autovetor.");
      F.use.disabled=!par;st.lam=par?TL.r6(lam):null;
    });
    const set=g=>{st.g=((Math.round(g/15)*15)%360+360)%360;draw()};
    rng.oninput=()=>set(+rng.value);
    TL.drag(F.svg,P,()=>"v",(_,p)=>set(Math.atan2(p[1],p[0])*180/Math.PI));TL.keys(F.svg,d=>set(st.g+15*(d[0]||d[1])));
    F.use.onclick=()=>use([st.lam]);draw();
  }},

/* ---------- mudança de base: andar na grade da base B ---------- */
basis:{nome:"Grade da base",
  ans(tp){const[b1,b2]=tp.B;for(let a=-12;a<=12;a++)for(let b=-12;b<=12;b++)if(TL.eq([a*b1[0]+b*b2[0],a*b1[1]+b*b2[1]],tp.v))return [a,b];return [NaN,NaN]},
  solve(tp,st){st.c=TOOLS2D.basis.ans(tp)},
  ui(el,tp,st,use){
    st.c=st.c||[1,0];const[b1,b2]=tp.B,pt=c=>[c[0]*b1[0]+c[1]*b2[0],c[0]*b1[1]+c[1]*b2[1]],R=Math.max(4,...tp.v.map(Math.abs))+2,P=TL.plane(TL.sq(R),TL.W,TL.W);
    const det=b1[0]*b2[1]-b1[1]*b2[0],inv=p=>[(p[0]*b2[1]-p[1]*b2[0])/det,(b1[0]*p[1]-b1[1]*p[0])/det];
    const F=TL.frame(el,{W:TL.W,H:TL.W,aria:"Grade da base B: arraste o ponto ou use as setas",
      intro:"A grade dourada é feita com os vetores da base <b>b₁</b> e <b>b₂</b>. Ande por ela até o alvo <b>v</b>: o número de passos em cada direção são as coordenadas de v na base B."});
    const draw=TL.raf(()=>{
      const p=pt(st.c),ok=TL.eq(p,tp.v),K=R*2;let s=P.grid()+'<g class="tw">';
      for(let k=-K;k<=K;k++){s+=P.line(pt([k,-K]),pt([k,K]),"")+P.line(pt([-K,k]),pt([K,k]),"")}
      s+="</g>"+P.arrow([0,0],b1,"go","b₁")+P.arrow([0,0],b2,"go","b₂")+P.dot(tp.v,"ttg",11,"v")+P.arrow([0,0],p,"cy","")+P.handle(p,"c");
      F.svg.innerHTML=s;F.svg.classList.toggle("lock",ok);
      F.read.innerHTML="Coordenadas na base: ("+TL.f(st.c[0])+", "+TL.f(st.c[1])+") ⇒ "+TL.f(st.c[0])+"·b₁ + "+TL.f(st.c[1])+"·b₂ = "+TL.vec(p)+(ok?'<br><b class="tok">Chegou em v: suas coordenadas na base B são ('+TL.f(st.c[0])+", "+TL.f(st.c[1])+").</b>":"");
      F.use.disabled=!ok;
    });
    const set=c=>{st.c=[TL.clamp(Math.round(c[0]),-12,12),TL.clamp(Math.round(c[1]),-12,12)];draw()};
    TL.drag(F.svg,P,()=>"c",(_,p)=>set(inv(p)));TL.keys(F.svg,d=>set([st.c[0]+d[0],st.c[1]+d[1]]));
    F.use.onclick=()=>use(st.c.slice());draw();
  }},

/* ---------- eixos da cônica: girar até sumir o termo misto ---------- */
conic:{nome:"Eixos da cônica",
  rot(tp,g){const[[a,h],[,c]]=tp.Q,t=g*Math.PI/180,co=Math.cos(t),si=Math.sin(t);
    return {A:a*co*co+2*h*co*si+c*si*si,C:a*si*si-2*h*si*co+c*co*co,B:2*((c-a)*si*co+h*(co*co-si*si))}},
  cls(A,C,r){const p=[A,C].filter(x=>x>1e-9).length,n=[A,C].filter(x=>x<-1e-9).length;
    if(p+n===2)return p===1?"Hipérbole":(r!==0&&(r>0)===(p===2)?"Elipse":"Par de retas");return "Parábola"},
  ans(tp){for(let g=0;g<180;g+=5){const k=TOOLS2D.conic.rot(tp,g);if(Math.abs(k.B)<1e-9)return TOOLS2D.conic.cls(k.A,k.C,tp.r)}return "?"},
  solve(tp,st){for(let g=0;g<180;g+=5)if(Math.abs(TOOLS2D.conic.rot(tp,g).B)<1e-9){st.g=g;return}},
  ui(el,tp,st,use){
    st.g=st.g==null?0:st.g;const Q=tp.Q,qf=u=>Q[0][0]*u[0]*u[0]+2*Q[0][1]*u[0]*u[1]+Q[1][1]*u[1]*u[1];
    let mx=1;for(let k=0;k<72;k++){const a=k/72*Math.PI*2,d=qf([Math.cos(a),Math.sin(a)]);if(d>1e-9)mx=Math.max(mx,Math.sqrt(tp.r/d))}
    const R=Math.min(10,Math.ceil(mx)+1),P=TL.plane(TL.sq(R),TL.W,TL.W);
    let curve="",pen=false;for(let k=0;k<=240;k++){const a=k/240*Math.PI*2,u=[Math.cos(a),Math.sin(a)],d=qf(u);
      if(d>1e-9&&tp.r/d>0){const r=Math.sqrt(tp.r/d);if(r<R*1.5){curve+=(pen?"L":"M")+P.X(u[0]*r)+" "+P.Y(u[1]*r);pen=true;continue}}pen=false}
    const F=TL.frame(el,{W:TL.W,H:TL.W,aria:"Cônica com eixos girados",
      intro:"Gire os eixos <b>x′</b> e <b>y′</b>. A equação é reescrita nos eixos novos; quando o termo misto <b>x′y′</b> some, os coeficientes são os autovalores e dizem que cônica é essa.",
      ctrl:'<label class="trng">Ângulo dos eixos: <input type="range" id="tang" min="0" max="175" step="5" aria-label="Ângulo dos eixos girados em graus"><output id="tango"></output></label>'});
    const rng=el.querySelector("#tang");
    const draw=TL.raf(()=>{
      const k=TOOLS2D.conic.rot(tp,st.g),t=st.g*Math.PI/180,e1=[Math.cos(t),Math.sin(t)],e2=[-Math.sin(t),Math.cos(t)],ok=Math.abs(k.B)<1e-9;
      rng.value=st.g;el.querySelector("#tango").textContent=st.g+"°";
      F.svg.innerHTML=P.grid()+'<path class="tcv" d="'+curve+'"/>'+P.line([-e1[0]*R*2,-e1[1]*R*2],[e1[0]*R*2,e1[1]*R*2],"tx1")+P.line([-e2[0]*R*2,-e2[1]*R*2],[e2[0]*R*2,e2[1]*R*2],"tx2")+
        P.arrow([0,0],[e1[0]*R*.8,e1[1]*R*.8],"go","x′")+P.arrow([0,0],[e2[0]*R*.8,e2[1]*R*.8],"cy","y′");
      F.svg.classList.toggle("lock",ok);
      const cl=ok?TOOLS2D.conic.cls(k.A,k.C,tp.r):null;st.cls=cl;
      F.read.innerHTML="Nos eixos girados: "+TL.f(k.A)+"x′² "+(k.B<-1e-9?"− ":"+ ")+TL.f(Math.abs(k.B))+"x′y′ + "+TL.f(k.C)+"y′² = "+TL.f(tp.r)+
        (ok?'<br><b class="tok">Sem termo misto: λ₁ = '+TL.f(k.A)+" e λ₂ = "+TL.f(k.C)+". É uma "+cl.toLowerCase()+".</b>":"");
      F.use.disabled=!ok;
    });
    const set=g=>{st.g=((Math.round(g/5)*5)%180+180)%180;draw()};
    rng.oninput=()=>set(+rng.value);
    TL.drag(F.svg,P,()=>"e",(_,p)=>set(Math.atan2(p[1],p[0])*180/Math.PI));TL.keys(F.svg,d=>set(st.g+5*(d[0]||d[1])));
    F.use.onclick=()=>use(st.cls);draw();
  }},

/* ---------- mínimos quadrados: arrastar a reta e ver os quadrados dos resíduos ---------- */
lsq:{nome:"Reta de mínimos quadrados",
  sse:(pts,c)=>pts.reduce((s,p)=>s+(p[1]-c[0]-c[1]*p[0])**2,0),
  best(pts){const n=pts.length,sx=pts.reduce((s,p)=>s+p[0],0),sy=pts.reduce((s,p)=>s+p[1],0),sxx=pts.reduce((s,p)=>s+p[0]*p[0],0),sxy=pts.reduce((s,p)=>s+p[0]*p[1],0),d=n*sxx-sx*sx;
    const c1=(n*sxy-sx*sy)/d;return [(sy-c1*sx)/n,c1]},
  lim(pts){const ys=pts.map(p=>p[1]);return {y0:Math.floor(Math.min(...ys))-3,y1:Math.ceil(Math.max(...ys))+3}},
  ans(tp){const L=TOOLS2D.lsq,m=L.sse(tp.pts,L.best(tp.pts)),{y0,y1}=L.lim(tp.pts);let r=null;
    for(let a=y0*2;a<=y1*2;a++)for(let b=-20;b<=20;b++){const c=[a/2,b/2];if(Math.abs(L.sse(tp.pts,c)-m)<1e-9){r=c;break}}return r||[NaN,NaN]},
  solve(tp,st){st.c=TOOLS2D.lsq.ans(tp)},
  ui(el,tp,st,use){
    const L=TOOLS2D.lsq,{y0,y1}=L.lim(tp.pts),m=L.sse(tp.pts,L.best(tp.pts));st.c=st.c||[Math.round((y0+y1)/2),0];
    const b={x0:-2.2,x1:2.2,y0,y1},H=Math.round(TL.W*.85),P=TL.plane(b,TL.W,H);
    const F=TL.frame(el,{W:TL.W,H,aria:"Gráfico: arraste as duas alças da reta",
      intro:"Arraste as alças da reta <b>y = c₀ + c₁x</b> (em x = 0 e x = 1). Os quadrados cobre têm lado igual a cada resíduo: a reta de mínimos quadrados é a que deixa a soma das áreas menor possível.",
      ctrl:'<div class="trng2"><label class="trng">c₀ <input type="range" id="tc0" min="'+y0+'" max="'+y1+'" step=".5" aria-label="Coeficiente c0"></label><label class="trng">c₁ <input type="range" id="tc1" min="-10" max="10" step=".5" aria-label="Coeficiente c1"></label></div>'});
    const r0=el.querySelector("#tc0"),r1=el.querySelector("#tc1");
    const draw=TL.raf(()=>{
      const[c0,c1]=st.c,e=L.sse(tp.pts,st.c),ok=Math.abs(e-m)<1e-9;r0.value=c0;r1.value=c1;
      let s=P.grid();
      tp.pts.forEach(p=>{const yh=c0+c1*p[0],r=p[1]-yh,side=Math.abs(r)*P.ky,x=P.X(p[0]),ya=P.Y(Math.max(p[1],yh));
        if(side>.5)s+='<rect class="tres" x="'+(r>0?x:x-side).toFixed(1)+'" y="'+ya.toFixed(1)+'" width="'+side.toFixed(1)+'" height="'+side.toFixed(1)+'"/>'});
      s+=P.line([b.x0,c0+c1*b.x0],[b.x1,c0+c1*b.x1],"tln");
      tp.pts.forEach(p=>{s+=P.dot(p,"tpt",6)});
      s+=P.handle([0,c0],"a")+P.handle([1,c0+c1],"b");
      F.svg.innerHTML=s;F.svg.classList.toggle("lock",ok);
      F.read.innerHTML="Reta y = "+TL.f(c0)+" + "+TL.f(c1)+"x · soma dos quadrados dos resíduos = <b>"+TL.f(e)+"</b>"+(ok?'<br><b class="tok">Erro mínimo: nenhuma reta tem soma menor. (c₀, c₁) = ('+TL.f(c0)+"; "+TL.f(c1)+").</b>":"");
      F.use.disabled=!ok;
    });
    const h=v=>Math.round(v*2)/2;
    const set=(k,p)=>{if(k==="a"){const y1v=st.c[0]+st.c[1];st.c[0]=TL.clamp(h(p[1]),y0,y1);st.c[1]=TL.clamp(h(y1v-st.c[0]),-10,10)}else st.c[1]=TL.clamp(h(p[1]-st.c[0]),-10,10);draw()};
    TL.drag(F.svg,P,p=>Math.abs(p[0])<.5?"a":"b",set);
    TL.keys(F.svg,(d,sh)=>{if(sh)st.c[1]=TL.clamp(st.c[1]+.5*(d[1]||d[0]),-10,10);else st.c[0]=TL.clamp(st.c[0]+.5*(d[1]||d[0]),y0,y1);draw()});
    r0.oninput=()=>{st.c[0]=+r0.value;draw()};r1.oninput=()=>{st.c[1]=+r1.value;draw()};
    F.use.onclick=()=>use(st.c.slice());draw();
  }}
};
TOOLS2D.det=Object.assign({},TOOLS2D.solve,{nome:"Paralelogramo do determinante"});
TOOLS2D.orto=Object.assign({},TOOLS2D.solve,{nome:"Régua ortogonal"});
