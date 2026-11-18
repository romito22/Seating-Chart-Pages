import {exportPlan} from './share.js';
import {move,setHeight,propose,validate,parseHeight,formatHeight,heightParts,simulate,resetAll} from './model.js';
const $=id=>document.getElementById(id),key='seating-chart-v2';
let originalSeats;
const dirtyHeights=new Set(),heightTimers=new Map();
let state,selected=null,pending=null,history=[],storageOK=true,dragged=null;
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const person=id=>state.people.find(p=>p.id===id),color=p=>state.sections.find(s=>s.name===p.section).color;
function toast(text){$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('visible'),3500);}
function save(){try{localStorage.setItem(key,JSON.stringify(state));storageOK=true;}catch{storageOK=false;toast('Could not save locally. Use Save a copy.');}}
function commit(next,message){history.push(structuredClone(state));if(history.length>60)history.shift();state=next;save();render();if(message)toast(message);}
function assign(id,target){try{commit(move(state,id,target),'Seating updated');}catch(e){toast(e.message);}}
function figure(){return '<svg class="figure" viewBox="0 0 60 120" aria-hidden="true"><rect x="23" y="1" width="14" height="7" rx="2" fill="#e7bb63"/><rect x="14" y="7" width="32" height="29" rx="8" fill="#edc875"/><circle cx="24" cy="20" r="1.8" fill="#253b33"/><circle cx="36" cy="20" r="1.8" fill="#253b33"/><path d="M24 27q6 5 12 0" fill="none" stroke="#253b33" stroke-width="2"/><path d="M15 39h30l5 38H10z" fill="currentColor" stroke="#293d3430"/><path d="M13 42L4 72M47 42l9 30" stroke="currentColor" stroke-width="9"/><path d="M5 75v6m50-6v6" stroke="#edc875" stroke-width="7"/><path d="M14 80h14v35H14zm18 0h14v35H32z" fill="#315bba"/><path d="M12 115h17m2 0h17" stroke="#23458e" stroke-width="6"/></svg>';}
function singer(p,front=false){return `<button class="${front?'front-person':'singer'} ${selected===p.id?'selected':''}" style="--voice:${color(p)};${front?`--height:${p.height===null?100:p.height*1.27}px`:''}" data-person="${escape(p.id)}" draggable="true" aria-pressed="${selected===p.id}" title="${escape(p.name)} · ${escape(p.section)} · Height: ${p.height===null?'':formatHeight(p.height)+(p.heightSource==='simulated'?' (simulated)':'')}">${front?figure()+`<span class="figure-tooltip"><strong>${escape(p.name)}</strong><span>Height: ${p.height===null?'':formatHeight(p.height)+(p.heightSource==='simulated'?' (simulated)':'')}</span></span>`:''}<span class="person-name">${escape(p.name)}</span><small>${front?(p.height===null?'Unknown height':formatHeight(p.height)):escape(p.section)}</small></button>`;}
function render(){
 
 const n=state.people.filter(p=>p.height!==null).length;$('measured').textContent=`${state.people.length} singers · ${n} heights${state.people.some(p=>p.heightSource==='simulated')?' · simulated':''}`;
 $('legend').innerHTML=state.sections.map(s=>`<span><i style="background:${s.color}"></i>${escape(s.name)}</span>`).join('');
 $('save-status').textContent=storageOK?'● Saved locally':'Not saved · download a copy';$('undo').disabled=!history.length;
 $('plan').innerHTML=['G','F','E','D','C','B','A'].map(row=>`<div class="plan-row ${/[AG]/.test(row)?'restricted':''}"><span class="row-label">${row}</span>${Array.from({length:31},(_,col)=>{const s=state.seats.find(s=>s.row===row&&s.col===col),p=s&&person(s.personId);return s?`<div class="seat ${!p?'empty':''}" data-seat="${escape(s.id)}">${p?singer(p):`<button class="empty-seat" data-target="${escape(s.id)}" aria-label="Empty seat ${escape(s.id)}">+<small>${s.id}</small></button>`}<span class="seat-number">${s.number}</span></div>`:`<div class="unconfirmed" title="${row==='G'?'Back row unavailable':'Availability unconfirmed'}">${31-col}</div>`;}).join('')}<span class="row-label">${row}</span></div>`).join('');
 const p=person(selected);$('selected-name').textContent=p?.name??'Select a singer';$('selected-info').textContent=p?`${p.section} · ${state.seats.find(s=>s.personId===p.id)?.id??'Unassigned'} · ${p.height===null?'Unknown height':formatHeight(p.height)+(p.heightSource==='simulated'?' (simulated)':'')}`:'';
 $('height-feet').disabled=!p;$('height-inches').disabled=!p;const parts=heightParts(p?.height??null);if(!$('height-form').contains(document.activeElement)){$('height-feet').value=parts[0];$('height-inches').value=parts[1];}$('unassign').disabled=!p||!state.seats.some(s=>s.personId===p.id);$('put-here').disabled=!p;
 const unassigned=state.people.filter(p=>!state.seats.some(s=>s.personId===p.id));$('unassigned-count').textContent=unassigned.length;$('unassigned-list').innerHTML=unassigned.length?unassigned.map(p=>singer(p)).join(''):'<span class="empty-message">No unassigned singers.</span>';
 renderFront();renderRoster();

}
function renderFront(){
 if($('front-row').value==='all'){renderAllFront();if(state.people.some(p=>p.heightSource==='simulated'))$('height-note').textContent='Simulation · '+$('height-note').textContent;return;}
 const row=$('front-row').value,slots=state.seats.filter(s=>s.row===row).sort((a,b)=>a.col-b.col),known=slots.some(s=>person(s.personId)?.height!=null);
 $('height-note').textContent=known?'To scale · 6-inch marks · unknown heights below':'Unknown heights · provisional figures';
 let html='';
 if(known){const max=Math.max(84,...slots.map(s=>person(s.personId)?.height??0)),top=Math.ceil(max/6)*6;html+=`<div class="scaled-front" style="height:${top*1.27+70}px">`+Array.from({length:top/6+1},(_,i)=>i*6).map(v=>`<div class="ruler-line" style="bottom:${v*1.27+60}px"><span>${formatHeight(v)}</span></div>`).join('')+'<div class="front-people">'+slots.map(s=>{const p=person(s.personId);return `<div class="front-slot">${p&&p.height!==null?singer(p,true):`<span class="height-gap">${p?'?':'—'}</span>`}<span class="front-seat">${s.id}</span></div>`;}).join('')+'</div></div>';const missing=slots.map(s=>person(s.personId)).filter(p=>p&&p.height===null);if(missing.length)html+='<p class="unknown-label">UNKNOWN HEIGHTS · FIGURES NOT TO SCALE</p><div class="unknown-people">'+missing.map(p=>singer(p,true)).join('')+'</div>';
 }else{html='<div class="unknown-people">'+slots.map(s=>{const p=person(s.personId);return p?`<div class="front-slot">${singer(p,true)}<span class="front-seat">${s.id}</span></div>`:'<div class="front-slot vacant-front">Empty seat<br>'+s.id+'</div>';}).join('')+'</div>';}
 $('front').innerHTML=html;if(state.people.some(p=>p.heightSource==='simulated'))$('height-note').textContent='Simulation · '+$('height-note').textContent;
}
function renderAllFront(){
 const missing=state.people.some(p=>p.height===null),step=12*1.27,scale=1.27,max=Math.max(84,...state.people.map(p=>p.height??0))+48,stageHeight=Math.ceil(max/12)*12*scale+65;
 $('height-note').textContent=missing?'Assumed riser: 1 ft · unknown heights: provisional visibility':'Assumed riser: 1 ft · B in front / F behind';
 let html=`<div class="front-fit"><div class="all-front" style="height:${stageHeight}px">`;
 for(let inches=0;inches<=Math.ceil(max/12)*12;inches+=6)html+=`<div class="all-ruler" style="bottom:${30+inches*scale}px"><span>${formatHeight(inches)}</span></div>`;
 for(const [index,row] of ['F','E','D','C','B'].entries()){
  const level=4-index,baseline=30+level*step;
  html+=`<div class="row-baseline" style="bottom:${baseline}px"><span>${row} · +${level}′</span></div>`;
  for(const s of state.seats.filter(s=>s.row===row)){const p=person(s.personId);if(p)html+=`<div class="layer-person" style="left:${70+s.col*50}px;bottom:${baseline}px;z-index:${index+1}">${singer(p,true)}</div>`;}
 }
 html+='</div></div>';$('front').innerHTML=html;fitFront();
}

