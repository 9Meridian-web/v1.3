import { Request } from "express";

export class RequestHelper {
    static clientId: any;

    static getParam(

        req: Request,

        key: string

    ): string {

        const value = req.params[key];

        if (!value) {

            throw new Error(

                `Missing route parameter: ${key}`

            );

        }

        return String(value);

    }

}