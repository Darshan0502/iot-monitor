import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

const MAX_DEPTH = 10;

// Runs before ValidationPipe. A top-level array slips past DTOs that have no required fields and reaches
// Prisma, and deeply nested JSON overflows the stack inside ValidationPipe. Both used to end in a 500.
@Injectable()
export class JsonBodyPipe implements PipeTransform {
  transform(value: unknown, { type }: ArgumentMetadata) {
    if (type !== 'body') return value;
    if (Array.isArray(value)) throw new BadRequestException('Request body must be a JSON object');
    if (depthOf(value) > MAX_DEPTH) throw new BadRequestException(`Request body is nested deeper than ${MAX_DEPTH} levels`);
    return value;
  }
}

// A loop instead of recursion, so the check itself cannot overflow the stack.
function depthOf(root: unknown): number {
  let max = 0;
  const stack: Array<[unknown, number]> = [[root, 0]];
  while (stack.length > 0) {
    const [value, depth] = stack.pop()!;
    if (value === null || typeof value !== 'object') continue;
    max = Math.max(max, depth + 1);
    if (max > MAX_DEPTH) break;
    for (const child of Object.values(value)) stack.push([child, depth + 1]);
  }
  return max;
}
