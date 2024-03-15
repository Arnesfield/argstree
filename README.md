# argstree

[![npm](https://img.shields.io/npm/v/argstree.svg)](https://www.npmjs.com/package/argstree)
[![Node.js CI](https://github.com/Arnesfield/argstree/workflows/Node.js%20CI/badge.svg)](https://github.com/Arnesfield/argstree/actions?query=workflow%3A"Node.js+CI")

Parse arguments into a tree structure.

```javascript
import argstree, { stringify } from 'argstree';

// args: hello --world
const node = argstree(process.argv.slice(2), {} /* options */);
const tree = stringify(node, {} /* options */);
console.log(tree);
```

```text
null (depth: 0)
└─┬ :args (total: 2)
  ├── hello
  └── --world
```

> [!NOTE]
>
> **WIP:** README is still a work in progress.

## Motivation

`argstree` is meant to be a _less_ opinionated argument parser that aims to preserve the structure of the provided arguments when they are parsed. This way, more information about the input arguments are known to the consumers (developers) which should give them enough control on how they intend to read these inputs to suit their needs.

## Install

```sh
npm install argstree
```

## Usage

Import the module ([ESM only](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c)):

```javascript
import argstree from 'argstree';
```

## `argstree` Options

Pass in options for `argstree(args, options)`. Note that all options are optional.

### id

Type: `string`<br>
Default: The parsed argument.

Unique ID for this option or command.

### name

Type: `string`

Display name of option or command for errors.

If not provided, the raw argument is used as the display name when available.

### min

Type: `number | null`

Minimum number of arguments to read before the next parsed option or command.

An error is thrown if this option or command does not satisfy this condition.

### max

Type: `number | null`

Maximum number of arguments to read before the next parsed option or command.

An error is thrown if this option or command does not satisfy this condition.

### maxRead

Type: `number | null`

Maximum number of arguments to read before the next parsed option or command.

An error is **NOT** thrown if this option or command does not satisfy this condition.

If not provided, the value for [max](#max) is used instead.

### alias

Type: `{ [alias: string]: string | [string, ...string[]] | null | undefined; }`

List of aliases mapped to arguments.

For multiple alias arguments, use a string array where the first element string is a valid option or command and the rest are arguments for the said option or command.

### args

Type: `{ [arg: string]: Options | null | undefined; }` or `(arg: string) => Options | null | undefined`

The arguments to match that will be parsed as options or commands.

## License

Licensed under the [MIT License](LICENSE).
