import { Transform } from 'class-transformer';
import { Matches } from 'class-validator';

/** Trims strings before validation. Other values pass through, so @IsString() can still reject them. */
export function Trim() {
  return Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value));
}

/** Like Trim(), but a blank string becomes null, so "no value" is always stored the same way. */
export function TrimToNull() {
  return Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || null : value));
}

/** PostgreSQL cannot store NUL and Prisma rejects lone surrogates, so without this both end in a 500. */
export function IsPlainText() {
  return Matches(/^[^\p{Cc}\p{Cs}]*$/u, { message: '$property must not contain control characters or invalid Unicode' });
}