function fitFront(){
 const frame=$('front').querySelector('.front-fit'),scene=frame?.firstElementChild;
 if(!scene)return;
 // Scale the whole coordinate system so spacing, risers and figure proportions stay unchanged.
 const scale=Math.min(1,$('front').clientWidth/1680);
 scene.style.transform=`scale(${scale})`;
 scene.style.setProperty('--front-scale',scale);
 frame.style.height=`${scene.offsetHeight*scale}px`;
}
new ResizeObserver(fitFront).observe($('front'));

document.addEventListener('click',e=>{const b=e.target.closest('[data-person]');if(b){const id=b.dataset.person;if(!b.classList.contains('front-person')&&selected&&selected!==id){const s=state.seats.find(s=>s.personId===id);if(s){assign(selected,s.id);return;}}selected=selected===id?null:id;render();return;}const target=e.target.closest('[data-target]');if(target&&selected)assign(selected,target.dataset.target);});
document.addEventListener('dragstart',e=>{const b=e.target.closest('[data-person]');if(b){dragged=b.dataset.person;e.dataTransfer.setData('text/plain',dragged);e.dataTransfer.effectAllowed='move';}});
document.addEventListener('dragend',()=>{dragged=null;document.querySelectorAll('.drop-over').forEach(e=>e.classList.remove('drop-over'));});
document.addEventListener('dragover',e=>{const dest=e.target.closest('[data-seat],#unassigned-drop');if(dest&&dragged){e.preventDefault();e.dataTransfer.dropEffect='move';dest.classList.add('drop-over');}});
document.addEventListener('dragleave',e=>e.target.closest('.drop-over')?.classList.remove('drop-over'));
document.addEventListener('drop',e=>{const dest=e.target.closest('[data-seat],#unassigned-drop');if(dest&&dragged){e.preventDefault();assign(dragged,dest.dataset.seat??null);dragged=null;}});
$('height-form').onsubmit=e=>{e.preventDefault();if(selected)autoHeight(selected,$('height-feet'),$('height-inches'),true);};
$('unassign').onclick=$('put-here').onclick=()=>{if(selected)assign(selected,null);};
$('undo').onclick=()=>{clearHeightDrafts();if(history.length){state=history.pop();save();render();toast('Change undone');}};
$('front-row').onchange=renderFront;
$('export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='seating-chart-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Copy saved with names and heights.');};
$('import').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>2000000)throw Error('The copy is too large.');const next=validate(JSON.parse(await file.text()));selected=null;originalSeats=structuredClone(next.seats);localStorage.setItem(key+'-original-seats',JSON.stringify(originalSeats));commit(next,'Copy opened');}catch(err){toast(err.message);}e.target.value='';};
$('suggest').onclick=()=>{pending=propose(state);const changes=pending.seats.filter((s,i)=>s.personId!==state.seats[i].personId);$('proposal-changes').innerHTML=changes.length?`<p>${changes.length} seats would change:</p><ul>`+changes.map(s=>`<li>${escape(s.id)}: ${escape(person(s.personId).name)}</li>`).join('')+'</ul>':'<p>No changes to suggest with the recorded heights.</p>';$('apply-proposal').disabled=!changes.length;$('proposal').showModal();};
$('reject-proposal').onclick=()=>$('proposal').close();$('apply-proposal').onclick=()=>{commit(pending,'Order applied; you can adjust it manually.');$('proposal').close();};

