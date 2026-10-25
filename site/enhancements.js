/* Version two: compatible with existing local records. */
function upgradeData(){
  db.curriculum??=[];db.imports??=[];
  db.settings.school??='مدرسة الشيخ حمدان بن خميس اليوسفي';
  db.settings.teacher??='معلم تقنية المعلومات';
  db.lessons??=[...new Set(db.questions.map(q=>q.lesson))];
  db.classes.forEach(c=>{const parts=c.name.split('/').map(s=>s.trim());c.grade??=parts[0];c.section??=parts[1]||'١';c.pending??=[];c.replacements??={};});
}
upgradeData();
bands.splice(4,0,'المشاركة في منصة نور');
options['المشاركة في منصة نور']=[['شارك وأنجز',2],['مشاركة جزئية',1],['لم يشارك',0]];
let chosenLesson='',historyBand='all';
const arabicDate=d=>new Date(d+'T12:00:00').toLocaleDateString('ar-OM',{day:'numeric',month:'short',year:'numeric'});
const gradeOrder=['الخامس','السادس','السابع','الثامن','التاسع','العاشر','الحادي عشر','الثاني عشر'];
const oldClassOptions=classOptions;
classOptions=function(){
  if(!db.classes.some(c=>c.id===cid))cid=db.classes[0].id;
  let el=$('#grade-select');if(!el){el=document.createElement('select');el.id='grade-select';el.setAttribute('aria-label','اختيار الصف');$('#class-select').before(el)}
  const grades=[...new Set(db.classes.map(c=>c.grade))];el.innerHTML=grades.map(g=>`<option>${esc(g)}</option>`).join('');el.value=cls().grade;
  $('#class-select').innerHTML=db.classes.filter(c=>c.grade===cls().grade).map(c=>`<option value="${c.id}">الشعبة ${esc(c.section)}</option>`).join('');$('#class-select').value=cid;$('#class-select').setAttribute('aria-label','اختيار الشعبة');
  el.onchange=()=>{cid=db.classes.find(c=>c.grade===el.value).id;classChanged()};
  $('#class-select').onchange=e=>{cid=+e.target.value;classChanged()};
};
function classChanged(){query='';candidate=null;question=null;syncAttendance();classOptions();render()}
function schoolIdentity(){return `<img class="school-logo" src="school-logo.png" alt="شعار المدرسة"><div><strong>${esc(db.settings.school)}</strong><span>مختبر تقنية المعلومات <i>•</i> ${esc(db.settings.teacher)}</span></div>`}
const baseRender=render;
render=function(){
  baseRender();
  let school=$('#school-identity');if(!school){school=document.createElement('div');school.id='school-identity';school.className='school-identity';$('header').before(school)}school.innerHTML=schoolIdentity();
  const footer=$('footer');footer.innerHTML=`<span>${esc(db.settings.school)}</span><span>إشراف: ${esc(db.settings.teacher)} · أثر</span>`;
};
const baseDisplay=displayView;
displayView=function(){return `<div class="screen-school">${schoolIdentity()}</div>`+baseDisplay()};
function historyPanel(id){
  const all=events(id),abs=Object.entries(db.attendance||{}).filter(([key,v])=>v&&key.startsWith(cid+'-')&&key.endsWith('-'+id)).map(([key])=>key.slice(String(cid).length+1,-String(id).length-1));
  const counters=[['التأخير','متأخر','تأخر'],['إحضار الكتاب','لم يحضر','نسي الكتاب'],['المشاركة في منصة نور','شارك وأنجز','مشاركات نور']];
  const counts=counters.map(([b,l,t])=>`<div class="student-metric"><strong>${all.filter(e=>e.band===b&&e.label===l).length}</strong><span>${t}</span></div>`).join('');
  const filtered=all.filter(e=>historyBand==='all'||e.band===historyBand);const dates=[...new Set([...filtered.map(e=>e.date),...(historyBand==='all'||historyBand==='الحضور'?abs:[])])].sort().reverse();
  return `<section class="student-history"><div class="section-heading"><div><span class="eyebrow">الصورة الكاملة للمتابعة</span><h3>سجل الطالب حسب التاريخ</h3></div><select id="history-filter" aria-label="تصفية سجل الطالب"><option value="all">جميع البنود</option>${[...bands,'الحضور'].map(b=>`<option ${b===historyBand?'selected':''}>${b}</option>`).join('')}</select></div><div class="student-metrics">${counts}<div class="student-metric"><strong>${abs.length}</strong><span>أيام غياب</span></div></div><div class="timeline">${dates.map(d=>`<article class="timeline-day"><h4><span>◷</span> ${arabicDate(d)} ${d===date()?'<em>الحصة المحددة</em>':''}</h4>${abs.includes(d)?'<div class="timeline-entry warning"><span>الحضور</span><b>غائب</b></div>':''}${filtered.filter(e=>e.date===d).reverse().map(e=>`<div class="timeline-entry ${['متأخر','لم يحضر','لم يشارك','غير منجز'].includes(e.label)?'warning':''}"><div><span>${esc(e.band)}</span><b>${esc(e.label)}</b>${e.note?`<p>${esc(e.note)}</p>`:''}${e.questionText?`<p>السؤال: ${esc(e.questionText)}</p>`:''}</div><div class="entry-end">${e.points?`<span class="score-chip">+${e.points}</span>`:''}<button data-remove-event="${e.id}" aria-label="حذف التسجيل">تراجع</button></div></div>`).join('')}</article>`).join('')||'<div class="empty">لا توجد متابعات لهذا البند بعد.</div>'}</div></section>`;
}
openStudent=function(id){
  activeStudent=id;const s=cls().students.find(s=>s.id===id),dlg=$('#student-modal');
  dlg.innerHTML=`<div class="student-cover"><button class="close-modal" id="close-student" aria-label="إغلاق">✕</button><span class="avatar c${id%4}">${esc(s.name.split(' ').map(n=>n[0]).slice(0,2).join(' '))}</span><div><span class="eyebrow">${esc(cls().grade)} · الشعبة ${esc(cls().section)}</span><h2>${esc(s.name)}</h2><p>${points(id)} نقطة إنجاز <span>•</span> ${talks(id).length} فرصة حوار</p></div><span class="student-status ${s.absent?'absent':''}">${s.absent?'غائب':'حاضر'}</span></div><div class="student-dialog-body"><div class="section-heading"><div><h3>تسجيل متابعة</h3><span class="muted">${arabicDate(date())}</span></div><button class="${s.absent?'danger':'soft'}" id="absence">${s.absent?'تسجيل الحضور':'تسجيل الغياب'}</button></div><label class="note-field">ملاحظة اختيارية<input id="note" placeholder="أضف ملاحظة قبل اختيار المتابعة…"></label><div class="record-grid">${bands.map((b,i)=>`<section class="record-tile"><div class="record-label"><span>${['◉','⌘','♧','▤','✦','▣','✓','◷'][i]}</span><h4>${b}</h4></div><div class="record-options">${options[b].map(([l,p])=>`<button ${s.absent?'disabled':''} data-record="${b}" data-label="${l}" data-points="${p}" class="${p?'positive':''}">${l}${p?`<small>+${p}</small>`:''}</button>`).join('')}</div></section>`).join('')}</div>${historyPanel(id)}</div>`;
  if(!dlg.open)dlg.showModal();$('#close-student').onclick=()=>{dlg.close();historyBand='all'};
  $$('[data-record]').forEach(b=>b.onclick=()=>{record(id,b.dataset.record,b.dataset.label,+b.dataset.points);render();openStudent(id)});
  $('#absence').onclick=()=>{setAbsent(id,!s.absent);render();openStudent(id)};
  $('#history-filter').onchange=e=>{historyBand=e.target.value;openStudent(id)};
  $$('[data-remove-event]').forEach(b=>b.onclick=()=>{const ev=db.events.find(e=>e.id===b.dataset.removeEvent);if(ev?.band==='الحوار'){delete db.approvals[`${cid}-${id}-${ev.period}`];if(ev.makeupDate&&!cls().pending.some(x=>x.id===id))cls().pending.push({id,date:ev.makeupDate})}db.events=db.events.filter(e=>e.id!==b.dataset.removeEvent);save();render();openStudent(id)});
};
function deferStudent(id){const c=cls();if(!c.pending.some(x=>x.id===id))c.pending.push({id,date:date()})}
function setAbsent(id,value){const s=cls().students.find(s=>s.id===id);s.absent=value;if(value&&(targetIds().includes(id)||candidate===id))deferStudent(id);save()}
function eligibleDialogue(){
  const c=cls(),targets=targetIds(),present=c.students.filter(s=>!s.absent),returning=c.pending.filter(x=>x.date<date()&&present.some(s=>s.id===x.id));
  const absentTargets=c.students.filter(s=>targets.includes(s.id)&&s.absent);
  const usedReplacement=c.replacements[date()]||[];
  const other=absentTargets.length>usedReplacement.length?present.filter(s=>!targets.includes(s.id)&&!usedReplacement.includes(s.id)&&!returning.some(x=>x.id===s.id)):[];
  const regular=present.filter(s=>targets.includes(s.id));
  return {returning,other,regular,all:[...new Map([...returning.map(x=>present.find(s=>s.id===x.id)),...regular,...other].map(s=>[s.id,s])).values()],absentTargets};
}
function nominateStudent(preferReplacement=false){
  if(!cls().groups.length){toast('وزّع المجموعات أولًا');return}
  const c=cls();c.students.filter(s=>targetIds().includes(s.id)&&s.absent).forEach(s=>deferStudent(s.id));save();
  const pool=eligibleDialogue();let candidates;
  if(preferReplacement&&pool.other.length)candidates=pool.other;
  else if(pool.returning.length)candidates=pool.returning.map(x=>c.students.find(s=>s.id===x.id));
  else if(pool.other.length)candidates=pool.other;
  else candidates=pool.regular;
  let filtered=candidates.filter(s=>s.id!==candidate);if(!filtered.length)filtered=candidates;
  if(!filtered.length){toast('لا يوجد طالب حاضر متاح للترشيح');candidate=null;question=null;render();return}
  let min=Math.min(...filtered.map(s=>talks(s.id,period()).length));filtered=filtered.filter(s=>talks(s.id,period()).length===min);candidate=filtered[Math.floor(Math.random()*filtered.length)].id;question=null;render();
}
const baseRecord=record;
record=function(id,band,label,pts,q=null){const before=db.events.length;const debt=cls().pending.find(x=>x.id===id);baseRecord(id,band,label,pts,q);if(band==='الحوار'&&db.events.length>before){
  const ev=db.events[db.events.length-1];if(debt){ev.makeupDate=debt.date;cls().pending=cls().pending.filter(x=>x.id!==id)}
  if(!targetIds().includes(id)&&!debt){cls().replacements[date()]??=[];if(!cls().replacements[date()].includes(id))cls().replacements[date()].push(id)}save();
}};
const baseDialogue=dialogue;
dialogue=function(){let html=baseDialogue();const pool=eligibleDialogue();const side=`<div class="panel dialogue-queue"><h2>فرص عادلة، ومتابعة مستمرة</h2><p class="muted">أولوية للغائبين سابقًا، ثم الطلاب الأقل حصولًا على فرص.</p>${pool.all.sort((a,b)=>Number(pool.returning.some(x=>x.id===b.id))-Number(pool.returning.some(x=>x.id===a.id))||talks(a.id,period()).length-talks(b.id,period()).length).map(s=>`<button class="queue-item" data-pick="${s.id}" style="width:100%"><span>${esc(s.name)}${pool.returning.some(x=>x.id===s.id)?'<small class="makeup-tag">تعويض غياب سابق</small>':!targetIds().includes(s.id)?'<small class="makeup-tag">بديل من مجموعة أخرى</small>':''}</span><b>${talks(s.id,period()).length}</b></button>`).join('')||'<p class="empty">وزّع المجموعات وحدد الحضور.</p>'}${cls().pending.length?`<div class="pending-list"><h4>بانتظار تعويض فرصة الحوار</h4>${cls().pending.map(x=>`<p>${esc(cls().students.find(s=>s.id===x.id)?.name||'')}<small>من ${arabicDate(x.date)}</small></p>`).join('')}</div>`:''}</div>`;
  const start=html.indexOf('<div class="panel"><h2>الأقل حصولًا على فرص');const end=html.indexOf('</div></div><p class="muted">معيار النسخة',start);
  if(start>=0&&end>=0)html=html.slice(0,start)+side+html.slice(end+6);
  if(candidate)html=html.replace('<div style="margin-top:20px">', '<button class="danger" id="absent-replace" style="margin-top:15px">غائب · ترشيح بديل من مجموعة أخرى</button><div style="margin-top:20px">');
  return html;
};
questions=function(){const lessons=[...new Set([...db.lessons,...db.questions.map(q=>q.lesson)])];if(!lessons.includes(chosenLesson))chosenLesson=lessons[0]||'';const list=db.questions.filter(q=>q.lesson===chosenLesson);return `<div class="toolbar"><div><span class="eyebrow">مكتبة الحوار الصفي</span><h2>بنك الأسئلة حسب الدروس</h2><p>${lessons.length} دروس · ${db.questions.length} أسئلة متدرجة</p></div><div class="tools"><button class="outline" id="add-lesson">+ درس جديد</button><button class="primary" id="add-question">+ إضافة سؤال</button></div></div><div class="lesson-layout"><div class="panel lesson-nav"><h3>الدروس</h3>${lessons.map((l,i)=>`<button class="lesson-tab ${chosenLesson===l?'selected':''}" data-lesson-index="${i}"><span class="lesson-icon">▤</span><span>${esc(l)}<small>${db.questions.filter(q=>q.lesson===l).length} أسئلة</small></span><b>←</b></button>`).join('')}</div><div class="panel"><div class="section-heading"><h2>${esc(chosenLesson||'أضف أول درس')}</h2><span class="badge">${list.length} أسئلة</span></div>${list.map(q=>`<article class="q-card"><span class="level-label level-${['أساسي','تطبيقي','متقدم'].indexOf(q.level)}">${esc(q.level)}</span><h3>${esc(q.text)}</h3><details><summary>الإجابة النموذجية ومعيار الإتقان</summary><p>${esc(q.answer)}</p></details><div class="q-actions"><button class="soft" data-edit-q="${q.id}">تعديل السؤال</button><button class="danger" data-delete-q="${q.id}">حذف</button></div></article>`).join('')||'<div class="empty">هذا الدرس جاهز. أضف أول سؤال له.</div>'}</div></div>`};
const baseSettings=settings;
settings=function(){let html=baseSettings();const insertion=`<div class="settings-identity wide"><img src="school-logo.png" alt="شعار المدرسة"><div><h3>هوية المنصة والمدرسة</h3><p class="muted">تظهر الهوية في الواجهة، وشاشة المختبر، والتقارير.</p></div></div><label class="wide">اسم المدرسة<input name="school" required value="${esc(db.settings.school)}"></label><label>اسم المعلم<input name="teacher" required value="${esc(db.settings.teacher)}"></label><label>الصف<input name="grade" list="grade-list" required value="${esc(cls().grade)}"><datalist id="grade-list">${gradeOrder.map(g=>`<option>${g}</option>`).join('')}</datalist></label><label>الشعبة<input name="section" required value="${esc(cls().section)}"></label>`;
  html=html.replace('<label>اسم الصف<input name="className" required value="'+esc(cls().name)+'"></label>',insertion);
  return html;
};
const baseReports=reports;
reports=function(){return baseReports().replace('<div class="report-heading">',`<div class="report-school">${schoolIdentity()}</div><div class="report-heading">`)};
const baseBind=bind;
bind=function(){baseBind();
  if($('#nominate'))$('#nominate').onclick=()=>nominateStudent();
  if($('#absent-replace'))$('#absent-replace').onclick=()=>{setAbsent(candidate,true);candidate=null;question=null;nominateStudent(true)};
  if($('#next-session'))$('#next-session').onclick=()=>{if(!cls().groups.length){toast('وزّع المجموعات أولًا');return}if(!confirm('الانتقال للحصة التالية؟ سيُحفظ حق الطالب الغائب في فرصة تعويض. حدّد تاريخ الحصة الجديدة أعلى الشاشة.'))return;cls().students.filter(s=>targetIds().includes(s.id)&&s.absent).forEach(s=>deferStudent(s.id));if(cls().session%2===1)shuffle();else cls().session++;candidate=null;question=null;save();render();toast('حدّد تاريخ الحصة الجديدة؛ سيُسترجع حضورها مستقلًا')};
  if(page==='questions'&&!screen){const lessons=[...new Set([...db.lessons,...db.questions.map(q=>q.lesson)])];$$('[data-lesson-index]').forEach(b=>b.onclick=()=>{chosenLesson=lessons[+b.dataset.lessonIndex];render()});$('#add-lesson').onclick=()=>{let name=prompt('اسم الدرس الجديد');if(!name?.trim())return;name=name.trim();if(!db.lessons.includes(name))db.lessons.push(name);chosenLesson=name;save();render()};$('#add-question').onclick=()=>{editQuestion();$('#q-form [name=lesson]').value=chosenLesson||db.settings.topic};}
  if($('#settings-form'))$('#settings-form').onsubmit=e=>{
    e.preventDefault();const v=Object.fromEntries(new FormData(e.target));const gradeName=v.grade.trim(),section=v.section.trim();
    if(!gradeName||!section||!v.school.trim()||!v.teacher.trim()){toast('أكمل بيانات المدرسة والمعلم والصف والشعبة');return}
    if(db.classes.some(c=>c.id!==cid&&c.grade===gradeName&&c.section===section)){toast('هذا الصف وهذه الشعبة موجودان بالفعل');return}
    if(!(v.start<=v.mid&&v.mid<v.end)){toast('رتّب تواريخ الفصل والفترتين');return}
    const ns=v.names.split('\n').map(n=>n.trim()).filter(Boolean);if(!ns.length){toast('أضف اسم طالب واحد على الأقل');return}
    const removed=cls().students.slice(ns.length);if(removed.some(s=>events(s.id).length||cls().pending.some(x=>x.id===s.id))){toast('لا يمكن حذف طالب لديه سجلات أو فرصة تعويض معلقة');return}
    const changed=v.start!==db.settings.start||v.mid!==db.settings.mid||v.end!==db.settings.end;if(changed&&db.events.length&&!confirm('سيعاد توزيع تقييمات الحوار على الفترتين، ويلغى اعتماد درجاتهما. متابعة؟'))return;
    const rosterChanged=ns.join('\n')!==cls().students.map(s=>s.name).join('\n');let max=Math.max(0,...db.classes.flatMap(c=>c.students.map(s=>s.id)));
    cls().students=ns.map((name,i)=>({...cls().students[i],id:cls().students[i]?.id||++max,name,absent:cls().students[i]?.absent||false}));cls().grade=gradeName;cls().section=section;cls().name=gradeName+' / '+section;
    Object.assign(db.settings,{school:v.school.trim(),teacher:v.teacher.trim(),start:v.start,mid:v.mid,end:v.end,topic:v.topic,goal:v.goal});
    if(changed){db.events.forEach(e=>e.period=e.date<=v.mid?1:2);db.approvals={}}
    if(rosterChanged){cls().groups=[];cls().session=0}save();classOptions();render();toast('تم حفظ الهوية والصف والإعدادات')
  };
  if($('#new-class'))$('#new-class').onclick=()=>{let gradeName=prompt('الصف، مثل: الثامن');if(!gradeName?.trim())return;let section=prompt('الشعبة، مثل: ٢');if(!section?.trim())return;gradeName=gradeName.trim();section=section.trim();if(db.classes.some(c=>c.grade===gradeName&&c.section===section)){toast('الصف والشعبة موجودان بالفعل');return}let id=Date.now();db.classes.push({id,grade:gradeName,section,name:gradeName+' / '+section,students:[{id,name:'طالب جديد',absent:false}],groups:[],session:0,pending:[],replacements:{}});cid=id;save();classOptions();render()};
};
// Restore old backups with the same migration before rendering or saving attendance.
const restoreHandler=$('#restore').onchange;
$('#restore').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{const data=JSON.parse(await file.text());if(data.version!==1||!data.classes?.length||!data.classes.every(c=>Array.isArray(c.students)&&Array.isArray(c.groups))||!Array.isArray(data.events)||!Array.isArray(data.questions)||!data.settings||!data.approvals)throw Error();if(!confirm('استبدال البيانات الحالية بالنسخة المختارة؟'))return;db=data;upgradeData();cid=db.classes[0].id;candidate=null;question=null;syncAttendance();save();classOptions();render();toast('تمت استعادة النسخة')}catch{toast('ملف النسخة غير صالح')}e.target.value=''};
window.addEventListener('storage',e=>{if(e.key===window.AtharCloud.storageKey&&e.newValue){upgradeData();classOptions();syncAttendance();render()}});
classOptions();render();
