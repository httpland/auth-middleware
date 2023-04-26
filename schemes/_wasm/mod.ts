import {
  instantiate as instantiateWasm,
} from "./lib/auth_digest.generated.mjs";

export const digestAlgorithms = [
  "MD5",
  "SHA-512-256",
] as const;

export type DigestAlgorithm = typeof digestAlgorithms[number];

export const Crypto = {
  subtle: {
    digestSync: (algorithm: DigestAlgorithm, data: Uint8Array): Uint8Array => {
      const { digest } = instantiateWasm();

      return digest(algorithm, data, undefined);
    },
  },
};