let rosterSignature='';
function renderRoster(){
 const signature=state.people.map(p=>p.id+p.name+p.section).join('|');
 if(signature!==rosterSignature){$('roster-body').innerHTML=state.people.map(p=>`<tr><td>${escape(p.name)}</td><td><i style="background:${color(p)}"></i>${escape(p.section)}</td><td class="height-pair"><label><input inputmode="numeric" type="number" min="2" max="8" step="1" data-feet-id="${escape(p.id)}" aria-label="Feet for ${escape(p.name)}"><span>ft</span></label><label><input inputmode="decimal" type="number" min="0" max="11.99" step="0.25" data-inches-id="${escape(p.id)}" aria-label="Inches for ${escape(p.name)}"><span>in</span></label></td></tr>`).join('');rosterSignature=signature;}
 for(const p of state.people){const parts=heightParts(p.height);for(const [index,type] of ['feet','inches'].entries()){const input=$('roster-body').querySelector(`[data-${type}-id="${p.id}"]`);if(input!==document.activeElement&&!dirtyHeights.has(p.id))input.value=parts[index];}}
}

function autoHeight(id,feet,inches,report=false){
 clearTimeout(heightTimers.get(id));
 if(!id)return;
 dirtyHeights.add(id);
 try{
  if(feet.validity.badInput||inches.validity.badInput)throw Error('Check the height fields.');
  if((feet.value==='')!==(inches.value==='')){if(report)toast('Complete feet and inches, or clear both.');return;}
  const height=parseHeight(feet.value,inches.value),p=person(id),value=height===''?null:height;
  dirtyHeights.delete(id);
  if(p.height!==value||p.heightSource==='simulated')commit(setHeight(state,id,height));
 }catch(err){if(report)toast(err.message);}
}
function queueHeight(id,feet,inches,delay=450,report=false){
 dirtyHeights.add(id);clearTimeout(heightTimers.get(id));
 const snapshot=input=>({value:input.value,validity:{badInput:input.validity.badInput}});
 const f=snapshot(feet),i=snapshot(inches);
 heightTimers.set(id,setTimeout(()=>autoHeight(id,f,i,report),delay));
}
$('height-form').addEventListener('input',()=>{if(selected)queueHeight(selected,$('height-feet'),$('height-inches'));});
$('height-form').addEventListener('focusout',e=>{if(selected&&!$('height-form').contains(e.relatedTarget))queueHeight(selected,$('height-feet'),$('height-inches'),0,true);});
function rosterFields(input){const id=input.dataset.feetId??input.dataset.inchesId;return {id,feet:$('roster-body').querySelector(`[data-feet-id="${id}"]`),inches:$('roster-body').querySelector(`[data-inches-id="${id}"]`)};}
$('roster-body').addEventListener('input',e=>{const {id,feet,inches}=rosterFields(e.target);if(id)queueHeight(id,feet,inches);});
$('roster-body').addEventListener('focusout',e=>{if(e.target.tagName!=='INPUT')return;const {id,feet,inches}=rosterFields(e.target);if(id&&!e.target.closest('tr').contains(e.relatedTarget))queueHeight(id,feet,inches,0,true);});
$('roster-body').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();const {id,feet,inches}=rosterFields(e.target);if(id)autoHeight(id,feet,inches,true);}});
function clearHeightDrafts(){for(const timer of heightTimers.values())clearTimeout(timer);heightTimers.clear();dirtyHeights.clear();}
$('random-simulation').onclick=()=>{clearHeightDrafts();commit(simulate(state),'Simulated heights only — not real measurements.');};
$('reset-all').onclick=()=>$('reset-confirm').showModal();
$('cancel-reset').onclick=()=>$('reset-confirm').close();
$('confirm-reset').onclick=()=>{clearHeightDrafts();selected=null;commit(resetAll(state,originalSeats),'Original seats restored; heights cleared.');$('reset-confirm').close();};
$('share-plan').onclick=async()=>{try{await exportPlan(state);toast('Seating plan PNG downloaded.');}catch{toast('Could not export the seating plan. Please try again.');}};

try{const local=['localhost','127.0.0.1'].includes(location.hostname)?await fetch('./local-data.json'):null;const initial=validate(await(local?.ok?local:await fetch('./demo-data.json')).json());originalSeats=structuredClone(initial.seats);try{const stored=JSON.parse(localStorage.getItem(key+'-original-seats'));if(stored){validate({...initial,seats:stored});originalSeats=stored;}}catch{}let saved;try{saved=localStorage.getItem(key);}catch{storageOK=false;}if(saved){try{state=validate(JSON.parse(saved));}catch{toast('The saved browser copy is invalid; loading the initial seating.');}}if(!state)state=initial;save();render();}catch(e){toast('Could not load seating. Reload or open a valid copy.');}
