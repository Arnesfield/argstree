import { isOption } from '../utils/arg.utils.js';
import { Arg, ParseOptions } from './core.types.js';
import { Node, NodeOptions, parseArg, ResolvedAlias } from './node.js';
import { normalizer } from './options.js';

type ParsedNodeOptions = Required<Omit<NodeOptions, 'alias'>> &
  Pick<NodeOptions, 'alias'>;

export function parse(args: readonly string[], options: ParseOptions = {}) {
  const normalize = normalizer();
  const root = new Node({ options: normalize(options) });
  let parent = root,
    child: Node | null | undefined;

  // TODO: update?
  function parseRaw(
    arg: Arg,
    flags: { exact?: boolean; hasValue?: boolean } = {}
  ): ParsedNodeOptions | undefined {
    // scenario: -a=6
    // alias -a: --option=3, 4, 5
    // option --option: initial 1, 2
    // order of args: [options.initial, arg assigned, alias.args, alias assigned]

    let opts,
      name = arg.raw,
      args: string[] = [];

    if ((opts = parent.parseExact(name, flags.hasValue))) {
      // do nothing
    } else if (
      arg.value != null &&
      (opts = parent.parseExact(arg.name, true))
    ) {
      name = arg.name;
      args = [arg.value];
    } else if (!flags.exact) {
      opts = parent.parseHandler(arg);
    }

    if (opts) {
      return { raw: arg.raw, name, args, options: normalize(opts) };
    }
  }

  function setAlias(aliases: ResolvedAlias[], value?: string | null) {
    // assignable arg --option: initial 1, 2
    // alias -a: --option=3, 4, 5
    // scenario: -a=6

    // convert aliases to options
    // make sure the last option is assignable
    const hasValue = value != null;
    const lastArg = parseArg(aliases[aliases.length - 1].args[0]);
    const lastParsed = parseRaw(lastArg, { hasValue });
    // skip if assiging a value to alias but no parsed last options
    if (hasValue && !lastParsed) {
      return;
    }

    const items = aliases.map((alias, index) => {
      const isLast = index >= aliases.length - 1;
      const arg = isLast && lastParsed ? lastArg : parseArg(alias.args[0]);
      // no need to check assignable here since
      // we only need to check that for the last alias arg
      const item = isLast && lastParsed ? lastParsed : parseRaw(arg);

      if (!item) {
        // TODO: error
        throw new Error(
          `Unrecognized argument '${arg.raw}' from alias '${alias.name}'.`
        );
      }

      item.alias = alias.name;
      item.args.push(...alias.args.slice(1));
      if (isLast && hasValue) {
        item.args.push(value);
      }
      return item;
    });
    set(items);
  }

  function set(items: NodeOptions[]) {
    // validate existing child then make new child
    child?.done();

    let next: Node | undefined;
    const children = items.map(item => {
      // make new child and save values
      // probably don't need to validate now since it will be
      // validated when changing child node or at the end of parse
      parent.children.push((child = new Node(item, parent.strict)));

      // if child has args, use this as next child
      return child.options.branch ? (next = child) : child;
    });

    // validate all children except next or latest child
    for (const c of children) {
      c !== (next || child) && c.done();
    }

    // if this child has args, switch it for next parse iteration
    if (next) {
      // since we're removing reference to parent, validate it now
      parent.done();
      parent = next;
      child = null;
    }
  }

  function setValue(raw: string) {
    const node = child?.read() ? child : parent;
    // strict mode: throw error if arg is an option-like
    if (node.strict && isOption(raw)) {
      // TODO: error
      throw new Error(`Unrecognized option: ${raw}`);
      // node.unrecognized(arg);
    }
    node.args.push(raw);
  }

  // create copy of args to avoid external mutation
  for (const raw of args.slice()) {
    const arg = parseArg(raw);
    const hasValue = arg.value != null;
    let parsed, aliases, split;

    // immediately treat as value if the current node
    // cannot actually create children
    if (!parent.options.fertile) {
      setValue(raw);
    }

    // parse options from options.args only
    else if ((parsed = parseRaw(arg, { exact: true }))) {
      set([parsed]);
    }

    // at this point, if there are no parsed options, arg can be:
    // - an exact alias
    // - a merged alias
    // - option/s from handler
    // - a value (or, if in strict mode, an unknown option-like)
    // for this case, handle exact alias
    else if ((aliases = parent.alias([raw]))) {
      setAlias(aliases);
    } else if (hasValue && (aliases = parent.alias([arg.name]))) {
      setAlias(aliases, arg.value);
    }

    // now, arg cannot be an exact alias.
    // try to split raw by aliases
    // if no remainder, resolve split aliases with no value
    // otherwise, split arg.name by aliases if not the same as raw
    // if no remainder, resolve split aliases with arg.value
    // otherwise, parse by handler
    // if has value, use parsed options
    // otherwise, arg must either be a value or an incorrect merged alias
    // if there are split remainders, throw error
    // otherwise, treat as value
    // if value is an option-like with strict mode, throw error
    // otherwise, save value to node.args
    else if ((split = parent.split(raw)) && split.remainder.length === 0) {
      setAlias(split.list);
    } else if (
      hasValue &&
      (split = parent.split(arg.name)) &&
      split.remainder.length === 0
    ) {
      setAlias(split.list, arg.value);
    } else if ((parsed = parent.parseHandler(arg))) {
      set([{ raw, name: raw, options: normalize(parsed) }]);
    }

    // split can be unset by the 2nd parent.split() call
    // which is ok since it would be weird to show remainders from raw
    // also assume split.remainder has values
    else if (split) {
      // TODO: error
      throw new Error(
        'Unrecognized alias' +
          (split.remainder.length === 1 ? '' : 'es') +
          ': ' +
          split.remainder.map(alias => '-' + alias).join(', ')
      );
    }

    // treat as value
    else {
      setValue(raw);
    }
  }

  // TODO: return formatted root node
  function render(node: Node, prefix: string) {
    console.log(
      '%s%s (%s, %s): [%s]',
      prefix,
      node.data.name,
      node.data.raw,
      node.data.alias ?? '?',
      node.args.join(', ')
    );
    for (const child of node.children) {
      render(child, prefix + '. ');
    }
  }
  render(root, '');
}

