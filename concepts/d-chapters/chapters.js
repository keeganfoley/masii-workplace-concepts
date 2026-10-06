(()=>{'use strict';
// MASii Workplace — Concept D "Chapter Deck".
// Same engine family as the Stacked Capital / New Leaf swipe decks: one swipe, flick, arrow key or
// page key = glide to the next chapter stop on a critically damped spring and land on a sharp hold.
// Hard and soft flicks are identical; deliberate extra swipes stack. Chapter copy leaves as the glide
// starts and arrives when ARRIVE of the segment remains. After the last chapter the page releases
// into normal scrolling (editorial below the fold) and parks the film on its finale.
//
// THE FILM: there is no frame sequence yet, so the "film" is rendered live by drawScene(cur), a
// stand-in camera move through the brand's 3D objects. `cur` lives in a virtual frame space
// (STOPS below), exactly like stacked-scroll.js. To swap in a Higgsfield sequence later, replace
// drawScene(cur) with the frame-store + draw() pair from stacked-scroll.js (FRAMES built from the
// real STOPS, bitmaps ring, holds) — the spring, gestures, ARRIVE timing and chapter UI stay as-is.
// The hover layer (FX) only needs hit targets; a frame sequence could supply them per chapter stop.
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const root=document.documentElement,stage=$('.stage'),canvas=$('#film'),sections=$$('.chapter'),bar=$('.journey-bar'),cue=$('.scroll-cue'),cueText=$('.cue-text'),navLinks=$$('.chapter-nav a'),tip=$('.tip');
const reduce=matchMedia('(prefers-reduced-motion: reduce)'),narrowMQ=matchMedia('(max-width:800px)');
// Phone profile, chosen once per load (as in stacked-scroll.js).
const PHONE=matchMedia('(pointer:coarse)').matches?Math.min(innerWidth,innerHeight)<=800&&Math.max(innerWidth,innerHeight)<=1100:matchMedia('(max-width:800px) and (orientation:portrait)').matches;root.classList.toggle('phone',PHONE);
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t)},TAU=Math.PI*2;

// ---- Timeline (virtual frames; a real sequence would supply its own STOPS) ------------------------
const SEG=96,STOPS=[0,SEG,SEG*2,SEG*3,SEG*4],STOP_IDX=STOPS,LAST=STOPS.length-1;
const OMEGA=PHONE?3.7:3.8;// spring stiffness, as in the reference decks
const ARRIVE=.36;// incoming copy appears when this fraction of the segment remains

// ---- Sprites: fetched, then decoded off the main thread with createImageBitmap --------------------
// Group A paints chapter 1; group B (later chapters) decodes after the first frame is up.
const IMG='../../shared/assets/img/';
const SPR_A={m:'tier-gradient',gold:'coin-gold',silver:'coin-lg',star:'done-star-lg',spark:'mas-mark',glow:'done-glow',bloom:'entry-bar-bloom',orbit:'done-orbit',wash:'porcelain-wash',grad:'gradient-4'};
const SPR_B={heart:'done-heart',gpGlow:'goodprint-glow',confetti:'done-confetti',gift:'mission-gift-heart',hand:'mission-handshake',msg:'mission-heart-message',stars:'mission-stars',target:'mission-target',run:'stat-day-run',don:'stat-donations',moves:'stat-moves'};
const img={};let assetsReady=false,sceneDirty=true;
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));return c};
function decode(name){return fetch(IMG+name+'.webp').then(r=>{if(!r.ok)throw 0;return r.blob()}).then(b=>'createImageBitmap'in window?createImageBitmap(b):new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=URL.createObjectURL(b)})).catch(()=>null)}
const loadGroup=g=>Promise.all(Object.entries(g).map(([k,n])=>decode(n).then(b=>{if(b)img[k]=b}))).then(()=>{prep(Object.keys(g));sceneDirty=true});
// Depth-of-field without ctx.filter: blur by down/up-sampling, rendered once per size bucket.
const BUCKETS=[96,192,384];
function blurCopy(src,bw){const bh=bw*src.height/src.width,pad=Math.round(bw*.14),W=bw+pad*2,H=bh+pad*2;
  // Preferred: a real gaussian, applied once here at build time (never per frame). Fallback: down/up-sampling.
  {const out=mk(W,H),x=out.getContext('2d');if('filter'in x){x.filter=`blur(${Math.max(1,bw*.022).toFixed(1)}px)`;x.drawImage(src,pad,pad,bw,bh);x.filter='none';out.w0=bw;return out}}const a=mk(W/3,H/3),b=mk(W/7,H/7),out=mk(W,H);
  let x=a.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(src,pad/3,pad/3,bw/3,bh/3);
  x=b.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(a,0,0,b.width,b.height);
  x=a.getContext('2d');x.clearRect(0,0,a.width,a.height);x.drawImage(b,0,0,a.width,a.height);
  x=out.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(a,0,0,W,H);out.w0=bw;return out}
