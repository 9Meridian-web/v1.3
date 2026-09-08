import { AppError } from "../errors/AppError";
import { supabase } from "../config/supabase";
import { verifySetupToken } from "../helpers/setupToken";

interface OnboardingPayload {
    setup_token: string;

    companyName: string;
    ownerName: string;
    businessEmail: string;
    phone: string;

    website?: string;
    industry?: string;

    country?: string;
    state?: string;
    city?: string;
    timezone?: string;
    address?: string;

    receptionistType?: string[];

    launchDate?: string;
    urgent?: string;

    calendar?: string;
    leadStorage?: string;

    crmChoice?: string;
    crmOther?: string;

    workingHours?: string;
    daysOpen?: string[];

    services?: string;
    faqs?: string;

    greeting?: string;
    languages?: string;
    tone?: string;

    transferHuman?: string;
    staffName?: string;
    staffContact?: string;

    notify?: string[];

    additionalNotes?: string;
}

interface OnboardingResult {
    client_id: string;
    onboarding_status: string;

    business_settings: unknown;
    services: unknown[];
    agent: unknown;

    google_required: boolean;
    google_authorization_url: string | null;
}

function text(value: unknown): string {
    return String(value ?? "").trim();
}

function timezoneToIana(value: string): string {
    const map: Record<string, string> = {
        "Pacific Time (PT, UTC−8)": "America/Los_Angeles",
        "Mountain Time (MT, UTC−7)": "America/Denver",
        "Central Time (CT, UTC−6)": "America/Chicago",
        "Eastern Time (ET, UTC−5)": "America/New_York",
        "Greenwich Mean Time (GMT, UTC+0)": "Europe/London",
        "Central European Time (CET, UTC+1)": "Europe/Berlin",
        "India Standard Time (IST, UTC+5:30)": "Asia/Kolkata",
    };

    return map[value] ?? (value || "Asia/Kolkata");
}

/**
 * Convert common time inputs into PostgreSQL TIME format.
 *
 * Supported examples:
 * 9 AM
 * 09:00 AM
 * 3 PM
 * 15:00
 * 09:30
 */
function parseTimePart(value: string): string | null {
    const v = value
        .trim()
        .toUpperCase()
        .replace(/\s+/g, " ");

    const match = v.match(
        /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/,
    );

    if (!match) {
        return null;
    }

    let hour = Number(match[1]);
    const minute = Number(match[2] ?? "00");
    const meridiem = match[3];

    if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
        return null;
    }

    if (minute < 0 || minute > 59) {
        return null;
    }

    if (meridiem) {
        if (hour < 1 || hour > 12) {
            return null;
        }

        if (meridiem === "PM" && hour !== 12) {
            hour += 12;
        }

        if (meridiem === "AM" && hour === 12) {
            hour = 0;
        }
    } else if (hour > 23) {
        return null;
    }

    return `${String(hour).padStart(2, "0")}:${String(
        minute,
    ).padStart(2, "0")}`;
}

/**
 * Parse values such as:
 *
 * 9 AM - 6 PM
 * 9:00 AM to 6:00 PM
 * 09:00 - 18:00
 */
function parseWorkingHours(value: string): {
    opening_time: string;
    closing_time: string;
} {
    const raw = text(value);

    if (!raw) {
        return {
            opening_time: "09:00",
            closing_time: "18:00",
        };
    }

    const normalized = raw
        .replace(/[–—]/g, "-")
        .replace(/\bto\b/gi, "-");

    const parts = normalized
        .split(/\s*-\s*/)
        .filter(Boolean);

    if (parts.length >= 2) {
        const opening = parseTimePart(parts[0]);
        const closing = parseTimePart(parts[1]);

        if (opening && closing) {
            return {
                opening_time: opening,
                closing_time: closing,
            };
        }
    }

    return {
        opening_time: "09:00",
        closing_time: "18:00",
    };
}

/**
 * Parse onboarding service text into rows matching
 * the actual public.services schema.
 *
 * Examples:
 *
 * Facial - 45 min - ₹700
 * Haircut, 30 minutes, ₹500
 * Manicure - 60 min - INR 900
 */
