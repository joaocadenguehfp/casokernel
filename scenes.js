/* =====================================================================
   CENAS POINT AND CLICK (edite aqui). Carregado depois de cases.js.
   SCENES[idDoCaso] = cena do caso (id de SEEDS em cases.js); ausente = modo linear (fallback).
   Cena: { intro, salas:[{id,nome,svg}], hotspots:[...], final:{titulo,texto,fala} }
   Hotspot: { caso (0-9, índice da fase em cases.js), sala (id), nome,
              x,y,w,h (em % da cena; use box(px) numa arte 1600x900),
              requires:[índices de fases que precisam estar resolvidas],
              falaAbrir, falaBloqueado, falaResolvido, quem (quem fala ao resolver),
              pista (linha de cena exibida no dossiê) }
   Estados visuais da arte: elementos SVG com data-on="k" aparecem quando a fase k
   está resolvida; data-off="k" somem quando ela é resolvida (com transição).
   Arte original, estilo Art Déco noir (sem assets de terceiros).
   ===================================================================== */
const box=(x,y,w,h)=>({x:x/16,y:y/9,w:w/16,h:h/9});   /* px (viewBox 1600x900) -> % */

/* ---- peças geradas por código ---- */
const kFloor=()=>{let s="";for(let xb=-800;xb<=2400;xb+=200)s+='<line x1="'+(800+(xb-800)*.42)+'" y1="640" x2="'+xb+'" y2="900"/>';
  [668,708,760,830].forEach(y=>s+='<line x1="0" y1="'+y+'" x2="1600" y2="'+y+'"/>');return s};
const kPrints=()=>{let s="";for(let n=0;n<7;n++){const t=n/6,cx=650+t*470,cy=838-t*52+(n%2?10:-10);
  s+='<g transform="translate('+cx.toFixed(0)+' '+cy.toFixed(0)+') rotate(-6)"><ellipse rx="22" ry="10"/><ellipse cx="-30" rx="9" ry="8"/></g>'}return s};
const kBolts=(cx,cy,r,n)=>{let s="";for(let i=0;i<n;i++){const a=i/n*Math.PI*2;s+='<circle cx="'+(cx+Math.cos(a)*r).toFixed(1)+'" cy="'+(cy+Math.sin(a)*r).toFixed(1)+'" r="5"/>'}return s};
const kStars=()=>[[130,150],[200,120],[330,150],[355,215],[160,230],[120,310],[360,300]].map(p=>'<circle cx="'+p[0]+'" cy="'+p[1]+'" r="1.8" fill="#cfeeff" opacity=".7"/>').join("");