function prep(keys){for(const k of keys){const s=img[k];if(!s)continue;
  if(['gold','silver','spark','m'].includes(k))img[k+'Blur']=BUCKETS.map(bw=>blurCopy(s,bw));
  // Mission icons ship on a soft square halo: feather it to a circle so no edge ever shows.
  if(['gift','hand','msg','stars','target'].includes(k)){const c=mk(s.width,s.height),x=c.getContext('2d');x.drawImage(s,0,0);x.globalCompositeOperation='destination-in';const r=x.createRadialGradient(c.width/2,c.height/2,0,c.width/2,c.height/2,c.width/2);r.addColorStop(0,'#000');r.addColorStop(.55,'#000');r.addColorStop(.98,'rgba(0,0,0,0)');x.fillStyle=r;x.fillRect(0,0,c.width,c.height);img[k]=c}
  // Light blooms are cropped at their edges: feather them into ellipses (and keep them small; they are drawn soft anyway).
  if(['glow','gpGlow','bloom'].includes(k)){const c=mk(s.width/2,s.height/2),x=c.getContext('2d');x.drawImage(s,0,0,c.width,c.height);x.globalCompositeOperation='destination-in';x.setTransform(c.width/2,0,0,c.height/2,c.width/2,c.height/2);const r=x.createRadialGradient(0,0,0,0,0,1);r.addColorStop(0,'#000');r.addColorStop(.45,'#000');r.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=r;x.fillRect(-1,-1,2,2);img[k]=c}}
  if(!img.shadow){const sh=mk(256,64),g=sh.getContext('2d'),rg=g.createRadialGradient(128,32,0,128,32,128);rg.addColorStop(0,'rgba(78,79,140,.34)');rg.addColorStop(.5,'rgba(110,100,170,.12)');rg.addColorStop(1,'rgba(120,110,180,0)');g.setTransform(1,0,0,.25,0,24);g.fillStyle=rg;g.fillRect(0,0,256,256);img.shadow=sh}
  if(!img.halo){const h=mk(256,256),g=h.getContext('2d'),rg=g.createRadialGradient(128,128,0,128,128,128);rg.addColorStop(0,'rgba(255,255,255,.95)');rg.addColorStop(.35,'rgba(200,190,255,.55)');rg.addColorStop(.7,'rgba(130,115,235,.18)');rg.addColorStop(1,'rgba(130,115,235,0)');g.fillStyle=rg;g.fillRect(0,0,256,256);img.halo=h}}
const loadA=loadGroup(SPR_A).then(()=>{assetsReady=true});
const loadAll=loadA.then(()=>loadGroup(SPR_B));

// ---- Interaction state (hover/tap layer) ---------------------------------------------------------
// Every reaction rides its own critically damped spring, so nothing ever jumps or jitters.
const Sp=(x=0)=>({x,v:0,t:x});
function stepSp(s,dt,om){const a=om*om*(s.t-s.x)-2*om*s.v;s.v+=a*dt;s.x+=s.v*dt;if(Math.abs(s.t-s.x)<1e-4&&Math.abs(s.v)<1e-4){s.x=s.t;s.v=0;return false}return true}
const FX={px:-1e5,py:-1e5,inside:false,lastMove:0,hits:[],hover:null,tapId:null,tapUntil:0,objs:new Map(),par:{x:Sp(),y:Sp()},parts:[],clock:0};
const fxObj=id=>{let o=FX.objs.get(id);if(!o){o={hov:Sp(),ox:Sp(),oy:Sp(),oz:Sp(),tx:Sp(),ty:Sp(),flip:Sp()};FX.objs.set(id,o)}return o};
const CAUSES={gift:'Hunger relief',hand:'Community',msg:'Mental health',stars:'Education',target:'Environment'};
const TEAMS=[['People / HR','Make company values part of everyday life.'],['Benefits / Rewards','A benefit they can use all year.'],['CSR / Social Impact','A say in causes, and funded impact.'],['Recognition / Culture','Recognize generosity, consistency and milestones.'],['Wellbeing','Uplifting content, reflection and small actions.'],['Volunteering','Keep people involved between volunteer days.'],['Employer Brand','Approved employee and impact stories.'],['Employee Experience','Giving, growth and rewards in one experience.']];
const STATS={run:'Daily plays',don:'Donations',moves:'Moves'};

