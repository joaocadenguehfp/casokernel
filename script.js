"use strict";
/* ============ ESTADO E PERSISTÊNCIA ============ */
const KEY="caso-kernel-v3",BKEY="caso-kernel-best",MAXHP=100,HIT=10,HINT=20,HEAL=10,N=10;
const $=id=>document.getElementById(id);
const DIF={f:["🟢","Fácil"],m:["🟡","Médio"],d:["🔴","Difícil"],b:["💀","Chefão"]};
const fresh=()=>({seed:null,i:0,hp:MAXHP,score:0,h:0,w:0,sv:false,sel:null,last:0,clues:[],snd:true,over:false,fin:false,t:0});
const rd=(k,d)=>{try{return Object.assign(d,JSON.parse(localStorage.getItem(k)))}catch(e){return d}};
let S=rd(KEY,fresh()),best=rd(BKEY,{}),tk=Date.now();
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S));localStorage.setItem(BKEY,JSON.stringify(best))}catch(e){}};
const cur=()=>SEEDS[S.seed].casos[S.i];
const fmt=ms=>{const s=Math.floor(ms/1000);return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0")};

/* ============ CRONÔMETRO ============ */
setInterval(()=>{
  const n=Date.now();
  if(S.seed!==null&&!S.over&&!S.fin){S.t+=n-tk;$("tm").textContent=fmt(S.t);save()}
  tk=n;
},1000);

/* ============ RENDERIZADOR MATEMÁTICO ============ */
function mth(e){
  e=e.replace(/mat\(([^)]*)\)/g,(_,b)=>'<span class="mx">'+b.split(";").map(r=>'<span class="r">'+r.split(",").map(c=>"<i>"+c.trim()+"</i>").join("")+"</span>").join("")+"</span>");
  return e.replace(/RR/g,"ℝ").replace(/->/g,"→")
    .replace(/\^\{([^}]*)\}/g,"<sup>$1</sup>").replace(/\^(-?\w+)/g,"<sup>$1</sup>").replace(/_(\w+)/g,"<sub>$1</sub>");
}
const M=s=>s.replace(/\$(.+?)\$/g,(_,e)=>'<span class="m">'+mth(e)+"</span>");

/* ============ ÁUDIO RETRÔ (Web Audio API) ============ */
let ac;
const ctx=()=>ac=ac||new(window.AudioContext||window.webkitAudioContext)();
function noise(t,d,v,fq){
  const c=ctx(),b=c.createBuffer(1,Math.floor(c.sampleRate*d),c.sampleRate),a=b.getChannelData(0);
  for(let k=0;k<a.length;k++)a[k]=(Math.random()*2-1)*(1-k/a.length);
  const s=c.createBufferSource(),g=c.createGain(),f=c.createBiquadFilter();
  f.type="bandpass";f.frequency.value=fq;g.gain.value=v;s.buffer=b;
  s.connect(f);f.connect(g);g.connect(c.destination);s.start(c.currentTime+t);
}
function tone(fq,t,d,ty,v){
  const c=ctx(),o=c.createOscillator(),g=c.createGain(),T=c.currentTime+t;
  o.type=ty;o.frequency.setValueAtTime(fq,T);g.gain.setValueAtTime(v,T);
  g.gain.exponentialRampToValueAtTime(.001,T+d);o.connect(g);g.connect(c.destination);o.start(T);o.stop(T+d);
}
function sfx(k){
  if(!S.snd)return;
  try{
    if(k==="key")noise(0,.04,.5,2500);
    if(k==="hint"){noise(0,.04,.5,2500);noise(.1,.04,.5,3000);noise(.2,.04,.5,2200)}
    if(k==="ok"){noise(0,.08,.9,300);tone(110,0,.2,"triangle",.4);tone(1760,.3,.7,"sine",.15)}
    if(k==="no"){noise(0,.15,.9,200);tone(70,0,.3,"sawtooth",.3)}
    if(k==="win")[0,.15,.3,.45].forEach((t,i)=>tone(523*(1+i*.25),t,.4,"triangle",.2));
    if(k==="lose")[0,.25,.5].forEach((t,i)=>tone(220/(1+i*.3),t,.45,"sawtooth",.2));
  }catch(e){}
}

