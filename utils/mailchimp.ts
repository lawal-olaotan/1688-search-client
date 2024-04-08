import mailchimp  from '@mailchimp/mailchimp_marketing'
import { URL } from 'url'

const emailMarketingProvider = ()=> {


  const authenticate = ()=> {
      mailchimp.setConfig({
        apiKey:process.env.MAILCHIMP,
        server:process.env.MAILCHIMP_REGION
      })
    
  }

  const createContact = async(email_address:string,name:string,listId:string,url:URL)=> {
    // sets up email provider  authentication
    authenticate()

    const FNAME = name?.split(' ')[0]
    const contactObject = {
          email_address,
          status:"subscribed",
          merge_fields: { FNAME,URL:url }}
    await mailchimp.lists.addListMember(listId,contactObject);
  }

    return {
        createContact
    }
}

export default emailMarketingProvider