// ---- Renderer ------------------------------------------------------------------------------------
// Scene units: U px = one unit at the focal plane (z=0). Camera sits at distance D in front of it.
// Every pose is a continuous function of t = cur/SEG (0..4), so between stops objects drift through
// depth and land in a composed tableau on each stop.
function makeRenderer(cv,fx=null){
  const c=cv.getContext('2d',{alpha:false});let W=1,H=1,fX=0,fY=0,U=1,XS=1,portrait=false;
  const bg=mk(2,2),bgc=bg.getContext('2d',{alpha:false});let bgKey='';// half-resolution backdrop cache
  function layout(){W=cv.width;H=cv.height;portrait=narrowMQ.matches;bg.width=Math.ceil(W/2);bg.height=Math.ceil(H/2);bgKey='';
    if(portrait){fX=W*.5;fY=H*.735;U=Math.min(W*.29,H*.15);XS=.74}else{fX=W*.69;fY=H*.5;U=Math.min(H*.28,W*.175);XS=1}}
  const D=5;
  let T=0;
  // keyed track: interpolate per-chapter values; `delay` staggers an object's departure within a segment.
  const k=(v,delay=0)=>{const i=Math.min(3,Math.floor(T));let f=T-i;if(delay>0){f=clamp((f-delay)/(1-delay));f=f*f*(3-2*f)}return v[i]+(v[i+1]-v[i])*f};
  const bump=()=>Math.sin(Math.PI*(T-Math.min(3,Math.floor(T))));// 0 on every stop, 1 mid-glide
  let cam={x:0,y:0,z:0,roll:0},items=[],hits=[];
  function project(x,y,z){const d=D+z-cam.z;if(d<.3)return null;const s=D/d;const px=(x-cam.x)*s*U*XS,py=(y-cam.y)*s*U;const cr=Math.cos(cam.roll),sr=Math.sin(cam.roll);return{x:fX+px*cr-py*sr,y:fY+px*sr+py*cr,s,d}}
  // Queue a sprite. w = width in units, yaw folds it like a coin flip, blur = 0..1 depth-of-field, id = hover target.
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
    const cr=Math.cos(r),sr=Math.sin(r);g.setTransform(cr*sx,sr*sx,-sr,cr,X,Y);
    const b=it.blur||0,bl=b>.02?blurFor(it.key,w):null;
    if(bl){const f=w/bl.w0,bw=bl.width*f,bh=bl.height*f;if(b<.98){g.globalAlpha=a*(1-b);g.drawImage(it.im,-w/2,-h/2,w,h)}g.globalAlpha=a*b;g.drawImage(bl,-bw/2,-bh/2,bw,bh)}
    else{g.globalAlpha=a;g.drawImage(it.im,-w/2,-h/2,w,h)}
    // Coin sheen: a light band that sweeps across the face as the coin turns towards the cursor.
    if(it.sheen>.02){g.save();g.beginPath();g.ellipse(0,0,w*.46,h*.46,0,0,TAU);g.clip();g.rotate(-.55);const pos=Math.sin(it.yaw||0)*w*.7;const lg=g.createLinearGradient(pos-w*.3,0,pos+w*.3,0);lg.addColorStop(0,'rgba(255,255,255,0)');lg.addColorStop(.5,'rgba(255,255,255,.75)');lg.addColorStop(1,'rgba(255,255,255,0)');g.globalAlpha=a*it.sheen;g.fillStyle=lg;g.fillRect(-w,-h,w*2,h*2);g.restore()}
    if(it.id&&a>.45&&b<.5)hits.push({id:it.id,kind:it.kind,label:it.label,x:p.x,y:p.y,rx:w*.44*Math.max(sx,.5),ry:h*.44,d:p.d})}
  function cover(g,im,alpha,scale,ox,oy,Wd,Hd){if(!im)return;const s=Math.max(Wd/im.width,Hd/im.height)*scale,w=im.width*s,h=im.height*s;g.globalAlpha=alpha;g.drawImage(im,(Wd-w)/2+ox,(Hd-h)/2+oy,w,h)}
  // GoodPrint ring, drawn procedurally at a scene position.
  function ring(x,y,z,R,prog,a,hov){const p=project(x,y,z);if(!p)return;const al=a*smooth(.45,1.6,p.d);if(al<=.003)return;const r=R*p.s*U*(1+.04*hov),lw=r*.16;
    if(hov>.01&&img.halo){const hw=r*3.2;c.setTransform(1,0,0,1,0,0);c.globalAlpha=al*.5*hov;c.drawImage(img.halo,p.x-hw/2,p.y-hw/2,hw,hw)}
    c.setTransform(1,0,0,1,p.x,p.y);c.rotate(cam.roll);c.globalAlpha=al;
    c.lineCap='round';c.lineWidth=lw;c.strokeStyle='rgba(255,255,255,.85)';c.beginPath();c.arc(0,0,r,0,TAU);c.stroke();
    c.lineWidth=lw*.18;c.strokeStyle='rgba(74,82,98,.10)';c.beginPath();c.arc(0,0,r+lw*.5,0,TAU);c.stroke();c.beginPath();c.arc(0,0,r-lw*.5,0,TAU);c.stroke();
    if(prog>.004){let gr;if(c.createConicGradient){gr=c.createConicGradient(-Math.PI/2,0,0);gr.addColorStop(0,'#6DBCEC');gr.addColorStop(.3,'#8FCFA2');gr.addColorStop(.55,'#E2A7D4');gr.addColorStop(.8,'#8273EB');gr.addColorStop(1,'#4E4FE8')}else{gr=c.createLinearGradient(-r,0,r,0);gr.addColorStop(0,'#6DBCEC');gr.addColorStop(1,'#8273EB')}
      c.lineWidth=lw*.72;c.strokeStyle=gr;c.beginPath();c.arc(0,0,r,-Math.PI/2,-Math.PI/2+TAU*Math.min(prog,.999));c.stroke();
      const e=-Math.PI/2+TAU*prog;c.fillStyle='#fff';c.beginPath();c.arc(Math.cos(e)*r,Math.sin(e)*r,lw*.24,0,TAU);c.fill()}
    const n=7,gap=r*.27,y0=r+lw*1.6;for(let i=0;i<n;i++){const on=clamp(prog*n*1.18-i);c.globalAlpha=al*(.35+.65*on);c.fillStyle=on>.5?(i%2?'#8273EB':'#6DBCEC'):'rgba(74,82,98,.18)';c.beginPath();c.arc((i-(n-1)/2)*gap,y0,lw*(.18+.1*on),0,TAU);c.fill()}
    c.setTransform(1,0,0,1,0,0);if(al>.45)hits.push({id:'ring',kind:'ring',label:['GoodPrint','Personal progress, play by play.'],x:p.x,y:p.y,rx:r+lw,ry:r+lw,d:p.d})}
  // Backdrop + far blooms, rendered at half resolution and only when the camera has moved.
  function backdrop(mid){const key=T.toFixed(4)+'|'+cam.x.toFixed(4)+'|'+cam.y.toFixed(4)+'|'+cam.z.toFixed(3);
    if(key!==bgKey){bgKey=key;const g=bgc,Wd=bg.width,Hd=bg.height;g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.fillStyle='#F6F7F2';g.fillRect(0,0,Wd,Hd);
      cover(g,img.wash,1,1,0,0,Wd,Hd);
      cover(g,img.grad,k([.34,.42,.3,.46,.3]),1.18+mid*.04,(-cam.x*U*.25+Math.sin(T*1.3)*W*.02)/2,-cam.y*U*.125,Wd,Hd);
      const rg=g.createRadialGradient(fX/2,fY/2,0,fX/2,fY/2,U*1.7);rg.addColorStop(0,'rgba(255,255,255,.75)');rg.addColorStop(.55,'rgba(255,255,255,.28)');rg.addColorStop(1,'rgba(255,255,255,0)');g.globalAlpha=1;g.fillStyle=rg;g.fillRect(0,0,Wd,Hd);
      for(const o of [{key:'glow',im:img.glow,x:k([.2,-.1,.1,0,0]),y:k([.1,0,.05,0,.1]),z:6,w:k([9,10,8,11,10]),a:k([.8,.6,.35,.95,.7]),rot:k([0,.3,-.2,.1,0])},{key:'bloom',im:img.bloom,x:k([-2.4,2.6,-2.8,2.2,-2.6]),y:k([1.6,-1.3,1.2,-1.6,1.5]),z:9,w:7,a:.55}])if(o.im)drawSprite(o,g,.5);
      g.setTransform(1,0,0,1,0,0)}
    c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.imageSmoothingQuality='low';c.drawImage(bg,0,0,W,H);c.imageSmoothingQuality='high'}

  const MISS=['gift','hand','msg','stars','target'],STAT=['run','don','moves'];
  const COINS=[['gold',-1.55,-.95,5.5,.62],['silver',1.75,-.75,4.5,.58],['gold',1.3,1.05,3.2,.48],['silver',-1.2,1.0,6.5,.6],['gold',2.3,.1,7,.7],['silver',-.4,-1.5,8,.5],['gold',-2.3,.3,8.5,.6]];
  const EIGHT=j=>-Math.PI/2+.39+j*TAU/8;// slots for the eight-team ring (chapter 5)
  const coinLabel=['MAS points',PHONE||matchMedia('(pointer:coarse)').matches?'Tap to flip.':'Click to flip.'];

  // ---- drawScene(cur): the single entry point a frame sequence will replace -------------------------
  function drawScene(cur,time=0){
    T=clamp(cur/SEG,0,4);const mid=bump(),segI=Math.min(3,Math.floor(T)),dirRoll=segI%2?-1:1,idle=(ph,amp=.018)=>Math.sin(time*.9+ph)*amp,ch=Math.round(T),atStop=Math.abs(T-ch)<.12;
    const px=fx?FX.par.x.x:0,py=fx?FX.par.y.x:0;// pointer parallax: the camera leans; nearer layers move more
    cam={x:k([0,.1,-.1,0,-.2])+px*.16,y:k([0,.05,-.04,0,.05])+py*.1,z:k([0,.1,-.1,.2,-.7])+mid*1.1,roll:dirRoll*mid*.045+px*.012};
    items=[];hits=[];
    backdrop(mid);
    sprite('gpGlow',{x:0,y:k([0,0,-.1,0,0]),z:k([5,4,2.5,4,5]),w:k([4,4,5.2,4,4]),a:k([0,0,.9,.2,0],.2)});

    // Chrome M — hero on the offer, recedes to a far presence, returns at the centre of the eight teams.
    sprite('m',{id:'m',kind:'m',x:k([0,1.5,1.9,-1.6,0],.05),y:k([-.08,-1.15,-1.2,-1.0,-.02],.05)+idle(0),z:k([0,6,7.5,7,0],.05)+mid*.4,w:k([2.55,1.6,1.4,1.5,1.32],.05),rot:k([-.07,.12,.18,-.12,-.04],.05)+mid*.18*dirRoll,yaw:k([.38,.9,1.1,.6,.12],.05)+Math.sin(time*.5)*.05,a:k([1,.75,.45,.45,1]),shadow:k([.9,0,0,0,.6]),blur:smooth(3,6.5,k([0,6,7.5,7,0],.05))});
    sprite('orbit',{x:0,y:k([.12,.06,0,0,.1]),z:k([.2,.3,4,4,.4]),w:k([3.1,3.2,3,3,3.4]),rot:k([-.12,.05,0,0,-.04]),a:k([.9,1,0,0,.95])});

    // Mission icons — fly in from depth and orbit into place (ch2), sweep past the camera (ch3), return as five of the eight teams (ch5).
    MISS.forEach((key,i)=>{const d=i*.06,base=-Math.PI/2+i*TAU/5;
      const ang=k([base-1.7,base,base+1.1,base+1.1,EIGHT(i)+TAU],d)+time*.04*k([0,1,0,0,0]);
      const rx=k([3.2,1.42,2.6,1.9,1.32],d),ry=k([1.6,.84,1.4,1,1],d),zc=k([10,.2,-4.6,10,.3],d);
      const label=ch===4?TEAMS[i]:[CAUSES[key],'Example cause · employer-approved'];
      sprite(key,{id:atStop?key:null,kind:'icon',label,x:Math.cos(ang)*rx+k([0,.1,0,0,0]),y:Math.sin(ang)*ry+k([0,0,0,0,.05])+idle(i*1.3),z:zc+Math.sin(ang)*k([1,.9,.6,.6,.9],d),w:k([.9,.92,1.2,.8,.74],d),a:k([0,1,1,0,1],d)*(T>2.5&&T<3.5?0:1),rot:Math.sin(ang)*.06})});
    // Stat icons — orbit the GoodPrint ring (ch3), fly past the camera as the rewards burst, become the other three teams (ch5).
    const statPos=[[1.3,-.72],[1.38,.55],[-.98,.92]];
    STAT.forEach((key,i)=>{const d=.08+i*.06,j=5+i,ang=EIGHT(j);
      const x=k([statPos[i][0]*2.4,statPos[i][0]*2.4,statPos[i][0],statPos[i][0]*2.2,Math.cos(ang)*1.32],d),y=k([statPos[i][1]*2,statPos[i][1]*2,statPos[i][1],statPos[i][1]*2,Math.sin(ang)*1+.05],d);
      const label=ch===4?TEAMS[j]:[STATS[key],'Tracked in your GoodPrint.'];
      sprite(key,{id:atStop?key:null,kind:'icon',label,x,y:y+idle(4+i),z:k([11,11,-.2,-4.6,.3+Math.sin(ang)*.9],d),w:k([.5,.5,.6,.6,.56],d)*(key==='don'?.82:1),a:k([0,0,1,0,1],d)*(T>.5&&T<1.5?0:1),rot:k([0,0,-.08+i*.08,.3,0],d)})});

    const ringZ=k([9,9,0,-4.4,9],.04),ringA=k([0,0,1,0,0],.04);
    sprite('heart',{id:'heart',kind:'obj',label:['Recognition','Milestones, consistency and generosity.'],x:k([1.6,-1.6,1.4,0,.3],.1),y:k([-.9,1.1,-1,0,-.4],.1)+idle(2),z:k([11,11,11,0,9],.1),w:k([.9,.9,.9,1.8,.9],.1),rot:k([.2,.2,.2,-.08,.12],.1)+mid*.25,a:k([0,0,0,1,0],.1),shadow:k([0,0,0,.8,0])});
    sprite('confetti',{x:0,y:k([-.3,-.3,-.3,-.25,-.3]),z:k([6,6,6,.8,6]),w:k([3,3,3,4.6,3]),a:k([0,0,0,.95,0],.2)});

    // Coins — far bokeh on the offer, a flipping burst on the rewards chapter, settled behind the M at the end.
    const BURST=[-1.95,-1.3,-.62,.08,.8,1.5,2.25];
    COINS.forEach(([key,x0,y0,z0,w0],i)=>{const d=i*.035,ang=BURST[i],R=1.2+(i%3)*.2;
      const z=k([z0,z0+2,z0+3,-.3+(i%3)*.6,z0+.5],d);
      sprite(key,{id:'coin'+i,kind:'coin',label:coinLabel,x:k([x0,x0*1.3,x0*1.5,Math.cos(ang)*R*1.05,x0*.75],d),y:k([y0,y0*1.25,y0*1.4,Math.sin(ang)*R*.85,y0*.7],d)+idle(i*.9,.025),z,w:k([w0,w0,w0,.5+(i%3)*.08,w0*.8],d),
        yaw:k([i*.11,.2+i*.07,.1+i*.09,.3+i*.06+TAU,.15+i*.05+TAU],d),rot:k([.2-i*.08,.1,0,-.3+i*.1,.15-i*.05],d),a:k([.95,.75,.45,1,.7],d),blur:smooth(1.6,4.5,z)})});

    const SP=[['spark',[.95,-.62,-.3,.42],[1.55,-.9,.5,.3],[1.05,-.82,.2,.32],[1.2,-1.05,-.2,.5],[1.0,-.82,.1,.36]],
              ['spark',[-1.15,.55,1.2,.26],[-1.7,.7,.8,.22],[-1.2,.7,.5,.24],[-1.45,.75,.3,.42],[-1.3,.45,.6,.26]],
              ['spark',[1.9,.7,2.5,.2],[.3,-1.15,1.2,.2],[.35,-1.2,1.0,.18],[.7,1.25,.4,.3],[1.85,-.25,1.6,.2]],
              ['star',[-.85,-.62,.4,.55],[-.95,-.75,.6,.5],[1.0,.85,.3,.5],[-.6,-1.15,.2,.75],[-.85,-.55,.5,.5]],
              ['star',[.6,.85,1.6,.38],[1.6,.4,1.2,.4],[-.2,1.3,1.8,.35],[1.7,.45,.8,.55],[.25,1.1,1.6,.36]]];
    SP.forEach(([key,...P],i)=>{const d=.12+i*.05,tw=1+Math.sin(time*2.2+i*1.7)*.07;
      sprite(key,{id:key==='spark'?'sp'+i:null,kind:'spark',x:k(P.map(p=>p[0]),d),y:k(P.map(p=>p[1]),d)+idle(i*2.1,.03),z:k(P.map(p=>p[2]),d)+mid*(i%2?1.5:-.6),w:k(P.map(p=>p[3]),d)*tw,rot:Math.sin(time*.6+i)*.12+mid*dirRoll*.5,a:k(key==='star'?[1,.9,.9,1,.9]:[1,.95,.9,1,1],d),blur:key==='spark'?smooth(1.4,3,k(P.map(p=>p[2]),d)):0})});

    // Depth sort (far first), then draw; the ring is inserted at its depth.
    const rs=fx?FX.objs.get('ring'):null,rh=rs?rs.hov.x:0;
    items.push({ring:true,z:ringZ-(rs?.3*rh:0)});
    items.sort((a,b)=>b.z-a.z);
    for(const it of items){if(it.ring)ring(0,-.05+idle(9,.01),ringZ-.3*rh,.82,k([0,0,.74,1,1],.12)+.14*rh*ringA,ringA,rh);else drawSprite(it)}
    if(fx)drawParticles();
    c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;
    if(fx)FX.hits=hits}
  function drawParticles(){for(const p of FX.parts){const a=clamp(p.life/p.max)*1;if(p.key&&img[p.key]){const im=img[p.key],w=p.size,h=w*im.height/im.width;c.setTransform(Math.cos(p.rot),Math.sin(p.rot),-Math.sin(p.rot),Math.cos(p.rot),p.x,p.y);c.globalAlpha=a;c.drawImage(im,-w/2,-h/2,w,h)}else{c.setTransform(1,0,0,1,0,0);c.globalAlpha=a*.9;c.fillStyle=p.col;c.beginPath();c.arc(p.x,p.y,p.size*.5*(.5+.5*a),0,TAU);c.fill()}}}
  return{layout,drawScene,resize(w,h){cv.width=w;cv.height=h;layout()}};
}

