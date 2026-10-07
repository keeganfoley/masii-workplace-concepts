(()=>{'use strict';
// MASii chapter artwork follows native document scroll position.
// A sticky viewport holds each chapter; the spring only animates the artwork.
// Wheel, touch, keyboard and the scrollbar always remain browser-owned.
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const root=document.documentElement,story=$('#story'),stage=$('.stage'),canvas=$('#film'),sections=$$('.chapter'),bar=$('.journey-bar'),cue=$('.scroll-cue'),cueText=$('.cue-text'),navLinks=$$('.chapter-nav a'),tip=$('.stip');
const slot=$('#phSlot'),phones=$$('.ph',slot),phSteps=$('.ph-steps'),phCount=$('.ph-count b'),phLabel=$('.ph-label'),phBars=$$('.ph-steps i');
const reduce=matchMedia('(prefers-reduced-motion: reduce)'),narrowMQ=matchMedia('(max-width:800px)'),coarse=matchMedia('(pointer:coarse)').matches;
const PHONE=coarse?Math.min(innerWidth,innerHeight)<=800&&Math.max(innerWidth,innerHeight)<=1100:matchMedia('(max-width:800px) and (orientation:portrait)').matches;root.classList.toggle('phone',PHONE);
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t)},TAU=Math.PI*2;

// ---- Timeline ------------------------------------------------------------------------------------
const SEG=96,STOPS=[0,SEG,SEG*2,SEG*3],LAST=STOPS.length-1,TMAX=LAST;
const OMEGA=8,ARRIVE=.36;
const STEP_LABEL=['','Choose a cause','Build good habits','Feel rewarded'];

// ---- Sprites ---------------------------------------------------------------------------------------
const IMG='../../shared/assets/img/';
const SPR_A={m:'tier-gradient',gold:'coin-gold',silver:'coin-lg',star:'done-star-lg',spark:'mas-mark',glow:'done-glow',bloom:'entry-bar-bloom',orbit:'done-orbit',wash:'porcelain-wash',grad:'gradient-4'};
const SPR_B={heart:'done-heart',gpGlow:'goodprint-glow',confetti:'done-confetti',gift:'mission-gift-heart',hand:'mission-handshake',msg:'mission-heart-message',stars:'mission-stars',target:'mission-target',run:'stat-day-run',don:'stat-donations',moves:'stat-moves'};
const img={};let assetsReady=false,sceneDirty=true;
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));return c};
function decode(name){return fetch(IMG+name+'.webp').then(r=>{if(!r.ok)throw 0;return r.blob()}).then(b=>'createImageBitmap'in window?createImageBitmap(b):new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=URL.createObjectURL(b)})).catch(()=>null)}
const yieldWork=()=>new Promise(resolve=>{if('requestIdleCallback'in window)requestIdleCallback(resolve,{timeout:120});else setTimeout(resolve,16)});
const loadGroup=g=>Promise.all(Object.entries(g).map(([k,n])=>decode(n).then(b=>{if(b)img[k]=b}))).then(async()=>{await prep(Object.keys(g));sceneDirty=true});
const BUCKETS=[96,192,384];
function blurCopy(src,bw){const bh=bw*src.height/src.width,pad=Math.round(bw*.14),W=bw+pad*2,H=bh+pad*2;
  {const out=mk(W,H),x=out.getContext('2d');if('filter'in x){x.filter=`blur(${Math.max(1,bw*.022).toFixed(1)}px)`;x.drawImage(src,pad,pad,bw,bh);x.filter='none';out.w0=bw;return out}}
  const a=mk(W/3,H/3),b=mk(W/7,H/7),out=mk(W,H);let x=a.getContext('2d');x.drawImage(src,pad/3,pad/3,bw/3,bh/3);x=b.getContext('2d');x.drawImage(a,0,0,b.width,b.height);x=a.getContext('2d');x.clearRect(0,0,a.width,a.height);x.drawImage(b,0,0,a.width,a.height);x=out.getContext('2d');x.drawImage(a,0,0,W,H);out.w0=bw;return out}
// The M's four layers: step-shaped vertical slices (same joints as Concept B's SVG clips, mapped onto
// the chrome sprite's alpha bounds), each cropped to its own box so a slice costs only its own pixels.
const SLICE=[[.296,.273],[.585,.562],[.874,.851]],STEP_Y=.494;
function sliceM(){const s=img.m;if(!s)return;
  const sw=Math.round(s.width/4),sh=Math.round(s.height/4),t=mk(sw,sh),tx=t.getContext('2d',{willReadFrequently:true});tx.drawImage(s,0,0,sw,sh);
  const d=tx.getImageData(0,0,sw,sh).data;let x0=sw,x1=0,y0=sh,y1=0;for(let y=0;y<sh;y++)for(let x=0;x<sw;x++)if(d[(y*sw+x)*4+3]>40){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}
  const bx=x0*4,by=y0*4,bw=(x1-x0+1)*4,bh=(y1-y0+1)*4,stepY=by+bh*STEP_Y;
  const cuts=[[0,0],...SLICE,[1.0001,1.0001]].map(([a,b])=>[bx+bw*a,bx+bw*b]);
  img.mSeg=[];for(let i=0;i<4;i++){const [ta,ba]=cuts[i],[tb,bb]=cuts[i+1];
    const L=Math.floor(Math.min(ta,ba))-2,R=Math.ceil(Math.max(tb,bb))+2,cw=R-L,c=mk(cw,s.height),g=c.getContext('2d');
    g.beginPath();g.moveTo(i?ta-L:0,0);g.lineTo(i<3?tb-L:cw,0);g.lineTo(i<3?tb-L:cw,stepY);g.lineTo(i<3?bb-L:cw,stepY);g.lineTo(i<3?bb-L:cw,s.height);g.lineTo(i?ba-L:0,s.height);g.lineTo(i?ba-L:0,stepY);g.lineTo(i?ta-L:0,stepY);g.closePath();g.clip();g.drawImage(s,-L,0);
    img.mSeg.push({cv:c,ox:L+cw/2-s.width/2,fw:cw/s.width})}}
async function prep(keys){for(const k of keys){await yieldWork();const s=img[k];if(!s)continue;
  if(['gold','silver','spark','m'].includes(k)){const copies=[];for(const bw of BUCKETS){await yieldWork();copies.push(blurCopy(s,bw))}img[k+'Blur']=copies;}
  if(k==='m')sliceM();
  if(['gift','hand','msg','stars','target'].includes(k)){const c=mk(s.width,s.height),x=c.getContext('2d');x.drawImage(s,0,0);x.globalCompositeOperation='destination-in';const r=x.createRadialGradient(c.width/2,c.height/2,0,c.width/2,c.height/2,c.width/2);r.addColorStop(0,'#000');r.addColorStop(.55,'#000');r.addColorStop(.98,'rgba(0,0,0,0)');x.fillStyle=r;x.fillRect(0,0,c.width,c.height);img[k]=c}
  if(['glow','gpGlow','bloom'].includes(k)){const c=mk(s.width/2,s.height/2),x=c.getContext('2d');x.drawImage(s,0,0,c.width,c.height);x.globalCompositeOperation='destination-in';x.setTransform(c.width/2,0,0,c.height/2,c.width/2,c.height/2);const r=x.createRadialGradient(0,0,0,0,0,1);r.addColorStop(0,'#000');r.addColorStop(.45,'#000');r.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=r;x.fillRect(-1,-1,2,2);img[k]=c}}
  if(!img.shadow){const sh=mk(256,64),g=sh.getContext('2d'),rg=g.createRadialGradient(128,32,0,128,32,128);rg.addColorStop(0,'rgba(78,79,140,.34)');rg.addColorStop(.5,'rgba(110,100,170,.12)');rg.addColorStop(1,'rgba(120,110,180,0)');g.setTransform(1,0,0,.25,0,24);g.fillStyle=rg;g.fillRect(0,0,256,256);img.shadow=sh}
  if(!img.halo){const h=mk(256,256),g=h.getContext('2d'),rg=g.createRadialGradient(128,128,0,128,128,128);rg.addColorStop(0,'rgba(255,255,255,.95)');rg.addColorStop(.35,'rgba(200,190,255,.55)');rg.addColorStop(.7,'rgba(130,115,235,.18)');rg.addColorStop(1,'rgba(130,115,235,0)');g.fillStyle=rg;g.fillRect(0,0,256,256);img.halo=h}}
