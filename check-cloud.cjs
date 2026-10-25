const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c=vm.createContext({});vm.runInContext(fs.readFileSync('site/cloud-sync.js','utf8'),c);const Queue=c.AtharSyncQueue;
(async()=>{
 let resolveFirst,calls=[],cache=[],states=[];
 const q=new Queue({push:async(s,v)=>{calls.push([s,v]);if(v===0)await new Promise(r=>resolveFirst=r);return v+1},cache:(...x)=>cache.push(x),status:s=>states.push(s)});
 q.enqueue('first');const running=q.flush();q.enqueue('latest');resolveFirst();await running;
 assert.deepEqual(calls,[['first',0],['latest',1]]);assert.equal(q.revision,2);assert.equal(q.pending,null);assert.equal(states.at(-1),'saved');assert.deepEqual(cache.at(-1),['latest',2,false]);
 const fail=new Queue({revision:4,push:async()=>{throw Error('offline')},cache:()=>{},status:()=>{}});fail.enqueue('keep');assert.equal(await fail.flush(),false);assert.equal(fail.pending,'keep');assert.equal(fail.blocked,false);fail.push=async()=>5;assert.equal(await fail.flush(),true);assert.equal(fail.revision,5);
 const conflict=new Queue({revision:1,push:async()=>{throw Object.assign(Error('ATHAR_REVISION_CONFLICT'),{code:'40001'})},cache:()=>{},status:()=>{}});conflict.enqueue('local-copy');assert.equal(await conflict.flush(),false);assert.equal(conflict.pending,'local-copy');assert.equal(conflict.blocked,true);assert.equal(await conflict.flush(),false);
 const seeded=c.AtharCreateSeedState({classes:[{grade:'الثامن',section:'2',students:[{name:'طالب اختبار',schoolId:'test-only'}]}],curriculum:[{grade:'الثامن',name:'إدخال البيانات'}]});assert.equal(seeded.classes.length,2);assert.equal(seeded.classes[0].students.length,0);assert.equal(seeded.classes[1].students[0].name,'طالب اختبار');assert.equal(seeded.events.length,0);assert.equal(seeded.curriculum.length,1);assert.equal(seeded.classes[1].groups.length,0);
 const html=fs.readFileSync('site/index.html','utf8');assert.ok(html.includes('id="app-root" hidden'));assert.ok(!html.includes('src="app.js"'));
 const roster=JSON.parse(fs.readFileSync('site/import-ready.json','utf8'));assert.equal(roster.classes.length,0);
 const js=fs.readdirSync('site').filter(f=>f.endsWith('.js')).map(f=>fs.readFileSync('site/'+f,'utf8')).join('\n');assert.ok(!js.includes("localStorage.setItem('athar-v1'"));assert.ok(!js.includes('service_role'));assert.ok(!js.includes("fetch('import-ready.json'"));
 const configContext=vm.createContext({window:{}});vm.runInContext(fs.readFileSync('site/cloud-config.js','utf8'),configContext);for(const f of configContext.window.ATHAR_CLOUD_CONFIG.appScripts)assert.ok(fs.existsSync('site/'+f));
 console.log('PASS: save coalescing, ordered revisions, offline recovery, conflict blocking, cache state, authenticated boot and no public student roster.');
})();
