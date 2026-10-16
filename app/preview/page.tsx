import Explorer from "@/app/paris/explorer";

export default function Preview() {
  return <Explorer preview storageMode="device" storageKey="staged-paris:preview:v1" />;
}
