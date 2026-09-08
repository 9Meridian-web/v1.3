import "express-serve-static-core";

import { JwtPayload } from "../helpers/jwt";

declare module "express-serve-static-core" {

    interface Request {

        user: JwtPayload;

    }

}

export {};