// ---- Deck state ----------------------------------------------------------------------------------
const film=makeRenderer(canvas,FX);
let cur=0,vel=0,stop=0,shown=-2,navAt=-1,lastTime=0,raf=0,staticMode=reduce.matches,viewH=innerHeight,lastWheel=0,lastMag=0,lastStep=0,strokeSum=0,strokeArmed=false,lastDirection=0,touchY=null,touchConsumed=false;
let quality=1,glideDeltas=[],wasSettled=true;// adaptive resolution: lowered (at rest) only if glides miss frames
const metrics={draws:0,drawMs:[],ticks:0};
const settled=()=>Math.abs(STOP_IDX[stop]-cur)<.25&&Math.abs(vel)<.8;
const landing=()=>Math.abs(STOP_IDX[stop]-cur)<3;// close enough to the hold for hover and taps
const stageVisible=()=>scrollY<viewH*1.02;

function present(chapter){if(chapter===shown)return;shown=chapter;sections.forEach((el,i)=>{const on=i===chapter;el.classList.toggle('on',on);el.inert=!on;el.setAttribute('aria-hidden',String(!on))})}
// UI writes are guarded so a glide frame touches the DOM only when something actually changes.
const ui={};const setUI=(k,v,fn)=>{if(ui[k]!==v){ui[k]=v;fn(v)}};
function paintUI(){
  const tgt=STOP_IDX[stop],from=STOP_IDX[cur<tgt?Math.max(0,stop-1):Math.min(LAST,stop+1)],seg=Math.max(1,Math.abs(tgt-from)),remaining=Math.abs(tgt-cur);
  // outgoing copy leaves as the glide begins; incoming arrives while the spring is still landing
  present(remaining<=seg*ARRIVE||settled()?stop:-1);
  if(navAt!==stop){navAt=stop;navLinks.forEach((a,i)=>{if(i===stop)a.setAttribute('aria-current','step');else a.removeAttribute('aria-current')})}
  setUI('prog',(cur/STOPS[LAST]).toFixed(3),v=>bar.style.setProperty('--progress',v));// scoped to the bar: no document-wide style recalc
  const overflow=Math.max(0,scrollY);setUI('barO',(1-clamp(overflow/(viewH*.5))).toFixed(2),v=>bar.style.opacity=v);setUI('barP',overflow>viewH*.25,v=>bar.style.pointerEvents=v?'none':'');setUI('scr',overflow>40,v=>document.body.classList.toggle('scrolled',v));
  const rel=stop===LAST&&settled();setUI('rel',rel&&overflow<2,v=>cue.classList.toggle('release',v));setUI('cue',rel,v=>cueText.textContent=v?'Scroll to continue':'Scroll for next');
  setUI('ta',!staticMode&&scrollY<=2&&!rel,v=>stage.style.touchAction=v?'pinch-zoom':'auto')}

