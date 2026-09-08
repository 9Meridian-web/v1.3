import { supabase } from "../../config/supabase";
import { Agent } from "../../types/agent";

export class AgentService {

    /*
    |--------------------------------------------------------------------------
    | Create Agent
    |--------------------------------------------------------------------------
    */

    static async createAgent(
        agentData: Agent
    ): Promise<Agent> {

        const { data, error } = await supabase

            .from("agents")

            .insert(agentData)

            .select()

            .single();

        if (error) {

            throw new Error(error.message);

        }

        return data as Agent;

    }

    /*
    |--------------------------------------------------------------------------
    | Get Agent By Client
    |--------------------------------------------------------------------------
    */

    static async getAgentsByClient(
        clientId: string
    ): Promise<Agent[]> {

        const { data, error } = await supabase

            .from("agents")

            .select("*")

            .eq("client_id", clientId)

            .order("created_at", {
                ascending: false
            });

        if (error) {

            throw new Error(error.message);

        }

        return data as Agent[];

    }

}