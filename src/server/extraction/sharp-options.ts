import "server-only";

/**
 * Options for every image Kosha opens. A small file can claim to be a gigantic picture
 * (a "decompression bomb"); refusing anything over 50 megapixels stops one upload from
 * using gigabytes of memory. Real phone photos are 12 to 50 MP, scaled down on arrival.
 */
export const SHARP_INPUT = { failOn: "none", limitInputPixels: 50_000_000 } as const;
