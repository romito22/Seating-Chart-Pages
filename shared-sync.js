const READ_URL='https://script.google.com/macros/s/AKfycbxRayIh3HyARwzWtx5kVdaKLYFitLK2jqiOIGH0eqKKf0RDnhCSr1UwzTZ4D5__MBRp/exec';
const EDITOR_URL='https://script.google.com/macros/s/AKfycbyveT2crrDcEEal6_zAirFWykASWaFWF-Wl-A8iLFPPEv4RNtMsXNPiyyZSOMm4oyCH/exec';
const enabled=!READ_URL.startsWith('__');
let editorWindow=null,editorReady=false,sequence=0;
const pending=new Map(),statusListeners=new Set();

export function sharedConfigured(){return enabled;}
export function onEditorStatus(listener){statusListeners.add(listener);return()=>statusListeners.delete(listener);}
export function enableSharedEditing(){if(!enabled)throw Error('Shared editing is not configured.');editorWindow=window.open(EDITOR_URL,'seating-chart-editor','popup,width=620,height=420');if(!editorWindow)throw Error('Allow pop-ups to enable shared editing.');}

window.addEventListener('message',event=>{
 if(!enabled||event.origin!=='https://script.google.com'&&event.origin!=='https://script.googleusercontent.com')return;
 const message=event.data;
 if(message?.type==='seating-bridge-ready'){editorReady=Boolean(message.authorized);statusListeners.forEach(listener=>listener({ready:editorReady,email:message.email}));}
 if(message?.type==='seating-save-result'&&pending.has(message.requestId)){const {resolve,reject,timer}=pending.get(message.requestId);clearTimeout(timer);pending.delete(message.requestId);if(message.error)reject(Error(message.error));else resolve(message.result);}
});

export function loadSharedState(){
 if(!enabled)return Promise.resolve(null);
 const callback=`seatingState${Date.now()}_${sequence++}`;
 return fetch(`${READ_URL}?mode=state&callback=${encodeURIComponent(callback)}&_=${Date.now()}`,{cache:'no-store'})
  .then(response=>{if(!response.ok)throw Error('Shared seating did not respond.');return response.text();})
  .then(text=>{const prefix=`${callback}(`,suffix=');';if(!text.startsWith(prefix)||!text.endsWith(suffix))throw Error('Shared seating returned invalid data.');return JSON.parse(text.slice(prefix.length,-suffix.length));});
}

export function saveSharedState(state,revision){
 if(!editorReady||!editorWindow||editorWindow.closed)return Promise.reject(Error('Enable shared editing first.'));
 return new Promise((resolve,reject)=>{const requestId=`save-${Date.now()}-${sequence++}`;const timer=setTimeout(()=>{pending.delete(requestId);reject(Error('Shared save timed out.'));},15000);pending.set(requestId,{resolve,reject,timer});editorWindow.postMessage({type:'seating-save',requestId,state,revision},'*');});
}
