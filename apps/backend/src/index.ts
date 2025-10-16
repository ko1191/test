import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});
