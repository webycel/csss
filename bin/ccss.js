#!/usr/bin/env node

var path = require('path'),
    promise = require('bluebird'),
    fs = promise.promisifyAll(require('fs')),
    pkg = require( path.join(__dirname, 'package.json') );


/* get command inputs */
var program = require('commander');

program.version(pkg.version);

program
    .command('selectors [options]')
    .description('detect all duplicate selectors of given array with files')
    .option('-f, --files [files]', 'Define all css files')
    .action(selectorsAction);

program.parse(process.argv);


/*
    handle 'selectors' command
 */
function selectorsAction(files, options) {

    var cssFiles = options.files || null;

    if(cssFiles !== null) {
        cssFiles = ['bin/dirty.css'];

        //TODO: check file paths

        var cssContent = getCSSFiles(cssFiles);

        promise.resolve(cssContent).then(function(css) {
            console.log(css[0]);
        });

    }

}



/*
    get css files
 */
function getCSSFiles(files) {

    return promise.map(files, function(filename) {

        if(fs.existsSync(filename)) {
            return fs.readFileAsync(filename, 'utf-8').then(function(contents) {
                return contents;
            });
        }

        throw new Error('CCSS: could not open ' + path.join(process.cwd(), filename));

    });

}