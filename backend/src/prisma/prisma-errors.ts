import { Prisma } from '@prisma/client';

/** Prisma error codes that the API turns into HTTP errors. */
export const PrismaErrorCode = {
  UniqueConstraintFailed: 'P2002',
  RecordNotFound: 'P2025',
} as const;

type PrismaErrorCode = (typeof PrismaErrorCode)[keyof typeof PrismaErrorCode];

export function isPrismaError(error: unknown, code: PrismaErrorCode): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}
