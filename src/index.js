import { diff } from "./react-dom/diff";
import Component from "./react/component";

export function h(tag, attrs, ...children) {
  return {
    tag,
    attrs,
    children,
  };
}

const element = (
  <div className="class1" style="color: red;">
    hello
    <span className="class2" style="color: blue;">
      world!
    </span>
  </div>
);

// console.log(element);

const ReactDOM = {
  render: (vnode, container) => {
    const dom = diff(undefined, vnode);
    console.log(dom);
    container.appendChild(dom);
    return dom;
  },
};

// function Welcome(props) {
//   return <h1>Hello, {props.name}</h1>;
// }
// class Welcome1 {
//   render() {
//     return <h3>Hello, {this.props.name}</h3>;
//   }
// }

// ReactDOM.render(
//   <h1 className="class1">
//     {/* <Welcome name="tom" /> */}
//     <Welcome name="jerry" />
//     <Welcome1 name="tom" />
//     <Welcome1 name="sandy" />
//     hello, world
//   </h1>,
//   document.getElementById("root")
// );
class Counter extends Component {
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
