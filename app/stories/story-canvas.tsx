"use client";
import {useActionState,useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import Link from 'next/link';
import type {Map as LeafletMap,Marker,Popup,LayerGroup} from 'leaflet';
import {Localized,useLocale} from '@/app/i18n/locale-provider';
import {translateText} from '@/lib/localization';
import {leaveEcho} from './actions';
import 'leaflet/dist/leaflet.css';
type Echo={id:string;lat:number;lng:number;body:string;is_public:boolean};
export default function StoryCanvas({echoes,signedIn,connected}:{echoes:Echo[];signedIn:boolean;connected:boolean}) {
 const locale=useLocale(),host=useRef<HTMLDivElement>(null),map=useRef<LeafletMap|null>(null);
 const popup=useRef<Popup|null>(null),draft=useRef<Marker|null>(null),markers=useRef<LayerGroup|null>(null);
 const [ready,setReady]=useState(0),[pin,setPin]=useState<{lat:number;lng:number}|null>(null),[placed,setPlaced]=useState(false),[editor,setEditor]=useState<HTMLElement|null>(null);
 const [message,setMessage]=useState(''),[mapError,setMapError]=useState(false);
 const [state,action,pending]=useActionState(async(previous:{error?:string;success?:string},form:FormData)=>{
  const result=await leaveEcho(previous,form);
  if(result.success){map.current?.closePopup();draft.current?.remove();draft.current=null;setMessage(result.success);}
  return result;
 },{});
 useEffect(()=>{
 let cancelled=false;let observer:ResizeObserver|undefined;
 void import('leaflet').then(L=>{
 if(cancelled||!host.current)return;
 const m=L.map(host.current,{zoomControl:false,zoomAnimation:false,fadeAnimation:false,markerZoomAnimation:false,minZoom:12,maxBounds:[[48.80,2.25],[48.92,2.43]]}).setView([48.855,2.349],14);map.current=m;
 L.control.zoom({position:'bottomright',zoomInTitle:locale==='zh'?'放大':'Zoom in',zoomOutTitle:locale==='zh'?'缩小':'Zoom out'}).addTo(m);
 L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(m);
 markers.current=L.layerGroup().addTo(m);
 m.on('click',e=>{
  if(!host.current?.contains(e.originalEvent.target as Node)||(e.originalEvent.target as HTMLElement)?.closest('.leaflet-popup'))return;
  if(e.latlng.lat<48.80||e.latlng.lat>48.92||e.latlng.lng<2.25||e.latlng.lng>2.43)return;
  m.closePopup();draft.current?.remove();setMessage('');setPlaced(false);setPin({lat:e.latlng.lat,lng:e.latlng.lng});
  draft.current=L.marker(e.latlng,{icon:L.divIcon({className:'echo-pin echo-draft-pin',html:'<span>+</span>',iconSize:[24,24],iconAnchor:[12,12]}),title:translateText('Your chosen place',locale)}).addTo(m);
  const node=document.createElement('div');L.DomEvent.disableClickPropagation(node);L.DomEvent.disableScrollPropagation(node);
  const p=L.popup({className:'echo-write-popup',closeOnClick:false,closeButton:false,minWidth:260,maxWidth:300,autoPanPadding:[30,60],offset:[0,-12]}).setLatLng(e.latlng).setContent(node).openOn(m);
  popup.current=p;setEditor(node);
  p.on('remove',()=>{setEditor(null);setPin(null);draft.current?.remove();draft.current=null;});
 });
 observer=new ResizeObserver(()=>m.invalidateSize({pan:false}));observer.observe(host.current);setReady(n=>n+1);
 }).catch(()=>{if(!cancelled)setMapError(true);});
 return()=>{cancelled=true;observer?.disconnect();map.current?.remove();map.current=null;markers.current=null;};
 },[locale]);
 useEffect(()=>{
 if(!ready||!markers.current)return;
 let cancelled=false;
 void import('leaflet').then(L=>{
 if(cancelled||!markers.current)return;markers.current.clearLayers();
 for(const echo of echoes){
 const bubble=document.createElement('div');bubble.className='echo-bubble';
 const label=document.createElement('small');label.textContent=translateText(echo.is_public?'ANONYMOUS CITY ECHO':'YOUR PRIVATE ECHO',locale);
 const copy=document.createElement('p');copy.textContent=echo.body;bubble.append(label,copy);
 L.marker([echo.lat,echo.lng],{icon:L.divIcon({className:'echo-pin',html:'<span>·</span>',iconSize:[20,20],iconAnchor:[10,10]}),title:translateText('Read a city echo',locale)}).bindPopup(bubble,{className:'echo-read-popup',maxWidth:280}).addTo(markers.current);
 }
 });return()=>{cancelled=true;};
 },[echoes,ready,locale]);
 useEffect(()=>{if(editor)popup.current?.update();},[editor,placed,state,pending]);
 return <Localized><section className="echo-atlas" aria-label="City echoes map">
  <div ref={host} className="paris-map-canvas" role="region" aria-label="Pin your own Paris"/>
  <div className="echo-atlas-heading"><span className="eyebrow">PARIS / AN OPEN NOTEBOOK</span><h1>Every place holds a story.</h1><p>Choose a place. Drop a pin. Leave a few words.</p></div>
  <Link className="echo-notebook-link" href="/stories?view=notebook">My notebook ↗</Link>
  <div className="echo-atlas-footnote"><span>↗</span>{echoes.length?'Click a pin to read. Click the map to write.':'The map is waiting for its first words.'}</div>
  {(mapError||message)&&<p className="echo-map-toast" role="status">{mapError?'Map temporarily unavailable. Please refresh and try again.':message}</p>}
  {editor&&pin&&createPortal(<Localized><div className="echo-pin-editor" onClick={e=>e.stopPropagation()}><button className="echo-editor-close" type="button" aria-label="Close" disabled={pending} onClick={()=>map.current?.closePopup()}>×</button>
   {!placed?<><p className="eyebrow">A PLACE OF YOUR OWN</p><p className="echo-selected-coordinate" data-no-translate>{pin.lat.toFixed(4)}° N · {pin.lng.toFixed(4)}° E</p><button className="echo-place-button" type="button" onClick={()=>setPlaced(true)}>Place a pin here →</button></>:<form action={action}><input type="hidden" name="lat" value={pin.lat}/><input type="hidden" name="lng" value={pin.lng}/><label className="eyebrow" htmlFor="echo-pin-text">YOUR WORDS, HERE</label><textarea autoFocus id="echo-pin-text" name="body" maxLength={1000} required placeholder="Here, I felt…"/><div className="echo-editor-bottom"><label className="echo-share"><input type="checkbox" name="visibility" value="public"/>Share anonymously</label><button className="echo-place-button" disabled={!signedIn||!connected||pending}>{pending?'Saving…':'Save pin ↗'}</button></div><small>Unchecked: only you can read this.</small>{!signedIn&&<Link href="/login">Log in to save ↗</Link>}{!connected&&<p role="status">Saving is temporarily unavailable.</p>}{state.error&&<p role="alert">{state.error}</p>}</form>}
  </div></Localized>,editor)}
 </section></Localized>;
}
