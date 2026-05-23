import express from "express";
import cors from "cors";

import connectDB from './config/db';
import applicationRoutes from './routes/applicationRoutes';
import connectionRoutes from './routes/connectionRoutes';

const app = express();

// ✅ Connect to the database
connectDB();

// ✅ Middleware
app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());

// app.use((req, res, next) => {
//   console.log('Origin header:', req.headers.origin)
//   next()
// })

app.get('/test', (req, res) => {
  res.send('HELLO FROM MY EXPRESS APP')
})

app.use('/applications', applicationRoutes);
app.use('/connections', connectionRoutes);

export default app;