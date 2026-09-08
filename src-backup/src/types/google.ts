export interface GoogleConnection {
    id?: string;

    client_id: string;

    google_email?: string;

    refresh_token?: string;

    spreadsheet_id?: string;

    spreadsheet_name?: string;

    calendar_id?: string;

    connected?: boolean;

    created_at?: string;

    updated_at?: string;
}