export interface Agent {

    id?: string;

    client_id: string;

    agent_name: string;

    business_name: string;

    prompt: string;

    language: string;

    timezone: string;

    voice_provider: string;

    voice_id?: string;

    booking_enabled: boolean;

    status?: string;

    created_at?: string;

    updated_at?: string;

}