# fs-crawler
A collection of configurable file system crawlers. Serial, Parallel, and Queued crawlers available

## **Install**
```sh
  npm install fs-crawler
```

# fs-crawler.serial
  ### **Description**
  Collects all files of a given directory into a flattened array. Traverses root directory **serially**. Evaluates one branch at a time until all files have been collected or until maxDepth is reached. Terminates upon encountering an error. Signficantly slower than  **fs-crawler.parallel** or **fs-crawler.queue**.

  ### **Params**
  | Param | Type | Description | Required |
  | :------- | :--- | :---------- | :------ |
  | `path` | `string` | Absolute path of the directory to crawl | `true`|
  | `options` | `object` | [See Options](#Options) | `false` |
  | `callback`| `function` | The callback function will be fired after the crawler has completed crawling the directory tree or upon encountering an error | `true`|
  
  ### **Options**
  | Property | Type | Description | Default 
  | :------- | :--- | :---------- | :------ |
  | `maxDepth` | `number` |  A number representing the maximum depth of recursion. The crawler will terminate the crawling of a branch once the maxDepth has been reached. **Warning:** If not specified, the crawler will crawl the **entire** directory tree. This could have signficant performance impact. | `null`
  | `ignorePaths`| `array <rgx>` | An array of regular expressions. The crawler will ignore any directories and any files that match to provided paths. | `[/node_modules/]`
  | `match` | `array <glob>` | An array of glob strings. If provided, the crawler will collect only the files whose paths match the provided globs. | `[*]` 
    
# **Usage**
### Get all files within a directory.

> Note: Ignores `node_modules` by default.
```js
const crawler = require('fs-crawler').serial;

crawler('path/to/dir', (err, files) => {
  if (err){
    // do something with the error
  } else {
    // do something with the results
  }
});
```
       
### Get only files matching an extension in a root directory

```js
const crawler = require('fs-crawler').serial;

// locate all Jest tests inside given directory
const options = {
  match: [
    "**/__tests__/**/*.[jt]s?(x)",
    "**/?(*.)+(spec|test).[jt]s?(x)" 
  ], 
  ignorePaths: [/node_modules/] 
};

crawler('path/to/dir', options, (err, files) => {
    if (err){
      // do something with the error
    } else {
      // do something with the result
  });
```
