import { NextFunction, Request, Response } from "express";
import { ObjectSchema } from "joi";
import { ValidationError } from "../shared/error";

export const Validate = (schema: ObjectSchema, target: "body" | "query") => {
  return (req: Request, res: Response, next: NextFunction) => {
    const body = req[target];
    const { value, error } = schema.validate(body, {
      abortEarly: false,
      stripUnknown: false,
      convert: true,
    });

    if (error) {
      const details = error.details.map((d) => ({
        field: d.path.join("."),
        message: d.message.replace(/['"]/g, ""),
      }));
      return next(new ValidationError("Validation Failed", details));
    }

    if (target === "query") {
      Object.assign(req.query, value);
    } else {
      req[target] = value;
    }

    next();
  };
};
