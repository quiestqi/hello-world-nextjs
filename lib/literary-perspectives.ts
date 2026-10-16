export const journeyPerspectives = [
  { id: "gringoire", name: "Pierre Gringoire", subtitle: "The Poet's Gaze", description: "From the great hall of the performance to the city streets, trace the footsteps of a poet." },
  { id: "esmeralda", name: "Esmeralda", subtitle: "The Dancer's Paris", description: "From the square to the sanctuary, reread her experiences in the city." },
  { id: "quasimodo", name: "Quasimodo", subtitle: "Beyond the Bell Tower", description: "Starting from Notre-Dame, see how his world connects with the city." },
  { id: "claude", name: "Claude Frollo", subtitle: "The Archdeacon's Footsteps", description: "Following the spaces he visited in the novel, observe the other side of Paris." },
  { id: "free", name: "Free Exploration", subtitle: "Be Yourself Today", description: "Unrestricted by character, arrange your own urban walk from locations across the entire novel." },
] as const;
export function journeyPerspective(id: string) { return journeyPerspectives.find(p => p.id === id); }
