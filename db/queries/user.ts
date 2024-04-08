import { dbPromise } from "../config";




export class User {
   #client

    async Constructor(){
        this.#client =  ( await dbPromise).db()
    }
    
    /** method queries the data
     * @param {*} query an object  that contains the information to make a request in the database
     * @returns userObject
     */

    async #findUser(query){
        return await this.#client.collection("users").findOne(query);
    }

    async queryUser(query){
        const userDetails = await this.#findUser(query);
        if(!userDetails) return null
        return userDetails
    }

    async findAndUpdate(userId,collection,query){
        await this.#client.collection(collection).updateOne(
            { userId}, 
            {$set:query})
        }

    
}

