(function(root){
  const criteria=[
    {id:'clarity',name:'وضوح الإجابة',description:'يعبّر بلغة واضحة وسهلة الفهم.'},
    {id:'relevance',name:'الارتباط بالسؤال',description:'يجيب مباشرة عن السؤال دون الخروج عن الموضوع.'},
    {id:'accuracy',name:'المعلومات والمصطلحات',description:'يقدم معلومات صحيحة ويستخدم المصطلحات التقنية بدقة وفي سياقها.'},
    {id:'interaction',name:'التفاعل والثقة',description:'يتفاعل ويعبّر عن فهمه بثقة أثناء الحديث؛ الهدوء وحده لا يعني ضعف الفهم.'}
  ];
  const levels=[{id:'always',name:'دائمًا',min:9,max:10},{id:'often',name:'غالبًا',min:7,max:8},{id:'sometimes',name:'أحيانًا',min:5,max:6},{id:'little',name:'قليلًا',min:3,max:4},{id:'rare',name:'نادرًا',min:1,max:2}];
  const observed=e=>e.band==='الحوار'&&e.dialogue?.version===1;
  const signature=records=>JSON.stringify(records.map(e=>[e.id,e.date,e.period,e.questionText,e.lessonId,e.skillText,e.dialogue,...(e.segmentId?[e.segmentId,e.segmentName]:[])]).sort((a,b)=>String(a[0]).localeCompare(String(b[0]))));
  function summary(records){
    const list=records.filter(observed).sort((a,b)=>a.date.localeCompare(b.date)||String(a.recordedAt||'').localeCompare(String(b.recordedAt||'')));
    const rows=criteria.map(c=>{const vals=list.map(e=>e.dialogue.ratings[c.id]).filter(v=>[0,1,2].includes(v));return {...c,count:vals.length,secure:vals.filter(v=>v===2).length,partial:vals.filter(v=>v===1).length,support:vals.filter(v=>v===0).length}});
    return {records:list,count:list.length,days:new Set(list.map(e=>e.date)).size,skills:[...new Set(list.map(e=>e.skillText||e.lessonName).filter(Boolean))],criteria:rows,signature:signature(list)};
  }
  function validateObservation(data){
    if(!data.question?.trim())return 'اكتب السؤال الذي طُرح على الطالب أو اختره من البنك.';
    if(!data.lesson?.trim())return 'حدد الدرس الذي يرتبط به الحوار.';
    if(!criteria.every(c=>Object.hasOwn(data.ratings||{},c.id)&&[null,0,1,2].includes(data.ratings[c.id])))return 'حدد حالة لكل معيار، أو اختر «لم يُلاحظ».';
    if(!criteria.some(c=>[0,1,2].includes(data.ratings[c.id])))return 'سجّل معيارًا واحدًا ملاحظًا على الأقل؛ عدم وجود فرصة لا يُسجل كتقييم.';
    if(!data.feedback?.trim())return 'أضف تغذية راجعة قصيرة توضح للطالب ما أتقنه أو خطوته التالية.';
    if(!['none','prompt','hint'].includes(data.help))return 'حدد المساعدة المقدمة للطالب.';
    return '';
  }
  function validateApproval({level,score,reason,summary:info}){
    const l=levels.find(l=>l.id===level);if(!info.count)return 'لا يمكن اعتماد درجة دون ملاحظات حوار موثقة.';
    if(info.criteria.some(c=>!c.count))return 'استكمل ملاحظة المعايير الأربعة عبر فرص الحوار قبل اعتماد الدرجة؛ لا يُعامل «لم يُلاحظ» كصفر.';
    if(!l||!Number.isInteger(score)||score<l.min||score>l.max)return 'اختر درجة صحيحة ضمن نطاق مستوى التقدير المحدد.';
    if(!reason?.trim())return 'اكتب سبب اعتماد الدرجة بالاستناد إلى أداء الطالب.';
    return '';
  }
  function quality(e){if(!observed(e))return null;const vals=criteria.map(c=>e.dialogue.ratings[c.id]);if(vals.some(v=>![0,1,2].includes(v)))return null;return vals.reduce((a,b)=>a+b,0)/8;}
  root.AtharDialogue={criteria,levels,observed,summary,signature,validateObservation,validateApproval,quality};
})(typeof globalThis!=='undefined'?globalThis:this);