const SALA_COFRE=`<svg class="art" viewBox="0 0 1600 900" aria-hidden="true" focusable="false">
<defs>
 <linearGradient id="kWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16212d"/><stop offset="1" stop-color="#0c131b"/></linearGradient>
 <linearGradient id="kFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#101a25"/><stop offset="1" stop-color="#05080c"/></linearGradient>
 <linearGradient id="kGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3dc8a"/><stop offset=".45" stop-color="#c9a232"/><stop offset=".7" stop-color="#e5c158"/><stop offset="1" stop-color="#8a6d1c"/></linearGradient>
 <linearGradient id="kBeam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4fc3f7" stop-opacity=".36"/><stop offset="1" stop-color="#4fc3f7" stop-opacity="0"/></linearGradient>
 <linearGradient id="kSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#07131f"/><stop offset="1" stop-color="#143049"/></linearGradient>
 <linearGradient id="kCone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb35c" stop-opacity=".55"/><stop offset="1" stop-color="#ff7b00" stop-opacity="0"/></linearGradient>
 <radialGradient id="kMoon"><stop offset="0" stop-color="#e9fbff"/><stop offset=".45" stop-color="#9be7ff" stop-opacity=".7"/><stop offset="1" stop-color="#4fc3f7" stop-opacity="0"/></radialGradient>
 <radialGradient id="kCu"><stop offset="0" stop-color="#ff9a3a" stop-opacity=".6"/><stop offset="1" stop-color="#ff7b00" stop-opacity="0"/></radialGradient>
 <radialGradient id="kVig" cx=".5" cy=".45" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".72"/></radialGradient>
 <pattern id="kDeco" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M20 0V40M0 20H40" stroke="#d4af37" stroke-opacity=".04" fill="none"/></pattern>
 <pattern id="kChev" width="80" height="44" patternUnits="userSpaceOnUse"><path d="M0 4L40 38L80 4" fill="none" stroke="#d4af37" stroke-opacity=".38"/></pattern>
 <clipPath id="kWin"><path d="M90 470V250A150 150 0 0 1 390 250V470Z"/></clipPath>
 <filter id="kGlow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>

<!-- parede, friso e rodapé -->
<rect width="1600" height="640" fill="url(#kWall)"/><rect width="1600" height="640" fill="url(#kDeco)"/>
<rect width="1600" height="62" fill="#090e14"/><rect y="8" width="1600" height="44" fill="url(#kChev)"/><rect y="60" width="1600" height="3" fill="url(#kGold)"/>
<rect y="610" width="1600" height="30" fill="#0a1017"/><rect y="610" width="1600" height="2" fill="url(#kGold)" opacity=".6"/>
<rect x="0" y="63" width="46" height="547" fill="#0a1017"/><rect x="44" y="63" width="2" height="547" fill="url(#kGold)" opacity=".5"/>
<rect x="1554" y="63" width="46" height="547" fill="#0a1017"/><rect x="1554" y="63" width="2" height="547" fill="url(#kGold)" opacity=".5"/>
<!-- piso -->
<rect y="640" width="1600" height="260" fill="url(#kFloor)"/>
<g stroke="#d4af37" stroke-opacity=".07" fill="none">${kFloor()}</g>

<!-- arandelas -->
<g><ellipse cx="440" cy="232" rx="44" ry="70" fill="url(#kCone)" opacity=".28"/><path d="M430 214h20l-5 40h-10z" fill="url(#kGold)"/><circle cx="440" cy="212" r="9" fill="#ffd9a0"/></g>
<g><ellipse cx="896" cy="232" rx="44" ry="70" fill="url(#kCone)" opacity=".28"/><path d="M886 214h20l-5 40h-10z" fill="url(#kGold)"/><circle cx="896" cy="212" r="9" fill="#ffd9a0"/></g>

<!-- JANELA (fase 3) -->
<path d="M80 480V250A160 160 0 0 1 400 250V480Z" fill="#0b1824" stroke="url(#kGold)" stroke-width="7"/>
<g clip-path="url(#kWin)"><rect x="80" y="90" width="330" height="390" fill="url(#kSky)"/>
 <circle cx="285" cy="215" r="92" fill="url(#kMoon)" opacity=".85"/><circle cx="285" cy="215" r="34" fill="#e9fbff"/>${kStars()}
 <path d="M90 470V420h30v-40h24v30h20v-70h26v70h22v-30h30v60h34v-90h20v90h26v-50h36v50h42V470Z" fill="#04080d"/>
 <g fill="#ffb35c" opacity=".75"><rect x="104" y="430" width="5" height="7"/><rect x="152" y="396" width="5" height="7"/><rect x="214" y="408" width="5" height="7"/><rect x="274" y="414" width="5" height="7"/><rect x="334" y="425" width="5" height="7"/></g>
</g>
<path d="M240 100V470M90 330H390" stroke="url(#kGold)" stroke-width="4" fill="none"/><rect x="66" y="470" width="348" height="16" fill="url(#kGold)"/>
<g data-on="3" filter="url(#kGlow)"><circle cx="330" cy="428" r="7" fill="#ff7b00"/><path d="M330 400V456M302 428H358" stroke="#9be7ff" stroke-width="2.5"/><circle cx="330" cy="428" r="22" fill="none" stroke="#9be7ff" stroke-width="2"/></g>
<polygon points="96,486 392,486 900,900 330,900" fill="url(#kBeam)"/>
<polygon data-on="3" points="96,486 392,486 900,900 330,900" fill="url(#kBeam)"/>

<!-- QUADRO-NEGRO (fase 2) -->
<rect x="462" y="122" width="396" height="266" rx="6" fill="#6f5614"/><rect x="470" y="130" width="380" height="250" rx="3" fill="#0c1a1f"/>
<rect x="470" y="380" width="380" height="12" fill="url(#kGold)"/><g fill="#e8e4d8" opacity=".5"><rect x="520" y="371" width="34" height="9" rx="2"/><rect x="566" y="373" width="20" height="7" rx="2"/></g>
<ellipse cx="640" cy="300" rx="110" ry="28" fill="#cfeeff" opacity=".05"/><ellipse cx="760" cy="215" rx="60" ry="20" fill="#cfeeff" opacity=".04"/>
<g font-family="Rajdhani,sans-serif" font-size="34" fill="#cfeeff" fill-opacity=".5"><text x="500" y="200">T(x1,x2) = (x1, 0)</text><text x="500" y="262">T(x) = 0   ⇒   x1 = 0</text></g><text data-off="2" x="500" y="324" font-family="Rajdhani,sans-serif" font-size="34" fill="#cfeeff" fill-opacity=".5">N(T) = <tspan fill="#ff7b00">?</tspan></text>
<g data-on="2" filter="url(#kGlow)" font-family="Rajdhani,sans-serif" font-size="34" fill="#9be7ff"><text x="500" y="324">N(T) = {(0, x2)}  dim 1</text><path d="M500 336H800" stroke="#9be7ff" stroke-width="2.5"/></g>

<!-- RETRATO (fase 9) -->
<rect x="934" y="114" width="232" height="312" fill="url(#kGold)"/><rect x="942" y="122" width="216" height="296" fill="#0b121a"/><rect x="958" y="138" width="184" height="264" fill="#0c141c" stroke="#d4af37" stroke-opacity=".5"/>
<g data-on="9"><ellipse cx="1050" cy="270" rx="95" ry="120" fill="url(#kCu)"/></g>
<path d="M975 402C975 340 1020 322 1050 320C1080 322 1125 340 1125 402Z" fill="#05090e"/><circle cx="1050" cy="268" r="42" fill="#05090e"/>
<ellipse cx="1050" cy="238" rx="64" ry="12" fill="#03060a"/><path d="M1002 238V210Q1050 194 1098 210V238Z" fill="#03060a"/>
<text data-off="9" x="1050" y="286" text-anchor="middle" font-family="Cinzel,serif" font-size="58" fill="#4fc3f7" fill-opacity=".4">?</text>
<g data-on="9" filter="url(#kGlow)"><circle cx="1034" cy="266" r="5" fill="#ff5a4d"/><circle cx="1066" cy="266" r="5" fill="#ff5a4d"/><rect x="934" y="114" width="232" height="312" fill="none" stroke="#ff7b00" stroke-width="3"/></g>
<g data-on="9"><rect x="985" y="436" width="130" height="28" fill="#0a1017" stroke="#d4af37"/><text x="1050" y="456" text-anchor="middle" font-family="Cinzel,serif" font-size="15" fill="#e5c158" letter-spacing="3">SUSPEITO</text></g>

<!-- COFRE (fase 6) -->
<rect x="1222" y="172" width="306" height="356" fill="#070b10" stroke="url(#kGold)" stroke-width="5"/><rect x="1236" y="186" width="278" height="328" fill="#0a1017" stroke="#d4af37" stroke-opacity=".4"/>
<g data-on="6"><rect x="1245" y="195" width="260" height="310" fill="#05080c"/><rect x="1245" y="195" width="260" height="310" fill="url(#kCu)" opacity=".5"/><path d="M1245 300H1505M1245 400H1505" stroke="#d4af37" stroke-opacity=".25"/>
 <g fill="#ffb35c" opacity=".7"><circle cx="1330" cy="470" r="2.5"/><circle cx="1400" cy="440" r="2"/><circle cx="1450" cy="478" r="2.5"/><circle cx="1370" cy="350" r="2"/></g>
 <ellipse cx="1236" cy="350" rx="34" ry="126" fill="#17232f" stroke="url(#kGold)" stroke-width="5"/><ellipse cx="1236" cy="350" rx="14" ry="82" fill="none" stroke="#d4af37" stroke-opacity=".5"/></g>
<g data-off="6"><circle cx="1375" cy="350" r="128" fill="#17232f" stroke="url(#kGold)" stroke-width="7"/><circle cx="1375" cy="350" r="102" fill="none" stroke="#d4af37" stroke-opacity=".55" stroke-width="2"/><circle cx="1375" cy="350" r="64" fill="#101a24" stroke="url(#kGold)" stroke-width="3"/>
 <g fill="url(#kGold)">${kBolts(1375,350,115,10)}</g><path d="M1375 296V404M1321 350H1429M1337 312L1413 388M1413 312L1337 388" stroke="url(#kGold)" stroke-width="7" stroke-linecap="round"/><circle cx="1375" cy="350" r="22" fill="url(#kGold)"/><circle cx="1375" cy="350" r="9" fill="#101a24"/>
 <rect x="1218" y="250" width="18" height="36" fill="url(#kGold)"/><rect x="1218" y="414" width="18" height="36" fill="url(#kGold)"/></g>

<!-- ESTANTE DE ARQUIVOS (fase 4) -->
<rect x="474" y="404" width="232" height="324" fill="#0c141c" stroke="url(#kGold)" stroke-width="3"/><rect x="466" y="398" width="248" height="14" fill="url(#kGold)"/>
<g fill="#131e2a" stroke="#d4af37" stroke-opacity=".5"><rect x="486" y="424" width="208" height="62"/><rect x="486" y="494" width="208" height="62"/><rect x="486" y="564" width="208" height="62"/><rect x="486" y="634" width="208" height="62"/></g>
<g fill="url(#kGold)"><rect x="560" y="448" width="60" height="8" rx="3"/><rect x="560" y="518" width="60" height="8" rx="3"/><rect x="560" y="588" width="60" height="8" rx="3"/><rect x="560" y="658" width="60" height="8" rx="3"/></g>
<g data-on="4"><rect x="470" y="500" width="244" height="52" fill="#05080c" stroke="url(#kGold)"/><g filter="url(#kGlow)" fill="#9be7ff" opacity=".85"><rect x="490" y="486" width="46" height="26"/><rect x="548" y="482" width="40" height="30"/><rect x="600" y="488" width="52" height="24"/></g></g>

<!-- MESA (fases 1, 5, 7) -->
<ellipse cx="985" cy="752" rx="300" ry="20" fill="#000" opacity=".5"/>
<rect x="746" y="584" width="26" height="162" fill="#0c141c" stroke="#d4af37" stroke-opacity=".4"/><rect x="1198" y="584" width="26" height="162" fill="#0c141c" stroke="#d4af37" stroke-opacity=".4"/>
<rect x="772" y="584" width="426" height="150" fill="#101a25" stroke="#d4af37" stroke-opacity=".5"/><path d="M790 600H1180V718H790Z" fill="none" stroke="#d4af37" stroke-opacity=".25"/>
<polygon points="736,554 1234,554 1258,584 712,584" fill="#22364a" stroke="url(#kGold)" stroke-width="2"/><polygon points="736,554 1234,554 1230,560 740,560" fill="#fff" opacity=".07"/>
<rect x="890" y="602" width="210" height="78" fill="#152331" stroke="#d4af37"/>
<g data-off="1"><circle cx="995" cy="636" r="7" fill="#05080c" stroke="url(#kGold)" stroke-width="2"/><path d="M995 640v14" stroke="#05080c" stroke-width="4"/><rect x="950" y="664" width="90" height="7" rx="3" fill="url(#kGold)"/></g>
<g data-on="1"><polygon points="896,680 1094,680 1118,730 872,730" fill="#05080c" stroke="url(#kGold)"/><g filter="url(#kGlow)"><circle cx="985" cy="706" r="9" fill="none" stroke="#ffd36b" stroke-width="3"/><path d="M994 706H1032M1020 706v10M1030 706v8" stroke="#ffd36b" stroke-width="3" stroke-linecap="round"/></g></g>

<!-- telefone (fase 5) -->
<rect x="808" y="528" width="84" height="32" rx="12" fill="#15222f" stroke="url(#kGold)"/><circle cx="850" cy="540" r="17" fill="#0a1017" stroke="url(#kGold)"/><g fill="#d4af37" opacity=".7"><circle cx="850" cy="527" r="1.6"/><circle cx="861" cy="531" r="1.6"/><circle cx="863" cy="541" r="1.6"/><circle cx="837" cy="531" r="1.6"/><circle cx="837" cy="548" r="1.6"/></g>
<g data-off="5"><rect x="812" y="504" width="76" height="16" rx="8" fill="#243546" stroke="url(#kGold)"/></g>
<g data-on="5"><g transform="rotate(-26 850 520)"><rect x="812" y="498" width="76" height="16" rx="8" fill="#243546" stroke="url(#kGold)"/></g><g filter="url(#kGlow)" fill="none" stroke="#9be7ff" stroke-width="2.5" stroke-linecap="round"><path d="M906 478q16-10 30 0"/><path d="M912 462q24-16 46 0"/></g></g>

<!-- livro-caixa (fase 7) -->
<g data-off="7"><rect x="950" y="534" width="130" height="24" rx="3" fill="#3a2418" stroke="url(#kGold)"/><rect x="1000" y="540" width="30" height="12" fill="#0a1017" stroke="#d4af37" stroke-opacity=".6"/></g>
<g data-on="7"><polygon points="948,558 1015,540 1015,516 948,534" fill="#e8e4d8" opacity=".92"/><polygon points="1015,540 1082,558 1082,534 1015,516" fill="#d9d4c5" opacity=".92"/><g filter="url(#kGlow)" stroke="#4fc3f7" stroke-width="2" opacity=".9"><path d="M960 540l44-12M960 548l44-12M1026 530l44 12M1026 538l44 12"/></g></g>

<!-- abajur -->
<polygon points="1108,498 1212,498 1330,610 990,610" fill="url(#kCone)" opacity=".5"/>
<ellipse cx="1160" cy="556" rx="24" ry="6" fill="url(#kGold)"/><rect x="1157" y="484" width="6" height="72" fill="url(#kGold)"/><polygon points="1122,450 1198,450 1216,494 1104,494" fill="#7a4310" stroke="url(#kGold)"/><circle cx="1160" cy="496" r="16" fill="url(#kCu)"/>

<!-- TAPETE e pegadas (fase 0) -->
<polygon points="574,760 1196,760 1250,864 520,864" fill="#16222f" stroke="url(#kGold)" stroke-width="3"/><polygon points="604,772 1166,772 1212,852 560,852" fill="none" stroke="#d4af37" stroke-opacity=".4"/>
<g fill="none" stroke="#d4af37" stroke-opacity=".28"><path d="M880 780l40 36-40 36-40-36z"/><path d="M740 790l26 24-26 24-26-24zM1020 790l26 24-26 24-26-24z"/></g>
<g fill="#04070b" opacity=".8">${kPrints()}</g>
<g data-on="0" filter="url(#kGlow)" fill="none" stroke="#9be7ff" stroke-width="2.5"><g fill="#9be7ff" fill-opacity=".25">${kPrints()}</g><path d="M610 846V818M596 832H624"/><circle cx="610" cy="832" r="16"/></g>

<!-- INFORMANTE (fase 8) -->
<ellipse cx="240" cy="806" rx="112" ry="14" fill="#000" opacity=".55"/>
<path d="M168 590C168 560 200 552 240 552C280 552 312 560 312 590L336 804H150Z" fill="#0a111a"/><path d="M312 590L336 804" stroke="#4fc3f7" stroke-opacity=".5" stroke-width="2" fill="none"/>
<path d="M205 556L240 640L275 556Z" fill="#05090e"/><path d="M150 700H336" stroke="url(#kGold)" stroke-width="3" opacity=".6"/>
<circle cx="240" cy="520" r="34" fill="#070c12"/><ellipse cx="240" cy="496" rx="64" ry="12" fill="#04070b"/><path d="M200 496V470Q240 454 280 470V496Z" fill="#04070b"/><path d="M200 496H280" stroke="url(#kGold)" stroke-width="2.5"/>
<g filter="url(#kGlow)"><ellipse cx="227" cy="522" rx="5" ry="3" fill="#9be7ff"/><ellipse cx="253" cy="522" rx="5" ry="3" fill="#9be7ff"/></g>
<g data-on="8" filter="url(#kGlow)"><path d="M338 420h132a14 14 0 0 1 14 14v52a14 14 0 0 1-14 14H386l-30 24 4-24h-22a14 14 0 0 1-14-14v-52a14 14 0 0 1 14-14z" fill="#0a1017" stroke="#9be7ff" stroke-width="2.5"/><g fill="#9be7ff"><circle cx="380" cy="460" r="5"/><circle cx="404" cy="460" r="5"/><circle cx="428" cy="460" r="5"/></g></g>

<rect width="1600" height="900" fill="url(#kVig)"/>
</svg>`;

