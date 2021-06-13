#!/usr/bin/env node
'use strict';
const meow = require('meow');
const stackTraceParser = require('stacktrace-parser');
const fs = require('fs-extra');
const {basename, join, resolve} = require('path');
const {lstat} = require('fs').promises;
const clipboardy = require('clipboardy');
const { SourceMapConsumer } = require('source-map');

const WARNINGS = {
  noPosition: '❓',
  noSmc: '🌍'
};

function formatStackFrame(frame, decoration = null) {
  const { file, methodName, lineNumber, column } = frame;
  const parts = [];
  if (decoration) {
    parts.push(`[${decoration}] `);
  }
  parts.push('at ');
  if (methodName) {
    parts.push(methodName);
  }
  if (file) {
    parts.push(' (');
    parts.push(file);
    if (lineNumber && column) {
      parts.push(':');
      parts.push(column);
      parts.push(':');
      parts.push(lineNumber);
    }
    parts.push(')');
  }
  
  return parts.join('');
}

class SourceMapRegistry {
  // Map of "basename" -> "fullpath"
  sourceMapFiles = new Map();
  // Map of "basename" -> "source map consumer for source map file"
  sourceMaps = new Map();

  async getSourceMapConsumer(path) {
    const key = basename(path) + '.map';
    const fullPath = this.sourceMapFiles.get(key);
    
    let smc = this.sourceMaps.get(key);
    if (!smc && fullPath) {
      // Acquire smc
      const mapContent = JSON.parse(await fs.readFile(fullPath, 'utf-8'));
      smc = await new SourceMapConsumer(mapContent);
      this.sourceMaps.set(key, smc);
    }
    return smc;
  }

  async initialize(path) {
    this.sourceMapFiles = new Map();
    this.sourceMaps = new Map();

    const stat = await fs.lstat(path);
    if (stat.isFile()) {
      this.sourceMapFiles.set(basename(path), path);
    } else {
      const found = await this.findFiles(path);
      found.forEach(each => this.sourceMapFiles.set(basename(each), each));
    }

    if (debug) {
      console.log('[DEBUG] Found the following files:');
      for (var [key, value] of this.sourceMapFiles.entries()) {
        console.log(`- ${value}`);
      }
      console.log('');
    }
  }

  async findFiles(folder) {
    const results = []

    // Get all files from the folder
    let items = await fs.readdir(folder);

    // Loop through the results, possibly recurse
    for (const item of items) {
        try {
            const fullPath = join(folder, item)

            if (
                fs.statSync(fullPath).isDirectory()) {

                // Its a folder, recursively get the child folders' files
                results.push(
                    ...(await this.findFiles(fullPath))
                )
            } else {
                // Filter by the file name pattern, if there is one
                if (item.search(new RegExp('.*\.js\.map', 'i')) > -1) {
                    results.push(resolve(fullPath))
                }
            }
        } catch (error) {
            // Ignore!
        }
    }

    return results
  }
}

const cli = meow(`
  Usage
    $ stacktracify <map-path>

  Options
    --file, -f  (default is read from clipboard)
    --debug, -d (defaults to false)
    --legend, -l (displays legend for parsing hints, eg ${Object.keys(WARNINGS).join(', ')} - disabled as default)

  Examples
    $ stacktracify /path/to/source-maps --file /path/to/my-stacktrace.txt --debug --legend
`, {
  flags: {
    file: {
      type: 'string',
      alias: 'f',
    },
    debug: {
      type: 'boolean',
      alias: 'd',
    },
    legend: {
      type: 'boolean',
      alias: 'l',
    },
  },
});


var { file, debug, legend } = cli.flags;

(async () => {
  try {
    // Determine path of source maps
    const mapPath = cli.input[0];
    if (!mapPath) cli.showHelp();

    // Create registry
    const registry = new SourceMapRegistry();
    await registry.initialize(mapPath);

    // Acquire stacktrace
    let str;
    if (file !== undefined) {
      str = await fs.readFile(file, 'utf-8');
    } else {
      str = await clipboardy.read();
    }

    // Parse stacktrace
    const stack = stackTraceParser.parse(str);
    if (stack.length === 0) throw new Error('No stack found');

    // Print "header" (usually message of what went wrong, eg. message of Error)
    const header = str.split('\n').find(line => line.trim().length > 0);
    if (header && !header.includes(stack[0].file)) {
      console.log(header);
    }
  
    // Translate stacktrace
    const warnings = [];
    for (const each of stack) {
      const { file, methodName, lineNumber, column } = each;
      try {
        if (lineNumber == null || lineNumber < 1) {
          console.log(`    at ${methodName || ''}`);
        } else {
          const smc = await registry.getSourceMapConsumer(file);
          if (smc && typeof smc.originalPositionFor === 'function') {
            const pos = smc && smc.originalPositionFor({ line: lineNumber, column }) || undefined;
            if (pos && pos.line != null) {
              console.log(`    at ${pos.name || ''} (${pos.source}:${pos.line}:${pos.column})`);
            } else {
              console.log(`    ${formatStackFrame(each, legend && WARNINGS.noPosition)}`);
              warnings.push(WARNINGS.noPosition);
            }
          } else {
            console.log(`    ${formatStackFrame(each, legend && WARNINGS.noSmc)}`);
            warnings.push(WARNINGS.noSmc);
          }
  
        }
      } catch (err) {
        console.log(`    at FAILED_TO_PARSE_LINE`, err);
      }
    }

    if (warnings.length > 0) {
      console.log('\nLegend:\n-------');
      console.log(`[${WARNINGS.noPosition}] -> Indicates that a the particular stack frame could not be located in the source map`);
      console.log(`[${WARNINGS.noSmc}] -> Indicates that a source map could not be located for the stack frame`);
    }
  } catch (err) {
    console.error(err);
  }
})();
