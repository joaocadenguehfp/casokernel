"use strict";
/* =====================================================================
   VISUALIZAÇÕES 3D (Etapa 6). Carregado depois de tools2d.js; registra
   novos tipos em TOOLS2D (mesma interface: nome, ans, solve, ui).
   - Three.js (vendor/, versão fixa) só é baixado com import() quando uma
     ferramenta 3D abre; sem WebGL ou com prefers-reduced-motion, a mesma
     cena é desenhada em SVG (projeção ortográfica, girável).
   - Desenho sob demanda: só redesenha ao girar, aproximar ou mudar algo.
   - Cada ferramenta descreve a cena como dados {R, lines, arrows, points,
     meshes, labels}; o WebGL e o SVG desenham a mesma descrição.
   Eixo z para cima.
   ===================================================================== */
const V3={
  THREE_URL:"./vendor/three-0.160.0.module.min.js",
  active:null,
  /* libera a GPU quando a ferramenta sai da tela (o painel é refeito a cada render) */
  gc(){const a=V3.active;if(a&&!document.contains(a.host)){a.dispose();V3.active=null}},
  mv:(A,x)=>A.map(r=>r.reduce((s,a,k)=>s+a*x[k],0)),
  zero:v=>v.every(x=>Math.abs(x)<1e-9),
  rank(vs){const M=vs.map(r=>r.slice());let rk=0;const n=M.length?M[0].length:0;
    for(let c=0;c<n&&rk<M.length;c++){let p=-1;for(let i=rk;i<M.length;i++)if(Math.abs(M[i][c])>1e-9){p=i;break}if(p<0)continue;
      [M[rk],M[p]]=[M[p],M[rk]];for(let i=0;i<M.length;i++)if(i!==rk){const f=M[i][c]/M[rk][c];for(let j=c;j<n;j++)M[i][j]-=f*M[rk][j]}rk++}
    return rk},
  cols:A=>A[0].map((_,j)=>A.map(r=>r[j])),
  f:x=>{const v=Math.round(x*100)/100;return (v<0?"−":"")+String(Math.abs(v)).replace(".",",")},
  vec:v=>"("+v.map(x=>V3.f(x)).join(", ")+")",
  /* eixos dourados com rótulos */
  axes(R){return {lines:[[[-R,0,0],[R,0,0]],[[0,-R,0],[0,R,0]],[[0,0,-R],[0,0,R]]].map(p=>({pts:p,color:0xd4af37,op:.55})),
    labels:[{p:[R*1.08,0,0],t:"x"},{p:[0,R*1.08,0],t:"y"},{p:[0,0,R*1.08],t:"z"}]}},
  merge(...ds){const o={lines:[],arrows:[],points:[],meshes:[],labels:[]};ds.forEach(d=>{for(const k in o)if(d[k])o[k]=o[k].concat(d[k]);if(d.R)o.R=d.R});return o},
  /* malha paramétrica (u,v) -> ponto, também como linhas de grade */
  grid(f,u,v,color,op){const L=[];for(let i=0;i<=u[2];i+=Math.max(1,u[2]/12|0)){const a=u[0]+(u[1]-u[0])*i/u[2],pts=[];for(let j=0;j<=v[2];j++)pts.push(f(a,v[0]+(v[1]-v[0])*j/v[2]));L.push({pts,color,op})}
    for(let j=0;j<=v[2];j+=Math.max(1,v[2]/8|0)){const b=v[0]+(v[1]-v[0])*j/v[2],pts=[];for(let i=0;i<=u[2];i++)pts.push(f(u[0]+(u[1]-u[0])*i/u[2],b));L.push({pts,color,op})}return L},
  webgl(){try{const c=document.createElement("canvas");return !!(window.WebGLRenderingContext&&(c.getContext("webgl2")||c.getContext("webgl")))}catch(e){return false}},
  reduced:()=>!!(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches),

  /* ---- visualizador: host recebe o canvas (ou o SVG) e os rótulos; descFn() devolve a cena ---- */
  view(host,descFn,note){
    const orb={th:-.95,ph:1.12,r:0},api={host,update(){},dispose(){}};
    if(V3.active)V3.active.dispose();V3.active=api;
    const d0=descFn();orb.r=d0.R*3.9;
    const ctl=(redraw,lowres)=>{ /* girar: arrastar, setas; aproximar: roda, pinça, + e − */
      const pts=new Map();let pinch=0;
      host.addEventListener("pointerdown",e=>{pts.set(e.pointerId,[e.clientX,e.clientY]);host.setPointerCapture(e.pointerId);if(lowres)lowres(true)});
      host.addEventListener("pointermove",e=>{const p=pts.get(e.pointerId);if(!p)return;
        if(pts.size===2){const[a,b]=[...pts.values()],d0=Math.hypot(a[0]-b[0],a[1]-b[1]);pts.set(e.pointerId,[e.clientX,e.clientY]);
          const[c,d]=[...pts.values()],d1=Math.hypot(c[0]-d[0],c[1]-d[1]);if(pinch)orb.r=Math.min(d0R*5,Math.max(d0R*1.6,orb.r*d0/d1));pinch=1;redraw();return}
        orb.th-=(e.clientX-p[0])*.01;orb.ph=Math.min(Math.PI-.12,Math.max(.12,orb.ph-(e.clientY-p[1])*.01));pts.set(e.pointerId,[e.clientX,e.clientY]);redraw()});
      const up=e=>{pts.delete(e.pointerId);pinch=0;if(!pts.size&&lowres)lowres(false)};
      host.addEventListener("pointerup",up);host.addEventListener("pointercancel",up);
      host.addEventListener("wheel",e=>{e.preventDefault();orb.r=Math.min(d0R*5,Math.max(d0R*1.6,orb.r*(e.deltaY>0?1.1:.9)));redraw()},{passive:false});
      host.addEventListener("keydown",e=>{const k=e.key;let h=1;
        if(k==="ArrowLeft")orb.th+=.15;else if(k==="ArrowRight")orb.th-=.15;else if(k==="ArrowUp")orb.ph=Math.max(.12,orb.ph-.15);else if(k==="ArrowDown")orb.ph=Math.min(Math.PI-.12,orb.ph+.15);
        else if(k==="+"||k==="=")orb.r=Math.max(d0R*1.6,orb.r*.9);else if(k==="-")orb.r=Math.min(d0R*5,orb.r*1.1);else h=0;
        if(h){e.preventDefault();redraw()}});
    };
    const d0R=d0.R;
    if(!V3.webgl()||V3.reduced()){V3.svgView(host,descFn,orb,api,ctl,note);return api}
    host.classList.add("v3load");
    import(V3.THREE_URL).then(T=>{if(V3.active!==api||!document.contains(host))return;host.classList.remove("v3load");V3.glView(T,host,descFn,orb,api,ctl)})
      .catch(()=>{host.classList.remove("v3load");if(V3.active===api)V3.svgView(host,descFn,orb,api,ctl,note)});
    return api;
  },
  camBasis(o){const p=[Math.sin(o.ph)*Math.cos(o.th),Math.sin(o.ph)*Math.sin(o.th),Math.cos(o.ph)],f=p.map(x=>-x),
    cr=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],nz=v=>{const l=Math.hypot(...v)||1;return v.map(x=>x/l)};
    const r=nz(cr(f,[0,0,1])),u=cr(r,f);return {p,r,u}},
  hex:c=>"#"+c.toString(16).padStart(6,"0"),

  /* ---- reserva em SVG: projeção ortográfica da mesma descrição ---- */
  svgView(host,descFn,orb,api,ctl,note){
    host.classList.add("v3svg");
    host.innerHTML='<svg viewBox="0 0 420 330" aria-hidden="true"></svg><p class="v3note">'+(note||"Visualização estática em SVG (sem WebGL ou com movimento reduzido). Arraste ou use as setas para girar.")+"</p>";
    const svg=host.querySelector("svg");
    const draw=()=>{
      const d=descFn(),B=V3.camBasis(orb),s=130/d.R*(d.R*3.9/orb.r),P=p=>[210+(p[0]*B.r[0]+p[1]*B.r[1]+p[2]*B.r[2])*s,165-(p[0]*B.u[0]+p[1]*B.u[1]+p[2]*B.u[2])*s];
      let h="";
      d.lines.forEach(l=>{h+='<polyline fill="none" stroke="'+V3.hex(l.color)+'" stroke-opacity="'+(l.op||1)+'" stroke-width="'+(l.w||1.5)+'"'+(l.dash?' stroke-dasharray="6 5"':"")+' points="'+l.pts.map(p=>P(p).map(x=>x.toFixed(1)).join(",")).join(" ")+'"/>'});
      d.arrows.forEach(a=>{const p=P(a.from),q=P(a.to),L=Math.hypot(q[0]-p[0],q[1]-p[1]);if(L<2)return;const t=Math.atan2(q[1]-p[1],q[0]-p[0]),hh=Math.min(12,L/2),c=V3.hex(a.color);
        h+='<line x1="'+p[0].toFixed(1)+'" y1="'+p[1].toFixed(1)+'" x2="'+q[0].toFixed(1)+'" y2="'+q[1].toFixed(1)+'" stroke="'+c+'" stroke-width="3"/><polygon fill="'+c+'" points="'+q[0].toFixed(1)+","+q[1].toFixed(1)+" "+[.45,-.45].map(k=>(q[0]-hh*Math.cos(t+k)).toFixed(1)+","+(q[1]-hh*Math.sin(t+k)).toFixed(1)).join(" ")+'"/>'});
      d.points.forEach(p=>{const q=P(p.p);h+='<circle cx="'+q[0].toFixed(1)+'" cy="'+q[1].toFixed(1)+'" r="3.5" fill="'+V3.hex(p.color)+'"/>'});
      d.labels.forEach(l=>{const q=P(l.p);h+='<text x="'+q[0].toFixed(1)+'" y="'+q[1].toFixed(1)+'" class="v3t'+(l.c?" "+l.c:"")+'">'+l.t+"</text>"});
      svg.innerHTML=h;window.__r3d=(window.__r3d||0)+1;
    };
    ctl(draw);api.update=draw;api.dispose=()=>{};draw();
  },

  /* ---- WebGL (Three.js) ---- */
  glView(T,host,descFn,orb,api,ctl){
    host.innerHTML='<div class="v3l" aria-hidden="true"></div>';
    const lab=host.querySelector(".v3l");
    const rd=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:"low-power"});
    const dpr=()=>Math.min(window.devicePixelRatio||1,2);
    rd.setPixelRatio(dpr());host.prepend(rd.domElement);rd.domElement.setAttribute("aria-hidden","true");
    const scene=new T.Scene(),cam=new T.PerspectiveCamera(36,1,.1,500);cam.up.set(0,0,1);
    scene.add(new T.AmbientLight(0xffffff,.65));const dl=new T.DirectionalLight(0xffffff,1.6);dl.position.set(5,-7,9);scene.add(dl);
    let dyn=new T.Group(),labels=[],q=false,W=0,H=0;scene.add(dyn);
    const V=p=>new T.Vector3(p[0],p[1],p[2]);
    const disp=o=>o.traverse(n=>{if(n.geometry)n.geometry.dispose();if(n.material)[].concat(n.material).forEach(m=>m.dispose())});
    const build=()=>{
      disp(dyn);scene.remove(dyn);dyn=new T.Group();scene.add(dyn);const d=descFn();
      d.lines.forEach(l=>{const g=new T.BufferGeometry().setFromPoints(l.pts.map(V));
        const m=l.dash?new T.LineDashedMaterial({color:l.color,dashSize:d.R*.06,gapSize:d.R*.04,transparent:(l.op||1)<1,opacity:l.op||1}):new T.LineBasicMaterial({color:l.color,transparent:(l.op||1)<1,opacity:l.op||1});
        const o=new T.Line(g,m);if(l.dash)o.computeLineDistances();dyn.add(o)});
      d.arrows.forEach(a=>{const dir=V(a.to).sub(V(a.from)),L=dir.length();if(L<1e-6)return;const h=Math.min(L*.35,d.R*.14);
        dyn.add(new T.ArrowHelper(dir.normalize(),V(a.from),L,a.color,h,h*.55))});
      if(d.points.length){const geo=new T.SphereGeometry(d.R*.028,10,8),by={};d.points.forEach(p=>(by[p.color]=by[p.color]||[]).push(p.p));
        for(const c in by){const im=new T.InstancedMesh(geo,new T.MeshStandardMaterial({color:+c,emissive:+c,emissiveIntensity:.35}),by[c].length),m=new T.Matrix4();
          by[c].forEach((p,i)=>{m.makeTranslation(p[0],p[1],p[2]);im.setMatrixAt(i,m)});dyn.add(im)}}
      d.meshes.forEach(s=>{const pos=[],idx=[],nu=s.u[2],nv=s.v[2];
        for(let i=0;i<=nu;i++)for(let j=0;j<=nv;j++)pos.push(...s.f(s.u[0]+(s.u[1]-s.u[0])*i/nu,s.v[0]+(s.v[1]-s.v[0])*j/nv));
        for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){const a=i*(nv+1)+j,b=a+nv+1;idx.push(a,b,a+1,b,b+1,a+1)}
        const g=new T.BufferGeometry();g.setAttribute("position",new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();
        dyn.add(new T.Mesh(g,new T.MeshStandardMaterial({color:s.color,emissive:s.color,emissiveIntensity:.18,transparent:true,opacity:s.op||.45,side:T.DoubleSide,depthWrite:false,roughness:.55})))});
      lab.innerHTML=d.labels.map(l=>'<span class="v3t'+(l.c?" "+l.c:"")+'">'+l.t+"</span>").join("");labels=d.labels;
    };
    const draw=()=>{
      const B=V3.camBasis(orb);cam.position.set(B.p[0]*orb.r,B.p[1]*orb.r,B.p[2]*orb.r);cam.lookAt(0,0,0);
      rd.render(scene,cam);window.__r3d=(window.__r3d||0)+1;
      const els=lab.children,v=new T.Vector3();
      labels.forEach((l,i)=>{v.set(l.p[0],l.p[1],l.p[2]).project(cam);const e=els[i];if(e)e.style.transform="translate("+((v.x+1)/2*W).toFixed(1)+"px,"+((1-v.y)/2*H).toFixed(1)+"px)"});
    };
    const req=()=>{if(q)return;q=true;requestAnimationFrame(()=>{q=false;if(V3.active===api)draw()})};
    const size=()=>{W=host.clientWidth;H=Math.round(W*.78);rd.setSize(W,H);cam.aspect=W/H;cam.updateProjectionMatrix();req()};
    const ro=new ResizeObserver(size);ro.observe(host);
    ctl(req,low=>{rd.setPixelRatio(low?1:dpr());rd.setSize(W,H);req()});   /* resolução menor durante o arraste */
    api.update=()=>{build();req()};
    api.dispose=()=>{ro.disconnect();disp(scene);rd.dispose();rd.forceContextLoss();rd.domElement.remove()};
    build();size();
  }
};