// ---- Interaction update (runs inside tick) --------------------------------------------------------
const dprNow=()=>canvas.width/Math.max(1,stage.clientWidth);
function hitAt(x,y){let best=null;for(const h of FX.hits){const dx=(x-h.x)/h.rx,dy=(y-h.y)/h.ry;if(dx*dx+dy*dy<=1&&(!best||h.d<best.d))best=h}return best}
function updateFX(dt,now){
  const live=FX.inside&&landing();const tapLive=FX.tapId&&now<FX.tapUntil;if(!tapLive)FX.tapId=null;
  const hov=tapLive?FX.hits.find(h=>h.id===FX.tapId)||null:live?hitAt(FX.px,FX.py):null;FX.hover=hov;
  const seen=new Set(),W=canvas.width,H=canvas.height;
  for(const h of FX.hits){seen.add(h.id);const o=fxObj(h.id),dx=FX.px-h.x,dy=FX.py-h.y,dist=Math.hypot(dx,dy),R=Math.max(h.rx,h.ry)*2.6+90*dprNow();
    const prox=live?smooth(R,0,dist):0,on=hov&&hov.id===h.id?1:0;
    o.hov.t=on;
    if(h.kind==='m'){o.tx.t=live?clamp(dx/(W*.35),-1,1)*.42:0;o.ty.t=live?clamp(dy/(H*.4),-1,1)*.09:0;o.oz.t=-.25*prox;o.ox.t=o.oy.t=0}
    else{o.ox.t=clamp(dx/(h.rx*3),-1,1)*.07*prox;o.oy.t=clamp(dy/(h.ry*3),-1,1)*.07*prox;o.oz.t=-(h.kind==='coin'?.45:.3)*Math.max(prox*.6,on);
      o.tx.t=h.kind==='coin'?clamp(dx/(h.rx*2),-1,1)*.85*prox:clamp(dx/(h.rx*3),-1,1)*prox}}
  for(const [id,o] of FX.objs)if(!seen.has(id)){o.hov.t=0;o.ox.t=o.oy.t=o.oz.t=o.tx.t=o.ty.t=0}
  FX.par.x.t=FX.inside?(FX.px/W-.5)*2:0;FX.par.y.t=FX.inside?(FX.py/H-.5)*2:0;
  let moving=false;
  // Only hover, flip and impulse springs keep the loop alive; the magnetic/tilt followers track targets that drift with the
  // idle float, so counting them would keep the loop running forever (they simply freeze where they are when it stops).
  for(const o of FX.objs.values()){moving=stepSp(o.hov,dt,11)|moving;moving=stepSp(o.flip,dt,5.5)|moving;moving=(stepSp(o.oz,dt,8)&&Math.abs(o.oz.v)>.05)|moving;stepSp(o.ox,dt,8);stepSp(o.oy,dt,8);stepSp(o.tx,dt,7);stepSp(o.ty,dt,7)}
  moving=(stepSp(FX.par.x,dt,3.2)&&Math.abs(FX.par.x.v)>.002)|moving;moving=(stepSp(FX.par.y,dt,3.2)&&Math.abs(FX.par.y.v)>.002)|moving;
  // sparkle particles
  const g=900*dprNow();FX.parts=FX.parts.filter(p=>(p.life-=dt)>0);for(const p of FX.parts){p.vy+=g*dt*.35;p.vx*=1-1.6*dt;p.vy*=1-1.6*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.rot+=p.vr*dt}
  if(FX.parts.length)moving=true;
  stage.style.cursor=hov&&!tapLive?'pointer':'';
  paintTip(hov);
  return moving}
