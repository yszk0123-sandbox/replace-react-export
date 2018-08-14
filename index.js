const Promise = require('bluebird');
const fs = require('fs');
const path = require('path');
const globby = require('globby');

Promise.promisifyAll(fs);

const concurrency = 10;

const replacers = [
  ({ file, content }) => {
    const PATTERN = /export default (function|class) (\w+)/;
    const matches = content.match(PATTERN);
    if (!matches) return { file, content };

    const [_, forc, name] = matches;
    return {
      file,
      content:
        content.replace(PATTERN, `${forc} ${name}`) +
        `\nexport default ${name};\n`
    };
  },
  ({ file, content }) => {
    const PATTERN = /export default connect/;
    const matches = content.match(PATTERN);
    if (!matches) return { file, content };

    const name = path
      .basename(file.replace(/\/index\.(js|jsx|ts|tsx)$/, ''))
      .split('.')[0];
    return {
      file,
      content:
        content.replace(PATTERN, `const ${name} = connect`) +
        `\nexport default ${name};\n`
    };
  }
];

const replaceFile = async file => {
  const content = await fs.readFileAsync(file, 'utf8');
  // console.log(`====================== ${file} (input) ======================`);
  // console.log(content);
  // console.log(`====================== ${file} (output) =====================`);
  const output = replacers.reduce((s, f) => f(s), { file, content }).content;
  // console.log(output);
  await fs.writeFileAsync(file, output, 'utf8');
};

const exec = async pattern => {
  await Promise.all(
    Promise.resolve(globby(pattern)).map(replaceFile, { concurrency })
  );
};

const glob = [
  './src/**/*.{ts,tsx}'
];
exec(glob)
  .then(console.log)
  .catch(console.error);
