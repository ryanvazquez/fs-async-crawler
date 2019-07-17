const path = require('path');
const mock = require('mock-fs');
const crawler = require('../src/serial');

/* 
  mock-fs issue: https://github.com/tschaub/mock-fs/issues/234
  Tests fail with 
*/

describe('serial', () => {
  const rootDir = path.join(process.cwd(), './root');

  beforeEach(() => {
    mock({
      'root/dir1/': {
        "helloWorld.js": "console.log('hello1')",
        "helloWorld.txt": "hello world",
        "helloWorld.html": "<p>hello world</p>",
      },
      'root/dir1/subdir1': {
        "helloWorld.js": "console.log('hello1')",
        "helloWorld.txt": "hello world",
        "helloWorld.html": "<p>hello world</p>",
      },
      'root/dir2/': {
        "helloWorld.js": "console.log('hello1')",
        "helloWorld.txt": "hello world",
        "helloWorld.html": "<p>hello world</p>",
      },
      'root/dir2/subdir1': {
        "helloWorld.js": "console.log('hello1')",
        "helloWorld.txt": "hello world",
        "helloWorld.html": "<p>hello world</p>",
      },
      'root/dir2/subdir1/subsubdir1': {
        "helloWorld.js": "console.log('hello1')",
        "helloWorld.txt": "hello world",
        "helloWorld.html": "<p>hello world</p>",
      }
    })
  });

  afterEach(mock.restore);

  it('should retrieve all of the files from the file system if no maxDepth is specified', (done) => {

    crawler(rootDir, (err, results) => {
      expect(err).toBe(null);
      expect(results).toStrictEqual([
        `${rootDir}/dir1/helloWorld.html`,
        `${rootDir}/dir1/helloWorld.js`,
        `${rootDir}/dir1/helloWorld.txt`,
        `${rootDir}/dir1/subdir1/helloWorld.html`,
        `${rootDir}/dir1/subdir1/helloWorld.js`,
        `${rootDir}/dir1/subdir1/helloWorld.txt`,
        `${rootDir}/dir2/helloWorld.html`,
        `${rootDir}/dir2/helloWorld.js`,
        `${rootDir}/dir2/helloWorld.txt`,
        `${rootDir}/dir2/subdir1/helloWorld.html`,
        `${rootDir}/dir2/subdir1/helloWorld.js`,
        `${rootDir}/dir2/subdir1/helloWorld.txt`,
        `${rootDir}/dir2/subdir1/subsubdir1/helloWorld.html`,
        `${rootDir}/dir2/subdir1/subsubdir1/helloWorld.js`,
        `${rootDir}/dir2/subdir1/subsubdir1/helloWorld.txt`,
      ]);
      done();
    });
  });

  it('should retrieve only files specified in match option' , (done) => {
    crawler(rootDir, { match: ['**.js'] }, (err, results) => {
      expect(err).toBe(null);
      expect(results).toStrictEqual([
        `${rootDir}/dir1/helloWorld.js`,
        `${rootDir}/dir1/subdir1/helloWorld.js`,
        `${rootDir}/dir2/helloWorld.js`,
        `${rootDir}/dir2/subdir1/helloWorld.js`,
        `${rootDir}/dir2/subdir1/subsubdir1/helloWorld.js`,
      ]);
      done();
    })
  });

  it('should not exceed maxDepth' , (done) => {
    crawler(rootDir, { maxDepth: 3 }, (err, results) => {
      expect(err).toBe(null);
      expect(results).toEqual([
        `${rootDir}/dir1/helloWorld.html`,
        `${rootDir}/dir1/helloWorld.js`,
        `${rootDir}/dir1/helloWorld.txt`,
        `${rootDir}/dir1/subdir1/helloWorld.html`,
        `${rootDir}/dir1/subdir1/helloWorld.js`,
        `${rootDir}/dir1/subdir1/helloWorld.txt`,
        `${rootDir}/dir2/helloWorld.html`,
        `${rootDir}/dir2/helloWorld.js`,
        `${rootDir}/dir2/helloWorld.txt`,
        `${rootDir}/dir2/subdir1/helloWorld.html`,
        `${rootDir}/dir2/subdir1/helloWorld.js`,
        `${rootDir}/dir2/subdir1/helloWorld.txt`,
      ]);
      done();
    })
  });

  it('should not exceed maxDepth and only return matches' , (done) => {
    crawler(rootDir, { maxDepth: 3, match: ['**.js'] }, (err, results) => {
      expect(err).toBe(null);
      expect(results).toEqual([
        `${rootDir}/dir1/helloWorld.js`,
        `${rootDir}/dir1/subdir1/helloWorld.js`,
        `${rootDir}/dir2/helloWorld.js`,
        `${rootDir}/dir2/subdir1/helloWorld.js`,
      ]);
      done();
    })
  });

})