let tipId=null;
function paintTip(h){const show=h&&h.label&&(h.kind!=='coin'||!PHONE);if(!show){if(tipId!==null){tipId=null;tip.classList.remove('on')}return}
  if(tipId!==h.id+h.label[0]){tipId=h.id+h.label[0];tip.firstElementChild.textContent=h.label[0];tip.lastElementChild.textContent=h.label[1]}
  const s=dprNow();const x=h.x/s,y=(h.y-h.ry)/s;const hw=(tip.offsetWidth||180)/2+12;tip.style.transform=`translate3d(${Math.round(clamp(x,hw,stage.clientWidth-hw))}px,${Math.round(Math.max(76,y-10))}px,0)`;
  tip.classList.add('on')}
function burst(x,y,n=14){const s=dprNow(),cols=['#8273EB','#6DBCEC','#E29CCF','#FFBE22','#9ED8B1'];for(let i=0;i<n;i++){const a=Math.random()*TAU,sp=(260+Math.random()*420)*s;const spark=i%3===0;FX.parts.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-180*s,rot:Math.random()*TAU,vr:(Math.random()-.5)*8,life:.9+Math.random()*.4,max:1.1,size:(spark?26+Math.random()*16:7+Math.random()*7)*s,key:spark?'spark':null,col:cols[i%cols.length]})}}
function activate(h){const o=fxObj(h.id);
  if(h.kind==='coin'){o.flip.t+=TAU*(Math.random()<.5?1:-1);burst(h.x,h.y,16)}
  else if(h.kind==='spark'){o.flip.t+=TAU;burst(h.x,h.y,8)}
  else{o.oz.v-=5;if(h.kind!=='icon'||h.id==='heart')burst(h.x,h.y,10)}
  wake()}

