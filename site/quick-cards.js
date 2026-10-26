// Teacher-only controls; public lab display retains the original card content.
const cardQuickBands=[
 {band:'إحضار الكتاب',name:'الكتاب',icon:'▣'},
 {band:'حل الأنشطة',name:'الأنشطة',icon:'▤'},
 {band:'التطبيق العملي',name:'التطبيق العملي',icon:'⌘'},
 {band:'الانضباط',name:'الانضباط',icon:'✓'}
];
let lastCardQuickAction=null;
function cardQuickLatest(id,band){const lesson=currentLesson()?.id||'',skill=db.settings.skillText||'';return events(id).filter(e=>e.date===date()&&e.band===band&&(!e.lessonId||e.lessonId===lesson)&&(!e.skillText||e.skillText===skill)).at(-1)}
function cardQuickControls(student){return `<div class="card-quick-actions" aria-label="متابعة سريعة للطالب ${esc(student.name)}">${cardQuickBands.map(({band,name,icon})=>{const last=cardQuickLatest(student.id,band),choices=options[band],known=choices.some(([label])=>label===last?.label);return `<label class="card-quick-control ${last?'has-record':''}"><span><i aria-hidden="true">${icon}</i>${name}${last?'<b aria-label="مسجل اليوم">✓</b>':''}</span><select data-card-quick="${student.id}" data-quick-band="${band}" aria-label="${name} — ${esc(student.name)}" ${student.absent?'disabled':''}><option value="" ${!last?'selected':''}>اختر للتسجيل</option>${last&&!known?`<option value="__previous" selected disabled>${esc(last.label)} (سجل سابق)</option>`:''}${choices.map(([label])=>`<option value="${esc(label)}" ${last?.label===label?'selected':''}>${esc(label)}</option>`).join('')}</select></label>`}).join('')}</div>${lastCardQuickAction?.studentId===student.id&&lastCardQuickAction.classId===cid&&lastCardQuickAction.date===date()?`<button class="card-quick-undo" data-card-undo="${student.id}">↶ تراجع عن آخر تعديل سريع</button>`:''}`}
const cardsBeforeQuickActions=cards;
cards=function(publicView=false){let i=0;const ranked=studentsSorted();return cardsBeforeQuickActions(publicView).replace(/<button class="student pro-student([^"]*)"([^>]*)>([\s\S]*?)<\/button>/g,(original,classes,attrs,body)=>{const student=ranked[i++];if(!student)return original;const tone='card-tone-'+(student.id%4);if(publicView)return original.replace('student pro-student','student pro-student '+tone);const foot=body.lastIndexOf('<div class="pro-card-foot">');if(foot<0)return original;return `<article class="student pro-student quick-student ${tone}${classes}"><button class="card-main-open" data-student="${student.id}" aria-label="تفاصيل ${esc(student.name)}">${body.slice(0,foot)}</button>${cardQuickControls(student)}<div class="pro-card-foot"><span class="pro-score">${points(student.id)}<small>نقطة إنجاز</small></span><button class="card-details" data-student="${student.id}">السجل والتفاصيل ←</button></div></article>`})};
function recordFromCard(id,band,label){
 const student=cls().students.find(s=>s.id===id);if(!student||student.absent)return;
 const choice=options[band]?.find(([name])=>name===label);if(!choice)return;
 if(band==='الانضباط'&&label==='مخالفة أخرى (مع توضيح)'){studentTab='quick';openStudent(id);const note=$('#note');if(note){note.closest('details').open=true;note.placeholder='صف المخالفة ثم اضغط «مخالفة أخرى» لحفظها';note.focus()}toast('اكتب تفاصيل المخالفة ثم اضغط زر مخالفة أخرى');return}
 const previous=cardQuickLatest(id,band);if(previous?.label===label){toast('هذا الاختيار مسجل بالفعل لهذا الطالب');return}
 let changed;
 if(previous?.fromQuickCard){
  const before=JSON.parse(JSON.stringify(previous));Object.assign(previous,{label,points:choice[1],recordedAt:new Date().toISOString()});changed=previous;
  lastCardQuickAction={studentId:id,classId:cid,date:date(),id:changed.id,before,after:JSON.stringify(changed)};save();toast('تم تحديث '+label+' لـ'+student.name);
 }else{
  const count=db.events.length,note=$('#note'),oldNote=note?.value;if(note)note.value='';
  try{record(id,band,label,choice[1])}finally{if(note)note.value=oldNote}
  if(db.events.length===count)return;changed=db.events.at(-1);changed.fromQuickCard=true;
  lastCardQuickAction={studentId:id,classId:cid,date:date(),id:changed.id,before:null,after:JSON.stringify(changed)};save();
 }
 render();
}
const bindBeforeQuickActions=bind;
bind=function(){bindBeforeQuickActions();if(page!=='daily'||screen)return;
 $$('[data-card-quick]').forEach(select=>select.onchange=()=>{const id=+select.dataset.cardQuick,band=select.dataset.quickBand,label=select.value;if(!label||label==='__previous')return;if(label==='مخالفة أخرى (مع توضيح)'){const prior=cardQuickLatest(id,band);select.value=options[band].some(([l])=>l===prior?.label)?prior.label:prior?'__previous':''}recordFromCard(id,band,label)});
 $$('[data-card-undo]').forEach(button=>button.onclick=()=>{const action=lastCardQuickAction;if(!action||action.classId!==cid||action.date!==date()||action.studentId!==+button.dataset.cardUndo)return;const index=db.events.findIndex(e=>e.id===action.id);if(index<0||JSON.stringify(db.events[index])!==action.after){toast('تغير هذا السجل؛ راجعه من نافذة الطالب');return}if(action.before)db.events[index]=action.before;else db.events.splice(index,1);lastCardQuickAction=null;save();render();toast('تم التراجع عن آخر تعديل سريع')});
};
render();