parse(['-aa', '1', '--arg', '2', '-ba'], {
  aliases: {
    '-b': '--arg'
  },
  args: {
    '--arg': { alias: '-a' }
  },
  handler(arg) {
    console.log('HANDLER', arg);
  }
});

// const commonOpts = { type: 'command' } satisfies Options;
// const opts = {
//   alias: '-c',
//   args: { '--help': {}, common: commonOpts }
// } satisfies Options;
// opts.args['--help'] = opts;

// const args = ['--add', '1', '2', '3', '--save', 'test'];
// // const args = ['-da=3', 'val', 'val2', 'c'];
// console.log('args', args);
// parse(args, {
//   aliases: {
//     '-a': '--add',
//     '-ba': ['--add', 'bar', 'baz'],
//     '-ca': [['--add'], ['--save']],
//     '-da': [
//       ['--add', 'multi', 'bar', 'baz'],
//       ['--save', 'multi', 'foo', 'baz'],
//       ['--save=1', '2']
//     ],
//     a: '--create',
//     b: 'start'
//   },
//   args: {
//     '--add': { assign: false },
//     '--save': {
//       initial: ['-1', '0'],
//       args: {}
//     },
//     test: opts,
//     common: commonOpts,
//     '--test': {
//       alias: ['-t']
//     },
//     '--wow=val': true,
//     abc: true,
//     '--hello': {
//       alias: [
//         ['-H', 'args', 'here'],
//         ['-h2', 'args', 'here']
//       ]
//     }
//   }
// });
