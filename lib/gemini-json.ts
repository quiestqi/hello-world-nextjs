import "server-only";

export async function requestGeminiJson(key: string, prompt: string) {
  let model = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
  const request = (name: string) => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(name)}:generateContent`, {
    method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":key},
    body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{responseMimeType:"application/json",maxOutputTokens:2048}}),
    signal:AbortSignal.timeout(30000),cache:"no-store"
  });
  let response = await request(model);
  if ([404,503].includes(response.status) && !process.env.GEMINI_MODEL) {
    const catalogue = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000",{headers:{"x-goog-api-key":key},signal:AbortSignal.timeout(10000),cache:"no-store"});
    if(catalogue.ok) {
      const {models=[]} = await catalogue.json();
      const alternatives = models.filter((m:{name:string;supportedGenerationMethods?:string[]})=>m.supportedGenerationMethods?.includes("generateContent") && /^models\/gemini-.*flash/.test(m.name) && !/image|audio|tts|live|embedding|cyber/.test(m.name) && m.name!==`models/${model}`).map((m:{name:string})=>m.name.replace("models/","")) as string[];
      alternatives.sort((a,b)=>Number(b.includes("lite"))-Number(a.includes("lite")) || b.localeCompare(a,undefined,{numeric:true}));
      for(const name of alternatives.slice(0,2)) { model=name;response=await request(model);if(![404,503].includes(response.status))break; }
    }
  }
  if(!response.ok)console.error("illustrated map text provider",{model,status:response.status});
  return { response, model };
}
