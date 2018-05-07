import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Tree from './tree';
import Node from './node';

class UITree extends Component {
  static propTypes = {
    tree: PropTypes.object.isRequired,
    paddingLeft: PropTypes.number,
    renderNode: PropTypes.func.isRequired
  };

  static defaultProps = {
    paddingLeft: 20
  };

  constructor(props) {
    super(props);

    this.state = this.init(props);
  }

  componentWillReceiveProps(nextProps) {
    if (!this._updated) {
      this.setState(this.init(nextProps));
    } else {
      this._updated = false;
    }
  }

  init = props => {
    if (this.state.dragging && this.state.dragging.id)
    {
      return;
    }

    const tree = new Tree(props.tree);
    tree.isNodeCollapsed = props.isNodeCollapsed;
    tree.renderNode = props.renderNode;
    tree.changeNodeCollapsed = props.changeNodeCollapsed;
    tree.updateNodesPosition();

    return {
      tree: tree,
      dragging: {
        id: null,
        x: null,
        y: null,
        w: null,
        h: null
      }
    };
  };

  getDraggingDom = () => {
    const { tree, dragging } = this.state;

    if (dragging && dragging.id) {
      const draggingIndex = tree.getIndex(dragging.id);
      const draggingStyles = {
        top: dragging.y,
        left: dragging.x,
        width: dragging.w
      };

      return (
        <div className="m-draggable" style={draggingStyles}>
          <Node
            tree={tree}
            index={draggingIndex}
            paddingLeft={this.props.paddingLeft}
          />
        </div>
      );
    }

    return null;
  };

  render() {
    const tree = this.state.tree;
    const dragging = this.state.dragging;
    const draggingDom = this.getDraggingDom();

    return (
      <div className="m-tree">
        {draggingDom}
        <Node
          tree={tree}
          index={tree.getIndex(1)}
          key={1}
          paddingLeft={this.props.paddingLeft}
          onDragStart={this.dragStart}
          onCollapse={this.toggleCollapse}
          dragging={dragging && dragging.id}
          dragDelay={this.props.dragDelay || 0}
        />
      </div>
    );
  }

  dragStart = (id, dom, e) => {
    let rootIndex = this.state.tree.getIndex(1);

		if (this.props.disableDragging) {return;}
    if ((this.props.disableRootDrag) && (id == 1)) {return;}
    if (id == 2 && this.props.tree.module !== "ROOT") {return;}
    if (this.props.tree.module !== "ROOT" && this.props.tree.module === "Favorites") {return;}

    this.dragData = {
      id: id,
      dom: dom
    };

    this._offsetX = e.clientX;
    this._offsetY = e.clientY;
    this._start = true;

    window.addEventListener('mousemove', this.drag);
    window.addEventListener('mouseup', this.dragEnd);
  };

