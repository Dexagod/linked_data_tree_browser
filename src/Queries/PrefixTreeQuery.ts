import { Query } from './Query';
import { ChildRelation } from '../Helpers/ChildRelation';
import { NodePath } from '../NodePath';
import { QuerySession } from '../QuerySession';
import { NodeExplorer } from '../NodeExplorer';
export class PrefixTreeQuery extends Query{

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

  async _recursiveQuery(nodePath : NodePath, searchString : any) : Promise<Array<NodePath>>{

    if(this.stopped === true){ return [] }

    if (searchString === ""){
      return [nodePath];
    }
    let returnPaths = new Array();
    let currentNode = nodePath.getCurrentNode()
    this.emit("node", currentNode)
    if (this.nodeExplorer === null) { throw new Error("Error exploring node in PrefixTreeQuery class: NodeExplorer is a null object.") }
    let nodeChildren = await this.nodeExplorer.getChildrenWithRelation(currentNode, ChildRelation.StringCompletesRelation)
    for (let childObject of nodeChildren){
      let childValue = this.nodeExplorer.getNodeId(await this.nodeExplorer.getNodeValue(childObject))
      
      if (searchString.startsWith(childValue)){
        // searchstring starts with child value. We want to continue searching in this childNode on the updated searchstring.
        let newNodePath = nodePath.copy()
        newNodePath.addNode(await this.nodeExplorer.getNodeWithId(this.nodeExplorer.getNodeId(childObject)))
        let newSearchString = searchString.substring(childValue.length)
        let returnValue = await this._recursiveQuery(newNodePath, newSearchString);
        returnPaths = returnPaths.concat(returnValue)
      } else if (childValue.startsWith(searchString)){
        // requested String ends but matches the first characters of the childNode value. We want to return this childNode and its members as a match for the prefix.
        let newNodePath = nodePath.copy()
        newNodePath.addNode(await this.nodeExplorer.getNodeWithId(this.nodeExplorer.getNodeId(childObject)))
        let returnValue = await this._recursiveQuery(newNodePath, "")
        returnPaths = returnPaths.concat(returnValue)

      }
        // Else there is no child node that can be followed to complete the requested string value;
    }
    return returnPaths;
  }
}