function Vue(options = {}) {
  this.$options = options;
  if (options.data) {
    this.$data = this._data = options.data;
  }

  Object.keys(this.$data).forEach(k => {
    Object.defineProperty(this, k, {
      enumerable: true,
      configurable: true,
      get() {
        return this._data[k];
      },
      set(value) {
        this._data[k] = value;
      }
    });
  })

  initComputed.call(this);
  observe(this.$data);
  new Compile(this.$options.el, this);
}

function initComputed() {
  if (this.$options.computed) {
    let computed = this.$options.computed;
    let keys = Object.keys(computed);
    if (keys.length === 0) return;
    keys.forEach(k => {
      Object.defineProperty(this, k, {
        enumerable: true,
        configurable: true,
        get() {
          if (typeof computed[k] === 'function') {
            return computed[k].call(this);
          } else {
            return computed[k].get.bind(this)();
          }
        },
        set(value) {

        }
      });
    });
  }
}

function observe(data) {
  return new Observe(data);
}

function Observe(data) {
  if (!data || typeof data !== 'object') return;
  let dep = new Dep();
  Object.keys(data).forEach(key => {
    let val = data[key];
    observe(val);
    Object.defineProperty(data, key, {
      enumerable: true,
      configurable: true,
      get() {
        Dep.target && dep.addSub(Dep.target);
        return val;
      },
      set(value) {
        if (value === val) return;
        val = value;
        observe(value);
        dep.notify();
      }
    });
  });
}

Compile.prototype.getApp = (el) => {
  return (el.nodeType === 1) ? el : document.querySelector(el);
}

function Compile(el, vm) {
  vm.$vm = this.getApp(el);
  this.vm = vm;
  let firstChild;
  let fragMent = document.createDocumentFragment();
  while (firstChild = vm.$vm.firstChild) {
    fragMent.appendChild(firstChild);
  }
  this.replace(fragMent, vm);
  vm.$vm.appendChild(fragMent);
}

Compile.prototype.replace = function (fragMent) {
  Array.from(fragMent.childNodes).forEach(node => {
    let nodeType = +node.nodeType;
    if (nodeType === 1) {
      if (node.childNodes) this.replace(node);
      let attrs = node.attributes;
      Array.from(attrs).forEach(attr => {
        let {
          name,
          value: exp
        } = attr;
        if (!name.includes('v-model')) return;
        let val = getValue(exp, this.vm);
        node.value = val;
        node.addEventListener('input', e => {
          this.vm[exp] = e.target.value;
        }, false);

        new Watcher(exp, this.vm, function (newVal) {
          node.value = newVal;
        });
      });
    }
    if (nodeType === 3) {
      let text = node.textContent;
      let reg = /\{\{([^}]+)\}\}/g;
      if (reg.test(text)) {
        let exp = RegExp.$1;
        let val = getValue(exp, this.vm);
        node.textContent = text.replace(reg, val);

        new Watcher(exp, this.vm, function (newVal) {
          node.textContent = text.replace(reg, newVal);
        });
      }
    }
  });
}

function getValue(exp, vm) {
  let arr = exp.split('.');
  return arr.reduce((previous, current) => {
    return previous[current];
  }, vm);
}

function Dep() {
  this.subs = [];
}
Dep.prototype.addSub = function (sub) {
  this.subs.push(sub);
}
Dep.prototype.notify = function () {
  this.subs.forEach(sub => sub.update());
}

function Watcher(exp, vm, fn) {
  Object.assign(this, {
    exp,
    vm,
    fn
  });

  Dep.target = this;
}
Watcher.prototype.update = function () {
  let val = getValue(this.exp, this.vm);
  this.fn(val);
  Dep.target = null;
}