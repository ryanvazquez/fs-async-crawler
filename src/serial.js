const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const micromatch = require('micromatch');

/* 

  Implements a serial iterator approach. Given a maximum recursion depth, 
  fsCrawlerSerial will start at the root directory, recursing through sub directories,
  and collecting files into a flattened array. fsCrawlerSerial will wait until 
  the previous recursive call has completed or reached its maximum before continuing.

  options:
    maxDepth: number
      - If no maxDepth is specified, fsCrawlerSerial will crawl the entire directory tree from the root. 
      - If invoked high enough in the directory tree, this could cause a stackoverflow.
    ignorePaths: <array>
      - An array of regular expressions. Ignores node_modules by default
    match: <array>
      - An array of glob pattern strings. fsCrawlerSerial will evaluate each file against the glob,
        collecting only the filePaths that return true
      - If no match is provided, fsCrawlerSerial will match every file it encounters.
*/

function fsCrawlerSerial(root, options, finalCallback){
  const defaultOptions = {
    ignorePaths: [/node_modules/]  
  };

  finalCallback = typeof options === 'function' ? options : finalCallback;
  options = typeof options === 'function' ? defaultOptions : { ...defaultOptions, ...options };

  if (options.maxDepth === undefined){
    console.warn(chalk.yellow(`[fs-crawler] Warning: No maximum recursion depth set. This could adversely affect performance and possibly cause a stack overflow.`))
  }

  function asyncCrawler(collection, worker, maxDepth, done){
    if (maxDepth !== undefined && maxDepth < 0){
      return process.nextTick(() => done(null, []));
    }

    let results = [];

    iterate(0);
    
    function iterate(index){
      if (index === collection.length){
        return done(null, results);
      }
      
      const task = collection[index];

      worker(task, maxDepth, (err, result) => {
        if (err){
          return done(err, null);
        }
        if (options.match && options.match.length && !Array.isArray(result)){
          result = micromatch(result, options.match);
        }
        results = results.concat(result);
        return iterate(index + 1);
      })
    }
  }

  function resolvePaths(root, filePaths){
    return filePaths
      .map(filePath => path.join(root, filePath))
      .reduce((allFilePaths, filePath) => {
        for (let i = 0; i < options.ignorePaths.length; i += 1){
          const rgx = options.ignorePaths[i];
          if (rgx.test(filePath)){
            return allFilePaths;
          }
        }
        return allFilePaths.concat(filePath);
      }, []);
  }

  function fsWorker(rootDir, maxDepth, callback) {
    fs.stat(rootDir, (err, stats) => {
      if (err){
        if (err.code === 'ENOENT'){
          return callback(null, rootDir);
        }
        throw err
      }
      
      if (stats && stats.isDirectory()){
        return fs.readdir(rootDir, (err, files) => {
          if (err){
            return callback(err, null);
          }
          files = resolvePaths(rootDir, files);
          maxDepth = maxDepth === undefined ? maxDepth : maxDepth - 1;
          asyncCrawler(files, fsWorker, maxDepth, (err, results) => {
            if (err){
              return callback(err, null);
            }
            return callback(null, results);
          });
        })
      }
      return callback(null, rootDir);
    });
  };

  asyncCrawler([root], fsWorker, options.maxDepth, finalCallback);
};

module.exports = fsCrawlerSerial;
