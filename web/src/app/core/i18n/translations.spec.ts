import en from './en.json';
import es from './es.json';

function keyPaths(translation: object, prefix = ''): string[] {
  return Object.entries(translation).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null
      ? keyPaths(value, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

describe('translations', () => {
  it('should have the same keys in every language', () => {
    expect(keyPaths(es).sort()).toEqual(keyPaths(en).sort());
  });

  it('should have no empty texts', () => {
    const texts = [en, es].flatMap((translation) =>
      keyPaths(translation).map((path) =>
        path
          .split('.')
          .reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], translation),
      ),
    );
    expect(texts.every((text) => typeof text === 'string' && text.trim() !== '')).toBe(true);
  });
});
