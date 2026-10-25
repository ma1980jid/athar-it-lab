const termNames={first:'الفصل الدراسي الأول',second:'الفصل الدراسي الثاني'};
function ensureSchoolSettings(){
  const s=db.settings;s.director??='';s.supervisor??='';s.academicYear??='2026 / 2027';s.activeTerm??='first';
  s.terms??={first:{start:s.start,mid:s.mid,end:s.end},second:{start:'',mid:'',end:''}};
  s.terms.first??={start:s.start,mid:s.mid,end:s.end};s.terms.second??={start:'',mid:'',end:''};
  db.termApprovals??={};db.termApprovals[s.activeTerm]=db.approvals||{};
  db.events.forEach(e=>{e.termId??='first'});
}
ensureSchoolSettings();
const beforeSchoolSave=save;
save=function(){if(db.settings.activeTerm){db.termApprovals??={};db.termApprovals[db.settings.activeTerm]=db.approvals}return beforeSchoolSave()};
const unfilteredTermEvents=events;
events=function(id){return unfilteredTermEvents(id).filter(e=>(e.termId||'first')===(db.settings.activeTerm||'first'))};
const recordBeforeTerms=record;
record=function(...args){const before=db.events.length;recordBeforeTerms(...args);if(db.events.length>before){db.events.at(-1).termId=db.settings.activeTerm;save()}};
function termDatesValid(t){return !!(t.start&&t.mid&&t.end&&t.start<=t.mid&&t.mid<t.end)}
function termSettingsValidation(first,second,active){
  for(const [id,t]of Object.entries({first,second})){const any=!!(t.start||t.mid||t.end);if(any&&!termDatesValid(t))return `أكمل تواريخ ${termNames[id]} بالترتيب: البداية، ثم منتصف الفصل، ثم النهاية.`;}
  if(!termDatesValid(active==='first'?first:second))return 'حدد التواريخ الثلاثة للفصل الذي تريد تفعيله.';
  if(termDatesValid(first)&&termDatesValid(second)&&first.end>=second.start)return 'يجب أن يبدأ الفصل الثاني بعد نهاية الفصل الأول.';
  return '';
}
function changeAcademicTerm(nextId){
  const oldId=db.settings.activeTerm;if(oldId===nextId)return;
  db.termApprovals[oldId]=db.approvals;
  for(const c of db.classes){c.termDialogue??={};c.termDialogue[oldId]={groups:c.groups,session:c.session,pending:c.pending,replacements:c.replacements};const next=c.termDialogue[nextId]||{groups:[],session:0,pending:[],replacements:{}};Object.assign(c,next);}
  db.settings.activeTerm=nextId;db.approvals=db.termApprovals[nextId]||{};Object.assign(db.settings,db.settings.terms[nextId]);candidate=null;question=null;reportStudent=null;
}
titles.settings='الإعدادات';titles.roster='الصفوف والطلاب';
const settingsNav=$('nav [data-page="settings"]');if(settingsNav)settingsNav.innerHTML='⚙ <span>الإعدادات</span>';
addPageButton('roster','♙','الصفوف والطلاب');
function semesterCard(id){const t=db.settings.terms[id],active=db.settings.activeTerm===id;return `<section class="semester-card ${active?'active-semester':''}"><div class="semester-title"><span class="semester-number">${id==='first'?'٠١':'٠٢'}</span><div><h3>${termNames[id]}</h3><small>${active?'الفصل المفعّل حاليًا':termDatesValid(t)?'التواريخ محفوظة':'أضف التواريخ حسب التقويم المدرسي'}</small></div>${active?'<span class="active-dot"></span>':''}</div><label>بداية الفصل الدراسي<input type="date" name="${id}_start" value="${esc(t.start)}"></label><label>منتصف الفصل الدراسي<input type="date" name="${id}_mid" value="${esc(t.mid)}"><small>نهاية تقييم الجزء الأول من الحوار · ١٠ درجات</small></label><label>نهاية الفصل الدراسي<input type="date" name="${id}_end" value="${esc(t.end)}"><small>نهاية تقييم الجزء الثاني من الحوار · ١٠ درجات</small></label></section>`}
settings=function(){ensureSchoolSettings();return `<form id="school-settings-form" class="school-settings"><section class="settings-personnel panel"><div class="settings-section-head"><span class="settings-section-icon">♙</span><div><h2>الهيئة التعليمية والإدارية</h2><p>الأسماء المعتمدة في المنصة والتقارير</p></div></div><div class="personnel-fields"><label><span>اسم المعلم</span><input name="teacher" value="${esc(db.settings.teacher)}" placeholder="أدخل اسم المعلم" required autocomplete="name"></label><label><span>اسم مدير المدرسة</span><input name="director" value="${esc(db.settings.director)}" placeholder="أدخل اسم مدير المدرسة"></label><label><span>اسم المشرف التربوي</span><input name="supervisor" value="${esc(db.settings.supervisor)}" placeholder="أدخل اسم المشرف التربوي"></label></div></section><section class="panel academic-settings"><div class="settings-section-head"><span class="settings-section-icon">▦</span><div><h2>بيانات الفصلين الدراسيين</h2><p>تواريخ الدراسة وفترتا تقييم الحوار لكل فصل</p></div></div><div class="academic-toolbar"><label>العام الدراسي<input name="academicYear" value="${esc(db.settings.academicYear)}" placeholder="2026 / 2027" required></label><label>الفصل الدراسي المفعّل<select name="activeTerm"><option value="first" ${db.settings.activeTerm==='first'?'selected':''}>الفصل الدراسي الأول</option><option value="second" ${db.settings.activeTerm==='second'?'selected':''}>الفصل الدراسي الثاني</option></select></label><div class="academic-caption"><span>٢٠</span><p>درجة للحوار في كل فصل<small>١٠ درجات لكل جزء</small></p></div></div><div class="semester-grid">${semesterCard('first')}${semesterCard('second')}</div><p class="semester-note">يمكن حفظ تواريخ الفصل الثاني لاحقًا. يبقى سجل كل فصل ودرجاته مستقلين عند التبديل بين الفصلين.</p></section><div id="settings-error" class="settings-error" role="alert" hidden></div><div class="settings-save-bar"><span>تُحفظ البيانات على هذا المتصفح</span><button class="primary" type="submit">✓ حفظ الإعدادات</button></div></form>`};
function bindSchoolSettings(){const form=$('#school-settings-form');if(!form)return;
  const showError=text=>{$('#settings-error').textContent=text;$('#settings-error').hidden=false;$('#settings-error').scrollIntoView?.({block:'nearest',behavior:'smooth'})};
  form.onsubmit=e=>{e.preventDefault();const v=Object.fromEntries(new FormData(form)),first={start:v.first_start,mid:v.first_mid,end:v.first_end},second={start:v.second_start,mid:v.second_mid,end:v.second_end};const error=termSettingsValidation(first,second,v.activeTerm);if(error){showError(error);return}if(!v.teacher.trim()||!v.academicYear.trim()){showError('أدخل اسم المعلم والعام الدراسي.');return}
    const nextTerms={first,second},changed=[];for(const id of ['first','second'])if(JSON.stringify(db.settings.terms[id])!==JSON.stringify(nextTerms[id]))changed.push(id);
    const changedWithEvents=changed.filter(id=>db.events.some(e=>e.termId===id));if(changedWithEvents.length&&!confirm('تعديل حدود التقييم يعيد توزيع تقييمات الحوار داخل الفصل المعدل ويلغي اعتماد درجاته لإعادة المراجعة. متابعة؟'))return;
    
    db.settings.terms=nextTerms;
    for(const id of changed){db.events.filter(e=>e.termId===id).forEach(e=>e.period=e.date<=nextTerms[id].mid?1:2);db.termApprovals[id]={};if(id===db.settings.activeTerm)db.approvals={}}
    changeAcademicTerm(v.activeTerm);Object.assign(db.settings,db.settings.terms[db.settings.activeTerm]);Object.assign(db.settings,{teacher:v.teacher.trim(),director:v.director.trim(),supervisor:v.supervisor.trim(),academicYear:v.academicYear.trim()});
    if(save()){render();toast('تم حفظ الأسماء وبيانات الفصلين الدراسيين')}
  };
}
function rosterPage(){return `<div class="panel"><div class="section-heading"><div><h2>إدارة الصفوف والطلاب</h2><p class="muted">${esc(cls().grade)} / ${esc(cls().section)} · ${cls().students.length} طالبًا</p></div><button class="outline" id="roster-new">+ صف وشعبة</button></div><form id="roster-form"><div class="roster-fields"><label>الصف<input name="grade" required value="${esc(cls().grade)}"></label><label>الشعبة<input name="section" required value="${esc(cls().section)}"></label></div><label class="roster-list">أسماء الطلاب — اسم واحد في كل سطر<textarea name="names" rows="12">${esc(cls().students.map(s=>s.name).join('\n'))}</textarea></label><p class="muted">تعديل الاسم في السطر نفسه يحافظ على سجل الطالب. لاستيراد قوائم كاملة، استخدم «استيراد إكسل».</p><button class="primary">حفظ الصف والطلاب</button></form></div>`}
function bindRoster(){if($('#roster-new'))$('#roster-new').onclick=()=>{const gradeName=prompt('اسم الصف');if(!gradeName?.trim())return;const section=prompt('الشعبة');if(!section?.trim())return;if(db.classes.some(c=>AtharImport.norm(c.grade)===AtharImport.norm(gradeName)&&AtharImport.digits(c.section)===AtharImport.digits(section))){toast('الصف والشعبة موجودان');return}const id=Date.now();db.classes.push({id,grade:gradeName.trim(),section:section.trim(),name:gradeName.trim()+' / '+section.trim(),students:[],groups:[],session:0,pending:[],replacements:{}});cid=id;save();classOptions();render()};
  const form=$('#roster-form');if(form)form.onsubmit=e=>{e.preventDefault();const v=Object.fromEntries(new FormData(form)),g=v.grade.trim(),s=v.section.trim(),ns=v.names.split('\n').map(x=>x.trim()).filter(Boolean);if(!g||!s)return;if(db.classes.some(c=>c.id!==cid&&AtharImport.norm(c.grade)===AtharImport.norm(g)&&AtharImport.digits(c.section)===AtharImport.digits(s))){toast('الصف والشعبة موجودان');return}const removed=cls().students.slice(ns.length);if(removed.some(s=>db.events.some(e=>e.classId===cid&&e.studentId===s.id)||(cls().pending||[]).some(x=>x.id===s.id)||Object.values(cls().termDialogue||{}).some(t=>(t.pending||[]).some(x=>x.id===s.id)))){toast('لا يمكن حذف طالب لديه متابعة محفوظة أو فرصة حوار معلقة');return}let nextId=Math.max(Date.now(),...db.classes.flatMap(c=>c.students.map(s=>s.id)))+1;const changed=ns.join('\n')!==cls().students.map(s=>s.name).join('\n');cls().students=ns.map((name,i)=>({...cls().students[i],id:cls().students[i]?.id||nextId++,name,absent:cls().students[i]?.absent||false}));Object.assign(cls(),{grade:g,section:s,name:g+' / '+s});if(changed){cls().groups=[];cls().session=0;Object.values(cls().termDialogue||{}).forEach(t=>{t.groups=[];t.session=0})}save();classOptions();render();toast('تم حفظ الصف والطلاب')};
}
const schoolSettingsBind=bind;
bind=function(){schoolSettingsBind();bindSchoolSettings()};
const schoolSettingsRender=render;
render=function(){ensureSchoolSettings();if(page==='roster'){page='daily';schoolSettingsRender();page='roster';$('#page-title').textContent=titles.roster;$('#content').innerHTML=rosterPage();$$('nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===page));bindRoster()}else schoolSettingsRender();document.body.classList.toggle('settings-page',page==='settings');
  if(page==='settings')$('#page-title').textContent='إعدادات العام الدراسي';
  let termTag=$('#active-term-tag');if(!termTag){termTag=document.createElement('span');termTag.id='active-term-tag';termTag.className='active-term-tag';$('header').append(termTag)}termTag.textContent=termNames[db.settings.activeTerm];
};
const reportsWithSchoolNames=reports;
reports=function(){const html=reportsWithSchoolNames();if(!cls().students.length)return html;return html+`<div class="report-signatures"><div><small>المعلم</small><b>${esc(db.settings.teacher)}</b></div><div><small>مدير المدرسة</small><b>${esc(db.settings.director||'—')}</b></div><div><small>المشرف التربوي</small><b>${esc(db.settings.supervisor||'—')}</b></div></div>`};
render();
