import Component from "../react/component";

export function render(vnode = "") {
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
    vnode.children.forEach((child) => {
      dom.appendChild(render(child));
    });
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

// export function renderComponent(component) {
//   // console.log("that", that);
//   // render后，表示组件已经初始化
//   const vnode = component.render();
//   // 记录此时的dom，用于后续判断组建是否初始化过。
//   component.base = render(vnode);
// }
export function renderComponent(component) {
  // 组件未初始化的时候（component.base为空），只走componentDidMount
  // 组件已经初始化过的时候（component.base不为空），先走componentWillUpdate， 然后走componentDidUpdate
  let base;

  const renderer = component.render();

  if (component.base && component.componentWillUpdate) {
    component.componentWillUpdate();
  }

  base = render(renderer);

  if (component.base) {
    if (component.componentDidUpdate) component.componentDidUpdate();
  } else if (component.componentDidMount) {
    component.componentDidMount();
  }

  if (component.base && component.base.parentNode) {
    // 视图更新，将新的dom替换到旧的dom上
    component.base.parentNode.replaceChild(base, component.base);
  }

  component.base = base;
  // 记录当前组件，后续diff时使用
  base._component = component;
}

// 创建组件
export function createComponent(component, props) {
  // console.log("component", component);
  let inst;
  // 如果组件是类组件, 则直接返回实例
  if (component.prototype && component.prototype.render) {
    inst = new component(props);
  } else {
    // 如果组件是函数组件，则将其扩展为类定义组件
    inst = new Component(props);
    inst.constructor = component;
    inst.render = function () {
      return component(props);
    };
  }
  return inst;
}

export function setComponentProps(component, props) {
  component.props = props;
  // 如果base不存在，则表示组件还没有初始化过，需要先初始化
  if (!component.base) {
    if (component.componentWillMount) {
      component.componentWillMount();
    }
  } else if (component.componentWillReceiveProps) {
    component.componentWillReceiveProps(props);
  }
  renderComponent(component);
}
