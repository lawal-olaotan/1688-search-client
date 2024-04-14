import mailchimp  from '@mailchimp/mailchimp_marketing'

const emailMarketingProvider = ()=>  {

  interface customerType {
    email_address:string,
    name:string,
    country?:string,
    city?:string,
    phone?:string
  }

  // const authenticate = ()=> {
  //     mailchimp.setConfig({
  //       apiKey:process.env.MAILCHIMP,
  //       server:process.env.MAILCHIMP_REGION
  //     }) 
  // }

  const saveContact = async(listId:string,customerType:customerType)=> {

    mailchimp.setConfig({
      apiKey:process.env.MAILCHIMP,
      server:process.env.MAILCHIMP_REGION
    }) 


    const {email_address,name} = customerType;
    const FNAME = name?.split(' ')[0]
    
    const contactObject = {
          email_address,
          status:"subscribed",
          merge_fields: { 
            FNAME,
          }}
   await mailchimp.lists.addListMember(listId,contactObject).then((data)=> console.log(data));
    
  }
 
    return {
      saveContact
    }
}

export default emailMarketingProvider