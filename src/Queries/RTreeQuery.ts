import { Query } from './Query';
import { QuerySession } from '../QuerySession';
import { NodeExplorer } from '../NodeExplorer';
import { NodePath } from '../NodePath';
import { ChildRelation } from '../Helpers/ChildRelation';
import * as terraformer from 'terraformer'
import * as terraformer_parser from 'terraformer-wkt-parser'

export class RTreeQuery extends Query{

  emittedMembers = new Set();
  
  nodeExplorer : NodeExplorer | null = null;
  async query(session : QuerySession, requestedValue : any): Promise<QuerySession> {
    this.nodeExplorer = new NodeExplorer(session.getCache())
    for (let collectionId of Array.from(session.getCurrentNodePaths().keys())){
      let nodePaths = session.getCurrentNodePaths().get(collectionId)
      let newNodePaths = new Array();
      if (nodePaths !== undefined){
        for (let nodePath of nodePaths){
          newNodePaths = newNodePaths.concat(await this._recursiveQuery(nodePath, terraformer_parser.parse(requestedValue), collectionId))
        }
      }
      session.setNodePathsForCollection(collectionId, newNodePaths)
    }
    return session
  }

  async _recursiveQuery(nodePath : NodePath, searchLocation : any, collectionId : any) : Promise<Array<NodePath>>{
    
    if(this.stopped === true){ return [] }

    let returnPaths = new Array();
    let currentNode = nodePath.getCurrentNode()
    if (this.nodeExplorer === null) { throw new Error("Error exploring node in PrefixTreeQuery class: NodeExplorer is a null object.") }
    let currentNodeId = this.nodeExplorer.getNodeId(currentNode)

    this.emit("node", await this.nodeExplorer.getCache().getConnectedBlankNodesForId(currentNodeId))
    let collectionObject = await this.nodeExplorer.getNodeWithId(collectionId)
    let emittingMembers = await this.nodeExplorer.getNodeMembers(collectionObject)
    for (let member of emittingMembers){
      let memberId = this.nodeExplorer.getNodeId(member)
      if (! this.emittedMembers.has(memberId)){
        this.emittedMembers.add(memberId)
        this.emit("member", await this.nodeExplorer.getCache().getAllConnectedItemsForId(memberId))
      }
    }

    let nodeChildrenRelations = await this.nodeExplorer.getChildrenWithRelation(currentNode, ChildRelation.GeospatiallyContainsRelation)
    
    if (nodeChildrenRelations.length === 0){
      return [ nodePath ]
    } 
    for (let childRelation of nodeChildrenRelations){
      let childValue : any = terraformer_parser.parse(await this.nodeExplorer.getNodeValue(childRelation));
      if (this.isContained(childValue, searchLocation) || this.isOverlapping(childValue, searchLocation)) {
        let newNodePath = nodePath.copy()
        let childId = await this.nodeExplorer.getRelationNodeChildId(childRelation)
        await this.nodeExplorer.getCache().processId(childId)
        newNodePath.addNode(await this.nodeExplorer.getNodeWithId(childId))
        let returnValue = await this._recursiveQuery(newNodePath, searchLocation, collectionId);
        returnPaths = returnPaths.concat(returnValue)
      }
    }
    return returnPaths;
  }

  private isContained(containerObject : terraformer.Polygon | terraformer.Point, containedObject : terraformer.Polygon | terraformer.Point) : boolean {
    // if (containedObject instanceof terraformer.Point || containedObject instanceof terraformer.Point)  { console.error("wrong object types for isContained"); return false } // Point cannot contain other polygon or point
    let containerWKTPrimitive = new terraformer.Primitive(containerObject)
    try {
      return (containerWKTPrimitive.contains(containedObject))
    } catch(err){
        return false;
    }
  }

  private isOverlapping(containerObject : terraformer.Polygon | terraformer.Point, containedObject : any) : boolean {
    // if (containerObject instanceof terraformer.Point || containedObject instanceof terraformer.Point)  { console.error("wrong object types for isOverlapping"); return false } // Point cannot contain other polygon or point
    let containerWKTPrimitive = new terraformer.Primitive(containerObject)
    try {
      return (containerWKTPrimitive.intersects(containedObject))
    } catch(err){
        return false;
    }
  }
}