const loadA=loadGroup(SPR_A).then(()=>{assetsReady=true});
const loadAll=loadA.then(()=>loadGroup(SPR_B));

// ---- Interaction state ---------------------------------------------------------------------------
const Sp=(x=0)=>({x,v:0,t:x});
function stepSp(s,dt,om){const a=om*om*(s.t-s.x)-2*om*s.v;s.v+=a*dt;s.x+=s.v*dt;if(Math.abs(s.t-s.x)<1e-4&&Math.abs(s.v)<1e-4){s.x=s.t;s.v=0;return false}return true}
// Under-damped spring for the M layers' bounce (they overshoot and resettle, as in Concept B's elastic tap).
function stepBounce(s,dt,om,z){const a=om*om*(s.t-s.x)-2*z*om*s.v;s.v+=a*dt;s.x+=s.v*dt;if(Math.abs(s.t-s.x)<1e-4&&Math.abs(s.v)<1e-3){s.x=s.t;s.v=0;return false}return true}
const FX={px:-1e5,py:-1e5,inside:false,lastMove:0,hits:[],hover:null,tapId:null,tapUntil:0,objs:new Map(),par:{x:Sp(),y:Sp()},parts:[],clock:0,seg:[0,1,2,3].map(()=>({x:Sp(),y:Sp(),r:Sp()}))};
const fxObj=id=>{let o=FX.objs.get(id);if(!o){o={hov:Sp(),ox:Sp(),oy:Sp(),oz:Sp(),tx:Sp(),ty:Sp(),flip:Sp()};FX.objs.set(id,o)}return o};
const CAUSES={gift:'Hunger relief',hand:'Community',msg:'Mental health',stars:'Education',target:'Environment'};
const STATS={run:'Daily plays',don:'Donations',moves:'Moves'};

// ---- Intro: the four layers assemble (stagger from the last layer, expo.out, as in Concept B) -----
const intro={t0:0,done:reduce.matches,DUR:1.6,EACH:.14};
const START=[{x:-3.4,y:-1.3,z:2.2,r:-.31},{x:-.8,y:3.1,z:-1.4,r:.17},{x:.8,y:-3.1,z:2.8,r:-.17},{x:3.4,y:1.3,z:-1.1,r:.31}];
const SPREAD=[{x:-.95,y:-.5,z:-1.1,r:-.16},{x:-.32,y:.62,z:.9,r:.1},{x:.34,y:-.66,z:-.5,r:-.1},{x:.9,y:.52,z:1.5,r:.16}];
const DEPTH=[.55,.9,1.25,1.75];
const expo=t=>t>=1?1:1-Math.pow(2,-10*t);
function introProg(i,now){if(intro.done)return 1;if(!intro.t0)return 0;const t=(now-intro.t0)/1000-(3-i)*intro.EACH;return clamp(t/intro.DUR)}
const introCopyAt=.85;// copy lands while the last layer is still settling

