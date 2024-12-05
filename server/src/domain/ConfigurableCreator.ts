/**
 * API implemented by all services that produce assets so they can configure themselves the same way
 * as the db record for a previous invocation.
 */
export interface ConfigurableCreator {

  /**
   * Configure self to state defined by metadata previously provided by
   * the corresponding implementation of {@link CreatorType#getMetadata} or
   * explode if not possible.
   * @param metadata configuration.
   */
  configure(metadata: string): Promise<void>;
}