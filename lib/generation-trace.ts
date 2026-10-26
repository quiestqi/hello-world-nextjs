import 'server-only';
import {createClient} from './supabase/server';
export type GenerationPurpose='journey'|'poetry'|'illustration'|'admin-journey'|'legacy-walk';
export function redactTraceText(text:string){return text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email redacted]').replace(/\b(?:AIza[\w-]{20,}|sk-[\w-]{20,})\b/g,'[credential redacted]');}
export async function finishTrace(id:string|undefined,status:'responded'|'validated'|'saved'|'failed',error?:string,mediaIds:string[]=[]){
 if(!id)return;const db=await createClient();const {error:failure}=await db.rpc('finish_generation_request',{p_request:id,p_status:status,p_error:error||null,p_media_ids:mediaIds});
 if(failure)console.error('Generation outcome logging failed',{code:failure.code});
}
