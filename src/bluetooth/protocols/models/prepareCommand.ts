export function prepareCommand(command: string): Buffer {
  return Buffer.from(`${command}\n`);
}
