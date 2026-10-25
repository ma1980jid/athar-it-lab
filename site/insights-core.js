(function(root){
  const rubric={
    'الحوار':{'إجابة متقنة':1,'إجابة جزئية':.5,'بمساعدة':.25,'لم يجب':0},
    'التطبيق العملي':{'أنجز بإتقان':1,'أنجز بمساعدة':1/3,'لم يكمل':0},
    'حل الأنشطة':{'مكتمل':1,'جزئي':.5,'غير منجز':0}
  };
  const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
  const days=a=>new Set(a.map(e=>e.date)).size;
  const score=e=>e.band==='الحوار'&&e.dialogue?.version===1?root.AtharDialogue.quality(e):Object.hasOwn(rubric[e.band]||{},e.label)?rubric[e.band][e.label]:null;
  function dedupe(records){const m=new Map();records.forEach((e,i)=>{const key=[e.studentId,e.date,e.band,e.lessonId||e.curriculumId||'',e.skillText||'',e.band==='الحوار'?(e.questionId||e.questionText||'direct'):''].join('|');m.set(key,{...e,_order:i})});return [...m.values()].sort((a,b)=>a.date.localeCompare(b.date)||a._order-b._order)}
  function dailySeries(records){const m=new Map();records.forEach(e=>{const v=score(e);if(v===null)return;if(!m.has(e.date))m.set(e.date,[]);m.get(e.date).push(v)});return [...m.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([date,values])=>({date,value:mean(values),count:values.length}))}
  function growthEvidence(records){let best=null;for(const band of Object.keys(rubric)){const series=dailySeries(records.filter(e=>e.band===band));if(series.length<4)continue;const recent=series.slice(-2),previous=series.slice(-4,-2),now=mean(recent.map(x=>x.value)),before=mean(previous.map(x=>x.value)),delta=now-before;const item={band,delta,now,before,dates:series.slice(-4).map(x=>x.date)};if(!best||delta>best.delta)best=item}return best}
  function badges(records){const practical=records.filter(e=>e.band==='التطبيق العملي'&&score(e)!==null),dialogue=records.filter(e=>e.band==='الحوار'&&score(e)!==null),cooperation=records.filter(e=>e.band==='المشاركة والتعاون'&&['تعاون','ساعد زميلًا'].includes(e.label)),noor=records.filter(e=>e.band==='المشاركة في منصة نور'&&e.label==='شارك وأنجز'),activities=records.filter(e=>e.band==='حل الأنشطة'&&e.label==='مكتمل'),growth=growthEvidence(records);
    return [
      {id:'practical',name:'متقن التطبيق',icon:'code',tone:'teal',description:'متوسط التطبيق العملي ٨٠٪ فأكثر في ٣ حصص مختلفة على الأقل.',earned:days(practical)>=3&&mean(practical.map(score))>=.8,count:days(practical),target:3,quality:mean(practical.map(score))},
      {id:'dialogue',name:'محاور متقن',icon:'chat',tone:'blue',description:'متوسط جودة الحوار ٨٠٪ فأكثر في ٣ حصص مختلفة على الأقل.',earned:days(dialogue)>=3&&mean(dialogue.map(score))>=.8,count:days(dialogue),target:3,quality:mean(dialogue.map(score))},
      {id:'cooperation',name:'شريك التعلّم',icon:'people',tone:'violet',description:'تعاون أو مساعدة زميل في ٣ حصص مختلفة.',earned:days(cooperation)>=3,count:days(cooperation),target:3},
      {id:'noor',name:'نشط في نور',icon:'spark',tone:'gold',description:'تسجيل «شارك وأنجز» في منصة نور في ٣ حصص مختلفة.',earned:days(noor)>=3,count:days(noor),target:3},
      {id:'activities',name:'منجز الأنشطة',icon:'check',tone:'blue',description:'إكمال الأنشطة في ٣ حصص مختلفة.',earned:days(activities)>=3,count:days(activities),target:3},
      {id:'growth',name:'تقدّم ملحوظ',icon:'growth',tone:'gold',description:'تحسن ٢٠ نقطة مئوية على الأقل في البند نفسه بين حصتين سابقتين وحصتين حديثتين، بمتوسط حديث ٦٠٪ فأكثر.',earned:!!growth&&growth.delta>=.2-1e-9&&growth.now>=.6,count:growth?4:Math.min(3,Math.max(...Object.keys(rubric).map(b=>days(records.filter(e=>e.band===b))))),target:4,growth}
    ];
  }
  function analyze({students,records,curriculum=[],questions=[],asOf,range='term',pending=[]}){
    const ids=new Set(students.map(s=>s.id)),qmap=new Map(questions.map(q=>[q.id,q])),lmap=new Map(curriculum.map(l=>[l.id,l]));
    let raw=records.filter(e=>ids.has(e.studentId)&&(!asOf||e.date<=asOf));if(range==='recent'){const dates=[...new Set(raw.map(e=>e.date))].sort().slice(-5);raw=raw.filter(e=>dates.includes(e.date))}else if(['1','2'].includes(range))raw=raw.filter(e=>e.period===+range);
    raw=raw.map(e=>{const q=qmap.get(e.questionId),lessonId=e.lessonId||e.curriculumId||q?.curriculumId||'',l=lmap.get(lessonId);return {...e,lessonId,lessonName:e.lessonName||l?.name||'',unitName:e.unitName||l?.unit||'',skillText:e.skillText||q?.skillText||''}});
    const unique=dedupe(raw),assessment=unique.filter(e=>score(e)!==null);const studentRows=students.map(s=>{
      const all=unique.filter(e=>e.studentId===s.id),assessed=all.filter(e=>score(e)!==null),recent=assessed.slice(-5),value=mean(recent.map(score)),enough=recent.length>=3&&days(recent)>=2,low=recent.filter(e=>score(e)<.6),recentDays=dailySeries(recent),recovered=recentDays.length>=2&&recentDays.slice(-2).every(d=>d.value>=.8),status=!enough?'opportunity':value<.6&&low.length>=2&&!recovered?'support':'steady';
      const bands=Object.keys(rubric).map(band=>{const ev=assessed.filter(e=>e.band===band);return {band,value:mean(ev.map(score)),count:ev.length,days:days(ev)}});
      const weakest=Object.keys(rubric).map(band=>{const ev=recent.filter(e=>e.band===band);return {band,value:mean(ev.map(score)),count:ev.length}}).filter(b=>b.count>=2).sort((a,b)=>a.value-b.value)[0];const series=dailySeries(assessed),growth=growthEvidence(assessed),earned=badges(all),latest=assessed.at(-1)?.date||'';
      return {student:s,all,assessed,count:assessed.length,dates:days(assessed),value,enough,status,lowCount:low.length,recentCount:recent.length,bands,weakest,series,growth,badges:earned,latest,makeup:pending.some(x=>x.id===s.id)};
    });
    const skillMap=new Map();for(const e of assessment){if(!e.lessonId)continue;const key=e.lessonId+'|'+(e.skillText||'__lesson__');if(!skillMap.has(key))skillMap.set(key,{key,lessonId:e.lessonId,lessonName:e.lessonName,unitName:e.unitName,name:e.skillText||e.lessonName,kind:e.skillText?'skill':'lesson',records:[]});skillMap.get(key).records.push(e)}
    const skills=[...skillMap.values()].map(s=>{const byStudent=new Map();s.records.forEach(e=>{if(!byStudent.has(e.studentId))byStudent.set(e.studentId,[]);byStudent.get(e.studentId).push(score(e))});const values=[...byStudent.entries()].map(([id,a])=>({id,value:mean(a)})),n=values.length,low=values.filter(x=>x.value<.6).length,enough=n>=3&&days(s.records)>=2;return {...s,count:s.records.length,students:n,dates:days(s.records),value:mean(values.map(x=>x.value)),low,review:enough&&low>=2&&low/n>=.4,enough,studentValues:values}}).sort((a,b)=>Number(b.review)-Number(a.review)||(a.value??1)-(b.value??1));
    return {students:studentRows,skills,records:unique,assessment,support:studentRows.filter(s=>s.status==='support').sort((a,b)=>a.value-b.value),opportunity:studentRows.filter(s=>s.status==='opportunity').sort((a,b)=>Number(b.makeup)-Number(a.makeup)||a.count-b.count),review:skills.filter(s=>s.review),earnedCount:studentRows.reduce((n,s)=>n+s.badges.filter(b=>b.earned).length,0),coverage:students.length?Math.round(studentRows.filter(s=>s.enough).length/students.length*100):null,unlinked:assessment.filter(e=>!e.lessonId).length,series:dailySeries(assessment),range};
  }
  root.AtharInsights={analyze,score,dedupe,badges,dailySeries,growthEvidence,rubric};
})(typeof globalThis!=='undefined'?globalThis:this);
