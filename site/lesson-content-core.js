(function(root){
  function install(db,pack,norm){
    db.contentPackages??={};db.curriculum??=[];db.questions??=[];
    if(db.contentPackages[pack.id])return false;
    let lesson=db.curriculum.find(l=>norm(l.grade)===norm(pack.lesson.grade)&&norm(l.name)===norm(pack.lesson.name)&&norm(l.unit)===norm(pack.lesson.unit));
    if(!lesson){lesson={...pack.lesson,id:'content-'+pack.id};db.curriculum.push(lesson)}
    lesson.segments??=JSON.parse(JSON.stringify(pack.lesson.segments));lesson.plannedSessions??=pack.lesson.plannedSessions;lesson.planNote??=pack.lesson.planNote;lesson.contentSource??=pack.lesson.contentSource;
    let added=0;for(const q of pack.questions){let existing=db.questions.find(x=>x.curriculumId===lesson.id&&norm(x.text)===norm(q.text));if(existing){existing.segmentId??=q.segmentId;continue}
      const id=db.questions.some(x=>x.id===q.id)?Math.max(Date.now(),...db.questions.map(x=>Number(x.id)||0))+1:q.id;
      db.questions.push({...q,id,curriculumId:lesson.id,grade:lesson.grade,unit:lesson.unit,lesson:lesson.name,packageId:pack.id});added++;
    }
    db.contentPackages[pack.id]={lessonId:lesson.id,added};return true;
  }
  function pool(questions,lesson,segmentId,skill='',level='auto'){
    return questions.filter(q=>q.curriculumId===lesson?.id&&(!segmentId||q.segmentId===segmentId)&&(!skill||q.skillText===skill)&&(level==='auto'||q.level===level));
  }
  root.AtharLessonContent={install,pool};
})(typeof globalThis!=='undefined'?globalThis:this);
