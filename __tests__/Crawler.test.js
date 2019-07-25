const fs = require('fs');
const path = require('path');
const mock = require('mock-fs');
const Crawler = require('../src');


describe('fs-async-crawler', () => {

  let defaultConfig, cwd, crawler;

  beforeAll(() => {
    /* 
      mock-fs issue: https://github.com/tschaub/mock-fs/issues/234
  
      calling console.log from a jest test breaks the test when 
      using mock-fs. Workaround solution is to call console.log
      prior to invoking mock.
  
      *************************************************************
    */ 
     console.log('\t');
    /* 
      *************************************************************
    */
  });

  beforeEach(() => {


    cwd = process.cwd();

    defaultConfig = {
      concurrency: 3,
      root: cwd,
      strict: true    
    };

    crawler = new Crawler(defaultConfig);

    mock({
      'dir1': {
        "helloWorld.js": "console.log('hello1')",
        "helloWorld.txt": "hello world",
        "helloWorld.html": "<p>hello world</p>",
      },
      'dir1/subdir1': {
        "helloWorld.js": "console.log('hello1')",
        "helloWorld.txt": "hello world",
        "helloWorld.html": "<p>hello world</p>",
      },
      'dir2': {
        "helloWorld.js": "console.log('hello1')",
        "helloWorld.txt": "hello world",
        "helloWorld.html": "<p>hello world</p>",
      },
      'dir2/subdir1': {
        "helloWorld.js": "console.log('hello1')",
        "helloWorld.txt": "hello world",
        "helloWorld.html": "<p>hello world</p>",
      },
      'dir2/subdir1/subsubdir1': {
        "helloWorld.js": "console.log('hello1')",
        "helloWorld.txt": "hello world",
        "helloWorld.html": "<p>hello world</p>",
      },
      'node_modules/some-module': {
        "index.js": "console.log('ignore me!')",
      }
    })
  });

  afterEach(mock.restore);

  it('should return all files within a root directory if no match is specified', (done) => {

    const results = [
      `${cwd}/dir1/helloWorld.html`,
      `${cwd}/dir1/helloWorld.js`,
      `${cwd}/dir1/helloWorld.txt`,
      `${cwd}/dir1/subdir1/helloWorld.html`,
      `${cwd}/dir1/subdir1/helloWorld.js`,
      `${cwd}/dir1/subdir1/helloWorld.txt`,
      `${cwd}/dir2/helloWorld.html`,
      `${cwd}/dir2/helloWorld.js`,
      `${cwd}/dir2/helloWorld.txt`,
      `${cwd}/dir2/subdir1/helloWorld.html`,
      `${cwd}/dir2/subdir1/helloWorld.js`,
      `${cwd}/dir2/subdir1/helloWorld.txt`,
      `${cwd}/dir2/subdir1/subsubdir1/helloWorld.html`,
      `${cwd}/dir2/subdir1/subsubdir1/helloWorld.js`,
      `${cwd}/dir2/subdir1/subsubdir1/helloWorld.txt`,
    ];

    crawler.all((err, files) => {
      expect(err).toBe(null);
      expect(files).toStrictEqual(results);
      done();
    });

  });

  it('should return an empty array if no matching files are found' , (done) => {
    const config = { ...defaultConfig, match: ['**.json'] };

    crawler = new Crawler(config);

    crawler.all((err, files) => {
      expect(err).toBe(null);
      expect(files.length).toBe(0);
      done();
    });

  });

  it('should ignore node_modules by default', (done) => {
    const config = { ...defaultConfig, match: ['**.js'] };

    crawler = new Crawler(config);

    crawler.all((err, files) => {
      expect(err).toBe(null);
      expect(files.length).toBe(5);
      expect(files.indexOf(`${cwd}/node_modules/some-module/index.js`)).toBe(-1);
      done();
    });

  });

  it('should not exceed maxDepth' , (done) => {
    const config = { ...defaultConfig, maxDepth: 3 };

    crawler = new Crawler(config);

    crawler.all((err, results) => {
      expect(err).toBe(null);
      expect(results).toEqual([
        `${cwd}/dir1/helloWorld.html`,
        `${cwd}/dir1/helloWorld.js`,
        `${cwd}/dir1/helloWorld.txt`,
        `${cwd}/dir1/subdir1/helloWorld.html`,
        `${cwd}/dir1/subdir1/helloWorld.js`,
        `${cwd}/dir1/subdir1/helloWorld.txt`,
        `${cwd}/dir2/helloWorld.html`,
        `${cwd}/dir2/helloWorld.js`,
        `${cwd}/dir2/helloWorld.txt`,
        `${cwd}/dir2/subdir1/helloWorld.html`,
        `${cwd}/dir2/subdir1/helloWorld.js`,
        `${cwd}/dir2/subdir1/helloWorld.txt`,
      ]);
      done();
    });

  });

  it('should locate all .txt files in root directory and return their contents in an array', done => {
    const config = { ...defaultConfig, match: ['**.txt'] };
    const txtResults = Array(5).fill('hello world');

    crawler = new Crawler(config);

    crawler.map((file, next) => {
      expect(file).toBeTruthy();
      expect(typeof next).toBe('function');
      
      fs.readFile(file, 'utf8', (err, data) => {
        expect(err).toBe(null);
        expect(data).toBeTruthy();

        next(null, data);
      });

    }, (err, results) => {
      expect(err).toBe(null);
      expect(results.length).toBe(5);
      expect(results).toStrictEqual(txtResults);

      done();
    });
  });

  it('should reduce all files in root directory to a single value', done => {
    const config = { ...defaultConfig, match: ['**.txt'] };
    const obj = {
      [cwd]: {
        '/dir1': {
          textContent: ['hello world']
        },
        '/dir1/subdir1': {
          textContent: ['hello world']
        },
        '/dir2': {
          textContent: ['hello world']
        },
        '/dir2/subdir1': {
          textContent: ['hello world']
        },
        '/dir2/subdir1/subsubdir1': {
          textContent: ['hello world']
        }
      }
    };

    crawler = new Crawler(config);

    crawler.reduce({}, (acc, file, next) => {
      expect(typeof acc).toBe('object');
      expect(typeof next).toBe('function');
      expect(file).toBeTruthy();

      let { dir } = path.parse(file);
      dir = dir.split(cwd)[1];

      fs.readFile(file, 'utf8', (err, txt) => {
        expect(err).toBe(null);
        expect(txt).toBeTruthy();

        if (acc[cwd]){
          if (acc[cwd][dir]){
            acc[cwd][dir].textContent = [ ...acc[cwd][dir].textContent, txt];
          } else {
            acc[cwd][dir] = { textContent: [txt] };
          }
        } else {
          acc[cwd] = { [dir]: {  textContent: [ txt ] } };
        }

        next(null, acc);
      })

    }, (err, result) => {
      expect(err).toBe(null);
      expect(result).toStrictEqual(obj);

      done();
    });

  });

  it('should filter all the files in the root directory by file access permissions', done => {
    const READ_ONLY = 0o744;
    const ALL_OK = (
        fs.constants.F_OK 
      | fs.constants.R_OK 
      | fs.constants.W_OK 
      | fs.constants.X_OK
    );
    
    const filesWithoutFullAccess = [
      `${cwd}/dir2/helloWorld.html`,
      `${cwd}/dir2/helloWorld.js`,
      `${cwd}/dir2/helloWorld.txt`,
    ];

    mock.restore();

    mock({
      'dir1': mock.directory({
        items:{
          "helloWorld.js": "console.log('hello1')",
          "helloWorld.txt": "hello world",
          "helloWorld.html": "<p>hello world</p>",
        }
      }),
      'dir2': mock.directory({
        items:{
          "helloWorld.js": mock.file({
            mode: READ_ONLY,
            content: "console.log('hello1')",
          }),
          "helloWorld.txt": mock.file({
            mode: READ_ONLY,
            content: "hello world",
          }),
          "helloWorld.html": mock.file({
            mode: READ_ONLY,
            content: "<p>hello world</p>",
          }),
        }
      }),
    });

    crawler = new Crawler(defaultConfig);

    crawler.filter((file, next) => {
      expect(file).toBeTruthy();
      expect(typeof next).toBe('function');

      fs.access(file, ALL_OK, (err) => {
        const ok = !Boolean(err);
        return next(null, ok);
      });

    }, (err, results) => {
      expect(err).toBe(null);
      expect(results).toStrictEqual(filesWithoutFullAccess);
      
      done();
    });

  });

})