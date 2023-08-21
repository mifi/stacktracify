#!/usr/bin/env node
'use strict';
const meow = require('meow');
const stackTraceParser = require('stacktrace-parser');
const fs = require('fs-extra');
const clipboardy = require('clipboardy');
const { SourceMapConsumer } = require('source-map');


const cli = meow(`
  Usage
    $ stacktracify <map-path>

  Options
    --file, -f  (default is read from clipboard)

  Examples
    $ stacktracify /path/to/js.map --file /path/to/my-stacktrace.txt
`, {
  flags: {
    file: {
      type: 'string',
      alias: 'f',
    },
  },
});


const { file } = cli.flags;

(async () => {
  try {
    const mapPath = cli.input[0];
    if (!mapPath) cli.showHelp();
    const mapContent = JSON.parse(await fs.readFile(mapPath, 'utf-8'));
    // WTF? promise?
    const smc = await new SourceMapConsumer(mapContent);

    let str;
    if (file !== undefined) {
      str = await fs.readFile(file, 'utf-8');
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

      return line;
    })

    const stack = stackTraceParser.parse(lines.join('\n'));
    if (stack.length === 0) throw new Error('No stack found');

    if (header) console.log(header);

    stack.forEach(({ methodName, lineNumber, column }) => {
      try {
        if (lineNumber == null || lineNumber < 1) {
          console.log(`    at ${methodName || '[unknown]'}`);
        } else {
          const pos = smc.originalPositionFor({ line: lineNumber, column });
          if (pos && pos.line != null) {
            console.log(`    at ${pos.name || '[unknown]'} (${pos.source}:${pos.line}:${pos.column})`);
          }
    
          // console.log('src', smc.sourceContentFor(pos.source));
        }
      } catch (err) {
        console.log(`    at FAILED_TO_PARSE_LINE`);
      }
    });
  } catch (err) {
    console.error(err);
  }
})();
