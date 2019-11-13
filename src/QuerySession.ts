const ldfetch = require('ldfetch')
import { QuadCache } from "rdf-framing"
import { NodePath } from './NodePath';
import { Query } from './Queries/Query';
import { ChildRelation } from './Helpers/ChildRelation';
import { NodeExplorer } from './NodeExplorer';

const viewPredicate = "http://www.w3.org/ns/hydra/core#view";
const typePredicate = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
const managesPredicate = "http://www.w3.org/ns/hydra/core#manages"
const memberPredicate = "http://www.w3.org/ns/hydra/core#member"
const hasChildRelationPredicate = "https://w3id.org/tree#hasChildRelation"
const childPredicate = 'https://w3id.org/tree#child'

const collectionTypeName = "http://www.w3.org/ns/hydra/core#collection";


export class QuerySession {
  collections : Map<any, any> = new Map();
  currentPaths : Map<any, Array<NodePath>> = new Map();

  cache = new QuadCache()
  nodeExplorer = new NodeExplorer(this.cache)

  async addCollection (collection : any) {
    let collectionId = this.nodeExplorer.getNodeId(collection)
    let necessaryCollectionPropertiesAndValues = new Map();
    necessaryCollectionPropertiesAndValues.set(viewPredicate, null);
    necessaryCollectionPropertiesAndValues.set(typePredicate, collectionTypeName);
    if (this.validateObjectWithContstraints(collection, necessaryCollectionPropertiesAndValues)){
      this.collections.set( collectionId, collection )
      let collectionRootNodePaths = new Array()
      for (let rootNode of (await this.getCollectionRootNodes(collectionId))){
        collectionRootNodePaths.push(new NodePath(rootNode))
      }
      this.currentPaths.set( collection.id , collectionRootNodePaths)
      return true;
    } else {
      console.error("The collection with id: " + collection.id + " has not been added to the Session.")
      return false;
    }
  }

  getNodeExplorer(){
    return this.nodeExplorer
  }

  async addCollectionById (id : any) {
    let collection = await this.getAndAddItemById(id)
    return await this.addCollection(collection)
  }

  // async ExecuteQuery(query : Query){

  // }

  deleteCollectionById (id : any) {
    this.collections.delete(id)
    this.currentPaths.delete(id)
  }

  getCurrentNodePaths() : Map<any, Array<NodePath>>{
    return this.currentPaths
  }

  setNodePathsForCollection(collectionId : any, nodePaths : Array<any>){
    this.currentPaths.set(collectionId, nodePaths)
  }

  getCache(){
    return this.cache;
  }

  async getCollectionRootNodes( collectionId : any ){
    let viewIds = this.collections.get(collectionId)[viewPredicate].map( (viewObject : any) => this.nodeExplorer.getNodeId(viewObject) )
    let rootNodeObjects = new Array()
    for (let viewId of viewIds){
      rootNodeObjects.push(await this.getAndAddItemById(viewId))
    }
    return (Promise.all(rootNodeObjects))
  }



  async getAndAddItemById (id : any){
    await this.fetchItemById(id)
    return await this.getItemById(id)
  }

  async getItemById (id : any){
    return (await this.cache.getItemForId(id)).jsonld
  }

  async fetchItemById(id : any){
    return this.cache.processId(id)
  }

  cleanCollections(){
    this.collections = new Map();
  }

  cleanProgress(){
    this.currentPaths = new Map();
  }


  getCurrentNodes(){
    let currentNodes = new Array()
    for (let nodePathArray of Array.from(this.currentPaths.values())){
      for (let nodePath of nodePathArray){
        currentNodes.push(nodePath.getCurrentNode())
      }
    }
    return currentNodes
  }

  getCurrentPaths(){
    return this.currentPaths
  }

  getCurrentNodeMembers(){
    let members = new Array();
    for (let node of this.getCurrentNodes()){
      members.concat(this.nodeExplorer.getNodeMembers(node));
    }
    return members;
  }



  private validateObjectWithContstraints(object : any, constraints : Map<any, any>) : boolean{
    for (let key of Array.from(constraints.keys())){
      if (! object.hasOwnProperty(key)){
        console.error("object: " + object.toString()  + " has no key: " + key.toString());
        return false
      } else if (constraints.get(key) !== null && constraints.get(key) !== undefined && object[key].length === 1 && (this.nodeExplorer.getNodeId(object[key][0]) !== constraints.get(key))){
        console.error("object: " + object.toString()  + " key " + key + " is expected to have value: " + constraints.get(key).toString() + " but has value: " + object[key].value);
        return false;
      }
    }
    return true;

  }
}