  // oh
  drag = e => {
    if (this._start) {
      this.dragStarted();

      this.dragging = {
        id: this.dragData.id,
        w: this.dragData.dom.offsetWidth,
        h: this.dragData.dom.offsetHeight,
        x: this.dragData.dom.offsetLeft,
        y: this.dragData.dom.offsetTop
      };

      this._startX = this.dragData.dom.offsetLeft;
      this._startY = this.dragData.dom.offsetTop;
      this._offsetX = e.clientX;
      this._offsetY = e.clientY;

      this.setState({
        dragging: this.dragging
      });

      this._start = false;
    }

    const tree = this.state.tree;
    const dragging = this.dragging;
    const paddingLeft = this.props.paddingLeft;
    let newIndex = null;
    let index = tree.getIndex(dragging.id);

    let noIndex = false;

    let tempCollapsed;

    if (index == null)
    {
      tempCollapsed = false;
      noIndex = true;
    }
    else
    {
      tempCollapsed = index.node.collapsed;
    }

    const collapsed = tempCollapsed;
    const _startX = this._startX;
    const _startY = this._startY;
    const _offsetX = this._offsetX;
    const _offsetY = this._offsetY;

    const pos = {
      x: _startX + ((this.props.disableHorizontalDrag) ? (0): (e.clientX - _offsetX)),
      y: _startY + ((noIndex) ? (0) : (e.clientY - _offsetY))
    };
    dragging.x = pos.x;
    dragging.y = pos.y;

    if (noIndex)
    {
      return;
    }

    const diffX = dragging.x - paddingLeft / 2 - (index.left - 2) * paddingLeft;
    const diffY = tree.obj.module == "ROOT" ? dragging.y - (index.top - 2) * dragging.h : dragging.y - dragging.h / 2  - (index.top - 2) * dragging.h;

    if (diffX < 0) {
      // left
      if (index.parent && !index.next) {
        newIndex = tree.move(index.id, index.parent, 'after');
      }
    } else if (diffX > paddingLeft) {
      // right
      if (index.prev) {
        const prevNode = tree.getIndex(index.prev).node;
        if (!prevNode.collapsed && !prevNode.leaf) {
          newIndex = tree.move(index.id, index.prev, 'append');
        }
      }
    }

    if (newIndex) {
      index = newIndex;
      newIndex.node.collapsed = collapsed;
      dragging.id = newIndex.id;
    }

    if (this.safeCompareNodeId(index, "BDFAVO")){return;}

    if (diffY < 0) {
      // up
      const above = tree.getNodeByTop(index.top - 1);
      if (this.safeCompareNodeId(above, "BDFAVO"))
        return;
      newIndex = tree.move(index.id, above.id, 'before');
    } else if (diffY > dragging.h) {
      // down
      if (index.next) {
        const below = tree.getIndex(index.next);
        if (this.safeCompareNodeId(below, "BDFAVO"))
          return;
        if (below.children && below.children.length && !below.node.collapsed) {
          newIndex = tree.move(index.id, index.next, 'prepend');
        } else {
          newIndex = tree.move(index.id, index.next, 'after');
        }
      } else {
        const below = tree.getNodeByTop(index.top + index.height);
        if (this.safeCompareNodeId(below, "BDFAVO"))
          return;
        if (below && below.parent !== index.id) {
          if (
            below.children &&
            below.children.length &&
            !below.node.collapsed
          ) {
            newIndex = tree.move(index.id, below.id, 'prepend');
          } else {
            newIndex = tree.move(index.id, below.id, 'after');
          }
        }
      }
    }

    if (newIndex) {
      newIndex.node.collapsed = collapsed;
      dragging.id = newIndex.id;
    }

    this.setState({
      tree: tree,
      dragging: dragging
    });
  };

  safeCompareNodeId = (index, targetId) => {
    return index && index.node && index.node.id == targetId
  };

  dragEnd = () => {
    if (this.dragging.id == 2 &&
      this.state.tree.obj.module == "ROOT")
    {return;}

    else if(this.state.tree.obj.module !== "Favorites" &&
      this.state.tree.obj.module != "ROOT")
    {return;}


    this.setState({
      dragging: {
        id: null,
        x: null,
        y: null,
        w: null,
        h: null
      }
    });

    if (!this._start)
    {
    	this.dragEnded(this.state.tree);
    }

    this.change(this.state.tree);
    window.removeEventListener('mousemove', this.drag);
    window.removeEventListener('mouseup', this.dragEnd);
  };

  dragStarted = () =>
  {
  	if (this.props.onDragStarted) this.props.onDragStarted();
  };

  dragEnded = (tree) =>
  {
  	if (this.props.onDragEnded) this.props.onDragEnded(tree.obj);
  };

  change = tree => {
    this._updated = true;
    if (this.props.onChange) this.props.onChange(tree.obj);
  };

  toggleCollapse = nodeId => {
    const tree = this.state.tree;
    const index = tree.getIndex(nodeId);
    const node = index.node;
    node.collapsed = !node.collapsed;
    tree.updateNodesPosition();

    this.setState({
      tree: tree
    });

    this.change(tree);
  };
}

module.exports = UITree;
