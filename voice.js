/* v1.9: mikrofon tylko w oknie odpowiedzi ~8 s po pytaniu (przyciski są główne); metronom natywny w usłudze pierwszoplanowej, gdy dostępny.
   Lektor v1.5.1: nagrania dekodowane do WebAudio i odtwarzane bez przerw; TTS tylko dla całych zdań bez nagrania.
   Rozpoznawanie mowy v1.7: trwały natywny rozpoznawacz (RkoNative.srStart, bez trybu offline), słucha także podczas lektora,
   wyniki pośrednie, natychmiastowy restart bez narastających przerw, kody błędów na ekranie, surowy log. */
(function(root){
const Cap=root.Capacitor,isNative=!!(Cap&&Cap.isNativePlatform&&Cap.isNativePlatform());
const plug=n=>isNative&&Cap.Plugins?Cap.Plugins[n]:null;
const PREFIX=['Zmniejszam. Ustaw pompę','Zwiększam. Ustaw pompę','Utrzymaj. Pompa','Ustaw pompę','Średnie ciśnienie tętnicze','Zapisano:'];
const GAP=0.12,CACHE_MAX=220;
// v2.1.0: lektor męski (m) / damski (k) – osobne katalogi nagrań audio/m, audio/k; wspólny słownik clips.json (klucz = tekst)
const GEN_M=[[/Rozpoznałam/g,'Rozpoznałem'],[/zrozumiałam/g,'zrozumiałem'],[/przyjęłam/g,'przyjąłem']];
function genderize(t,v){t=String(t);if(v==='m')for(const[a,b]of GEN_M)t=t.replace(a,b);return t}
// v1.9.2: każde oczekiwanie ma limit czasu – lektor nigdy nie „wisi” (zawieszony stan mówienia blokował mikrofon i testy)
const TO=(p,ms)=>Promise.race([Promise.resolve(p).catch(()=>{}),new Promise(r=>setTimeout(r,ms))]);
function key(t){return String(t).trim()}
function sentences(t){return String(t).split(/(?<=[.?!])\s+/).filter(Boolean)}
const V={voice:'m',genderize:t=>genderize(t,V.voice),dir(){return 'audio/'+(V.voice==='k'?'k':'m')+'/'},spoken:[],clips:{},speaking:false,queue:[],muted:false,audio:null,ctx:null,bufs:new Map(),srcs:[],current:'',startedAt:0,endedAt:0,stats:{tts:0,clips:0,fallback:0},
 // v2.1.1 (t95u): głośność lektora 50–200% (Ustawienia); wzmocnienie WebAudio (GainNode) z kompresorem-limiterem (bez przesterowania)
 vol:1,setVol(x){x=+x;V.vol=isFinite(x)?Math.max(0.3,Math.min(2,x)):1;try{if(V._g)V._g.gain.value=V.vol}catch(e){}},
 out(){const c=V.ctx;try{if(!V._g||V._gc!==c){const g=c.createGain();const k=c.createDynamicsCompressor();k.threshold.value=-3;k.knee.value=3;k.ratio.value=12;k.attack.value=0.003;k.release.value=0.15;g.connect(k);k.connect(c.destination);V._g=g;V._gc=c}V._g.gain.value=V.vol;return V._g}catch(e){return c.destination}},
 setVoice(v){v=v==='k'?'k':'m';if(v===V.voice)return;V.voice=v;V.bufs.clear();V._warmed=false;V._ttsVoice=undefined;try{V.preloadStart()}catch(e){}},
 async init(){try{const r=await fetch('audio/clips.json');V.clips=await r.json()}catch(e){V.clips={}}V.audio=new Audio();V.audio.preload='auto';
  // kontekst audio tworzony od razu (zawieszony) – dekodowanie nagrań startowych przed pierwszym kliknięciem
  try{V.ctx=new (root.AudioContext||root.webkitAudioContext)({latencyHint:'playback'})}catch(e){V.ctx=null}V.preloadStart()},
 preloadStart(){const S=root.RKO&&root.RKO.SAY;if(!S||!V.ctx)return;const L=[S.start,S.call,S.defib,S.iv,S.team,S.roscRhy,S.rhythm,S.warn15,S.cont,S.adr,S.adrNow,S.nonshockI,S.afterShock,S.logged];
  V.startReady=Promise.all(L.filter(Boolean).map(t=>V.clips[key(t)]).filter(Boolean).map(f=>V.buf(f).catch(()=>null)))},
 unlock(){try{V.ctx=V.ctx||new (root.AudioContext||root.webkitAudioContext)({latencyHint:'playback'});V.ctx.resume()}catch(e){V.ctx=null}
  if(!V.ctx){try{V.audio.src='audio/silence.mp3';V.audio.play().catch(()=>{})}catch(e){}}setTimeout(V.warm,3000)},
 warm(){const S=root.RKO&&root.RKO.SAY;if(!S||!V.ctx||V._warmed)return;V._warmed=true;const fs=Object.values(S).map(t=>V.clips[key(t)]).filter(Boolean).slice(0,120);
  let i=0;const next=()=>{if(i>=fs.length)return;V.buf(fs[i++]).catch(()=>{}).then(()=>setTimeout(next,15))};next()},
 buf(f){if(V.bufs.has(f)){const b=V.bufs.get(f);V.bufs.delete(f);V.bufs.set(f,b);return b}
  const p=fetch(V.dir()+f).then(r=>{if(!r.ok)throw new Error('404');return r.arrayBuffer()}).then(a=>new Promise((ok,ko)=>V.ctx.decodeAudioData(a,ok,ko)));
  V.bufs.set(f,p);p.catch(()=>V.bufs.delete(f));while(V.bufs.size>CACHE_MAX)V.bufs.delete(V.bufs.keys().next().value);return p},
 // plan: lista zdań; każde zdanie = jedno źródło (same nagrania albo cały TTS)
 plan(text){if(V.clips[key(text)])return [{clips:[V.clips[key(text)]]}];const out=[];for(const s of sentences(text)){if(V.clips[key(s)]){out.push({clips:[V.clips[key(s)]]});continue}
  let done=false;for(const p of PREFIX){if(s.startsWith(p+' ')){const rest=s.slice(p.length+1);if(V.clips[p]&&V.clips[key(rest)]){out.push({clips:[V.clips[p],V.clips[key(rest)]]});done=true;break}}}
  if(!done)out.push({tts:s})}
  // scal kolejne zdania z nagrań w jedną sekwencję (bez przerw między plikami)
  const m=[];for(const x of out){const l=m[m.length-1];if(x.clips&&l&&l.clips){l.clips.push(null,...x.clips)}else m.push(x.clips?{clips:x.clips.slice()}:x)}return m},
 say(text,kind){if(!text)return;
  // v1.9.1: bez dublowania – ten sam tekst już mówiony lub w kolejce nie jest dodawany drugi raz
  const core=t=>String(t).replace(/^Przypominam\.\s*/,'');if((V.speaking&&core(V.current)===core(text))||V.queue.some(q=>core(q.text)===core(text)))return;V.queue.push({text,kind});if(!V.speaking&&!V.hold)V._run()},
 // v1.8: pomiń tylko nieaktualne pytanie/przypomnienie (po przyjętej komendzie); kolejka zostaje
 skipStale(old){if(!old)return false;const st=it=>(it.kind==='ask'||it.kind==='remind')&&String(it.text).endsWith(old);V.queue=V.queue.filter(it=>!st(it));
  if(V.speaking&&st({kind:V.kind,text:V.current})){V._cut=true;V.srcs.forEach(s=>{try{s.onended=null;s.stop()}catch(e){}});V.srcs=[];if(V._seqDone){const d=V._seqDone;V._seqDone=null;d()}try{V.audio.pause();V.audio.onended&&V.audio.onended()}catch(e){}const T=plug('TextToSpeech');if(T)T.stop().catch(()=>{});if(root.speechSynthesis)speechSynthesis.cancel();return true}return false},
 // v1.9.1: zatrzymaj WSZYSTKIE zaplanowane źródła – po wznowieniu kontekstu stare nie grają równolegle z powtórką
 killSrcs(){V.srcs.forEach(s=>{try{s.onended=null;s.stop()}catch(e){}});V.srcs=[]},
 stop(){clearTimeout(V._armTm);V.queue=[];V._cut=true;V.srcs.forEach(s=>{try{s.onended=null;s.stop()}catch(e){}});V.srcs=[];if(V._seqDone){const d=V._seqDone;V._seqDone=null;d()}
  try{V.audio.pause();V.audio.onended&&V.audio.onended()}catch(e){}if(root.speechSynthesis)speechSynthesis.cancel();const T=plug('TextToSpeech');if(T)T.stop().catch(()=>{})},
 async _run(){V.speaking=true;V.startedAt=Date.now();V.onState(true);
  // v1.9.9: użytkownik właśnie mówi – nie ucinaj mu komendy (maks. 1,5 s); wynik trafi do kolejki i wykona się po komunikacie
  // v2.0.0: krótkie pytanie bez słów-komend (np. „Hipoksja?”) – mikrofon NIE jest wyłączany: brak martwej strefy ponownego startu rozpoznawacza (0,3–1 s)
  // v2.1.0: tryb „zawsze” – mikrofon słucha przez cały czas (także „zakończ”, „zaintubowany”, „tak/nie” w trakcie lektora); echo lektora odfiltrowane (S.clean)
  await Promise.resolve();const live=S.liveOk(V.queue);S.liveNow=live;if(live)S.addLog('info','mikrofon słucha w trakcie lektora');
  if(!live){const t0=Date.now();while(S.running&&!S.paused&&M.userOn&&Date.now()-M.userT<4000&&Date.now()-t0<1500)await new Promise(r=>setTimeout(r,50))}
  // v1.8: mikrofon pauzowany PRZED dźwiękiem lektora – rozpoznawacz nie zabiera fokusu audio i nie słyszy lektora
  try{if(!live&&S.running&&!S.paused){await Promise.race([S.pause(),new Promise(r=>setTimeout(r,400))]);await new Promise(r=>setTimeout(r,150))}}catch(e){}
  let asked=false;while(V.queue.length){const it=V.queue.shift();if(it.kind==='ask'||it.kind==='remind'||it.kind==='replay')asked=true;V.current=it.text;V.kind=it.kind;V._cut=false;
   const sp={text:it.text,kind:it.kind,t0:Date.now(),t1:0,est:0};V.spoken.push(sp);if(V.spoken.length>12)V.spoken.shift();V._sp=sp;
   const segs=V.plan(it.text);for(let si=0;si<segs.length;si++){const seg=segs[si];if(V._cut)break;V._tail=si===segs.length-1;try{await TO(seg.clips?V._seq(seg.clips):V._tts(seg.tts),20000)}catch(e){V.stats.err=(V.stats.err||0)+1}}
   sp.t1=Date.now();V._tail=false;if(it.kind==='ask'||it.kind==='remind'){M.duck(1500);M.askQuiet(6000)}V.hooks.forEach(h=>{try{h('clip')}catch(e){}})}
  clearTimeout(V._armTm);V.current='';V.speaking=false;V.endedAt=Date.now();const wasLive=S.liveNow;S.liveNow=false;V.onState(false);if(!S.windowMode){if(!(wasLive&&!S.paused))S.resumeSoon()}else if(asked)S.openWindow()},
 // v2.1.0: nowa sesja rozpoznawania ~0,35 s PRZED końcem ostatniego komunikatu (pytania) – mikrofon gotowy dokładnie wtedy, gdy lektor kończy
 PREARM_MS:350,
 _armTail(endMs){clearTimeout(V._armTm);if(!V._tail)return;V._armTm=setTimeout(()=>{if(V.queue.length||!V.speaking||V._cut)return;const q=V.kind==='ask'||V.kind==='remind';if(q)S.prearm('pytanie')},Math.max(0,endMs-V.PREARM_MS))},
 async _seq(list,retry){V.stats.clips+=list.length;if(V.startReady){const p=V.startReady;V.startReady=null;await Promise.race([p,new Promise(r=>setTimeout(r,1500))])}
  if(V.ctx){try{if(V.ctx.state!=='running')await TO(V.ctx.resume(),800);if(V.ctx.state!=='running')throw new Error('ctx '+V.ctx.state);const bs=await Promise.race([Promise.all(list.map(f=>f?V.buf(f):null)),new Promise((_,ko)=>setTimeout(()=>ko(new Error('decode timeout')),4000))]);if(V._cut)return;
    V._intr=false;V.ctx.onstatechange=()=>{if(V.ctx.state!=='running')V._intr=true};
    V.killSrcs();await new Promise(res=>{let t=V.ctx.currentTime+0.06;V.srcs=[];let last=null;
     for(const b of bs){if(!b){t+=GAP;continue}const s=V.ctx.createBufferSource();s.buffer=b;s.connect(V.out());s.start(t);t+=b.duration;V.srcs.push(s);last=s}
     {const ms=(t-V.ctx.currentTime)*1000;if(V._sp)V._sp.est=Date.now()+ms;V._armTail(ms)}
     V._seqDone=res;const fin=kill=>{if(V._seqDone===res){V._seqDone=null;if(kill)V.killSrcs();else V.srcs=[];res()}};if(last)last.onended=()=>fin(false);setTimeout(()=>fin(true),(t-V.ctx.currentTime)*1000+800)});
    // przerwane przez system (fokus audio) – wznów kontekst i odtwórz zdanie jeszcze raz (raz), nigdy nie ucinaj
    if(V._intr&&!V._cut&&!retry&&V.ctx.state!=='closed'){V.killSrcs();V.stats.replays=(V.stats.replays||0)+1;await TO(V.ctx.resume(),800);return V._seq(list,true)}return}
   catch(e){V.stats.fallback++}}
  for(const f of list){if(V._cut)return;if(f)await V._clip(f);else await new Promise(r=>setTimeout(r,GAP*1000))}},
 _clip(f){return new Promise(res=>{const a=V.audio;let done=false;const fin=()=>{if(!done){done=true;res()}};a.onended=fin;a.onerror=fin;try{a.volume=Math.min(1,V.vol||1)}catch(e){}a.src=V.dir()+f;a.play().catch(fin);setTimeout(fin,15000)})},
 async _tts(t){V.stats.tts++;t=V.genderize(t);if(root.RKO&&root.RKO.sayify)t=root.RKO.sayify(t);const T=plug('TextToSpeech');if(T){const vi=await V._ttsPick(T);const o={text:t,lang:'pl-PL',rate:0.92,pitch:V.voice==='m'?0.9:0.95,volume:Math.min(1,V.vol||1),category:'playback'};if(vi!=null)o.voice=vi;return TO(T.speak(o),Math.max(4000,t.length*120))}
  if(!root.speechSynthesis)return;return new Promise(res=>{const u=new SpeechSynthesisUtterance(t);u.lang='pl-PL';u.rate=.92;u.volume=Math.min(1,V.vol||1);const vs=speechSynthesis.getVoices().filter(v=>/^pl/i.test(v.lang));const re=V.voice==='m'?/marek|male|mężczyzna|krzysztof|adam|jacek|bmg|jmk/i:/zofia|female|kobieta|paulina|ewa|agnieszka|afb|oda|zfg/i;u.voice=vs.find(v=>re.test(v.name))||vs[0]||null;u.onend=res;u.onerror=res;speechSynthesis.speak(u);setTimeout(res,12000)})},
 // v2.1.0: TTS systemowy (zapas, gdy brak nagrania) – głos polski wg wybranej płci lektora, jeśli telefon go ma
 async _ttsPick(T){if(V._ttsVoice!==undefined)return V._ttsVoice;V._ttsVoice=null;try{if(T.getSupportedVoices){const r=await TO(T.getSupportedVoices(),1500);const L=(r&&r.voices)||[];const re=V.voice==='m'?/bmg|jmk|male|marek/i:/afb|oda|zfg|female|zofia/i;let i=L.findIndex(v=>/^pl/i.test(v.lang||'')&&re.test((v.voiceURI||'')+' '+(v.name||'')));if(i>=0)V._ttsVoice=i}}catch(e){}return V._ttsVoice},
 alarm(){try{const c=V.ctx||(V.ctx=new (root.AudioContext||root.webkitAudioContext)());for(let i=0;i<3;i++){const o=c.createOscillator(),g=c.createGain();o.type='square';o.frequency.value=880;g.gain.value=.25;o.connect(g);g.connect(c.destination);o.start(c.currentTime+i*.35);o.stop(c.currentTime+i*.35+.2)}}catch(e){}if(navigator.vibrate)navigator.vibrate([300,100,300])}};
// ---- rozpoznawanie mowy (v1.7) ----
const ERR={1:'przekroczony czas sieci',2:'błąd sieci',3:'błąd nagrywania dźwięku',4:'błąd serwera rozpoznawania',5:'błąd klienta',6:'cisza',7:'brak dopasowania',8:'rozpoznawanie zajęte',9:'brak uprawnienia do mikrofonu',10:'zbyt wiele żądań',11:'serwer rozłączony',12:'język polski nieobsługiwany przez usługę mowy – ustaw Google jako usługę mowy',13:'język polski niedostępny – pobierz pakiet polski w ustawieniach mowy Google',
 'no-speech':'cisza','aborted':'przerwane','audio-capture':'brak mikrofonu','network':'błąd sieci (Chrome wymaga internetu)','not-allowed':'brak uprawnienia do mikrofonu','service-not-allowed':'usługa niedostępna','language-not-supported':'język nieobsługiwany','NOT_AVAILABLE':'brak usługi mowy (zainstaluj/włącz Google – usługa mowy)','-1':'błąd startu rozpoznawania'};
const QUIET_ERR=[6,7,'no-speech','aborted'];
const S={running:false,onResult:()=>{},onHeard:()=>{},onState:()=>{},onLog:()=>{},status:'off',barge:'min',fails:0,log:[],errors:{},
 classify(alts){return root.RKO?root.RKO.interpret(alts):{cmd:null}},
 listenWhileSpeaking(){return false},
 paused:false,windowMode:true,WINDOW:8000,RESUME_MS:80,PARTIAL_MS:150,WATCH_MS:12000,READY_FB_MS:900,NOREADY_MS:4000,STUCK_P_MS:1500,_lastEv:0,_armT:0,_readyT:0,
 // v2.0.0: ustawienia – mikrofon w trakcie krótkich pytań; otwarte pytanie tak/nie (ustawia ui.js)
 liveAsk:true,liveMode:'all',offline:false,nativeV:0,liveNow:false,questionOpen(){return false},liveAllowed(){return true},
 liveOk(queue){if(!S.liveAsk||!S.running||S.pttOn||S.windowMode||!queue||!queue.length||!root.RKO)return false;if(S.paused&&!S.liveMode)return false;
  if(S.liveMode==='all')return !S.paused;if(S.paused)return false;if(S.liveMode==='ask'&&queue.every(it=>it.kind==='ask'||it.kind==='remind'||it.kind==='ack'||S.safeText(it.text)))return true;if(!S.liveAllowed())return false;
  return queue.every(it=>S.safeText(it.text))},
 // usuń z początku wypowiedzi słowa lektora (echo pytania), np. „hipoksja tak” → „tak”
 stripEcho(a){const R=root.RKO;const n=R.norm(a);const L=new Set(R.norm((V.current||'')+' '+(V.lastText||'')).split(' ').filter(Boolean));const w=n.split(' ');let i=0;while(i<w.length-1&&L.has(w[i]))i++;return w.slice(i).join(' ')},
 safeText(t){const R=root.RKO;const n=R.norm(String(t||''));if(!n||n.length>48)return false;const w=n.split(' ');
  if(w.some(x=>/^(tak|nie|jest|brak|ta|tag|dak|niet|nia|stop|dalej|zakoncz|podano|wyladowan\w*|adrenalin\w*|amiodaron\w*|tetno|rosc|zatrzymanie|pauza)$/.test(x)))return false;
  return !R.interpret([t]).cmd&&!w.some(x=>R.interpret([x]).cmd)},
 // gotowość: zielony tylko gdy rozpoznawacz zgłosił gotowość po ostatnim (re)starcie
 // v2.1.1 (t95u): brak zdarzenia „ready” po (re)starcie NIE blokuje mikrofonu – po READY_FB_MS sesja traktowana jako aktywna
 ready(){const a=S._armT||0;if(S.mode==='web'){if(!S.webOn)return false;return (S._readyT||0)>=a||Date.now()-a>S.READY_FB_MS}if(!S.running||S.paused)return false;return (S._readyT||0)>=a||Date.now()-a>S.READY_FB_MS},
 // krótkie tak/nie – wykonaj od razu z wyniku pośredniego, gdy pytanie otwarte (bez czekania na wynik końcowy)
 QUICK:/^(no )?(tak|nie|tak tak|nie nie|tak jest|nie ma|potwierdzam|negatywnie|obecna|nieobecna|obecny|nieobecny)$/,
 // v2.1.0: filtr echa lektora – z wypowiedzi usuwane są słowa, które lektor mówił w czasie tej sesji rozpoznawania (każde tyle razy, ile wystąpiło)
 // v2.1.0: echo = słowa lektora wypowiedziane NAJWYŻEJ ok. 0,6 s przed początkiem wypowiedzi (czas każdego słowa szacowany z czasu komunikatu).
 // Słowa po „Powiedz:”/„Potwierdź:” i opcje pytań wyboru („A czy B?”) (np. „tak”, „wyładowano”) to oczekiwana ODPOWIEDŹ – usuwane tylko wtedy, gdy w wyniku jest też „powiedz”, „potwierdź” albo „czy” (prawdziwe echo).
 echoBag(now){now=now||Date.now();const R=root.RKO;const bag=new Map(),cue=new Map();let from=S._beginT?S._beginT-600:(S.mode==='native'?(S._sessT||0):now-8000);from=Math.max(from,(S._sessT||0)-150);
  for(const e of V.spoken){const end=e.t1||e.est||now;if(end<from)continue;
   // słowa z flagą „odpowiedź”: po „Powiedz:”/„Potwierdź:” oraz opcje pytania wyboru („A czy B?”, „a, b czy c?”)
   const w=[];String(e.text).split(/(?<=[.?!])\s+/).forEach(sen=>{const t=R.norm(sen).split(' ').filter(Boolean);const ch=/\?\s*$/.test(sen)&&t.indexOf('czy')>0;let c=false;
    t.forEach(x=>{if(x==='powiedz'||x==='potwierdz'){c=true;w.push([x,false]);return}w.push([x,(c||ch)&&x!=='czy'])})});
   const n=w.length;w.forEach(([x,isCue],i)=>{const we=e.t0+(end-e.t0)*((i+1)/n);if(we<from)return;const m=isCue?cue:bag;m.set(x,(m.get(x)||0)+1)})}
  bag.cue=cue;return bag},
 // echo tylko, gdy wypowiedź ZACZĘŁA SIĘ w trakcie lektora (onBeginningOfSpeech przed końcem komunikatu); wtedy usuwane są początkowe słowa lektora
 overlap(now){now=now||Date.now();if(S._beginT)return V.speaking||S._beginT<(V.endedAt||0)+150;return V.speaking||now-(V.endedAt||0)<700},
 clean(alts){const R=root.RKO;if(!R||!alts||!alts.length)return alts;if(alts.some(a=>{const c=R.interpret([a]).cmd;return c==='abort'||c==='intub'}))return alts;const now=Date.now();if(!S.overlap(now))return alts;const bag=S.echoBag(now);if(!bag.size&&!bag.cue.size)return alts;
  // każde słowo wypowiedzi, które (dokładnie albo z 1 literą różnicy) lektor mówił w tej sesji, jest usuwane – zostaje tylko to, co dodał użytkownik
  const near=(x,b)=>{if(b.get(x)>0)return x;if(x.length<4)return null;for(const[k,n]of b)if(n>0&&k.length>=4&&Math.abs(k.length-x.length)<=1&&R.lev(k,x)<=1)return k;return null};
  const out=[];for(const a of alts){const b=new Map(bag),tk=R.norm(a).split(' ').filter(Boolean);if(tk.some(x=>x==='powiedz'||x==='potwierdz'||x==='czy'||(x.length>=6&&(R.lev(x,'powiedz')<=1||R.lev(x,'potwierdz')<=1))))for(const[k,n]of bag.cue)b.set(k,(b.get(k)||0)+n);const rest=tk.join(' ').split(' ').filter(Boolean).filter(x=>{const k=near(x,b);if(k){b.set(k,b.get(k)-1);return false}return true}).join(' ');if(rest&&!out.includes(rest))out.push(rest)}
  if(out.join('|')!==alts.map(a=>R.norm(a)).join('|'))S.addLog('echo','usunięto słowa lektora: „'+alts[0]+'” → „'+(out[0]||'')+'”');return out},
 // wczesny start / odświeżenie sesji przed końcem komunikatu
 prearm(why){if(!S.running||S.pttOn)return;S._armT=Date.now();S._lastEv=Date.now();S.addLog('info','mikrofon: nowa sesja przed końcem ('+(why||'')+')');
  if(S.mode==='native'){const N=plug('RkoNative');S.paused=false;if(N&&N.srResume)N.srResume().catch(()=>{})}
  else if(S.mode==='web'&&S.web){S.paused=false;try{S.web.abort()}catch(e){}setTimeout(()=>{if(!S.running||S.paused)return;try{S.web.start();S.webOn=true}catch(e){}},60)}
  try{S.onState(S.status)}catch(e){}},
 _flush(why){const p=S._pend;if(p&&!S._sent){clearTimeout(S._pt);S._pend=null;S._sent=p.cmd;S.addLog('pośredni→wykonano',p.alts[0],{alts:p.alts,why});S.emit(p.alts,null,'partial');return true}return false},

 // v1.9: okno odpowiedzi – mikrofon włączony tylko ~8 s po pytaniu lektora, potem pauza (oszczędza baterię, brak fałszywych komend)
 openWindow(ms){if(!S.running)return;S.resumeSoon();clearTimeout(S._wt);S.winUntil=Date.now()+(ms||S.WINDOW);S._wt=setTimeout(S.closeWindow,(ms||S.WINDOW)+250)},
 closeWindow(){clearTimeout(S._wt);if(S.pttOn)return;if(!S.running||!S.windowMode)return;if(M.userOn&&Date.now()-M.userT<6000){S._wt=setTimeout(S.closeWindow,1500);return}S.winUntil=0;if(!V.speaking)S.pause().catch(()=>{});S.set('mikrofon czeka na pytanie')},
 // v1.9.6: metronom milknie, gdy mikrofon naprawdę słucha w oknie odpowiedzi
 listening(){return S.running&&!S.paused&&S.windowMode&&Date.now()<(S.winUntil||0)},
 inWindow(){return !S.windowMode||Date.now()<(S.winUntil||0)},
 async pause(){S.paused=true;S._pauseT=Date.now();clearTimeout(S._rt);const soft=S.mode==='native'&&S.nativeV>=210;S._softP=soft;if(!soft)S._sess();if(S.mode==='native'){const N=plug('RkoNative');if(N&&N.srPause)await N.srPause({soft})}else if(S.mode==='web'&&S.web){try{S.web.abort()}catch(e){}}},
 resumeSoon(){clearTimeout(S._rt);if(!S.running)return;S._rt=setTimeout(()=>{if(!S.running||V.speaking)return;S.paused=false;S._lastEv=Date.now();
  if(S.mode==='native'){S._armT=Date.now();const N=plug('RkoNative');if(N&&N.srResume)N.srResume().catch(()=>{})}else if(S.mode==='web'&&S.web&&!S.webOn){S._armT=Date.now();try{S.web.start();S.webOn=true}catch(e){}}},S.RESUME_MS)},
 addLog(src,text,extra){const e=Object.assign({t:Date.now(),src,text:text==null?'':String(text)},extra||{});S.log.push(e);if(S.log.length>500)S.log.splice(0,S.log.length-500);try{S.onLog(e)}catch(x){}return e},
 mark(verdict){for(let i=S.log.length-1;i>=0;i--){const e=S.log[i];if(e.src==='final'||e.src==='pośredni→wykonano'||e.src==='przycisk'){if(!e.verdict){e.verdict=verdict;try{S.onLog(e)}catch(x){}}return}}},
 logText(){const p=n=>String(n).padStart(2,'0');return S.log.map(e=>{const d=new Date(e.t);return p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds())+'.'+String(d.getMilliseconds()).padStart(3,'0')+' '+e.src+': '+e.text+(e.alts&&e.alts.length>1?' | alternatywy: '+e.alts.slice(1).join(' / '):'')+(e.conf!=null?' | pewność '+(+e.conf).toFixed(2):'')+(e.verdict?' → '+e.verdict:'')}).join('\n')},
 async start(){if(S.running)return;S.running=true;S.paused=false;S._lastEv=Date.now();const N=plug('RkoNative');if(N&&N.muteBeep)N.muteBeep({on:true}).catch(()=>{});const SR=plug('SpeechRecognition');
  if(isNative){if(SR){try{const p=await SR.checkPermissions();if(p.speechRecognition!=='granted'){const q=await SR.requestPermissions();if(q.speechRecognition!=='granted'){S.set('mikrofon: brak uprawnienia – użyj przycisków');S.addLog('błąd','brak uprawnienia do mikrofonu');S.running=false;return}}}catch(e){S.addLog('info','uprawnienia: '+(e&&e.message))}}
   while(S.running&&V.speaking){S.set('czekam, lektor mówi');await new Promise(r=>setTimeout(r,100))}if(!S.running)return;
   if(N&&N.srStart){if(!S._lis){S._lis=true;try{N.addListener('sr',ev=>S._ev(ev))}catch(e){}}try{await Promise.race([S.opts(),new Promise(r=>setTimeout(r,1800))])}catch(e){S.addLog('info','opcje rozpoznawacza: '+(e&&e.message||e))}try{await N.srStart({language:'pl-PL'});S.mode='native';S.addLog('info','start rozpoznawania (natywne, pl-PL, '+(S.offline&&S.nativeV>=210?'offline na telefonie':'online')+')');S.set('słucham');if(S.windowMode)S.openWindow()}catch(e){S.set('mikrofon: rozpoznawanie niedostępne ('+(e&&e.message||e)+') – użyj przycisków');S.addLog('błąd','srStart: '+(e&&e.message||e));S.running=false}return}
   if(SR){S.mode='plugin';S._plugin(SR);return}}
  while(S.running&&V.speaking)await new Promise(r=>setTimeout(r,100));
  const W=root.SpeechRecognition||root.webkitSpeechRecognition;if(!W){S.set('brak rozpoznawania mowy – użyj przycisków');S.running=false;return}
  const r=new W();r.lang='pl-PL';r.continuous=true;r.interimResults=true;r.maxAlternatives=5;S.web=r;S.mode='web';
  r.onresult=e=>{for(let i=e.resultIndex;i<e.results.length;i++){const res=e.results[i];const alts=[...res].map(a=>a.transcript);
   if(res.isFinal)S._final(alts,res[0]&&res[0].confidence);else S._partial(alts)}};
  r.onstart=()=>{S.webOn=true;S._ev({type:'ready'})};r.onaudiostart=()=>{S._lastEv=Date.now()};r.onspeechstart=()=>S._ev({type:'begin'});r.onspeechend=()=>S._ev({type:'end'});
  r.onend=()=>{S.webOn=false;S._flush('koniec sesji');S._sess();if(S.running)setTimeout(()=>{if(S.running&&!S.webOn&&!S.paused&&(!V.speaking||S.liveNow))try{S.web.start();S.webOn=true}catch(e){}},50)};
  r.onerror=e=>{S._err(e.error);if(['not-allowed','service-not-allowed','audio-capture','language-not-supported'].includes(e.error)){S.running=false;try{r.abort()}catch(x){}}};
  try{r.start();S.webOn=true;S.set('słucham');if(S.windowMode)S.openWindow()}catch(e){S.set('mikrofon niedostępny')}},
 // v2.1.0: opcje natywnego rozpoznawacza (łatka 2.1.0): tryb offline na telefonie, progi ciszy
 SIL:800,POS:600,
 async opts(){const N=plug('RkoNative');if(!N||!N.srOpt)return;try{const r=await TO(N.srOpt({offline:!!S.offline,sil:S.SIL,pos:S.POS}),1500);if(r&&r.v)S.nativeV=r.v;try{S.onNative&&S.onNative(S.nativeV)}catch(e){}S.addLog('info','rozpoznawacz natywny v'+(S.nativeV||'?')+(S.offline?' – offline':''))}catch(e){S.nativeV=0}},
 offFail(code){if(!S.offline)return false;S.offline=false;S.addLog('info','offline niedostępny (błąd '+code+') – przełączam na rozpoznawanie online');try{S.onOffline&&S.onOffline(false)}catch(e){}
  S.opts().then(()=>S.kick('offline → online'));return true},
 _sess(){clearTimeout(S._pt);S._pend=null;S._sent=null;S._lastPartial=''},
 _ev(ev){if(!ev)return;S._lastEv=Date.now();if(ev.type!=='error'){S._lastEv0=S._lastEv;S._nrK=0;if(ev.type==='partial'||ev.type==='final')S._readyT=Math.max(S._readyT||0,S._lastEv)}if(ev.type==='ready'){S._readyT=Date.now();S._sessT=S._readyT;S._beginT=0}switch(ev.type){
  case 'ready':if(!S.running)break;S._flush('nowa sesja');S._sess();if(!/^mikrofon: błąd (12|13|9)/.test(S.status)||Date.now()-(S._errT||0)>15000)S.set(V.speaking?'słucham (lektor mówi)':'słucham');break;
  case 'begin':S._readyT=Math.max(S._readyT||0,Date.now());if(!S._beginT)S._beginT=Date.now();M.userSpeaking(true);break;
  case 'end':M.userSpeaking(false,300);break;
  case 'partial':S._partial(ev.matches||[]);break;
  case 'final':M.userSpeaking(false,300);S._final(ev.matches||[],ev.conf);S._armT=Date.now();S._softEnd();break;
  case 'error':M.userSpeaking(false,0);S._err(ev.code,ev.msg);S._armT=Date.now();S._softEnd();break}},
 // v2.1.0: po „miękkiej” pauzie (stopListening – dokończenie rozpoczętej wypowiedzi) natywny kod sam wznawia nasłuch; gdy mikrofon nadal ma być wstrzymany – zatrzymaj (cancel)
 _softEnd(){if(!S._softP)return;S._softP=false;if(!S.paused||S.mode!=='native')return;const N=plug('RkoNative');if(N&&N.srPause)N.srPause({soft:false}).catch(()=>{})},
 _err(code,msg){if(!S.pttOn)S._flush('błąd '+code);S._sess();if(S.pttOn&&S._pttErr(code,msg))return;S.errors[code]=(S.errors[code]||0)+1;const txt=ERR[code]||('błąd '+code+(msg?' '+msg:''));
  if(QUIET_ERR.includes(code)){S.addLog('błąd '+code,txt,{quiet:true});return}
  if(S.offline&&[12,13,5,2,1,4,11].includes(code)&&!S._gotRes){S.addLog('błąd '+code,txt);S.offFail(code);return}
  S.fails++;S._errT=Date.now();S.addLog('błąd '+code,txt);S.set('mikrofon: błąd '+code+' – '+txt);
  if(!['not-allowed','service-not-allowed','audio-capture','language-not-supported',9,12,13].includes(code)){const t=S._errT;clearTimeout(S._ert);S._ert=setTimeout(()=>{if((S._readyT||0)<t)S.kick('po błędzie '+code)},1500)}},
 // v1.9.9: restart rozpoznawacza (zawieszony / po błędzie) – natychmiast, bez narastających przerw
 async kick(why){if(!S.running||S.paused||S.pttOn||(V.speaking&&!S.liveNow)||S._kicking)return;S._kicking=true;S._lastEv=Date.now();S._armT=Date.now();S.addLog('restart',why||'');try{const N=plug('RkoNative');
   if(S.mode==='native'&&N&&N.srRestart){await TO(N.srRestart({language:'pl-PL'}),3000)}else if(S.mode==='web'&&S.web){try{S.web.abort()}catch(e){}await new Promise(r=>setTimeout(r,60));if(!S.webOn){try{S.web.start();S.webOn=true}catch(e){}}}}catch(e){S.addLog('błąd','restart: '+(e&&e.message||e))}finally{S._kicking=false}},
 watch(){if(!S.running||S.pttOn)return;const now=Date.now();
  // v2.1.1 (t95u): strażnik – mikrofon nie może zostać trwale wstrzymany po komunikacie lektora
  if(S.paused&&!V.speaking&&!V.queue.length&&!S.windowMode&&now-(V.endedAt||0)>S.STUCK_P_MS&&now-(S._pauseT||0)>S.STUCK_P_MS){S.addLog('info','strażnik: mikrofon był wstrzymany po lektorze – wznawiam');S.resumeSoon();return}
  if(S.paused||V.speaking||!S.inWindow())return;
  // v2.1.1: brak „ready/begin/wyniku” po (re)starcie natywnym przez NOREADY_MS → ponowny start sesji (maks. 2 z rzędu)
  if(S.mode==='native'&&(S._armT||0)>(S._readyT||0)&&(S._armT||0)>(S._lastEv0||0)&&now-(S._armT||0)>S.NOREADY_MS&&now-(S._kickT||0)>S.NOREADY_MS&&(S._nrK||0)<2){S._kickT=now;S._nrK=(S._nrK||0)+1;S.kick('brak gotowości rozpoznawacza '+Math.round(S.NOREADY_MS/1000)+' s');return}if(S.mode==='web'){if(!S.webOn&&Date.now()-(S._lastEv||0)>1500)S.kick('nasłuch nieaktywny');else if(S.webOn&&Date.now()-(S._lastEv||0)>10000){S.webOn=false;S.kick('brak zdarzeń 10 s')}return}if(Date.now()-(S._lastEv||0)>S.WATCH_MS)S.kick('brak zdarzeń '+Math.round(S.WATCH_MS/1000)+' s')},
 // wynik pośredni: wykonaj, gdy jednoznacznie pasuje (nie słaby/rozmyty) i utrzyma się 400 ms bez zmiany
 _partial(alts){alts=(alts||[]).filter(Boolean);if(!alts.length)return;if(S.pttOn){const o=S._pttO;S.addLog('PTT pośredni',alts[0]);try{o.ui('… '+alts[0])}catch(e){}if(o.match&&o.match(alts))S.pttEnd(alts,'partial');return}try{S.onHeard('… '+alts[0])}catch(e){}
  if(alts[0]!==S._lastPartial){S._lastPartial=alts[0];S.addLog('pośredni',alts[0])}
  if(S._sent)return;alts=S.clean(alts);if(!alts.length)return;const c=S.classify(alts)||{};clearTimeout(S._pt);S._pend=null;
  if(c.cmd&&c.cmd!=='number'&&!c.weak&&!c.fuzzy){
   // „ta”, „tag”, „dak”, „jest”, „brak” – tylko z wyniku końcowego (mogą być początkiem dłuższego słowa)
   const R=root.RKO,yn=c.cmd==='yes'||c.cmd==='no',quick=yn&&R&&alts.some(a=>S.QUICK.test(R.norm(a))||S.QUICK.test(S.stripEcho(a)));if(yn&&!quick)return;
   S._pend={alts,cmd:c.cmd};if(c.cmd==='abort'||c.cmd==='intub'||(quick&&S.questionOpen())){S._flush(c.cmd==='abort'||c.cmd==='intub'?'komenda globalna – od razu':'tak/nie – od razu');return}
   S._pt=setTimeout(()=>{const p=S._pend;if(!p||S._sent)return;S._sent=p.cmd;S.addLog('pośredni→wykonano',p.alts[0],{alts:p.alts});S.emit(p.alts,null,'partial')},S.PARTIAL_MS)}},
 _final(alts,conf){alts=(alts||[]).filter(Boolean);if(alts.length)S._gotRes=true;clearTimeout(S._pt);if(S.pttOn){S.addLog('PTT final',alts[0]||'(pusto)',{alts});if(alts.length)S.pttEnd(alts,'final');return}const sent=S._sent,pend=S._pend;S._pend=null;
  if(!alts.length){if(pend&&!sent){S._pend=pend;S._flush('pusty wynik końcowy')}S._sess();return}
  if(sent){const c=S.classify(alts)||{};S._sess();S.addLog('final',alts[0],{alts,conf,verdict:c.cmd===sent?'duplikat – wykonano już z wyniku pośredniego':'po wyniku pośrednim – pominięto'});return}
  // v2.0.0: wynik końcowy + alternatywy z ostatniego wyniku pośredniego (krótkie słowo bywa tylko w pośrednim)
  const all=pend?alts.concat(pend.alts.filter(a=>!alts.includes(a))):alts;S._sess();S.fails=0;S.addLog('final',alts[0],{alts:all,conf});S.emit(all,conf,'final')},
 emit(alts,conf,src){if(!alts||!alts.length)return;
  // v2.0.0: echo pytania + odpowiedź w jednym wyniku („hipotermia lub hipertermia tak”) → sama odpowiedź
  if(root.RKO&&src!=='partial'){const orig=alts;alts=S.clean(alts);if(!alts.length){S.addLog('final',orig[0],{alts:orig,verdict:'echo lektora – pominięto'});return}}
  // v1.8: nic z mikrofonu nie przerywa lektora – wynik w trakcie mowy (spóźniony) jest pomijany
  if((V.speaking||S.paused)&&root.RKO&&root.RKO.echoOf(alts[0],V.current||V.lastText||'')){S.mark('echo lektora – pominięto');return}
  try{S.onHeard(alts[0])}catch(e){}
  if(root.RKO&&/^((tik|tyk|klik|puk|tuk|tup)\s*)+$/.test(root.RKO.norm(alts[0]))&&root.Metro&&root.Metro.want){S.mark('kliknięcie metronomu – pominięto');return}
  // echo tuż po końcu mowy lektora: tylko niemal dokładna kopia zdania
  const now=Date.now();if(!V.speaking&&now-V.endedAt<300&&root.RKO&&root.RKO.echoOf(alts[0],V.lastText||'')){S.mark('echo lektora – pominięto');return}
  S.onResult(alts,conf,src)},
 set(st){S.status=st;S.onState(st)},
 // ===== v1.9.6: przycisk mikrofonu (naciśnij i mów) =====
 // metronom (natywny i WebAudio) i lektor zatrzymane → 300 ms → rozpoznawacz od zera → wynik pośredni/końcowy albo limit czasu → wszystko wraca
 pttOn:false,
 async ptt(o){if(S.pttOn)return;S.pttOn=true;S._pttO=o;S._pttRetry=false;M.hold=true;M.cut();V.hold=true;V.stop();S._sess();clearTimeout(S._rt);clearTimeout(S._wt);
  S.addLog('PTT','naciśnięto – metronom i lektor zatrzymane');o.ui('przygotowuję mikrofon…');await new Promise(r=>setTimeout(r,300));if(!S.pttOn)return;
  S.paused=false;S.winUntil=Date.now()+o.ms+1000;const ok=await S._pttStart();if(!S.pttOn)return;
  if(ok){o.ui('słucham… powiedz komendę');S.addLog('PTT','słucham')}
  clearTimeout(S._pttT);S._pttT=setTimeout(()=>S.pttEnd(null,'nie rozpoznano – cisza przez '+Math.round(o.ms/1000)+' s'),o.ms)},
 async _pttStart(){const N=plug('RkoNative');
  if(isNative&&N&&N.srRestart){if(!S._lis){S._lis=true;try{N.addListener('sr',ev=>S._ev(ev))}catch(e){}}
   for(let k=0;k<2;k++){try{await TO(N.srRestart({language:'pl-PL'}),3000);S.mode='native';S.running=true;return true}catch(e){const m=String(e&&e.message||e);S.addLog('błąd','PTT srRestart: '+m);
     if(k===0){S._pttO.ui('błąd: '+(ERR[m]||m)+' – ponawiam…');await new Promise(r=>setTimeout(r,500))}else{S.pttEnd(null,'błąd: '+(ERR[m]||m));return false}}}}
  // przeglądarka / PWA
  if(!S.running){await S.start();return S.running}if(S.mode==='web'&&S.web&&!S.webOn){try{S.web.start();S.webOn=true}catch(e){}}return true},
 _pttErr(code,msg){const txt=ERR[code]||('błąd '+code+(msg?' '+msg:''));S.errors[code]=(S.errors[code]||0)+1;S.addLog('PTT błąd '+code,txt);
  if(QUIET_ERR.includes(code)){try{S._pttO.ui('('+txt+') – mów dalej…')}catch(e){}return true}
  if(code===9||code==='not-allowed'){S.pttEnd(null,'błąd 9: brak uprawnienia do mikrofonu');return true}
  if(!S._pttRetry){S._pttRetry=true;try{S._pttO.ui('błąd '+code+': '+txt+' – ponawiam…')}catch(e){}setTimeout(()=>{if(S.pttOn)S._pttStart()},400);return true}
  S.pttEnd(null,'błąd '+code+': '+txt);return true},
 pttEnd(alts,why){if(!S.pttOn)return;S.pttOn=false;clearTimeout(S._pttT);const o=S._pttO;S._pttO=null;S.winUntil=0;
  if(S.windowMode)S.pause().catch(()=>{});M.hold=false;V.hold=false;S.addLog('PTT','koniec: '+(alts?alts[0]:why));
  try{o.done(alts,why)}catch(e){}if(V.queue.length&&!V.speaking)V._run()},
 // awaryjnie: wtyczka community (bez trybu offline), restart natychmiast, bez narastających przerw
 async _plugin(SR){while(S.running){S.set(V.speaking?'słucham (lektor mówi)':'słucham');
   try{const r=await SR.start({language:'pl-PL',maxResults:5,partialResults:false,popup:false});if(r&&r.matches&&r.matches.length)S._final(r.matches,null);else S._err(7)}
   catch(e){S._err(String(e&&e.message||e))}await new Promise(r=>setTimeout(r,60))}},
 async info(){const N=plug('RkoNative');if(N&&N.srInfo){try{return await N.srInfo()}catch(e){return {error:String(e&&e.message||e)}}}return {web:!!(root.SpeechRecognition||root.webkitSpeechRecognition)}},
 stop(){S.running=false;S.paused=false;clearTimeout(S._wt);S.winUntil=0;S._sess();const N=plug('RkoNative');if(N&&N.muteBeep)N.muteBeep({on:false}).catch(()=>{});if(N&&N.srStop)N.srStop().catch(()=>{});const SR=plug('SpeechRecognition');if(SR&&S.mode==='plugin')SR.stop().catch(()=>{});if(S.web)try{S.web.abort()}catch(e){}S.set('off')}};
// ---- metronom uciśnięć (WebAudio, planowany z wyprzedzeniem – bez przerw); milknie, gdy mówi lektor ----
const M={want:false,rate:110,vol:0.15,next:0,nodes:[],timer:null,clicks:0,duckUntil:0,userOn:false,userT:0,USER_CAP:4000,
 duck(ms){M.duckUntil=Math.max(M.duckUntil,Date.now()+ms)},
 // v2.0.0: ciszej metronom w trakcie oczekiwania na odpowiedź tak/nie ('quiet' ×0,3, 'mute', 'normal')
 askMode:'quiet',askUntil:0,askQuiet(ms){M.askUntil=Math.max(M.askUntil,Date.now()+ms)},askEnd(){M.askUntil=0},
 asking(){return M.askMode!=='normal'&&Date.now()<M.askUntil},
 effVol(){const v=M.vol||0.15;return M.asking()&&M.askMode==='quiet'?Math.max(0.02,v*0.3):v},
 userSpeaking(on,after){const n=Date.now();if(on){M.userOn=true;M.userT=n}else{M.userOn=false;if(after)M.duck(after)}},
 hold:false,
 ducked(){const n=Date.now();return M.hold||S.pttOn||S.listening()||n<M.duckUntil||(M.userOn&&n-M.userT<M.USER_CAP)},
 start(){if(!M.timer)M.timer=setInterval(M.tick,25)},
 active(){return M.want&&!V.speaking&&!M.ducked()&&!(M.asking()&&M.askMode==='mute')&&V.ctx&&V.ctx.state==='running'},
 useNative:false,
 nat(){return M.useNative&&isNative&&plug('RkoNative')&&plug('RkoNative').metro?plug('RkoNative'):null},
 natSync(){const N=M.nat();const on=!!(M.want&&!V.speaking&&!M.ducked()&&!(M.asking()&&M.askMode==='mute'));const ev=M.effVol();const st=on+'|'+M.rate+'|'+ev;if(st===M._ns)return;M._ns=st;N.metro({on,rate:Math.max(100,Math.min(120,M.rate||110)),vol:Math.max(0.02,Math.min(1,ev))}).catch(()=>{M._ns=null})},
 tick(){if(M.nat()){M.natSync();return}const c=V.ctx;if(M.want&&c&&c.state!=='running'&&c.state!=='closed'&&!V.speaking&&Date.now()-(M._rs||0)>500){M._rs=Date.now();try{c.resume()}catch(e){}}if(!M.active()){if(M.nodes.length)M.cut();M.next=0;return}const per=60/Math.max(100,Math.min(120,M.rate||110));
  if(M.next<c.currentTime+0.01)M.next=c.currentTime+0.06;while(M.next<c.currentTime+0.15){M.click(M.next);M.next+=per}
  M.nodes=M.nodes.filter(n=>n.t>c.currentTime-0.1)},
 click(t){const c=V.ctx;try{const o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.value=1250;const v=Math.max(0.02,Math.min(1,M.effVol()));
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(v,t+0.003);g.gain.exponentialRampToValueAtTime(0.0001,t+0.035);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+0.04);M.nodes.push({o,t});M.clicks++}catch(e){}},
 cut(){if(M.nat()){M.natSync()}M.nodes.forEach(n=>{try{n.o.stop()}catch(e){}});M.nodes=[];M.next=0}};
V.hooks=[];V.onState=sp=>{if(sp===false)V.lastText=V._lt;if(sp)M.cut();V.hooks.forEach(h=>{try{h(sp)}catch(e){}})};
const _say=V.say;V.say=(t,k)=>{V._lt=(V._lt&&V.speaking?V._lt+' ':'')+t;_say(t,k)};
root.Voice=V;root.Metro=M;root.Ears=S;root.isNative=isNative;root.plug=plug;
})(this);
