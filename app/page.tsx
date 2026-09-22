import { supabase } from "@/lib/supabase";

export default async function Home() {
    const { data: coffees, error } = await supabase
        .from("coffees")
        .select("*")
        .order("id", { ascending: true });

    if (error) {
        return <main>Failed to load coffees: {error.message}</main>;
    }

    return (
        <main>
            <h1>Coffee List ☕</h1>

            <ul>
                {coffees?.map((coffee) => (
                    <li key={coffee.id}>
                        <h2>{coffee.name}</h2>
                        <p><strong>Origin:</strong> {coffee.origin}</p>
                        <p>{coffee.description}</p>
                    </li>
                ))}
            </ul>
        </main>
    );
}