function parseServices(
    raw: string,
    clientId: string,
): Array<Record<string, unknown>> {
    const source = text(raw);

    if (!source) {
        return [];
    }

    const entries = source
        .split(/\n|,(?=\s*[A-Za-z])/)
        .map((item) => item.trim())
        .filter(Boolean);

    return entries.map((entry, index) => {
        let name = entry;

        let duration = 30;
        let price = 0;

        const durationMatch = entry.match(
            /(\d+)\s*(?:min|mins|minutes)\b/i,
        );

        if (durationMatch) {
            duration = Math.min(
                480,
                Math.max(
                    5,
                    Number(durationMatch[1]),
                ),
            );
        }

        const priceMatch = entry.match(
            /(?:₹|INR|USD|\$)\s*([\d,.]+)|(?:price\s*[:=-]?\s*)([\d,.]+)/i,
        );

        const priceValue =
            priceMatch?.[1] ??
            priceMatch?.[2];

        if (priceValue) {
            price =
                Number(
                    priceValue.replace(/,/g, ""),
                ) || 0;
        }

        name = name
            .replace(
                /(?:₹|INR|USD|\$)\s*[\d,.]+/gi,
                "",
            )
            .replace(
                /\b\d+\s*(?:min|mins|minutes)\b/gi,
                "",
            )
            .replace(
                /\bprice\s*[:=-]?\s*[\d,.]+/gi,
                "",
            )
            .replace(/\s*[-|:]\s*$/g, "")
            .trim();

        return {
            client_id: clientId,

            name:
                name ||
                `Service ${index + 1}`,

            description: "",

            category: "",

            duration_minutes: duration,

            price,

            currency: "INR",

            online_booking: true,

            is_active: true,
        };
    });
}

/**
 * Build the receptionist's main prompt.
 *
 * The detailed configuration is also saved separately
 * in agent_settings.configuration.
 */
function buildAgentPrompt(
    payload: OnboardingPayload,
    timezone: string,
    settings: {
        opening_time: string;
        closing_time: string;
    },
): string {
    return [
        `You are the AI receptionist for ${text(
            payload.companyName,
        )}.`,

        `Owner/contact: ${text(
            payload.ownerName,
        )} | ${text(
            payload.businessEmail,
        )} | ${text(payload.phone)}.`,

        `Location: ${
            [
                payload.address,
                payload.city,
                payload.state,
                payload.country,
            ]
                .filter(Boolean)
                .join(", ") ||
            "Not provided"
        }.`,

        `Timezone: ${timezone}.`,

        `Working hours: ${settings.opening_time}–${settings.closing_time}.`,

        `Days open: ${
            (payload.daysOpen ?? []).join(
                ", ",
            ) || "Not provided"
        }.`,

        `Channels: ${
            (
                payload.receptionistType ??
                []
            ).join(", ") ||
            "AI Chatbot Receptionist"
        }.`,

        `Greeting: ${
            text(payload.greeting) ||
            "Greet the customer warmly and ask how you can help."
        }`,

        `Languages: ${
            text(payload.languages) ||
            "English"
        }.`,

        `Tone: ${
            text(payload.tone) ||
            "Professional"
        }.`,

        `Human transfer: ${
            text(payload.transferHuman) ||
            "Not specified"
        }.`,

        payload.staffName ||
        payload.staffContact
            ? `Human contact: ${text(
                  payload.staffName,
              )} ${text(
                  payload.staffContact,
              )}`.trim()
            : "",

        `Lead storage: ${
            text(payload.leadStorage) ||
            "Not specified"
        }${
            payload.crmChoice
                ? ` (${text(
                      payload.crmChoice ===
                          "Other"
                          ? payload.crmOther
                          : payload.crmChoice,
                  )})`
                : ""
        }.`,

        `Calendar integration preference: ${
            text(payload.calendar) ||
            "Not specified"
        }.`,

        `Services supplied during onboarding: ${
            text(payload.services) ||
            "No services supplied yet"
        }.`,

        `FAQs supplied during onboarding: ${
            text(payload.faqs) ||
            "No FAQs supplied yet"
        }.`,

        `Notifications: ${
            (payload.notify ?? []).join(
                ", ",
            ) || "Not specified"
        }.`,

        `Additional notes: ${
            text(payload.additionalNotes) ||
            "None"
        }.`,

        "Never invent business policies, prices, availability, or appointment confirmations.",

        "Use the backend tools/data for booking, availability, cancellation, rescheduling, services, and business facts.",
    ]
        .filter(Boolean)
        .join("\n");
}

