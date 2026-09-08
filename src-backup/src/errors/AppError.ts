/*
|--------------------------------------------------------------------------
| Application Error
|--------------------------------------------------------------------------
*/

export class AppError extends Error {

    /*
    |--------------------------------------------------------------------------
    | Properties
    |--------------------------------------------------------------------------
    */

    public readonly statusCode: number;

    public readonly isOperational: boolean;

    /*
    |--------------------------------------------------------------------------
    | Constructor
    |--------------------------------------------------------------------------
    */

    constructor(

        message: string,

        statusCode: number = 500

    ) {

        super(message);

        this.name = "AppError";

        this.statusCode = statusCode;

        this.isOperational = true;

        Error.captureStackTrace(

            this,

            this.constructor

        );

    }

}