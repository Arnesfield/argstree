# argstree

[![npm][npm-img]][npm-url]
[![Node.js CI][ci-img]][ci-url]

[npm-img]: https://img.shields.io/npm/v/argstree.svg
[npm-url]: https://www.npmjs.com/package/argstree
[ci-img]: https://github.com/Arnesfield/argstree/workflows/Node.js%20CI/badge.svg
[ci-url]: https://github.com/Arnesfield/argstree/actions?query=workflow%3A"Node.js+CI"

Parse arguments into a tree structure.

## Features

- **argstree** is meant to be a minimal and less opinionated argument parser.
- Pure vanilla JavaScript with no external dependencies ([ESM only](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c)).
- Preserves the order and structure of the provided arguments using a [tree structure](#tree-structure).
- Variadic arguments by default unless [range](#optionsmin) options are specified.
- Includes a [strict mode](#optionsstrict) for unrecognized options.
- Can recognize and split combined [aliases](#optionsalias) (e.g. from `-abcd` to `-a`, `-bc`, `-d`).
- Can recognize [assigned values](#optionsassign) for options and commands (e.g. `--option=value`, `command=value`).
- Allows [dynamic parsing](#optionsparser) of values, options, and commands.
- Double-dash (`--`) is not treated as anything special but can be configured to be a non-strict subcommand.

## Limitations

- No other value data types other than strings.
- No automated help message generation.
- No asynchronous parsing.
- Expects shell commands as arguments (like [`process.argv.slice(2)`](https://nodejs.org/docs/latest/api/process.html#processargv)) and does not parse quoted strings (e.g. `schema.parse(['--option="Hello World"'])`). For parsing strings into command-line arguments, you can use packages like [shell-quote](https://www.npmjs.com/package/shell-quote) and [shlex](https://www.npmjs.com/package/shlex).
- Only parses and transforms arguments into a tree structure. It is still up to the consuming program to read and decide how to use the parsed arguments. This means more code to write and maintain just for arguments parsing and may not be worth the time and effort if you really only need a straightforward object of parsed options.

If you're looking to loop through arguments for more control, then **argstree** might be for you. Otherwise, you can check out more popular packages like [commander](https://www.npmjs.com/package/commander), [yargs](https://www.npmjs.com/package/yargs), [minimist](https://www.npmjs.com/package/minimist), [cac](https://www.npmjs.com/package/cac), and [many more](https://www.npmjs.com/search?q=keywords%3Aargs%2Cargv).

## Install

```sh
npm install argstree
```

## Usage

For the sake of brevity, not all features/properties are included in this document and it is advised to view the referenced types and code documentation to learn more. You can also check out the [examples](examples) directory for more detailed usage.

### Schema

The `option()` and `command()` functions both return a [`Schema`](src/schema/schema.types.ts) object.

```js
import command, { option } from 'argstree';
```

#### schema.option()

Type: `(arg: string, options?: Options) => this`

Adds an option. The argument is overwritten if it already exists.

#### schema.command()

Type: `(arg: string, options?: Options) => this`

Adds a command. The argument is overwritten if it already exists.

#### schema.resolve()

Type: `(key: string, value?: string | null) => ResolvedArg | undefined`

Gets the [configuration](src/types/schema.types.ts) for the matched options and commands. The `key` is checked to have a value (e.g. `--option=value`) unless `value` is provided and not `undefined`. If the argument cannot be resolved, this returns either `undefined` or the [`Split`](#split) result if the argument is a short option.

#### schema.parse()

Type: `(args: readonly string[]) => Node`

Parses arguments into a tree structure.

This returns the root [`Node`](src/types/node.types.ts) which is a tree representation of the parsed arguments.

### Tree Structure

The example below introduces some of the available [options](#options), but the main idea here is that the structure of the resulting **node** would closely resemble the provided arguments depending on the schema configuration.

```js
import command, { option } from 'argstree';

// `option()` can also create a schema,
// but `command()` is more suitable as the root schema

// creates a schema that expects at least 1 argument
const cmd = command({ min: 1, strict: true });

// adds an option '--input' that expects exactly 1 argument
cmd.option('--input', { min: 1, max: 1, alias: '-i' });

// adds a command 'run-script' that expects exactly 1 argument
// and will then take over the parsing of the rest of the arguments once matched
cmd.command('run-script', {
  min: 1,
  max: 1,
  alias: ['run', 'rum', 'urn'],
  init(run) {
    // `run` is a schema for the 'run-script' subcommand
    run.option('--if-present', { max: 0 });
    run.command('--', { strict: false });
  }
});

// parse arguments
const args = '--input src dist -i cli.js bin run --if-present build -- -h -i';
const root = cmd.parse(args.split(' '));

// traverse and log all nodes
const nodes = [root];
for (const node of nodes) {
  const prefix = '  '.repeat(node.depth);
  console.log('%s%s (%s):', prefix, node.id, node.type, node.args);
  nodes.push(...node.children);
}
```

```text
null (command): [ 'dist', 'bin' ]
  --input (option): [ 'src' ]
  null (value): [ 'dist' ]
  --input (option): [ 'cli.js' ]
  null (value): [ 'bin' ]
  run-script (command): [ 'build' ]
    --if-present (option): []
    run-script (value): [ 'build' ]
    -- (command): [ '-h', '-i' ]
      -- (value): [ '-h', '-i' ]
```

Option and command schemas differ only in some of the default values for the configuration options. At their core, they are the same and both can be configured similarly.

### Options

All options are optional.

#### options.id

Type: `string | null`

The option or command ID that is set to `Node.id`. If not provided, the default value is the `Node.key`.

#### options.name

Type: `string | null`

The option or command display name that is set to `Node.name` and is used for [`ParseError`](#parseerror) messages. If not provided, the default value is the `Node.key`.

#### options.args

Type: `string | string[]`

The initial arguments for the option or command. Strict mode does not apply to these values. Note that this is not a default value and additional arguments will be added on top of this list.

#### options.min

Type: `number`

The minimum number of arguments to read before the next parsed option or command.

A [`ParseError`](#parseerror) is thrown if the option or command does not satisfy this condition.

#### options.max

Type: `number`

The maximum number of arguments to read before the next parsed option or command. Arguments over the maximum limit are saved to the parent option or command instead.

[Assigned values](#optionsassign) are always treated as arguments for the option or command regardless of the [`max`](#optionsmax) option.

A [`ParseError`](#parseerror) is thrown if the option or command does not satisfy this condition or if the parent option or command cannot accept any more arguments.

#### options.alias

Type: `string | (string | string[])[]`

The alias, list of aliases, or list of aliases with arguments for the option or command.

```js
// root schema cannot have an alias
const cmd = command();

// single alias
cmd.option('--help', { alias: '-h' });

// multiple aliases
cmd.command('run-script', { alias: ['run', 'rum', 'urn'] });

// multiple aliases with additional arguments
cmd.option('--force', { alias: ['-f', ['--no-force', '0']] });

const root = cmd.parse(['-h', '-f', '--no-force', 'run', 'build']);

for (const node of [root].concat(root.children)) {
  console.log(node.id, node.alias, node.args);
}
```

```text
null null []
--help -h []
--force -f []
--force --no-force [ '0' ]
run-script run [ 'build' ]
```

Aliases that start with a single dash (`-`) can be grouped together after a single dash (e.g. aliases `-a`, `-b`, and `-c` can be written as `-abc`).

If the option or command requires a value, it must be the last option when its alias is grouped together with other aliases, otherwise a [`ParseError`](#parseerror) is thrown.

```js
const root = command()
  .option('input', { alias: '-i' })
  .option('--interactive', { alias: '-in' })
  .option('--dry-run', { alias: '-n' })
  .parse(['-nini', 'src', 'index.js']);

for (const node of root.children) {
  console.log(node.id, node.alias, node.args);
}
```

```text
--dry-run -n []
--interactive -in []
input -i [ 'src', 'index.js' ]
```

#### options.read

Type: `boolean`\
Default: `true`

When disabled, the option or command will not accept any arguments (except for [assigned values](#optionsassign)) and are instead saved to the parent option or command if it can accept arguments. Otherwise, a [`ParseError`](#parseerror) is thrown and the argument is treated as an unrecognized option or command.

#### options.assign

Type: `boolean`\
Default: `true` for `option` types and `false` for `command` types

Determines if the option or command can have an assigned value using the equal sign (e.g. `--option=value`, `command=value`). Otherwise, the option or command will not be matched and the argument is treated like a normal value.

```js
// root schema cannot assigned values
const cmd = command();

// cannot read arguments but can assign a value
cmd.option('--input', { read: false, alias: '-i' });

// can read arguments but cannot assign a value
cmd.option('--output', { assign: false });

// cannot read arguments nor assign a value
cmd.option('--quiet', { read: false, assign: false, alias: '-q' });

const args = '-i=index.js src --output dist lib --quiet=0 -q=0 --quiet yes';
const root = cmd.parse(args.split(' '));

for (const node of [root].concat(root.children)) {
  console.log(node.id, node.type, node.args);
}
```

```text
null command [ 'src', 'yes' ]
--input option [ 'index.js' ]
null value [ 'src' ]
--output option [ 'dist', 'lib', '--quiet=0', '-q=0' ]
--quiet option []
null value [ 'yes' ]
```

#### options.strict

Type: `boolean`\
Default: `false`

When enabled, a [`ParseError`](#parseerror) is thrown for unrecognized arguments that look like an option (e.g. `-o`, `--option`). Can be one of the following values:

- `true` - Enable strict mode for both self and descendants.
- `false` - Disable strict mode for both self and descendants.
- `self` - Enable strict mode for self but disable it for descendants.
- `descendants` - Disable strict mode for self but enable it for descendants.

Note that string values returned by the [`parser`](#optionsparser) callback are excluded from the strict mode checks.

#### options.leaf

Type: `boolean`

When `true`, parsed nodes will be treated as leaf nodes (no child nodes). When `false`, parsed nodes will be treated as parent nodes (has child nodes).

If not provided, this option defaults to `true` for `option` types or if there are no options or commands configured for the schema. Otherwise, this is `false`.

#### options.init()

Type: `(schema: Schema) => void`

Called only once when the schema is created and is used to gain a reference to the schema object to add options and/or commands.

#### options.parser()

Type: `(arg: Arg, ctx: Context) => XOR<Schema, Value> | XOR<Schema, Value>[] | boolean | void`

Serves as a fallback for parsed arguments that cannot be recognized using the list of configured options and commands. Can have the following return values:

- `Schema`s - Treated as options or commands. If the option or command (or for arrays, the last option or command) is a non-leaf node, the next arguments will be parsed using that node.
- `Value`s - Treated as value arguments and will be saved to either the current parent or child option or command depending on their provided options.
- `false` - The argument is ignored as if it was never parsed.
- Empty array, `true`, `undefined` - Fallback to the default behavior where the parsed argument may be treated either as a value or an unrecognized argument depending on the provided options.

```js
import command, { isOption, option } from 'argstree';

const cmd = command({
  strict: true,
  parser(arg) {
    // return an option when '--option' is matched
    if (arg.key === '--option') {
      return option({ args: arg.value });
    }
    // allow negative numbers in strict mode
    if (isOption(arg.key, 'short') && !isNaN(Number(arg.key))) {
      return { args: arg.key, strict: false };
    }
  }
});

const root = cmd.parse(['--option=value', '-1']);

for (const node of root.children) {
  console.log(node.id, node.type, node.args);
}
```

```text
--option option [ 'value', '-1' ]
```

### Callback Options

Type: `(ctx: Context) => void`

Callback options are fired at specific events during parsing. Some options for the node can be overridden by modifying the properties of the [`Context`](src/types/options.types.ts) object.

#### options.onCreate()

Called when the node is created with its initial arguments.

#### options.onArg()

Called when the node receives an argument.

#### options.onChild()

Called when the node receives an option or command child node.

#### options.onDepth()

Called when all nodes of the same depth have been created.

#### options.onData()

Called after the node has received all arguments and direct child nodes that it can have.

#### options.onBeforeValidate()

Called once all nodes have been parsed and before any validation checks.

#### options.onValidate()

Called after throwing any validation errors for the node.

#### options.onError()

Type: `(error: ParseError, ctx: Context) => boolean | void`

Called when the node receives a [`ParseError`](#parseerror). The error is ignored if `false` is returned, otherwise it is thrown during validation.

```js
const logLevels = ['info', 'warn', 'error', 'debug'];

const cmd = command();

// immediately logs the help text and exit the process once parsed
cmd.option('--help', {
  onCreate() {
    console.log(`Usage: cmd --log-level <${logLevels.join(' | ')}>`);
    process.exit();
  }
});

// show version only after other nodes have been created (to prioritize '--help')
cmd.option('--version', {
  read: false,
  onDepth() {
    console.log('v2.0.0');
    process.exit();
  }
});

// accepts exactly 1 argument that is then checked against
// a list of accepted values after the validation checks for the node
cmd.option('--log-level', {
  min: 1,
  max: 1,
  onValidate(ctx) {
    const value = ctx.node.args[0];
    if (!logLevels.includes(value)) {
      throw new Error(
        `Option '${ctx.node.id}' argument '${value}' is invalid. ` +
          `Allowed choices are: ${logLevels.join(', ')}`
      );
    }
  }
});

const argsList = [
  '--log-level',
  '--log-level log',
  '--log-level log --version --help'
];

for (const args of argsList) {
  try {
    cmd.parse(args.split(' '));
  } catch (error) {
    console.error(String(error));
  }
}
```

```text
ParseError: Option '--log-level' expected 1 argument, but got 0.
Error: Option '--log-level' argument 'log' is invalid. Allowed choices are: info, warn, error, debug
Usage: cmd --log-level <info | warn | error | debug>
```

### Node Metadata

**Nodes** can have additional metadata that can be set to `Node.meta`.

```ts
interface Metadata {
  key: string;
}

const cmd = command<Metadata>({
  parser(arg) {
    // format: --{id}:{key}={value}
    const match = arg.key.match(/^--(.+?):(.+)$/);
    if (!match) return;

    const [, id, key] = match;
    return option({
      id,
      args: arg.value,
      onCreate(ctx) {
        ctx.node.meta = { key };
      }
    });
  }
});

const root = cmd.parse([
  '--file:package.json',
  '--ext:.js=.mjs',
  '--map:@scope/[name]=dist/[name]'
]);

for (const node of root.children) {
  console.log(node.id, node.meta?.key, node.args);
}
```

```text
file package.json []
ext .js [ '.mjs' ]
map @scope/[name] [ 'dist/[name]' ]
```

### ParseError

For errors related to parsing and misconfiguration, a `ParseError` is thrown.

```js
import command, { ParseError } from 'argstree';

const cmd = command({ min: 1, max: 1, strict: true })
  .option('--input', { min: 1, max: 1, alias: '-i' })
  .option('--force', { name: 'FORCE', max: 0, alias: '-f' })
  .command('start', { read: false });

const argsList = [
  '--output',
  '-efghi index.js',
  '--input index.js',
  'lib -i -f=0',
  '-i index.js lib -f=0',
  'lib start index.js'
];

for (const args of argsList) {
  try {
    cmd.parse(args.split(' '));
  } catch (error) {
    if (error instanceof ParseError) {
      console.error(error.code, error.node.id, error.message);
    }
  }
}
```

```text
UNRECOGNIZED_ARGUMENT null Unrecognized option: --output
UNRECOGNIZED_ALIAS null Unrecognized aliases: -(e)f(gh)i
RANGE null Expected 1 argument, but got 0.
RANGE --input Option '--input' expected 1 argument, but got 0.
RANGE --force Option 'FORCE' expected 0 arguments, but got 1.
UNRECOGNIZED_ARGUMENT start Command 'start' expected no arguments, but got: index.js
```

### Utilities

This package includes some utility functions that can be useful during and after parsing.

#### flatten

Type: `(node: Node) => Node[]`

Flattens the node tree structure into an array of nodes.

#### isOption

Type: `(arg: string, type?: 'long' | 'short') => boolean`

Determines if the argument looks like an option. By default, both `long` (e.g. `--option`) and `short` (e.g. `-a`, `-abc`) options are valid unless the specific type of option is provided.

#### split

Type: `(value: string, matches: string[]) => Split`

Splits the string based on the provided matches in order.

```js
import { split } from 'argstree';

console.log(split('foobarbaz', ['ba', 'foo']));
```

```text
{
  items: [
    { value: 'foo', remainder: false },
    { value: 'ba', remainder: false },
    { value: 'r', remainder: true },
    { value: 'ba', remainder: false },
    { value: 'z', remainder: true }
  ],
  values: [ 'foo', 'ba', 'ba' ],
  remainders: [ 'r', 'z' ]
}
```

## License

Licensed under the [MIT License](LICENSE).
