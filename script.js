"use strict";
/* ============ ESTADO E PERSISTÊNCIA ============ */
const KEY="caso-kernel-v2",N=CASES.length,MAXHP=100,HIT=10,HINT=20,HEAL=10;
const $=id=>document.getElementById(id);
const fresh=()=>({i:0,hp:MAXHP,score:0,h:0,w:0,sv:false,sel:null,last:0,clues:[],snd:true,over:false});
let S=load();
function load(){try{return Object.assign(fresh(),JSON.parse(localStorage.getItem(KEY)))}catch(e){return fresh()}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}

/* ============ RENDERIZADOR MATEMÁTICO ============ */
function mth(e){
  e=e.replace(/mat\(([^)]*)\)/g,(_,b)=>'<span class="mx">'+b.split(";").map(r=>'<span class="r">'+r.split(",").map(c=>"<i>"+c.trim()+"</i>").join("")+"</span>").join("")+"</span>");
  return e.replace(/\\in/g,"∈").replace(/\\;/g," ").replace(/RR/g,"ℝ").replace(/->/g,"→")
    .replace(/\^\{([^}]*)\}/g,"<sup>$1</sup>").replace(/\^(\w+)/g,"<sup>$1</sup>").replace(/_(\w+)/g,"<sub>$1</sub>");
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
    if(k==="key")noise(0,.04,.5,2500);                                   /* tecla de máquina de escrever */
    if(k==="hint"){noise(0,.04,.5,2500);noise(.1,.04,.5,3000);noise(.2,.04,.5,2200)}
    if(k==="ok"){noise(0,.08,.9,300);tone(110,0,.2,"triangle",.4);tone(1760,.3,.7,"sine",.15)} /* carimbo + sineta */
    if(k==="no"){noise(0,.15,.9,200);tone(70,0,.3,"sawtooth",.3)}
    if(k==="win")[0,.15,.3,.45].forEach((t,i)=>tone(523*(1+i*.25),t,.4,"triangle",.2));
    if(k==="lose")[0,.25,.5].forEach((t,i)=>tone(220/(1+i*.3),t,.45,"sawtooth",.2));
  }catch(e){}
}

/* ============ LÓGICA ============ */
const parse=v=>v.replace(/[()\s]/g,"").split(/[;,]/).filter(Boolean).map(p=>{if(p.includes("/")){const[a,b]=p.split("/");return +a/+b}return +p});
const pts=()=>Math.max(100-10*S.h-5*S.w,10);
const anim=(id,cls)=>{const el=$(id);el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls)};

