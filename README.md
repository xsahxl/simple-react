> 本仓库记录学习[simple-react](https://github.com/hujiulong/simple-react)笔记

# 第一节 JSX 和虚拟 DOM

## 关于 jsx

在开始之前，我们有必要搞清楚一些概念。

我们来看一下这样一段代码：

```jsx
const title = <h1 className="title">Hello, world!</h1>;
```

这段代码并不是合法的 js 代码，它是一种被称为 jsx 的语法扩展，通过它我们就可以很方便的在 js 代码中书写 html 片段。

本质上，jsx 是语法糖，上面这段代码会被 babel 转换成如下代码

```jsx
const title = React.createElement(
  "h1",
  { className: "title" },
  "Hello, world!"
);
```

你可以在 babel 官网提供的在线转译测试 jsx 转换后的代码，这里有一个[稍微复杂一点的例子](https://babeljs.io/repl)

## 准备工作

为了集中精力编写逻辑，在代码打包工具上选择了最近火热的零配置打包工具 parcel，需要先安装 parcel：

```bash
npm install -g parcel-bundler
```

接下来新建 index.js 和 index.html，在 index.html 中引入 index.js。

注意一下 babel 的配置
.babelrc

```json
{
  "presets": ["env"],
  "plugins": [
    [
      "transform-react-jsx",
      {
        "pragma": "React.createElement"
      }
    ]
  ]
}
```

这个 `transform-react-jsx`就是将 jsx 转换成 js 的 babel 插件，它有一个 pragma 项，可以定义 jsx 转换方法的名称，你也可以将它改成 h（这是很多类 React 框架使用的名称）或别的。

准备工作完成后，我们可以用命令 parcel index.html 将它跑起来了，当然，现在它还什么都没有。

React.createElement 和虚拟 DOM
前文提到，jsx 片段会被转译成用 React.createElement 方法包裹的代码。所以第一步，我们来实现这个 React.createElement 方法

从 jsx 转译结果来看，createElement 方法的参数是这样：

```js
createElement(tag, attrs, child1, child2, child3);
```

第一个参数是 DOM 节点的标签名，它的值可能是 div，h1，span 等等
第二个参数是一个对象，里面包含了所有的属性，可能包含了 className，id 等等
从第三个参数开始，就是它的子节点

我们对 createElement 的实现非常简单，只需要返回一个对象来保存它的信息就行了。

```js
function createElement(tag, attrs, ...children) {
  return {
    tag,
    attrs,
    children,
  };
}
```

函数的参数 ...children 使用了 ES6 的 rest 参数，它的作用是将后面 child1,child2 等参数合并成一个数组 children。

现在我们来试试调用它

```js
// 将上文定义的 createElement 方法放到对象 React 中
const React = {
  createElement,
};

const element = (
  <div>
    hello<span>world!</span>
  </div>
);
console.log(element);
```

打开调试工具，我们可以看到输出的对象和我们预想的一致

我们的 createElement 方法返回的对象记录了这个 DOM 节点所有的信息，换言之，通过它我们就可以生成真正的 DOM，这个记录信息的对象我们称之为虚拟 DOM。

## ReactDOM.render

接下来是 ReactDOM.render 方法，我们再来看这段代码

```jsx
ReactDOM.render(<h1>Hello, world!</h1>, document.getElementById("root"));
```

经过转换，这段代码变成了这样

```jsx
ReactDOM.render(
  React.createElement("h1", null, "Hello, world!"),
  document.getElementById("root")
);
```

所以 render 的第一个参数实际上接受的是 createElement 返回的对象，也就是虚拟 DOM
而第二个参数则是挂载的目标 DOM

总而言之，render 方法的作用就是将虚拟 DOM 渲染成真实的 DOM，下面是它的实现：

```js
function render(vnode, container) {
  console.log("vnode:", vnode);
  /**
   * vnode: 虚拟DOM对象
   * {
    "tag": "div",
    "attrs": {
        "className": "class1",
        "style": "color: red;"
    },
    "children": [
        "hello",
        {
            "tag": "span",
            "attrs": {
                "className": "class2",
                "style": "color: blue;"
            },
            "children": [
                "world!"
            ]
        }
    ]
  }
   */
  // 当vnode是字符串时，表示创建一个文本节点
  if (typeof vnode === "string") {
    const textNode = document.createTextNode(vnode);
    container.appendChild(textNode);
    return;
  }

  // 创建元素节点
  const dom = document.createElement(vnode.tag);

  // 设置属性
  if (vnode.attrs) {
    for (const key in vnode.attrs) {
      const value = vnode.attrs[key];
      setAttribute(dom, key, value);
    }
  }

  // 递归渲染子节点
  if (vnode.children) {
    vnode.children.forEach((child) => render(child, dom));
  }

  // 将生成的DOM元素添加到容器中
  container.appendChild(dom);
}

// 设置属性需要考虑一些特殊情况，我们单独将其拿出来作为一个方法setAttribute
function setAttribute(dom, key, value = "") {
  // 如果属性是以on开头的，则表示是一个事件监听
  if (key.startsWith("on")) {
    dom[key.toLowerCase()] = value;
    return;
  }
  // 如果属性名是style, 则更新style样式
  if (key === "style") {
    // <h1 style="color: red; font-size:50px;">cssText 属性</h1>
    if (typeof value === "string") {
      dom.style.cssText = value;
      return;
    }
    if (typeof value === "object") {
      for (const key in value) {
        // 可以通过style={ width: 20 }这种形式来设置样式，可以省略掉单位px
        dom.style[key] =
          typeof value[key] === "number" ? `${value[key]}px` : value[key];
      }
      return;
    }
  }
  // 普通属性则直接更新属性
  value ? dom.setAttribute(key, value) : dom.removeAttribute(key);
}
```

这里其实还有个小问题：当多次调用 render 函数时，不会清除原来的内容。所以我们将其附加到 ReactDOM 对象上时，先清除一下挂载目标 DOM 的内容：

```jsx
const ReactDOM = {
  render: (vnode, container) => {
    container.innerHTML = "";
    return render(vnode, container);
  },
};
```

## 渲染和更新

到这里我们已经实现了 React 最为基础的功能，可以用它来做一些事了。

我们先在 index.html 中添加一个根节点

```html
<div id="root"></div>
```

我们先来试试官方文档中的 [Hello,World](https://legacy.reactjs.org/docs/rendering-elements.html#rendering-an-element-into-the-dom)

```jsx
ReactDOM.render(<h1>Hello, world!</h1>, document.getElementById("root"));
```

试试渲染一段动态的代码，这个例子也来自[官方文档](https://legacy.reactjs.org/docs/rendering-elements.html#updating-the-rendered-element)

```jsx
function tick() {
  const element = (
    <div>
      <h1>Hello, world!</h1>
      <h2>It is {new Date().toLocaleTimeString()}.</h2>
    </div>
  );
  ReactDOM.render(element, document.getElementById("root"));
}

setInterval(tick, 1000);
```

# 组件和生命周期

## 组件

React 定义组件的方式可以分为两种：函数和类，函数定义可以看做是类定义的一种简单形式。

createElement 的变化
回顾一下上一篇文章中我们对 React.createElement 的实现：

```jsx
function createElement(tag, attrs, ...children) {
  return {
    tag,
    attrs,
    children,
  };
}
```

这种实现我们前面暂时只用来渲染原生 DOM 元素，而对于组件，createElement 得到的参数略有不同：
如果 JSX 片段中的某个元素是组件，那么 createElement 的第一个参数 tag 将会是一个方法，而不是字符串。

> 区分组件和原生 DOM 的工作，是 babel-plugin-transform-react-jsx 帮我们做的

例如在处理<Welcome name="Sara" />时，createElement 方法的第一个参数 tag，实际上就是我们定义 Welcome 的方法：

```jsx
function Welcome(props) {
  return <h1>Hello, {props.name}</h1>;
}
```

我们不需要对 createElement 做修改，只需要知道如果渲染的是组件，tag 的值将是一个函数

## 组件基类 React.Component

通过类的方式定义组件，我们需要继承 React.Component：

```jsx
class Welcome extends React.Component {
  render() {
    return <h1>Hello, {this.props.name}</h1>;
  }
}
```

所以我们就需要先来实现 React.Component 这个类：

## Component

React.Component 包含了一些预先定义好的变量和方法，我们来一步一步地实现它：
先定义一个 Component 类：

```jsx
class Component {}
```

## state & props

通过继承 React.Component 定义的组件有自己的私有状态 state，可以通过 this.state 获取到。同时也能通过 this.props 来获取传入的数据。
所以在构造函数中，我们需要初始化 state 和 props

```jsx
// React.Component
class Component {
  constructor(props = {}) {
    this.state = {};
    this.props = props;
  }
}
```

## setState

组件内部的 state 和渲染结果相关，当 state 改变时通常会触发渲染，为了让 React 知道我们改变了 state，我们只能通过 setState 方法去修改数据。我们可以通过 Object.assign 来做一个简单的实现。
在每次更新 state 后，我们需要调用 renderComponent 方法来重新渲染组件，renderComponent 方法的实现后文会讲到。

```jsx
import { renderComponent } from "../react-dom/render";
class Component {
  constructor(props = {}) {
    // ...
  }
  setState(stateChange) {
    // 将修改合并到state
    this.state = Object.assign({}, this.state, stateChange);
    renderComponent(this);
  }
}
```

你可能听说过 React 的 setState 是异步的，同时它有很多优化手段，这里我们暂时不去管它，在以后会有一篇文章专门来讲 setState 方法。

## render

上一篇文章中实现的 render 方法只支持渲染原生 DOM 元素，我们需要修改 ReactDOM.render 方法，让其支持渲染组件。
修改之前我们先来回顾一下上一篇文章中我们对 ReactDOM.render 的实现：

```jsx
function render(vnode, container) {
  return container.appendChild(_render(vnode));
}

function _render(vnode = "") {
  // console.log("vnode:", vnode);
  /**
   * vnode: 虚拟DOM对象
   {
    "tag": "h1",
    "attrs": {
        "className": "class1",
        "style": {
            "fontSize": 50
        }
    },
    "children": [
        {
            "attrs": {
                "name": "tom"
            },
            "children": []
        },
        "Hello, world!"
    ]
}

{
    "attrs": {
        "name": "tom"
    },
    "children": [],
    tag: function Welcome(props) {
      return MyReact.createElement("h1", null, "Hello, ", props.name);
    }
}
   */

  if (typeof vnode === "number") {
    vnode = String(vnode);
  }
  // 当vnode是字符串时，表示创建一个文本节点
  if (typeof vnode === "string") {
    const textNode = document.createTextNode(vnode);
    return textNode;
  }

  if (typeof vnode.tag === "function") {
    const component = createComponent(vnode.tag, vnode.attrs);
    setComponentProps(component, vnode.attrs);
    return component.base;
  }

  // 创建元素节点
  const dom = document.createElement(vnode.tag);
  // 设置属性
  if (vnode.attrs) {
    for (const key in vnode.attrs) {
      const value = vnode.attrs[key];
      setAttribute(dom, key, value);
    }
  }

  // 递归渲染子节点
  if (vnode.children) {
    vnode.children.forEach((child) => render(child, dom));
  }

  return dom;
}

// 设置属性需要考虑一些特殊情况，我们单独将其拿出来作为一个方法setAttribute
function setAttribute(dom, key, value = "") {
  // 如果属性是以on开头的，则表示是一个事件监听
  if (key.startsWith("on")) {
    dom[key.toLowerCase()] = value;
    return;
  }
  // 如果属性名是style, 则更新style样式
  if (key === "style") {
    // <h1 style="color: red; font-size:50px;">cssText 属性</h1>
    if (typeof value === "string") {
      dom.style.cssText = value;
      return;
    }
    if (typeof value === "object") {
      for (const key in value) {
        // 可以通过style={ width: 20 }这种形式来设置样式，可以省略掉单位px
        dom.style[key] =
          typeof value[key] === "number" ? `${value[key]}px` : value[key];
      }
      return;
    }
  }
  // 普通属性则直接更新属性
  value ? dom.setAttribute(key, value) : dom.removeAttribute(key);
}
```

## 组件渲染和生命周期

在上面的方法中用到了 createComponent 和 setComponentProps 两个方法，组件的生命周期方法也会在这里面实现。

生命周期方法是一些在特殊时机执行的函数，例如 componentDidMount 方法会在组件挂载后执行

createComponent 方法用来创建组件实例，并且将函数定义组件扩展为类定义组件进行处理，以免其他地方需要区分不同定义方式。

```jsx
// 创建组件
function createComponent(component, props) {
  let inst;
  // 如果是类定义组件，则直接返回实例
  if (component.prototype && component.prototype.render) {
    inst = new component(props);
    // 如果是函数定义组件，则将其扩展为类定义组件
  } else {
    // 对于函数组件转化成类组件，不太清楚的话，请调试类组件生成的实例
    inst = new Component(props);
    inst.constructor = component;
    inst.render = function () {
      return component(props);
    };
  }

  return inst;
}
```

setComponentProps 方法用来更新 props，在其中可以实现 componentWillMount，componentWillReceiveProps 两个生命周期方法

```jsx
// set props
function setComponentProps(component, props) {
  if (!component.base) {
    if (component.componentWillMount) component.componentWillMount();
  } else if (component.componentWillReceiveProps) {
    component.componentWillReceiveProps(props);
  }

  component.props = props;

  renderComponent(component);
}
```

renderComponent 方法用来渲染组件，setState 方法中会直接调用这个方法进行重新渲染，在这个方法里可以实现 componentWillUpdate，componentDidUpdate，componentDidMount 几个生命周期方法。

```jsx
export function renderComponent(component) {
  let base;

  const renderer = component.render();

  if (component.base && component.componentWillUpdate) {
    component.componentWillUpdate();
  }

  base = _render(renderer);

  if (component.base) {
    if (component.componentDidUpdate) component.componentDidUpdate();
  } else if (component.componentDidMount) {
    component.componentDidMount();
  }

  if (component.base && component.base.parentNode) {
    component.base.parentNode.replaceChild(base, component.base);
  }

  component.base = base;
  base._component = component;
}
```

## 渲染组件

现在大部分工作已经完成，我们可以用它来渲染组件了。

渲染函数定义组件
渲染前文提到的 Welcome 组件：

```jsx
const element = <Welcome name="Sara" />;
ReactDOM.render(element, document.getElementById("root"));
```

试试更复杂的例子，将多个组件组合起来：

```jsx
function App() {
  return (
    <div>
      <Welcome name="Sara" />
      <Welcome name="Cahal" />
      <Welcome name="Edite" />
    </div>
  );
}
ReactDOM.render(<App />, document.getElementById("root"));
```

渲染类定义组件
我们来试一试将刚才函数定义组件改成类定义：

```jsx
class Welcome extends React.Component {
  render() {
    return <h1>Hello, {this.props.name}</h1>;
  }
}

class App extends React.Component {
  render() {
    return (
      <div>
        <Welcome name="Sara" />
        <Welcome name="Cahal" />
        <Welcome name="Edite" />
      </div>
    );
  }
}
ReactDOM.render(<App />, document.getElementById("root"));
```

运行起来结果和函数定义组件完全一致：

再来尝试一个能体现出类定义组件区别的例子，实现一个计数器 Counter，每点击一次就会加 1。
并且组件中还增加了两个生命周期函数：

```jsx
class Counter extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      num: 0,
    };
  }

  componentWillUpdate() {
    console.log("update");
  }

  componentWillMount() {
    console.log("mount");
  }

  onClick() {
    this.setState({ num: this.state.num + 1 });
  }

  render() {
    return (
      <div onClick={() => this.onClick()}>
        <h1>number: {this.state.num}</h1>
        <button>add</button>
      </div>
    );
  }
}

ReactDOM.render(<Counter />, document.getElementById("root"));
```
