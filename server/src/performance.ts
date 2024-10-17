export async function timed<T>(mesg: string, thunk: () => Promise<T>): Promise<T> {
  let start = new Date().getTime();
  console.log(`starting ${mesg}`);
  try {
    return thunk();
  } finally {
    console.log(`finished ${mesg} : ${new Date().getTime() - start} ms`);
  }
}