/* ============ LÓGICA ============ */
const parse=v=>v.replace(/[()\s]/g,"").split(/[;,]/).filter(Boolean).map(p=>{if(p.includes("/")){const[a,b]=p.split("/");return +a/+b}return +p});
const pts=()=>Math.max(100-10*S.h-5*S.w,10)+(cur().d==="b"?50:0);
const anim=(id,cls)=>{const el=$(id);el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls)};
const nextLabel=()=>S.i+1<N?"📂 Próxima fase":"🏆 Encerrar caso";

function render(){
  $("sc").textContent="🏅 "+S.score+" pts";
  $("tm").textContent=fmt(S.t);
  $("snd").textContent=S.snd?"🔊 Áudio":"🔇 Mudo";
  $("hpf").style.width=S.hp+"%";
  $("hpf").className="hpf"+(S.hp<=30?" low":S.hp<=60?" mid":"");
  $("hpt").textContent=S.hp+"/"+MAXHP;$("hp").setAttribute("aria-valuenow",S.hp);
  const sd=S.seed===null?null:SEEDS[S.seed],done=sd?S.i+(S.sv||S.fin?1:0):0;
  $("pf").style.width=(done/N*100)+"%";$("pb").setAttribute("aria-valuenow",done*10);
  $("folder").dataset.label="📂 Caso nº 0417"+(sd?" · "+sd.nome:"");
  $("inv").innerHTML=sd?Array.from({length:N},(_,k)=>S.clues.includes(k)?'<li class="cl">📌 <b>'+sd.casos[k].t+"</b>"+FL[sd.casos[k].k].k+"</li>":'<li class="cl lk">🔒 Pista '+(k+1)+" oculta</li>").join(""):'<li class="cl lk">Escolha uma investigação.</li>';
  const g=$("game");
  if(!sd){
    g.innerHTML='<h2>🗂️ Escolha a investigação</h2><p class="story">Cada caso tem 10 fases. O cronômetro começa ao abrir o arquivo.</p><div class="opts">'+SEEDS.map((s,k)=>'<button class="btn seedc" data-k="'+k+'"><b>'+s.ic+" "+s.nome+"</b><br><small>"+s.intro+(best[k]!=null?" · 🏁 Melhor tempo: "+fmt(best[k]):"")+"</small></button>").join("")+"</div>";
    g.querySelectorAll(".seedc").forEach(b=>b.onclick=()=>{S=Object.assign(fresh(),{snd:S.snd,seed:+b.dataset.k});tk=Date.now();save();render()});
    return;
  }
  if(S.over){
    g.innerHTML='<div class="fim"><h2>🩸 Investigação fracassada</h2><div class="carimbo">Detetive fora de combate</div><p>Sua vida chegou a zero na fase '+(S.i+1)+" de "+N+" ("+sd.nome+"). Pontuação: "+S.score+" · ⏱ "+fmt(S.t)+'.</p><button class="btn stamp" id="again">↺ Reiniciar investigação</button></div>';
    $("again").onclick=reset;return;
  }
  if(S.fin){
    g.innerHTML='<div class="fim"><h2>🏆 Caso resolvido</h2><div class="carimbo v">Arquivado</div><p><b>'+sd.nome+"</b><br>🏅 Pontuação: <b>"+S.score+"</b> · 🩸 Vida: "+S.hp+"/"+MAXHP+"<br>⏱ Tempo total: <b>"+fmt(S.t)+'</b> · 🏁 Melhor: '+fmt(best[S.seed])+'</p><button class="btn stamp" id="again">🗂️ Escolher outro caso</button></div>';
    $("again").onclick=reset;return;
  }
  const P=cur(),b=P.d==="b",df=DIF[P.d];
  let h='<div class="cs'+(b?" boss":"")+'">'+(b?'<div class="carimbo suspeito">Suspeito principal</div>':"")+'<div class="fase">📂 Fase '+(S.i+1)+" de "+N+' <span class="dif d-'+P.d+'">'+df[0]+" "+df[1]+"</span></div><h2>🕵️‍♂️ "+P.t+"</h2>"+(P.s?'<div class="story">'+M(P.s)+"</div>":"")+'<div class="q">🔎 '+M(P.q)+"</div>";
  if(P.type==="choice")h+='<div class="opts" role="group" aria-label="Alternativas">'+P.o.map((o,k)=>'<button class="btn opt" data-k="'+k+'" aria-pressed="'+(S.sel===k)+'"'+(S.sv?" disabled":"")+">"+String.fromCharCode(65+k)+") "+M(o)+"</button>").join("")+"</div>";
  else h+='<div class="row"><input id="ans" aria-label="Sua resposta" placeholder="Datilografe sua resposta" autocomplete="off"'+(S.sv?" disabled":"")+"></div>";
  if(!S.sv)h+='<div class="row"><button class="btn stamp" id="chk">🔍 Analisar resposta</button><button class="btn" id="hb"'+(S.h>=2?" disabled":"")+'>💡 Pedir dica (−'+HINT+" HP)</button></div>";
  for(let k=0;k<S.h;k++)h+='<div class="hint">💡 '+M(P.h[k])+"</div>";
  h+='<div id="fb" role="status">'+(S.sv?'<span class="carimbo v">Acertou!</span> <span class="good">+'+S.last+" pts · +"+HEAL+' HP</span><div class="row"><button class="btn" id="rv">📋 Rever dossiê</button><button class="btn stamp" id="nx">'+nextLabel()+"</button></div>":"")+"</div></div>";
  g.innerHTML=h;
  g.querySelectorAll(".opt").forEach(x=>x.onclick=()=>{S.sel=+x.dataset.k;sfx("key");save();render()});
  const a=$("ans");if(a){a.oninput=()=>sfx("key");a.onkeydown=e=>{if(e.key==="Enter")check()};a.focus()}
  if($("chk"))$("chk").onclick=check;
  if($("hb"))$("hb").onclick=hint;
  if($("rv"))$("rv").onclick=openFC;
  if($("nx"))$("nx").onclick=next;
}
function openFC(){
  const P=cur(),f=FL[P.k];
  $("fcb").innerHTML="<h3>📋 Dossiê · Folha de anotações</h3><p>📌 <b>Conceito-chave:</b> "+f.k+"</p><p>💡 <b>Dica de prova:</b> "+M(f.p)+"</p><p>🧾 <b>Neste caso:</b> "+M(P.e)+"</p>";
  $("fcn").textContent=nextLabel();$("fc").classList.add("on");$("fcn").focus();
}
function damage(n){
  S.hp=Math.max(0,S.hp-n);
  if(S.hp===0){S.over=true;sfx("lose")}
  save();render();anim("folder","hit");
}
function hint(){if(S.h>=2)return;S.h++;sfx("hint");damage(HINT)}
function check(){
  const P=cur();let ok;
  if(P.type==="choice"){if(S.sel===null)return msg("Escolha uma alternativa antes de analisar.");ok=S.sel===P.a}
  else{const u=parse($("ans").value),a=[].concat(P.a);
    if(!u.length||u.some(isNaN))return msg("Formato inválido. Use números, por exemplo 5,6 ou 1/2.");
    ok=u.length===a.length&&u.every((x,k)=>Math.abs(x-a[k])<1e-6)}
  if(ok){
    S.last=pts();S.score+=S.last;S.hp=Math.min(MAXHP,S.hp+HEAL);S.clues.push(S.i);S.sv=true;
    sfx("ok");save();render();anim("folder","ok");openFC();
  }else{
    S.w++;sfx("no");damage(HIT);
    if(!S.over)msg("✘ Resposta incorreta (−"+HIT+" HP). Revise ou peça uma dica.");
  }
}
function msg(t){const f=$("fb");if(f)f.innerHTML='<span class="bad">'+t+"</span>"}
function next(){
  $("fc").classList.remove("on");
  if(S.i+1>=N){
    S.fin=true;if(best[S.seed]==null||S.t<best[S.seed])best[S.seed]=S.t;
    save();render();sfx("win");
    $("ovp").textContent=SEEDS[S.seed].nome+": "+S.score+" pontos, "+S.hp+" HP, tempo total "+fmt(S.t)+".";
    $("ov").classList.add("on");$("ovb").focus();return;
  }
  S.i++;S.h=0;S.w=0;S.sv=false;S.sel=null;save();render();
}
function reset(){const s=S.snd;S=fresh();S.snd=s;save();render()}

$("rs").onclick=()=>{if(S.seed===null||confirm("Reiniciar e voltar à escolha de casos? O progresso atual será apagado."))reset()};
$("snd").onclick=()=>{S.snd=!S.snd;save();render()};
$("ovb").onclick=()=>$("ov").classList.remove("on");
$("fcn").onclick=next;
document.addEventListener("keydown",e=>{if(e.key==="Escape"){$("ov").classList.remove("on");$("fc").classList.remove("on")}});
render();
