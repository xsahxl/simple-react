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
