[![Build Status](https://travis-ci.org/ryanvazquez/fs-async-crawler.svg?branch=master)](https://travis-ci.org/ryanvazquez/fs-async-crawler)

# fs-async-crawler
  File system crawler and async API

## **Install**
```sh
  npm install fs-async-crawler
```
  
  ### **Config**
  | Property | Type | Description | Default | Required |
  | :------- | :--- | :---------- | :------ | :------ |
  | `root` | `string` | **Absolute** path of the directory to crawl | `null`| true
  | `maxDepth` | `number` |  A number representing the maximum depth of recursion. The crawler will terminate the crawling of a branch once the maxDepth has been reached. **Warning:** If not specified, the crawler will crawl the **entire** directory tree. This could have signficant performance impact. | `null` | false
  | `ignorePaths`| `array <rgx>` | An array of regular expressions. The crawler will ignore any directories and any files that match to provided paths. | `[/node_modules/]`| false
  | `match` | `array <glob>` | An array of glob strings. If provided, the crawler will collect only the files whose paths match the provided globs. | `null` | false
  | `strict` | `boolean` | Determines whether the crawler throw an error when trying to access a file the parent process does not have permissions for.  | `false` | false

    
# **API**
## Crawler.prototype.all

### Crawls entire directory starting from the root. Returns an array of absolute filePaths.

> crawler.all(finalCallback)

quick setup: 
```js
const Crawler = require('fs-async-crawler');
const crawler = new Crawler({ root: 'Users/path/to/files' });

// gets all files within root
crawler.crawl((err, files) => {
  if (err){
    console.log('There was an error! ' + err);
  } else {
    console.log(files);
  }
});
```

with options:

```js
const Crawler = require('fs-async-crawler');
const config = {
  root: 'Users/path/to/dir',
  ignorePaths: [/node_modules/, /__tests__/],
  match: ['**.js']
}
const crawler = new Crawler(config);

// get all JS files within root
crawler.crawl((err, files) => {
  if (err){
    console.log('There was an error! ' + err);
  } else {
    console.log(files);
  }
});
```
       
## Crawler.prototype.forEach

#### Crawls the directory and performs an async operation on each file.

Like Array.prototype.forEach, Crawler.prototype.forEach executes the async function but does not return/collect the result. The `done` callback accepts an error as its only argument.

> crawler.forEach(iteratee, finalCallback);

```js
const Crawler = require('fs-async-crawler');
const config = {
  root: 'Users/path/to/log-files',
  ignorePaths: [/node_modules/],
  match: ['**.log']
}
const crawler = new Crawler(config);

// get all log files within root and delete them
crawler.forEach((file, done) => {

  deleteFile(file, (err, result) => {
    if (err){
      return done(err);
    }
    return done(null);
  })

}, (err) => {
  if (err){
    console.log('Something went wrong');
  } else {
    console.log('Everything ok!');
  }
});
```

## Crawler.prototype.map

### Crawls the directory, performs an async operation on each file and collects the result in an array. 

Results are not guaranteed to be in their original order.

> crawler.map(iteratee, finalCallback);

```js
const Crawler = require('fs-async-crawler');
const config = {
  root: 'Users/path/to/dir',
  match: ['**.txt']
}
const crawler = new Crawler(config);

// find all txt files within root and create an array of their contents
crawler.map((file, done) => {

  getContentsOfTxtFile(file, (err, content) => {
    if (err){
      return done(err, null);
    }
    return done(null, content);
  })

}, (err, contents) => {
  if (err){
    console.log('There was an error!' + err);
  } else {
    console.log(contents);
  }
});
```


## Crawler.prototype.reduce

### Crawls the directory, performs an async operation on each file and returns an accumulated result.

Note: Reduce requires the accumulated result of each previous operation to be passed to the current operation. Therefore, async tasks must be executed serially, rather than in parallel (the default behavior of Crawler). This may have an adverse impact on performance.

> crawler.reduce(initialValue, iteratee, finalCallback);


```js
const Crawler = require('fs-async-crawler');
const config = {
  root: 'Users/path/to/dir',
  match: ['**.txt']
};
const crawler = new Crawler(config);
const initialValue = 0;

crawler.reduce(initialValue, (acc, file, done) => {

  readFileContents(file, (err, content) => {
    if (err){
      return done(err, null);
    }
    return done(null, acc + content.length);
  })

}, (err, contentLength) => {
  if (err){
    console.log('An error occured!' + err);
  } else {
    console.log('Content length of all files' + contentLength);
  }
});
```
