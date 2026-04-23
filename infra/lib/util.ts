import { createHash, } from 'node:crypto';
import type { Config, } from './config.js';


const toKebabCase = (str: string,): string => str.
  replace(/(?<lower>[a-z0-9])(?<upper>[A-Z])/gu, '$<lower>-$<upper>',).
  replace(/(?<upper1>[A-Z])(?<upper2>[A-Z][a-z])/gu, '$<upper1>-$<upper2>',).
  toLowerCase();


const rsuffix = ({ env, }: Config, length = 12,): string => {
  const input = `${env.account}|${env.region}`;
  return `-${base26(createHash('sha256',).update(input,).digest().subarray(0, length,), 10,)}`;
};
const base26 = (bytes: Uint8Array, length: number,): string => {
  const alphabets = 'abcdefghijklmnopqrstuvwxyz';

  let value = 0n;
  for (const byte of bytes) {
    value *= 256n;
    value += BigInt(byte,);
  }

  const base = BigInt(alphabets.length,);
  const chars = new Array<string>(length,);
  for (let index = 0; index < length; index += 1) {
    const remainder = Number(value % base,);
    chars[length - 1 - index] = remainder < alphabets.length ? alphabets.charAt(remainder,) : alphabets.charAt(0,);
    value /= base;
  }
  return chars.join('',);
};


export { rsuffix, toKebabCase, };
