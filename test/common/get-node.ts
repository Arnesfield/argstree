import command, { Node } from '../../src';

/**
 * Common node test data for `getAncestors` and `getDescendants`.
 * @returns The parsed root node.
 */
export function getNode(): Node {
  const cmd = command();
  cmd.option('--foo');
  cmd.option('--bar');
  cmd.command('foo', {
    init(foo) {
      foo.command('baz');
    }
  });
  cmd.command('baz', {
    init(baz) {
      baz.option('--foo');
      baz.option('--bar');
      baz.command('foo', {
        init(baz) {
          baz.option('--foo');
          baz.option('--bar');
        }
      });
    }
  });

  const args = ([] as string[]).concat(
    '1',
    ['--foo', '2', '3'],
    '--bar',
    ['baz', '1'],
    ['--foo', 'baz'],
    '--bar',
    ['foo', '1'],
    ['--bar', '1', '2']
  );

  return cmd.parse(args);
}
