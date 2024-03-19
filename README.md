# argstree

[![npm](https://img.shields.io/npm/v/argstree.svg)](https://www.npmjs.com/package/argstree)
[![Node.js CI](https://github.com/Arnesfield/argstree/workflows/Node.js%20CI/badge.svg)](https://github.com/Arnesfield/argstree/actions?query=workflow%3A"Node.js+CI")

Parse arguments into a tree structure.

```javascript
import argstree, { stringify } from 'argstree';

// args: --hello world
const args = process.argv.slice(2);
const node = argstree(args);
const tree = stringify(node);
console.log(tree);
```

```text
null (depth: 0)
└─┬ :args (total: 2)
  ├── --hello
  └── world
```

## Motivation

Parsing arguments is hard. Well, unless you use the many packages out there that can do that for you. But even then, sometimes you may find yourself wanting to have more control over how arguments are parsed and processed.

`argstree` is meant to be a _less_ opinionated argument parser with the following goals:

- Preserve the structure of the provided arguments.
- Variadic arguments by default.
- No options or (sub)commands are recognized by default.
- No data types other than strings (or nulls).
- Automatically recognize and split configured aliases.
- Recognize assignment (`=`) for options and aliases (e.g. `--foo=bar`).
- Double-dash (`--`) is not treated as anything special and can be configured to be a subcommand.

Note that `argstree` only parses arguments based on the configuration it has been given. It is still up to the consumers/developers to interpret the parsed arguments and decide how to use these inputs to suit their application's needs.

If you're looking for something oddly specific, then `argstree` _might_ be for you. Otherwise, you can check out the other great projects for parsing arguments like [`commander`](https://www.npmjs.com/package/commander), [`yargs`](https://www.npmjs.com/package/yargs), [`minimist`](https://www.npmjs.com/package/minimist), and [many more](https://www.npmjs.com/search?q=keywords%3Aargs%2Cargv).

## Install

```sh
npm install argstree
```

## Usage

Import the module ([ESM only](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c)):

```javascript
import argstree from 'argstree';
```

The `argstree` function accepts an array of strings (first argument) and an options object (second argument). It returns a `Node` object (root node).

```javascript
const node = argstree(['--hello', 'world'], {} /* options */);
console.log(node.id, node.args);
```

```text
null [ '--hello', 'world' ]
```

> [!TIP]
>
> Please see [`src/core/core.types.ts`](src/core/core.types.ts) for `Options` and `Node` types.

### Options and Commands

While they may be configured similarly, there are slight differences between _options_ and _commands_ (or _subcommands_).

1. Options always start with a dash (`-`) or a double-dash (`--`) while commands do not.
   - Options: `-foo`, `--bar`
   - Commands: `foo`, `bar`
2. Options can use assignment (`=`) while commands cannot.
   - Options: `-foo=bar`, `--foo=bar` (can use `=` once per option)
   - Commands: `foo bar` (configuration may vary)

You can configure options and commands using the `args` object option.

```javascript
const node = argstree(['--foo', 'bar', 'baz'], {
  args: {
    '--foo': {}
  }
});
const foo = node.children[0];
console.log('root', node.args);
console.log(foo.id, foo.args);
```

```text
root []
--foo [ 'bar', 'baz' ]
```

Properties of the `args` object are used to match the provided arguments. The values of these properties are also options objects used for `argstree(args, options)`.

Options and commands will read the proceeding arguments as their own unless it's another option/command or a [limit](#limits-min-max-maxread) is specified.

```javascript
const node = argstree(['--foo', 'bar', 'baz'], {
  args: {
    '--foo': {},
    bar: {}
  }
});
const foo = node.children[0];
const bar = node.children[1];
console.log(foo.id, foo.args);
console.log(bar.id, bar.args);
```

```text
--foo []
bar [ 'baz' ]
```

Using `=`, options will treat the assigned value as their own argument regardless of any matches. Commands are not recognized with an assignment.

```javascript
const node = argstree(['--foo=bar', 'bar=baz'], {
  args: {
    '--foo': {},
    bar: {}
  }
});
const foo = node.children[0];
const bar = node.children[1];
console.log(foo.id, foo.args);
console.log('bar:', bar);
```

```text
--foo [ 'bar', 'bar=baz' ]
bar: undefined
```

### Suboptions and Subcommands

Matching a suboption or a subcommand means that its parent option or command will stop receiving arguments.

```javascript
const node = argstree(['--foo', 'bar', '--foo', 'baz'], {
  args: {
    '--foo': {},
    bar: {
      // specifying the `args` object (even empty) will treat `bar` as a suboption/subcommand
      args: {}
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
- Thus, the second `--foo` argument was not recognized as an option by `bar` (not in its `args` object) and is treated as a normal argument.

> [!TIP]
>
> Suboptions may not be as useful, but they would work the same way as subcommands.
> To differentiate them, options would always start with a dash (`-`).

### Args Function

You can pass a function to the `args` option. It should return an options object, `null`, or `undefined`.

```javascript
const args = ['--foo', 'bar', '--bar', '--baz', 'foo'];
const node = argstree(args, {
  args: arg => {
    // `arg` is a string from the `args` array
    // return an options object, null, or undefined
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
> There may be cases where `__proto__` (and other hidden object properties) can be used as arguments.
>
> By default, `argstree` checks if the provided options object is a valid object and not equal to the default object prototype (`options !== Object.prototype`).
>
> If this seems to be insufficient for your case, you can handle it yourself (e.g. setting `__proto__: null` for your arguments and such).
>
> ```javascript
> argstree([], {
>   args: { __proto__: null, '--foo': {} }
> });
>
> argstree([], {
>   args: arg => {
>     return { __proto__: null, '--foo': {} }[arg];
>   }
> });
> ```

### Limits (`min`, `max`, `maxRead`)

Specify the required minimum and maximum number of arguments per _option_ or _command_.

- `min` (type: `number | null`) - Minimum number of arguments to read before the next parsed option or command.
  - An error is thrown if this option or command does not satisfy this condition.
- `max` (type: `number | null`) - Maximum number of arguments to read before the next parsed option or command.
  - An error is thrown if this option or command does not satisfy this condition.
- `maxRead` (type: `number | null`) - Maximum number of arguments to read before the next parsed option or command.
  - An error is **NOT** thrown if this option or command does not satisfy this condition.
  - If not provided, the value for `max` is used instead.

Using `min`, this means you are required a number of arguments.

```javascript
try {
  argstree([], { min: 2 });
} catch (error) {
  // NOTE: example only and not good practice!
  console.error(error + '');
}
```

The same applies to `max` and `maxRead` for the root command. For options and commands however, any arguments over the maximum limit are saved as arguments for the parent option or command.

```javascript
const node = argstree(['--foo', 'bar', 'baz'], {
  args: {
    '--foo': { max: 1 }
  }
});
const foo = node.children[0];
console.log('root', node.args);
console.log(foo.id, foo.args);
```

```text
root [ 'baz' ]
--foo [ 'bar' ]
```

This means you can set `max` to `0` and it would act like boolean flags (nodes without arguments).

```javascript
const node = argstree(['--foo', 'bar', 'baz'], {
  args: {
    '--foo': { max: 0 }
  }
});
const foo = node.children[0];
console.log('root', node.args);
console.log(foo.id, foo.args);
```

```text
root [ 'bar', 'baz' ]
--foo []
```

However, direct option assignment with `=` bypasses this check since the assigned value is always treated as an argument for the said option. And so, it will throw an error.

```javascript
try {
  argstree(['--foo=bar'], {
    args: {
      '--foo': { max: 0 }
    }
  });
} catch (error) {
  console.error(error + '');
}
```

```text
ArgsTreeError: Option '--foo' expected no arguments, but got 1.
```

For cases where you don't want to read anything as their arguments unless explicitly assigned with `=`, you can use `maxRead` which doesn't throw an error.

```javascript
const node = argstree(['--foo', 'bar', '--foo=baz', 'baz'], {
  args: {
    '--foo': { maxRead: 0 }
  }
});
const foo1 = node.children[0];
const foo2 = node.children[1];
console.log('root', node.args);
console.log(foo1.id, foo1.args);
console.log(foo2.id, foo2.args);
```

```text
root [ 'bar', 'baz' ]
--foo []
--foo [ 'baz' ]
```

Note that while you can use both `max` and `maxRead` options together, the only time the `max` option can take effect is when applying additional arguments to an alias. And even then, those arguments are likely known and fixed in length.

> [!TIP]
>
> In the last example, notice how `foo1` and `foo2` are treated as different child nodes despite having the same ID.
>
> `argstree` read 2 different options and it preserved this nuance.
> Of course, it may or may not benefit you, but it may prove to be useful for scenarios where you only want one argument per option. Example:
>
> ```sh
> curl -H <header1> -H <header2> ...
> ```

### Aliases

Specify the list of aliases mapped to arguments (alias -> option or command). Note that aliases are required to map to valid arguments specified in `args`.

```javascript
// alias string
const node = argstree(['-f', 'b', 'baz'], {
  alias: { '-f': '--foo', b: 'bar' },
  args: { '--foo': {}, bar: {} }
});
for (const child of node.children) {
  console.log(child.id, child.args);
}
```

```text
--foo []
bar [ 'baz' ]
```

You can also specify additional arguments to go along with the option or command.

```javascript
// alias string array
const node = argstree(['-f', 'baz'], {
  alias: { '-f': ['--foo', 'bar'] },
  args: { '--foo': {} }
});
const foo = node.children[0];
console.log(foo.id, foo.args);
```

```text
--foo [ 'bar', 'baz' ]
```

Aliases can also be mapped to multiple options or commands with additional arguments.

```javascript
// alias array of string arrays
const node = argstree(['-f', 'baz'], {
  alias: {
    '-f': [
      ['--foo', 'bar', 'baz'],
      ['--bar', 'foo', 'bar']
    ]
  },
  args: { '--foo': {}, '--bar': {} }
});
for (const child of node.children) {
  console.log(child.id, child.args);
}
```

```text
--foo [ 'bar', 'baz' ]
--bar [ 'foo', 'bar', 'baz' ]
```

Aliases that start with one dash (e.g. `-a`) can be used together (does not apply for command aliases, e.g. no starting dash).

```javascript
const node = argstree(['-bf', 'foo'], {
  alias: { '-f': '--foo', b: 'bar', '-b': '--baz' },
  args: { '--foo': {}, bar: {}, '--baz': {} }
});
for (const child of node.children) {
  console.log(child.id, child.args);
}
```

```text
--baz []
--foo [ 'foo' ]
```

Notice that `bar` is not matched with the `-bf` argument since its alias (`b`) does not start with a dash. Also, arguments (i.e. `foo`) are saved for the last alias option ([limits](#limits-min-max-maxread) apply).

Aliases are not limited to a single character.

```javascript
const node = argstree(['-fbab'], {
  alias: { '-f': '--foo', '-b': 'baz', '-ba': 'bar' },
  args: { '--foo': {}, bar: {}, baz: {} }
});
for (const child of node.children) {
  console.log(child.id, child.args);
}
```

```text
--foo []
bar []
baz []
```

Assignment with `=` also applies to aliases that start with a dash.

```javascript
const node = argstree(['-fb=baz'], {
  alias: {
    '-f': ['--foo', 'bar', 'baz'],
    '-b': ['--bar', 'foo']
  },
  args: { '--foo': {}, '--bar': {} }
});
for (const child of node.children) {
  console.log(child.id, child.args);
}
```

```text
--foo [ 'bar', 'baz' ]
--bar [ 'foo', 'baz' ]
```

Note that [limits](#limits-min-max-maxread) apply to these arguments and an error is thrown if the conditions are not satisfied.

### Other Options

You can specify the `id` and `name` options.

- `id` (type: `string | null`) - Unique ID for this option or command. This is never used in any internal logic, but can be useful in finding the exact node after parsing.
- `name` (type: `string | null`) - Display name of option or command for errors. If not provided, the raw argument is used as the display name when available.

### ArgsTreeError

For errors related to `argstree` parsing, an `ArgsTreeError` object is thrown which has properties including:

- `cause` string
- `raw` string argument
- `args` string array
- `options` object

You can import the class to reference in catch blocks.

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
> Please see [`src/core/error.ts`](src/core/error.ts) for more details.

### stringify

This package includes a function to stringify the `Node` object. The `stringify` function returns a string.

```javascript
import argstree, { stringify } from 'argstree';

const node = argstree(['--bar', 'baz', 'foo'], {
  args: { '--foo': { max: 1 } }
});
const tree = stringify(node);
console.log(tree);
```

```text
null (depth: 0)
└─┬ :args (total: 3)
  ├── --bar
  ├── baz
  └── foo
```

It also accepts an options object where you can specify what to show or hide from the tree string.

```javascript
const node = argstree(['--foo', 'bar', 'baz', '--bar', 'foo', '--baz'], {
  args: {
    '--foo': {},
    baz: {
      args: {
        '--bar': {},
        '--baz': {}
      }
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
├─┬ --foo (depth: 1)
│ ├─┬ :args (total: 1)
│ │ └── bar
│ └─┬ :ancestors (total: 1)
│   └── null (depth: 0)
├─┬ baz (depth: 1)
│ ├─┬ --bar (depth: 2)
│ │ ├─┬ :args (total: 1)
│ │ │ └── foo
│ │ └─┬ :ancestors (total: 2)
│ │   ├── null (depth: 0)
│ │   └── baz (depth: 1)
│ ├─┬ --baz (depth: 2)
│ │ └─┬ :ancestors (total: 2)
│ │   ├── null (depth: 0)
│ │   └── baz (depth: 1)
│ ├─┬ :ancestors (total: 1)
│ │ └── null (depth: 0)
│ └─┬ :descendants (total: 2)
│   ├── --bar (depth: 2)
│   └── --baz (depth: 2)
└─┬ :descendants (total: 4)
  ├── --foo (depth: 1)
  ├── baz (depth: 1)
  ├── --bar (depth: 2)
  └── --baz (depth: 2)
```

## License

Licensed under the [MIT License](LICENSE).