function render(){
  $("sc").textContent="🏅 "+S.score+" pts";
  $("snd").textContent=S.snd?"🔊 Áudio":"🔇 Mudo";
  $("hpf").style.width=S.hp+"%";
  $("hpf").className="hpf"+(S.hp<=30?" low":S.hp<=60?" mid":"");
  $("hpt").textContent=S.hp+"/"+MAXHP;$("hp").setAttribute("aria-valuenow",S.hp);
  const done=S.i+(S.sv?1:0);
  $("pf").style.width=(done/N*100)+"%";$("pb").setAttribute("aria-valuenow",Math.round(done/N*100));
  $("inv").innerHTML=CASES.map((c,k)=>S.clues.includes(k)?'<li class="cl">📌 <b>'+c.c[0]+"</b>"+c.c[1]+"</li>":'<li class="cl lk">🔒 Pista '+(k+1)+" ainda oculta</li>").join("");
  const g=$("game");
  if(S.over){
    g.innerHTML='<div class="fim"><h2>🩸 Investigação fracassada</h2><div class="carimbo">Detetive fora de combate</div><p>Sua vida chegou a zero na fase '+(S.i+1)+' de '+N+'. Pontuação: '+S.score+'. Reabra o arquivo e tente de novo.</p><button class="btn stamp" id="again">↺ Reiniciar investigação</button></div>';
    $("again").onclick=reset;return;
  }
  if(S.i>=N){
    g.innerHTML='<div class="fim"><h2>🏆 Caso resolvido</h2><div class="carimbo v">Arquivado</div><p>Pontuação final: <b>'+S.score+'</b> de '+N*100+' · Vida restante: '+S.hp+'/'+MAXHP+'.</p><p class="story">O culpado estava no núcleo o tempo todo: quando T tem núcleo não trivial, ela não é inversível.</p><button class="btn stamp" id="again">↺ Nova investigação</button></div>';
    $("again").onclick=reset;return;
  }
  const P=CASES[S.i];
  let h='<div class="fase">📂 Fase '+(S.i+1)+" de "+N+"</div><h2>🕵️‍♂️ "+P.t+'</h2><div class="story">'+M(P.s)+'</div><div class="q">🔎 '+M(P.q)+"</div>";
  if(P.type==="choice")h+='<div class="opts" role="group" aria-label="Alternativas">'+P.o.map((o,k)=>'<button class="btn opt" data-k="'+k+'" aria-pressed="'+(S.sel===k)+'"'+(S.sv?" disabled":"")+">"+String.fromCharCode(65+k)+") "+M(o)+"</button>").join("")+"</div>";
  else h+='<div class="row"><input id="ans" aria-label="Sua resposta" placeholder="Datilografe sua resposta" autocomplete="off"'+(S.sv?" disabled":"")+"></div>";
  if(!S.sv)h+='<div class="row"><button class="btn stamp" id="chk">🔍 Analisar resposta</button><button class="btn" id="hb"'+(S.h>=3?" disabled":"")+'>💡 Pedir dica (−'+HINT+" HP)</button></div>";
  for(let k=0;k<S.h;k++)h+='<div class="hint">💡 '+M(P.h[k])+"</div>";
  h+='<div id="fb" role="status">'+(S.sv?'<span class="good">✅ Correto! +'+S.last+' pts, +'+HEAL+' HP</span><div class="story">'+P.e+'</div><button class="btn stamp" id="nx">'+(S.i+1<N?"📂 Próxima fase":"🏆 Encerrar caso")+"</button>":"")+"</div>";
  g.innerHTML=h;
  g.querySelectorAll(".opt").forEach(b=>b.onclick=()=>{S.sel=+b.dataset.k;sfx("key");save();render()});
  const a=$("ans");if(a){a.oninput=()=>sfx("key");a.onkeydown=e=>{if(e.key==="Enter")check()};a.focus()}
  if($("chk"))$("chk").onclick=check;
  if($("hb"))$("hb").onclick=hint;
  if($("nx")){$("nx").onclick=next;$("nx").focus()}
}
function damage(n){
  S.hp=Math.max(0,S.hp-n);
  if(S.hp===0){S.over=true;sfx("lose")}
  save();render();anim("folder","hit");
}
function hint(){
  if(S.h>=3)return;
  S.h++;sfx("hint");damage(HINT);
}
function check(){
  const P=CASES[S.i];let ok;
  if(P.type==="choice"){if(S.sel===null)return msg("Escolha uma alternativa antes de analisar.");ok=S.sel===P.a}
  else{const u=parse($("ans").value),a=[].concat(P.a);
    if(!u.length||u.some(isNaN))return msg("Formato inválido. Use números, por exemplo 5,6 ou 1/2.");
    ok=u.length===a.length&&u.every((x,k)=>Math.abs(x-a[k])<1e-6)}
  if(ok){
    S.last=pts();S.score+=S.last;S.hp=Math.min(MAXHP,S.hp+HEAL);S.clues.push(S.i);S.sv=true;
    sfx("ok");save();render();anim("folder","ok");
  }else{
    S.w++;sfx("no");damage(HIT);
    if(!S.over)msg("✘ Resposta incorreta (−"+HIT+" HP). Revise ou peça uma dica.");
  }
}
function msg(t){const f=$("fb");if(f)f.innerHTML='<span class="bad">'+t+"</span>"}
function next(){
  S.i++;S.h=0;S.w=0;S.sv=false;S.sel=null;save();render();
  if(S.i>=N){sfx("win");$("ovp").textContent="Você fechou o caso com "+S.score+" de "+N*100+" pontos e "+S.hp+" HP.";$("ov").classList.add("on");$("ovb").focus()}
}
function reset(){const s=S.snd;S=fresh();S.snd=s;save();render()}

$("rs").onclick=()=>{if(confirm("Reiniciar a investigação e apagar o progresso?"))reset()};
$("snd").onclick=()=>{S.snd=!S.snd;save();render()};
$("ovb").onclick=()=>$("ov").classList.remove("on");
document.addEventListener("keydown",e=>{if(e.key==="Escape")$("ov").classList.remove("on")});
render();
