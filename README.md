# CSS Shampoo

CSSS is a tool that detects multiple CSS selectors from your stylesheets and it works across multiple files.

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
    e.g. csss selectors -f /path/to/dirty.css,/and/other/messedup.css,http://not-clean.com/css/style.css

Options:

  -h, --help                            output usage information
  -V, --version                         output the version number
  -f, --files <files>                   Specify stylesheets to process
```