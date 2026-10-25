(function(root){
 class SyncQueue {
  constructor({revision=0,push,cache,status}){Object.assign(this,{revision,push,cache,status});this.pending=null;this.running=false;this.blocked=false;}
  enqueue(snapshot){this.cache(snapshot,this.revision,true);this.pending=snapshot;this.status('pending');}
  async flush(){
   if(this.running||this.blocked||!this.pending)return !this.pending;
   this.running=true;
   try{while(this.pending&&!this.blocked){const snapshot=this.pending;this.status('saving');const revision=await this.push(snapshot,this.revision);if(!Number.isSafeInteger(revision)||revision!==this.revision+1)throw Error('Invalid revision');this.revision=revision;if(this.pending===snapshot)this.pending=null;this.cache(this.pending||snapshot,this.revision,!!this.pending);this.status(this.pending?'pending':'saved');}return true;}
   catch(error){this.blocked=error.code==='40001'||/ATHAR_REVISION_CONFLICT/.test(error.message||'');this.status(this.blocked?'conflict':'error');return false;}
   finally{this.running=false;}
  }
 }
 root.AtharSyncQueue=SyncQueue;
 root.AtharCreateSeedState=function(seed){
  if(!Array.isArray(seed?.classes)||!Array.isArray(seed?.curriculum))throw Error('Invalid protected import');
  let studentId=1000;
  const empty={id:1,grade:'الثامن',section:'1',name:'الثامن / 1',students:[],groups:[],session:0,pending:[],replacements:{}};
  return {version:1,classes:[empty,...seed.classes.map((c,i)=>({...c,id:i+2,name:c.grade+' / '+c.section,students:c.students.map(s=>({...s,id:++studentId,absent:false})),groups:[],session:0,pending:[],replacements:{}}))],
   curriculum:seed.curriculum.map((l,i)=>({...l,id:'imported-lesson-'+i})),events:[],questions:[],approvals:{},attendance:{},lessons:[],imports:[{packageId:seed.packageId||'athar-protected-seed',sources:seed.sources||[],date:new Date().toISOString()}],
   settings:{school:'مدرسة الشيخ حمدان بن خميس اليوسفي',teacher:'معلم تقنية المعلومات',start:'2026-09-01',mid:'2026-10-31',end:'2026-12-31',topic:'إدخال البيانات',goal:'قراءة المدخلات وتحويلها'}};
 };
})(typeof globalThis==='undefined'?window:globalThis);
