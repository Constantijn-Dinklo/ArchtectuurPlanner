import express from "express";
import cors from "cors";
import cookieParser from 'cookie-parser';

import connectDB from './config/db';

import orgRoutes from './routes/organisationRoutes';
import authRoutes from './routes/auth';
import applicationRoutes from './routes/resources/applicationRoutes';
import databaseRoutes from './routes/resources/databaseRoutes';
import fileLocationsRoutes from './routes/resources/fileLocationRoutes';
import serverRoutes from './routes/resources/serverRoutes';
import tableRoutes from './routes/resources/tableRoutes';
import externalRoutes from './routes/resources/externalRoutes';
import apiRoutes from './routes/apiRoutes';
import apiConnectionRoutes from './routes/apiConnectionRoutes';
import databaseConnectionRoutes from './routes/databaseConnectionRoutes';
import scriptRoutes from './routes/scriptRoutes';
import otherConnectionRoutes from './routes/otherConnectionRoutes';
import endpointRoutes from './routes/endpointRoutes';
import informationObjectRoutes from './routes/informationObjectRoutes';
import informationRelationRoutes from './routes/informationRelationRoutes';


import viewRoutes from './routes/canvas/viewRoutes';

const app = express();

// ✅ Connect to the database
connectDB();

// ✅ Middleware
app.use(cookieParser());
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

app.use('/org', orgRoutes);
app.use('/auth', authRoutes);

// ** Resources ** //
app.use('/applications', applicationRoutes);
app.use('/databases', databaseRoutes);
app.use('/fileLocations', fileLocationsRoutes);
app.use('/servers', serverRoutes);
app.use('/tables', tableRoutes);
app.use('/externals', externalRoutes);

app.use('/apis', apiRoutes);

// ** Information ** //
app.use('/informationObjects', informationObjectRoutes);
app.use('/informationRelations', informationRelationRoutes);
app.use('/endpoints', endpointRoutes);

// ** Connections ** //
app.use('/apiConnections', apiConnectionRoutes);
app.use('/databaseConnections', databaseConnectionRoutes);
app.use('/scripts', scriptRoutes);
app.use('/otherConnections', otherConnectionRoutes);


app.use('/views', viewRoutes);

export default app;