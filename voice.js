/* v1.9: mikrofon tylko w oknie odpowiedzi ~8 s po pytaniu (przyciski są główne); metronom natywny w usłudze pierwszoplanowej, gdy dostępny.
   Lektor v1.5.1: nagrania dekodowane do WebAudio i odtwarzane bez przerw; TTS tylko dla całych zdań bez nagrania.
   Rozpoznawanie mowy v1.7: trwały natywny rozpoznawacz (RkoNative.srStart, bez trybu offline), słucha także podczas lektora,
   wyniki pośrednie, natychmiastowy restart bez narastających przerw, kody błędów na ekranie, surowy log. */
(function(root){
const Cap=root.Capacitor,isNative=!!(Cap&&Cap.isNativePlatform&&Cap.isNativePlatform());
const plug=n=>isNative&&Cap.Plugins?Cap.Plugins[n]:null;
const PREFIX=['Zmniejszam. Ustaw pompę','Zwiększam. Ustaw pompę','Utrzymaj. Pompa','Ustaw pompę','Średnie ciśnienie wynosi','Zapisano:'];
const GAP=0.12,CACHE_MAX=220;
function key(t){return String(t).trim()}
function sentences(t){return String(t).split(/(?<=[.?!])\s+/).filter(Boolean)}
const V={clips:{},speaking:false,queue:[],muted:false,audio:null,ctx:null,bufs:new Map(),srcs:[],current:'',startedAt:0,endedAt:0,stats:{tts:0,clips:0,fallback:0},
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
  const p=fetch('audio/'+f).then(r=>{if(!r.ok)throw new Error('404');return r.arrayBuffer()}).then(a=>new Promise((ok,ko)=>V.ctx.decodeAudioData(a,ok,ko)));
  V.bufs.set(f,p);p.catch(()=>V.bufs.delete(f));while(V.bufs.size>CACHE_MAX)V.bufs.delete(V.bufs.keys().next().value);return p},
 // plan: lista zdań; każde zdanie = jedno źródło (same nagrania albo cały TTS)
 plan(text){if(V.clips[key(text)])return [{clips:[V.clips[key(text)]]}];const out=[];for(const s of sentences(text)){if(V.clips[key(s)]){out.push({clips:[V.clips[key(s)]]});continue}
  let done=false;for(const p of PREFIX){if(s.startsWith(p+' ')){const rest=s.slice(p.length+1);if(V.clips[p]&&V.clips[key(rest)]){out.push({clips:[V.clips[p],V.clips[key(rest)]]});done=true;break}}}
  if(!done)out.push({tts:s})}
  // scal kolejne zdania z nagrań w jedną sekwencję (bez przerw między plikami)
  const m=[];for(const x of out){const l=m[m.length-1];if(x.clips&&l&&l.clips){l.clips.push(null,...x.clips)}else m.push(x.clips?{clips:x.clips.slice()}:x)}return m},
 say(text,kind){if(!text)return;
  // v1.9.1: bez dublowania – ten sam tekst już mówiony lub w kolejce nie jest dodawany drugi raz
  const core=t=>String(t).replace(/^Przypominam\.\s*/,'');if((V.speaking&&core(V.current)===core(text))||V.queue.some(q=>core(q.text)===core(text)))return;V.queue.push({text,kind});if(!V.speaking)V._run()},
 // v1.8: pomiń tylko nieaktualne pytanie/przypomnienie (po przyjętej komendzie); kolejka zostaje
 skipStale(old){if(!old)return false;const st=it=>(it.kind==='ask'||it.kind==='remind')&&String(it.text).endsWith(old);V.queue=V.queue.filter(it=>!st(it));
  if(V.speaking&&st({kind:V.kind,text:V.current})){V._cut=true;V.srcs.forEach(s=>{try{s.onended=null;s.stop()}catch(e){}});V.srcs=[];if(V._seqDone){const d=V._seqDone;V._seqDone=null;d()}try{V.audio.pause();V.audio.onended&&V.audio.onended()}catch(e){}const T=plug('TextToSpeech');if(T)T.stop().catch(()=>{});if(root.speechSynthesis)speechSynthesis.cancel();return true}return false},
 // v1.9.1: zatrzymaj WSZYSTKIE zaplanowane źródła – po wznowieniu kontekstu stare nie grają równolegle z powtórką
 killSrcs(){V.srcs.forEach(s=>{try{s.onended=null;s.stop()}catch(e){}});V.srcs=[]},
 stop(){V.queue=[];V._cut=true;V.srcs.forEach(s=>{try{s.onended=null;s.stop()}catch(e){}});V.srcs=[];if(V._seqDone){const d=V._seqDone;V._seqDone=null;d()}
  try{V.audio.pause();V.audio.onended&&V.audio.onended()}catch(e){}if(root.speechSynthesis)speechSynthesis.cancel();const T=plug('TextToSpeech');if(T)T.stop().catch(()=>{})},
 async _run(){V.speaking=true;V.startedAt=Date.now();V.onState(true);
  // v1.8: mikrofon pauzowany PRZED dźwiękiem lektora – rozpoznawacz nie zabiera fokusu audio i nie słyszy lektora
  try{if(S.running&&!S.paused){await Promise.race([S.pause(),new Promise(r=>setTimeout(r,400))]);await new Promise(r=>setTimeout(r,150))}}catch(e){}
  let asked=false;while(V.queue.length){const it=V.queue.shift();if(it.kind==='ask'||it.kind==='remind'||it.kind==='replay')asked=true;V.current=it.text;V.kind=it.kind;V._cut=false;for(const seg of V.plan(it.text)){if(V._cut)break;try{seg.clips?await V._seq(seg.clips):await V._tts(seg.tts)}catch(e){}}if(it.kind==='ask'||it.kind==='remind')M.duck(1500);V.hooks.forEach(h=>{try{h('clip')}catch(e){}})}
  V.current='';V.speaking=false;V.endedAt=Date.now();V.onState(false);if(!S.windowMode)S.resumeSoon();else if(asked)S.openWindow()},
 async _seq(list,retry){V.stats.clips+=list.length;if(V.startReady){const p=V.startReady;V.startReady=null;await Promise.race([p,new Promise(r=>setTimeout(r,1500))])}
  if(V.ctx){try{if(V.ctx.state!=='running')await V.ctx.resume();const bs=await Promise.all(list.map(f=>f?V.buf(f):null));if(V._cut)return;
    V._intr=false;V.ctx.onstatechange=()=>{if(V.ctx.state!=='running')V._intr=true};
    V.killSrcs();await new Promise(res=>{let t=V.ctx.currentTime+0.06;V.srcs=[];let last=null;
     for(const b of bs){if(!b){t+=GAP;continue}const s=V.ctx.createBufferSource();s.buffer=b;s.connect(V.ctx.destination);s.start(t);t+=b.duration;V.srcs.push(s);last=s}
     V._seqDone=res;const fin=kill=>{if(V._seqDone===res){V._seqDone=null;if(kill)V.killSrcs();else V.srcs=[];res()}};if(last)last.onended=()=>fin(false);setTimeout(()=>fin(true),(t-V.ctx.currentTime)*1000+800)});
    // przerwane przez system (fokus audio) – wznów kontekst i odtwórz zdanie jeszcze raz (raz), nigdy nie ucinaj
    if(V._intr&&!V._cut&&!retry&&V.ctx.state!=='closed'){V.killSrcs();V.stats.replays=(V.stats.replays||0)+1;try{await V.ctx.resume()}catch(e){}return V._seq(list,true)}return}
   catch(e){V.stats.fallback++}}
  for(const f of list){if(V._cut)return;if(f)await V._clip(f);else await new Promise(r=>setTimeout(r,GAP*1000))}},
 _clip(f){return new Promise(res=>{const a=V.audio;let done=false;const fin=()=>{if(!done){done=true;res()}};a.onended=fin;a.onerror=fin;a.src='audio/'+f;a.play().catch(fin);setTimeout(fin,15000)})},
 async _tts(t){V.stats.tts++;const T=plug('TextToSpeech');if(T){return T.speak({text:t,lang:'pl-PL',rate:0.95,pitch:0.95,volume:1,category:'playback'})}
  if(!root.speechSynthesis)return;return new Promise(res=>{const u=new SpeechSynthesisUtterance(t);u.lang='pl-PL';u.rate=.95;const vs=speechSynthesis.getVoices().filter(v=>/^pl/i.test(v.lang));u.voice=vs.find(v=>/zofia|female|kobieta|paulina|ewa/i.test(v.name))||vs[0]||null;u.onend=res;u.onerror=res;speechSynthesis.speak(u);setTimeout(res,12000)})},
 alarm(){try{const c=V.ctx||(V.ctx=new (root.AudioContext||root.webkitAudioContext)());for(let i=0;i<3;i++){const o=c.createOscillator(),g=c.createGain();o.type='square';o.frequency.value=880;g.gain.value=.25;o.connect(g);g.connect(c.destination);o.start(c.currentTime+i*.35);o.stop(c.currentTime+i*.35+.2)}}catch(e){}if(navigator.vibrate)navigator.vibrate([300,100,300])}};
// ---- rozpoznawanie mowy (v1.7) ----
const ERR={1:'przekroczony czas sieci',2:'błąd sieci',3:'błąd nagrywania dźwięku',4:'błąd serwera rozpoznawania',5:'błąd klienta',6:'cisza',7:'brak dopasowania',8:'rozpoznawanie zajęte',9:'brak uprawnienia do mikrofonu',10:'zbyt wiele żądań',11:'serwer rozłączony',12:'język polski nieobsługiwany przez usługę mowy – ustaw Google jako usługę mowy',13:'język polski niedostępny – pobierz pakiet polski w ustawieniach mowy Google',
 'no-speech':'cisza','aborted':'przerwane','audio-capture':'brak mikrofonu','network':'błąd sieci (Chrome wymaga internetu)','not-allowed':'brak uprawnienia do mikrofonu','service-not-allowed':'usługa niedostępna','language-not-supported':'język nieobsługiwany'};
const QUIET_ERR=[6,7,'no-speech','aborted'];
const S={running:false,onResult:()=>{},onHeard:()=>{},onState:()=>{},onLog:()=>{},status:'off',barge:'min',fails:0,log:[],errors:{},
 classify(alts){return root.RKO?root.RKO.interpret(alts):{cmd:null}},
 listenWhileSpeaking(){return false},
 paused:false,windowMode:true,WINDOW:8000,
 // v1.9: okno odpowiedzi – mikrofon włączony tylko ~8 s po pytaniu lektora, potem pauza (oszczędza baterię, brak fałszywych komend)
 openWindow(ms){if(!S.running)return;S.resumeSoon();clearTimeout(S._wt);S.winUntil=Date.now()+(ms||S.WINDOW);S._wt=setTimeout(S.closeWindow,(ms||S.WINDOW)+250)},
 closeWindow(){clearTimeout(S._wt);if(!S.running||!S.windowMode)return;if(M.userOn&&Date.now()-M.userT<6000){S._wt=setTimeout(S.closeWindow,1500);return}S.winUntil=0;if(!V.speaking)S.pause().catch(()=>{});S.set('mikrofon czeka na pytanie')},
 inWindow(){return !S.windowMode||Date.now()<(S.winUntil||0)},
 async pause(){S.paused=true;clearTimeout(S._rt);S._sess();if(S.mode==='native'){const N=plug('RkoNative');if(N&&N.srPause)await N.srPause()}else if(S.mode==='web'&&S.web){try{S.web.abort()}catch(e){}}},
 resumeSoon(){clearTimeout(S._rt);if(!S.running)return;S._rt=setTimeout(()=>{if(!S.running||V.speaking)return;S.paused=false;
  if(S.mode==='native'){const N=plug('RkoNative');if(N&&N.srResume)N.srResume().catch(()=>{})}else if(S.mode==='web'&&S.web&&!S.webOn){try{S.web.start();S.webOn=true}catch(e){}}},250)},
 addLog(src,text,extra){const e=Object.assign({t:Date.now(),src,text:text==null?'':String(text)},extra||{});S.log.push(e);if(S.log.length>500)S.log.splice(0,S.log.length-500);try{S.onLog(e)}catch(x){}return e},
 mark(verdict){for(let i=S.log.length-1;i>=0;i--){const e=S.log[i];if(e.src==='final'||e.src==='pośredni→wykonano'||e.src==='przycisk'){if(!e.verdict){e.verdict=verdict;try{S.onLog(e)}catch(x){}}return}}},
 logText(){const p=n=>String(n).padStart(2,'0');return S.log.map(e=>{const d=new Date(e.t);return p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds())+'.'+String(d.getMilliseconds()).padStart(3,'0')+' '+e.src+': '+e.text+(e.alts&&e.alts.length>1?' | alternatywy: '+e.alts.slice(1).join(' / '):'')+(e.conf!=null?' | pewność '+(+e.conf).toFixed(2):'')+(e.verdict?' → '+e.verdict:'')}).join('\n')},
 async start(){if(S.running)return;S.running=true;const N=plug('RkoNative');if(N&&N.muteBeep)N.muteBeep({on:true}).catch(()=>{});const SR=plug('SpeechRecognition');
  if(isNative){if(SR){try{const p=await SR.checkPermissions();if(p.speechRecognition!=='granted'){const q=await SR.requestPermissions();if(q.speechRecognition!=='granted'){S.set('mikrofon: brak uprawnienia – użyj przycisków');S.addLog('błąd','brak uprawnienia do mikrofonu');S.running=false;return}}}catch(e){S.addLog('info','uprawnienia: '+(e&&e.message))}}
   while(S.running&&V.speaking){S.set('czekam, lektor mówi');await new Promise(r=>setTimeout(r,100))}if(!S.running)return;
   if(N&&N.srStart){if(!S._lis){S._lis=true;try{N.addListener('sr',ev=>S._ev(ev))}catch(e){}}try{await N.srStart({language:'pl-PL'});S.mode='native';S.addLog('info','start rozpoznawania (natywne, pl-PL, bez trybu offline)');S.set('słucham');if(S.windowMode)S.openWindow()}catch(e){S.set('mikrofon: rozpoznawanie niedostępne ('+(e&&e.message||e)+') – użyj przycisków');S.addLog('błąd','srStart: '+(e&&e.message||e));S.running=false}return}
   if(SR){S.mode='plugin';S._plugin(SR);return}}
  while(S.running&&V.speaking)await new Promise(r=>setTimeout(r,100));
  const W=root.SpeechRecognition||root.webkitSpeechRecognition;if(!W){S.set('brak rozpoznawania mowy – użyj przycisków');S.running=false;return}
  const r=new W();r.lang='pl-PL';r.continuous=true;r.interimResults=true;r.maxAlternatives=5;S.web=r;S.mode='web';
  r.onresult=e=>{for(let i=e.resultIndex;i<e.results.length;i++){const res=e.results[i];const alts=[...res].map(a=>a.transcript);
   if(res.isFinal)S._final(alts,res[0]&&res[0].confidence);else S._partial(alts)}};
  r.onstart=()=>{S.webOn=true;S._ev({type:'ready'})};r.onspeechstart=()=>S._ev({type:'begin'});r.onspeechend=()=>S._ev({type:'end'});
  r.onend=()=>{S.webOn=false;S._sess();if(S.running)setTimeout(()=>{if(S.running&&!S.webOn&&!S.paused&&!V.speaking)try{S.web.start();S.webOn=true}catch(e){}},50)};
  r.onerror=e=>{S._err(e.error);if(['not-allowed','service-not-allowed','audio-capture','language-not-supported'].includes(e.error)){S.running=false;try{r.abort()}catch(x){}}};
  try{r.start();S.webOn=true;S.set('słucham');if(S.windowMode)S.openWindow()}catch(e){S.set('mikrofon niedostępny')}},
 _sess(){clearTimeout(S._pt);S._pend=null;S._sent=null;S._lastPartial=''},
 _ev(ev){if(!ev)return;switch(ev.type){
  case 'ready':S._sess();if(!/^mikrofon: błąd (12|13|9)/.test(S.status)||Date.now()-(S._errT||0)>15000)S.set(V.speaking?'słucham (lektor mówi)':'słucham');break;
  case 'begin':M.userSpeaking(true);break;
  case 'end':M.userSpeaking(false,300);break;
  case 'partial':S._partial(ev.matches||[]);break;
  case 'final':M.userSpeaking(false,300);S._final(ev.matches||[],ev.conf);break;
  case 'error':M.userSpeaking(false,0);S._err(ev.code,ev.msg);break}},
 _err(code,msg){S._sess();S.errors[code]=(S.errors[code]||0)+1;const txt=ERR[code]||('błąd '+code+(msg?' '+msg:''));
  if(QUIET_ERR.includes(code)){S.addLog('błąd '+code,txt,{quiet:true});return}
  S.fails++;S._errT=Date.now();S.addLog('błąd '+code,txt);S.set('mikrofon: błąd '+code+' – '+txt)},
 // wynik pośredni: wykonaj, gdy jednoznacznie pasuje (nie słaby/rozmyty) i utrzyma się 400 ms bez zmiany
 _partial(alts){alts=(alts||[]).filter(Boolean);if(!alts.length)return;try{S.onHeard('… '+alts[0])}catch(e){}
  if(alts[0]!==S._lastPartial){S._lastPartial=alts[0];S.addLog('pośredni',alts[0])}
  if(S._sent)return;const c=S.classify(alts)||{};clearTimeout(S._pt);S._pend=null;
  if(c.cmd&&c.cmd!=='number'&&!c.weak&&!c.fuzzy){S._pend={alts,cmd:c.cmd};S._pt=setTimeout(()=>{const p=S._pend;if(!p||S._sent)return;S._sent=p.cmd;S.addLog('pośredni→wykonano',p.alts[0],{alts:p.alts});S.emit(p.alts,null,'partial')},400)}},
 _final(alts,conf){alts=(alts||[]).filter(Boolean);clearTimeout(S._pt);const sent=S._sent,pend=S._pend;S._pend=null;
  if(!alts.length){S._sess();return}
  if(sent){const c=S.classify(alts)||{};S._sess();S.addLog('final',alts[0],{alts,conf,verdict:c.cmd===sent?'duplikat – wykonano już z wyniku pośredniego':'po wyniku pośrednim – pominięto'});return}
  S._sess();S.fails=0;S.addLog('final',alts[0],{alts,conf});S.emit(alts,conf,'final')},
 emit(alts,conf,src){if(!alts||!alts.length)return;
  // v1.8: nic z mikrofonu nie przerywa lektora – wynik w trakcie mowy (spóźniony) jest pomijany
  if(V.speaking||S.paused){S.mark('pominięto – lektor mówi');return}
  try{S.onHeard(alts[0])}catch(e){}
  if(root.RKO&&/^((tik|tyk|klik|puk|tuk|tup)\s*)+$/.test(root.RKO.norm(alts[0]))&&root.Metro&&root.Metro.want){S.mark('kliknięcie metronomu – pominięto');return}
  // echo tuż po końcu mowy lektora: tylko niemal dokładna kopia zdania
  const now=Date.now();if(!V.speaking&&now-V.endedAt<300&&root.RKO&&root.RKO.echoOf(alts[0],V.lastText||'')){S.mark('echo lektora – pominięto');return}
  S.onResult(alts,conf,src)},
 set(st){S.status=st;S.onState(st)},
 // awaryjnie: wtyczka community (bez trybu offline), restart natychmiast, bez narastających przerw
 async _plugin(SR){while(S.running){S.set(V.speaking?'słucham (lektor mówi)':'słucham');
   try{const r=await SR.start({language:'pl-PL',maxResults:5,partialResults:false,popup:false});if(r&&r.matches&&r.matches.length)S._final(r.matches,null);else S._err(7)}
   catch(e){S._err(String(e&&e.message||e))}await new Promise(r=>setTimeout(r,60))}},
 async info(){const N=plug('RkoNative');if(N&&N.srInfo){try{return await N.srInfo()}catch(e){return {error:String(e&&e.message||e)}}}return {web:!!(root.SpeechRecognition||root.webkitSpeechRecognition)}},
 stop(){S.running=false;clearTimeout(S._wt);S.winUntil=0;S._sess();const N=plug('RkoNative');if(N&&N.muteBeep)N.muteBeep({on:false}).catch(()=>{});if(N&&N.srStop)N.srStop().catch(()=>{});const SR=plug('SpeechRecognition');if(SR&&S.mode==='plugin')SR.stop().catch(()=>{});if(S.web)try{S.web.abort()}catch(e){}S.set('off')}};
