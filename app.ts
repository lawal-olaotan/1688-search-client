import express, { Express } from 'express';
import bodyParser from 'body-parser';
import routerHandler from './routes';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

dotenv.config();

const app: Express = express();

app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ limit: '200mb', extended: false }));

app.use('/', routerHandler);

// Sets server port and logs message on success
app.listen(process.env.PORT || 3001, async () => {
  console.log('listening to:', process.env.PORT || 3001);
});
