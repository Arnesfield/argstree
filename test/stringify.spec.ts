import { expect } from 'chai';
import argstree, { stringify } from '../src/index.js';

describe('stringify', () => {
  it('should be a function', () => {
    expect(stringify).to.be.a('function');
  });

  it('should return a string', () => {
    const str = stringify(argstree([]), {});
    expect(str).to.be.a('string');
  });

  it('should handle custom id and name', () => {
    let str = stringify(argstree(['foo', 'bar'], { name: 'test' }));
    expect(str).to.equal(`null (depth: 0, name: test)
└─┬ :args (total: 2)
  ├── foo
  └── bar`);

    str = stringify(
      argstree(['foo', 'bar'], { args: { foo: { id: 'bar', name: 'baz' } } })
    );
    expect(str).to.equal(`null (depth: 0)
└─┬ bar (depth: 1, raw: foo, name: baz)
  └─┬ :args (total: 1)
    └── bar`);
  });

  it('should include args by default', () => {
    const match1 = `null (depth: 0)
└─┬ :args (total: 2)
  ├── foo
  └── bar`;
    let str = stringify(argstree(['foo', 'bar']));
    expect(str).to.equal(match1);

    str = stringify(argstree(['foo', 'bar']), { args: true });
    expect(str).to.equal(match1);

    const match2 = `null (depth: 0)
└─┬ foo (depth: 1)
  └─┬ :args (total: 1)
    └── bar`;
    str = stringify(argstree(['foo', 'bar'], { args: { foo: {} } }));
    expect(str).to.equal(match2);

    str = stringify(argstree(['foo', 'bar'], { args: { foo: {} } }), {
      args: true
    });
    expect(str).to.equal(match2);
  });

  it('should not include args when set in options', () => {
    let str = stringify(argstree(['foo', 'bar']), { args: false });
    expect(str).to.equal('null (depth: 0)');

    str = stringify(argstree(['foo', 'bar'], { args: { foo: {} } }), {
      args: false
    });
    expect(str).to.equal(`null (depth: 0)
└── foo (depth: 1)`);

    str = stringify(argstree(['foo', 'bar'], { args: { foo: {} } }), {
      args: false,
      ancestors: true
    });
    expect(str).to.equal(`null (depth: 0)
└─┬ foo (depth: 1)
  └─┬ :ancestors (total: 1)
    └── null (depth: 0)`);

    str = stringify(argstree(['foo', 'bar'], { args: { foo: {} } }), {
      args: false,
      descendants: true
    });
    expect(str).to.equal(`null (depth: 0)
├── foo (depth: 1)
└─┬ :descendants (total: 1)
  └── foo (depth: 1)`);

    str = stringify(argstree(['foo', 'bar'], { args: { foo: {} } }), {
      args: false,
      ancestors: true,
      descendants: true
    });
    expect(str).to.equal(`null (depth: 0)
├─┬ foo (depth: 1)
│ └─┬ :ancestors (total: 1)
│   └── null (depth: 0)
└─┬ :descendants (total: 1)
  └── foo (depth: 1)`);
  });

  it('should include ancestors when set in options', () => {
    let str = stringify(argstree(['foo', 'bar']), { ancestors: true });
    expect(str).to.equal(`null (depth: 0)
└─┬ :args (total: 2)
  ├── foo
  └── bar`);

    str = stringify(argstree(['foo', 'bar'], { args: { foo: {} } }), {
      ancestors: true
    });
    expect(str).to.equal(`null (depth: 0)
└─┬ foo (depth: 1)
  ├─┬ :args (total: 1)
  │ └── bar
  └─┬ :ancestors (total: 1)
    └── null (depth: 0)`);
  });

  it('should include descendants when set in options', () => {
    let str = stringify(argstree(['foo', 'bar']), { descendants: true });
    expect(str).to.equal(`null (depth: 0)
└─┬ :args (total: 2)
  ├── foo
  └── bar`);

    str = stringify(argstree(['foo', 'bar'], { args: { foo: {} } }), {
      descendants: true
    });
    expect(str).to.equal(`null (depth: 0)
├─┬ foo (depth: 1)
│ └─┬ :args (total: 1)
│   └── bar
└─┬ :descendants (total: 1)
  └── foo (depth: 1)`);
  });

  it('should include both ancestors and descendants when set in options', () => {
    let str = stringify(argstree(['foo', 'bar']), {
      ancestors: true,
      descendants: true
    });
    expect(str).to.equal(`null (depth: 0)
└─┬ :args (total: 2)
  ├── foo
  └── bar`);

    str = stringify(argstree(['foo', 'bar'], { args: { foo: {} } }), {
      ancestors: true,
      descendants: true
    });
    expect(str).to.equal(`null (depth: 0)
├─┬ foo (depth: 1)
│ ├─┬ :args (total: 1)
│ │ └── bar
│ └─┬ :ancestors (total: 1)
│   └── null (depth: 0)
└─┬ :descendants (total: 1)
  └── foo (depth: 1)`);
  });

  it('should return the stringified tree with options', () => {
    const node = argstree(
      ['-abc=0', 'test', 'foo', '--', 'foo', '--bar', 'baz'],
      {
        id: 'root',
        name: 'test',
        alias: { '-a': 'foo', '-b': 'bar', '-c': 'baz' },
        args: {
          foo: { name: 'foo-name' },
          bar: {},
          baz: { assign: true, args: { test: { max: 0 }, '--': { args: {} } } }
        }
      }
    );
    const str = stringify(node, {
      args: true,
      ancestors: true,
      descendants: true
    });
    expect(str).to.equal(`root (depth: 0, name: test)
├─┬ foo (depth: 1, alias: -a, name: foo-name)
│ └─┬ :ancestors (total: 1)
│   └── root (depth: 0, name: test)
├─┬ bar (depth: 1, alias: -b)
│ └─┬ :ancestors (total: 1)
│   └── root (depth: 0, name: test)
├─┬ baz (depth: 1, alias: -c)
│ ├─┬ :args (total: 2)
│ │ ├── 0
│ │ └── foo
│ ├─┬ test (depth: 2)
│ │ └─┬ :ancestors (total: 2)
│ │   ├── root (depth: 0, name: test)
│ │   └── baz (depth: 1, alias: -c)
│ ├─┬ -- (depth: 2)
│ │ ├─┬ :args (total: 3)
│ │ │ ├── foo
│ │ │ ├── --bar
│ │ │ └── baz
│ │ └─┬ :ancestors (total: 2)
│ │   ├── root (depth: 0, name: test)
│ │   └── baz (depth: 1, alias: -c)
│ ├─┬ :ancestors (total: 1)
│ │ └── root (depth: 0, name: test)
│ └─┬ :descendants (total: 2)
│   ├── test (depth: 2)
│   └── -- (depth: 2)
└─┬ :descendants (total: 5)
  ├── foo (depth: 1, alias: -a, name: foo-name)
  ├── bar (depth: 1, alias: -b)
  ├── baz (depth: 1, alias: -c)
  ├── test (depth: 2)
  └── -- (depth: 2)`);
  });
});
