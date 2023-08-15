export function assertOwnProperty<T, K extends keyof T>(
  object: T,
  property: K
): boolean {
  return (
    typeof object === 'object' && (object as Object).hasOwnProperty(property)
  );
}
