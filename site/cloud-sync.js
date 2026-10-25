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
})(typeof globalThis==='undefined'?window:globalThis);