// ---- Renderer --------------------------------------------------------------------------------------
// geo(): where the focal point sits. In the live stage it is the phone slot's centre (so the scene
// orbits the phone); stills for reduced motion use a fixed composition.
function makeRenderer(cv,fx=null,geo=null){
  const c=cv.getContext('2d',{alpha:false});let W=1,H=1,fX=0,fY=0,U=1,XS=1,portrait=false;
  const bg=mk(2,2),bgc=bg.getContext('2d',{alpha:false});let bgKey='';
  function layout(){W=cv.width;H=cv.height;portrait=narrowMQ.matches;bg.width=Math.ceil(W/2);bg.height=Math.ceil(H/2);bgKey='';
    const g=geo&&geo();if(g&&g.h>0){const s=W/Math.max(1,g.vw);fX=g.cx*s;fY=g.cy*s;U=Math.min(g.h*s/2.3,portrait?W*.3:W*.19);XS=portrait?.74:1}
    else if(portrait){fX=W*.5;fY=H*.6;U=Math.min(W*.29,H*.15);XS=.74}else{fX=W*.69;fY=H*.5;U=Math.min(H*.28,W*.175);XS=1}}
  const D=5;let T=0;
  const k=(v,delay=0)=>{const i=Math.min(LAST-1,Math.floor(T));let f=T-i;if(delay>0){f=clamp((f-delay)/(1-delay));f=f*f*(3-2*f)}return v[i]+(v[i+1]-v[i])*f};
  const bump=()=>Math.sin(Math.PI*(T-Math.min(LAST-1,Math.floor(T))));
  let cam={x:0,y:0,z:0,roll:0},items=[],hits=[];
  function project(x,y,z){const d=D+z-cam.z;if(d<.3)return null;const s=D/d;const px=(x-cam.x)*s*U*XS,py=(y-cam.y)*s*U;const cr=Math.cos(cam.roll),sr=Math.sin(cam.roll);return{x:fX+px*cr-py*sr,y:fY+px*sr+py*cr,s,d}}
  function sprite(key,o){if(!img[key]||o.a<=.003)return;o.key=key;o.im=img[key];
    if(fx&&o.id){const s=FX.objs.get(o.id);if(s){const h=s.hov.x;o.w*=1+.09*h;o.x+=s.ox.x*o.w;o.y+=s.oy.x*o.w;o.z+=s.oz.x;o.hov=h;
      if(o.kind==='coin'){o.yaw=(o.yaw||0)+s.tx.x+s.flip.x;o.sheen=Math.max(h,clamp(Math.abs(s.flip.v)/8))}
      else if(o.kind==='m'){o.yaw=(o.yaw||0)+s.tx.x;o.rot=(o.rot||0)+s.ty.x}
      else if(o.kind==='spark'){o.rot=(o.rot||0)+s.flip.x+h*.5}
      else o.rot=(o.rot||0)+s.tx.x*.15}}
    items.push(o)}
  function blurFor(key,w){const set=img[key+'Blur'];if(!set)return null;for(const b of set)if(b.w0>=w*.5)return b;return set[set.length-1]}
  function drawSprite(it,g=c,q=1){const p=project(it.x,it.y,it.z);if(!p)return;
    const near=smooth(.45,1.6,p.d),haze=1-.4*smooth(3,11,it.z-cam.z);const a=it.a*near*haze;if(a<=.003)return;
    const w=it.w*p.s*U*q,h=w*it.im.height/it.im.width,r=(it.rot||0)+cam.roll,sx=it.yaw===undefined?1:Math.max(.06,Math.abs(Math.cos(it.yaw))),X=p.x*q,Y=p.y*q;
    if(it.shadow){const sw=w*1.1;g.setTransform(1,0,0,1,0,0);g.globalAlpha=a*it.shadow*(1-.4*(it.hov||0));g.drawImage(img.shadow,X-sw/2,Y+h*.5+w*.04-sw*.06,sw,sw*.25)}
    if(it.hov>.01&&img.halo){const hw=Math.max(w,h)*1.75;g.setTransform(1,0,0,1,0,0);g.globalAlpha=a*.6*it.hov;g.drawImage(img.halo,X-hw/2,Y-hw/2,hw,hw)}
    const b=it.blur||0;
    if(it.segs&&img.mSeg&&b<.02){drawSegs(it,p,a,w,h,r,sx,g)}
    else{const cr=Math.cos(r),sr=Math.sin(r);g.setTransform(cr*sx,sr*sx,-sr,cr,X,Y);
      const bl=b>.02?blurFor(it.key,w):null;
      if(bl){const f=w/bl.w0,bw=bl.width*f,bh=bl.height*f;if(b<.98){g.globalAlpha=a*(1-b);g.drawImage(it.im,-w/2,-h/2,w,h)}g.globalAlpha=a*b;g.drawImage(bl,-bw/2,-bh/2,bw,bh)}
      else{g.globalAlpha=a;g.drawImage(it.im,-w/2,-h/2,w,h)}}
    if(it.sheen>.02){g.save();g.beginPath();g.ellipse(0,0,w*.46,h*.46,0,0,TAU);g.clip();g.rotate(-.55);const pos=Math.sin(it.yaw||0)*w*.7;const lg=g.createLinearGradient(pos-w*.3,0,pos+w*.3,0);lg.addColorStop(0,'rgba(255,255,255,0)');lg.addColorStop(.5,'rgba(255,255,255,.75)');lg.addColorStop(1,'rgba(255,255,255,0)');g.globalAlpha=a*it.sheen;g.fillStyle=lg;g.fillRect(-w,-h,w*2,h*2);g.restore()}
    if(it.id&&a>.45&&b<.5)hits.push({id:it.id,kind:it.kind,label:it.label,x:p.x,y:p.y,rx:w*(it.kind==='m'?.4:.44)*Math.max(sx,.5),ry:h*.44,d:p.d})}
  // The four M layers. Each slice keeps its place inside the mark's own (rotated, yaw-squashed) frame,
  // then takes its own offset in scene space, so it is projected with its own depth.
  function drawSegs(it,p,a,w,h,r,sx,g){
    let total=0;for(const s of it.segs)total+=Math.abs(s.x)+Math.abs(s.y)+Math.abs(s.z)+Math.abs(s.r)+(1-s.a);
    if(total<.002){const cr=Math.cos(r),sr=Math.sin(r);g.setTransform(cr*sx,sr*sx,-sr,cr,p.x,p.y);g.globalAlpha=a;g.drawImage(it.im,-w/2,-h/2,w,h);return}
    for(let i=0;i<4;i++){const S=img.mSeg[i],o=it.segs[i];if(o.a<=.003)continue;
      const q=project(it.x+o.x,it.y+o.y,it.z+o.z);if(!q)continue;
      const kk=q.s/p.s,ww=w*kk,hh=h*kk,off=S.ox/it.im.width*ww*sx,sw=ww*S.fw,rr=r+o.r,c2=Math.cos(rr),s2=Math.sin(rr);
      g.setTransform(c2*sx,s2*sx,-s2,c2,q.x+Math.cos(r)*off,q.y+Math.sin(r)*off);g.globalAlpha=a*o.a*smooth(.45,1.6,q.d);g.drawImage(S.cv,-sw/2,-hh/2,sw,hh)}}
  function cover(g,im,alpha,scale,ox,oy,Wd,Hd){if(!im)return;const s=Math.max(Wd/im.width,Hd/im.height)*scale,w=im.width*s,h=im.height*s;g.globalAlpha=alpha;g.drawImage(im,(Wd-w)/2+ox,(Hd-h)/2+oy,w,h)}
  // GoodPrint ring, drawn around the phone.
  function ring(x,y,z,R,prog,a,hov){const p=project(x,y,z);if(!p)return;const al=a*smooth(.45,1.6,p.d);if(al<=.003)return;const r=R*p.s*U*(1+.03*hov),lw=U*p.s*.11;
    if(hov>.01&&img.halo){const hw=r*2.9;c.setTransform(1,0,0,1,0,0);c.globalAlpha=al*.45*hov;c.drawImage(img.halo,p.x-hw/2,p.y-hw/2,hw,hw)}
    c.setTransform(1,0,0,1,p.x,p.y);c.rotate(cam.roll);c.globalAlpha=al;
    c.lineCap='round';c.lineWidth=lw;c.strokeStyle='rgba(255,255,255,.85)';c.beginPath();c.arc(0,0,r,0,TAU);c.stroke();
    c.lineWidth=lw*.18;c.strokeStyle='rgba(74,82,98,.10)';c.beginPath();c.arc(0,0,r+lw*.5,0,TAU);c.stroke();c.beginPath();c.arc(0,0,r-lw*.5,0,TAU);c.stroke();
    if(prog>.004){let gr;if(c.createConicGradient){gr=c.createConicGradient(-Math.PI/2,0,0);gr.addColorStop(0,'#6DBCEC');gr.addColorStop(.3,'#8FCFA2');gr.addColorStop(.55,'#E2A7D4');gr.addColorStop(.8,'#8273EB');gr.addColorStop(1,'#4E4FE8')}else{gr=c.createLinearGradient(-r,0,r,0);gr.addColorStop(0,'#6DBCEC');gr.addColorStop(1,'#8273EB')}
      c.lineWidth=lw*.72;c.strokeStyle=gr;c.beginPath();c.arc(0,0,r,-Math.PI/2,-Math.PI/2+TAU*Math.min(prog,.999));c.stroke();
      const e=-Math.PI/2+TAU*prog;c.fillStyle='#fff';c.beginPath();c.arc(Math.cos(e)*r,Math.sin(e)*r,lw*.24,0,TAU);c.fill()}
    c.setTransform(1,0,0,1,0,0);if(al>.45)hits.push({id:'ring',kind:'ring',label:['GoodPrint','Personal progress, play by play.'],x:p.x,y:p.y,rx:r+lw,ry:r+lw,d:p.d,ring:r-lw})}
  function backdrop(mid){const key=T.toFixed(4)+'|'+cam.x.toFixed(4)+'|'+cam.y.toFixed(4)+'|'+cam.z.toFixed(3);
    if(key!==bgKey){bgKey=key;const g=bgc,Wd=bg.width,Hd=bg.height;g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.fillStyle='#F6F7F2';g.fillRect(0,0,Wd,Hd);
      cover(g,img.wash,1,1,0,0,Wd,Hd);
      cover(g,img.grad,k([.34,.42,.3,.46]),1.18+mid*.04,(-cam.x*U*.25+Math.sin(T*1.3)*W*.02)/2,-cam.y*U*.125,Wd,Hd);
      const rg=g.createRadialGradient(fX/2,fY/2,0,fX/2,fY/2,U*1.7);rg.addColorStop(0,'rgba(255,255,255,.75)');rg.addColorStop(.55,'rgba(255,255,255,.28)');rg.addColorStop(1,'rgba(255,255,255,0)');g.globalAlpha=1;g.fillStyle=rg;g.fillRect(0,0,Wd,Hd);
      for(const o of [{key:'glow',im:img.glow,x:k([.2,-.1,.1,0]),y:k([.1,0,.05,0]),z:6,w:k([9,10,8,11]),a:k([.8,.7,.45,.95]),rot:k([0,.3,-.2,.1])},{key:'bloom',im:img.bloom,x:k([-2.4,2.6,-2.8,2.2]),y:k([1.6,-1.3,1.2,-1.6]),z:9,w:7,a:.55}])if(o.im)drawSprite(o,g,.5);
      g.setTransform(1,0,0,1,0,0)}
    c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.imageSmoothingQuality='low';c.drawImage(bg,0,0,W,H);c.imageSmoothingQuality='high'}

  const MISS=['gift','hand','msg','stars','target'],STAT=['run','don','moves'];
  const COINS=[['gold',-1.55,-.95,5.5,.62],['silver',1.75,-.75,4.5,.58],['gold',1.3,1.05,3.2,.48],['silver',-1.2,1.0,6.5,.6],['gold',2.3,.1,7,.7],['silver',-.4,-1.5,8,.5],['gold',-2.3,.3,8.5,.6]];
  const coinLabel=['MAS points',coarse?'Tap to flip.':'Click to flip.'];
  // Burst slots around the phone on the rewards chapter (angle, radius), chosen to clear the phone body.
  const BURST=[[-1.12,-1.05],[1.3,-1.22],[1.66,-.38],[-1.1,.85],[1.02,1.32],[.62,-1.5],[-.72,1.42]];

  function drawScene(cur,time=0,now=0,segFx=null){
    T=clamp(cur/SEG,0,TMAX);const mid=bump(),segI=Math.min(LAST-1,Math.floor(T)),dirRoll=segI%2?-1:1,idle=(ph,amp=.018)=>Math.sin(time*.9+ph)*amp,ch=Math.round(T),atStop=Math.abs(T-ch)<.12;
    const px=fx?FX.par.x.x:0,py=fx?FX.par.y.x:0;
    cam={x:k([0,.05,-.05,0])+px*.16,y:k([0,.03,-.03,0])+py*.1,z:k([0,.1,-.1,.15])+mid*1.1,roll:dirRoll*mid*.045+px*.012};
    items=[];hits=[];
    backdrop(mid);
    sprite('gpGlow',{x:0,y:0,z:k([5,4,2.5,4]),w:k([4,4.4,5.2,4.4]),a:k([0,.35,.9,.25],.2)});
    const my0=portrait?.95:0;
    // Chrome M: assembled hero of chapter 1, then a far presence behind the phone.
    const mz=k([0,6,7.5,7],.05)+mid*.4;
    const segs=[0,1,2,3].map(i=>{const e=expo(introProg(i,now)),S=START[i],P=SPREAD[i],sp=T<1?Math.sin(Math.PI*T)*1.1:0,near=1-smooth(0,.45,T),d=DEPTH[i],sf=segFx?segFx[i]:null;
      return{x:S.x*(1-e)+P.x*sp+(px*.1*d)*near+(sf?sf.x.x:0),y:S.y*(1-e)+P.y*sp+(py*.07*d)*near+(sf?sf.y.x:0),z:S.z*(1-e)+P.z*sp+(-.12*d*Math.hypot(px,py))*near,r:S.r*(1-e)+P.r*sp+(px*.03*(d-1.1))*near+(sf?sf.r.x:0),a:clamp(e*1.6)}});
    sprite('m',{id:'m',kind:'m',label:['MASii','Hover to fan the layers. Click to bounce them.'],segs,x:k([0,1.55,1.75,-1.55],.05),y:k([-.08+my0,-1.3,-1.35,-1.2],.05)+idle(0),z:mz,w:k([2.55,1.6,1.4,1.5],.05),rot:k([-.07,.12,.18,-.12],.05)+mid*.18*dirRoll,yaw:k([.38,.9,1.1,.6],.05)+Math.sin(time*.5)*.05,a:k([1,.7,.45,.45]),shadow:k([.9,0,0,0]),blur:smooth(3,6.5,mz)});
    sprite('orbit',{x:0,y:k([.12+my0,.1,0,0]),z:k([.2,.4,4,4]),w:k([3.1,3.3,3,3]),rot:k([-.12,.18,0,0]),a:k([.9,.9,0,0])});

    // Mission icons: orbit the phone as example causes (ch2), then sweep past the camera.
    MISS.forEach((key,i)=>{const d=i*.06,base=-Math.PI/2+.32+i*TAU/5;
      const ang=k([base-1.7,base,base+1.1,base+1.1],d)+time*.035*k([0,1,0,0]);
      const rx=k([3.2,1.9,2.6,2.6],d),ry=k([1.6,1.3,1.4,1.4],d),zc=k([10,.25,-4.6,10],d);
      sprite(key,{id:atStop?key:null,kind:'icon',label:[CAUSES[key],'Example cause · employer-approved'],x:Math.cos(ang)*rx,y:Math.sin(ang)*ry+idle(i*1.3),z:zc+Math.sin(ang)*k([1,.5,.6,.6],d),w:k([.9,.8,1.2,.8],d),a:k([0,1,1,0],d),rot:Math.sin(ang)*.06})});
    // Stat icons: orbit the GoodPrint ring (ch3), fly past the camera as the rewards burst.
    const statPos=[[1.3,-.95],[1.42,.62],[-1.3,.92]];
    STAT.forEach((key,i)=>{const d=.08+i*.06;
      sprite(key,{id:atStop?key:null,kind:'icon',label:[STATS[key],'Tracked in your GoodPrint.'],x:k([statPos[i][0]*2.4,statPos[i][0]*2.4,statPos[i][0],statPos[i][0]*2.2],d),y:k([statPos[i][1]*2,statPos[i][1]*2,statPos[i][1],statPos[i][1]*2],d)+idle(4+i),z:k([11,11,-.15,-4.6],d),w:k([.5,.5,.58,.6],d)*(key==='don'?.82:1),a:k([0,0,1,0],d),rot:k([0,0,-.08+i*.08,.3],d)})});

    const ringZ=k([9,9,.05,-4.4],.04),ringA=k([0,0,1,0],.04);
    sprite('heart',{id:'heart',kind:'obj',label:['Recognition','Milestones, consistency and generosity.'],x:k([1.6,-1.6,1.4,1.36],.1),y:k([-.9,1.1,-1,.5],.1)+idle(2),z:k([11,11,11,.25],.1),w:k([.9,.9,.9,.86],.1),rot:k([.2,.2,.2,-.12],.1)+mid*.25,a:k([0,0,0,1],.1),shadow:k([0,0,0,.7])});
    sprite('confetti',{x:0,y:k([-.3,-.3,-.3,-.2]),z:k([6,6,6,.9]),w:k([3,3,3,4.8]),a:k([0,0,0,.95],.2)});

    // Coins: bokeh around the M, then a flipping burst around the phone on the rewards chapter.
    COINS.forEach(([key,x0,y0,z0,w0],i)=>{const d=i*.035,[bx,by]=BURST[i];
      const z=k([z0,z0+2,z0+3,-.35+(i%3)*.5],d);
      sprite(key,{id:'coin'+i,kind:'coin',label:coinLabel,x:k([x0,x0*1.3,x0*1.5,bx],d),y:k([y0+my0*.8,y0*1.25,y0*1.4,by],d)+idle(i*.9,.025),z,w:k([w0,w0,w0,.4+(i%3)*.06],d),
        yaw:k([i*.11,.2+i*.07,.1+i*.09,.3+i*.06+TAU],d),rot:k([.2-i*.08,.1,0,-.3+i*.1],d),a:k([.95,.7,.45,1],d),blur:smooth(1.6,4.5,z)})});

    const SP=[['spark',[.95,-.62+my0,-.3,.42],[1.45,-1.25,.5,.28],[-1.2,-1.3,.2,.3],[-1.2,-1.42,-.2,.42]],
              ['spark',[-1.15,.55+my0,1.2,.26],[-1.45,.55,.8,.22],[-1.3,.15,.5,.24],[-1.25,.3,.3,.34]],
              ['spark',[1.9,.7+my0,2.5,.2],[.85,-1.45,1.2,.2],[.9,-1.5,1.0,.18],[.9,1.45,.4,.3]],
              ['star',[-.85,-.62+my0,.4,.55],[-1.2,-.95,.6,.48],[1.2,1.18,.3,.44],[-.85,-1.3,.2,.5]],
              ['star',[.6,.85+my0,1.6,.38],[1.6,.5,1.2,.4],[-1.0,1.4,1.8,.35],[1.7,-.75,.8,.44]]];
    SP.forEach(([key,...P],i)=>{const d=.12+i*.05,tw=1+Math.sin(time*2.2+i*1.7)*.07;
      sprite(key,{id:key==='spark'?'sp'+i:null,kind:'spark',x:k(P.map(p=>p[0]),d),y:k(P.map(p=>p[1]),d)+idle(i*2.1,.03),z:k(P.map(p=>p[2]),d)+mid*(i%2?1.5:-.6),w:k(P.map(p=>p[3]),d)*tw,rot:Math.sin(time*.6+i)*.12+mid*dirRoll*.5,a:k(key==='star'?[1,.9,.9,1]:[1,.95,.9,1],d),blur:key==='spark'?smooth(1.4,3,k(P.map(p=>p[2]),d)):0})});

    const rs=fx?FX.objs.get('ring'):null,rh=rs?rs.hov.x:0;
    items.push({ring:true,z:ringZ-(rs?.3*rh:0)});
    items.sort((a,b)=>b.z-a.z);
    for(const it of items){if(it.ring)ring(0,idle(9,.01),ringZ-.3*rh,1.36,k([0,0,.68,1],.12)+.14*rh*ringA+(fx?FX.ringBoost||0:0)*ringA,ringA,rh);else drawSprite(it)}
    if(fx)drawParticles();
    c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;
    if(fx)FX.hits=hits}
  function drawParticles(){for(const p of FX.parts){const a=clamp(p.life/p.max);if(p.key&&img[p.key]){const im=img[p.key],w=p.size,h=w*im.height/im.width,sx=p.flip?Math.max(.08,Math.abs(Math.cos(p.rot*1.6))):1;c.setTransform(Math.cos(p.rot)*sx,Math.sin(p.rot)*sx,-Math.sin(p.rot),Math.cos(p.rot),p.x,p.y);c.globalAlpha=a;c.drawImage(im,-w/2,-h/2,w,h)}else{c.setTransform(1,0,0,1,0,0);c.globalAlpha=a*.9;c.fillStyle=p.col;c.beginPath();c.arc(p.x,p.y,p.size*.5*(.5+.5*a),0,TAU);c.fill()}}}
  return{layout,drawScene,resize(w,h){cv.width=w;cv.height=h;layout()}};
}

