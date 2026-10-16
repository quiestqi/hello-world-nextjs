"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
export async function leaveEcho(_previous: { error?: string; success?: string }, form: FormData): Promise<{error?:string;success?:string}> {
 const lat=Number(form.get('lat')), lng=Number(form.get('lng')), body=String(form.get('body') || '').trim(), published=form.get('visibility') === 'public';
 if (!Number.isFinite(lat)||!Number.isFinite(lng)||lat<48.80||lat>48.92||lng<2.25||lng>2.43||!body||body.length>1000) return {error:'Pin a place in central Paris and write between 1 and 1000 characters.'};
 const db=await createClient(); const {data:{user}}=await db.auth.getUser();
 if(!user) return {error:'Please log in to save your city echo.'};
 const {error}=await db.rpc('save_city_echo',{p_lat:lat,p_lng:lng,p_body:body,p_public:published});
 if(error) return {error:error.message.includes('Daily echo limit')?'You have left 20 echoes today. Come back tomorrow.':'City echoes could not be saved. Your draft is still here; please try again later.'};
 revalidatePath('/stories');
 return {success:published?'Your anonymous echo is now on the map.':'Your private echo has been saved.'};
}
