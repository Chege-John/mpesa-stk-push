import express from "express";

const callback = express.Router();

callback.post("/callback", (req, res) => {
  const result = req.body;

  const data = JSON.stringify(result, null, 2);
  console.log("Safaricom Response: ", data);

  res
    .status(200)
    .json({ message: "Callback received successfully", success: true });
});

export default callback;
