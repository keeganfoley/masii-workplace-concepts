import { chromium, devices } from 'playwright';
const b=await chromium.launch({channel:'chrome'});
for(const name of ['d-chapters','e-best']) for(const mobile of [false,true]) {
const ctx=await b.newContext(mobile?devices['iPhone 13']:{viewport:{width:1440,height:900}});const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(`http://127.0.0.1:8420/concepts/${name}/`);await p.waitForTimeout(2300);
const h=await p.locator('.stage').evaluate(e=>e.offsetHeight);
for(const step of [1,2,0,3]){await p.evaluate(y=>scrollTo({top:y,behavior:'instant'}),step*h);await p.waitForTimeout(1700);const state=await p.evaluate(()=>({y:scrollY,stop:chapterDeck.getState().stop,shown:chapterDeck.getState().shown,frame:document.querySelector('.story-frame').getBoundingClientRect().top,stage:document.querySelector('.stage').getBoundingClientRect().top}));console.log(name,mobile,step,state);if(state.stop!==step||state.shown!==step||Math.abs(state.stage)>2)throw Error('chapter position failed');}
await p.screenshot({path:`/tmp/${name}-${mobile?'phone':'desk'}-native.png`});console.log({name,mobile,errors});if(errors.length)throw Error(errors.join());await ctx.close();}
await b.close();
