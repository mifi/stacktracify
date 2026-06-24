#!/usr/bin/env node

import { readFile } from 'fs/promises';
import meow from 'meow';
import stackTraceParser from 'stacktrace-parser';
import clipboardy from 'clipboardy';
import { SourceMapConsumer } from 'source-map';


const cli = meow(`
  Usage
    $ stacktracify <map-path>

  Options
    --file, -f  (default is read from clipboard)

  Examples
    $ stacktracify /path/to/js.map --file /path/to/my-stacktrace.txt
`, {
  importMeta: import.meta,
  flags: {
    file: {
      type: 'string',
      shortFlag: 'f',
    },
  },
});


const { file } = cli.flags;

const mapPath = cli.input[0];
if (!mapPath) cli.showHelp();
const mapContent = JSON.parse(await readFile(mapPath, 'utf8'));
const smc = await new SourceMapConsumer(mapContent);

let str;
if (file !== undefined) {
  str = await readFile(file, 'utf8');
} else {
  str = await clipboardy.read();
}

let [header, ...lines] = str.trim().split(/\r?\n/);

lines = lines.map((line) => {
  // stacktrace-parser doesn't seem to support stacktrace lines like this:
  // index-12345678.js:1:2 a
  const match = line.match(/^(\s+)([^\s]+:\d+:\d+)\s+([^\s]+)$/);
  if (match) {
    return `${match[1]}at ${match[3]} (${match[2]})`;
  }

  // handle lines with no method name: '    file:line:col' or '    file:line:col '
  const matchNoMethod = line.match(/^(\s+)([^\s]+:\d+:\d+)\s*$/);
  if (matchNoMethod) {
    return `${matchNoMethod[1]}at <unknown> (${matchNoMethod[2]})`;
  }

  return line;
})

const stack = stackTraceParser.parse(lines.join('\n'));
if (stack.length === 0) throw new Error('No stack found');

if (header) console.log(header);

try {
  stack.forEach(({ methodName, lineNumber, column }) => {
    try {
      if (lineNumber == null || lineNumber < 1) {
        console.log(`    at ${methodName || '[unknown]'}`);
      } else {
        const pos = smc.originalPositionFor({ line: lineNumber, column });
        if (pos && pos.line != null) {
          console.log(`    at ${pos.name || methodName || '[unknown]'} (${pos.source}:${pos.line}:${pos.column})`);
        } else {
          console.log(`    at ${methodName || '[unknown]'} (line ${lineNumber}:${column})`);
        }
      }
    } catch (err) {
      console.log(`    at FAILED_TO_PARSE_LINE`);
    }
  });
} finally {
  smc.destroy();
}
