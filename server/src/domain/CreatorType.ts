/**
 * Defines persisted identifying properties of all Creator instances such that
 * services can be registered in the database based on their implementation.
 * Metadata is in a service-specific format and should be sufficient to configure the
 * service. In practice this is expected to be canonical compact json.
 */
export type CreatorType = {
  /** Name unique among service implementations. */
  getName: () => string;
  /** Serialised configuration parameters for the service, if the creator is a service */
  getMetadata: () => string | undefined;
  /** Returns true iff using the service implementation incurs no monetary cost */
  free: () => boolean;
}