"use client";
import {useEffect,useRef} from 'react';

// Paint only on pointer activity. The native pointer remains precise for maps and inputs.
export default function CursorFlock(){
 const host=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const root=host.current;if(!root)return;
  const media=window.matchMedia('(pointer: fine) and (prefers-reduced-motion: no-preference)');
  const nodes=Array.from(root.querySelectorAll<HTMLElement>('.cursor-bird'));
  const positions=nodes.map(()=>({x:0,y:0,angle:0}));
  let target={x:0,y:0},previous={x:0,y:0},heading=0,frame=0,lastTime=0,lastMove=0,active=false;
  function clear(){cancelAnimationFrame(frame);frame=0;active=false;root!.style.opacity='0';}
  function tick(time:number){
   const dt=Math.min((time-lastTime)||16.7,40)/16.7;lastTime=time;
   const idle=time-lastMove;
   nodes.forEach((node,i)=>{
    const leader=i===0?target:positions[i-1];
    const progress=1-Math.pow(1-(.22-i*.012),dt);
    const spread=idle<300?1:Math.max(0,1-(idle-300)/700);
    const side=(i%2?1:-1)*(8+i*1.5)*spread;
    const goalX=leader.x-Math.cos(heading)*(8+i*.8)-Math.sin(heading)*side;
    const goalY=leader.y-Math.sin(heading)*(8+i*.8)+Math.cos(heading)*side;
    const p=positions[i],dx=goalX-p.x,dy=goalY-p.y;
    p.x+=dx*progress;p.y+=dy*progress;
    if(Math.abs(dx)+Math.abs(dy)>.3){const angle=Math.atan2(dy,dx);let difference=angle-p.angle;difference=Math.atan2(Math.sin(difference),Math.cos(difference));p.angle+=difference*.18*dt;}
    node.style.transform=`translate3d(${p.x}px,${p.y}px,0) rotate(${p.angle}rad) scale(${1-i*.055})`;
   });
   root!.style.opacity=String(Math.min(1,Math.max(0,(1500-idle)/500)));
   if(idle<1500)frame=requestAnimationFrame(tick);else clear();
  }
  function move(event:PointerEvent){
   if(!media.matches||event.pointerType==='touch')return;
   const element=event.target as HTMLElement;
   if(element.closest('input,textarea,select,[contenteditable="true"]')){clear();return;}
   target={x:event.clientX,y:event.clientY};
   const dx=target.x-previous.x,dy=target.y-previous.y;
   if(Math.abs(dx)+Math.abs(dy)>2)heading=Math.atan2(dy,dx);
   previous=target;lastMove=performance.now();
   if(!active){positions.forEach((p,i)=>{p.x=target.x-i*5;p.y=target.y;p.angle=heading;});active=true;lastTime=lastMove;frame=requestAnimationFrame(tick);}
  }
  function visibility(){if(document.hidden)clear();}
  window.addEventListener('pointermove',move,{passive:true});document.addEventListener('pointerleave',clear);window.addEventListener('blur',clear);document.addEventListener('visibilitychange',visibility);media.addEventListener('change',clear);
  return()=>{clear();window.removeEventListener('pointermove',move);document.removeEventListener('pointerleave',clear);window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',visibility);media.removeEventListener('change',clear);};
 },[]);
 return <div ref={host} className="cursor-flock" aria-hidden="true">{Array.from({length:9},(_,i)=><span className="cursor-bird" key={i}><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.6 12.7C10 11 5.2 9.2 5.5 5.2c.1-1.3.9-1.8 1.8-.9 3 2.7 6.1 4.4 7.5 7.4Z"/><path d="M7.2 13.8 2.4 12.3c-.8-.3-1 .4-.5 1.1l3.7 4.4c1.3 1.5 4 2 6.7 1.2 2.9-.9 5.2-3.3 6.3-5.9l3.2-1.1-3.2-1.2a3.2 3.2 0 0 0-6.1.7c-1.8-.3-3.9.6-5.3 2.3Z"/><circle cx="16.1" cy="10.7" r=".6" fill="white"/></svg></span>)}</div>;
}
