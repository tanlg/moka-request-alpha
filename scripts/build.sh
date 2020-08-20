#!/bin/sh
# 请勿直接执行此脚本，如果要执行请在项目根目录下执行，否则相对路径会有问题

# 确保脚本抛出遇到的错误
set -e

rm -Rf dist

# 国际化处理
npm run lingui:extract
npm run lingui:compile

# build
npm run microbundle

rsync -raq --exclude=_build --exclude=*.json src/lingui dist/
