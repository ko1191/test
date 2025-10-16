import type { ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError';

const formatZodIssues = (error: ZodError) =>
  error.issues.map((issue) => ({
    code: issue.code,
    message: issue.message,
    path: issue.path
  }));

export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof ZodError) {
    return res.status(400).json({
      error: {
        message: 'Validation failed',
        issues: formatZodIssues(error)
      }
    });
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: {
        message: error.message,
        ...(error.details ? { details: error.details } : {})
      }
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: {
          message: 'Resource not found'
        }
      });
    }

    if (error.code === 'P2002') {
      const target = error.meta?.target as string[] | undefined;
      return res.status(409).json({
        error: {
          message: 'A record with the provided unique fields already exists.',
          ...(target ? { details: { target } } : {})
        }
      });
    }

    return res.status(400).json({
      error: {
        message: 'Database request error',
        details: {
          code: error.code
        }
      }
    });
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({
      error: {
        message: 'Database validation error'
      }
    });
  }

  if (
    error instanceof SyntaxError &&
    'status' in error &&
    (error as SyntaxError & { status?: number }).status === 400
  ) {
    return res.status(400).json({
      error: {
        message: 'Invalid JSON payload'
      }
    });
  }

  console.error('Unhandled error encountered', error);

  return res.status(500).json({
    error: {
      message: 'Internal server error'
    }
  });
};
