import express from "express";
import cors from "cors";

import connectDB from './config/db';
import applicationRoutes from './routes/applicationRoutes';
import connectionRoutes from './routes/apiConnectionRoutes';
import apiRoutes from './routes/apiRoutes';
import scriptRoutes from './routes/scriptRoutes';

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


app.get('/test', (req, res) => {
  res.send('HELLO FROM MY EXPRESS APP')
})

app.use('/applications', applicationRoutes);
app.use('/apiConnections', connectionRoutes);
app.use('/apis', apiRoutes);
app.use('/scripts', scriptRoutes);

export default app;