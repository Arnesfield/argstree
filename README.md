# argstree

[![npm](https://img.shields.io/npm/v/argstree.svg)](https://www.npmjs.com/package/argstree)
[![Node.js CI](https://github.com/Arnesfield/argstree/workflows/Node.js%20CI/badge.svg)](https://github.com/Arnesfield/argstree/actions?query=workflow%3A"Node.js+CI")

Parse arguments into a tree structure.

## Features

**argstree** is meant to be a minimal and _less_ opinionated argument parser with the following goals and features:

- Preserve the structure of the provided arguments.
- No data types other than strings.
- Variadic arguments by default unless [limits](#limits) are configured.
- All arguments are treated as normal parameters unless configured to be an [option or command](#options-and-commands).
- [Aliases](#aliases) are not restricted to single characters and can be expanded to multiple options or commands with additional arguments.
- Recognize and [split](#split) combined aliases (e.g. from `-abaa` to `-a`, `-ba`, `-a`).
- Recognize configured [assignment](#assignment) (`=`) for options and commands (e.g. `--foo=bar`, `foo=bar`).
- No [errors](#argstreeerror) for unrecognized options or commands (except for misconfigured aliases and unknown aliases from a combined alias).
- Double-dash (`--`) is not treated as anything special but can be configured to be a subcommand.

Note that **argstree** only parses arguments based on the configuration it has been given. It is still up to the consumers/developers to interpret the parsed arguments and decide how to use these inputs to suit their application's needs.

If you're looking for something oddly specific and want more control when working with arguments, then **argstree** _might_ be for you. Otherwise, you can check out the other great projects for parsing arguments like [commander](https://www.npmjs.com/package/commander), [yargs](https://www.npmjs.com/package/yargs), [minimist](https://www.npmjs.com/package/minimist), and [many more](https://www.npmjs.com/search?q=keywords%3Aargs%2Cargv).

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
> While the sections ahead use the core `argstree()` function to show examples explaining the configuration setup, **it is recommended to use the [Spec API](#spec-api)** instead for the ease of building your parsing spec as it grows with more options and commands.
>
> Also, for the sake of brevity, not all features/properties are included in this document and it is advised to view the referenced types to learn more.

### Options and Commands

Configure options and commands by setting the `args` object or function option.

While they may be configured similarly, options start with a hyphen (e.g. `-foo`, `--bar`) while commands do not (e.g. `foo`, `bar`).

When setting the `args` object, the _properties_ are used to match the arguments while the _values_ are also options objects similar to the options from `argstree(args, options)`.

Options and commands will capture arguments and stop when another option or command is matched or the configured [limit](#limits) is reached.

```javascript
const node = argstree(['--foo', 'value', '--foo', 'bar', 'baz'], {
  args: {
    '--foo': {}, // options object
    bar: { initial: ['foo'] } // options object with initial arguments
  }
});
for (const child of node.children) {
  console.log(child.id, child.args);
}
```

```text
--foo [ 'value' ]
--foo []
bar [ 'foo', 'baz' ]
```

You can also pass a function to the `args` option. It has two parameters: the `arg` string (comes from the `args` array or from a split combined alias) and the `NodeData` object. It should return an options object, `null`, or `undefined`.

```javascript
const args = ['--foo', 'bar', '--bar', '--baz', 'foo'];
const node = argstree(args, {
  args(arg, data) {
    return arg.startsWith('--') ? {} : null;
  }
});
for (const child of node.children) {
  console.log(child.id, child.args);
}
```

```text
--foo [ 'bar' ]
--bar []
--baz [ 'foo' ]
```

> [!WARNING]
>
> Be aware that there may be cases where `__proto__` and other hidden object properties are used as arguments.
>
> By default, **argstree** checks if the provided options object is a valid object that does not equal the default object prototype (`options !== Object.prototype`).
>
> If this seems to be insufficient for your case, you can handle it yourself (e.g. setting `__proto__: null` and such).
>
> ```javascript
> argstree(['__proto__'], {
>   args: { __proto__: null, '--foo': {} }
> });
>
> argstree(['__proto__'], {
>   args(arg) {
>     return { __proto__: null, '--foo': {} }[arg];
>   }
> });
> ```

### Assignment

Using `=`, options or commands will treat the assigned value as their own argument regardless of any matches.

By default, this behavior is enabled for options but not for commands. To change this behavior, you can set the `assign` boolean option.

```javascript
const node = argstree(['--foo=bar', 'foo=bar', '--bar=foo', 'bar=foo'], {
  args: {
    // assign enabled for options by default
    '--foo': {},
    // change behavior
    '--bar': { assign: false },
    // assign disabled for commands by default
    foo: {},
    // change behavior
    bar: { assign: true }
  }
});
for (const child of node.children) {
  console.log(child.id, child.args);
}
```

```text
--foo [ 'bar', 'foo=bar', '--bar=foo' ]
bar [ 'foo' ]
```

### Suboptions and Subcommands

Matching a suboption or subcommand means that its parent option or command will stop receiving arguments.

```javascript
const node = argstree(['--foo', 'bar', '--foo', 'baz'], {
  args: {
    '--foo': {},
    bar: {
      // setting the `args` object (even empty)
      // will treat `bar` as a suboption/subcommand
      args: {
        // can also set `args` object for this option or command
      }
    }
  }
});
const foo = node.children[0];
const bar = node.children[1];
console.log('root', node.args);
console.log(foo.id, foo.args);
console.log(bar.id, bar.args, bar.parent === node);
```

```text
root []
--foo []
bar [ '--foo', 'baz' ] true
```

In this example:

- The parent command of the `bar` subcommand is the root node.
- Once the `bar` subcommand was matched, its options are used for parsing the proceeding arguments.
- The second `--foo` argument was not recognized as an option by `bar` (not in its `args` object) and is treated as a normal argument.

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
    '-a': '--foo',
    // alias -> option/command + arguments
    '-ba': ['--foo', 'bar', 'baz'],
    // alias -> multiple options/commands
    '-ca': [['--foo'], ['--bar']],
    // alias -> multiple options/commands + arguments
    '-da': [
      ['--foo', 'multi', 'bar', 'baz'],
      ['--bar', 'multi', 'foo', 'baz']
    ],
    // non-combinable alias (example only, above usage can also apply)
    a: '--baz',
    b: 'baz'
  },
  args: { '--foo': {}, '--bar': {}, '--baz': {}, baz: {} }
});
for (const child of node.children) {
  console.log(child.id, child.args);
}
```

```text
--foo []
--foo [ 'bar', 'baz' ]
--foo []
--bar []
--foo [ 'multi', 'bar', 'baz' ]
--bar [ 'multi', 'foo', 'baz', '0' ]
--baz [ '1', 'b=2' ]
```

### Validation

Set the `validate` function option to validate the arguments after they are saved for the option or command. It has a `NodeData` object parameter and it should either return a boolean or throw an error manually. A validate error is thrown when `false` is returned.

Note that a call to `validate` means that the `Node` has already parsed all of its arguments and that it has passed all [validation checks](#limits) beforehand.

```javascript
function validate(data) {
  console.log(data.raw, data.alias, data.args);
  return true;
}
argstree(['--foo', '-b', 'foo', 'bar'], {
  alias: { '-f': '--foo', '-b': '--bar' },
  args: {
    '--foo': { max: 1, validate },
    '--bar': { max: 1, validate }
  },
  validate(data) {
    console.log('root', data.alias, data.args);
    return true;
  }
});
```

```text
--foo null []
--bar -b [ 'foo' ]
root null [ 'bar' ]
```

### ArgsTreeError

For errors related to parsing and misconfiguration, an `ArgsTreeError` is thrown. You can import this class to reference in catch blocks.

```javascript
import argstree, { ArgsTreeError } from 'argstree';

try {
  argstree(['--foo', 'bar'], {
    args: { '--foo': { min: 2 } }
  });
} catch (error) {
  if (error instanceof ArgsTreeError) {
    console.error(JSON.stringify(error, undefined, 2));
  }
}
```

```text
{
  "name": "ArgsTreeError",
  "cause": "invalid-range",
  "message": "Option '--foo' expected at least 2 arguments, but got 1.",
  "raw": "--foo",
  "alias": null,
  "args": [
    "bar"
  ],
  "options": {
    "min": 2
  }
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

const node = argstree(['foo', 'bar', '-f', '0', '--bar', '1'], {
  args: {
    foo: {
      alias: { '-f': '--foo', '-b': '--bar' },
      args: { '--foo': {}, '--bar': {} }
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
├─┬ foo (depth: 1)
│ ├─┬ :args (total: 1)
│ │ └── bar
│ ├─┬ --foo (depth: 2, alias: -f)
│ │ ├─┬ :args (total: 1)
│ │ │ └── 0
│ │ └─┬ :ancestors (total: 2)
│ │   ├── null (depth: 0)
│ │   └── foo (depth: 1)
│ ├─┬ --bar (depth: 2)
│ │ ├─┬ :args (total: 1)
│ │ │ └── 1
│ │ └─┬ :ancestors (total: 2)
│ │   ├── null (depth: 0)
│ │   └── foo (depth: 1)
│ ├─┬ :ancestors (total: 1)
│ │ └── null (depth: 0)
│ └─┬ :descendants (total: 2)
│   ├── --foo (depth: 2, alias: -f)
│   └── --bar (depth: 2)
└─┬ :descendants (total: 3)
  ├── foo (depth: 1)
  ├── --foo (depth: 2, alias: -f)
  └── --bar (depth: 2)
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
cmd.option('--foo').alias('-f').alias('--no-foo', '0');
cmd.option('--bar').alias('-b').alias('--no-bar', ['0']);

// get the options object with <spec>.options()
const options = cmd.options();
console.log(options);

// parse arguments with <spec>.parse(args)
const node = cmd.parse(['foo', '--foo', 'bar', '-b', 'baz']);
console.log('root', node.args);
for (const child of node.children) {
  console.log(child.id, child.args);
}
```

```text
{
  min: 1,
  args: [Object: null prototype] { '--foo': {}, '--bar': {} },
  alias: [Object: null prototype] {
    '-f': '--foo',
    '--no-foo': [ '--foo', '0' ],
    '-b': '--bar',
    '--no-bar': [ '--bar', '0' ]
  }
}
root [ 'foo' ]
--foo [ 'bar' ]
--bar [ 'baz' ]
```

The options object passed to `spec(options)` is similar to the options from `argstree(args, options)` but the `alias` and `args` options are omitted.

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
cmd.option('--foo');

// add command
cmd.command('foo');

// <spec>.command() is an alias for the following:
// cmd.option('foo').spec(fooCmd => fooCmd.args());

// add an empty args object
cmd.args();

// or add args function (string and NodeData)
cmd.args((arg, data) => {
  // will match '--foo' and 'foo' first before this callback is fired
  return arg === '--baz' ? {} : null;
});
```

### Spec Aliases

- Use the `aliases` method to assign [aliases](#aliases) not bound to the current option or command.
- Use the `alias` method to assign aliases to the current option or command. An error is thrown if the current option or command does not exist.

```javascript
const cmd = spec();

// set aliases similar to argstree options alias
cmd.aliases({ '-A': [['--foo'], ['--bar']] });

// set alias/es to current option or command
// spec object method chaining (applies to all methods)
cmd.option('--foo', { maxRead: 0 }).alias('-f').alias('--no-foo', '0');

// multiple aliases (array) and multiple arguments (array)
cmd.option('--bar', { maxRead: 0 }).alias(['-b', '-ba'], ['1', '2', '3']);
```

### Spec Suboptions and Subcommands

Use the `spec` method that accepts a setup callback. This callback contains a `Spec` object parameter (subspec) to modify the options of the current option or command. This can be called multiple times for the same option or command.

```javascript
function commonSpec(spec) {
  spec.option('--help', { maxRead: 0 }).alias('-h');
  spec.command('--');
}
const cmd = spec()
  .command('foo')
  .alias(['f', 'fo'])
  .spec(foo => foo.option('--bar').alias('-b'))
  .spec(commonSpec);
commonSpec(cmd);
console.log('%o', cmd.options());
```

```javascript
{
  args: [Object: null prototype] {
    foo: {
      args: [Object: null prototype] {
        '--bar': {},
        '--help': { maxRead: 0 },
        '--': { args: [Object: null prototype] {} }
      },
      alias: [Object: null prototype] { '-b': '--bar', '-h': '--help' }
    },
    '--help': { maxRead: 0 },
    '--': { args: [Object: null prototype] {} }
  },
  alias: [Object: null prototype] { f: 'foo', fo: 'foo', '-h': '--help' }
}
```

## License

Licensed under the [MIT License](LICENSE).
