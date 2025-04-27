import { ParseError } from '../lib/error';
import { Config } from '../schema/schema.types';
import { Node as INode } from '../types/node.types';
import { NonEmptyArray } from '../types/util.types';
import { isOption } from '../utils/arg';
import { cnode } from './cnode';
import { Node, ParsedArg, ParsedNodeOptions } from './node';
import {
  Alias,
  normalize,
  NormalizedOptions,
  NormalizeOptions
} from './normalize';

// NOTE: internal

export function parse(args: readonly string[], cfg: Config): INode {
  // keep track of and reuse existing normalized options
  const map = new WeakMap<Config, NormalizedOptions>();
  function node(opts: NormalizeOptions, curr?: Node) {
    let cArgs = opts.cfg.options.args;
    cArgs =
      typeof cArgs === 'string' ? [cArgs] : Array.isArray(cArgs) ? cArgs : [];
    const data = cnode(
      opts,
      curr ? curr.data : null,
      cArgs.concat(opts.args || [])
    );

    let nOpts;
    (nOpts = map.get(opts.cfg)) ||
      map.set(opts.cfg, (nOpts = normalize(opts, data)));

    return new Node(nOpts, data, curr);
  }

  const ERR = ParseError.UNRECOGNIZED_ARGUMENT_ERROR;
  const root = node({ cfg });
  const nodes = [root];
  let parent: Node = root,
    child: Node | null | undefined;

  function unrecognized(msg: string, code = ERR): never {
    parent.error(code, 'does not recognize the ', 'Unrecognized ', msg);
  }

  function setAlias(
    aliases: NonEmptyArray<Alias>,
    raw: string,
    value?: string
  ) {
    // assignable arg --option: initial 1, 2
    // alias -a: --option 3, 4, 5
    // scenario: -a=6

    // convert aliases to options
    // make sure the last option is assignable
    type A = ParsedArg;
    const hasValue = value != null;
    const lastAlias = aliases[aliases.length - 1];
    const lArg: A = { raw, key: lastAlias.arg, alias: lastAlias.key };
    const lParsed = parent.parse(lArg, hasValue);

    if (!lParsed) return;

    // at this point, if a value is assigned, lParsed would always be set
    // otherwise, lParsed was parsed normally like the loop below.
    // this ensures that the options.handler call is not called twice

    const items = aliases.map((alias, i) => {
      const last = i === aliases.length - 1;
      const arg: A = last ? lArg : { raw, key: alias.arg, alias: alias.key };
      // no need to check assignable here since
      // we only need to check that for the last alias arg
      // also, no handler fallback for aliases!
      const parsed = last ? lParsed : parent.parse(arg);

      if (!parsed) {
        unrecognized(`option or command from alias '${alias.key}': ${arg.raw}`);
      }

      // assume parsed always contains at least 1 item
      // save alias args to the last item only
      // const parsed = parsed[parsed.length - 1];
      parsed.args.push(...alias.args);
      // add value to the last item (assume last item is assignable)
      last && hasValue && parsed.args.push(value);

      return parsed;
    });

    // assume 'items' always has value
    set(items as NonEmptyArray<NormalizeOptions>);

    return true;
  }

  function set(items: NonEmptyArray<NormalizeOptions>) {
    // consider items: [option1, command1, option2, command2, option3]
    // the previous implementation would only get
    // the last child that can have children (command2)
    // now, only the last child is checked if it can have children (option3)
    // why? it may be unfair for command1 if command2 is chosen
    // just because it was the last child that can do so.
    // handling this edge case probably has no practical use
    // and just adds more complexity for building the tree later

    for (const item of items) {
      // mark existing child as parsed then make new child
      child?.run('postArgs');

      // create child node from options
      nodes.push((child = node(item, parent)));
      parent.data.children.push(child.data);
    }

    // assume child always exists (items has length)
    // use child as next parent if it's not a leaf node
    if (!child!.opts.leaf) {
      // since we're removing reference to parent, mark it as parsed
      parent.run('postArgs');
      parent = child!;
      child = null;
    }
  }

  function setValue(raw: string, noStrict?: boolean) {
    // check if child can read one more argument
    // fallback to parent if child cannot accept any more args:
    // - if parent cannot read args, assume unrecognized argument
    // - if parent cannot make children, save the argument and rely on the
    // range check since we can safely assume it cannot have any child nodes
    // that will need the events called first before throwing an error
    // - if parent cannot accept args, assume unrecognized argument
    const curr =
      child?.opts.read &&
      (child.opts.max == null || child.opts.max > child.data.args.length)
        ? child
        : parent.opts.read
          ? parent
          : parent.opts.fertile
            ? unrecognized(`option or command: ${raw}`)
            : parent.error(ERR, 'e', 'E', `xpected no arguments, but got: ${raw}`); // prettier-ignore

    // strict mode: throw error if arg is an option-like
    !noStrict && curr.strict && isOption(raw) && unrecognized(`option: ${raw}`);
    curr.data.args.push(raw);

    // if saving to parent, save args to the value node
    curr === parent && curr.value(raw);
  }

  for (const raw of args) {
    // immediately treat as value if the current node
    // cannot actually create children
    if (!parent.opts.fertile) {
      setValue(raw);
      continue;
    }

    let parsed, alias, split;
    const arg: ParsedArg = { raw, key: raw };

    if ((parsed = parent.parse(arg))) {
      set([parsed]);
      continue;
    }

    // assume arg.raw and raw are the same
    // const arg = toArg(raw, null);
    const index = raw.lastIndexOf('=');
    const hasValue = index > -1;
    if (hasValue) {
      arg.key = raw.slice(0, index);
      arg.value = raw.slice(index + 1);
    }

    // parse options from options.args only
    if (hasValue && (parsed = parent.parse(arg, true))) {
      set([parsed]);
    }

    // at this point, if there are no parsed options, arg can be:
    // - an exact alias
    // - a merged alias
    // - options from handler
    // - a value (or, if in strict mode, an unknown option-like)
    // for this case, handle exact alias
    else if ((alias = parent.opts.aliases[raw]) && setAlias([alias], raw)) {
      // setAlias was successful, do nothing and go to next iteration
    } else if (
      hasValue &&
      (alias = parent.opts.aliases[arg.key]) &&
      setAlias([alias], raw, arg.value)
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
      setAlias(split.list, raw)
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
      setAlias(split.list, raw, arg.value)
    ) {
      // setAlias was successful, do nothing and go to next iteration
    }

    // parse options using handler
    else if ((parsed = parent.handle(arg))) {
      for (const value of parsed.values) setValue(value, true);

      // use arg.key as key here despite not using arg.value
      // assume that the consumer handles arg.value manually
      type O = NonEmptyArray<ParsedNodeOptions>;
      parsed.opts.length > 0 && set(parsed.opts as O);
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
  child?.run('postArgs');
  parent.run('postArgs');

  // run preValidate for all nodes per depth level incrementally
  for (const item of nodes) item.run('preValidate');

  // validate and run postValidate for all nodes
  for (const item of nodes) item.check();

  return root.data;
}