// ---- Phone slot geometry (layout values only: never affected by the stage's stacking scale) -------
const slotGeo=()=>({cx:slot.offsetLeft+slot.offsetWidth/2,cy:slot.offsetTop+slot.offsetHeight/2,h:slot.offsetHeight,w:slot.offsetWidth,vw:stage.offsetWidth});

// ---- Deck state ------------------------------------------------------------------------------------
const film=makeRenderer(canvas,FX,slotGeo);
let cur=0,vel=0,stop=0,shown=-2,navAt=-1,lastTime=0,raf=0,staticMode=reduce.matches,viewH=innerHeight;
let quality=1,glideDeltas=[],wasSettled=true;
const metrics={draws:0,drawMs:[],ticks:0};
const settled=()=>Math.abs(STOPS[stop]-cur)<.25&&Math.abs(vel)<.8;
const landing=()=>Math.abs(STOPS[stop]-cur)<3;
// A native scroll runway keeps wheel, touch, keyboard and scrollbar in sync.
const frame=document.createElement('div');frame.className='story-frame';
if(!staticMode){while(story.firstChild)frame.appendChild(story.firstChild);story.appendChild(frame);story.style.height=`${(LAST+1)*100}svh`;}
const storyTop=()=>story.getBoundingClientRect().top+scrollY;
const storyOffset=()=>Math.max(0,scrollY-storyTop());
const stageVisible=()=>storyOffset()<(LAST+1)*viewH;
function syncScroll(){
  if(staticMode)return;
  const next=clamp(Math.floor(storyOffset()/Math.max(1,viewH)+.35),0,LAST);
  if(next!==stop){stop=next;FX.tapId=null;sceneDirty=true;}
  wake();
}
const counted=new Set();
function countUp(el,dur=1500){const to=parseFloat(el.dataset.count),dec=+el.dataset.dec||0,f=v=>v.toLocaleString('en-US',{minimumFractionDigits:dec,maximumFractionDigits:dec});if(staticMode){el.textContent=f(to);return}const t0=performance.now();const st=t=>{const q=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-q,3);el.textContent=f(to*e);if(q<1)requestAnimationFrame(st)};el.textContent=f(0);requestAnimationFrame(st)}
function present(chapter){if(chapter===shown)return;shown=chapter;sections.forEach((el,i)=>{const on=i===chapter;el.classList.toggle('on',on);el.inert=!on;el.setAttribute('aria-hidden',String(!on))});
  if(chapter>=0&&!counted.has(chapter)){counted.add(chapter);sections[chapter].querySelectorAll('[data-count]').forEach((el,i)=>setTimeout(()=>countUp(el),250+i*90))}}
