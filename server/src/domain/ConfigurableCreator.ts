/**
 * API implemented by all services that produce assets so they can configure themselves like
 * the db record from some previous invocation.
 */
export interface ConfigurableCreator {

  // TODO probably need to add something to parse and unparse config for a dynamic front-end.

  /**
   * Configure self to state defined by metadata previously provided by
   * the corresponding implementation of {@link CreatorType#getMetadata} or
   * explode if not possible.
   * @param metadata configuration.
   */
  configure(metadata: string): Promise<void>;
}