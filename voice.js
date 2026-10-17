/* Lektor v1.5.1: nagrania dekodowane do WebAudio i odtwarzane bez przerw; TTS tylko dla całych zdań bez nagrania.
   Rozpoznawanie mowy: bez restartów w trakcie mówienia lektora (Android zabiera fokus audio), z narastającym opóźnieniem i wyciszeniem sygnału. */
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
 preloadStart(){const S=root.RKO&&root.RKO.SAY;if(!S||!V.ctx)return;const L=[S.start,S.scen,S.team,S.mins,S.rhythm,S.warn15,S.cont,S.adr,S.adrNow,S.nonshockI,S.afterShock,S.logged];
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
 say(text,kind){if(!text)return;V.queue.push({text,kind});if(!V.speaking)V._run()},
 stop(){V.queue=[];V._cut=true;V.srcs.forEach(s=>{try{s.onended=null;s.stop()}catch(e){}});V.srcs=[];if(V._seqDone){const d=V._seqDone;V._seqDone=null;d()}
  try{V.audio.pause();V.audio.onended&&V.audio.onended()}catch(e){}if(root.speechSynthesis)speechSynthesis.cancel();const T=plug('TextToSpeech');if(T)T.stop().catch(()=>{})},
 async _run(){V.speaking=true;V.startedAt=Date.now();V.onState(true);
  while(V.queue.length){const it=V.queue.shift();V.current=it.text;V._cut=false;for(const seg of V.plan(it.text)){if(V._cut)break;try{seg.clips?await V._seq(seg.clips):await V._tts(seg.tts)}catch(e){}}}
  V.current='';V.speaking=false;V.endedAt=Date.now();V.onState(false)},
 async _seq(list){V.stats.clips+=list.length;if(V.startReady){const p=V.startReady;V.startReady=null;await Promise.race([p,new Promise(r=>setTimeout(r,1500))])}
  if(V.ctx){try{if(V.ctx.state!=='running')await V.ctx.resume();const bs=await Promise.all(list.map(f=>f?V.buf(f):null));if(V._cut)return;
    return await new Promise(res=>{let t=V.ctx.currentTime+0.04;V.srcs=[];let last=null;
     for(const b of bs){if(!b){t+=GAP;continue}const s=V.ctx.createBufferSource();s.buffer=b;s.connect(V.ctx.destination);s.start(t);t+=b.duration;V.srcs.push(s);last=s}
     V._seqDone=res;const fin=()=>{if(V._seqDone===res){V._seqDone=null;V.srcs=[];res()}};if(last)last.onended=fin;setTimeout(fin,(t-V.ctx.currentTime)*1000+800)})}
   catch(e){V.stats.fallback++}}
  for(const f of list){if(V._cut)return;if(f)await V._clip(f);else await new Promise(r=>setTimeout(r,GAP*1000))}},
 _clip(f){return new Promise(res=>{const a=V.audio;let done=false;const fin=()=>{if(!done){done=true;res()}};a.onended=fin;a.onerror=fin;a.src='audio/'+f;a.play().catch(fin);setTimeout(fin,15000)})},
 async _tts(t){V.stats.tts++;const T=plug('TextToSpeech');if(T){return T.speak({text:t,lang:'pl-PL',rate:0.95,pitch:0.95,volume:1,category:'playback'})}
  if(!root.speechSynthesis)return;return new Promise(res=>{const u=new SpeechSynthesisUtterance(t);u.lang='pl-PL';u.rate=.95;const vs=speechSynthesis.getVoices().filter(v=>/^pl/i.test(v.lang));u.voice=vs.find(v=>/zofia|female|kobieta|paulina|ewa/i.test(v.name))||vs[0]||null;u.onend=res;u.onerror=res;speechSynthesis.speak(u);setTimeout(res,12000)})},
 alarm(){try{const c=V.ctx||(V.ctx=new (root.AudioContext||root.webkitAudioContext)());for(let i=0;i<3;i++){const o=c.createOscillator(),g=c.createGain();o.type='square';o.frequency.value=880;g.gain.value=.25;o.connect(g);g.connect(c.destination);o.start(c.currentTime+i*.35);o.stop(c.currentTime+i*.35+.2)}}catch(e){}if(navigator.vibrate)navigator.vibrate([300,100,300])}};
