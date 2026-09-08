import { supabase } from "../config/supabase";
import { Agent } from "../types/agent";
import { AppError } from "../errors/AppError";

export class AgentRepository {
    static async findById(id: string): Promise<Agent | null> {
        const { data, error } = await supabase.from("agents").select("*").eq("id", id).maybeSingle();
        if (error) throw new AppError(error.message, 500);
        return data as Agent | null;
    }

    static async create(agent: Agent): Promise<Agent> {
        const { data, error } = await supabase.from("agents").insert(agent).select().single();
        if (error) throw new AppError(error.message, 500);
        return data as Agent;
    }

    static async listByClient(clientId: string): Promise<Agent[]> {
        const { data, error } = await supabase.from("agents").select("*").eq("client_id", clientId).order("created_at", { ascending: false });
        if (error) throw new AppError(error.message, 500);
        return (data ?? []) as Agent[];
    }

    static async publish(id: string, clientId: string): Promise<Agent> {
        const { data, error } = await supabase
            .from("agents")
            .update({ status: "published", published_at: new Date().toISOString() })
            .eq("id", id)
            .eq("client_id", clientId)
            .select()
            .single();
        if (error || !data) throw new AppError("Agent not found.", 404);
        return data as Agent;
    }
}
