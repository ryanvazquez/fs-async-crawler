const { EventEmitter } = require('events');

class TaskQueue extends EventEmitter {
  constructor(config){
    super();
    this.concurrency = config.concurrency || process.env.UV_THREADPOOL_SIZE;
    this.running = 0;
    this.queue = [];
    this.draining = false;

    this.done = this.done.bind(this);

    this.addListener('error', this.drain);
  }

  _nextTick(error, result, event){
    if (typeof event === 'function'){
      const callback = event;
      return process.nextTick(() => callback(error, result))
    }
    return process.nextTick(() => this.emit(event, error, result));
  }

  _setConcurrency(n){
    this.concurrency = n;
  }

  drain(err){
    while (this.queue.length){
      this.queue.pop();
    }
    this.emit('drained', err);
  }

  push(task){
    this.queue.push(task);
    this.next();
  }

  done(){
    this.running --;
    this.next();
  }

  next(){
    while (this.running < this.concurrency && this.queue.length){
      const task = this.queue.shift();
      task(this.done);
      this.running ++;
    }
  }
}

module.exports = TaskQueue;