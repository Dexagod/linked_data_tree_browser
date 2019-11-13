export class NodePath{
  private nodes = new Array();

  constructor(...nodes : Array<any>){
    this.nodes = nodes;
  }

  setNodes(nodearray : Array<any>){
    this.nodes = nodearray;
  }

  addNode(node : any){
    return this.nodes.push(node)
  }

  popNode(){
    return this.nodes.pop()
  }

  clean(){
    this.nodes = [ this.nodes[0] ]
  }

  getCurrentNode(){
    return this.nodes[this.nodes.length-1]
  }

  copy(){
    return new NodePath( ...Array.from(this.nodes));
  }

}