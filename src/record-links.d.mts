export type RecordLink = Readonly<{ source: string; target: string; label?: string }>;
export function createRecordRelation(input: {
  sources: Iterable<string>; targets: Iterable<string>; links: Iterable<RecordLink>;
}): Readonly<{ from(source: string): readonly RecordLink[]; to(target: string): readonly RecordLink[] }>;

export type RecordDestination = { view: string; record?: string; group?: string };
export function createRecordLinkCodec(input: {
  fragment: string; views: Iterable<{ view: string; record?: string; group?: string; requireGroup?: boolean }>;
}): Readonly<{ href(destination: RecordDestination): string; parse(hash: string): RecordDestination | null }>;
