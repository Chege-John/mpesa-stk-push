 import express from 'express';
 import dotenv from 'dotenv';
 import axios from 'axios';
 import { authorize } from '../middleware/authorization.js';
 import { getTimestamp } from '../utils/timestamp.js';

    dotenv.config();
    const router = express.Router();
    
    router.post('/lipaNaMpesa', authorize, async (req, res) => {
      
      try {
    const number = req.body.phoneNumber.replace(/^0/, '');
      const phoneNumber = `254${number}`;
     const timestamp = getTimestamp();
     
      const password = Buffer.from(`${process.env.BUSINESS_SHORT_CODE}${process.env.MPESA_PASSKEY}${timestamp}`).toString('base64');
      const domain = req.domain;
      const url = 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

      const token = req.accessToken;
      const body = {
        BusinessShortCode: process.env.BUSINESS_SHORT_CODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: "1",
        PartyA: phoneNumber,
        PartyB: process.env.BUSINESS_SHORT_CODE,
        PhoneNumber: phoneNumber,
        CallBackURL: `${domain}/callback`,
        AccountReference: 'RMS Pro',
        TransactionDesc: 'Paying for service',
      };   

      const result = await axios.post(url, body, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": 'application/json'
        },
      })

      const stkResponse = result.data;
      
      // Checking the status of our transactions

      if (stkResponse.ResponseCode === '0') {
  const queryUrl = 'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query';
  const queryPayload = {
    BusinessShortCode: process.env.BUSINESS_SHORT_CODE,
    Password: password,
    Timestamp: timestamp,
    CheckoutRequestID: stkResponse.CheckoutRequestID,
  };

  let attempts = 0;
  const maxAttempts = 5;

  const interval = setInterval(async () => {
    try {
      const tranStatus = await axios.post(queryUrl, queryPayload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": 'application/json'
        }
      });

      console.log("STK Query Response:", tranStatus.data);

      const resultCode = tranStatus.data.Body?.stkCallback?.ResultCode;

      if (resultCode !== undefined) {
        console.log('Transaction complete:', resultCode);
        clearInterval(interval); // ✅ Stop polling
      }

    } catch (error) {
      console.error("STK Query error:", error.response?.data || error.message);
      clearInterval(interval); // Stop polling on error
    }

    attempts++;
    if (attempts >= maxAttempts) {
      console.warn("Max polling attempts reached. Stopping...");
      clearInterval(interval);
    }

  }, 15000); // ✅ Every 15 seconds
}


     
      } catch (error) {
  if (error.response) {
    console.error("STK Push error (response):", error.response.data);
    res.status(500).json({ message: 'Failed to initiate payment', error: error.response.data });
  } else {
    console.error("STK Push error (other):", error.message);
    res.status(500).json({ message: 'Failed to initiate payment', error: error.message });
  } }
    });
    
    export default router;