// 定义一个createElement方法
function createElement(tag, attrs, ...children) {
  return {
    tag,
    attrs,
    children,
  };
}

// 将上文定义的createElement方法放到对象React中
const MyReact = {
  createElement,
};

const element = (
  <div className="class1" style="color: red;">
    hello
    <span className="class2" style="color: blue;">
      world!
    </span>
  </div>
);

// console.log(element);

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

const ReactDOM = {
  render: (vnode, container) => {
    container.innerHTML = "";
    return render(vnode, container);
  },
};

// ReactDOM.render(
//   <h1 className="class1" style={{ fontSize: 50 }}>
//     Hello, world!
//   </h1>,
//   document.getElementById("root")
// );

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
