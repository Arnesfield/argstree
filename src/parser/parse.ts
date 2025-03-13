import { Node as INode } from '../core/core.types.js';
import { ParseError } from '../core/error.js';
import { Config } from '../schema/schema.types.js';
import { isOption } from '../utils/arg.utils.js';
import { display } from '../utils/display.utils.js';
import { toArg } from './arg.js';
import { Node, NodeOptions, NodeSplit } from './node.js';
import { normalize, NormalizedOptions } from './normalize.js';

// NOTE: internal

export function parse(args: readonly string[], options: Config): INode {
  // keep track of and reuse existing normalized options
  const map = new WeakMap<Config, NormalizedOptions>();
  function n(config: Config) {
    let opts;
    return (
      map.get(config) || (map.set(config, (opts = normalize(config))), opts)
    );
  }

  const root = new Node(n(options), {});
  let parent = root,
    child: Node | null | undefined;

  function unrecognized(
    msg: string,
    reason = ParseError.UNRECOGNIZED_ARGUMENT_ERROR
  ): never {
    const name = display(parent.data);
    throw new ParseError(
      reason,
      (name ? name + 'does not recognize the ' : 'Unrecognized ') + msg,
      parent.data
    );
  }

  function setAlias(aliases: NodeSplit['list'], value?: string | null) {
    // assignable arg --option: initial 1, 2
    // alias -a: --option=3, 4, 5
    // scenario: -a=6

    // convert aliases to options
    // make sure the last option is assignable
    const hasValue = value != null;
    const lastAlias = aliases[aliases.length - 1];
    const lastArg = toArg(lastAlias.args[0], lastAlias.name);
    const lastParsed = parent.parse(lastArg, { hasValue });

    // skip if assiging a value to alias but no parsed last options
    if (hasValue && !lastParsed) {
      return;
    }

    // at this point, if a value is assigned, lastParsed would always be set
    // otherwise, lastParsed was parsed normally like the loop below.
    // this ensures that the options.handler call is not called twice

    const items = aliases.map((alias, index) => {
      const last = index >= aliases.length - 1;
      const arg = last ? lastArg : toArg(alias.args[0], alias.name);
      // no need to check assignable here since
      // we only need to check that for the last alias arg
      const item = last ? lastParsed : parent.parse(arg);

      if (!item) {
        unrecognized(`argument from alias '${alias.name}': ${arg.raw}`);
      }

      item.alias = alias.name;
      item.args.push(...alias.args.slice(1));
      // add value to the last item (assume last item is assignable)
      last && hasValue && item.args.push(value);
      return item;
    });
    set(items);
  }

  function set(items: NodeOptions[]) {
    // validate existing child then make new child
    child?.done();

    let next: Node | undefined;
    const children = items.map(item => {
      // create child nodes from options that are validated later
      // since we want to validate them in order except the next node
      child = new Node(n(item.cfg), item, parent.dstrict);
      parent.children.push(child);

      // use child as next parent if it's not a leaf node
      return child.opts.leaf ? child : (next = child);
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
    // check if child can read one more argument
    // fallback to parent if child cannot accept anymore args
    const node =
      child &&
      (child.opts.range.maxRead == null ||
        child.opts.range.maxRead > child.data.args.length)
        ? child
        : parent;
    // strict mode: throw error if arg is an option-like
    node.strict && isOption(raw) && unrecognized(`option: ${raw}`);
    node.data.args.push(raw);
  }

  // create copy of args to avoid external mutation
  for (const raw of args.slice()) {
    // immediately treat as value if the current node
    // cannot actually create children
    if (!parent.opts.fertile) {
      setValue(raw);
      continue;
    }

    // assume arg.raw and raw are the same
    const arg = toArg(raw, null);
    const hasValue = arg.value != null;
    let parsed, split;

    // parse options from options.args only
    if ((parsed = parent.parse(arg, { exact: true }))) {
      set([parsed]);
    }

    // at this point, if there are no parsed options, arg can be:
    // - an exact alias
    // - a merged alias
    // - options from handler
    // - a value (or, if in strict mode, an unknown option-like)
    // for this case, handle exact alias
    else if (raw in parent.opts.aliases) {
      setAlias(parent.alias([raw]));
    } else if (hasValue && arg.key in parent.opts.aliases) {
      setAlias(parent.alias([arg.key]), arg.value);
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
      // so this is probably ok
      setAlias(split.list);
    } else if (
      hasValue &&
      (split = parent.split(arg.key)) &&
      split.remainder.length === 0
    ) {
      setAlias(split.list, arg.value);
    }

    // parse options using handler
    else if ((parsed = parent.handle(arg))) {
      // use arg.key as key here despite not using arg.value
      // assume that the consumer handles arg.value manually
      set([{ raw, key: arg.key, cfg: parsed }]);
    }

    // split can be unset by the 2nd parent.split() call
    // which is ok since it would be weird to show remainders from raw
    // also assume split.remainder has values
    else if (split) {
      unrecognized(
        'alias' +
          (split.remainder.length === 1 ? '' : 'es') +
          ': -' +
          split.items
            .map(item => (item.remainder ? `(${item.value})` : item.value))
            .join(''),
        ParseError.UNRECOGNIZED_ALIAS_ERROR
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
