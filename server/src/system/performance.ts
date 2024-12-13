import {NamedInvoker} from "./fp";

/**
 * Asynchronous invocation that collects and logs duration.
 * @param label identifier
 * @param thunk function to call
 */
export const timed: NamedInvoker = async <T>(label: string, thunk: () => Promise<T>): Promise<T> => {
  let start = new Date().getTime();
  console.log(`starting ${label}`);
  try {
    return await thunk();
  } finally {
    console.log(`finished ${label} : ${new Date().getTime() - start} ms`);
  }
};