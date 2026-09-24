/** Every IANA timezone the runtime knows, with UTC first. */
export function supportedTimeZones(): string[] {
  const zones = Intl.supportedValuesOf("timeZone");
  return ["UTC", ...zones.filter((zone) => zone !== "UTC")];
}
