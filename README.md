[npm-img]: https://img.shields.io/npm/v/argstree.svg
[npm-url]: https://www.npmjs.com/package/argstree
[ci-img]: https://github.com/Arnesfield/argstree/workflows/Node.js%20CI/badge.svg
[ci-url]: https://github.com/Arnesfield/argstree/actions?query=workflow%3A"Node.js+CI"

# argstree

[![npm][npm-img]][npm-url]
[![Node.js CI][ci-img]][ci-url]

Parse arguments into a tree structure.

## Features

**argstree** is meant to be a minimal and less opinionated argument parser with the following goals and features:

- Preserve the structure of the provided arguments.
- No data types other than strings.
- Variadic arguments by default unless [limits](#limits) are specified.
- All arguments are treated as normal parameters unless configured to be an [option or command](#options-and-commands).
- [Aliases](#aliases) are not restricted to single characters and can be expanded to multiple options or commands with additional arguments.
- Recognize and [split](#split) combined aliases (e.g. from `-abaa` to `-a`, `-ba`, `-a`).
- Recognize [assignment](#assignment) (`=`) for options and commands (e.g. `--flag=value`, `command=value`).
- No [errors](#argstreeerror) for unrecognized options or commands [by default](#strict-mode) (except for misconfigured aliases and unrecognized aliases from a combined alias).
- Double-dash (`--`) is not treated as anything special but can be configured to be a non-strict subcommand.

Note that **argstree** only parses and transforms arguments into a tree structure. It is still up to the consumers/developers to read, interpret, and process the parsed arguments and decide how to use them to suit their application's needs.

If you're looking for something oddly specific and want more control when working with arguments, then **argstree** _might_ be for you. Otherwise, you can check out the more popular tools like [commander](https://www.npmjs.com/package/commander), [yargs](https://www.npmjs.com/package/yargs), [minimist](https://www.npmjs.com/package/minimist), and [many more](https://www.npmjs.com/search?q=keywords%3Aargs%2Cargv).

## Install

```sh
npm install argstree
```

## Usage

Import the module ([ESM only](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c)):

```javascript
import argstree from 'argstree';
```

The `argstree(args, options)` function accepts an array of strings and an options object. It returns a `Node` object (root node).

```javascript
const node = argstree(['--hello', 'world'], { min: 1 });
console.log(node.id, node.args);
```

```text
null [ '--hello', 'world' ]
```

> [!TIP]
>
> See [`src/core/core.types.ts`](src/core/core.types.ts) for `Node`, `NodeData`, and `Options` types.

The `spec(options)` function can also be used to parse arguments while also being an options builder. See the [Spec API](#spec-api) section for more details.

> [!IMPORTANT]
>
> While the sections ahead use the core `argstree()` function to show usage examples, **it is recommended to use the [Spec API](#spec-api) instead** for the ease of building your parsing spec as it grows with more options and commands.
>
> Also, for the sake of brevity, not all features/properties are included in this document and it is advised to view the referenced types to learn more.

### Options and Commands

Configure options and commands by setting the `args` object or function option.

While they may be configured similarly, options start with a hyphen (e.g. `-a`, `--add`) while commands do not (e.g. `run`, `start`).

When setting the `args` object, the _properties_ are used to match the arguments while the _values_ are also options objects.

Options and commands will capture arguments and stop when another option or command is matched or the specified [limit](#limits) is reached.

```javascript
const node = argstree(['--add', 'foo', '--add', 'run', 'bar'], {
  args: { '--add': {}, run: {} }
});
for (const child of node.children) {
  console.log(child.id, child.args);
}
```

```text
--add [ 'foo' ]
--add []
run [ 'bar' ]
```

You can also pass a function to the `args` option. It has two parameters: the `arg` string and the `NodeData` object. It should return an options object, `null`, or `undefined`.

```javascript
const node = argstree(['-a=bar', 'baz'], {
  alias: { '-a': '--add' },
  args(arg, data) {
    console.log(arg);
    // options object with initial arguments
    return arg === '--add' ? { initial: ['foo'] } : null;
  }
});
const child = node.children[0];
console.log(child.id, child.args);
```

```text
-a=bar
-a
--add
baz
--add [ 'foo', 'bar', 'baz' ]
```

> [!WARNING]
>
> Be aware that `__proto__` and other inherited object properties can be used as arguments. **argstree** does not block these possibly unsafe arguments, but it has some checks in place for the `args` object and the incoming options object. Make sure to check for `__proto__` and other related properties.
>
> ```javascript
> const options = {
>   __proto__: null, // <-- set null prototype
>   '--add': {}
> };
> const node = argstree(['__proto__', 'constructor'], {
>   args: arg => options[arg] // should be safe
> });
> console.log(node.args); // [ '__proto__', 'constructor' ]
> ```

### Strict Mode

Set the `strict` boolean option to throw an error for unrecognized options that are not provided in the `args` option.

By default, this is set to `false` for the root node. If not explicitly provided, this option is inherited from the parent option or command.

```javascript
try {
  argstree(['run', 'build', '--if-preset'], {
    strict: true,
    args: {
      run: { args: { '--if-present': {} } }
    }
  });
} catch (error) {
  console.error(error.toString());
}
```

```text
ArgsTreeError: Command 'run' does not recognize the option: --if-preset
```

### Assignment

Using `=`, options or commands will treat the assigned value as their own argument regardless of any matches.

By default, this behavior is enabled for options but not for commands. Set the `assign` boolean option to change this behavior.

```javascript
const node = argstree(['--add=foo', 'copy=foo', '--save=bar', 'move=bar'], {
  args: {
    // assign enabled for options by default
    '--add': {},
    // change behavior
    '--save': { assign: false },
    // assign disabled for commands by default
    copy: {},
    // change behavior
    move: { assign: true }
  }
});
for (const child of node.children) {
  console.log(child.id, child.args);
}
```

```text
--add [ 'foo', 'copy=foo', '--save=bar' ]
move [ 'bar' ]
```

### Suboptions and Subcommands

Matching a suboption or subcommand means that its parent option or command will stop receiving arguments.

```javascript
const node = argstree(['--add', 'run', '--add', 'build'], {
  args: {
    '--add': {},
    run: {
      // setting the `args` object (even empty)
      // will treat `run` as a subcommand
      args: {
        // can also set `args` object for this subcommand
      }
    }
  }
});
const add = node.children[0];
const run = node.children[1];
console.log('root', node.args);
console.log(add.id, add.args);
console.log(run.id, run.args, run.parent === node);
```

```text
root []
--add []
run [ '--add', 'build' ] true
```

In this example:

- The parent command of the `run` subcommand is the root node.
- Once the `run` subcommand was matched, its options are used for parsing the proceeding arguments.
- The second `--add` argument was not recognized as an option by `run` (not in its `args` option) and is treated as a normal argument.

### Limits

Specify the required minimum and maximum number of arguments per option or command.

- `min` (type: `number | null`) - Required number of arguments to read before the next parsed option or command.

  An error is thrown if the option or command does not satisfy this condition.

- `max` (type: `number | null`) - Maximum number of arguments to read before the next parsed option or command.

  Arguments over the maximum limit are saved as arguments for the parent option or command instead.

  Direct [assignment](#assignment) will always read the assigned value as an argument for the option or command.

  An error is thrown if the option or command does not satisfy this condition.

- `maxRead` (type: `number | null`) - Similar to the `max` option but does not throw an error.

  If not provided, the value for `max` is used instead.

  This takes priority over the `max` option when reading arguments, but the `max` option is still used for validating the maximum number of arguments.

```javascript
const args =
  '--min foo1 bar1 ' +
  '--max foo2 bar2 ' +
  '--max-read foo3 bar3 ' +
  '--max-read=foo4 bar4';
const node = argstree(args.split(' '), {
  args: {
    '--min': { min: 1 },
    '--max': { max: 1 },
    '--max-read': { maxRead: 0 }
  }
});
console.log('root', node.args);
for (const child of node.children) {
  console.log(child.id, child.args);
}
```

```text
root [ 'bar2', 'foo3', 'bar3', 'bar4' ]
--min [ 'foo1', 'bar1' ]
--max [ 'foo2' ]
--max-read []
--max-read [ 'foo4' ]
```

### Aliases

Configure aliases by setting the `alias` object option.

It should include the list of aliases mapped to options or commands specified in the `args` object option. An error is thrown if the option or command is not valid.

Only aliases that start with one hyphen (e.g. `-a`, `-bc`) can be combined together into one alias shorthand (e.g. `-abc`).

Note that the [`assign`](#assignment) option applies to aliases of the options or commands and that [limits](#limits) also apply to their arguments.

```javascript
const node = argstree(['-abacada=0', 'a=1', 'b=2'], {
  alias: {
    // alias -> option/command
    '-a': '--add',
    // alias -> option/command + arguments
    '-ba': ['--add', 'bar', 'baz'],
    // alias -> multiple options/commands
    '-ca': [['--add'], ['--save']],
    // alias -> multiple options/commands + arguments
    '-da': [
      ['--add', 'multi', 'bar', 'baz'],
      ['--save', 'multi', 'foo', 'baz']
    ],
    // non-combinable alias (example only, above usage can also apply)
    a: '--create', // assign enabled by default (option)
    b: 'start' // assign disabled by default (command)
  },
  args: { '--add': {}, '--save': {}, '--create': {}, start: {} }
});
for (const child of node.children) {
  // node.alias is set to the alias string used to parse the node
  console.log(child.id, child.alias, child.args);
}
```

```text
--add -a []
--add -ba [ 'bar', 'baz' ]
--add -ca []
--save -ca []
--add -da [ 'multi', 'bar', 'baz' ]
--save -da [ 'multi', 'foo', 'baz', '0' ]
--create a [ '1', 'b=2' ]
```

### Validation

Set the `validate` function option to validate the arguments after they are saved for the option or command. It has a `NodeData` object parameter and it should either return a boolean or throw an error manually. A validate error is thrown when `false` is returned.

Note that a call to `validate` means that the `Node` has already parsed all of its arguments and that it has passed all [validation checks](#limits) beforehand. It is also safe to directly mutate the `data.args` array in `validate`, but you can always choose to transform and validate arguments after parsing.

```javascript
const node = argstree(['--list', 'a,b,c'], {
  args: {
    '--list': {
      min: 1,
      max: 1,
      validate(data) {
        // safely assume data.args has 1 length (min-max range: 1-1)
        const args = data.args[0].split(',');
        // you can validate args here, then mutate and replace data.args
        data.args.splice(0, data.args.length, ...args);
        return true;
      }
    }
  }
});
const list = node.children[0];
console.log(list.id, list.args);
```

```text
--list [ 'a', 'b', 'c' ]
```

### ArgsTreeError

For errors related to parsing and misconfiguration, an `ArgsTreeError` is thrown. You can import this class to reference in catch blocks.

```javascript
import argstree, { ArgsTreeError } from 'argstree';

try {
  argstree(['--add', 'foo'], { args: { '--add': { min: 2 } } });
} catch (error) {
  if (error instanceof ArgsTreeError) {
    console.error(error.toJSON());
  }
}
```

```text
{
  name: 'ArgsTreeError',
  cause: 'invalid-range',
  message: "Option '--add' expected at least 2 arguments, but got 1.",
  raw: '--add',
  alias: null,
  args: [ 'foo' ],
  options: { min: 2 }
}
```

> [!TIP]
>
> See [`src/core/error.ts`](src/core/error.ts) for more details.

### split

The `split` function is used to split the combined value string based on the provided matches. It returns an object with the split values and the remaining values that were not split. Note that longer match strings take priority and are split first.

```javascript
import { split } from 'argstree';

console.log(split('foobar', ['foo', 'bar']));
console.log(split('foobarfoobaz', ['fo', 'foo', 'oba']));
console.log(split('foobarfoobaz', ['fo', 'oba', 'foo']));
```

```text
{ values: [ 'foo', 'bar' ], remainder: [] }
{ values: [ 'foo', 'foo' ], remainder: [ 'bar', 'baz' ] }
{ values: [ 'fo', 'oba', 'fo', 'oba' ], remainder: [ 'r', 'z' ] }
```

### stringify

The `stringify` function returns a stringified `Node` object. It also accepts an options object where you can specify what to show or hide from the generated tree string.

```javascript
import argstree, { stringify } from 'argstree';

const node = argstree(['start', 'foo', '-a', 'bar', '--save', 'baz'], {
  args: {
    start: {
      alias: { '-a': '--add', '-s': '--save' },
      args: { '--add': {}, '--save': {} }
    }
  }
});
const tree = stringify(node, {
  args: true, // default: true
  ancestors: true, // default: false
  descendants: true // default: false
});
console.log(tree);
```

```text
null (depth: 0)
├─┬ start (depth: 1)
│ ├─┬ :args (total: 1)
│ │ └── foo
│ ├─┬ --add (depth: 2, alias: -a)
│ │ ├─┬ :args (total: 1)
│ │ │ └── bar
│ │ └─┬ :ancestors (total: 2)
│ │   ├── null (depth: 0)
│ │   └── start (depth: 1)
│ ├─┬ --save (depth: 2)
│ │ ├─┬ :args (total: 1)
│ │ │ └── baz
│ │ └─┬ :ancestors (total: 2)
│ │   ├── null (depth: 0)
│ │   └── start (depth: 1)
│ ├─┬ :ancestors (total: 1)
│ │ └── null (depth: 0)
│ └─┬ :descendants (total: 2)
│   ├── --add (depth: 2, alias: -a)
│   └── --save (depth: 2)
└─┬ :descendants (total: 3)
  ├── start (depth: 1)
  ├── --add (depth: 2, alias: -a)
  └── --save (depth: 2)
```

> [!TIP]
>
> See [`src/core/stringify.ts`](src/core/stringify.ts) for more details.

## Spec API

The `spec(options)` function returns a `Spec` object (options builder). Calling `parse(args)` uses the `argstree` core function to parse the arguments and it also returns a `Node` object (root node). To get the options object, use the `options()` method.

```javascript
import { spec } from 'argstree';

// create command spec
const cmd = spec({ min: 1 });

// add options or commands with aliases and with arguments
cmd.option('--add').alias('-a').alias('--no-add', '0');
cmd.option('--save').alias('-s', ['bar']);

// get the options object with <spec>.options()
const options = cmd.options();

// parse arguments with <spec>.parse(args)
const node = cmd.parse(['foo', '--add', 'bar', '-s', 'baz']);
console.log('root', node.args);
for (const child of node.children) {
  console.log(child.id, child.args);
}
```

```text
root [ 'foo' ]
--add [ 'bar' ]
--save [ 'bar', 'baz' ]
```

> [!TIP]
>
> See [`src/core/spec.types.ts`](src/core/spec.types.ts) for more details.

### Spec Options and Commands

- Use the `option(arg, options)` and `command(arg, options)` methods to add options and commands to the `args` object option respectively.
- Use the `args()` method to add an empty object to the `args` option.
- Use the `args(handler)` method to use a function for the `args` option and use the `handler` callback as a fallback.

```javascript
const cmd = spec();

// add option
cmd.option('--add');

// add command
cmd.command('start');

// <spec>.command() is an alias for the following:
// cmd.option('start').spec(startCmd => startCmd.args());

// add an empty args object
cmd.args();

// or add args function (string and NodeData)
cmd.args((arg, data) => {
  // callback not fired for added options/commands: '--add' and 'start'
  return arg === '--save' ? {} : null;
});
```

### Spec Aliases

- Use the `aliases` method to assign [aliases](#aliases) not bound to the current option or command.
- Use the `alias` method to assign aliases to the current option or command. An error is thrown if the current option or command does not exist.

```javascript
const cmd = spec();

// set aliases similar to argstree options alias
cmd.aliases({ '-A': [['--add'], ['--save']] });

// set aliases to current option or command
// spec object method chaining (applies to all methods)
cmd.option('--add', { maxRead: 0 }).alias('-a').alias('--no-add', '0');

// multiple aliases and arguments
cmd.option('--save', { maxRead: 0 }).alias(['-s', '-sa'], ['1', '2', '3']);
```

### Spec Suboptions and Subcommands

Use the `spec` method that accepts a setup callback which contains a `Spec` object parameter (subspec) to modify the options of the current option or command. This can be used multiple times for the same option or command.

```javascript
function commonSpec(spec) {
  spec.option('--help', { maxRead: 0 }).alias('-h');
  spec.command('--', { strict: false });
}
const cmd = spec({ strict: true })
  .command('run-script')
  .alias(['run', 'urn'])
  .spec(run => run.option('--workspace', { min: 1, max: 1 }).alias('-w'))
  .spec(commonSpec);
commonSpec(cmd);
console.log('%o', cmd.options());
```

```text
{
  strict: true,
  args: [Object: null prototype] {
    'run-script': {
      args: [Object: null prototype] {
        '--workspace': { min: 1, max: 1 },
        '--help': { maxRead: 0 },
        '--': { strict: false, args: [Object: null prototype] {} }
      },
      alias: [Object: null prototype] { '-w': '--workspace', '-h': '--help' }
    },
    '--help': { maxRead: 0 },
    '--': { strict: false, args: [Object: null prototype] {} }
  },
  alias: [Object: null prototype] {
    run: 'run-script',
    urn: 'run-script',
    '-h': '--help'
  }
}
```

## License

Licensed under the [MIT License](LICENSE).
