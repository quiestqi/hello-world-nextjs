import type { Place } from "@/lib/routes";
import type { MapDesign } from "@/lib/map-design";
import { placeCoordinates } from "@/lib/place-coordinates";

function Venue({kind,color,foliage}:{kind:string;color:string;foliage:string}) {
  if (["park","garden"].includes(kind)) return <g stroke={color} strokeWidth="2.5" strokeLinecap="round"><ellipse cx="0" cy="28" rx="47" ry="15" fill={foliage} opacity=".2"/><path d="M-23 22v-40M22 25v-52"/><path d="M-42-4Q-42-43-24-43Q-3-44-4-8Z M4-16Q0-49 23-49Q47-48 43-15Z" fill={foliage}/><path d="M-10 26h28m-24-6h20m-15 0v12m10-12v12" fill="none"/></g>;
  if(kind === "coffee") return <g stroke={color} strokeWidth="2.5" strokeLinejoin="round"><path d="M-38 34v-61h76v61Z" fill="#fffdf5"/><path d="M-43-27l12-18h62l12 18Z" fill={foliage}/><path d="M-40-22h80v14h-80Z" fill={foliage} opacity=".4"/><path d="M-25 34v-35h25v35M10 0h18v18H10Z" fill="none"/><path d="M-14-60h24v17q-12 12-24 0Z M10-56q18-2 10 10l-10 2M-10-65q-5-6 0-11M2-65q-5-6 0-11" fill="#fffdf5"/></g>;
  if(["bookshop","library"].includes(kind)) return <g stroke={color} strokeWidth="2.5" strokeLinejoin="round"><path d="M-40 34v-62h80v62Z" fill="#fffdf5"/><path d="M-45-28l45-25 45 25Z" fill={foliage}/><path d="M-23 34V-4H1v38M15-3h15v20H15Z" fill="none"/><path d="M-28-70q18-7 28 0q10-7 28 0v23q-18-7-28 0q-10-7-28 0Z" fill="#fffdf5"/><path d="M0-69v22M-21-60l14 1m14 0 14-1" fill="none"/></g>;
  return <g stroke={color} strokeWidth="2.5" strokeLinejoin="round"><path d="M-39 34V-15h78v49Z M-24-15v-27l24-19 24 19v27" fill="#fffdf5"/><path d="M-45-15h90M-44 34h88M-8 34V8q8-15 16 0v26M-26 0v18M26 0v18M0-44v14" fill="none"/><path d="M-28-42h56" stroke={foliage}/></g>;
}
export function IllustratedMap({design,stops,title}:{design:MapDesign;stops:Place[];title:string}) {
  const points=stops.map(p=>typeof p.latitude === "number" && typeof p.longitude === "number" ? {lat:p.latitude,lng:p.longitude} : placeCoordinates[p.id]);
  const lat=points.map(p=>p.lat),lng=points.map(p=>p.lng);
  const minLat=Math.min(...lat),maxLat=Math.max(...lat),minLng=Math.min(...lng),maxLng=Math.max(...lng);
  const nodes=points.map(p=>({x:145+(p.lng-minLng)/Math.max(maxLng-minLng,.001)*510,y:235+(maxLat-p.lat)/Math.max(maxLat-minLat,.001)*370}));
  // Separate close venues for legible artwork; exact positions remain in the real map.
  for(let i=0;i<nodes.length;i++) for(let j=0;j<i;j++) if(Math.abs(nodes[i].x-nodes[j].x)<180&&Math.abs(nodes[i].y-nodes[j].y)<155) nodes[i].y=Math.min(650,nodes[j].y+165);
  return <svg viewBox="0 0 800 800" role="img" aria-label={`Illustrated route map: ${title}`} style={{width:"100%",display:"block",color:design.ink}}>
    <rect width="800" height="800" fill={design.background}/><rect x="22" y="22" width="756" height="756" rx="12" stroke={design.ink} strokeWidth="1" fill="none" opacity=".3"/>
    <text x="400" y="69" textAnchor="middle" fill={design.ink} fontFamily="Georgia,serif" fontSize="23">COFFEE &amp; LITTLE DETOURS</text>
    <text x="400" y="105" textAnchor="middle" fill={design.ink} fontFamily="Georgia,serif" fontSize="19">{design.subtitle}</text>
    <path d="M65 140q180-20 300 0t370 0M65 710q180 20 300 0t370 0" fill="none" stroke={design.accent} strokeWidth="3" opacity=".4"/>
    <g transform="translate(730 190)" fill="none" stroke={design.ink} strokeWidth="2"><path d="M0 20v-30m-7 9 7-9 7 9"/><text y="-20" textAnchor="middle" fill={design.ink} stroke="none" fontSize="13">N</text></g>
    <polyline points={nodes.map(n=>`${n.x},${n.y+18}`).join(" ")} stroke={design.accent} strokeWidth="4" fill="none" strokeDasharray="7 10" strokeLinecap="round"/>
    {design.decorations.map((d,i)=><g key={i} transform={`translate(${80+i*290} ${165+i%2*530})`} stroke={design.accent} fill="none" strokeWidth="2.5">{d==="sun"?<><circle r="14"/><path d="M0-21v-10M0 21v10M21 0h10M-21 0h-10M15-15l7-7M-15 15l-7 7M15 15l7 7M-15-15l-7-7"/></>:d==="camera"?<><rect x="-24" y="-15" width="48" height="32" rx="5"/><circle r="9"/><path d="M-14-15v-7h15v7"/></>:d==="conversation"?<path d="M-24-17h48v30H0l-12 12V13h-12Z"/>:d==="stars"?<path d="M0-20l5 15 15 5-15 5-5 15-5-15-15-5 15-5Z"/>:<><path d="M-22 22q5-35 42-43q-1 39-42 43ZM-22 22 10-10"/><path d="M-2 2V-14M-4 4h18"/></>}</g>)}
    {stops.map((p,i)=><g key={p.id} transform={`translate(${nodes[i].x} ${nodes[i].y})`}><ellipse cy="25" rx="67" ry="35" fill={design.background}/><Venue kind={p.kind} color={design.ink} foliage={p.kind==="coffee"?design.accent:design.foliage}/><circle cx="-57" cy="-18" r="17" fill={design.accent}/><text x="-57" y="-12" fill={design.ink} textAnchor="middle" fontSize="17" fontWeight="bold">{i+1}</text><text y="58" fill={design.ink} textAnchor="middle" fontSize="15" fontFamily="Georgia,serif">{p.name.replace(/ · .*/,"").slice(0,30)}</text><text y="80" fill={design.ink} textAnchor="middle" fontSize="12">{design.captions[i]}</text></g>)}
    <text x="400" y="750" textAnchor="middle" fill={design.ink} fontSize="12" letterSpacing="2">A SCHEMATIC OF YOUR DAY · NOT FOR NAVIGATION</text>
  </svg>;
}
