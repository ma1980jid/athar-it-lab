(async function(){
 'use strict';
 const cfg=window.ATHAR_CLOUD_CONFIG,$=s=>document.querySelector(s),app=$('#app-root'),auth=$('#auth-screen'),notice=$('#auth-message');
 const client=window.AtharCreateClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 let queue,user,storageKey,pendingKey,timer;
 const say=(message,error=false)=>{notice.textContent=message;notice.dataset.error=String(error)};
 const download=(text)=>{const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='athar-cloud-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 function status(state){
  const el=$('#cloud-state');if(!el)return;el.dataset.state=state;el.textContent={pending:'تغييرات بانتظار الحفظ',saving:'جارٍ الحفظ في السحابة…',saved:'محفوظ في السحابة',error:'تعذّر الحفظ السحابي — أعد المحاولة',conflict:'توجد نسخة أحدث — توقف الحفظ لحماية بياناتك'}[state]||state;
  if(state==='conflict'){$('#cloud-conflict').hidden=false;app.inert=true;}
 }
 async function flush(){clearTimeout(timer);return queue?.flush()}
 function write(serialized){
  if(!queue||!user)throw Error('Authentication required');
  const value=JSON.parse(serialized);if(!valid(value))throw Error('Invalid workspace');
  queue.enqueue(serialized);clearTimeout(timer);timer=setTimeout(flush,500);
 }
 function valid(data){return data?.version===1&&Array.isArray(data.classes)&&data.classes.length&&data.classes.every(c=>Array.isArray(c.students)&&Array.isArray(c.groups))&&Array.isArray(data.events)&&Array.isArray(data.questions)&&data.settings&&data.approvals;}
 function recoverConflict(pending){
  $('#cloud-conflict').hidden=false;auth.hidden=true;app.hidden=true;
  $('#conflict-export').onclick=()=>download(pending.snapshot);
  $('#conflict-reload').onclick=()=>{if(confirm('هل حفظت نسختك المحلية؟ سيُفتح الإصدار الموجود في السحابة وتُترك التغييرات المحلية غير المرسلة.')){localStorage.removeItem(pendingKey);location.reload()}};
 }
 function commonControls(){
  $('#cloud-retry').onclick=async()=>{await flush();};
  $('#cloud-refresh').onclick=async()=>{if(await flush())location.reload();else status(queue.blocked?'conflict':'error')};
  $('#cloud-export').onclick=()=>{const text=queue.pending||localStorage.getItem(storageKey);if(text)download(text)};
  $('#cloud-signout').onclick=async()=>{await flush();if(queue.pending)download(queue.pending);const {error}=await client.auth.signOut({scope:'local'});if(error){status('error');return}app.hidden=true;localStorage.removeItem(storageKey);location.reload()};
  $('#conflict-export').onclick=()=>{if(queue.pending)download(queue.pending)};
  $('#conflict-reload').onclick=()=>{if(confirm('هل حفظت نسخة من تغييراتك المحلية؟ سيتم فتح النسخة الأحدث من السحابة.')){localStorage.removeItem(pendingKey);location.reload()}};
  window.addEventListener('online',flush);
  window.addEventListener('beforeunload',e=>{if(queue.pending){e.preventDefault();e.returnValue=''}});
 }
 async function boot(){
  const {data:{session}}=await client.auth.getSession();if(!session){say('سجّل الدخول بحساب المعلم للوصول إلى بياناتك.');return}
  const result=await client.auth.getUser();if(result.error||!result.data.user)throw Error('تعذّر التحقق من الجلسة. أعد تسجيل الدخول عند توفر الاتصال.');
  user=result.data.user;
  if(user.email?.toLowerCase()!==cfg.teacherEmail.toLowerCase()||!user.email_confirmed_at){await client.auth.signOut({scope:'local'});throw Error('هذا الحساب غير مخول أو لم يؤكد بريده بعد.')}
  const access=await client.from('athar_allowed_teachers').select('email').eq('email',user.email.toLowerCase()).maybeSingle();if(access.error||!access.data)throw Error('الحساب غير مخول بفتح منصة أثر.');
  storageKey='athar-cloud-workspace-'+user.id;pendingKey='athar-cloud-pending-'+user.id;
  const {data,error}=await client.from('athar_workspaces').select('payload,revision').eq('owner_id',user.id).maybeSingle();if(error)throw Error('تعذّر تحميل بياناتك من السحابة. حاول مجددًا.');
  let pending=null;try{pending=JSON.parse(localStorage.getItem(pendingKey))}catch{throw Error('تعذّر قراءة نسخة الحفظ المحلي. احتفظ ببيانات المتصفح واطلب المساعدة.')}
  const revision=data?.revision||0;
  if(pending?.dirty&&pending.revision!==revision){recoverConflict(pending);return}
  const payload=pending?.dirty?JSON.parse(pending.snapshot):data?.payload;
  if(payload&&!valid(payload))throw Error('بنية البيانات المحفوظة غير صالحة. لم تُستبدل بياناتك.');
  if(payload)localStorage.setItem(storageKey,JSON.stringify(payload));else localStorage.removeItem(storageKey);
  queue=new window.AtharSyncQueue({revision,
   push:async(snapshot,expected)=>{const {data,error}=await client.rpc('athar_save_workspace',{expected_revision:expected,document:JSON.parse(snapshot)});if(error)throw error;return Number(data)},
   cache:(snapshot,revision,dirty)=>{localStorage.setItem(pendingKey,JSON.stringify({snapshot,revision,dirty}));localStorage.setItem(storageKey,snapshot)},status});
  window.AtharCloud={storageKey,write,flush,loadImport:async()=>{const {data,error}=await client.from('athar_import_package').select('payload').eq('singleton',true).single();if(error)throw Error('تعذّر تحميل قوائم الطلاب المحمية.');return data.payload}};
  commonControls();
  for(const src of cfg.appScripts){await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=()=>reject(Error('تعذّر تحميل أحد ملفات المنصة؛ أعد تحميل الصفحة.'));document.body.append(script)})}
  $('#cloud-account').textContent=user.email;auth.hidden=true;app.hidden=false;$('#cloud-toolbar').hidden=false;status(queue.pending?'pending':'saved');
  if(!data){$('#cloud-welcome').hidden=false;$('#welcome-close').onclick=()=>{$('#cloud-welcome').hidden=true};}
  if(pending?.dirty&&!queue.pending)write(pending.snapshot);await flush();
 }
 $('#auth-login').onsubmit=async e=>{e.preventDefault();const button=$('#login-submit');button.disabled=true;say('جارٍ التحقق…');try{const {error}=await client.auth.signInWithPassword({email:$('#auth-email').value.trim(),password:$('#auth-password').value});if(error)throw error;location.reload()}catch{say('تعذّر الدخول. تحقق من البريد وكلمة المرور وتأكيد البريد الإلكتروني.',true)}finally{button.disabled=false}};
 $('#register-account').onclick=async()=>{const email=$('#auth-email').value.trim().toLowerCase(),password=$('#auth-password').value;if(email!==cfg.teacherEmail.toLowerCase()){say('إنشاء الحساب مخصص لبريد المعلم المخول فقط.',true);return}if(password.length<12){say('اختر كلمة مرور من ١٢ محرفًا على الأقل عند إنشاء الحساب.',true);return}$('#register-account').disabled=true;try{const {data,error}=await client.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname}});if(error)throw error;if(data.session){location.reload();return}say('أُرسل رابط تأكيد إلى بريدك. افتحه ثم عد إلى هذه الصفحة وسجّل الدخول. إذا كان حسابك موجودًا فاستخدم تسجيل الدخول.')}catch{say('تعذّر إنشاء الحساب. حاول لاحقًا أو تحقق من إعدادات البريد في Supabase.',true)}finally{$('#register-account').disabled=false}};
 client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'&&user){app.hidden=true;$('#cloud-toolbar').hidden=true;setTimeout(()=>location.reload(),0)}});
 try{await boot()}catch(error){say(error.message||'تعذّر الاتصال بالمنصة. أعد المحاولة.',true);app.hidden=true;auth.hidden=false;}
})();