const ui={};const setUI=(k,v,fn)=>{if(ui[k]!==v){ui[k]=v;fn(v)}};
const introGate=()=>intro.done||(intro.t0&&(performance.now()-intro.t0)/1000>introCopyAt);
function paintUI(){
  const tgt=STOPS[stop],from=STOPS[cur<tgt?Math.max(0,stop-1):Math.min(LAST,stop+1)],seg=Math.max(1,Math.abs(tgt-from)),remaining=Math.abs(tgt-cur);
  present(!introGate()?-1:remaining<=seg*ARRIVE||settled()?stop:-1);
  if(navAt!==stop){navAt=stop;navLinks.forEach((a,i)=>{if(i===stop)a.setAttribute('aria-current','step');else a.removeAttribute('aria-current')})}
  setUI('prog',(cur/STOPS[LAST]).toFixed(3),v=>bar.style.setProperty('--progress',v));
  const overflow=Math.max(0,storyOffset()-LAST*viewH);setUI('barO',(1-clamp(overflow/(viewH*.35))).toFixed(2),v=>bar.style.opacity=v);setUI('barP',overflow>viewH*.2,v=>bar.style.pointerEvents=v?'none':'');
  const rel=stop===LAST&&settled();setUI('rel',rel&&overflow<2,v=>cue.classList.toggle('release',v));setUI('cue',rel,v=>cueText.textContent=v?'Scroll to continue':'Scroll for next');
  setUI('ta','auto',v=>stage.style.touchAction=v);
  paintPhones()}

