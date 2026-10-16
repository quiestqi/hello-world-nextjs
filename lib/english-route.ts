import type { LiteraryRoute, RouteCandidate } from "./literary-routes";

// Compatibility for previously saved Chinese routes; never rewrite user records.
const legacyThemes: Record<string, string> = { "初到巴黎": "First steps in Paris", "诗人与城市": "The poet and the city", "故事中的抉择": "Choices in the story" };
const hasHan = (text: string) => /[\u3400-\u9fff]/.test(text);
export function englishRoute(route: LiteraryRoute, candidates: RouteCandidate[], perspective: { id: string; name: string }): LiteraryRoute {
  const theme = Object.entries(legacyThemes).find(([old]) => route.title.includes(old))?.[1];
  const stops = route.stops.map(stop => {
    if (!hasHan(stop.reason)) return stop;
    const scene = candidates.find(p => p.id === stop.place_id)?.scenes.find(s => s.id === stop.scene_id);
    return { ...stop, reason: scene ? `Read Book ${scene.book}, Chapter ${scene.chapter}: ${scene.summary}` : "Return to the novel at this modern reference point." };
  });
  return {
    ...route,
    title: hasHan(route.title) ? `${perspective.id === "free" ? "An independent Paris walk" : `${perspective.name}’s Paris`}${theme ? `: ${theme}` : ""}` : route.title,
    summary: hasHan(route.summary) ? `A solo walk through the places of Notre-Dame de Paris${perspective.id === "free" ? ", following your own curiosity" : `, following ${perspective.name}’s appearances in the novel`}. Explore these modern reference points in the order below; they do not trace an exact historical journey.` : route.summary,
    stops,
  };
}

export function routeForLocale(route: LiteraryRoute, candidates: RouteCandidate[], perspective: { id: string; name: string }, locale: "en" | "zh"): LiteraryRoute {
  if (locale === "en") return englishRoute(route, candidates, perspective);
  const names: Record<string, string> = { gringoire: "格兰古瓦", esmeralda: "艾丝美拉达", quasimodo: "卡西莫多", claude: "克洛德·弗罗洛", free: "自由探索" };
  const themes: Record<string, string> = { "First Arrival in Paris": "初到巴黎", "First steps in Paris": "初到巴黎", "Poet and City": "诗人与城市", "The poet and the city": "诗人与城市", "Choices in the Story": "故事中的抉择", "Choices in the story": "故事中的抉择", "Sanctuary and solitude": "庇护与独处", "Stages and street life": "舞台与街巷", "Between two banks": "两岸之间" };
  const theme = Object.entries(themes).find(([en]) => route.title.includes(en))?.[1];
  const name = names[perspective.id] || perspective.name;
  return { ...route,
    title: hasHan(route.title) ? route.title : `${perspective.id === "free" ? "自由探索" : name + "的巴黎"}${theme ? "：" + theme : ""}`,
    summary: /^[\u3400-\u9fff]/.test(route.summary) ? route.summary : `从《巴黎圣母院》的故事空间出发，${perspective.id === "free" ? "沿着自己的好奇心" : "带着" + name + "的视角"}，独自走一段巴黎。以下为现代参照点的探索顺序，并非人物在原著中的精确行程。`,
    stops: route.stops.map(stop => {
      const scene = candidates.find(p => p.id === stop.place_id)?.scenes.find(s => s.id === stop.scene_id);
      return { ...stop, reason: /^[\u3400-\u9fff]/.test(stop.reason) ? stop.reason : scene ? `回读原著第 ${scene.book} 卷第 ${scene.chapter} 章：${scene.summary}` : "在现代参照点，重读这一段故事。" };
    }),
  };
}
