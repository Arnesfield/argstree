# argstree

[![npm](https://img.shields.io/npm/v/argstree.svg)](https://www.npmjs.com/package/argstree)
[![Node.js CI](https://github.com/Arnesfield/argstree/workflows/Node.js%20CI/badge.svg)](https://github.com/Arnesfield/argstree/actions?query=workflow%3A"Node.js+CI")

Parse arguments into a tree structure.

```javascript
import argstree from 'argstree';

// args: --hello world
const args = process.argv.slice(2);
const node = argstree(args, { args: { '--hello': {} } });
const child = node.children[0];
console.log(child.id, child.args);
```

```text
--hello [ 'world' ]
```

## Features

**argstree** is meant to be a _less_ opinionated argument parser with the following goals:

- Preserve the structure of the provided arguments.
- Variadic arguments by default.
- No options or commands are recognized by default.
- No data types other than strings.
- Automatically recognize and split configured aliases.
- Recognize configured [assignment](#assignment) (`=`) for aliases, options, and commands (e.g. `-f=bar`, `--foo=bar`, `foo=bar`).
- Double-dash (`--`) is not treated as anything special and can be configured to be a subcommand.

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

> [!IMPORTANT]
>
> See [`src/core/core.types.ts`](src/core/core.types.ts) for `Options` and `Node` types.
>
> It also includes useful properties not included in this document for the sake of brevity.

### Options and Commands

Configure options and commands by setting the `args` object or function option.

While they may be configured similarly, options start with a dash (e.g. `-foo`, `--bar`) while commands do not (e.g. `foo`, `bar`).

When setting the `args` object, the _properties_ are used to match the arguments while the _values_ are also options objects similar to the options from `argstree(args, options)`.

Options and commands will capture arguments and stop when another option or command is matched or the configured [limit](#limits) is reached.

```javascript
const node = argstree(['--foo', 'value', '--foo', 'bar', 'baz'], {
  args: {
    '--foo': {}, // Options object
    bar: {} // Options object
  }
});
for (const child of node.children) {
  console.log(child.id, child.args);
}
```

```text
--foo [ 'value' ]
--foo []
bar [ 'baz' ]
```

You can also pass a function to the `args` option. It has an `arg` string parameter (comes from the `args` array or from splitted alias) and it should return an options object, `null`, or `undefined`.

```javascript
const args = ['--foo', 'bar', '--bar', '--baz', 'foo'];
const node = argstree(args, {
  args: arg => {
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
>   args: arg => {
>     return { __proto__: null, '--foo': {} }[arg];
>   }
> });
> ```

### Assignment

Using `=`, options or commands will treat the assigned value as their own argument regardless of any matches.

By default, this behavior is enabled for aliases and options but not for commands. To change this behavior, you can set the `assign` boolean option.

```javascript
const node = argstree(['--foo=bar', 'foo=bar', '--bar=foo', 'bar=foo'], {
  args: {
    // assign enabled by default for options
    '--foo': {},
    // change behavior
    '--bar': { assign: false },
    // assign disabled by default for commands
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

Matching a suboption or a subcommand means that its parent option or command will stop receiving arguments.

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

Only aliases that start with one dash (e.g. `-a`, `-bc`) can be combined together into one alias shorthand (e.g. `-abc`).

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

Set the `validate` function option to validate arguments after they are saved for the option or command. Return a boolean or throw an error manually. A validate error is thrown when `false` is returned.

The `validate` function has a `data` object parameter with the following properties:

- `raw` (type: `string | null`) - The parsed argument.
- `args` (type: `string[]`) - The arguments for this node.
- `options` (type: `Options`) - The options for this node.

```javascript
argstree(['--foo', 'bar', 'baz'], {
  args: {
    '--foo': {
      max: 1,
      validate(data) {
        console.log('--foo', data);
        return true;
      }
    }
  },
  validate(data) {
    console.log('root', data);
    return true;
  }
});
```

```text
--foo {
  raw: '--foo',
  args: [ 'bar' ],
  options: { max: 1, validate: [Function: validate] }
}
root {
  raw: null,
  args: [ 'baz' ],
  options: { args: { '--foo': [Object] }, validate: [Function: validate] }
}
```

### ArgsTreeError

For errors related to parsing, an `ArgsTreeError` is thrown. You can import this class to reference in catch blocks.

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

### stringify

The `stringify` function returns a stringified `Node` object. It also accepts an options object where you can specify what to show or hide from the generated tree string.

```javascript
import argstree, { stringify } from 'argstree';

const node = argstree(['foo', 'bar', '--foo', '0', '--bar', '1'], {
  args: {
    foo: {
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
│ ├─┬ --foo (depth: 2)
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
│   ├── --foo (depth: 2)
│   └── --bar (depth: 2)
└─┬ :descendants (total: 3)
  ├── foo (depth: 1)
  ├── --foo (depth: 2)
  └── --bar (depth: 2)
```

> [!TIP]
>
> See [`src/core/stringify.ts`](src/core/stringify.ts) for more details.

## License

Licensed under the [MIT License](LICENSE).