// The glide into the finale runs on a stiffer spring so the tableau settles sooner (as in stacked-scroll.js).
function tick(t){raf=0;if(document.hidden||staticMode)return;const dt=Math.min(.05,lastTime?(t-lastTime)/1000:.0167);if(lastTime&&!settled())glideDeltas.push(t-lastTime);lastTime=t;metrics.ticks++;
  const tgt=STOP_IDX[stop];
  if(!settled()){const om=stop===LAST&&cur<tgt?OMEGA*1.25:OMEGA;vel+=(om*om*(tgt-cur)-2*om*vel)*dt;cur+=vel*dt;if(Math.abs(tgt-cur)<.25&&Math.abs(vel)<.8){cur=tgt;vel=0}}
  const now=performance.now();
  paintUI();
  const fxMoving=assetsReady?updateFX(dt,now):false;
  const pointerAlive=now-FX.lastMove<1400;// the idle float runs only while the pointer has recently moved
  if(assetsReady&&stageVisible()){FX.clock+=dt;const a=performance.now();film.drawScene(cur,FX.clock);const ms=performance.now()-a;metrics.draws++;metrics.drawMs.push(ms);if(metrics.drawMs.length>240)metrics.drawMs.shift();stage.classList.add('ready');sceneDirty=false}
  const isSettled=settled();if(isSettled&&!wasSettled)adapt();wasSettled=isSettled;
  // Stop the loop when nothing moves and the pointer is still; pointer moves and gestures restart it.
  if(stageVisible()&&(!isSettled||fxMoving||pointerAlive||sceneDirty))wake();else lastTime=0}
function wake(){if(!raf&&!staticMode&&!document.hidden)raf=requestAnimationFrame(tick)}
// Adaptive resolution: if a glide dropped frames, render a little softer from the next glide on.
function adapt(){if(glideDeltas.length<20){glideDeltas=[];return}const a=[...glideDeltas].sort((x,y)=>x-y),p80=a[Math.floor(a.length*.8)];glideDeltas=[];if(p80>21&&quality>.72){quality=Math.max(.7,quality-.15);lastW=0;measure()}}
let lastW=0,lastH=0;
function measure(){const b=stage.getBoundingClientRect(),w=Math.round(b.width),h=Math.round(b.height);viewH=h||innerHeight;if(lastW&&w===lastW&&Math.abs(h-lastH)<120&&PHONE)return;// mobile address-bar changes never resize the canvas
  lastW=w;lastH=h;scrollGrace=performance.now()+800;const dpr=Math.min(devicePixelRatio||1,2)*quality;film.resize(Math.round(w*dpr),Math.round(h*dpr));sceneDirty=true;wake()}

// ---- Gestures ------------------------------------------------------------------------------------
function setStop(i){i=clamp(i,0,LAST);if(staticMode){sections[i].scrollIntoView({block:'start'});return}if(i===stop&&settled())return;stop=i;FX.tapId=null;wake()}
function step(dir){setStop(stop+dir)}
function blockedInput(e){return staticMode||!!(e.target.closest&&e.target.closest('input,textarea,select,[contenteditable]'))}
// Fresh swipe = a lull since the last wheel event with real magnitude, or a spike during the previous flick's inertia tail.
addEventListener('wheel',e=>{if(blockedInput(e)||e.ctrlKey||Math.abs(e.deltaX)>Math.abs(e.deltaY))return;const dir=Math.sign(e.deltaY);if(!dir)return;
  if(scrollY>2||(stop===LAST&&dir>0&&settled()))return;// at the last chapter the page releases natively into the editorial, and back
  e.preventDefault();const now=e.timeStamp||performance.now(),mag=Math.abs(e.deltaY);
  if(!lastWheel||now-lastWheel>140||dir!==lastDirection){strokeSum=0;strokeArmed=true}lastDirection=dir;strokeSum+=mag;const opening=strokeArmed&&strokeSum>6;const spike=mag>30&&mag>lastMag*1.6;lastWheel=now;lastMag=mag;
  if((opening||spike)&&(!lastStep||now-lastStep>180)){strokeArmed=false;lastStep=now;step(dir)}else if(opening)strokeArmed=false},{passive:false});
function clearTouch(){touchY=null;touchConsumed=false}
addEventListener('touchstart',e=>{clearTouch();if(blockedInput(e)||e.touches.length!==1)return;touchY=e.touches[0].clientY},{passive:true});
addEventListener('touchmove',e=>{if(e.touches.length!==1){clearTouch();return}if(blockedInput(e))return;if(touchConsumed){if(e.cancelable)e.preventDefault();return}if(touchY===null)return;const d=touchY-e.touches[0].clientY,dir=Math.sign(d);if(scrollY>2||(stop===LAST&&dir>0&&settled()))return;if(e.cancelable)e.preventDefault();if(Math.abs(d)>46){touchConsumed=true;touchY=null;step(dir)}},{passive:false});
addEventListener('touchend',clearTouch,{passive:true});addEventListener('touchcancel',clearTouch,{passive:true});
addEventListener('keydown',e=>{if(blockedInput(e)||e.altKey||e.metaKey||e.ctrlKey||(e.key===' '&&e.target.closest('button,a')))return;if(scrollY>2)return;
  if(e.key==='Home'||e.key==='End'){e.preventDefault();setStop(e.key==='Home'?0:LAST);return}
  const dir={ArrowDown:1,PageDown:1,' ':e.shiftKey?-1:1,ArrowUp:-1,PageUp:-1}[e.key];if(!dir)return;if(stop===LAST&&dir>0&&settled())return;e.preventDefault();if(!e.repeat)step(dir)});
