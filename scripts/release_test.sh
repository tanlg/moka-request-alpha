#!/bin/bash

# 确保脚本抛出遇到的错误
set -e

curr_branch=`git rev-parse --abbrev-ref HEAD`
test_branch="${curr_branch}_$(date "+%Y%m%d-%H%M%S")"
next_version=${test_branch//\//-}

git checkout -b $test_branch

# update version
if [ "$(uname)" == "Darwin" ]; then
  sed -i '' -e "s/current version: .*/current version: $next_version/" README.md
  sed -i '' -e "s/version: .*/version: '$next_version',/" styleguide.config.js
  sed -i '' -e "s/:TryMoka\/moka-email.*/:TryMoka\/moka-email#$next_version/" README.md
  sed -i '' -e "s/__VERSION__ = '.*'/__VERSION__ = '$next_version'/" ./src/lib/HtmlEmailTemplate.js
else
  sed -i'' -e "s/current version: .*/current version: $next_version/" README.md
  sed -i'' -e "s/version: .*/version: '$next_version',/" styleguide.config.js
  sed -i'' -e "s/:TryMoka\/moka-email.*/:TryMoka\/moka-email#$next_version/" README.md
  sed -i'' -e "s/__VERSION__ = '.*'/__VERSION__ = '$next_version'/" ./src/lib/HtmlEmailTemplate.js
fi

# build
rm -Rf ./dist
npm run build

# push
mv ./dist/* ./
git add .
git commit -m "Release test version $next_version"
git push origin HEAD
release_hash=`git rev-parse HEAD`
git checkout $curr_branch

# finish
echo -e "\033[32m 测试版本发布完成，可以使用如下方式安装测试依赖 \033[0m"
echo "npm install git+ssh://git@gitlab.mokahr.com:TryMoka/moka-email#$release_hash"
