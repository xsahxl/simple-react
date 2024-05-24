import { diff } from "./diff";

function render(vnode, container) {
  const ret = diff(undefined, vnode);
  container.appendChild(ret);
  return ret;
}

export default render;
