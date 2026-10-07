import {chromium,devices} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome'});
const base='http://127.0.0.1:8420/concepts/';
for(const name of ['d-chapters','e-best']){
 const p=await browser.newPage({viewport:{width:1440,height:900}});await p.goto(base+name+'/');await p.waitForTimeout(1800);
 await p.keyboard.press('End');await p.waitForTimeout(900);assert(await p.evaluate(()=>scrollY+innerHeight>=document.documentElement.scrollHeight-2));
 await p.keyboard.press('Home');await p.waitForTimeout(1500);assert.equal(await p.evaluate(()=>chapterDeck.getState().stop),0);
 for(let i=0;i<24;i++){await p.mouse.wheel(0,100);await p.waitForTimeout(35)}
 assert.equal(await p.evaluate(()=>chapterDeck.getState().stop),1);
 assert(Math.abs(await p.evaluate(()=>scrollY)-900)<3);
 await p.keyboard.press('Home');await p.waitForTimeout(1200);
 await p.locator('[data-chapter="2"]').last().click();await p.waitForTimeout(1800);assert.equal(await p.evaluate(()=>chapterDeck.getState().shown),2);
 const y=await p.evaluate(()=>scrollY);await p.waitForTimeout(1100);assert.equal(await p.evaluate(()=>scrollY),y);
 const hash=await p.locator('.chapter').nth(2).getAttribute('id');await p.goto(base+name+'/#'+hash);await p.waitForTimeout(1800);assert.equal(await p.evaluate(()=>chapterDeck.getState().stop),2);
 await p.setViewportSize({width:800,height:750});await p.waitForTimeout(1800);assert(await p.evaluate(()=>Math.abs(document.querySelector('.stage').getBoundingClientRect().top)<2));
 console.log(name,'one-step wheel, keyboard, nav, idle, deep link, resize passed');await p.close();
}
const a=await browser.newPage();await a.goto(base+'a-aurora/');await a.waitForTimeout(2300);
for(const step of [1,0,1,2,0,2,1,0]){await a.evaluate(step=>{const s=ScrollTrigger.getAll().find(s=>s.trigger?.classList.contains('how')&&s.pin);scrollTo(0,s.start+(s.end-s.start)*[.05,.5,.95][step]);},step);await a.waitForTimeout(80)}
await a.waitForTimeout(1400);assert.equal(await a.locator('.how__slide.is-on').count(),1);assert.equal(await a.locator('.how__cur').textContent(),'1');assert.equal(await a.locator('.how__slide').first().evaluate(el=>getComputedStyle(el).opacity),'1');console.log('aurora fast reversal passed');await a.close();
const c=await browser.newPage({...devices['iPhone 13']});await c.goto(base+'c-editorial/');await c.locator('[role=tablist]').scrollIntoViewIfNeeded();await c.waitForTimeout(1200);const y=await c.evaluate(()=>scrollY);await c.locator('[role=tab]').nth(7).evaluate(e=>e.click());await c.waitForTimeout(1000);assert.equal(await c.evaluate(()=>scrollY),y);console.log('editorial tabs preserve page position');await c.close();
for(const name of ['a-aurora','b-stack','c-editorial','d-chapters','e-best','f-codex']){
const p=await browser.newPage({reducedMotion:'reduce',viewport:{width:390,height:844}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(base+name+'/');await p.waitForTimeout(1500);
assert.equal(errors.length,0);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
if(['d-chapters','e-best'].includes(name))assert(await p.locator('.chapter').evaluateAll(es=>es.every(e=>!e.inert&&getComputedStyle(e).visibility==='visible')));
console.log(name,'reduced motion passed');await p.close();}
await browser.close();