export class OnboardingService {
    static async complete(
        payload: OnboardingPayload,
    ): Promise<OnboardingResult> {
        /*
         * ---------------------------------------------------------
         * 1. VERIFY SETUP TOKEN
         * ---------------------------------------------------------
         */

        const token = text(
            payload.setup_token,
        );

        if (!token) {
            throw new AppError(
                "setup_token is required.",
                401,
            );
        }

        let setup: {
            clientId: string;
        };

        try {
            setup =
                verifySetupToken(token);
        } catch {
            throw new AppError(
                "Invalid or expired onboarding token.",
                401,
            );
        }

        const clientId = setup.clientId;


        /*
         * ---------------------------------------------------------
         * 2. VALIDATE BASIC CLIENT INFORMATION
         * ---------------------------------------------------------
         */

        const companyName = text(
            payload.companyName,
        );

        const ownerName = text(
            payload.ownerName,
        );

        const email = text(
            payload.businessEmail,
        ).toLowerCase();

        const phone = text(
            payload.phone,
        );

        if (
            !companyName ||
            !ownerName ||
            !email ||
            !phone
        ) {
            throw new AppError(
                "Company name, owner name, email, and phone are required.",
                400,
            );
        }

        if (
            !/^\S+@\S+\.\S+$/.test(email)
        ) {
            throw new AppError(
                "Please provide a valid business email.",
                400,
            );
        }


        /*
         * ---------------------------------------------------------
         * 3. PREPARE BUSINESS INFORMATION
         * ---------------------------------------------------------
         */

        const timezone =
            timezoneToIana(
                text(payload.timezone),
            );

        const hours =
            parseWorkingHours(
                text(
                    payload.workingHours,
                ),
            );

        const workingDays =
            payload.daysOpen?.length
                ? payload.daysOpen
                : [
                      "Mon",
                      "Tue",
                      "Wed",
                      "Thu",
                      "Fri",
                  ];


        /*
         * ---------------------------------------------------------
         * 4. UPDATE CLIENT
         *
         * Uses only fields confirmed to exist in clients.
         * ---------------------------------------------------------
         */

        const {
            data: client,
            error: clientError,
        } = await supabase
            .from("clients")
            .update({
                business_name:
                    companyName,

                owner_name:
                    ownerName,

                email,

                phone,

                website:
                    text(
                        payload.website,
                    ) || null,

                industry:
                    text(
                        payload.industry,
                    ) || "general",

                timezone,

                locale:
                    timezone ===
                    "Asia/Kolkata"
                        ? "en-IN"
                        : "en-US",

                date_format:
                    "yyyy-MM-dd",

                time_format:
                    "12h",

                updated_at:
                    new Date().toISOString(),
            })
            .eq("id", clientId)
            .select()
            .single();

        if (
            clientError ||
            !client
        ) {
            console.error(
                "CLIENT UPDATE ERROR",
                clientError,
            );

            throw new AppError(
                clientError?.message ||
                    "Unable to update client profile.",
                500,
            );
        }


        /*
         * ---------------------------------------------------------
         * 5. BUSINESS SETTINGS
         *
         * IMPORTANT:
         *
         * This payload contains ONLY columns that actually
         * exist in public.business_settings.
         *
         * Address/business name/email/phone do NOT belong here.
         * ---------------------------------------------------------
         */

        const settingsPayload = {
            client_id: clientId,

            appointment_duration: 30,

            buffer_minutes: 0,

            opening_time:
                hours.opening_time,

            closing_time:
                hours.closing_time,

            working_days:
                workingDays,

            updated_at:
                new Date().toISOString(),
        };


        /*
         * Find existing settings.
         */

        const {
            data: existingSettings,
            error: settingsLookupError,
        } = await supabase
            .from("business_settings")
            .select("id")
            .eq(
                "client_id",
                clientId,
            )
            .maybeSingle();

        if (settingsLookupError) {
            throw new AppError(
                settingsLookupError.message,
                500,
            );
        }


        let businessSettings: unknown;


        /*
         * Update existing settings.
         */

        if (existingSettings?.id) {
            const {
                data,
                error,
            } = await supabase
                .from(
                    "business_settings",
                )
                .update(
                    settingsPayload,
                )
                .eq(
                    "id",
                    existingSettings.id,
                )
                .select()
                .single();

            if (error) {
                throw new AppError(
                    error.message,
                    500,
                );
            }

            businessSettings =
                data;
        }


        /*
         * Create settings if they don't exist.
         */

        else {
            const {
                data,
                error,
            } = await supabase
                .from(
                    "business_settings",
                )
                .insert(
                    settingsPayload,
                )
                .select()
                .single();

            if (error) {
                throw new AppError(
                    error.message,
                    500,
                );
            }

            businessSettings =
                data;
        }


        /*
         * ---------------------------------------------------------
         * 6. SERVICES
         * ---------------------------------------------------------
         */

        const serviceRows =
            parseServices(
                text(
                    payload.services,
                ),
                clientId,
            );


        /*
         * Add services without duplicating existing service names.
         */

        if (serviceRows.length) {
            const {
                data: existingServices,
                error: existingServicesError,
            } = await supabase
                .from("services")
                .select(
                    "id,name",
                )
                .eq(
                    "client_id",
                    clientId,
                );

            if (
                existingServicesError
            ) {
                throw new AppError(
                    existingServicesError.message,
                    500,
                );
            }

            const existingNames =
                new Set(
                    (
                        existingServices ??
                        []
                    ).map(
                        (
                            service,
                        ) =>
                            String(
                                service.name,
                            )
                                .trim()
                                .toLowerCase(),
                    ),
                );

            const newRows =
                serviceRows.filter(
                    (
                        service,
                    ) =>
                        !existingNames.has(
                            String(
                                service.name,
                            )
                                .trim()
                                .toLowerCase(),
                        ),
                );

            if (
                newRows.length
            ) {
                const {
                    error,
                } = await supabase
                    .from(
                        "services",
                    )
                    .insert(
                        newRows,
                    );

                if (error) {
                    throw new AppError(
                        error.message,
                        500,
                    );
                }
            }
        }


        /*
         * Get all services for the final response.
         */

        const {
            data: services,
            error: servicesError,
        } = await supabase
            .from("services")
            .select("*")
            .eq(
                "client_id",
                clientId,
            )
            .order("name");

        if (servicesError) {
            throw new AppError(
                servicesError.message,
                500,
            );
        }


        /*
         * ---------------------------------------------------------
         * 7. BUILD AGENT PROMPT
         * ---------------------------------------------------------
         */

        const prompt =
            buildAgentPrompt(
                payload,
                timezone,
                hours,
            );

        const language =
            text(
                payload.languages,
            )
                .split(",")[0]
                ?.trim() ||
            "en";


        /*
         * ---------------------------------------------------------
         * 8. AGENT
         *
         * IMPORTANT:
         *
         * Your actual agents table contains ONLY:
         *
         * id
         * client_id
         * agent_name
         * provider
         * project_id
         * version
         * status
         * created_at
         * updated_at
         * public_slug
         * dify_app_id
         * published_at
         *
         * Therefore we do NOT put prompt/language/timezone/etc.
         * into agents.
         *
         * Those details are stored in agent_settings.
         * ---------------------------------------------------------
         */

        const {
            data: existingAgent,
            error: existingAgentError,
        } = await supabase
            .from("agents")
            .select("*")
            .eq(
                "client_id",
                clientId,
            )
            .order(
                "created_at",
                {
                    ascending: true,
                },
            )
            .limit(1)
            .maybeSingle();

        if (existingAgentError) {
            throw new AppError(
                existingAgentError.message,
                500,
            );
        }


        let agent: unknown;


        /*
         * Update existing agent.
         */

        if (existingAgent) {
            const {
                data,
                error,
            } = await supabase
                .from("agents")
                .update({
                    agent_name: `${companyName} AI Receptionist`,

                    provider:
                        existingAgent.provider ||
                        "dify",

                    version:
                        existingAgent.version ||
                        "1.0.0",

                    status:
                        existingAgent.status ||
                        "draft",

                    updated_at:
                        new Date().toISOString(),
                })
                .eq(
                    "id",
                    existingAgent.id,
                )
                .eq(
                    "client_id",
                    clientId,
                )
                .select()
                .single();

            if (error) {
                throw new AppError(
                    error.message,
                    500,
                );
            }

            agent = data;
        }


        /*
         * Create new agent.
         */

        else {
            const {
                data,
                error,
            } = await supabase
                .from("agents")
                .insert({
                    client_id:
                        clientId,

                    agent_name:
                        `${companyName} AI Receptionist`,

                    provider:
                        "dify",

                    project_id:
                        null,

                    version:
                        "1.0.0",

                    status:
                        "draft",

                    public_slug:
                        null,

                    dify_app_id:
                        null,
                })
                .select()
                .single();

            if (error) {
                console.error(
                    "AGENT CREATION ERROR",
                    error,
                );

                throw new AppError(
                    error.message,
                    500,
                );
            }

            agent = data;
        }


        /*
         * ---------------------------------------------------------
         * 9. AGENT SETTINGS
         *
         * The table we just created:
         *
         * agent_settings
         * ├── id
         * ├── client_id
         * ├── configuration
         * ├── created_at
         * └── updated_at
         *
         * All the detailed onboarding configuration goes here.
         * ---------------------------------------------------------
         */

        const configuration = {
            country:
                text(
                    payload.country,
                ),

            state:
                text(
                    payload.state,
                ),

            city:
                text(
                    payload.city,
                ),

            address:
                text(
                    payload.address,
                ),

            receptionist_types:
                payload.receptionistType ??
                [],

            launch_date:
                text(
                    payload.launchDate,
                ),

            urgent:
                text(
                    payload.urgent,
                ),

            calendar:
                text(
                    payload.calendar,
                ),

            lead_storage:
                text(
                    payload.leadStorage,
                ),

            crm_choice:
                text(
                    payload.crmChoice ===
                        "Other"
                        ? payload.crmOther
                        : payload.crmChoice,
                ),

            faqs:
                text(
                    payload.faqs,
                ),

            greeting:
                text(
                    payload.greeting,
                ),

            languages:
                text(
                    payload.languages,
                ),

            tone:
                text(
                    payload.tone,
                ),

            transfer_human:
                text(
                    payload.transferHuman,
                ),

            staff_name:
                text(
                    payload.staffName,
                ),

            staff_contact:
                text(
                    payload.staffContact,
                ),

            notifications:
                payload.notify ?? [],

            additional_notes:
                text(
                    payload.additionalNotes,
                ),

            raw_working_hours:
                text(
                    payload.workingHours,
                ),

            timezone,

            opening_time:
                hours.opening_time,

            closing_time:
                hours.closing_time,

            working_days:
                workingDays,

            language,

            system_prompt:
                prompt,
        };


        const {
            data: agentSettings,
            error: agentSettingsError,
        } = await supabase
            .from("agent_settings")
            .upsert(
                {
                    client_id:
                        clientId,

                    configuration,

                    updated_at:
                        new Date().toISOString(),
                },
                {
                    onConflict:
                        "client_id",
                },
            )
            .select()
            .single();

        if (
            agentSettingsError
        ) {
            console.error(
                "AGENT SETTINGS ERROR",
                agentSettingsError,
            );

            throw new AppError(
                agentSettingsError.message,
                500,
            );
        }


        /*
         * ---------------------------------------------------------
         * 10. GOOGLE REQUIREMENT
         * ---------------------------------------------------------
         *
         * We DO NOT create a fake google_connections row here.
         *
         * The customer must actually complete OAuth first.
         */

        const googleRequired =
            text(
                payload.calendar,
            ) ===
                "Google Calendar" ||
            text(
                payload.leadStorage,
            ) ===
                "Google Sheets";


        /*
         * OAuth URL is intentionally null here.
         *
         * The existing Google OAuth flow should generate the
         * authorization URL using the client_id/setup context.
         */

        const googleAuthorizationUrl =
            null;


        /*
         * ---------------------------------------------------------
         * 11. ONLY NOW MARK CLIENT CONFIGURED
         * ---------------------------------------------------------
         */

        const {
            data: finalClient,
            error: finalClientError,
        } = await supabase
            .from("clients")
            .update({
                onboarding_status:
                    "configured",

                updated_at:
                    new Date().toISOString(),
            })
            .eq(
                "id",
                clientId,
            )
            .select(
                "id,onboarding_status",
            )
            .single();

        if (
            finalClientError ||
            !finalClient
        ) {
            throw new AppError(
                finalClientError?.message ||
                    "Unable to finalize onboarding.",
                500,
            );
        }


        /*
         * ---------------------------------------------------------
         * 12. RETURN COMPLETE RESULT
         * ---------------------------------------------------------
         */

        return {
            client_id:
                clientId,

            onboarding_status:
                "configured",

            business_settings:
                businessSettings,

            services:
                services ?? [],

            agent,

            google_required:
                googleRequired,

            google_authorization_url:
                googleAuthorizationUrl,
        };
    }
}