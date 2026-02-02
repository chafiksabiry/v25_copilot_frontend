import axios from 'axios';

export interface CallStorageData {
  callSid: string;
  agentId: string;
  leadId: string;
  userId: string;
}

export class TwilioCallService {
  static async storeCallInDB(data: CallStorageData) {
    try {
      console.log('🔄 Starting call storage process...');
      
      // Step 1: Get call details from Twilio
      const result = await axios.post(`${import.meta.env.VITE_API_URL_CALL}/api/calls/call-details`, {
        callSid: data.callSid,
        userId: data.userId
      });
      const call = (result.data as any).data;
      console.log("📞 Call details retrieved from Twilio");
      
      // Step 2: Wait a bit for recording to be available
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Step 3: Fetch recording from Cloudinary if available
      let cloudinaryRecord = { data: { url: null } };
      if (call.recordingUrl) {
        cloudinaryRecord = await axios.post(`${import.meta.env.VITE_API_URL_CALL}/api/calls/fetch-recording`, {
          recordingUrl: call.recordingUrl,
          userId: data.userId
        });
      }
      
      // Step 4: Store call in database
      const callInDB = await axios.post(`${import.meta.env.VITE_API_URL_CALL}/api/calls/store-call`, {
        CallSid: data.callSid,
        agentId: data.agentId,
        leadId: data.leadId,
        call,
        cloudinaryrecord: cloudinaryRecord.data.url,
        userId: data.userId
      });
      
      console.log('📝 Call stored in DB:', (callInDB.data as any)._id);
      return callInDB.data;
      
    } catch (error) {
      console.error('❌ Error storing call in DB:', error);
      throw error;
    }
  }
} 