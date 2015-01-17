#!/usr/bin/env node

var path = require('path');
var express = require('express');
var contentDisposition = require('content-disposition');
var pkg = require( path.join(__dirname, 'package.json') );

var program = require('commander');

program.version(pkg.version)
       .option('-m, --message <message>', 'Message to be printed', String)
       .parse(process.argv);

if(typeof process.message !== 'undefined') {
    console.log(program.message);
} else {
    console.log('Hello M&S!');
}