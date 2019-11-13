import { QuadCache } from 'rdf-framing';
import { ChildRelation } from './Helpers/ChildRelation';


const viewPredicate = "http://www.w3.org/ns/hydra/core#view";
const typePredicate = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
const managesPredicate = "http://www.w3.org/ns/hydra/core#manages"
const memberPredicate = "http://www.w3.org/ns/hydra/core#member"
const hasChildRelationPredicate = "https://w3id.org/tree#hasChildRelation"
const valuePredicate = "https://w3id.org/tree#value"
const childPredicate = 'https://w3id.org/tree#node'

const collectionTypeName = "http://www.w3.org/ns/hydra/core#Collection";


export class NodeExplorer{

  cache : QuadCache;
  constructor(cache : QuadCache){
    this.cache = cache
  }

  getCache(){
    return this.cache;
  }

  async getNodeProperty(node : any, property : any) : Promise<any>{
    if (! node.hasOwnProperty(property)){
      node = (await this.cache.getItemForId(this.getNodeId(node))).jsonld
      if (! node.hasOwnProperty(property)){
        await this.cache.processId(this.getNodeId(node));
        node = (await this.cache.getItemForId(this.getNodeId(node))).jsonld
      }
    }
    if (node.hasOwnProperty(property)){
      return node[property];
    } else {
      return null;
    }
  }

  async getNodeWithId(id : any){
    return (await this.cache.getItemForId(id)).jsonld
  }

  getNodeId(node : any) {
    if (node["id"] !== null && node["id"]!== undefined){
      return node["id"]
    } else if (node["value"] !== null && node["value"]!== undefined){
      return node["value"]
    }
    throw new Error(node.toString() + " does not have an 'id' or 'value' field.")
  }

  async getNodeValue(node : any) {
    return this.getNodeId((await this.getNodeProperty(node, valuePredicate))[0])
  }

  async getNodeType(node : any) {
    return this.getNodeId((await this.getNodeProperty(node, typePredicate))[0])
  }

  async getNodeMembers(node : any) {
    return await this.getNodeProperty(node, memberPredicate)
  }

  async getNodeChildRelations(node : any) {
    return await this.getNodeProperty(node, hasChildRelationPredicate)
  }

  async getChildrenWithRelation(node : any, relation : ChildRelation) : Promise<Array<any>> {
    let childRelationNodes = new Array()
    let nodeChildRelations = await this.getNodeChildRelations(node)
    if (nodeChildRelations === null) { nodeChildRelations = [] }
    for (let childRelation of nodeChildRelations){
      if (await this.getNodeType(childRelation) === relation){
        childRelationNodes.push(childRelation)
      }
    }
    return childRelationNodes
  }

  async getRelationNodeChildId(node : any) {
    return this.getNodeId((await this.getNodeProperty(node, childPredicate))[0])
  }

  // Should not be needed
  // async getChildrenValuesMapWithRelation(node : any, relation : ChildRelation) : Promise<Map<any, any>>{
  //   let childrenOjbectsWithRelation = await this.getChildrenWithRelation(node, relation)
  //   let returnMap = new Map()
  //   for (let childobj of childrenOjbectsWithRelation){
  //     let childNode = await this.cache.getItemForId(this.getNodeId(childobj))
  //     returnMap.set(this.getNodeId(childNode), await this.getNodeValue(childNode))
  //   }
  //   return returnMap;
  // }

}