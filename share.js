export async function exportPlan(state){
 await document.fonts.ready;
 const canvas=document.createElement('canvas'),width=3464,cardWidth=104,rowHeight=122,left=110,top=190;
 const unassigned=state.people.filter(p=>!state.seats.some(s=>s.personId===p.id));
 canvas.width=width;canvas.height=top+7*rowHeight+130+(unassigned.length?80+Math.ceil(unassigned.length/8)*32:0);
 const ctx=canvas.getContext('2d');
 if(!ctx)throw Error('Canvas unavailable');
 ctx.fillStyle='#f5f3eb';ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.fillStyle='#243f34';ctx.font='600 48px "DM Sans", sans-serif';ctx.fillText('Seating Chart',50,70);
 ctx.font='22px "DM Sans", sans-serif';
 state.sections.forEach((section,index)=>{const x=50+index*370;ctx.fillStyle=section.color;ctx.fillRect(x,110,22,22);ctx.fillStyle='#243f34';ctx.fillText(section.name,x+34,130);});
 const people=new Map(state.people.map(p=>[p.id,p]));
 function wrap(text,x,y,maxWidth){
  const words=text.split(/\s+/),lines=[];let line='';
  for(const word of words){const next=line?line+' '+word:word;if(ctx.measureText(next).width>maxWidth&&line){lines.push(line);line=word;}else line=next;}
  if(line)lines.push(line);
  lines.forEach((line,index)=>{if(ctx.measureText(line).width>maxWidth){let part='';for(const char of line){if(ctx.measureText(part+char).width>maxWidth){ctx.fillText(part,x,y);y+=22;part='';}part+=char;}ctx.fillText(part,x,y);y+=22;}else{ctx.fillText(line,x,y);y+=22;}});
 }
 for(const [index,row] of ['G','F','E','D','C','B','A'].entries()){
  const y=top+index*rowHeight;ctx.fillStyle='#243f34';ctx.font='600 24px "DM Sans", sans-serif';ctx.textAlign='center';ctx.fillText(row,65,y+48);ctx.fillText(row,width-55,y+48);
  for(let col=0;col<31;col++){
   const seat=state.seats.find(s=>s.row===row&&s.col===col),p=people.get(seat?.personId),x=left+col*cardWidth;
   ctx.fillStyle=p?state.sections.find(s=>s.name===p.section).color:seat?'#fffef9':'#e5e5da';ctx.fillRect(x,y,cardWidth-6,96);
   ctx.fillStyle='#243f34';ctx.font='600 17px "DM Sans", sans-serif';ctx.textAlign='left';if(p)wrap(p.name,x+7,y+25,cardWidth-20);else if(seat){ctx.font='16px "DM Sans", sans-serif';ctx.fillText('Empty',x+15,y+53);}else{ctx.fillStyle='#9b9f91';ctx.font='24px "DM Sans", sans-serif';ctx.fillText('×',x+40,y+55);}
   ctx.textAlign='center';ctx.fillStyle='#64735e';ctx.font='16px "DM Sans", sans-serif';ctx.fillText(String(31-col),x+(cardWidth-6)/2,y+115);
  }
 }
 const bottom=top+7*rowHeight;ctx.textAlign='center';ctx.fillStyle='#243f34';ctx.font='600 24px "DM Sans", sans-serif';ctx.fillText('↓ CONDUCTOR · FRONT OF CHOIR',width/2,bottom+45);
 ctx.font='18px "DM Sans", sans-serif';ctx.fillText('× Unavailable or unconfirmed seat',width/2,bottom+84);
 if(unassigned.length){ctx.textAlign='left';ctx.font='600 22px "DM Sans", sans-serif';ctx.fillText('Unassigned',50,bottom+150);ctx.font='18px "DM Sans", sans-serif';unassigned.forEach((p,i)=>ctx.fillText(p.name,50+(i%8)*420,bottom+185+Math.floor(i/8)*32));}
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('PNG unavailable');
 const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='seating-plan.png';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
