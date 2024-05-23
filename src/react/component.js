import { renderComponent } from "../react-dom/render";

class Component {
  constructor(props = {}) {
    this.state = {};
    this.props = props;
  }

  setState(newState) {
    this.state = Object.assign({}, this.state, newState);
    renderComponent(this);
  }
}

export default Component;
