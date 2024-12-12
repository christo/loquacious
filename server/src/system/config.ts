import {exec} from 'child_process';
import * as os from 'os';
import {promisify} from 'util';

type Predicate = () => boolean;
type AsyncPredicate = () => Promise<boolean>;

const always = () => true;

const isMac = () => os.platform() === 'darwin';

const isLinux = () => os.platform() === 'linux';

const isWindows = () => os.platform() === 'win32';

const not = (p: Predicate) => () => !p();

const hasEnv = (param: string) => () => process.env[param] !== undefined && process.env[param].length > 0;

const execAsync = promisify(exec);

/**
 * Retrieves the current Git commit SHA1 hash of the present repository.
 * @param cwd - Optional directory path where the Git command should be executed.
 * @returns A promise that resolves to the current commit SHA1 hash as a string.
 */
async function getCurrentCommitHash(cwd?: string): Promise<string> {
  // TODO make production implementation that has stored commit hash and uses explicit version metdata
  try {
    const {stdout} = await execAsync('git rev-parse HEAD', {cwd});
    return stdout.trim();
  } catch (error) {
    console.error('Error getting current commit hash:', error);
    return Promise.reject(error);
  }
}

/**
 * Indicates the service is available, working and dependencies are met.
 * TODO: maybe add stuff like requiresInternet, requiresExternalProcess etc. to help specify intermittent failure
 *    handling, interpretation and fallback
 */
type CanRun = {
  canRun: Predicate;
}


export {
  getCurrentCommitHash,
  CanRun,
  isLinux,
  isMac,
  isWindows,
  not,
  always,
  hasEnv,
  type Predicate
};