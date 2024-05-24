import { setComponentProps, createComponent, render } from "./render";
/**
 *
 * @param {真实dom} dom
 * @param {虚拟dom} vnode
 * @returns 更新后的真实dom
 */
export function diff(dom, vnode) {
  let out = dom;
  if (vnode === undefined || vnode === null || typeof vnode === "boolean") {
    vnode = "";
  }
  if (typeof vnode === "number") {
    vnode = String(vnode);
  }
  // 如果vnode节点是string
  if (typeof vnode === "string") {
    diffText(dom, vnode);
  }
  // 对比组件
  if (typeof vnode.tag === "function") {
    return diffComponent(dom, vnode);
  }
  // 如果真实 DOM 不存在，表示此节点是新增的，或者新旧两个节点的类型不一样，那么就新建一个 DOM 元素，并将原来的子节点（如果有的话）移动到新建的 DOM 节点下。
  if (!dom || !isSameNodeType(dom, vnode)) {
    out = document.createElement(vnode.tag);
    if (dom) {
      // 将原来的子节点移到新节点下
      [...dom.childNodes].forEach((n) => out.appendChild(n));
      if (dom.parentNode) {
        // 新节点替换原来的对象
        dom.parentNode.removeChild(out, dom);
      }
    }
  }
  // 对比子节点
  const hasVNodeChildren = vnode.children && vnode.children.length > 0;
  const hasRealDomChildren = out.childNodes && out.childNodes.length > 0;
  if (hasVNodeChildren || hasRealDomChildren) {
    diffChildren(out, vnode.children);
  }
  diffAttributes(out, vnode);
  return out;
}

function diffText(dom, vnode) {
  // 如果当前的dom就是文本节点，则直接更新内容。
  // nodeType: https://developer.mozilla.org/zh-CN/docs/Web/API/Node/nodeType
  if (dom && dom.nodeType === 3) {
    if (dom.textContent !== vnode) {
      dom.textContent = vnode;
      return dom;
    }
  }
  // 如果dom不是文本节点，则创建一个新的文本节点，并移除原来的
  const newDom = document.createTextNode(vnode);
  if (dom && dom.parentNode) {
    dom.parentNode.replaceChild(newDom, dom);
  }
  return newDom;
}

function diffComponent(dom, vnode) {
  const c = dom && dom._component;
  // 如果组件类型咩没有发生变化，则只需更新属性
  if (c && c.constructor === vnode.tag) {
    setComponentProps(c, vnode.attrs);
    return c.base;
  }
  // 如果组件类型发生变化，则移除原来的组件，并渲染新的组件
  if (c) {
    unmountComponent(c);
  }
  const inst = createComponent(vnode.tag, vnode.attrs);
  setComponentProps(inst, vnode.attrs);
  return inst.base;
}

function unmountComponent(component) {
  if (component.componentWillUnmount) {
    component.componentWillUnmount();
  }
  removeNode(component.base);
}

function removeNode(dom) {
  if (dom && dom.parentNode) {
    dom.parentNode.removeChild(dom);
  }
}

function isSameNodeType(dom, vnode) {
  // 文本节点
  if (typeof vnode === "string" || typeof vnode === "number") {
    return dom.nodeType === 3;
  }
  // 元素节点
  if (typeof vnode.tag === "string") {
    return (
      dom.nodeType === 1 &&
      vnode.tag.toLowerCase() === dom.tagName.toLowerCase()
    );
  }
  // 组件
  return dom._component && dom._component.constructor === vnode.tag;
}

function diffChildren1(dom, vchildren) {
  const domChildren = dom.childNodes;
  const children = [];
  const keyed = {};

  if (domChildren.length > 0) {
    for (const child of domChildren) {
      // 将有key的节点和没有key的节点分开
      child.key ? (keyed[child.key] = child) : children.push(child);
    }
  }
  if (vchildren.length > 0) {
    for (let i = 0; i < vchildren.length; i++) {
      const vchild = vchildren[i];
      let child;
      // 如果有key，找到对应key值的节点
      if (vchild.key) {
        if (keyed[vchild.key]) {
          child = keyed[vchild.key];
          keyed[vchild.key] = undefined;
        }
      } else {
        // 如果没有key，则优先找类型相同的节点
        for (const dchild of domChildren) {
          if (isSameNodeType(dchild, vchild)) {
            child = dchild;
            break;
          }
        }
      }
      const newChild = diff(child, vchild);
      dom.appendChild(newChild);
    }
  }
}

function diffAttributes(dom, vnode) {
  const old = {}; // 当前DOM的属性
  const attrs = vnode.attrs; // 虚拟DOM的属性

  for (let i = 0; i < dom.attributes.length; i++) {
    const attr = dom.attributes[i];
    old[attr.name] = attr.value;
  }

  // 如果原来的属性不在新的属性当中，则将其移除掉（属性值设为undefined）
  for (let name in old) {
    if (!(name in attrs)) {
      setAttribute(dom, name, undefined);
    }
  }

  // 更新新的属性值
  for (let name in attrs) {
    if (old[name] !== attrs[name]) {
      setAttribute(dom, name, attrs[name]);
    }
  }
}

function diffChildren(dom, vchildren) {
  const domChildren = dom.childNodes;
  const children = [];

  const keyed = {};

  if (domChildren.length > 0) {
    for (let i = 0; i < domChildren.length; i++) {
      const child = domChildren[i];
      const key = child.key;
      if (key) {
        keyed[key] = child;
      } else {
        children.push(child);
      }
    }
  }

  if (vchildren && vchildren.length > 0) {
    let childrenLen = children.length;

    for (let i = 0; i < vchildren.length; i++) {
      const vchild = vchildren[i];
      const key = vchild.key;
      let child;

      if (key) {
        if (keyed[key]) {
          child = keyed[key];
          keyed[key] = undefined;
        }
      } else {
        for (let j = 0; j < childrenLen; j++) {
          let c = children[j];
          if (c && isSameNodeType(c, vchild)) {
            child = c;
            children[j] = undefined;
            break;
          }
        }
      }
      child = diff(child, vchild);
      const f = domChildren[i];
      if (child && child !== dom && child !== f) {
        if (!f) {
          dom.appendChild(child);
        } else if (child === f.nextSibling) {
          removeNode(f);
        } else {
          dom.insertBefore(child, f);
        }
      }
    }
  }
}
