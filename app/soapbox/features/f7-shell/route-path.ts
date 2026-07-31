const MAX_ROUTE_PATH_LENGTH = 2048;

const hasControlCharacters = (value: string): boolean => (
  Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 0x1f || code === 0x7f;
  })
);

/** Validate a same-origin pathname without query or fragment data. */
export const isSafeRoutePath = (path: unknown): path is string => (
  typeof path === 'string'
  && path.length > 0
  && path.length <= MAX_ROUTE_PATH_LENGTH
  && path.startsWith('/')
  && !path.startsWith('//')
  && !path.includes('\\')
  && !path.includes('?')
  && !path.includes('#')
  && !hasControlCharacters(path)
);