/* ---------- imagem de T em ℝ³: os pontos A·x caem num plano, numa reta ou enchem o espaço ---------- */
TOOLS2D.image3d={nome:"Imagem em 3D",
  ans:tp=>[V3.rank(V3.cols(tp.A))],
  solve(tp,st){st.dim=V3.rank(V3.cols(tp.A))},
  ui(el,tp,st,use){
    const n=tp.A[0].length,C=V3.cols(tp.A),xs=[];
    const rec=(p)=>{if(p.length===n){xs.push(p);return}for(let k=-2;k<=2;k++)rec(p.concat(k))};rec([]);
    const img=xs.map(x=>V3.mv(tp.A,x)),R=Math.max(3,...img.flat().map(Math.abs))*1.05;
    el.innerHTML='<p class="tint">Os pontos ciano são <b>T(x)</b> para muitos x de entrada. As setas douradas são as colunas da matriz (as imagens dos vetores da base). Gire a cena: os pontos ocupam uma reta, um plano ou o espaço todo?</p>'+
      '<div class="v3" tabindex="0" role="img" aria-label="Cena 3D da imagem de T. Arraste ou use as setas para girar; + e − aproximam."></div>'+
      '<div class="row trow2 cards" role="radiogroup" aria-label="Dimensão da imagem">'+[[0,"Só a origem (0)"],[1,"Uma reta (1)"],[2,"Um plano (2)"],[3,"O espaço (3)"]].map(o=>'<button type="button" class="btn sm" role="radio" data-d="'+o[0]+'" aria-checked="false">'+o[1]+"</button>").join("")+"</div>"+
      '<p class="tread" aria-live="polite"></p><div class="row trow2"><button type="button" class="btn stamp" id="tuse" disabled>Usar resultado</button></div>';
    const desc=()=>V3.merge(V3.axes(R),{R,
      arrows:C.map(c=>({from:[0,0,0],to:c,color:0xe5c158})),
      labels:C.map((c,k)=>({p:c.map(x=>x*1.12),t:"T(e"+"₁₂₃"[k]+")",c:"go"})),
      points:img.map(p=>({p,color:0x4fc3f7}))});
    const v=V3.view(el.querySelector(".v3"),desc);
    const read=el.querySelector(".tread"),useB=el.querySelector("#tuse");
    const paint=()=>{el.querySelectorAll("[data-d]").forEach(b=>b.setAttribute("aria-checked",+b.dataset.d===st.dim));
      read.innerHTML=st.dim==null?"Escolha o que você vê.":"Você vê: dimensão "+st.dim+" ⇒ posto = "+st.dim+".";useB.disabled=st.dim==null};
    el.querySelectorAll("[data-d]").forEach(b=>b.onclick=()=>{st.dim=+b.dataset.d;paint()});
    useB.onclick=()=>use([st.dim]);paint();v.update();
  }};

