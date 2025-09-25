import express from 'express';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';

import { authorize } from './middleware/authorization.js';
import router from './routes/lipaNaMpesa.js';
import { initNgrok } from './middleware/ngrokUrl.js';
import callback from './routes/callback.js';

dotenv.config();
const app = express();
const port = process.env.PORT || 8080;


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.json());



app.use('/static', express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(initNgrok);
app.use(callback)
app.use(router);

app.get("/", async(req, res) => {
  console.log("Domain: ", req.domain);
  res.render('payment');
  });


app.listen(port,  () => {

  console.log(`Server running on port ${port}`);

  });
  
