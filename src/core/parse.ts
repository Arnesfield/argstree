import { toArg } from '../lib/arg.js';
import { Node, ResolvedAlias } from '../lib/node.js';
import { isOption } from '../utils/arg.utils.js';
import { display } from '../utils/display.utils.js';
import { error } from '../utils/error.utils.js';
import { Node as INode, ParseOptions } from './core.types.js';
import { ParseError } from './error.js';
import { NormalizeOptions, normalizer } from './options.js';

export function parse(
  args: readonly string[],
  options: ParseOptions = {}
): INode {
  const normalize = normalizer();
  const root = new Node(normalize({ src: options }));
  let parent = root,
    child: Node | null | undefined;

  function setAlias(aliases: ResolvedAlias[], value?: string | null) {
    // assignable arg --option: initial 1, 2
    // alias -a: --option=3, 4, 5
    // scenario: -a=6

    // convert aliases to options
    // make sure the last option is assignable
    const hasValue = value != null;
    const lastArg = toArg(aliases[aliases.length - 1].args[0]);
    const lastParsed = parent.parse(lastArg, { hasValue });
    // skip if assiging a value to alias but no parsed last options
    if (hasValue && !lastParsed) {
      return;
    }

    const items = aliases.map((alias, index) => {
      const last = index >= aliases.length - 1;
      const arg = last && lastParsed ? lastArg : toArg(alias.args[0]);
      // no need to check assignable here since
      // we only need to check that for the last alias arg
      const item = last && lastParsed ? lastParsed : parent.parse(arg);

      if (!item) {
        const name = display(parent.data);
        error(
          parent.data,
          ParseError.UNRECOGNIZED_ARGUMENT_ERROR,
          (name ? name + 'does not recognize the' : 'Unrecognized') +
            ` argument '${arg.raw}' from alias: ${alias.name}`
        );
      }

      item.alias = alias.name;
      item.args.push(...alias.args.slice(1));
      // add value to the last item (assume last item is assignable)
      last && hasValue && item.args.push(value);
      return item;
    });
    set(items);
  }

  function set(items: NormalizeOptions[]) {
    // validate existing child then make new child
    child?.done();

    let next: Node | undefined;
    const children = items.map(item => {
      // make new child and save values
      // probably don't need to validate now since it will be
      // validated when changing child node or at the end of parse
      parent.children.push((child = new Node(normalize(item), parent.strict)));

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
      const name = display(parent.data);
      error(
        parent.data,
        ParseError.UNRECOGNIZED_ARGUMENT_ERROR,
        (name ? name + 'does not recognize the' : 'Unrecognized') +
          ` option: ${raw}`
      );
    }
    node.args.push(raw);
  }

  // create copy of args to avoid external mutation
  for (const raw of args.slice()) {
    const arg = toArg(raw);
    const hasValue = arg.value != null;
    let parsed, aliases, split;

    // immediately treat as value if the current node
    // cannot actually create children
    if (!parent.options.fertile) {
      setValue(raw);
    }

    // parse options from options.args only
    else if ((parsed = parent.parse(arg, { exact: true }))) {
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
    } else if (hasValue && (aliases = parent.alias([arg.key]))) {
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
      // you would think it might be ideal to stop parent.split()
      // when it finds at least 1 remainder, but we'll need to display
      // the list of remainders for the error message anyway,
      // so it's probably ok
      setAlias(split.list);
    } else if (
      hasValue &&
      (split = parent.split(arg.key)) &&
      split.remainder.length === 0
    ) {
      setAlias(split.list, arg.value);
    } else if ((parsed = parent.handle(arg))) {
      set([{ raw, key: raw, src: parsed }]);
    }

    // split can be unset by the 2nd parent.split() call
    // which is ok since it would be weird to show remainders from raw
    // also assume split.remainder has values
    else if (split) {
      const name = display(parent.data);
      error(
        parent.data,
        ParseError.UNRECOGNIZED_ALIAS_ERROR,
        (name ? name + 'does not recognize the' : 'Unrecognized') +
          ' alias' +
          (split.remainder.length === 1 ? '' : 'es') +
          ': -' +
          split.items
            .map(item => (item.remainder ? `(${item.value})` : item.value))
            .join('')
      );
    }

    // treat as value
    else {
      setValue(raw);
    }
  }

  // finally, make sure to validate the rest of the nodes
  child?.done();
  parent.done();
  return root.tree(null, 0);
}
