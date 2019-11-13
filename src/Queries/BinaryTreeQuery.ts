import { Query } from './Query';
import { QuerySession } from '../QuerySession';
import { NodeExplorer } from '../NodeExplorer';
import { ChildRelation } from '../Helpers/ChildRelation'
import { NodePath } from '../NodePath';
export class BinaryTreeQuery extends Query{
  
  nodeExplorer : NodeExplorer | null = null;
  async query(session : QuerySession, requestedValue : any): Promise<QuerySession> {
    this.nodeExplorer = new NodeExplorer(session.getCache())
    for (let collectionId of Array.from(session.getCurrentNodePaths().keys())){
      let nodePaths = session.getCurrentNodePaths().get(collectionId)
      let newNodePaths = new Array();
      if (nodePaths !== undefined){
        for (let nodePath of nodePaths){
          newNodePaths = newNodePaths.concat(await this._recursiveQuery(nodePath, requestedValue))
        }
      }
      session.setNodePathsForCollection(collectionId, newNodePaths)
    }
    return session
  }

  async _recursiveQuery(nodePath : NodePath, searchValue : any) : Promise<Array<NodePath>>{

    if(this.stopped === true){ return [] }

    if (this.nodeExplorer === null) { throw new Error("Error exploring node in PrefixTreeQuery class: NodeExplorer is a null object.") }
    let returnPaths = new Array();
    let currentNode = nodePath.getCurrentNode()
    this.emit("node", currentNode)
    let currentNodeValue = this.nodeExplorer.getNodeId(await this.nodeExplorer.getNodeValue(currentNode))
    if (searchValue === currentNodeValue){
      return [nodePath]
    }
    let followingNodeChildArray = []
    if (searchValue > currentNodeValue){
      followingNodeChildArray = await this.nodeExplorer.getChildrenWithRelation(currentNode, ChildRelation.GreaterThanRelation)
    } else {
      followingNodeChildArray = await this.nodeExplorer.getChildrenWithRelation(currentNode, ChildRelation.LesserThanRelation)
    }
    if (followingNodeChildArray === null || followingNodeChildArray === undefined || followingNodeChildArray.length <= 0){
      return [] // return [nodePath]
    } else if (followingNodeChildArray.length > 1){
      console.error("Binary tree has more than one child node for GreaterThanRelation / LesserThanRelation")
    }
    for (let childObject of followingNodeChildArray){
      let newNodePath = nodePath.copy();
      newNodePath.addNode(await this.nodeExplorer.getNodeWithId(this.nodeExplorer.getNodeId(childObject)));
      let returnValue = await this._recursiveQuery(newNodePath, searchValue);
      returnPaths = returnPaths.concat(returnValue);
    }
    return returnPaths;
  }
}