// ---- Phones: card-deck handoff, driven by the same spring as the film -----------------------------
const phState=phones.map(()=>({s:'',v:null}));
function paintPhones(){const T=cur/SEG,tx=FX.par.x.x,ty=FX.par.y.x;
  phones.forEach((el,j)=>{const i=j+1,p=T-i;let tf,op,vis=true;
    if(p<=-1||p>=1){vis=false;op=0;tf='translate3d(0,70%,0)'}
    else if(p<=0){const e=smooth(0,1,1+p),u=1-e;op=clamp(e*4);
      tf=`translate3d(${(u*16).toFixed(2)}%,${(u*78).toFixed(2)}%,0) rotateX(${(u*24).toFixed(2)}deg) rotateZ(${(u*7).toFixed(2)}deg) scale(${(.9+.1*e).toFixed(4)})`}
    else{const e=smooth(0,.85,p);op=clamp(1-e*1.1);
      tf=`translate3d(${(-e*30).toFixed(2)}%,${(-e*9).toFixed(2)}%,0) rotateY(${(e*22).toFixed(2)}deg) rotateZ(${(-e*8).toFixed(2)}deg) scale(${(1-e*.16).toFixed(4)})`}
    const act=Math.abs(p)<.5;if(vis&&act){const w=1-Math.abs(p)*2;tf+=` rotateY(${(tx*9*w).toFixed(2)}deg) rotateX(${(-ty*7*w).toFixed(2)}deg)`}
    const st=phState[j],key=tf+op.toFixed(3);if(st.s!==key){st.s=key;el.style.transform=tf;el.style.opacity=op.toFixed(3)}
    if(st.v!==(vis&&act)){st.v=vis&&act;el.classList.toggle('live',st.v);el.inert=!st.v}});
  const n=clamp(Math.round(T),1,3);setUI('phOn',T>.55,v=>phSteps.classList.toggle('on',v));
  setUI('phN',n,v=>{phCount.textContent=v;phLabel.textContent=STEP_LABEL[v];phBars.forEach((b,i)=>b.classList.toggle('on',i<v))})}

// ---- Interaction update ----------------------------------------------------------------------------
const dprNow=()=>canvas.width/Math.max(1,stage.offsetWidth);
let phRect=null;// the phone's footprint in canvas px: the scene behind it is not hoverable
function hitAt(x,y){const T=cur/SEG;if(phRect&&T>.5&&x>phRect[0]&&x<phRect[2]&&y>phRect[1]&&y<phRect[3])return null;
  let best=null;for(const h of FX.hits){const dx=(x-h.x)/h.rx,dy=(y-h.y)/h.ry;if(dx*dx+dy*dy<=1&&(!h.ring||Math.hypot(x-h.x,y-h.y)>h.ring)&&(!best||h.d<best.d))best=h}return best}
function updateFX(dt,now){
  const live=FX.inside&&landing()&&introGate();const tapLive=FX.tapId&&now<FX.tapUntil;if(!tapLive)FX.tapId=null;
  const hov=tapLive?FX.hits.find(h=>h.id===FX.tapId)||null:live?hitAt(FX.px,FX.py):null;FX.hover=hov;
  const seen=new Set(),W=canvas.width,H=canvas.height;
  for(const h of FX.hits){seen.add(h.id);const o=fxObj(h.id),dx=FX.px-h.x,dy=FX.py-h.y,dist=Math.hypot(dx,dy),R=Math.max(h.rx,h.ry)*2.6+90*dprNow();
    const prox=live?smooth(R,0,dist):0,on=hov&&hov.id===h.id?1:0;
    o.hov.t=on;
    if(h.kind==='m'){o.tx.t=live?clamp(dx/(W*.35),-1,1)*.42:0;o.ty.t=live?clamp(dy/(H*.4),-1,1)*.09:0;o.oz.t=-.25*prox;o.ox.t=o.oy.t=0}
    else if(h.kind==='ring'){o.ox.t=o.oy.t=o.tx.t=0;o.oz.t=0}
    else{o.ox.t=clamp(dx/(h.rx*3),-1,1)*.07*prox;o.oy.t=clamp(dy/(h.ry*3),-1,1)*.07*prox;o.oz.t=-(h.kind==='coin'?.45:.3)*Math.max(prox*.6,on);
      o.tx.t=h.kind==='coin'?clamp(dx/(h.rx*2),-1,1)*.85*prox:clamp(dx/(h.rx*3),-1,1)*prox}}
  for(const [id,o] of FX.objs)if(!seen.has(id)){o.hov.t=0;o.ox.t=o.oy.t=o.oz.t=o.tx.t=o.ty.t=0}
  FX.par.x.t=FX.inside?(FX.px/W-.5)*2:0;FX.par.y.t=FX.inside?(FX.py/H-.5)*2:0;
  let moving=false;
  for(const o of FX.objs.values()){moving=stepSp(o.hov,dt,11)|moving;moving=stepSp(o.flip,dt,5.5)|moving;moving=(stepSp(o.oz,dt,8)&&Math.abs(o.oz.v)>.05)|moving;stepSp(o.ox,dt,8);stepSp(o.oy,dt,8);stepSp(o.tx,dt,7);stepSp(o.ty,dt,7)}
  for(const s of FX.seg){moving=stepBounce(s.x,dt,7,.32)|moving;moving=stepBounce(s.y,dt,7,.32)|moving;moving=stepBounce(s.r,dt,7,.32)|moving}
  if(FX.ringBoostT!==undefined){const d=FX.ringBoostT-(FX.ringBoost||0);FX.ringBoost=(FX.ringBoost||0)+d*Math.min(1,dt*5);if(Math.abs(d)>.002)moving=true}
  moving=(stepSp(FX.par.x,dt,3.2)&&Math.abs(FX.par.x.v)>.002)|moving;moving=(stepSp(FX.par.y,dt,3.2)&&Math.abs(FX.par.y.v)>.002)|moving;
  const g=900*dprNow();FX.parts=FX.parts.filter(p=>(p.life-=dt)>0);for(const p of FX.parts){p.vy+=g*dt*.35;p.vx*=1-1.6*dt;p.vy*=1-1.6*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.rot+=p.vr*dt}
  if(FX.parts.length)moving=true;
  setUI('cur',hov&&!tapLive?'pointer':'',v=>stage.style.cursor=v);
  paintTip(hov);
  return moving}
let tipId=null;
function paintTip(h){const show=h&&h.label&&(h.kind!=='coin'||!PHONE);if(!show){if(tipId!==null){tipId=null;tip.classList.remove('on')}return}
  if(tipId!==h.id+h.label[0]){tipId=h.id+h.label[0];tip.firstElementChild.textContent=h.label[0];tip.lastElementChild.textContent=h.label[1]}
  const s=dprNow();const x=h.x/s,y=(h.y-h.ry)/s;const hw=(tip.offsetWidth||180)/2+12;tip.style.transform=`translate3d(${Math.round(clamp(x,hw,stage.offsetWidth-hw))}px,${Math.round(Math.max(76,y-10))}px,0)`;
  tip.classList.add('on')}
