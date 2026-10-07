import { chromium, devices } from 'playwright';
import assert from 'node:assert/strict';
const b=await chromium.launch({channel:'chrome'});
const base=process.env.SITE_URL||'http://127.0.0.1:8420';
for(const name of ['d-chapters','e-best','a-aurora']){
 const p=await b.newPage({viewport:{width:1440,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(`${base}/concepts/${name}/`);await p.waitForTimeout(2300);
 const positions=await p.evaluate(name=>name==='a-aurora'?(()=>{const s=ScrollTrigger.getAll().find(s=>s.trigger?.classList.contains('how')&&s.pin);return [s.start,(s.start+s.end)/2,s.end]})():Array.from(document.querySelectorAll('.chapter'),(_,i)=>i*document.querySelector('.stage').offsetHeight),name);
 const index=()=>p.evaluate(name=>name==='a-aurora'?Number(document.querySelector('.how__cur').textContent)-1:chapterDeck.getState().stop,name);
 const flick=async(dir=1)=>{for(const n of [1800,900,480,220,100,45,20,9,4,2]){await p.mouse.wheel(0,n*dir);await p.waitForTimeout(60)}await p.waitForTimeout(650)};
 await p.evaluate(y=>scrollTo({top:y,behavior:'instant'}),positions[0]);await p.waitForTimeout(250);
 await flick();assert.equal(await index(),1,`${name} strong flick advances exactly once`);assert(Math.abs(await p.evaluate(()=>scrollY)-positions[1])<3);
 await flick(-1);assert.equal(await index(),0,`${name} reverse exactly once`);
 for(let i=1;i<positions.length;i++){await flick();assert.equal(await index(),i,`${name} chapter ${i}`);}
 await flick();assert(await p.evaluate(()=>scrollY)>positions.at(-1)+100,`${name} releases after last screen`);
 await p.waitForTimeout(250);await flick(-1);assert.equal(await index(),positions.length-1,`${name} return enters last screen`);
 if(name==='a-aurora'){await p.evaluate(y=>scrollTo({top:y,behavior:'instant'}),positions[0]-300);await p.waitForTimeout(250);await flick();assert.equal(await index(),0,'Aurora catches overshoot on entry');assert(Math.abs(await p.evaluate(()=>scrollY)-positions[0])<3);}
 assert.deepEqual(errors,[]);console.log(name,'strong flick, reverse, all screens, exit and return passed');await p.close();
}
for(const name of ['d-chapters','e-best','a-aurora']){
 const p=await b.newPage(devices['iPhone 13']),c=await p.context().newCDPSession(p);await p.goto(`${base}/concepts/${name}/`);await p.waitForTimeout(2200);
 if(name==='a-aurora')await p.evaluate(()=>{const s=ScrollTrigger.getAll().find(s=>s.trigger?.classList.contains('how')&&s.pin);scrollTo(0,s.start)});
 await p.waitForTimeout(300);
 await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:190,y:590}]});for(let i=1;i<=12;i++){await c.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:190,y:590-i*40}]});await p.waitForTimeout(24)}await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(1600);
 const i=await p.evaluate(name=>name==='a-aurora'?Number(document.querySelector('.how__cur').textContent)-1:chapterDeck.getState().stop,name);assert.equal(i,1,`${name} strong touch swipe`);console.log(name,'touch swipe advances once');await p.close();}
await b.close();