const SCENES={
cofre:{
  intro:"O cofre está vazio e o ladrão deixou tudo arrumado demais. Vamos ver o que cada objeto confessa.",
  salas:[{id:"escritorio",nome:"Escritório do cofre arrombado",svg:SALA_COFRE}],
  hotspots:[
    {caso:0,sala:"escritorio",nome:"Pegadas no tapete",...box(540,740,700,130),
      falaAbrir:"Alguém atravessou o tapete sem pressa. Vejamos o rastro.",
      falaResolvido:"O rastro parte da origem. Pista sólida.",
      pista:"Os passos partem da origem: o que é linear não sai do zero."},
    {caso:1,sala:"escritorio",nome:"Gaveta da mesa",...box(880,590,230,100),
      falaAbrir:"Uma gaveta com marcas de chave, nada forçado.",
      falaResolvido:"A chave encaixou. A estante vai ceder, e o cofre também.",
      pista:"Uma chave 2×2, gravada com a ordem das colunas."},
    {caso:2,sala:"escritorio",nome:"Quadro-negro",...box(470,130,380,250),
      falaAbrir:"Alguém apagou o quadro às pressas, mas sobrou um traço.",
      falaResolvido:"O que some no ponto cego tem dimensão. Anotado.",
      pista:"Um ponto cego: o que a transformação zera some do mapa."},
    {caso:3,sala:"escritorio",nome:"Janela",...box(90,100,300,370),
      falaAbrir:"Da janela só se vê um plano da cidade. O resto fica fora do campo.",
      falaResolvido:"Dois eixos aparecem, um se perde. Faz sentido.",
      pista:"A imagem é só um plano: o terceiro eixo foi descartado."},
    {caso:4,sala:"escritorio",nome:"Estante de arquivos",...box(480,410,220,310),requires:[1],
      falaBloqueado:"Trancada a chave. A chave deve estar por perto, talvez na mesa.",
      falaAbrir:"Dois arquivos lado a lado. Pelo menos os números não mentem.",
      falaResolvido:"Os arquivos se cruzam. Falta o cofre.",
      pista:"Dois cofres e uma só tabela de passagem entre eles."},
    {caso:5,sala:"escritorio",nome:"Telefone",...box(800,490,100,75),
      falaAbrir:"O telefone ainda está morno. Alguém desfez uma ligação.",
      falaResolvido:"A inversa existe. O informante vai querer falar.",
      pista:"Toda chamada tem um caminho de volta."},
    {caso:6,sala:"escritorio",nome:"Cofre",...box(1230,180,290,340),requires:[1,4],
      falaBloqueado:"O cofre pede a chave da mesa e o arquivo da estante. Ainda faltam peças.",
      falaAbrir:"A cadeia de custódia tem dois elos. Quem agiu primeiro?",
      falaResolvido:"Vazio, mas o rastro continua.",
      pista:"Dois movimentos em ordem: o último a agir é o primeiro a ser escrito."},
    {caso:7,sala:"escritorio",nome:"Livro-caixa",...box(945,505,140,65),requires:[2,3],
      falaBloqueado:"O livro está lacrado por um padrão. Preciso entender melhor o quadro e a janela.",
      falaAbrir:"Cada página sobe uma potência. Quem escreve assim quer esconder algo.",
      falaResolvido:"Os coeficientes sobem de grau, mas nada volta igual.",
      pista:"Deslocar e derivar não desfazem um ao outro."},
    {caso:8,sala:"escritorio",nome:"Informante",...box(150,470,180,335),requires:[5],
      falaBloqueado:"Ele não fala sem uma ligação feita. Preciso usar o telefone antes.",
      falaAbrir:"“Dois interrogatórios, uma única saída”, ele sussurra.",
      quem:"Informante",falaResolvido:"Já falei demais. O retrato deve interessar ao senhor.",
      pista:"O que escapa do duplo interrogatório vem de uma só linha."},
    {caso:9,sala:"escritorio",nome:"Retrato",...box(940,120,220,300),requires:[0,1,2,3,4,5,6,7,8],
      falaBloqueado:"O retrato esconde algo, mas ainda faltam pistas. Examine tudo antes.",
      falaAbrir:"Todos os rastros apontam para este rosto. Uma última conta.",
      falaResolvido:"Era ele. O caso está resolvido.",
      pista:"A inversa da composição entrega o endereço do suspeito."}
  ],
  final:{
    texto:"O retrato girou e mostrou o rosto de quem esvaziou o cofre. Cada conta fechou um elo, e a inversa da composição entregou o nome. Caso arquivado.",
    fala:"Nada some de verdade: só muda de lugar. E toda transformação deixa um núcleo para quem sabe olhar."
  }
}
};
