import { ParseError } from '../errors.js';

/** Growable output buffer. */
export interface Writer {
  bytes: Uint8Array;
  length: number;
}

export const createWriter = (): Writer => ({ bytes: new Uint8Array(256), length: 0 });

function reserve(writer: Writer, extra: number): void {
  if (writer.length + extra <= writer.bytes.length) {
    return;
  }

  const grown = new Uint8Array(Math.max(writer.bytes.length * 2, writer.length + extra));

  grown.set(writer.bytes.subarray(0, writer.length));
  writer.bytes = grown;
}

export function writeByte(writer: Writer, value: number): void {
  reserve(writer, 1);
  writer.bytes[writer.length++] = value;
}

export function writeBytes(writer: Writer, data: Uint8Array): void {
  reserve(writer, data.length);
  writer.bytes.set(data, writer.length);
  writer.length += data.length;
}

/** Unsigned LEB128: seven bits per byte, low group first. */
export function writeVarint(writer: Writer, value: number): void {
  let rest = value;

  while (rest >= 0x80) {
    writeByte(writer, (rest % 0x80) | 0x80);
    rest = Math.floor(rest / 0x80);
  }

  writeByte(writer, rest);
}

export function writeFloat64(writer: Writer, value: number): void {
  reserve(writer, 8);
  new DataView(writer.bytes.buffer).setFloat64(writer.length, value, true);
  writer.length += 8;
}

export const finish = (writer: Writer): Uint8Array => writer.bytes.slice(0, writer.length);

/** Cursor over input bytes. */
export interface Reader {
  readonly bytes: Uint8Array;
  offset: number;
}

export const createReader = (bytes: Uint8Array): Reader => ({ bytes, offset: 0 });

export const remaining = (reader: Reader): number => reader.bytes.length - reader.offset;

const truncated = (): ParseError => new ParseError('Unexpected end of binary graph');

export function readByte(reader: Reader): number {
  if (remaining(reader) < 1) {
    throw truncated();
  }

  return reader.bytes[reader.offset++]!;
}

export function readBytes(reader: Reader, count: number): Uint8Array {
  if (remaining(reader) < count) {
    throw truncated();
  }

  reader.offset += count;

  return reader.bytes.subarray(reader.offset - count, reader.offset);
}

const MAX_VARINT_BYTES = 6;

/** Unsigned LEB128 of at most {@link MAX_VARINT_BYTES} bytes (values below $2^{42}$). */
export function readVarint(reader: Reader): number {
  let value = 0;
  let factor = 1;

  for (let index = 0; index < MAX_VARINT_BYTES; index++) {
    const byte = readByte(reader);

    value += (byte % 0x80) * factor;

    if (byte < 0x80) {
      return value;
    }

    factor *= 0x80;
  }

  throw new ParseError('Number too large in binary graph');
}

export function readFloat64(reader: Reader): number {
  const raw = readBytes(reader, 8);

  return new DataView(raw.buffer, raw.byteOffset, 8).getFloat64(0, true);
}
