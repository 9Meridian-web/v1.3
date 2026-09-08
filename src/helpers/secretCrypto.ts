import crypto from "node:crypto";
import { env } from "../config/env";

const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";

function getKey(): Buffer {
    if (!env.GOOGLE_TOKEN_ENCRYPTION_KEY) {
        throw new Error("GOOGLE_TOKEN_ENCRYPTION_KEY is not configured.");
    }
    return crypto.createHash("sha256").update(env.GOOGLE_TOKEN_ENCRYPTION_KEY).digest();
}

export function encryptSecret(value: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptSecret(value: string): string {
    const [version, ivRaw, tagRaw, ciphertextRaw] = value.split(".");
    if (version !== VERSION || !ivRaw || !tagRaw || !ciphertextRaw) throw new Error("Invalid encrypted secret.");
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivRaw, "base64url"));
    decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(ciphertextRaw, "base64url")), decipher.final()]).toString("utf8");
}
