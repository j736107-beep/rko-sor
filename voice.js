/* Lektor (nagrania offline + TTS dla liczb) i rozpoznawanie mowy (pętla z restartem) */
(function(root){
const Cap=root.Capacitor,isNative=!!(Cap&&Cap.isNativePlatform&&Cap.isNativePlatform());
const plug=n=>isNative&&Cap.Plugins?Cap.Plugins[n]:null;
const PREFIX=['Zmniejszam. Ustaw pompę','Zwiększam. Ustaw pompę','Utrzymaj. Pompa','Ustaw pompę','Średnie ciśnienie wynosi','Zapisano:'];
function key(t){return String(t).trim()}
function sentences(t){return String(t).split(/(?<=[.?!])\s+/).filter(Boolean)}
const V={clips:{},speaking:false,queue:[],onState:()=>{},muted:false,audio:null,
 async init(){try{const r=await fetch('audio/clips.json');V.clips=await r.json()}catch(e){V.clips={}}V.audio=new Audio();V.audio.preload='auto'},
 unlock(){try{V.audio.src='audio/silence.mp3';V.audio.play().catch(()=>{})}catch(e){}try{V.ctx=V.ctx||new (root.AudioContext||root.webkitAudioContext)();V.ctx.resume()}catch(e){}},
 plan(text){const out=[];for(const s of sentences(text)){if(V.clips[key(s)]){out.push({clip:V.clips[key(s)]});continue}
  let done=false;for(const p of PREFIX){if(s.startsWith(p+' ')){const rest=s.slice(p.length+1);if(V.clips[p]&&V.clips[key(rest)]){out.push({clip:V.clips[p]},{clip:V.clips[key(rest)]});done=true;break}}}
  if(!done)out.push({tts:s})}return out},
 say(text,kind){V.queue.push({text,kind});if(!V.speaking)V._run()},
 stop(){V.queue=[];V._cut=true;try{V.audio.pause();V.audio.onended&&V.audio.onended()}catch(e){}if(root.speechSynthesis)speechSynthesis.cancel();const T=plug('TextToSpeech');if(T)T.stop().catch(()=>{})},
 async _run(){V.speaking=true;V.onState(true);while(V.queue.length){const it=V.queue.shift();V.current=it.text;V._cut=false;for(const seg of V.plan(it.text)){if(V._cut)break;try{seg.clip?await V._clip(seg.clip):await V._tts(seg.tts)}catch(e){}}}V.current='';V.speaking=false;V.onState(false)},
 _clip(f){return new Promise(res=>{const a=V.audio;a.onended=res;a.onerror=res;a.src='audio/'+f;a.play().catch(res);setTimeout(res,15000)})},
 async _tts(t){const T=plug('TextToSpeech');if(T){return T.speak({text:t,lang:'pl-PL',rate:0.95,pitch:0.95,volume:1})}
  if(!root.speechSynthesis)return;return new Promise(res=>{const u=new SpeechSynthesisUtterance(t);u.lang='pl-PL';u.rate=.95;const vs=speechSynthesis.getVoices().filter(v=>/^pl/i.test(v.lang));u.voice=vs.find(v=>/zofia|female|kobieta|paulina|ewa/i.test(v.name))||vs[0]||null;u.onend=res;u.onerror=res;speechSynthesis.speak(u);setTimeout(res,12000)})},
 alarm(){try{const c=V.ctx||(V.ctx=new (root.AudioContext||root.webkitAudioContext)());for(let i=0;i<3;i++){const o=c.createOscillator(),g=c.createGain();o.type='square';o.frequency.value=880;g.gain.value=.25;o.connect(g);g.connect(c.destination);o.start(c.currentTime+i*.35);o.stop(c.currentTime+i*.35+.2)}}catch(e){}if(navigator.vibrate)navigator.vibrate([300,100,300])}};
// ---- rozpoznawanie mowy ----
const S={running:false,onResult:()=>{},onState:()=>{},status:'off',
 async start(){S.running=true;const SR=plug('SpeechRecognition');
  if(SR){try{const p=await SR.checkPermissions();if(p.speechRecognition!=='granted')await SR.requestPermissions()}catch(e){}S._native(SR);return}
  const W=root.SpeechRecognition||root.webkitSpeechRecognition;if(!W){S.set('brak rozpoznawania mowy – użyj przycisków');return}
  const r=new W();r.lang='pl-PL';r.continuous=true;r.interimResults=false;r.maxAlternatives=5;S.web=r;
  r.onresult=e=>{const res=e.results[e.results.length-1];S.onResult([...res].map(a=>a.transcript))};
  r.onend=()=>{if(S.running)setTimeout(()=>{try{r.start()}catch(e){}},300)};r.onerror=e=>S.set('mikrofon: '+e.error);
  try{r.start();S.set('słucham')}catch(e){S.set('mikrofon niedostępny')}},
 set(st){S.status=st;S.onState(st)},
 async _native(SR){while(S.running){S.set(V.speaking?'słucham (lektor mówi)':'słucham');try{const r=await SR.start({language:'pl-PL',maxResults:5,partialResults:false,popup:false});if(r&&r.matches&&r.matches.length)S.onResult(r.matches)}
  catch(e){await new Promise(r=>setTimeout(r,250))}}},
 stop(){S.running=false;const SR=plug('SpeechRecognition');if(SR)SR.stop().catch(()=>{});if(S.web)try{S.web.abort()}catch(e){}S.set('off')}};
V.hooks=[];V.onState=sp=>{V.hooks.forEach(h=>{try{h(sp)}catch(e){}})};
root.Voice=V;root.Ears=S;root.isNative=isNative;root.plug=plug;
})(this);
