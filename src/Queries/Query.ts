import { EventEmitter } from 'events';
import { ChildRelation } from '../Helpers/ChildRelation';
import { QuerySession } from '../QuerySession';

export abstract class Query extends EventEmitter{

  stopped : boolean = false;
  abstract async query(session : QuerySession, requestedValue : any) : Promise<QuerySession>;
  stop(){
    this.stopped = true;
  }

}