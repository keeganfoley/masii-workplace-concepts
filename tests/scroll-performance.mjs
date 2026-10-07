import {chromium,devices} from 'playwright';
import assert from 'node:assert/strict';
const b=await chromium.launch({channel:'chrome'});
for(const name of ['a-aurora','b-stack','c-editorial','d-chapters','e-best','f-codex']){
 const p=await b.newPage({viewport:{width:1440,height:900}});const c=await p.context().newCDPSession(p);await c.send('Emulation.setCPUThrottlingRate',{rate:4});await p.goto(`http://127.0.0.1:8420/concepts/${name}/`);await p.waitForTimeout(2500);
 await p.evaluate(()=>{window.samples=[];window.probe=true;let last;function tick(t){if(last)samples.push(t-last);last=t;if(probe)requestAnimationFrame(tick)}requestAnimationFrame(tick)});
 for(let i=0;i<50;i++){await p.mouse.wheel(0,i<35?90:-90);await p.waitForTimeout(28)}await p.waitForTimeout(1400);const y=await p.evaluate(()=>scrollY);await p.waitForTimeout(600);const r=await p.evaluate(y=>{probe=false;samples.sort((a,b)=>a-b);return {p95:samples[Math.floor(samples.length*.95)],max:samples.at(-1),drift:scrollY-y,y:scrollY}},y);assert(Math.abs(r.drift)<2);console.log(name,JSON.stringify(r));await p.close();}
for(const name of ['d-chapters','e-best']){
 const p=await b.newPage(devices['iPhone 13']);const c=await p.context().newCDPSession(p);await p.goto(`http://127.0.0.1:8420/concepts/${name}/`);await p.waitForTimeout(1800);
 for(let k=0;k<3;k++){await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:190,y:550}]});for(let i=1;i<=8;i++){await c.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:190,y:550-i*40}]});await p.waitForTimeout(25)}await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(500)}
 const y=await p.evaluate(()=>scrollY);assert(y>600);console.log(name,'touch scroll passed',y);await p.close();}
await b.close();