/* ---------- núcleo em ℝ³: achar as direções que vão para zero ---------- */
TOOLS2D.kernel3d={nome:"Núcleo em 3D",
  found(tp){const f=[];for(let a=-3;a<=3;a++)for(let b=-3;b<=3;b++)for(let c=-3;c<=3;c++){const v=[a,b,c];if((a||b||c)&&V3.zero(V3.mv(tp.A,v))&&V3.rank(f.concat([v]))>f.length)f.push(v)}return f},
  ans(tp){return [TOOLS2D.kernel3d.found(tp).length]},
  solve(tp,st){st.marks=TOOLS2D.kernel3d.found(tp);st.v=(st.marks[0]||[1,1,1]).slice()},
  ui(el,tp,st,use){
    st.v=st.v||[1,0,0];st.marks=st.marks||[];const m=tp.A.length,R=3.6;
    el.innerHTML='<p class="tint">Monte o vetor <b>v</b> com os botões. A seta ciano é <b>Av</b>'+(m<3?" (desenhada no plano z = 0, porque a saída é o ℝ"+m+")":"")+'. Quando Av = 0, marque a direção: o núcleo aparece como uma reta (ou um plano) que some.</p>'+
      '<div class="v3" tabindex="0" role="img" aria-label="Cena 3D do núcleo. Arraste ou use as setas para girar."></div>'+
      '<div class="row trow2 kst">'+["x₁","x₂","x₃"].map((t,k)=>'<span class="kc"><button type="button" class="btn sm" data-k="'+k+'" data-d="-1" aria-label="Diminuir '+t+'">−</button><output id="kv'+k+'"></output><button type="button" class="btn sm" data-k="'+k+'" data-d="1" aria-label="Aumentar '+t+'">+</button><small>'+t+"</small></span>").join("")+"</div>"+
      '<div class="row trow2"><button type="button" class="btn sm" id="tmark" disabled>Marcar direção</button><button type="button" class="btn sm" id="tclr">Limpar marcas</button></div>'+
      '<p class="tread" aria-live="polite"></p><div class="row trow2"><button type="button" class="btn stamp" id="tuse" disabled>Usar resultado</button></div>';
    const emb=w=>w.length===3?w:[w[0]||0,w[1]||0,0];
    const desc=()=>{const Av=emb(V3.mv(tp.A,st.v));return V3.merge(V3.axes(R),{R,
      lines:st.marks.map(k=>({pts:[k.map(x=>-x*2),k.map(x=>x*2)],color:0x3fd0a0,dash:true})),
      arrows:[{from:[0,0,0],to:st.v,color:0xe5c158},{from:[0,0,0],to:Av,color:0x4fc3f7}],
      labels:[{p:st.v.map(x=>x*1.1),t:"v",c:"go"},{p:Av.map(x=>x*1.1),t:"Av",c:"cy"}]})};
    const v=V3.view(el.querySelector(".v3"),desc);
    const read=el.querySelector(".tread"),mark=el.querySelector("#tmark"),useB=el.querySelector("#tuse");
    const paint=()=>{
      st.v.forEach((x,k)=>{el.querySelector("#kv"+k).textContent=V3.f(x)});
      const Av=V3.mv(tp.A,st.v),z=V3.zero(Av)&&!V3.zero(st.v);
      mark.disabled=!(z&&V3.rank(st.marks.concat([st.v]))>st.marks.length);
      read.innerHTML="v = "+V3.vec(st.v)+" · Av = "+V3.vec(Av)+(z?' · <b class="tok">Av = 0: esta direção some.</b>':"")+
        "<br>Direções independentes marcadas: <b>"+st.marks.length+"</b> ⇒ nulidade = <b>"+st.marks.length+"</b>";
      useB.disabled=!st.marks.length;v.update();
    };
    el.querySelectorAll("[data-k]").forEach(b=>b.onclick=()=>{const k=+b.dataset.k;st.v[k]=Math.max(-3,Math.min(3,st.v[k]+ +b.dataset.d));paint()});
    mark.onclick=()=>{st.marks.push(st.v.slice());paint()};
    el.querySelector("#tclr").onclick=()=>{st.marks=[];paint()};
    useB.onclick=()=>use([st.marks.length]);paint();
  }};

