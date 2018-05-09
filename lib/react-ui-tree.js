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
    if (this.state && this.state.dragging && this.state.dragging.id)
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


  findAncestor = (el, cls) => {
    while ((el = el.parentElement) && !el.classList.contains(cls));
    return el;
  };

  getBaseItemHeight = () => {
    let childrenArr = Array.from(this.childrenRoot.children);
    let heightArray = childrenArr.filter(x => x.clientHeight && x.clientHeight > 0).map(x => x.clientHeight);
    let baseHeight = Math.min.apply(null, heightArray);

    return baseHeight;
  };

  getPrevElementHeight = (el) => {
    let childrenArr = Array.from(this.childrenRoot.children);

    let curIndex = childrenArr.indexOf(el.parentNode);

    let placeholder = childrenArr.find(x => x.classList.contains("placeholder"));

    if (placeholder)
    {
      curIndex = childrenArr.indexOf(placeholder);
    }
    
    if (curIndex != -1 && curIndex > 0)
      return childrenArr[curIndex - 1].clientHeight;

    return 0;
  };

  getNextElementHeight = (el) => {
    let childrenArr = Array.from(this.childrenRoot.children);
    let curIndex = childrenArr.indexOf(el.parentNode);

    let placeholder = childrenArr.find(x => x.classList.contains("placeholder"));
    
    if (placeholder)
    {
      curIndex = childrenArr.indexOf(placeholder);
    }
    
    if (curIndex != -1 && curIndex < childrenArr.length - 1)
      return childrenArr[curIndex + 1].clientHeight;

    return 0;
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
		if (this.props.disableDragging) {return;}
    if ((this.props.disableRootDrag) && (id == 1)) {return;}
    if (id == 2 && this.props.tree.module === "ROOT") {return;}

    if (this.props.tree && this.props.tree.module === "ROOT")
    {
      this.childrenRoot = this.findAncestor(dom ,'children');
      let regularNodeElSize = this.getBaseItemHeight();
      let domBounding = dom.getBoundingClientRect();

      if (e.clientY - domBounding.top > regularNodeElSize)
      {
        console.log('dragging inside expanded node');
        return;
      }

      this.isRootTree = true;
    }
    else
    {
      this.isRootTree = false;
    }


    // exit from presets tree if its not favorites module
    if (this.props.tree.module !== "ROOT" && this.props.tree.module !== "Favorites") {return;}

    this.dragging = {
      id: id,
      dom: dom,
      w: dom.offsetWidth,
      h: dom.offsetHeight,
      x: dom.offsetLeft,
      y: dom.offsetTop
    };

    this._startX = dom.offsetLeft;
    this._startY = dom.offsetTop;
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
    let diffY = 0;

    if (this.isRootTree)
    {
      let loopindex = 0;
      let totalHeight = 0;
      let nextElement = this.childrenRoot.children[0];

      while (nextElement.innerText != this.dragging.dom.innerText && 
          !nextElement.classList.contains("placeholder"))
      {
        totalHeight += nextElement.clientHeight;
        nextElement = this.childrenRoot.children[++loopindex];
      } 

      let diffY2 = dragging.y - (index.top - 2) * dragging.h;

      diffY = dragging.y - totalHeight;
    }
    else
    {
      diffY = dragging.y - dragging.h / 2 - (index.top - 2) * dragging.h;
    }

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

    let upCompareHeight = this.isRootTree ? -this.getPrevElementHeight(this.dragging.dom) : 0;
    let downCompareHeight = this.isRootTree ? this.getNextElementHeight(this.dragging.dom) : dragging.h;

    if (diffY < upCompareHeight) {
      // up
      const above = tree.getNodeByTop(index.top - 1);
      if (this.safeCompareNodeId(above, "BDFAVO"))
        return;
      newIndex = tree.move(index.id, above.id, 'before');
    } else if (diffY > downCompareHeight) {
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
    {
      return;
    }
    else if(this.state.tree.obj.module !== "Favorites" &&
      this.state.tree.obj.module != "ROOT")
    {
      return;
    }

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
