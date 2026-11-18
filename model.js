export function move(state,personId,targetId){
  const next=structuredClone(state),person=next.people.find(p=>p.id===personId);
  if(!person)throw Error('Unknown singer');
  const source=next.seats.find(s=>s.personId===personId),target=targetId===null?null:next.seats.find(s=>s.id===targetId);
  if(targetId!==null&&!target)throw Error('Seat unavailable');
  if(source===target)return next;
  if(source)source.personId=target?.personId??null;
  if(target)target.personId=personId;
  return next;
}
export function setHeight(state,id,value){
  const height=value===''?null:Number(value);
  if(height!==null&&(!Number.isFinite(height)||height<24||height>96))throw Error('Enter a height between 2 and 8 feet.');
  const next=structuredClone(state);const p=next.people.find(p=>p.id===id);p.height=height;delete p.heightSource;return next;
}
export function propose(state){
  const next=structuredClone(state),byId=new Map(next.people.map(p=>[p.id,p]));
  for(const section of next.sections){
    const slots=next.seats.filter(s=>{const p=byId.get(s.personId);return p?.section===section.name&&p.height!==null;}).sort((a,b)=>a.row.localeCompare(b.row)||a.col-b.col);
    const people=slots.map(s=>byId.get(s.personId)).sort((a,b)=>a.height-b.height);
    slots.forEach((s,i)=>s.personId=people[i].id);
  }
  return next;
}
export function validate(data){
  if(data.version!==2||!Array.isArray(data.people)||!Array.isArray(data.seats)||!Array.isArray(data.sections)||data.people.length>500)throw Error('Invalid seating file.');
  const ids=new Set(),seatIds=new Set(),occupied=new Set(),positions=new Set();
  if(data.sections.length!==8||new Set(data.sections.map(s=>s.name)).size!==8||data.sections.some(s=>!/^#[0-9a-f]{6}$/i.test(s.color)||typeof s.name!=='string'))throw Error('Invalid sections.');
  for(const p of data.people){if(typeof p.id!=='string'||!/^[-a-zA-Z0-9_]+$/.test(p.id)||ids.has(p.id)||typeof p.name!=='string'||!p.name.trim()||!data.sections.some(s=>s.name===p.section)||(p.heightSource!==undefined&&p.heightSource!=='simulated')||!(p.height===null||(Number.isFinite(p.height)&&p.height>=24&&p.height<=96)))throw Error('Invalid singer.');ids.add(p.id);}
  for(const s of data.seats){const pos=`${s.row}-${s.col}`;if(!/^[B-F]$/.test(s.row)||!Number.isInteger(s.col)||s.col<0||s.col>30||s.number!==31-s.col||typeof s.id!=='string'||seatIds.has(s.id)||positions.has(pos)||(s.personId!==null&&(!ids.has(s.personId)||occupied.has(s.personId))))throw Error('Invalid seats.');seatIds.add(s.id);positions.add(pos);if(s.personId)occupied.add(s.personId);}
  return structuredClone(data);
}

export function parseHeight(feet,inches){
 if(feet===''&&inches==='')return '';
 if(feet===''||inches==='')throw Error('Complete feet and inches; use 0 inches for a whole foot.');
 const f=Number(feet),i=Number(inches);
 if(!Number.isInteger(f)||f<2||f>8||!Number.isFinite(i)||i<0||i>=12||f*12+i>96)throw Error('Check feet (2–8) and inches (0 to less than 12).');
 return Math.round((f*12+i)*100)/100;
}
export function formatHeight(value){if(value===null)return '';const feet=Math.floor(value/12),inches=Math.round((value-feet*12)*100)/100;return `${feet}′ ${inches}″`;}
export function heightParts(value){return value===null?['','']:[Math.floor(value/12),Math.round((value%12)*100)/100];}

export function simulate(state){
 const next=structuredClone(state);
 for(const p of next.people){p.height=60+Math.floor(Math.random()*73)/4;p.heightSource='simulated';}
 return next;
}
export function resetAll(state,seats){
 const next=structuredClone(state);next.seats=structuredClone(seats);
 for(const p of next.people){p.height=null;delete p.heightSource;}
 return validate(next);
}

export function restoreNames(state,initial){
 const next=structuredClone(state),names=new Map(initial.people.map(p=>[p.id,p.name]));
 for(const p of next.people){if(/^Singer \d{3}$/.test(p.name)&&names.has(p.id))p.name=names.get(p.id);}
 return next;
}
