import { ParseError } from '../core/error.js';
import { Config } from '../schema/schema.types.js';
import { Node as INode } from '../types/node.types.js';
import { isOption } from '../utils/arg.js';
import { display } from '../utils/display.js';
import { toArg } from './arg.js';
import { Node, NodeOptions, NodeSplit } from './node.js';
import { normalize, NormalizedOptions } from './normalize.js';

// NOTE: internal

export function parse(args: readonly string[], cfg: Config): INode {
  // keep track of and reuse existing normalized options
  const map = new WeakMap<Config, NormalizedOptions>();
  function node(opts: NodeOptions, dstrict?: boolean) {
    let nOpts;
    (nOpts = map.get(opts.cfg)) || map.set(opts.cfg, (nOpts = normalize(opts)));
    return new Node(nOpts, opts, dstrict);
  }

  const root = node({ cfg });
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
    if (hasValue && !lastParsed) return;

    // at this point, if a value is assigned, lastParsed would always be set
    // otherwise, lastParsed was parsed normally like the loop below.
    // this ensures that the options.handler call is not called twice

    const items = aliases.flatMap((alias, index) => {
      const last = index >= aliases.length - 1;
      const arg = last ? lastArg : toArg(alias.args[0], alias.name);
      // no need to check assignable here since
      // we only need to check that for the last alias arg
      const parsed = last ? lastParsed : parent.parse(arg);

      if (!parsed) {
        unrecognized(`argument from alias '${alias.name}': ${arg.raw}`);
      }

      // assume parsed always contains at least 1 item
      // save alias args to the last item only
      const item = parsed[parsed.length - 1];
      item.args.push(...alias.args.slice(1));
      // add value to the last item (assume last item is assignable)
      last && hasValue && item.args.push(value);

      return parsed;
    });
    set(items);

    return true;
  }

  function set(items: NodeOptions[]) {
    // mark existing child as parsed then make new children
    child?.done();

    let next: Node | undefined;
    const children = items.map(item => {
      // create child nodes from options that are marked as parsed later
      parent.children.push((child = node(item, parent.dstrict)));

      // use child as next parent if it's not a leaf node
      return child.opts.leaf ? child : (next = child);
    });

    // mark all children as parsed except next parent or latest child
    const except = next || child;
    for (const c of children) {
      c !== except && c.done();
    }

    // if this child has args, switch it for next parse iteration
    if (next) {
      // since we're removing reference to parent, mark it as parsed
      parent.done();
      parent = next;
      child = null;
    }
  }

  function setValue(raw: string) {
    // check if child can read one more argument
    // fallback to parent if child cannot accept anymore args
    const curr =
      child &&
      (child.opts.range.maxRead == null ||
        child.opts.range.maxRead > child.data.args.length)
        ? child
        : parent;
    // strict mode: throw error if arg is an option-like
    curr.strict && isOption(raw) && unrecognized(`option: ${raw}`);
    curr.data.args.push(raw);
  }

  for (const raw of args) {
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
      set(parsed);
    }

    // at this point, if there are no parsed options, arg can be:
    // - an exact alias
    // - a merged alias
    // - options from handler
    // - a value (or, if in strict mode, an unknown option-like)
    // for this case, handle exact alias
    else if (raw in parent.opts.aliases && setAlias(parent.alias([raw]))) {
      // setAlias was successful, do nothing and go to next iteration
    } else if (
      hasValue &&
      arg.key in parent.opts.aliases &&
      setAlias(parent.alias([arg.key]), arg.value)
    ) {
      // setAlias was successful, do nothing and go to next iteration
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

    // split cases:
    // - raw no equal sign, same key (-abc, -abc, null)
    // - raw equal sign, different key no equal sign (-abc=1, -abc, 1)
    // - raw equal sign, different key equal sign (-abc=a=1, -abc=a, 1)

    // if safe alias (no alias equal signs),
    // then there is no reason to split raw as raw could contain an equal sign
    // if unsafe, split raw
    // if unsafe, split arg.key only if it does not match raw (hasValue)
    else if (
      !parent.opts.safeAlias &&
      (split = parent.split(raw)) &&
      split.remainder.length === 0 &&
      setAlias(split.list)
    ) {
      // you would think it might be ideal to stop parent.split()
      // when it finds at least 1 remainder, but we'll need to display
      // the list of remainders for the error message anyway,
      // so this is probably ok.
      // also set alias was successful, do nothing and go to next iteration
    } else if (
      (parent.opts.safeAlias || hasValue) &&
      (split = parent.split(arg.key)) &&
      split.remainder.length === 0 &&
      setAlias(split.list, arg.value)
    ) {
      // setAlias was successful, do nothing and go to next iteration
    }

    // parse options using handler
    else if ((parsed = parent.handle(arg))) {
      // use arg.key as key here despite not using arg.value
      // assume that the consumer handles arg.value manually
      set(parsed);
    }

    // split can be unset by the 2nd parent.split() call
    // which is ok since it would be weird to show remainders from raw
    else if (split && split.remainder.length > 0) {
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

  // finally, mark nodes as parsed then build tree and validate nodes
  child?.done();
  parent.done();
  return root.tree(null, 0);
}