function burst(x,y,n=14,opt={}){const s=dprNow(),cols=['#8273EB','#6DBCEC','#E29CCF','#FFBE22','#9ED8B1'];for(let i=0;i<n;i++){const a=opt.up?-Math.PI/2+(Math.random()-.5)*2.6:Math.random()*TAU,sp=(opt.speed||1)*(260+Math.random()*420)*s;const coin=opt.coins&&i%3===0,spark=!coin&&i%3===0;
  FX.parts.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-180*s,rot:Math.random()*TAU,vr:(Math.random()-.5)*(coin?10:8),life:.9+Math.random()*.5,max:1.1,size:(coin?44+Math.random()*20:spark?26+Math.random()*16:7+Math.random()*7)*s,key:coin?(i%2?'gold':'silver'):spark?'spark':null,flip:coin,col:cols[i%cols.length]})}}
function activate(h){const o=fxObj(h.id);
  if(h.kind==='coin'){o.flip.t+=TAU*(Math.random()<.5?1:-1);burst(h.x,h.y,16)}
  else if(h.kind==='spark'){o.flip.t+=TAU;burst(h.x,h.y,8)}
  else if(h.kind==='m'){FX.seg.forEach((s,i)=>{s.x.v+=(i-1.5)*1.9;s.y.v+=(i%2?-1:1)*1.4;s.r.v+=(i-1.5)*.5});burst(h.x,h.y,10)}
  else{o.oz.v-=5;if(h.kind!=='icon'||h.id==='heart')burst(h.x,h.y,10)}
  wake()}

function tick(t){raf=0;if(document.hidden||staticMode)return;const dt=Math.min(.05,lastTime?(t-lastTime)/1000:.0167);if(lastTime&&!settled())glideDeltas.push(t-lastTime);lastTime=t;metrics.ticks++;
  const tgt=STOPS[stop];
  if(!settled()){const om=stop===LAST&&cur<tgt?OMEGA*1.25:OMEGA;const displacement=cur-tgt, impulse=vel+om*displacement, decay=Math.exp(-om*dt);cur=tgt+(displacement+impulse*dt)*decay;vel=(vel-om*impulse*dt)*decay;if(Math.abs(tgt-cur)<.25&&Math.abs(vel)<.8){cur=tgt;vel=0}}
  const now=performance.now();
  if(assetsReady&&!intro.t0&&!intro.done)intro.t0=now;
  const introLive=!intro.done&&intro.t0&&(now-intro.t0)/1000<intro.DUR+3*intro.EACH+.1;if(intro.t0&&!introLive&&!intro.done){intro.done=true;stage.classList.add('assembled')}
  const fxMoving=assetsReady?updateFX(dt,now):false;
  paintUI();
  const pointerAlive=now-FX.lastMove<1400;
  if(assetsReady&&stageVisible()){FX.clock+=dt;const a=performance.now();film.drawScene(cur,FX.clock,now,FX.seg);const ms=performance.now()-a;metrics.draws++;metrics.drawMs.push(ms);if(metrics.drawMs.length>240)metrics.drawMs.shift();stage.classList.add('ready');sceneDirty=false}
  const isSettled=settled();if(isSettled&&!wasSettled)adapt();wasSettled=isSettled;
  if(stageVisible()&&(!isSettled||fxMoving||pointerAlive||sceneDirty||introLive||!introGate()))wake();else lastTime=0}
function wake(){if(!raf&&!staticMode&&!document.hidden)raf=requestAnimationFrame(tick)}
function adapt(){if(glideDeltas.length<20){glideDeltas=[];return}const a=[...glideDeltas].sort((x,y)=>x-y),p80=a[Math.floor(a.length*.8)];glideDeltas=[];if(p80>21&&quality>.72){quality=Math.max(.7,quality-.15);lastW=0;measure()}}
let lastW=0,lastH=0;
function measure(){const w=stage.offsetWidth,h=stage.offsetHeight;viewH=h||innerHeight;if(lastW&&w===lastW&&(h===lastH||(Math.abs(h-lastH)<120&&PHONE)))return;
  lastW=w;lastH=h;const dpr=Math.min(devicePixelRatio||1,PHONE?1.25:2)*quality;film.resize(Math.round(w*dpr),Math.round(h*dpr));
  const s=canvas.width/Math.max(1,w);phRect=[slot.offsetLeft*s,slot.offsetTop*s,(slot.offsetLeft+slot.offsetWidth)*s,(slot.offsetTop+slot.offsetHeight)*s];sceneDirty=true;wake()}

// ---- Gestures --------------------------------------------------------------------------------------
function setStop(i){
  i=clamp(i,0,LAST);
  if(staticMode){sections[i].scrollIntoView({block:'start'});return;}
  window.scrollTo({top:storyTop()+i*viewH,behavior:'smooth'});
}
// Scrolling is browser-owned; there are no cancelling wheel/touch/key handlers.
function toCanvas(e){const r=stage.getBoundingClientRect(),s=canvas.width/Math.max(1,r.width);return[(e.clientX-r.left)*s,(e.clientY-r.top)*s]}
const onScene=e=>!!(e.target.closest&&e.target.closest('.stage'))&&!e.target.closest('.ph,.ph-steps,button,a');
addEventListener('pointermove',e=>{if(staticMode||e.pointerType==='touch')return;const inStage=!!(e.target.closest&&e.target.closest('.stage,.chapter'))&&stageVisible();[FX.px,FX.py]=toCanvas(e);FX.inside=inStage;FX.lastMove=performance.now();wake()},{passive:true});
document.documentElement.addEventListener('pointerleave',()=>{FX.inside=false;wake()});
let down=null;
addEventListener('pointerdown',e=>{if(staticMode||!onScene(e))return;down={x:e.clientX,y:e.clientY,t:performance.now(),type:e.pointerType}},{passive:true});
addEventListener('pointerup',e=>{if(!down)return;const d=down;down=null;if(Math.hypot(e.clientX-d.x,e.clientY-d.y)>10||performance.now()-d.t>450||!landing())return;
  const [x,y]=toCanvas(e);const h=hitAt(x,y);if(!h)return;if(d.type==='touch'){FX.px=x;FX.py=y;FX.tapId=h.id;FX.tapUntil=performance.now()+1600}FX.lastMove=performance.now();activate(h)},{passive:true});
addEventListener('pointercancel',()=>{down=null},{passive:true});

