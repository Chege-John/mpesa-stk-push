import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import { authorize } from "../middleware/authorization.js";
import { getTimestamp } from "../utils/timestamp.js";

dotenv.config();
const router = express.Router();

router.post("/lipaNaMpesa", authorize, async (req, res) => {
  try {
    const number = req.body.phoneNumber.replace(/^0/, "");
    const phoneNumber = `254${number}`;
    const timestamp = getTimestamp();

    const password = Buffer.from(
      `${process.env.BUSINESS_SHORT_CODE}${process.env.MPESA_PASSKEY}${timestamp}`,
    ).toString("base64");
    const domain = req.domain;
    const url =
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";

    const token = req.accessToken;
    const body = {
      BusinessShortCode: process.env.BUSINESS_SHORT_CODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: "10",
      PartyA: phoneNumber,
      PartyB: process.env.BUSINESS_SHORT_CODE,
      PhoneNumber: phoneNumber,
      CallBackURL: `${domain}/callback`,
      AccountReference: "RMS Pro",
      TransactionDesc: "Paying for service",
    };

    const result = await axios.post(url, body, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const stkResponse = result.data;

    // Checking the status of our transactions

    if (stkResponse.ResponseCode === "0") {
      const queryUrl =
        "https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query";
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
              "Content-Type": "application/json",
            },
          });

          console.log("STK Query Response:", tranStatus.data);

          const resultCode = tranStatus.data.ResultCode;
          const resultDesc = tranStatus.data.ResultDesc;

          if (resultCode === "0") {
            res.render("success", {
              type: "Successful",
              heading: "Payment Request Succeddful",
              desc: "The payment was processed successfully.",
            });
            clearInterval(interval);
          } else if (resultCode === "1032") {
            res.render("failed", {
              type: "cancelled",
              heading: "Request cancelled by the User",
              desc: "The user cancelled the request on their phone. Please try again and enter your pin to confirm payment",
            });
            clearInterval(interval);
          } else if (resultCode === "1") {
            res.render("failed", {
              type: "failed",
              heading: "Request failed due to insufficient balance",
              desc: "Please deposit funds on your M-PESA or use Overdraft(Fuliza) to complete the transaction",
            });
            clearInterval(interval);
          } else {
            res.render("failed", {
              type: "failed",
              heading: "Payment request failed",
              desc: `${resultDesc}. Please try again to complete the transaction`,
            });
            clearInterval(interval);
          }

          if (resultCode !== undefined) {
            console.log("Transaction complete:", resultCode);
            clearInterval(interval); // Stop polling
          }
        } catch (error) {
          console.error(
            "STK Query error:",
            error.response?.data || error.message,
          );
          clearInterval(interval); // Stop polling on error
        }

        attempts++;
        if (attempts >= maxAttempts) {
          console.warn("Max polling attempts reached. Stopping...");
          clearInterval(interval);
        }
      }, 15000);
    }
  } catch (error) {
    console.error("STK Push Error:", error.response?.data || error.message);
    const errorData = error.response?.data;
    // console.log(errorData)
    const errorMessage = errorData.errorMessage;

    // console.log(errorMessage);
    res.render("failed", {
      type: "failed",
      heading: "Error sending the push request",
      desc: errorMessage,
    });
  }
});

export default router;
