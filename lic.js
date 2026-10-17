/* Licencja RKO SOR / aplikacje Wujek Fido – offline, Ed25519 (tweetnacl). Bez danych z telefonu. */
(function(root){
const NACL=root.nacl||(typeof require!=='undefined'?require('./nacl.min.js'):null);
const PUBS={1:'jhRmuIUOEKVX2EC1H7MXXm56rAWpfAbQSF/x8tmQc6g=',2:'m/ejmPLXyRU+bWwQPoYh/Rp4T1ks2zRttVhCrcy1iYA='}; // 1 = główny, 2 = zapasowy (prywatny tylko w sejfie)
const APPS={RKO:1,KALKULATORY:2,POMPY:4,OMDLENIE:8,PEDIATRIA:16,TRIAGE:32};
const APP_NAMES={1:'RKO SOR',2:'SOR Kalkulatory',4:'Pompy',8:'Omdlenie',16:'Pediatria',32:'Triage'};
const A32='0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford
const EPOCH=Date.UTC(2026,0,1),NOEXP=0xFFFF;
const TRIAL_END=new Date(2026,11,31,23,59,59).getTime(),WARN_FROM=new Date(2026,11,1).getTime();
const MSG='RKOLIC1';
function b32(u8){let bits=0,v=0,o='';for(const b of u8){v=(v<<8)|b;bits+=8;while(bits>=5){o+=A32[(v>>>(bits-5))&31];bits-=5}}if(bits>0)o+=A32[(v<<(5-bits))&31];return o}
function unb32(s){s=String(s).toUpperCase().replace(/[^0-9A-Z]/g,'').replace(/O/g,'0').replace(/[IL]/g,'1');let bits=0,v=0;const o=[];for(const ch of s){const i=A32.indexOf(ch);if(i<0)return null;v=((v<<5)|i)&0xFFFFFF;bits+=5;if(bits>=8){o.push((v>>>(bits-8))&255);bits-=8}}return new Uint8Array(o)}
function b64(s){if(typeof atob==='function'){const b=atob(s);return Uint8Array.from(b,c=>c.charCodeAt(0))}return new Uint8Array(Buffer.from(s,'base64'))}
function group(s,n){return s.match(new RegExp('.{1,'+n+'}','g')).join('-')}
function makeId(prefix,rand){const r=rand||(n=>{const a=new Uint8Array(n);(root.crypto||require('crypto').webcrypto).getRandomValues(a);return a});const s=b32(r(5));return (prefix||'RKO')+'-'+s.slice(0,4)+'-'+s.slice(4,8)}
function idBytes(id){const m=String(id||'').toUpperCase().match(/^[A-Z]+-([0-9A-Z]{4})-?([0-9A-Z]{4})$/);if(!m)return null;const u=unb32(m[1]+m[2]);return u&&u.length===5?u:null}
function dayOf(y,m,d){return Math.round((Date.UTC(y,m-1,d)-EPOCH)/864e5)}
function dayEnd(day){const d=new Date(EPOCH+day*864e5);return new Date(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate(),23,59,59).getTime()}
function payload(o){const id=idBytes(o.id);if(!id)throw new Error('zły numer instalacji');const p=new Uint8Array(10);p[0]=1;p[1]=o.kid||1;p.set(id,2);p[7]=o.apps&255;const e=o.exp==null?NOEXP:o.exp;p[8]=e>>8;p[9]=e&255;return p}
function msgOf(p){const m=new Uint8Array(MSG.length+p.length);for(let i=0;i<MSG.length;i++)m[i]=MSG.charCodeAt(i);m.set(p,MSG.length);return m}
// podpis (Generator): sk = 64-bajtowy klucz tajny tweetnacl
function encode(o,sk){const p=payload(o);const sig=NACL.sign.detached(msgOf(p),sk);const all=new Uint8Array(74);all.set(p);all.set(sig,10);return group(b32(all),5)}
function parse(code){const u=unb32(code||'');if(!u||u.length<74)return null;const p=u.slice(0,10),sig=u.slice(10,74);if(p[0]!==1)return null;const e=(p[8]<<8)|p[9];
 return {p,sig,kid:p[1],idb:p.slice(2,7),apps:p[7],exp:e===NOEXP?null:e,owner:e===NOEXP}}
function verify(code,id,appBit){const c=parse(code);if(!c)return {ok:false,reason:'nieprawidłowy kod'};const pub=PUBS[c.kid];if(!pub)return {ok:false,reason:'nieznany klucz'};
 if(!NACL.sign.detached.verify(msgOf(c.p),c.sig,b64(pub)))return {ok:false,reason:'podpis nieprawidłowy'};
 const ib=idBytes(id);if(!ib||ib.some((b,i)=>b!==c.idb[i]))return {ok:false,reason:'kod dla innego numeru instalacji'};
 if(appBit&&!(c.apps&appBit))return {ok:false,reason:'kod nie obejmuje tej aplikacji'};
 return {ok:true,apps:c.apps,exp:c.exp==null?null:dayEnd(c.exp),owner:c.owner,kid:c.kid}}
// stan licencji; czas = max(teraz, najpóźniejsza widziana data) – ochrona przed cofnięciem zegara
function status(o){const now=Math.max(o.now||Date.now(),o.maxSeen||0);const r={now,maxSeen:now,full:false,mode:'demo',banner:null,code:null};
 if(o.code){const v=verify(o.code,o.id,o.app||APPS.RKO);r.code=v;if(v.ok&&(v.exp==null||now<=v.exp)){r.full=true;r.mode=v.owner?'owner':'code';
   if(v.exp!=null&&v.exp-now<30*864e5)r.banner='Kod aktywacji wygasa '+new Date(v.exp).toLocaleDateString('pl-PL')+'. Poproś o nowy kod.';return r}
  if(v.ok)r.expired=true}
 if(now<=TRIAL_END){r.full=true;r.mode='trial';if(now>=WARN_FROM)r.banner='Wersja próbna do 31.12.2026. Wyślij numer instalacji, aby otrzymać kod aktywacji.';return r}
 r.banner=r.expired?'Kod aktywacji wygasł – działa wersja Demo (START zawsze dostępny).':'Wersja Demo – START zawsze dostępny. Pełna wersja wymaga kodu aktywacji.';return r}
function shareText(id){return 'Proszę o kod aktywacji RKO SOR. Numer instalacji: '+id}
const API={PUBS,APPS,APP_NAMES,TRIAL_END,WARN_FROM,b32,unb32,makeId,idBytes,dayOf,dayEnd,payload,encode,parse,verify,status,shareText,NOEXP};
if(typeof module!=='undefined')module.exports=API;else root.LIC=API;
})(typeof window!=='undefined'?window:globalThis);