addEventListener('scroll',()=>{if(staticMode)return;FX.inside=false;syncScroll();paintUI()},{passive:true});
const API={scrollTo:null};
$$('a[href^="#"]:not([data-chapter])').forEach(a=>a.addEventListener('click',e=>{const t=document.querySelector(a.getAttribute('href'));if(!t||t.closest('.chapter'))return;e.preventDefault();wake();if(API.scrollTo)API.scrollTo(t);else t.scrollIntoView({behavior:staticMode?'instant':'smooth',block:'start'})}));
$$('[data-chapter]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();const i=+a.dataset.chapter;if(staticMode){sections[i].scrollIntoView({block:'start'});return}setStop(i)}));

// ---- Phone app interactions (each one also answers in the scene) ----------------------------------
function phoneBurst(opt){const r=slot.getBoundingClientRect(),s=dprNow();burst((r.left+r.width/2)*s,(r.top+r.height*.62)*s,opt.n||16,opt);FX.lastMove=performance.now();wake()}
$$('.cause').forEach(b=>b.addEventListener('click',()=>{$$('.cause').forEach(x=>{const on=x===b;x.classList.toggle('is-on',on);x.setAttribute('aria-checked',String(on))});const cta=$('[data-act="cause"] span');cta.textContent='Choose this cause';cta.parentElement.classList.remove('done')}));
let plays=3;
$$('.app-cta').forEach(b=>b.addEventListener('click',()=>{const act=b.dataset.act,lab=b.querySelector('span');
  if(act==='cause'){lab.textContent='Cause chosen ✓';b.classList.add('done');phoneBurst({n:12,up:true,speed:.9})}
  else if(act==='play'){plays=Math.min(7,plays+1);$$('.week i').forEach((d,i)=>{d.classList.toggle('on',i<plays);d.classList.toggle('pop',i===plays-1)});setTimeout(()=>$$('.week i.pop').forEach(d=>d.classList.remove('pop')),450);$('.gp-n').textContent=plays;$('.gp').style.setProperty('--gp',(plays/7).toFixed(3));const pop=$('.mas-pop');pop.classList.remove('go');void pop.offsetWidth;pop.classList.add('go');
    FX.ringBoostT=Math.min(.3,(plays-3)*.08);lab.textContent=plays>=7?'Week complete ✓':'Complete Play';phoneBurst({n:14,up:true})}
  else if(act==='drop'){lab.textContent='You’re in. Good luck.';b.classList.add('done');phoneBurst({n:21,coins:true,up:true,speed:1.15})}}));

// ---- Line-mask reveal (Concept B's splitter), shared with stack.js ------------------------------
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
function tokenize(el){const out=[];el.childNodes.forEach(n=>{if(n.nodeName==='BR')out.push({br:true});else if(n.nodeType===3)n.textContent.split(/\s+/).filter(Boolean).forEach(w=>out.push({w,g:false}));else if(n.nodeType===1){const g=n.classList.contains('grad-text');n.textContent.split(/\s+/).filter(Boolean).forEach(w=>out.push({w,g}))}});return out}
function split(el){const width=el.clientWidth;if(el._splitWidth===width&&el.classList.contains('split'))return[...el.querySelectorAll('.ln-i')];el._splitWidth=width;if(!el._src)el._src=el.innerHTML;el.innerHTML=el._src;const toks=tokenize(el);
  el.innerHTML=toks.map(t=>t.br?'<br>':`<span class="w">${esc(t.w)}</span>`).join(' ');const ws=[...el.querySelectorAll('.w')],lines=[];let last=null,k=0;
  toks.forEach(t=>{if(t.br){last=null;return}const top=Math.round(ws[k++].offsetTop);if(last===null||Math.abs(top-last)>4){lines.push([]);last=top}lines[lines.length-1].push(t)});
  el.innerHTML=lines.map((line,li)=>{let html='',inG=false;line.forEach((t,i)=>{if(t.g&&!inG){html+=(i?' ':'')+'<span class="grad-text">';inG=true}else if(!t.g&&inG){html+='</span> ';inG=false}else if(i)html+=' ';html+=esc(t.w)});if(inG)html+='</span>';return `<span class="ln"><span class="ln-i" style="--li:${li}">${html}</span></span>`}).join('');
  el.classList.add('split');return[...el.querySelectorAll('.ln-i')]}
window.splitLines=split;
let splitW=0;
const splitChapters=async()=>{
  if(innerWidth===splitW)return;
  const width=splitW=innerWidth;
  for(const sec of sections){let i=0;for(const el of sec.querySelectorAll('.lines')){
    await yieldWork();if(width!==splitW)return;
    split(el).forEach(l=>l.style.setProperty('--li',i++));
  }}
};
(document.fonts?document.fonts.ready:Promise.resolve()).then(splitChapters);

// ---- Reduced motion: static chapters, each with its own still and its own phone -------------------
let stills=null;
function paintStills(){if(!assetsReady)return;stills=stills||sections.map(s=>makeRenderer(s.querySelector('.still')));const dpr=Math.min(devicePixelRatio||1,PHONE?1.25:2);sections.forEach((s,i)=>{const r=s.getBoundingClientRect();stills[i].resize(Math.round(r.width*dpr),Math.round(r.height*dpr));stills[i].drawScene(STOPS[i],0,0,null)})}
function motionPreference(){staticMode=reduce.matches;document.body.classList.toggle('static-mode',staticMode);
  if(staticMode){if(raf){cancelAnimationFrame(raf);raf=0}intro.done=true;sections.forEach(el=>{el.inert=false;el.removeAttribute('aria-hidden');el.classList.add('on')});
    phones.forEach((p,j)=>{let w=sections[j+1].querySelector('.ph-static');if(!w){w=document.createElement('div');w.className='ph-static';sections[j+1].appendChild(w)}w.appendChild(p);p.style.transform='';p.style.opacity='';p.inert=false});
    sections.forEach(s=>s.querySelectorAll('[data-count]').forEach(el=>countUp(el)));loadAll.then(paintStills)}
  else{shown=-2;measure();paintUI();wake()}}
if('ResizeObserver'in window)new ResizeObserver(()=>{if(!staticMode)measure()}).observe(stage);
addEventListener('resize',()=>{splitChapters();if(staticMode)paintStills();else {measure();syncScroll();}});
reduce.addEventListener('change',()=>location.reload());
document.addEventListener('visibilitychange',()=>{lastTime=0;if(!document.hidden)wake()});
if('scrollRestoration'in history)history.scrollRestoration='manual';
const hashIndex=sections.findIndex(s=>'#'+s.id===location.hash);
let deepTarget=null;try{deepTarget=location.hash&&hashIndex<0?document.getElementById(decodeURIComponent(location.hash.slice(1))):null}catch{}
if(deepTarget){stop=LAST;cur=STOPS[LAST];intro.done=true;setTimeout(()=>deepTarget.scrollIntoView({block:'start'}),0)}else{window.scrollTo(0,0);if(hashIndex>0){stop=hashIndex;cur=STOPS[hashIndex];intro.done=true}}
FX.lastMove=performance.now();
loadA.then(()=>{sceneDirty=true;wake()});loadAll.then(()=>{sceneDirty=true;wake();if(staticMode)paintStills()});
motionPreference();
if(hashIndex>0){if(staticMode)sections[hashIndex].scrollIntoView({block:'start'});else window.scrollTo(0,storyTop()+hashIndex*viewH);}
window.deck=Object.assign(API,{getState:()=>{const a=[...metrics.drawMs].sort((x,y)=>x-y);return{cur,vel,stop,shown,settled:settled(),phone:PHONE,reduced:staticMode,assetsReady,intro:intro.done,quality,canvas:[canvas.width,canvas.height],looping:!!raf,draws:metrics.draws,ticks:metrics.ticks,drawP95:a.length?+a[Math.floor(a.length*.95)].toFixed(2):0,hover:FX.hover&&FX.hover.id,hits:FX.hits.map(h=>({id:h.id,x:Math.round(h.x/dprNow()),y:Math.round(h.y/dprNow())}))}},go:i=>setStop(i),LAST,released:()=>stop===LAST&&settled()});
window.chapterDeck=window.deck;
})();
