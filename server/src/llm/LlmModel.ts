class LlmModel {
  /**
   * Unique identifier used by external APIs.
   */
  id: string;

  /**
   * Seconds since Unix epoch when model was created.
   */
  created: number;

  /**
   * Fixed type.
   */
  object: 'model';

  /**
   * Owning organisation.
   */
  owned_by: string;
}

export {LlmModel};