// ---- metronom uciśnięć (WebAudio, planowany z wyprzedzeniem – bez przerw); milknie, gdy mówi lektor ----
const M={want:false,rate:110,vol:0.15,next:0,nodes:[],timer:null,clicks:0,duckUntil:0,userOn:false,userT:0,USER_CAP:4000,
 duck(ms){M.duckUntil=Math.max(M.duckUntil,Date.now()+ms)},
 userSpeaking(on,after){const n=Date.now();if(on){M.userOn=true;M.userT=n}else{M.userOn=false;if(after)M.duck(after)}},
 ducked(){const n=Date.now();return n<M.duckUntil||(M.userOn&&n-M.userT<M.USER_CAP)},
 start(){if(!M.timer)M.timer=setInterval(M.tick,25)},
 active(){return M.want&&!V.speaking&&!M.ducked()&&V.ctx&&V.ctx.state==='running'},
 nat(){return isNative&&plug('RkoNative')&&plug('RkoNative').metro?plug('RkoNative'):null},
 natSync(){const N=M.nat();const on=!!(M.want&&!V.speaking&&!M.ducked());const st=on+'|'+M.rate+'|'+M.vol;if(st===M._ns)return;M._ns=st;N.metro({on,rate:Math.max(100,Math.min(120,M.rate||110)),vol:Math.max(0.02,Math.min(1,M.vol||0.15))}).catch(()=>{M._ns=null})},
 tick(){if(M.nat()){M.natSync();return}const c=V.ctx;if(M.want&&c&&c.state!=='running'&&c.state!=='closed'&&!V.speaking&&Date.now()-(M._rs||0)>500){M._rs=Date.now();try{c.resume()}catch(e){}}if(!M.active()){if(M.nodes.length)M.cut();M.next=0;return}const per=60/Math.max(100,Math.min(120,M.rate||110));
  if(M.next<c.currentTime+0.01)M.next=c.currentTime+0.06;while(M.next<c.currentTime+0.15){M.click(M.next);M.next+=per}
  M.nodes=M.nodes.filter(n=>n.t>c.currentTime-0.1)},
 click(t){const c=V.ctx;try{const o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.value=1250;const v=Math.max(0.02,Math.min(1,M.vol||0.15));
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(v,t+0.003);g.gain.exponentialRampToValueAtTime(0.0001,t+0.035);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+0.04);M.nodes.push({o,t});M.clicks++}catch(e){}},
 cut(){if(M.nat()){M.natSync()}M.nodes.forEach(n=>{try{n.o.stop()}catch(e){}});M.nodes=[];M.next=0}};
V.hooks=[];V.onState=sp=>{if(sp===false)V.lastText=V._lt;if(sp)M.cut();V.hooks.forEach(h=>{try{h(sp)}catch(e){}})};
const _say=V.say;V.say=(t,k)=>{V._lt=(V._lt&&V.speaking?V._lt+' ':'')+t;_say(t,k)};
root.Voice=V;root.Metro=M;root.Ears=S;root.isNative=isNative;root.plug=plug;
})(this);
