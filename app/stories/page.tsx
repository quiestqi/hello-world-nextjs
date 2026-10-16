import Link from "next/link";
import { LanguageSwitch, Localized } from "@/app/i18n/locale-provider";
import { createClient } from "@/lib/supabase/server";
import { isAuthConfigured } from "@/lib/auth-config";
import StoryCanvas from "./story-canvas";
import Explorer from "@/app/paris/explorer";
import "@/app/paris/paris.css";
export default async function Stories({searchParams}:{searchParams:Promise<{preview?:string;view?:string}>}) {
 const params=await searchParams;
 let signedIn=false, connected=false;
 let echoes:{id:string;lat:number;lng:number;body:string;is_public:boolean}[]=[];
 if(isAuthConfigured()) {
 const db=await createClient(); const {data:{user}}=await db.auth.getUser(); signedIn=!!user;
 const {data:publicEchoes,error}=await db.rpc('read_city_echoes'); connected=!error;
 const {data:own}=user?await db.from('literary_echoes').select('id,lat,lng,body,is_public').eq('user_id',user.id):{data:[]};
 const byId=new Map<string,{id:string;lat:number;lng:number;body:string;is_public:boolean}>();
 for(const echo of publicEchoes||[]) byId.set(echo.id,{...echo,is_public:true});
 for(const echo of own||[]) byId.set(echo.id,echo);
 echoes=[...byId.values()];
 if(params.view==='notebook') {
 const {data:entries}=user?await db.from('literary_notebooks').select('place_id,saved,visited,note').eq('user_id',user.id):{data:[]};
 return <Explorer notebookOnly preview={!signedIn} storageMode={signedIn?'cloud':'device'} storageKey={user?`staged-paris:account:${user.id}`:'staged-paris:preview:v1'} initialEntries={entries||[]} />;
 }
 }
 return <Localized><main className="paris-app"><header className="paris-header"><Link className="paris-brand" href="/"><span className="brand-mark">S<span>C</span></span><span>STAGED CITY<small>A CITY, READ DIFFERENTLY</small></span></Link><nav className="paris-tabs"><Link href="/">01 / Story map</Link><Link href="/journeys">02 / Your journey</Link><Link href="/stories">03 / City echoes</Link></nav><div className="paris-account"><LanguageSwitch /><Link href={signedIn?'/profile':'/login'}>{signedIn?'Profile':'Log In ↗'}</Link></div></header><StoryCanvas echoes={echoes} signedIn={signedIn} connected={connected}/></main></Localized>;
}
