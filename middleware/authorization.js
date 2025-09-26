import express from "express";
import axios from "axios";
import dotenv from "dotenv";

const app = express();
dotenv.config();

const url =
  "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
const auth = Buffer.from(
  `${process.env.CONSUMER_KEY}:${process.env.CONSUMER_SECRET}`,
).toString("base64");

export async function authorize(req, res, next) {
  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });
    const accessToken = response.data.access_token;
    req.accessToken = accessToken;
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Authorization Failed" });
  }
}
