/**
 * Element of the system that could be replaced by an alternative.
 */
interface Module {
  current: string;
  all: string[];
  isFree: boolean;
}

/**
 * {@link Module} that has user-choosable options.
 */
interface ModuleWithOptions<T> extends Module {
  options: T[];
  currentOption: T;
}

export {ModuleWithOptions};
export {Module};