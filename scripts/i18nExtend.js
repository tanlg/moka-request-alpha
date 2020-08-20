/**
 * 用于生成国际化所需的字典，替代lingui extract得到的json文件
 *
 * 为什么要有这个脚本？
 * lingui extract得到的json文件除了翻译之外还包含了所在文件、所在行数等信息。
 * 这些信息其实与翻译无关，存在的意义是方便人工校对，但这带来了一个非常严重的副作用，
 * 那就是太容易产生git冲突了。
 * 以“所在行数”这个信息为例，只要修改了代码这个信息几乎肯定会变，此时即使对代码
 * 的改动与国际化没有任何关系，也一样会导致国际化的json冲突。而且json文件的冲突动辄上千行
 * 解决起来非常麻烦。
 * 所以，希望能有一种精简格式，只保留翻译需要的内容，一是可以减小体积，二是可以减少冲突。
 *
 * 这个脚本能做什么？
 * 这个脚本的目的是扩展lingui extract和lingui compile，引入一种新的精简数据格式文件解决上述问题，
 * 同时将原来的json文件放入gitignore中，不再追踪版本。
 * 增加新脚本后，使用方法上与原来的方式保持一致，对开发人员来说尽量透明。
 *
 * 新的字典格式为csv（方便翻译人员直接修改），字段的间隔符默认为\t（不用,是因为翻译字符串里可能包含,）
 *
 * 例如：
 * id key English Chinese
 * efb68b65 你好 Hello 你好
 *
 * 下面是个字段的解释
 *
 * id - id是为了方便人工校验，格式为key的SHA1哈希值前8个字符（类似git的commit short hash）
 * key - key是lingui的message key。
 * English - 英文翻译
 * Chinese - 中文翻译。大多数时候我们不用填这个，会自动fallback到key，个别情况下需要填。
 */

import fs from 'fs';
import crypto from 'crypto';

// csv 文件必须在开头加这个，否则mac会乱码
const BOM = '\ufeff';

/**
 * lingui extract前执行，如果没有json则生成一个空的，避免报错
 *
 * @param {object} options
 * @param {string} options.engJsonPath - 英文messages.json的路径
 * @param {string} options.chnJsonPath - 中文messages.json的路径
 */
function preExtract({ engJsonPath, chnJsonPath }) {
  [engJsonPath, chnJsonPath].forEach((path) => {
    if (!fs.existsSync(path)) {
      fs.writeFileSync(path, JSON.stringify({}));
    }
  });
}

 /**
  * lingui extract后执行，生成字典文件
  *
  * @param {object} options
  * @param {string} options.dictPath - 字典文件的路径
  * @param {string} options.engJsonPath - 英文messages.json的路径
  * @param {string} options.chnJsonPath - 中文messages.json的路径
  * @param {string} options.sep - csv文件的分隔符
  */
async function postExtract({ dictPath, engJsonPath, chnJsonPath, sep }) {
  const dictKeySet = new Set();
  let endWithNewLine = false;

  if (fs.existsSync(dictPath)) {
    fs.readFileSync(dictPath, 'utf8')
    .split('\n')
    .forEach((line) => {
      if (!line) {
        endWithNewLine = true;
      } else {
        const [, key] = line.split(sep);
        dictKeySet.add(key);
        endWithNewLine = false;
      }
    });
  }

  const keyToEngInfo = JSON.parse(fs.readFileSync(engJsonPath));
  const keyToChnInfo = JSON.parse(fs.readFileSync(chnJsonPath));

  const newLines = [];
  let existedCount = 0;
  for (const key in keyToEngInfo) {
    if (dictKeySet.has(key)) {
      existedCount++;
      continue;
    }
    const sha1 = crypto.createHash('sha1');
    sha1.update(key);
    newLines.push([
      sha1.digest('hex').substr(0, 8),
      key,
      keyToEngInfo[key].translation,
      keyToChnInfo[key].translation,
    ].join(sep));
  }

  if (!fs.existsSync(dictPath)) {
    const header = ['id', 'key', 'english', 'chinese'].join(sep);
    fs.writeFileSync(dictPath, BOM + header);
    endWithNewLine = false;
  }

  if (newLines.length > 0) {
    fs.appendFileSync(dictPath, (endWithNewLine ? '' : '\n') + newLines.join('\n'));
  }

  console.log(`Done, ${dictPath}, add: ${newLines.length}, ignore: ${existedCount}`);
}

/**
 * lingui compile之前，将字典中的翻译填充到原来的json里
 *
 * @param {object} options
 * @param {string} options.dictPath - 字典文件的路径
 * @param {string} options.engJsonPath - 英文messages.json的路径
 * @param {string} options.chnJsonPath - 中文messages.json的路径
 * @param {string} options.sep - csv文件的分隔符
 */
async function preCompile({ dictPath, engJsonPath, chnJsonPath, sep }) {
  const keyToInfo = {};
  if (fs.existsSync(dictPath)) {
    fs.readFileSync(dictPath, 'utf8')
    .split('\n')
    .forEach((line) => {
      if (line) {
        const [, key, eng, chn] = line.split(sep);
        keyToInfo[key] = [eng, chn];
      }
    });
  }

  const jsonPaths = [engJsonPath, chnJsonPath];
  for (const i in jsonPaths) {
    const json = JSON.parse(fs.readFileSync(jsonPaths[i]));
    let updatedCount = 0;

    for (const key in json) {
      if (!keyToInfo[key] || !keyToInfo[key][i] || !keyToInfo[key][i].trim() || keyToInfo[key][i] === json[key].translation) {
        continue;
      }
      json[key].translation = keyToInfo[key][i];
      updatedCount++;
    }

    if (updatedCount) {
      fs.writeFileSync(jsonPaths[i], JSON.stringify(json, null, 2));
    }

    console.log(`Done, ${jsonPaths[i]}, updated: ${updatedCount}`);
  }
}

/**
 * entry point
 *
 * 参数说明
 * mode {string} - post-extract 或 pre-compile
 * dictPath {string} - 字典文件的路径
 * engJsonPath {string} - 英文messages.json的路径
 * chnJsonPath {string} - 中文messages.json的路径
 */
async function main() {
  const [, , mode, dictPath, engJsonPath, chnJsonPath] = process.argv;
  const sep = '║';

  switch (mode) {
    case 'pre-extract':
      return preExtract({ engJsonPath, chnJsonPath });
    case 'post-extract':
      return await postExtract({ dictPath, engJsonPath, chnJsonPath, sep });
    case 'pre-compile':
      return await preCompile({ dictPath, engJsonPath, chnJsonPath, sep });
    default:
      throw new Error(`Unknown mode: ${mode}`);
  }
}

main()
.then(() => process.exit(0))
.catch((e) => {
  console.log(e);
  process.exit(-1);
});
