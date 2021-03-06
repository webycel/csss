[![NPM version](https://img.shields.io/npm/v/csss.svg?style=flat)](https://www.npmjs.com/package/csss)  
[![Build Status](https://travis-ci.org/webycel/csss.svg?branch=merging)](https://travis-ci.org/webycel/csss)
[![Dependency Status](https://img.shields.io/david/webycel/csss.svg?style=flat)](https://david-dm.org/webycel/csss)

# CSS Shampoo

![CSS Shampoo results example](/img/csss_logo.png?raw=true)

CSSS is a tool that detects multiple CSS selectors from your stylesheets and it works across multiple files. You can also merge the duplicate selectors and as a result you will get a new clean CSS file.

##Introduction - why use shampoo?

"Shampoo /ʃæmˈpuː/ is a hair care product that is used for cleaning hair. The goal of using shampoo is to remove the unwanted build-up without stripping out so much sebum as to make hair unmanageable." - <i>Wikipedia</i>

"CSS Shampoo is a CSS care product that is used for cleaning CSS. The goal of using CSS Shampoo is to remove unwanted build-up of messy CSS without stripping out so much developer's hair as to make CSS unmanageable." - <i>CSS Shampoo</i>

## Installation

```shell
npm install -g csss
```

## Usage

```
Usage: csss [options] <file, ...>
    e.g. csss -f /path/to/dirty.css,/messy/css/dir/,http://not-clean.com/css/style.css

Options:

  -h, --help                            output usage information
  -V, --version                         output the version number
  -f, --files <files>                   Specify stylesheets to process
  -m, --merge <newFileName>             merge all duplicate selectors and save to new file
```
You can pass local CSS files, a folder which contains CSS files or URLs.

##Detect duplicate selectors: results example
![CSS Shampoo results example](/img/example-results.png?raw=true)

You will get a list with all selectors which appear multiple times in your CSS file(s). The exact lines of the selector is shown and if you were searching through multiple files, you will also get the file name printed.
You can also see the amount of shared properties of each same selector, which means some selectors have exactly the same properties or are overwriting already existing ones in the file.

## Merge duplicate CSS selectors
```
Usage: e.g. csss -f /path/to/dirty.css -m newClean.css
```
Pass your CSS file(s) with the -f option and define the name of the new file which will contain the merged duplicate selectors. If it goes through successfully, it will create your newClean.css file with your cleaned up CSS.

Here is a simple merging example, both .text selectors will be combined into one
![CSS Shampoo results example](/img/merge-simple.png?raw=true)

<i>Many different scenarios of possible duplicate selectors are being considered in order to keep your CSS working and not break any layout, some examples will be published soon.</i>