// ---- rozpoznawanie mowy ----
// barge: 'off' | 'min' (tylko „stop”, „wyładowano”) | 'full'. Na Androidzie start rozpoznawania w trakcie mowy lektora zabiera fokus audio
// (lektor się zacina), więc poza trybem 'full' rozpoznawanie czeka, aż lektor skończy.
const S={running:false,onResult:()=>{},onState:()=>{},status:'off',barge:'min',fails:0,
 listenWhileSpeaking(){return S.barge==='full'||(!isNative&&S.barge==='min')},
 async start(){S.running=true;const N=plug('RkoNative');if(N&&N.muteBeep)N.muteBeep({on:true}).catch(()=>{});const SR=plug('SpeechRecognition');
  if(SR){try{const p=await SR.checkPermissions();if(p.speechRecognition!=='granted')await SR.requestPermissions()}catch(e){}S._native(SR);return}
  const W=root.SpeechRecognition||root.webkitSpeechRecognition;if(!W){S.set('brak rozpoznawania mowy – użyj przycisków');return}
  const r=new W();r.lang='pl-PL';r.continuous=true;r.interimResults=false;r.maxAlternatives=5;S.web=r;
  r.onresult=e=>{const res=e.results[e.results.length-1];S.fails=0;S.emit([...res].map(a=>a.transcript),res[0]&&res[0].confidence)};
  r.onend=()=>{S.webOn=false;if(S.running)S._webRestart()};r.onerror=e=>{S.fails++;S.set('mikrofon: '+e.error)};
  V.hooks.push(sp=>{if(!sp&&S.running&&S.web&&!S.webOn)S._webRestart()});
  try{r.start();S.webOn=true;S.set('słucham')}catch(e){S.set('mikrofon niedostępny')}},
 _webRestart(){if(!S.running||S.webOn)return;if(V.speaking&&!S.listenWhileSpeaking())return;const d=Math.min(2000,300+S.fails*300);clearTimeout(S._wt);S._wt=setTimeout(()=>{if(!S.running||S.webOn)return;if(V.speaking&&!S.listenWhileSpeaking())return;try{S.web.start();S.webOn=true}catch(e){}},d)},
 emit(alts,conf){if(!alts||!alts.length)return;if(root.RKO&&/^((tik|tyk|klik|puk|tuk|tup)\s*)+$/.test(root.RKO.norm(alts[0]))&&root.Metro&&root.Metro.want)return;
  // osłona przed echem: zaraz po starcie mowy i do 0,4 s po jej końcu
  const now=Date.now();if(V.speaking&&now-V.startedAt<400)return;if(!V.speaking&&now-V.endedAt<250&&root.RKO&&root.RKO.echoOf(root.RKO.norm(alts[0]),V.lastText||''))return;
  S.onResult(alts,conf)},
 set(st){S.status=st;S.onState(st)},
 async _native(SR){while(S.running){
   if(V.speaking&&!S.listenWhileSpeaking()){S.set('czekam, lektor mówi');await new Promise(r=>setTimeout(r,120));continue}
   S.set(V.speaking?'słucham (lektor mówi)':'słucham');
   try{const r=await SR.start({language:'pl-PL',maxResults:5,partialResults:false,popup:false});if(r&&r.matches&&r.matches.length){S.fails=0;S.emit(r.matches,null)}else S.fails++}
   catch(e){S.fails++}
   if(S.fails)await new Promise(r=>setTimeout(r,Math.min(1500,200*S.fails)))}},
 stop(){S.running=false;const N=plug('RkoNative');if(N&&N.muteBeep)N.muteBeep({on:false}).catch(()=>{});const SR=plug('SpeechRecognition');if(SR)SR.stop().catch(()=>{});if(S.web)try{S.web.abort()}catch(e){}S.set('off')}};
// ---- metronom uciśnięć (WebAudio, planowany z wyprzedzeniem – bez przerw); milknie, gdy mówi lektor ----
const M={want:false,rate:110,vol:0.3,next:0,nodes:[],timer:null,clicks:0,
 start(){if(!M.timer)M.timer=setInterval(M.tick,25)},
 active(){return M.want&&!V.speaking&&V.ctx&&V.ctx.state==='running'},
 tick(){const c=V.ctx;if(!M.active()){if(M.nodes.length)M.cut();M.next=0;return}const per=60/Math.max(100,Math.min(120,M.rate||110));
  if(M.next<c.currentTime+0.01)M.next=c.currentTime+0.06;while(M.next<c.currentTime+0.15){M.click(M.next);M.next+=per}
  M.nodes=M.nodes.filter(n=>n.t>c.currentTime-0.1)},
 click(t){const c=V.ctx;try{const o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.value=1250;const v=Math.max(0.02,Math.min(1,M.vol||0.3));
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(v,t+0.003);g.gain.exponentialRampToValueAtTime(0.0001,t+0.035);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+0.04);M.nodes.push({o,t});M.clicks++}catch(e){}},
 cut(){M.nodes.forEach(n=>{try{n.o.stop()}catch(e){}});M.nodes=[];M.next=0}};
V.hooks=[];V.onState=sp=>{if(sp===false)V.lastText=V._lt;if(sp)M.cut();V.hooks.forEach(h=>{try{h(sp)}catch(e){}})};
const _say=V.say;V.say=(t,k)=>{V._lt=(V._lt&&V.speaking?V._lt+' ':'')+t;_say(t,k)};
root.Voice=V;root.Metro=M;root.Ears=S;root.isNative=isNative;root.plug=plug;
})(this);
