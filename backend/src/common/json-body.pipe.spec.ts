import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { JsonBodyPipe } from './json-body.pipe';

const body: ArgumentMetadata = { type: 'body' };

// An object nested this many levels deep, for example 2 gives {"a": {"a": 1}}.
function nested(levels: number): unknown {
  let value: unknown = 1;
  for (let i = 0; i < levels; i++) value = { a: value };
  return value;
}

describe('JsonBodyPipe', () => {
  const pipe = new JsonBodyPipe();

  it('lets a normal object through unchanged', () => {
    const value = { serial: 'sensor-01', name: 'Sensor' };
    expect(pipe.transform(value, body)).toBe(value);
  });

  it('rejects a top-level array', () => {
    expect(() => pipe.transform([{ serial: 'sensor-01' }], body)).toThrow(new BadRequestException('Request body must be a JSON object'));
  });

  it('allows 10 levels of nesting and rejects 11', () => {
    expect(() => pipe.transform(nested(10), body)).not.toThrow();
    expect(() => pipe.transform(nested(11), body)).toThrow('Request body is nested deeper than 10 levels');
  });

  it('checks a very deep body without overflowing the stack itself', () => {
    expect(() => pipe.transform(nested(100_000), body)).toThrow(BadRequestException);
  });

  it('leaves query strings and route params alone', () => {
    expect(pipe.transform(['a', 'b'], { type: 'query' })).toEqual(['a', 'b']);
    expect(pipe.transform(nested(20), { type: 'param' })).toEqual(nested(20));
  });
});
