import { supabase } from "../src/config/supabase";
import { encryptSecret } from "../src/helpers/secretCrypto";
import { env } from "../src/config/env";

async function main(): Promise<void> {
    if (env.NODE_ENV === "production" && !env.GOOGLE_TOKEN_ENCRYPTION_KEY) {
        throw new Error("GOOGLE_TOKEN_ENCRYPTION_KEY is required.");
    }

    const { data, error } = await supabase
        .from("google_connections")
        .select("id,refresh_token,refresh_token_encrypted")
        .not("refresh_token", "is", null);

    if (error) throw error;

    let migrated = 0;
    for (const row of data ?? []) {
        if (!row.refresh_token || row.refresh_token_encrypted) continue;
        await supabase
            .from("google_connections")
            .update({
                refresh_token_encrypted: encryptSecret(row.refresh_token),
                refresh_token: null,
                updated_at: new Date().toISOString(),
            })
            .eq("id", row.id);
        migrated += 1;
    }

    console.log(`Encrypted ${migrated} Google refresh token(s).`);
}

main().catch(error => {
    console.error("Google token migration failed:", error instanceof Error ? error.message : error);
    process.exit(1);
});