/* ---------- quádricas: ±x² ± y² ± z² = 1, cortes z = c e as retas do hiperboloide de uma folha ---------- */
TOOLS2D.quadric={nome:"Maquete 3D da quádrica",
  cls(s){const p=s.filter(x=>x>0).length;return p===3?"Elipsoide":p===2?"Hiperboloide de uma folha":p===1?"Hiperboloide de duas folhas":"Conjunto vazio"},
  ans(tp){return TOOLS2D.quadric.cls(tp.s)},
  solve(tp,st){st.s=tp.s.slice()},
  ui(el,tp,st,use){
    st.s=st.s||[1,1,1];st.c=st.c==null?0:st.c;const R=2.6,Q=TOOLS2D.quadric;
    const eq=s=>["x²","y²","z²"].map((t,k)=>(k?(s[k]>0?" + ":" − "):(s[k]>0?"":"−"))+t).join("")+" = 1";
    el.innerHTML='<p class="tint">Troque os sinais de x², y² e z² e veja a superfície <b>±x² ± y² ± z² = 1</b> mudar. O controle "corte" mostra a curva no plano z = c. Monte a equação da pergunta.</p>'+
      '<div class="v3" tabindex="0" role="img" aria-label="Cena 3D da quádrica. Arraste ou use as setas para girar."></div>'+
      '<div class="row trow2 cards" aria-label="Sinais">'+["x²","y²","z²"].map((t,k)=>'<button type="button" class="btn sm" data-s="'+k+'" aria-pressed="false"></button>').join("")+"</div>"+
      '<label class="trng">Corte z = <output id="qco"></output><input type="range" id="qc" min="-2" max="2" step=".5" aria-label="Altura do corte z = c"></label>'+
      '<p class="tread" aria-live="polite"></p><div class="row trow2"><button type="button" class="btn stamp" id="tuse" disabled>Usar resultado</button></div>';
    const surf=s=>{ /* malhas paramétricas e linhas da superfície para os sinais s */
      const p=s.filter(x=>x>0).length,ix=[0,1,2],pos=ix.filter(k=>s[k]>0),ng=ix.filter(k=>s[k]<0),put=(a,o)=>{const v=[0,0,0];o.forEach((k,i)=>{v[k]=a[i]});return v};
      if(p===3){const f=(u,w)=>[Math.cos(u)*Math.cos(w),Math.sin(u)*Math.cos(w),Math.sin(w)];return {meshes:[{f,u:[0,2*Math.PI,40],v:[-Math.PI/2,Math.PI/2,20],color:0x4fc3f7}],lines:V3.grid(f,[0,2*Math.PI,36],[-Math.PI/2,Math.PI/2,18],0xe5c158,.35)}}
      if(p===2){const k=ng[0],f=(u,t)=>put([Math.cosh(t)*Math.cos(u),Math.cosh(t)*Math.sin(u),Math.sinh(t)],[pos[0],pos[1],k]),rul=[];
        for(let i=0;i<16;i++){const u=i/16*Math.PI*2;[1,-1].forEach(sg=>{const w=[Math.cos(u),Math.sin(u)],d=[-Math.sin(u),Math.cos(u)];
          rul.push({pts:[-1.5,1.5].map(t=>put([w[0]+t*d[0],w[1]+t*d[1],sg*t],[pos[0],pos[1],k])),color:sg>0?0xe5c158:0xff9a3a,op:.8})})}
        return {meshes:[{f,u:[0,2*Math.PI,40],v:[-1.25,1.25,20],color:0x4fc3f7}],lines:rul}}
      if(p===1){const k=pos[0],M=[],L=[];[1,-1].forEach(sg=>{const f=(u,t)=>put([sg*Math.cosh(t),Math.sinh(t)*Math.cos(u),Math.sinh(t)*Math.sin(u)],[k,ng[0],ng[1]]);
          M.push({f,u:[0,2*Math.PI,36],v:[0,1.3,14],color:0x4fc3f7});L.push(...V3.grid(f,[0,2*Math.PI,36],[0,1.3,14],0xe5c158,.35))});return {meshes:M,lines:L}}
      return {meshes:[],lines:[]};
    };
    const cut=(s,c)=>{ /* curva s0x² + s1y² = 1 − s2c² no plano z = c */
      const q=1-s[2]*c*c,pts=[],out=[];
      if(s[0]>0&&s[1]>0){if(q>0){for(let i=0;i<=60;i++){const a=i/60*Math.PI*2;pts.push([Math.sqrt(q)*Math.cos(a),Math.sqrt(q)*Math.sin(a),c])}out.push(pts)}}
      else if(s[0]<0&&s[1]<0){if(q<0){for(let i=0;i<=60;i++){const a=i/60*Math.PI*2;pts.push([Math.sqrt(-q)*Math.cos(a),Math.sqrt(-q)*Math.sin(a),c])}out.push(pts)}}
      else if(Math.abs(q)>1e-9){const r=Math.sqrt(Math.abs(q)),xa=(s[0]>0)===(q>0);[1,-1].forEach(sg=>{const b=[];for(let i=-20;i<=20;i++){const t=i/20*1.2,A=sg*r*Math.cosh(t),B=r*Math.sinh(t);b.push(xa?[A,B,c]:[B,A,c])}out.push(b)})}
      return out.map(p=>({pts:p,color:0xff5a4d,w:3}));
    };
    const desc=()=>{const S=surf(st.s);return V3.merge(V3.axes(R),{R,meshes:S.meshes,lines:S.lines.concat(cut(st.s,st.c))})};
    const v=V3.view(el.querySelector(".v3"),desc);
    const read=el.querySelector(".tread"),useB=el.querySelector("#tuse"),rng=el.querySelector("#qc");
    const paint=()=>{
      el.querySelectorAll("[data-s]").forEach(b=>{const k=+b.dataset.s;b.textContent=(st.s[k]>0?"+":"−")+["x²","y²","z²"][k];b.setAttribute("aria-pressed",st.s[k]<0)});
      rng.value=st.c;el.querySelector("#qco").textContent=V3.f(st.c);
      const name=Q.cls(st.s),ok=st.s.every((x,k)=>x===tp.s[k]);
      read.innerHTML=eq(st.s)+" ⇒ <b>"+name+"</b>"+(st.s.filter(x=>x>0).length===2?" (as retas douradas e cobre estão inteiras dentro dela)":"")+
        (ok?'<br><b class="tok">É a superfície da pergunta.</b>':"<br>Ainda não é a equação da pergunta.");
      useB.disabled=!ok;v.update();
    };
    el.querySelectorAll("[data-s]").forEach(b=>b.onclick=()=>{const k=+b.dataset.s;st.s[k]=-st.s[k];paint()});
    rng.oninput=()=>{st.c=+rng.value;paint()};
    useB.onclick=()=>use(Q.cls(st.s));paint();
  }};
