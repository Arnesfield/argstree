import { isAlias, isOption } from '../utils/arg.utils.js';
import { displayName } from '../utils/options.utils.js';
import { argstree } from './argstree.js';
import { NodeData, Options } from './core.types.js';
import { ArgsTreeError } from './error.js';
import { Spec, SpecOptions } from './spec.types.js';

function normalize(options: SpecOptions | undefined) {
  const opts: Options = {};
  if (!options) {
    return opts;
  }
  const props: (keyof SpecOptions)[] = [
    'id',
    'name',
    'min',
    'max',
    'maxRead',
    'assign',
    'validate'
  ];
  for (const prop of props) {
    if (typeof options[prop] !== 'undefined') {
      // force assignment
      opts[prop] = options[prop] as any;
    }
  }
  return opts;
}

/**
 * Build {@linkcode Options options} for {@linkcode argstree}.
 * @param options The spec options.
 * @returns The spec object.
 */
export function spec(options?: SpecOptions): Spec {
  return _spec(null, normalize(options));
}

// NOTE: always keep reference to _options
// direct mutation should be safe since this is internal
function _spec(raw: string | null, _options: Options): Spec {
  const _args: { [arg: string]: Options | null | undefined } =
    Object.create(null);
  let _curr: { arg: string; options: Options; spec?: Spec } | undefined;

  function error(message: string) {
    const name = displayName(raw, _options);
    return new ArgsTreeError({
      cause: ArgsTreeError.INVALID_SPEC_ERROR,
      message: (name && name + 'spec error: ') + message,
      raw,
      alias: null,
      args: [],
      options: _options
    });
  }

  function current(context: string) {
    if (!_curr) {
      throw error(`Missing \`add()\` call before \`${context}\` call.`);
    }
    return _curr;
  }

  function assignArg(arg: string, options: Options) {
    if (arg in _args) {
      const type = isAlias(arg) || isOption(arg) ? 'Option' : 'Command';
      throw error(`${type} '${arg}' already exists.`);
    }
    return (_args[arg] = options);
  }

  function assignAlias(
    alias: string,
    args: Required<Options>['alias']['args']
  ) {
    _options.alias ||= Object.create(null) as Required<Options>['alias'];
    if (alias in _options.alias) {
      throw error(`Alias '${alias}' already exists.`);
    }
    _options.alias[alias] = args;
  }

  const spec: Spec = {
    option(arg: string, options?: SpecOptions) {
      // if called, assume args is always set (even empty)
      _options.args ||= _args;
      // create copy of options here since we need to keep its reference later
      _curr = { arg, options: assignArg(arg, normalize(options)) };
      return spec;
    },
    command(arg: string, options?: SpecOptions) {
      return spec.option(arg, options).spec(spec => spec.args());
    },
    alias(alias, args) {
      const { arg } = current('alias()');
      const aliasArgs =
        typeof args === 'string' || Array.isArray(args)
          ? ([arg].concat(args) as [string, ...string[]])
          : arg;
      const aliases =
        typeof alias === 'string' ? [alias] : Array.isArray(alias) ? alias : [];
      for (const alias of aliases) {
        assignAlias(alias, aliasArgs);
      }
      return spec;
    },
    spec(setup) {
      // cache spec to curr to reuse for multiple spec calls
      const curr = current('spec()');
      setup((curr.spec ||= _spec(curr.arg, curr.options)));
      return spec;
    },
    aliases(alias) {
      for (const [key, value] of Object.entries(alias)) {
        assignAlias(key, value);
      }
      return spec;
    },
    args(
      handler?: (arg: string, data: NodeData) => Options | null | undefined
    ) {
      // if called, assume args is always set (even empty)
      _options.args ||= _args;
      if (typeof handler === 'function') {
        // when a callback is set, use that instead
        _options.args = (arg, data) => _args[arg] || handler(arg, data);
      }
      return spec;
    },
    options() {
      return _options;
    },
    parse(args) {
      return argstree(args, _options);
    }
  };
  return spec;
}