// Pointer: hover on mouse/pen; a tap (short, still press) on any pointer triggers the same reaction as a click.
function toCanvas(e){const r=stage.getBoundingClientRect(),s=dprNow();return[(e.clientX-r.left)*s,(e.clientY-r.top)*s]}
addEventListener('pointermove',e=>{if(staticMode)return;const inStage=!!(e.target.closest&&e.target.closest('.stage'))&&scrollY<viewH*.5;if(e.pointerType==='touch'){return}[FX.px,FX.py]=toCanvas(e);FX.inside=inStage;FX.lastMove=performance.now();wake()},{passive:true});
document.documentElement.addEventListener('pointerleave',()=>{FX.inside=false;wake()});
let down=null;
addEventListener('pointerdown',e=>{if(staticMode||!(e.target.closest&&e.target.closest('.stage')))return;down={x:e.clientX,y:e.clientY,t:performance.now(),type:e.pointerType}},{passive:true});
addEventListener('pointerup',e=>{if(!down)return;const d=down;down=null;if(Math.hypot(e.clientX-d.x,e.clientY-d.y)>10||performance.now()-d.t>450||!landing())return;
  const [x,y]=toCanvas(e);const h=hitAt(x,y);if(!h)return;if(d.type==='touch'){FX.px=x;FX.py=y;FX.tapId=h.id;FX.tapUntil=performance.now()+1600}FX.lastMove=performance.now();activate(h)},{passive:true});
addEventListener('pointercancel',()=>{down=null},{passive:true});

let scrollGrace=performance.now()+1000;// browser scroll jitter right after load or a resize must not park the deck
function park(){if(stop!==LAST||!settled()){stop=LAST;cur=STOP_IDX[LAST];vel=0}}
addEventListener('scroll',()=>{if(staticMode)return;if(performance.now()<=scrollGrace){if(scrollY>0&&scrollY<120)window.scrollTo(0,0)}else if(scrollY>8)park();if(scrollY>8)FX.inside=false;paintUI();wake()},{passive:true});
// In-page links below the deck: park the film on its finale, then glide the page there.
$$('a[href^="#"]:not([data-chapter])').forEach(a=>a.addEventListener('click',e=>{const t=document.querySelector(a.getAttribute('href'));if(!t||t.closest('.chapter'))return;e.preventDefault();scrollGrace=0;if(!staticMode)park();wake();t.scrollIntoView({behavior:staticMode?'instant':'smooth',block:'start'})}));
$$('[data-chapter]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();const i=+a.dataset.chapter;if(staticMode){sections[i].scrollIntoView({block:'start'});return}if(scrollY>0)window.scrollTo(0,0);setStop(i)}));

// ---- Editorial reveals + calculation tooltips ----------------------------------------------------------
const io='IntersectionObserver'in window?new IntersectionObserver(es=>es.forEach(en=>{if(en.isIntersecting){en.target.classList.add('in');io.unobserve(en.target)}}),{rootMargin:'0px 0px -8% 0px',threshold:.12}):null;
$$('.rv').forEach(el=>{const sib=[...el.parentElement.children].filter(x=>x.classList.contains('rv'));el.style.transitionDelay=Math.min(5,sib.indexOf(el))*70+'ms';if(io&&!reduce.matches)io.observe(el);else el.classList.add('in')});
// Keep each calculation bubble inside the viewport (it is positioned by CSS; this only nudges the edge cases).
$$('.calc').forEach(el=>{const fit=()=>{el.style.setProperty('--nudge','0px');const b=el.querySelector('.calc-tip');if(!b)return;const r=b.getBoundingClientRect(),m=12;let n=0;if(r.left<m)n=m-r.left;else if(r.right>innerWidth-m)n=innerWidth-m-r.right;el.style.setProperty('--nudge',n+'px')};el.addEventListener('mouseenter',fit);el.addEventListener('focus',fit)});

// ---- Reduced motion: static stacked chapters, each with its own still of the tableau --------------
let stills=null;
function paintStills(){if(!assetsReady)return;stills=stills||sections.map(s=>makeRenderer(s.querySelector('.still')));const dpr=Math.min(devicePixelRatio||1,2);sections.forEach((s,i)=>{const r=s.getBoundingClientRect();stills[i].resize(Math.round(r.width*dpr),Math.round(r.height*dpr));stills[i].drawScene(STOPS[i],0)})}
function motionPreference(){staticMode=reduce.matches;document.body.classList.toggle('static-mode',staticMode);
  if(staticMode){if(raf){cancelAnimationFrame(raf);raf=0}sections.forEach(el=>{el.inert=false;el.removeAttribute('aria-hidden');el.classList.add('on')});loadAll.then(paintStills)}
  else{shown=-2;measure();paintUI();wake()}}
if('ResizeObserver'in window)new ResizeObserver(()=>{if(!staticMode)measure()}).observe(stage);
addEventListener('resize',()=>{if(staticMode)paintStills();else measure()});
reduce.addEventListener('change',motionPreference);
document.addEventListener('visibilitychange',()=>{lastTime=0;if(!document.hidden)wake()});
if('scrollRestoration'in history)history.scrollRestoration='manual';
const hashIndex=sections.findIndex(s=>'#'+s.id===location.hash);
let deepTarget=null;try{deepTarget=location.hash&&hashIndex<0?document.getElementById(decodeURIComponent(location.hash.slice(1))):null}catch{}
if(deepTarget){stop=LAST;cur=STOP_IDX[LAST];scrollGrace=0;setTimeout(()=>deepTarget.scrollIntoView({block:'start'}),0)}else{window.scrollTo(0,0);if(hashIndex>0){stop=hashIndex;cur=STOP_IDX[hashIndex]}}
FX.lastMove=performance.now();
loadA.then(()=>{sceneDirty=true;wake()});loadAll.then(()=>{sceneDirty=true;wake();if(staticMode)paintStills()});
motionPreference();
// Read-only diagnostics for preview verification.
window.chapterDeck={getState:()=>{const a=[...metrics.drawMs].sort((x,y)=>x-y);return{cur,vel,stop,shown,settled:settled(),phone:PHONE,reduced:staticMode,assetsReady,quality,canvas:[canvas.width,canvas.height],looping:!!raf,draws:metrics.draws,ticks:metrics.ticks,drawP95:a.length?+a[Math.floor(a.length*.95)].toFixed(2):0,hover:FX.hover&&FX.hover.id,hits:FX.hits.map(h=>({id:h.id,x:Math.round(h.x/dprNow()),y:Math.round(h.y/dprNow())}))}},go:i=>setStop(i)};
})();
