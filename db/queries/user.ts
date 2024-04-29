import { dbPromise } from "../config";


export const user = ()=> {

    const connection = async()=> {
        const db = (await dbPromise).db()
        const collection = db.collection('users')
        return collection
    }
    
    /** method queries the data
     * @param {*} query an object  that contains the information to make a request in the database
     * @returns userObject
     */

    const findUser = async(query:{}) => {
        const client = await connection()
        return await client.findOne(query);
    }

    const queryUser = async(query:{})=> {
        const userDetails = await findUser(query);
        if(!userDetails) return null
        return userDetails
    }

    const findAndUpdate = async(email:string,query?:{}) => {
        const client = await connection()
        await client.findOneAndUpdate(
            { email}, 
            {$set:query})
    }

    const updateUserPlan = async (email:string,premiumStatus:boolean) => {
        if (typeof premiumStatus !== "boolean") return;
        await findAndUpdate(email,{isPremium:premiumStatus})
      };

    return {
        queryUser,
        findAndUpdate,
        updateUserPlan
    }

    
}

